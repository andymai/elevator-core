//! Building and elevator configuration (RON-deserializable).

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
    /// Must contain at least one entry. Each elevator is assigned to the
    /// default group (`GroupId(0)`) at construction time.
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
    /// During this window, riders may board or alight. Longer values
    /// increase loading opportunity but reduce throughput.
    ///
    /// Units: simulation ticks.
    /// Default (from `SimulationBuilder`): `10`.
    pub door_open_ticks: u32,
    /// How many ticks a door open or close transition takes.
    ///
    /// Models the mechanical travel time of the door panels. No boarding
    /// or alighting occurs during transitions.
    ///
    /// Units: simulation ticks.
    /// Default (from `SimulationBuilder`): `5`.
    pub door_transition_ticks: u32,
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
