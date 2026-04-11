use crate::door::DoorState;
use crate::passenger::{CargoId, PassengerId};
use crate::stop::StopId;
use serde::{Deserialize, Serialize};

/// Unique identifier for an elevator.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ElevatorId(pub u32);

/// The operational state of an elevator.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ElevatorState {
    Idle,
    MovingToStop(StopId),
    DoorOpening,
    Loading,
    DoorClosing,
    Stopped,
}

/// An elevator car in the simulation.
#[derive(Debug, Clone)]
pub struct Elevator {
    pub id: ElevatorId,
    pub position: f64,
    pub velocity: f64,
    pub state: ElevatorState,
    pub door: DoorState,
    pub max_speed: f64,
    pub acceleration: f64,
    pub deceleration: f64,
    pub weight_capacity: f64,
    pub current_load: f64,
    pub passengers: Vec<PassengerId>,
    pub cargo: Vec<CargoId>,
    pub target_stop: Option<StopId>,
    /// Ticks the door transition takes (opening/closing animation).
    pub door_transition_ticks: u32,
    /// Ticks the door stays open for loading/unloading.
    pub door_open_ticks: u32,
}
