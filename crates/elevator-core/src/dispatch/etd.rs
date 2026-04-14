//! Estimated Time to Destination (ETD) dispatch algorithm.
//!
//! The per-call cost-minimization approach is drawn from Barney, G. C. &
//! dos Santos, S. M., *Elevator Traffic Analysis, Design and Control* (2nd
//! ed., 1985). Commercial controllers (Otis Elevonic, KONE Polaris, etc.)
//! use variants of the same idea; this implementation is a simplified
//! educational model, not a faithful reproduction of any vendor's system.

use smallvec::SmallVec;

use crate::components::{ElevatorPhase, Route};
use crate::entity::EntityId;
use crate::world::World;

use super::{DispatchDecision, DispatchManifest, DispatchStrategy, ElevatorGroup};

/// Estimated Time to Destination (ETD) dispatch algorithm.
///
/// Industry-standard algorithm for modern elevator systems. For each
/// pending call, evaluates every elevator and assigns the one that
/// minimizes total cost: (time to serve the new rider) + (delay imposed
/// on all existing riders) + (door/loading overhead).
///
/// ## Cost model
///
/// `cost = wait_weight * travel_time
///       + delay_weight * existing_rider_delay
///       + door_weight * estimated_door_overhead
///       + direction_bonus`
///
/// Rider delay is computed from actual route destinations of riders
/// currently aboard each elevator.
pub struct EtdDispatch {
    /// Weight for travel time to reach the calling stop.
    pub wait_weight: f64,
    /// Weight for delay imposed on existing riders.
    pub delay_weight: f64,
    /// Weight for door open/close overhead at intermediate stops.
    pub door_weight: f64,
}

impl EtdDispatch {
    /// Create a new `EtdDispatch` with default weights.
    ///
    /// Defaults: `wait_weight = 1.0`, `delay_weight = 1.0`, `door_weight = 0.5`.
    #[must_use]
    pub const fn new() -> Self {
        Self {
            wait_weight: 1.0,
            delay_weight: 1.0,
            door_weight: 0.5,
        }
    }

    /// Create with a single delay weight (backwards-compatible shorthand).
    ///
    /// Sets `wait_weight = 1.0` and `door_weight = 0.5`.
    #[must_use]
    pub const fn with_delay_weight(delay_weight: f64) -> Self {
        Self {
            wait_weight: 1.0,
            delay_weight,
            door_weight: 0.5,
        }
    }

    /// Create with fully custom weights.
    #[must_use]
    pub const fn with_weights(wait_weight: f64, delay_weight: f64, door_weight: f64) -> Self {
        Self {
            wait_weight,
            delay_weight,
            door_weight,
        }
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
        let pending_stops: SmallVec<[(EntityId, f64); 16]> = group
            .stop_entities()
            .iter()
            .filter_map(|&stop_eid| {
                if manifest.has_demand(stop_eid) {
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
        let mut assigned_elevators: SmallVec<[EntityId; 16]> = SmallVec::new();

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
    /// Cost = `wait_weight` * travel\_time + `delay_weight` * existing\_rider\_delay
    ///      + `door_weight` * door\_overhead + direction\_bonus
    fn compute_cost(
        &self,
        elev_eid: EntityId,
        elev_pos: f64,
        target_pos: f64,
        pending_stops: &[(EntityId, f64)],
        _manifest: &DispatchManifest,
        world: &World,
    ) -> f64 {
        let Some(car) = world.elevator(elev_eid) else {
            return f64::INFINITY;
        };

        // Base travel time: distance / max_speed.
        let distance = (elev_pos - target_pos).abs();
        let travel_time = if car.max_speed > 0.0 {
            distance / car.max_speed
        } else {
            return f64::INFINITY;
        };

        // Door overhead: estimate per-stop overhead from door transitions and dwell.
        let door_overhead_per_stop = f64::from(car.door_transition_ticks * 2 + car.door_open_ticks);

        // Count intervening pending stops between elevator and target.
        let (lo, hi) = if elev_pos < target_pos {
            (elev_pos, target_pos)
        } else {
            (target_pos, elev_pos)
        };
        let intervening_stops = pending_stops
            .iter()
            .filter(|(_, pos)| *pos > lo + 1e-9 && *pos < hi - 1e-9)
            .count() as f64;
        let door_cost = intervening_stops * door_overhead_per_stop;

        // Delay to existing riders: each rider aboard heading elsewhere
        // would be delayed by roughly the detour time.
        let mut existing_rider_delay = 0.0_f64;
        for &rider_eid in car.riders() {
            if let Some(dest) = world.route(rider_eid).and_then(Route::current_destination)
                && let Some(dest_pos) = world.stop_position(dest)
            {
                // The rider wants to go to dest_pos. If the detour to
                // target_pos takes the elevator away from dest_pos, that's
                // a delay proportional to the extra distance.
                let direct_dist = (elev_pos - dest_pos).abs();
                let detour_dist = (elev_pos - target_pos).abs() + (target_pos - dest_pos).abs();
                let extra = (detour_dist - direct_dist).max(0.0);
                if car.max_speed > 0.0 {
                    existing_rider_delay += extra / car.max_speed;
                }
            }
        }

        // Bonus: if the elevator is already heading toward this stop
        // (same direction), reduce cost. Both dispatched (`MovingToStop`)
        // and repositioning cars are redirectable and get the same bonus.
        let direction_bonus = match car.phase.moving_target() {
            Some(current_target) => world.stop_position(current_target).map_or(0.0, |ctp| {
                let moving_up = ctp > elev_pos;
                let target_is_ahead = if moving_up {
                    target_pos > elev_pos && target_pos <= ctp
                } else {
                    target_pos < elev_pos && target_pos >= ctp
                };
                if target_is_ahead {
                    -travel_time * 0.5
                } else {
                    0.0
                }
            }),
            None if car.phase == ElevatorPhase::Idle => -travel_time * 0.3, // Slight bonus for idle elevators.
            _ => 0.0,
        };

        self.wait_weight.mul_add(
            travel_time,
            self.delay_weight.mul_add(
                existing_rider_delay,
                self.door_weight.mul_add(door_cost, direction_bonus),
            ),
        )
    }
}
