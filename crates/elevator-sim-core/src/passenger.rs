use crate::elevator::ElevatorId;
use crate::stop::StopId;
use serde::{Deserialize, Serialize};

/// Unique identifier for a passenger.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct PassengerId(pub u64);

/// Unique identifier for a cargo item.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct CargoId(pub u64);

/// Current state of a passenger in the simulation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PassengerState {
    Waiting,
    Boarding(ElevatorId),
    Riding(ElevatorId),
    Alighting(ElevatorId),
    Arrived,
}

/// Current state of a cargo item in the simulation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CargoState {
    Waiting,
    Loaded(ElevatorId),
    Arrived,
}

/// Priority level for cargo delivery.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum CargoPriority {
    Low,
    Normal,
    High,
}

/// An individual passenger in the simulation.
#[derive(Debug, Clone)]
pub struct Passenger {
    pub id: PassengerId,
    pub weight: f64,
    pub origin: StopId,
    pub destination: StopId,
    pub spawn_tick: u64,
    pub state: PassengerState,
}

/// A cargo item in the simulation.
#[derive(Debug, Clone)]
pub struct Cargo {
    pub id: CargoId,
    pub weight: f64,
    pub origin: StopId,
    pub destination: StopId,
    pub priority: CargoPriority,
    pub state: CargoState,
}
