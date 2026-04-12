use crate::entity::EntityId;
use serde::{Deserialize, Serialize};

/// State of a cargo item in the simulation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CargoState {
    Waiting,
    Loaded(EntityId),
    Arrived,
}

/// Priority level for cargo delivery.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum CargoPriority {
    Low,
    Normal,
    High,
}

/// Component for a cargo entity.
#[derive(Debug, Clone)]
pub struct CargoData {
    pub weight: f64,
    pub origin: EntityId,
    pub destination: EntityId,
    pub priority: CargoPriority,
    pub state: CargoState,
}
