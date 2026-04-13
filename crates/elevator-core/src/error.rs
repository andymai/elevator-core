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
    /// A line entity was not found.
    LineNotFound(EntityId),
    /// No route exists between origin and destination across any group.
    NoRoute {
        /// The origin stop.
        origin: EntityId,
        /// The destination stop.
        destination: EntityId,
        /// Groups that serve the origin (if any).
        origin_groups: Vec<GroupId>,
        /// Groups that serve the destination (if any).
        destination_groups: Vec<GroupId>,
    },
    /// Multiple groups serve both origin and destination — caller must specify.
    AmbiguousRoute {
        /// The origin stop.
        origin: EntityId,
        /// The destination stop.
        destination: EntityId,
        /// The groups that serve both stops.
        groups: Vec<GroupId>,
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
            Self::LineNotFound(id) => write!(f, "line entity {id:?} not found"),
            Self::NoRoute {
                origin,
                destination,
                origin_groups,
                destination_groups,
            } => {
                write!(
                    f,
                    "no route from {origin:?} to {destination:?} \
                     (origin served by {origin_groups:?}, destination served by {destination_groups:?})"
                )
            }
            Self::AmbiguousRoute {
                origin,
                destination,
                groups,
            } => {
                write!(
                    f,
                    "ambiguous route from {origin:?} to {destination:?}: served by groups {groups:?}"
                )
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
    /// Rider lacks access to the destination stop, or the elevator cannot serve it.
    AccessDenied,
}

impl fmt::Display for RejectionReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::OverCapacity => write!(f, "over capacity"),
            Self::PreferenceBased => write!(f, "rider preference"),
            Self::AccessDenied => write!(f, "access denied"),
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
