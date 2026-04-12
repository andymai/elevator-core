//! Phase 5: board and alight riders at stops with open doors.

use crate::components::{ElevatorPhase, RiderPhase, Route};
use crate::entity::EntityId;
use crate::error::RejectionReason;
use crate::events::{Event, EventBus};
use crate::world::World;

use super::PhaseContext;

/// Intermediate action collected in the read-only pass, applied in the mutation pass.
enum LoadAction {
    /// A rider exits the elevator at a stop.
    Alight {
        /// Rider entity leaving.
        rider: EntityId,
        /// Elevator entity being exited.
        elevator: EntityId,
        /// Stop entity where alighting occurs.
        stop: EntityId,
    },
    /// A rider enters the elevator.
    Board {
        /// Rider entity boarding.
        rider: EntityId,
        /// Elevator entity being boarded.
        elevator: EntityId,
        /// Weight the rider adds.
        weight: f64,
    },
    /// A rider is rejected from boarding.
    Reject {
        /// Rider entity rejected.
        rider: EntityId,
        /// Elevator entity that rejected the rider.
        elevator: EntityId,
        /// Why the rider was rejected.
        reason: RejectionReason,
    },
}

/// Read-only pass: inspect world state and collect one `LoadAction` per elevator.
fn collect_actions(world: &World) -> Vec<LoadAction> {
    let mut actions: Vec<LoadAction> = Vec::new();
    let elevator_ids = world.elevator_ids();

    for &eid in &elevator_ids {
        if world.is_disabled(eid) {
            continue;
        }
        let Some(car) = world.elevator(eid) else {
            continue;
        };
        if car.phase != ElevatorPhase::Loading {
            continue;
        }

        let pos = world.position(eid).map_or(0.0, |p| p.value);
        let Some(current_stop) = world.find_stop_at_position(pos) else {
            continue;
        };

        // Try to alight one rider whose route destination matches the current stop.
        let alight_rider = car
            .riders
            .iter()
            .find(|rid| {
                world.route(**rid).and_then(Route::current_destination) == Some(current_stop)
            })
            .copied();

        if let Some(rid) = alight_rider {
            actions.push(LoadAction::Alight {
                rider: rid,
                elevator: eid,
                stop: current_stop,
            });
            continue;
        }

        // Single pass: find a boardable rider (fits by weight) or a rejectable one (doesn't fit).
        let remaining_capacity = car.weight_capacity - car.current_load;
        let load_ratio = if car.weight_capacity > 0.0 {
            car.current_load / car.weight_capacity
        } else {
            1.0
        };
        let mut rejected_candidate: Option<EntityId> = None;
        let mut preference_rejected: Option<EntityId> = None;

        let board_rider = world.iter_riders().find_map(|(rid, rider)| {
            if world.is_disabled(rid) {
                return None;
            }
            if rider.phase != RiderPhase::Waiting || rider.current_stop != Some(current_stop) {
                return None;
            }
            // Must want to depart from this stop (check route leg origin).
            let route_ok = world
                .route(rid)
                .is_none_or(|route| route.current().is_none_or(|leg| leg.from == current_stop));
            if !route_ok {
                return None;
            }
            // Rider preferences: skip crowded elevators.
            if let Some(prefs) = world.preferences(rid)
                && prefs.skip_full_elevator
                && load_ratio > prefs.max_crowding_factor
            {
                if preference_rejected.is_none() {
                    preference_rejected = Some(rid);
                }
                return None;
            }
            if rider.weight <= remaining_capacity {
                Some((rid, rider.weight))
            } else {
                if rejected_candidate.is_none() {
                    rejected_candidate = Some(rid);
                }
                None
            }
        });

        if let Some((rid, weight)) = board_rider {
            actions.push(LoadAction::Board {
                rider: rid,
                elevator: eid,
                weight,
            });
            continue;
        }

        if let Some(rid) = rejected_candidate {
            actions.push(LoadAction::Reject {
                rider: rid,
                elevator: eid,
                reason: RejectionReason::OverCapacity,
            });
        } else if let Some(rid) = preference_rejected {
            actions.push(LoadAction::Reject {
                rider: rid,
                elevator: eid,
                reason: RejectionReason::PreferenceBased,
            });
        }
    }

    actions
}

/// Mutation pass: apply collected actions to the world and emit events.
fn apply_actions(
    actions: Vec<LoadAction>,
    world: &mut World,
    events: &mut EventBus,
    ctx: &PhaseContext,
) {
    for action in actions {
        match action {
            LoadAction::Alight {
                rider,
                elevator,
                stop,
            } => {
                // Guard: skip if rider is no longer Riding this elevator (another
                // elevator may have already alighted them in an earlier action).
                if world
                    .rider(rider)
                    .is_none_or(|r| r.phase != RiderPhase::Riding(elevator))
                {
                    continue;
                }
                let rider_weight = world.rider(rider).map_or(0.0, |rd| rd.weight);
                if let Some(car) = world.elevator_mut(elevator) {
                    car.riders.retain(|r| *r != rider);
                    car.current_load = (car.current_load - rider_weight).max(0.0);
                }
                if let Some(rd) = world.rider_mut(rider) {
                    rd.phase = RiderPhase::Alighting(elevator);
                    rd.current_stop = Some(stop);
                }
                events.emit(Event::RiderAlighted {
                    rider,
                    elevator,
                    stop,
                    tick: ctx.tick,
                });
            }
            LoadAction::Board {
                rider,
                elevator,
                weight,
            } => {
                // Guard: skip if rider is no longer Waiting (another elevator at
                // the same stop may have already boarded them in an earlier action).
                if world
                    .rider(rider)
                    .is_none_or(|r| r.phase != RiderPhase::Waiting)
                {
                    continue;
                }
                if let Some(car) = world.elevator_mut(elevator) {
                    car.current_load += weight;
                    car.riders.push(rider);
                }
                if let Some(rd) = world.rider_mut(rider) {
                    rd.phase = RiderPhase::Boarding(elevator);
                    rd.board_tick = Some(ctx.tick);
                    rd.current_stop = None;
                }
                events.emit(Event::RiderBoarded {
                    rider,
                    elevator,
                    tick: ctx.tick,
                });
            }
            LoadAction::Reject {
                rider,
                elevator,
                reason,
            } => {
                events.emit(Event::RiderRejected {
                    rider,
                    elevator,
                    reason,
                    tick: ctx.tick,
                });
            }
        }
    }
}

/// One rider boards or exits per tick per elevator.
pub fn run(world: &mut World, events: &mut EventBus, ctx: &PhaseContext) {
    let actions = collect_actions(world);
    apply_actions(actions, world, events, ctx);
}
