use serde::{Deserialize, Serialize};

/// Legacy elevator identifier (used in config and external API).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ElevatorId(pub u32);

/// Legacy stop identifier (used in config and external API).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct StopId(pub u32);

/// Legacy passenger identifier.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct PassengerId(pub u64);

/// Legacy cargo identifier.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct CargoId(pub u64);

/// Elevator group identifier.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct GroupId(pub u32);
