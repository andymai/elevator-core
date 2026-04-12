use crate::entity::EntityId;
use crate::ids::GroupId;

/// How to travel between two stops.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TransportMode {
    Elevator(GroupId),
    Walk,
}

/// One segment of a multi-leg route.
#[derive(Debug, Clone)]
pub struct RouteLeg {
    pub from: EntityId,
    pub to: EntityId,
    pub via: TransportMode,
}

/// A passenger's full route, possibly spanning multiple elevator groups.
#[derive(Debug, Clone)]
pub struct Route {
    pub legs: Vec<RouteLeg>,
    pub current_leg: usize,
}

impl Route {
    /// Create a direct single-leg route via one elevator group.
    pub fn direct(from: EntityId, to: EntityId, group: GroupId) -> Self {
        Route {
            legs: vec![RouteLeg {
                from,
                to,
                via: TransportMode::Elevator(group),
            }],
            current_leg: 0,
        }
    }

    /// Get the current leg, if any remain.
    pub fn current(&self) -> Option<&RouteLeg> {
        self.legs.get(self.current_leg)
    }

    /// Advance to the next leg. Returns true if there are more legs.
    pub fn advance(&mut self) -> bool {
        self.current_leg += 1;
        self.current_leg < self.legs.len()
    }

    /// Whether all legs have been completed.
    pub fn is_complete(&self) -> bool {
        self.current_leg >= self.legs.len()
    }

    /// The destination of the current leg (where the passenger wants to alight).
    pub fn current_destination(&self) -> Option<EntityId> {
        self.current().map(|leg| leg.to)
    }
}
