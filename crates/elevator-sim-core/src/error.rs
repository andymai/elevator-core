//! Error types for configuration validation and runtime failures.

use crate::entity::EntityId;
use crate::ids::GroupId;
use crate::stop::StopId;
use std::fmt;

/// Errors that can occur during simulation setup or operation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SimError {
    /// Configuration is invalid.
    InvalidConfig {
        /// Which config field is problematic.
        field: &'static str,
        /// Human-readable explanation.
        reason: String,
    },
    /// A referenced entity does not exist.
    EntityNotFound(EntityId),
    /// A referenced stop ID does not exist in the config.
    StopNotFound(StopId),
    /// A referenced group does not exist.
    GroupNotFound(GroupId),
}

impl fmt::Display for SimError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidConfig { field, reason } => {
                write!(f, "invalid config '{field}': {reason}")
            }
            Self::EntityNotFound(id) => write!(f, "entity not found: {id:?}"),
            Self::StopNotFound(id) => write!(f, "stop not found: {id:?}"),
            Self::GroupNotFound(id) => write!(f, "group not found: {id:?}"),
        }
    }
}

impl std::error::Error for SimError {}

/// Reason a rider was rejected from boarding an elevator.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum RejectionReason {
    /// Rider's weight exceeds remaining elevator capacity.
    OverCapacity,
}

impl fmt::Display for RejectionReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::OverCapacity => write!(f, "over capacity"),
        }
    }
}
