//! LOOK dispatch algorithm — reverses at the last request, not the shaft end.

use std::collections::HashMap;

use smallvec::SmallVec;

use crate::entity::EntityId;
use crate::world::World;

use super::{DispatchDecision, DispatchManifest, DispatchStrategy, ElevatorGroup};

/// Tolerance for floating-point position comparisons.
const EPSILON: f64 = 1e-9;

/// Direction of travel.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
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
    /// Per-elevator sweep direction.
    direction: HashMap<EntityId, Direction>,
}

impl LookDispatch {
    /// Create a new `LookDispatch` with no initial direction state.
    #[must_use]
    pub fn new() -> Self {
        Self {
            direction: HashMap::new(),
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
        elevator: EntityId,
        elevator_position: f64,
        group: &ElevatorGroup,
        manifest: &DispatchManifest,
        world: &World,
    ) -> DispatchDecision {
        let direction = self
            .direction
            .get(&elevator)
            .copied()
            .unwrap_or(Direction::Up);

        // Collect stops with demand or rider destinations.
        let mut interesting: SmallVec<[(EntityId, f64); 32]> = SmallVec::new();

        for &stop_eid in group.stop_entities() {
            if manifest.has_demand(stop_eid)
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
        let (ahead, behind): (SmallVec<[_; 32]>, SmallVec<[_; 32]>) = match direction {
            Direction::Up => interesting.iter().partition(|(_, p)| *p > pos + EPSILON),
            Direction::Down => interesting.iter().partition(|(_, p)| *p < pos - EPSILON),
        };

        if !ahead.is_empty() {
            // Continue in current direction — pick nearest ahead.
            let nearest = match direction {
                Direction::Up => ahead
                    .iter()
                    .min_by(|a: &&&(EntityId, f64), b: &&&(EntityId, f64)| a.1.total_cmp(&b.1)),
                Direction::Down => ahead
                    .iter()
                    .max_by(|a: &&&(EntityId, f64), b: &&&(EntityId, f64)| a.1.total_cmp(&b.1)),
            };
            // ahead is non-empty, so nearest is always Some.
            if let Some(stop) = nearest {
                return DispatchDecision::GoToStop(stop.0);
            }
        }

        // No requests ahead — reverse direction (LOOK behavior).
        let new_dir = match direction {
            Direction::Up => Direction::Down,
            Direction::Down => Direction::Up,
        };
        self.direction.insert(elevator, new_dir);

        if behind.is_empty() {
            // All interesting stops at current position.
            return interesting
                .first()
                .map_or(DispatchDecision::Idle, |(sid, _)| {
                    DispatchDecision::GoToStop(*sid)
                });
        }

        // Pick nearest in new direction.
        let nearest = match new_dir {
            Direction::Up => behind
                .iter()
                .min_by(|a: &&&(EntityId, f64), b: &&&(EntityId, f64)| a.1.total_cmp(&b.1)),
            Direction::Down => behind
                .iter()
                .max_by(|a: &&&(EntityId, f64), b: &&&(EntityId, f64)| a.1.total_cmp(&b.1)),
        };

        // behind is non-empty, so nearest is always Some.
        nearest.map_or(DispatchDecision::Idle, |stop| {
            DispatchDecision::GoToStop(stop.0)
        })
    }

    fn notify_removed(&mut self, elevator: EntityId) {
        self.direction.remove(&elevator);
    }
}
