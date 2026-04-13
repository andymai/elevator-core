//! Building and elevator configuration (RON-deserializable).

use crate::components::{FloorPosition, Orientation};
use crate::dispatch::{BuiltinReposition, BuiltinStrategy};
use crate::stop::{StopConfig, StopId};
use serde::{Deserialize, Serialize};

/// Top-level simulation configuration, loadable from RON.
///
/// Validated at construction time by [`Simulation::new()`](crate::sim::Simulation::new)
/// or [`SimulationBuilder::build()`](crate::builder::SimulationBuilder::build).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimConfig {
    /// Building layout describing the stops (floors/stations) along the shaft.
    pub building: BuildingConfig,
    /// Elevator cars to install in the building.
    ///
    /// Legacy flat list — used when `building.lines` is `None`.
    /// When explicit lines are provided, elevators live inside each
    /// [`LineConfig`] instead.
    #[serde(default)]
    pub elevators: Vec<ElevatorConfig>,
    /// Global simulation timing parameters.
    pub simulation: SimulationParams,
    /// Passenger spawning parameters used by the game layer.
    ///
    /// The core library does not consume these directly; they are stored here
    /// for games and traffic generators that read the config.
    pub passenger_spawning: PassengerSpawnConfig,
}

/// Building layout.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildingConfig {
    /// Human-readable building name, displayed in UIs and logs.
    pub name: String,
    /// Ordered list of stops in the building.
    ///
    /// Must contain at least one stop. Each stop has a unique [`StopId`] and
    /// an arbitrary position along the shaft axis. Positions need not be
    /// uniformly spaced — this enables buildings, skyscrapers, and space
    /// elevators with varying inter-stop distances.
    pub stops: Vec<StopConfig>,
    /// Lines (physical paths). If `None`, auto-inferred from the flat
    /// elevator list on [`SimConfig`].
    #[serde(default)]
    pub lines: Option<Vec<LineConfig>>,
    /// Dispatch groups. If `None`, auto-inferred (single group with all lines).
    #[serde(default)]
    pub groups: Option<Vec<GroupConfig>>,
}

/// Configuration for a single elevator car.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElevatorConfig {
    /// Numeric identifier for this elevator, unique within the config.
    ///
    /// Mapped to an [`EntityId`](crate::entity::EntityId) at construction
    /// time; not used at runtime.
    pub id: u32,
    /// Human-readable elevator name, displayed in UIs and logs.
    pub name: String,
    /// Maximum travel speed in distance units per second.
    ///
    /// Must be positive. The trapezoidal velocity profile accelerates up to
    /// this speed, cruises, then decelerates to stop at the target.
    ///
    /// Default (from `SimulationBuilder`): `2.0`.
    pub max_speed: f64,
    /// Acceleration rate in distance units per second squared.
    ///
    /// Must be positive. Controls how quickly the elevator reaches
    /// `max_speed` from rest.
    ///
    /// Default (from `SimulationBuilder`): `1.5`.
    pub acceleration: f64,
    /// Deceleration rate in distance units per second squared.
    ///
    /// Must be positive. Controls how quickly the elevator slows to a stop
    /// when approaching a target. May differ from `acceleration` for
    /// asymmetric motion profiles.
    ///
    /// Default (from `SimulationBuilder`): `2.0`.
    pub deceleration: f64,
    /// Maximum total weight the elevator car can carry.
    ///
    /// Must be positive. Riders whose weight would exceed this limit are
    /// rejected during the loading phase.
    ///
    /// Units: same as rider weight (typically kilograms).
    /// Default (from `SimulationBuilder`): `800.0`.
    pub weight_capacity: f64,
    /// The [`StopId`] where this elevator starts at simulation init.
    ///
    /// Must reference an existing stop in the building config.
    pub starting_stop: StopId,
    /// How many ticks the doors remain fully open before closing.
    ///
    /// During this window, riders may board or exit. Longer values
    /// increase loading opportunity but reduce throughput.
    ///
    /// Units: simulation ticks.
    /// Default (from `SimulationBuilder`): `10`.
    pub door_open_ticks: u32,
    /// How many ticks a door open or close transition takes.
    ///
    /// Models the mechanical travel time of the door panels. No boarding
    /// or exiting occurs during transitions.
    ///
    /// Units: simulation ticks.
    /// Default (from `SimulationBuilder`): `5`.
    pub door_transition_ticks: u32,
    /// Stop IDs this elevator cannot serve (access restriction).
    ///
    /// Riders whose current destination is in this list are rejected
    /// with [`RejectionReason::AccessDenied`](crate::error::RejectionReason::AccessDenied)
    /// during the loading phase.
    ///
    /// Default: empty (no restrictions).
    #[serde(default)]
    pub restricted_stops: Vec<StopId>,
    /// Energy profile for this elevator. If `None`, energy is not tracked.
    ///
    /// Requires the `energy` feature.
    #[cfg(feature = "energy")]
    #[serde(default)]
    pub energy_profile: Option<crate::energy::EnergyProfile>,
}

/// Global simulation timing parameters.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationParams {
    /// Number of simulation ticks per real-time second.
    ///
    /// Must be positive. Determines the time delta per tick (`dt = 1.0 / ticks_per_second`).
    /// Higher values yield finer-grained simulation at the cost of more
    /// computation per wall-clock second.
    ///
    /// Default (from `SimulationBuilder`): `60.0`.
    pub ticks_per_second: f64,
}

/// Passenger spawning parameters (used by the game layer).
///
/// The core simulation does not spawn passengers automatically; these values
/// are advisory and consumed by game code or traffic generators.
///
/// This struct is always available regardless of feature flags. The built-in
/// traffic generation that consumes it requires the `traffic` feature.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PassengerSpawnConfig {
    /// Mean interval in ticks between passenger spawns.
    ///
    /// Used by traffic generators for Poisson-distributed arrivals.
    ///
    /// Units: simulation ticks.
    /// Default (from `SimulationBuilder`): `120`.
    pub mean_interval_ticks: u32,
    /// `(min, max)` weight range for randomly spawned passengers.
    ///
    /// Weights are drawn uniformly from this range by traffic generators.
    ///
    /// Units: same as elevator `weight_capacity` (typically kilograms).
    /// Default (from `SimulationBuilder`): `(50.0, 100.0)`.
    pub weight_range: (f64, f64),
}

/// Configuration for a single line (physical path).
///
/// A line represents a shaft, tether, track, or other physical pathway
/// that one or more elevator cars travel along. Lines belong to a
/// [`GroupConfig`] for dispatch purposes.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct LineConfig {
    /// Unique line identifier (within the config).
    pub id: u32,
    /// Human-readable name.
    pub name: String,
    /// Stops served by this line (references [`StopConfig::id`]).
    pub serves: Vec<StopId>,
    /// Elevators on this line.
    pub elevators: Vec<ElevatorConfig>,
    /// Physical orientation (defaults to Vertical).
    #[serde(default)]
    pub orientation: Orientation,
    /// Optional floor-plan position.
    #[serde(default)]
    pub position: Option<FloorPosition>,
    /// Lowest reachable position (auto-computed from stops if `None`).
    #[serde(default)]
    pub min_position: Option<f64>,
    /// Highest reachable position (auto-computed from stops if `None`).
    #[serde(default)]
    pub max_position: Option<f64>,
    /// Max cars on this line (`None` = unlimited).
    #[serde(default)]
    pub max_cars: Option<usize>,
}

/// Configuration for an elevator dispatch group.
///
/// A group is the logical dispatch unit containing one or more lines.
/// All elevators within the group share a single [`BuiltinStrategy`].
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupConfig {
    /// Unique group identifier.
    pub id: u32,
    /// Human-readable name.
    pub name: String,
    /// Line IDs belonging to this group (references [`LineConfig::id`]).
    pub lines: Vec<u32>,
    /// Dispatch strategy for this group.
    pub dispatch: BuiltinStrategy,
    /// Optional repositioning strategy for idle elevators.
    ///
    /// When `None`, idle elevators in this group stay where they stopped.
    #[serde(default)]
    pub reposition: Option<BuiltinReposition>,
}
