//! Multi-leg route planning for riders.

use serde::{Deserialize, Serialize};

use crate::entity::EntityId;
use crate::ids::GroupId;

/// How to travel between two stops.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[non_exhaustive]
pub enum TransportMode {
    /// Ride an elevator in the given group.
    Elevator(GroupId),
    /// Walk between adjacent stops.
    Walk,
}

/// One segment of a multi-leg route.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouteLeg {
    /// Origin stop entity.
    pub from: EntityId,
    /// Destination stop entity.
    pub to: EntityId,
    /// Transport mode for this leg.
    pub via: TransportMode,
}

/// A rider's full route, possibly spanning multiple elevator groups.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Route {
    /// Ordered legs of the route.
    pub legs: Vec<RouteLeg>,
    /// Index into `legs` for the leg currently being traversed.
    pub current_leg: usize,
}

impl Route {
    /// Create a direct single-leg route via one elevator group.
    #[must_use]
    pub fn direct(from: EntityId, to: EntityId, group: GroupId) -> Self {
        Self {
            legs: vec![RouteLeg {
                from,
                to,
                via: TransportMode::Elevator(group),
            }],
            current_leg: 0,
        }
    }

    /// Get the current leg, if any remain.
    #[must_use]
    pub fn current(&self) -> Option<&RouteLeg> {
        self.legs.get(self.current_leg)
    }

    /// Advance to the next leg. Returns true if there are more legs.
    pub const fn advance(&mut self) -> bool {
        self.current_leg += 1;
        self.current_leg < self.legs.len()
    }

    /// Whether all legs have been completed.
    #[must_use]
    pub const fn is_complete(&self) -> bool {
        self.current_leg >= self.legs.len()
    }

    /// The destination of the current leg.
    #[must_use]
    pub fn current_destination(&self) -> Option<EntityId> {
        self.current().map(|leg| leg.to)
    }
}
