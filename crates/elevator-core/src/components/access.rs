//! Access control component for restricting rider stop access.

use crate::entity::EntityId;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

/// Per-rider access control: which stops the rider is allowed to visit.
///
/// When absent from a rider entity, the rider has unrestricted access.
/// When present, [`can_access`](Self::can_access) returns `true` either
/// when the queried stop is in [`allowed_stops`](Self::allowed_stops)
/// or when the set is empty — an empty set means "no restriction"
/// (matches `AccessControl::default()` and the principle-of-least-
/// surprise that an empty allowlist shouldn't silently block all access).
/// To explicitly block all stops, use a sentinel set or a dedicated
/// no-access wrapper. (#289)
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AccessControl {
    /// Set of stop `EntityId`s this rider may visit.
    ///
    /// **Semantics**: empty set ⇒ unrestricted (allow all). Non-empty
    /// set ⇒ allowlist; `can_access(stop)` is true iff `stop` is in
    /// the set.
    allowed_stops: HashSet<EntityId>,
}

impl AccessControl {
    /// Create a new access control with the given set of allowed stops.
    /// Pass an empty set for "no restriction" (unrestricted access).
    #[must_use]
    pub const fn new(allowed_stops: HashSet<EntityId>) -> Self {
        Self { allowed_stops }
    }

    /// Check if the rider can access the given stop.
    ///
    /// An empty `allowed_stops` set is treated as "no restriction" —
    /// `can_access` returns `true` for any stop. A non-empty set is an
    /// allowlist; `stop` must be a member.
    #[must_use]
    pub fn can_access(&self, stop: EntityId) -> bool {
        self.allowed_stops.is_empty() || self.allowed_stops.contains(&stop)
    }

    /// The set of allowed stop entity IDs. Empty means unrestricted.
    #[must_use]
    pub const fn allowed_stops(&self) -> &HashSet<EntityId> {
        &self.allowed_stops
    }
}
