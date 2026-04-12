//! Nearest-car dispatch — assigns each call to the closest idle elevator.

use smallvec::SmallVec;

use crate::entity::EntityId;
use crate::world::World;

use super::{DispatchDecision, DispatchManifest, DispatchStrategy, ElevatorGroup};

/// Assigns each call to the nearest idle elevator.
///
/// For multi-elevator groups, this overrides `decide_all()` to coordinate
/// across the entire group — preventing two elevators from responding to
/// the same call.
pub struct NearestCarDispatch;

impl NearestCarDispatch {
    /// Create a new `NearestCarDispatch`.
    #[must_use]
    pub const fn new() -> Self {
        Self
    }
}

impl Default for NearestCarDispatch {
    fn default() -> Self {
        Self::new()
    }
}

impl DispatchStrategy for NearestCarDispatch {
    fn decide(
        &mut self,
        _elevator: EntityId,
        _elevator_position: f64,
        _group: &ElevatorGroup,
        _manifest: &DispatchManifest,
        _world: &World,
    ) -> DispatchDecision {
        // Not used — decide_all() handles everything.
        DispatchDecision::Idle
    }

    fn decide_all(
        &mut self,
        elevators: &[(EntityId, f64)],
        group: &ElevatorGroup,
        manifest: &DispatchManifest,
        world: &World,
    ) -> Vec<(EntityId, DispatchDecision)> {
        // Collect stops that need service (have demand or rider destinations).
        let mut pending_stops: SmallVec<[(EntityId, f64); 16]> = SmallVec::new();
        for &stop_eid in group.stop_entities() {
            if manifest.has_demand(stop_eid)
                && let Some(pos) = world.stop_position(stop_eid)
            {
                pending_stops.push((stop_eid, pos));
            }
        }

        if pending_stops.is_empty() {
            return elevators
                .iter()
                .map(|(eid, _)| (*eid, DispatchDecision::Idle))
                .collect();
        }

        let mut results: Vec<(EntityId, DispatchDecision)> = Vec::new();
        let mut assigned_stops: SmallVec<[EntityId; 16]> = SmallVec::new();
        let mut assigned_elevators: SmallVec<[EntityId; 16]> = SmallVec::new();

        // Greedy assignment: for each unassigned stop, find nearest unassigned elevator.
        // Sort stops by total demand (highest first) for priority.
        pending_stops.sort_by(|a, b| {
            let demand_a = manifest.waiting_count_at(a.0);
            let demand_b = manifest.waiting_count_at(b.0);
            demand_b.cmp(&demand_a)
        });

        for (stop_eid, stop_pos) in &pending_stops {
            if assigned_stops.contains(stop_eid) {
                continue;
            }

            // Find nearest unassigned elevator.
            let nearest = elevators
                .iter()
                .filter(|(eid, _)| !assigned_elevators.contains(eid))
                .min_by(|a, b| {
                    let dist_a = (a.1 - stop_pos).abs();
                    let dist_b = (b.1 - stop_pos).abs();
                    dist_a.total_cmp(&dist_b)
                });

            if let Some((elev_eid, _)) = nearest {
                results.push((*elev_eid, DispatchDecision::GoToStop(*stop_eid)));
                assigned_elevators.push(*elev_eid);
                assigned_stops.push(*stop_eid);
            }
        }

        // Remaining unassigned elevators get Idle.
        for (eid, _) in elevators {
            if !assigned_elevators.contains(eid) {
                results.push((*eid, DispatchDecision::Idle));
            }
        }

        results
    }
}
