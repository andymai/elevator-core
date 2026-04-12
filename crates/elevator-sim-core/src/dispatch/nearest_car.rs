use crate::entity::EntityId;
use crate::world::World;

use super::{DispatchDecision, DispatchManifest, DispatchStrategy, ElevatorGroup};

/// Dispatch by assigning each call to the nearest idle elevator.
///
/// For multi-elevator groups, this overrides `decide_all()` to coordinate
/// across the entire group — preventing two elevators from responding to
/// the same call.
pub struct NearestCarDispatch;

impl NearestCarDispatch {
    /// Create a new `NearestCarDispatch`.
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
        let mut pending_stops: Vec<(EntityId, f64)> = Vec::new();
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
                && let Some(pos) = world.stop_position(stop_eid) {
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
        let mut assigned_stops: Vec<EntityId> = Vec::new();
        let mut assigned_elevators: Vec<EntityId> = Vec::new();

        // Greedy assignment: for each unassigned stop, find nearest unassigned elevator.
        // Sort stops by total demand (highest first) for priority.
        pending_stops.sort_by(|a, b| {
            let demand_a = manifest
                .demand_at_stop
                .get(&a.0)
                .map_or(0, |d| d.waiting_count);
            let demand_b = manifest
                .demand_at_stop
                .get(&b.0)
                .map_or(0, |d| d.waiting_count);
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
                    dist_a.partial_cmp(&dist_b).unwrap_or(std::cmp::Ordering::Equal)
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
