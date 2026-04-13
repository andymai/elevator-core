//! SCAN (elevator) dispatch algorithm — sweeps end-to-end before reversing.

use std::collections::HashMap;

use smallvec::SmallVec;

use crate::entity::EntityId;
use crate::world::World;

use super::{DispatchDecision, DispatchManifest, DispatchStrategy, ElevatorGroup};

/// Tolerance for floating-point position comparisons.
const EPSILON: f64 = 1e-9;

/// Direction of travel for the SCAN algorithm.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub(crate) enum ScanDirection {
    /// Traveling upward (increasing position).
    Up,
    /// Traveling downward (decreasing position).
    Down,
}

/// Elevator dispatch using the SCAN (elevator) algorithm.
///
/// Serves all requests in the current direction of travel before reversing.
pub struct ScanDispatch {
    /// Per-elevator sweep direction.
    direction: HashMap<EntityId, ScanDirection>,
}

impl ScanDispatch {
    /// Create a new `ScanDispatch` with no initial direction state.
    #[must_use]
    pub fn new() -> Self {
        Self {
            direction: HashMap::new(),
        }
    }
}

impl Default for ScanDispatch {
    fn default() -> Self {
        Self::new()
    }
}

impl DispatchStrategy for ScanDispatch {
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
            .unwrap_or(ScanDirection::Up);

        // Collect "interesting" stops: stops with demand or rider destinations.
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

        // Partition into ahead and behind based on current direction.
        let (ahead, behind): (SmallVec<[_; 32]>, SmallVec<[_; 32]>) = match direction {
            ScanDirection::Up => interesting.iter().partition(|(_, p)| *p > pos + EPSILON),
            ScanDirection::Down => interesting.iter().partition(|(_, p)| *p < pos - EPSILON),
        };

        if !ahead.is_empty() {
            let nearest = match direction {
                ScanDirection::Up => ahead
                    .iter()
                    .min_by(|a: &&&(EntityId, f64), b: &&&(EntityId, f64)| a.1.total_cmp(&b.1)),
                ScanDirection::Down => ahead
                    .iter()
                    .max_by(|a: &&&(EntityId, f64), b: &&&(EntityId, f64)| a.1.total_cmp(&b.1)),
            };
            // ahead is non-empty, so nearest is always Some.
            if let Some(stop) = nearest {
                return DispatchDecision::GoToStop(stop.0);
            }
        }

        // Nothing ahead — reverse direction.
        let new_dir = match direction {
            ScanDirection::Up => ScanDirection::Down,
            ScanDirection::Down => ScanDirection::Up,
        };
        self.direction.insert(elevator, new_dir);

        if behind.is_empty() {
            // All interesting stops at current position (handled above).
            return interesting
                .first()
                .map_or(DispatchDecision::Idle, |(sid, _)| {
                    DispatchDecision::GoToStop(*sid)
                });
        }

        let nearest = match new_dir {
            ScanDirection::Up => behind
                .iter()
                .min_by(|a: &&&(EntityId, f64), b: &&&(EntityId, f64)| a.1.total_cmp(&b.1)),
            ScanDirection::Down => behind
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
