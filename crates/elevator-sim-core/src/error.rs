//! Error types for configuration validation and runtime failures.

use crate::entity::EntityId;
use crate::ids::GroupId;
use crate::stop::StopId;
use ordered_float::OrderedFloat;
use std::fmt;

/// Errors that can occur during simulation setup or operation.
#[derive(Debug, Clone, PartialEq, Eq)]
#[non_exhaustive]
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
    /// An operation was attempted on an entity in an invalid state.
    InvalidState {
        /// The entity in the wrong state.
        entity: EntityId,
        /// Human-readable explanation.
        reason: String,
    },
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
            Self::InvalidState { entity, reason } => {
                write!(f, "invalid state for {entity:?}: {reason}")
            }
        }
    }
}

impl std::error::Error for SimError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        None
    }
}

/// Reason a rider was rejected from boarding an elevator.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[non_exhaustive]
pub enum RejectionReason {
    /// Rider's weight exceeds remaining elevator capacity.
    OverCapacity,
    /// Rider's boarding preferences prevented boarding (e.g., crowding threshold).
    PreferenceBased,
}

impl fmt::Display for RejectionReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::OverCapacity => write!(f, "over capacity"),
            Self::PreferenceBased => write!(f, "rider preference"),
        }
    }
}

/// Additional context for a rider rejection.
///
/// Provides the numeric details that led to the rejection decision.
/// Separated from [`RejectionReason`] to preserve `Eq` on the reason enum.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct RejectionContext {
    /// Weight the rider attempted to add.
    pub attempted_weight: OrderedFloat<f64>,
    /// Current load on the elevator at rejection time.
    pub current_load: OrderedFloat<f64>,
    /// Maximum weight capacity of the elevator.
    pub capacity: OrderedFloat<f64>,
}

impl From<EntityId> for SimError {
    fn from(id: EntityId) -> Self {
        Self::EntityNotFound(id)
    }
}

impl From<StopId> for SimError {
    fn from(id: StopId) -> Self {
        Self::StopNotFound(id)
    }
}

impl From<GroupId> for SimError {
    fn from(id: GroupId) -> Self {
        Self::GroupNotFound(id)
    }
}
