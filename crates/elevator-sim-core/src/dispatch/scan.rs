use crate::entity::EntityId;
use crate::world::World;

use super::{DispatchDecision, DispatchManifest, DispatchStrategy, ElevatorGroup};

const EPSILON: f64 = 1e-9;

/// Direction of travel for the SCAN algorithm.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ScanDirection {
    Up,
    Down,
}

/// Elevator dispatch using the SCAN (elevator) algorithm.
///
/// Serves all requests in the current direction of travel before reversing.
pub struct ScanDispatch {
    direction: ScanDirection,
}

impl ScanDispatch {
    pub fn new() -> Self {
        ScanDispatch {
            direction: ScanDirection::Up,
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
        _elevator: EntityId,
        elevator_position: f64,
        group: &ElevatorGroup,
        manifest: &DispatchManifest,
        world: &World,
    ) -> DispatchDecision {
        // Collect "interesting" stops: stops with demand or rider destinations.
        let mut interesting: Vec<(EntityId, f64)> = Vec::new();

        for &stop_eid in &group.stop_entities {
            let has_demand = manifest
                .demand_at_stop
                .get(&stop_eid)
                .is_some_and(|d| d.waiting_count > 0);
            let has_riders_heading_here = manifest
                .rider_destinations
                .get(&stop_eid)
                .is_some_and(|&count| count > 0);

            if (has_demand || has_riders_heading_here)
                && let Some(pos) = world.stop_position(stop_eid) {
                    interesting.push((stop_eid, pos));
                }
        }

        if interesting.is_empty() {
            return DispatchDecision::Idle;
        }

        let pos = elevator_position;

        // Partition into ahead and behind based on current direction.
        let (ahead, behind): (Vec<_>, Vec<_>) = match self.direction {
            ScanDirection::Up => interesting.iter().partition(|(_, p)| *p > pos + EPSILON),
            ScanDirection::Down => interesting.iter().partition(|(_, p)| *p < pos - EPSILON),
        };

        if !ahead.is_empty() {
            let nearest = match self.direction {
                ScanDirection::Up => ahead
                    .iter()
                    .min_by(|a: &&&(EntityId, f64), b: &&&(EntityId, f64)| {
                        a.1.partial_cmp(&b.1).unwrap()
                    }),
                ScanDirection::Down => ahead
                    .iter()
                    .max_by(|a: &&&(EntityId, f64), b: &&&(EntityId, f64)| {
                        a.1.partial_cmp(&b.1).unwrap()
                    }),
            };
            return DispatchDecision::GoToStop(nearest.unwrap().0);
        }

        // Nothing ahead — reverse direction.
        self.direction = match self.direction {
            ScanDirection::Up => ScanDirection::Down,
            ScanDirection::Down => ScanDirection::Up,
        };

        if behind.is_empty() {
            // All interesting stops at current position (handled above).
            return interesting
                .first()
                .map(|(sid, _)| DispatchDecision::GoToStop(*sid))
                .unwrap_or(DispatchDecision::Idle);
        }

        let nearest = match self.direction {
            ScanDirection::Up => behind
                .iter()
                .min_by(|a: &&&(EntityId, f64), b: &&&(EntityId, f64)| {
                    a.1.partial_cmp(&b.1).unwrap()
                }),
            ScanDirection::Down => behind
                .iter()
                .max_by(|a: &&&(EntityId, f64), b: &&&(EntityId, f64)| {
                    a.1.partial_cmp(&b.1).unwrap()
                }),
        };

        DispatchDecision::GoToStop(nearest.unwrap().0)
    }
}
