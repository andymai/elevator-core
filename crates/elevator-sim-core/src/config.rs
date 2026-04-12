//! Building and elevator configuration (RON-deserializable).

use crate::stop::{StopConfig, StopId};
use serde::{Deserialize, Serialize};

/// Top-level simulation configuration, loadable from RON.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimConfig {
    /// Building layout with stops.
    pub building: BuildingConfig,
    /// List of elevator configurations.
    pub elevators: Vec<ElevatorConfig>,
    /// Global simulation parameters.
    pub simulation: SimulationParams,
    /// Passenger spawning parameters.
    pub passenger_spawning: PassengerSpawnConfig,
}

/// Building layout.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildingConfig {
    /// Human-readable building name.
    pub name: String,
    /// Ordered list of stops in the building.
    pub stops: Vec<StopConfig>,
}

/// Configuration for a single elevator.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElevatorConfig {
    /// Numeric identifier for this elevator.
    pub id: u32,
    /// Human-readable elevator name.
    pub name: String,
    /// Maximum speed in distance units per second.
    pub max_speed: f64,
    /// Acceleration rate (distance units per second squared).
    pub acceleration: f64,
    /// Deceleration rate (distance units per second squared).
    pub deceleration: f64,
    /// Maximum weight the elevator can carry.
    pub weight_capacity: f64,
    /// The `StopId` where this elevator starts.
    pub starting_stop: StopId,
    /// How many ticks the doors remain fully open.
    pub door_open_ticks: u32,
    /// How many ticks a door open/close transition takes.
    pub door_transition_ticks: u32,
}

/// Global simulation parameters.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationParams {
    /// Number of simulation ticks per real-time second.
    pub ticks_per_second: f64,
}

/// Passenger spawning parameters (used by the game layer).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PassengerSpawnConfig {
    /// Mean interval in ticks between passenger spawns.
    pub mean_interval_ticks: u32,
    /// (min, max) weight range for spawned passengers.
    pub weight_range: (f64, f64),
}
