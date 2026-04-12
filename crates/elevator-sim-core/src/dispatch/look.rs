use crate::entity::EntityId;
use crate::world::World;

use super::{DispatchDecision, DispatchManifest, DispatchStrategy, ElevatorGroup};

/// Epsilon for floating-point position comparisons.
const EPSILON: f64 = 1e-9;

/// Direction of travel.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Direction {
    /// Traveling upward (increasing position).
    Up,
    /// Traveling downward (decreasing position).
    Down,
}

/// Elevator dispatch using the LOOK algorithm.
///
/// Like SCAN, but reverses at the last request in the current direction
/// instead of traveling to the end of the shaft. More efficient than
/// pure SCAN for sparse request distributions.
///
/// This is the standard "elevator algorithm" used in real buildings.
pub struct LookDispatch {
    /// Current sweep direction.
    direction: Direction,
}

impl LookDispatch {
    /// Create a new `LookDispatch` starting in the Up direction.
    pub const fn new() -> Self {
        Self {
            direction: Direction::Up,
        }
    }
}

impl Default for LookDispatch {
    fn default() -> Self {
        Self::new()
    }
}

impl DispatchStrategy for LookDispatch {
    fn decide(
        &mut self,
        _elevator: EntityId,
        elevator_position: f64,
        group: &ElevatorGroup,
        manifest: &DispatchManifest,
        world: &World,
    ) -> DispatchDecision {
        // Collect stops with demand or rider destinations.
        let mut interesting: Vec<(EntityId, f64)> = Vec::new();

        for &stop_eid in &group.stop_entities {
            let has_demand = manifest
                .demand_at_stop
                .get(&stop_eid)
                .is_some_and(|d| d.waiting_count > 0);
            let has_riders = manifest
                .rider_destinations
                .get(&stop_eid)
                .is_some_and(|&c| c > 0);

            if (has_demand || has_riders)
                && let Some(pos) = world.stop_position(stop_eid)
            {
                interesting.push((stop_eid, pos));
            }
        }

        if interesting.is_empty() {
            return DispatchDecision::Idle;
        }

        let pos = elevator_position;

        // Partition into ahead (in current direction) and behind.
        let (ahead, behind): (Vec<_>, Vec<_>) = match self.direction {
            Direction::Up => interesting.iter().partition(|(_, p)| *p > pos + EPSILON),
            Direction::Down => interesting.iter().partition(|(_, p)| *p < pos - EPSILON),
        };

        if !ahead.is_empty() {
            // Continue in current direction — pick nearest ahead.
            let nearest = match self.direction {
                Direction::Up => ahead
                    .iter()
                    .min_by(|a: &&&(EntityId, f64), b: &&&(EntityId, f64)| {
                        a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal)
                    }),
                Direction::Down => ahead
                    .iter()
                    .max_by(|a: &&&(EntityId, f64), b: &&&(EntityId, f64)| {
                        a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal)
                    }),
            };
            // SAFETY: ahead is non-empty, so nearest is always Some.
            #[allow(clippy::unwrap_used)]
            return DispatchDecision::GoToStop(nearest.unwrap().0);
        }

        // No requests ahead — reverse direction (LOOK behavior).
        self.direction = match self.direction {
            Direction::Up => Direction::Down,
            Direction::Down => Direction::Up,
        };

        if behind.is_empty() {
            // All interesting stops at current position.
            return interesting
                .first()
                .map_or(DispatchDecision::Idle, |(sid, _)| DispatchDecision::GoToStop(*sid));
        }

        // Pick nearest in new direction.
        let nearest = match self.direction {
            Direction::Up => behind
                .iter()
                .min_by(|a: &&&(EntityId, f64), b: &&&(EntityId, f64)| {
                    a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal)
                }),
            Direction::Down => behind
                .iter()
                .max_by(|a: &&&(EntityId, f64), b: &&&(EntityId, f64)| {
                    a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal)
                }),
        };

        // SAFETY: behind is non-empty, so nearest is always Some.
        #[allow(clippy::unwrap_used)]
        DispatchDecision::GoToStop(nearest.unwrap().0)
    }
}
