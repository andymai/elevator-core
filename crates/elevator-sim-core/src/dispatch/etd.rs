//! Estimated Time to Destination (ETD) dispatch algorithm.

use crate::components::ElevatorPhase;
use crate::entity::EntityId;
use crate::world::World;

use super::{DispatchDecision, DispatchManifest, DispatchStrategy, ElevatorGroup};

/// Estimated Time to Destination (ETD) dispatch algorithm.
///
/// Industry-standard algorithm for modern elevator systems. For each
/// pending call, evaluates every elevator and assigns the one that
/// minimizes total cost: (time to serve the new rider) + (delay imposed
/// on all existing riders).
///
/// This produces better average wait times than SCAN/LOOK, especially
/// with multiple elevators, at the cost of more computation per dispatch.
pub struct EtdDispatch {
    /// Weight for the "delay to existing riders" component of the cost.
    /// Higher values prioritize existing riders over new ones.
    pub delay_weight: f64,
}

impl EtdDispatch {
    /// Create a new `EtdDispatch` with default delay weight of 1.0.
    pub const fn new() -> Self {
        Self { delay_weight: 1.0 }
    }

    /// Create a new `EtdDispatch` with the given delay weight.
    pub const fn with_delay_weight(delay_weight: f64) -> Self {
        Self { delay_weight }
    }
}

impl Default for EtdDispatch {
    fn default() -> Self {
        Self::new()
    }
}

impl DispatchStrategy for EtdDispatch {
    fn decide(
        &mut self,
        _elevator: EntityId,
        _elevator_position: f64,
        _group: &ElevatorGroup,
        _manifest: &DispatchManifest,
        _world: &World,
    ) -> DispatchDecision {
        // Not used — decide_all() handles group coordination.
        DispatchDecision::Idle
    }

    fn decide_all(
        &mut self,
        elevators: &[(EntityId, f64)],
        group: &ElevatorGroup,
        manifest: &DispatchManifest,
        world: &World,
    ) -> Vec<(EntityId, DispatchDecision)> {
        // Collect stops needing service.
        let pending_stops: Vec<(EntityId, f64)> = group
            .stop_entities
            .iter()
            .filter_map(|&stop_eid| {
                let has_demand = manifest
                    .demand_at_stop
                    .get(&stop_eid)
                    .is_some_and(|d| d.waiting_count > 0);
                let has_riders = manifest
                    .rider_destinations
                    .get(&stop_eid)
                    .is_some_and(|&c| c > 0);
                if has_demand || has_riders {
                    world.stop_position(stop_eid).map(|pos| (stop_eid, pos))
                } else {
                    None
                }
            })
            .collect();

        if pending_stops.is_empty() {
            return elevators
                .iter()
                .map(|(eid, _)| (*eid, DispatchDecision::Idle))
                .collect();
        }

        let mut results: Vec<(EntityId, DispatchDecision)> = Vec::new();
        let mut assigned_elevators: Vec<EntityId> = Vec::new();

        // For each pending stop, find the elevator with minimum ETD cost.
        for (stop_eid, stop_pos) in &pending_stops {
            let mut best_elevator: Option<EntityId> = None;
            let mut best_cost = f64::INFINITY;

            for &(elev_eid, elev_pos) in elevators {
                if assigned_elevators.contains(&elev_eid) {
                    continue;
                }

                let cost = self.compute_cost(
                    elev_eid,
                    elev_pos,
                    *stop_pos,
                    &pending_stops,
                    manifest,
                    world,
                );

                if cost < best_cost {
                    best_cost = cost;
                    best_elevator = Some(elev_eid);
                }
            }

            if let Some(elev_eid) = best_elevator {
                results.push((elev_eid, DispatchDecision::GoToStop(*stop_eid)));
                assigned_elevators.push(elev_eid);
            }
        }

        // Unassigned elevators idle.
        for (eid, _) in elevators {
            if !assigned_elevators.contains(eid) {
                results.push((*eid, DispatchDecision::Idle));
            }
        }

        results
    }
}

impl EtdDispatch {
    /// Compute ETD cost for assigning an elevator to serve a stop.
    ///
    /// Cost = (time for elevator to reach the stop) + `delay_weight` * (delay to existing riders)
    fn compute_cost(
        &self,
        elev_eid: EntityId,
        elev_pos: f64,
        target_pos: f64,
        _pending_stops: &[(EntityId, f64)],
        _manifest: &DispatchManifest,
        world: &World,
    ) -> f64 {
        let Some(car) = world.elevator(elev_eid) else {
            return f64::INFINITY;
        };

        // Time to reach the target stop (simple distance / max_speed estimate).
        let distance = (elev_pos - target_pos).abs();
        let travel_time = if car.max_speed > 0.0 {
            distance / car.max_speed
        } else {
            f64::INFINITY
        };

        // Penalty: how many existing riders would be delayed?
        // Each rider on this elevator that needs to go somewhere else
        // would be delayed by roughly the detour time.
        let existing_rider_count = car.riders.len() as f64;
        let delay_penalty = existing_rider_count * travel_time;

        // Bonus: if the elevator is already heading toward this stop
        // (same direction), reduce cost.
        let direction_bonus = match car.phase {
            ElevatorPhase::MovingToStop(current_target) => {
                world.stop_position(current_target).map_or(0.0, |current_target_pos| {
                    let moving_up = current_target_pos > elev_pos;
                    let target_is_ahead = if moving_up {
                        target_pos > elev_pos && target_pos <= current_target_pos
                    } else {
                        target_pos < elev_pos && target_pos >= current_target_pos
                    };
                    if target_is_ahead { -travel_time * 0.5 } else { 0.0 }
                })
            }
            ElevatorPhase::Idle => -travel_time * 0.3, // Slight bonus for idle elevators.
            _ => 0.0,
        };

        self.delay_weight.mul_add(delay_penalty, travel_time) + direction_bonus
    }
}
