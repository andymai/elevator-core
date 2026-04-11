use crate::stop::{StopConfig, StopId};
use serde::{Deserialize, Serialize};

/// Top-level simulation configuration, loadable from RON.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimConfig {
    pub building: BuildingConfig,
    pub elevators: Vec<ElevatorConfig>,
    pub simulation: SimulationParams,
    pub passenger_spawning: PassengerSpawnConfig,
}

/// Building layout.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildingConfig {
    pub name: String,
    pub stops: Vec<StopConfig>,
}

/// Configuration for a single elevator.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElevatorConfig {
    pub id: u32,
    pub name: String,
    pub max_speed: f64,
    pub acceleration: f64,
    pub deceleration: f64,
    pub weight_capacity: f64,
    pub starting_stop: StopId,
    pub door_open_ticks: u32,
    pub door_transition_ticks: u32,
}

/// Global simulation parameters.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationParams {
    pub ticks_per_second: f64,
}

/// Passenger spawning parameters (used by the game layer).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PassengerSpawnConfig {
    pub mean_interval_ticks: u32,
    pub weight_range: (f64, f64),
}
