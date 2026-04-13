//! Access control component for restricting rider stop access.

use crate::entity::EntityId;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

/// Per-rider access control: which stops the rider is allowed to visit.
///
/// When absent from a rider entity, the rider has unrestricted access.
/// When present, only stops in [`allowed_stops`](Self::allowed_stops) are
/// reachable — boarding is rejected with
/// [`RejectionReason::AccessDenied`](crate::error::RejectionReason::AccessDenied)
/// if the rider's current destination is not in the set.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessControl {
    /// Set of stop `EntityId`s this rider may visit.
    allowed_stops: HashSet<EntityId>,
}

impl AccessControl {
    /// Create a new access control with the given set of allowed stops.
    #[must_use]
    pub const fn new(allowed_stops: HashSet<EntityId>) -> Self {
        Self { allowed_stops }
    }

    /// Check if the rider can access the given stop.
    #[must_use]
    pub fn can_access(&self, stop: EntityId) -> bool {
        self.allowed_stops.contains(&stop)
    }

    /// The set of allowed stop entity IDs.
    #[must_use]
    pub const fn allowed_stops(&self) -> &HashSet<EntityId> {
        &self.allowed_stops
    }
}
