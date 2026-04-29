//! Phase 5: board and exit riders at stops with open doors.

use crate::components::{ElevatorPhase, Line, Preferences, RiderPhase, Route, TransportMode};
use crate::entity::EntityId;
use crate::error::{RejectionContext, RejectionReason};
use crate::events::{Event, EventBus};
use crate::ids::GroupId;
use crate::rider_index::RiderIndex;
use crate::world::World;
use ordered_float::OrderedFloat;

use super::PhaseContext;
use super::dispatch::update_indicators;

/// Intermediate action collected in the read-only pass, applied in the mutation pass.
enum LoadAction {
    /// A rider exits the elevator at a stop.
    Exit {
        /// Rider entity leaving.
        rider: EntityId,
        /// Elevator entity being exited.
        elevator: EntityId,
        /// Stop entity where exiting occurs.
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
        /// Numeric details of the rejection.
        context: Option<RejectionContext>,
    },
    /// Re-light both direction indicator lamps on a car. Emitted when a
    /// Loading tick produces no board/exit/reject yet there is at least
    /// one eligible waiting rider filtered out solely by the car's
    /// directional lamps — without this, the car would cycle doors
    /// closed and be re-dispatched to the same stop indefinitely.
    ResetIndicators {
        /// Elevator whose lamps are being re-lit.
        elevator: EntityId,
    },
    /// A rider skipped an otherwise-eligible car because their
    /// preferences flagged it too crowded.
    Skip {
        /// Rider who skipped.
        rider: EntityId,
        /// Elevator they declined to board.
        elevator: EntityId,
        /// Stop where the skip happened.
        at_stop: EntityId,
    },
}

/// Read-only pass: inspect world state and collect one `LoadAction` per elevator.
#[allow(clippy::too_many_lines)]
fn collect_actions(
    world: &World,
    groups: &[crate::dispatch::ElevatorGroup],
    elevator_ids: &[EntityId],
    rider_index: &RiderIndex,
) -> Vec<LoadAction> {
    let mut actions: Vec<LoadAction> = Vec::new();

    // Hoist the line→serves lookup out of the per-elevator loop so the
    // O(groups × lines) walk runs once per phase, not once per car.
    let serves_index = crate::dispatch::build_line_serves_index(groups);

    for &eid in elevator_ids {
        if world.is_disabled(eid) {
            continue;
        }
        if !world
            .service_mode(eid)
            .copied()
            .unwrap_or_default()
            .allows_auto_loading()
        {
            continue;
        }
        let Some(car) = world.elevator(eid) else {
            continue;
        };
        if car.phase != ElevatorPhase::Loading {
            continue;
        }

        let pos = world.position(eid).map_or(0.0, |p| p.value);
        // Per-line lookup: a sky-lobby served by multiple banks
        // would otherwise resolve to whichever line's stop wins the
        // global linear scan, breaking exit/board matching for
        // riders on the bank this car *isn't* serving.
        let serves = crate::dispatch::elevator_line_serves_indexed(world, &serves_index, eid);
        let Some(current_stop) = serves.map_or_else(
            || world.find_stop_at_position(pos),
            |s| world.find_stop_at_position_in(pos, s),
        ) else {
            continue;
        };

        // Try to exit one rider whose route destination matches the current stop.
        let exit_rider = car
            .riders
            .iter()
            .find(|rid| {
                world.route(**rid).and_then(Route::current_destination) == Some(current_stop)
            })
            .copied();

        if let Some(rid) = exit_rider {
            actions.push(LoadAction::Exit {
                rider: rid,
                elevator: eid,
                stop: current_stop,
            });
            continue;
        }

        // Derive this elevator's group from its line component.
        let elev_line = car.line();
        let elev_group: Option<GroupId> = world.line(elev_line).map(Line::group);

        // Single pass: find a boardable rider (fits by weight) or a rejectable one (doesn't fit).
        let remaining_capacity = car.weight_capacity.value() - car.current_load.value();
        let load_ratio = if car.weight_capacity.value() > 0.0 {
            car.current_load.value() / car.weight_capacity.value()
        } else {
            1.0
        };
        let car_restricted_stops = &car.restricted_stops;
        let mut rejected_candidate: Option<EntityId> = None;
        let mut preference_rejected: Option<EntityId> = None;
        let mut access_rejected: Option<EntityId> = None;
        // Track riders filtered out only by the car's direction lamps —
        // used below to detect the "stuck doors" case where every waiting
        // rider wants to go the opposite direction from the car's indicator.
        let mut direction_filtered: Option<EntityId> = None;

        // Per-stop index excludes Residents; iter_riders would scan them all.
        let board_rider = rider_index
            .waiting_at(current_stop)
            .iter()
            .copied()
            .find_map(|rid| {
                if world.is_disabled(rid) {
                    return None;
                }
                let rider = world.rider(rid)?;
                // Must want to depart from this stop (check route leg origin).
                let route_ok = world
                    .route(rid)
                    .is_none_or(|route| route.current().is_none_or(|leg| leg.from == current_stop));
                if !route_ok {
                    return None;
                }
                // Sticky hall-call destination assignment: if this rider has been
                // assigned to another car, the current car must skip them so the
                // assigned car can pick them up. Stale assignments to a dead or
                // disabled car are ignored — the rider is fair game for any car —
                // as a defense against missed cleanup at car-loss boundaries.
                if let Some(crate::dispatch::AssignedCar(assigned)) =
                    world.ext::<crate::dispatch::AssignedCar>(rid)
                    && assigned != eid
                    && world.elevator(assigned).is_some()
                    && !world.is_disabled(assigned)
                {
                    return None;
                }
                // Group/line match: rider must want this elevator's group (or specific line).
                if let Some(route) = world.route(rid)
                    && let Some(leg) = route.current()
                {
                    match leg.via {
                        TransportMode::Group(g) => {
                            if elev_group != Some(g) {
                                return None;
                            }
                        }
                        TransportMode::Line(l) => {
                            if elev_line != l {
                                return None;
                            }
                        }
                        TransportMode::Walk => {
                            return None; // Walking riders don't board elevators.
                        }
                    }
                }
                // Access control: check rider can reach destination via this elevator.
                if let Some(dest) = world.route(rid).and_then(Route::current_destination) {
                    if car_restricted_stops.contains(&dest) {
                        if access_rejected.is_none() {
                            access_rejected = Some(rid);
                        }
                        return None;
                    }
                    if let Some(ac) = world.access_control(rid)
                        && !ac.can_access(dest)
                    {
                        if access_rejected.is_none() {
                            access_rejected = Some(rid);
                        }
                        return None;
                    }
                    // Direction indicator filter: rider must be going in a direction
                    // this car will serve. A filtered rider silently stays waiting —
                    // no rejection event — so a later car in the right direction can
                    // pick them up.
                    let cur_pos = world.position(current_stop).map(|p| p.value);
                    let dest_pos = world.position(dest).map(|p| p.value);
                    if let (Some(cp), Some(dp)) = (cur_pos, dest_pos) {
                        if dp > cp && !car.going_up {
                            if direction_filtered.is_none() {
                                direction_filtered = Some(rid);
                            }
                            return None;
                        }
                        if dp < cp && !car.going_down {
                            if direction_filtered.is_none() {
                                direction_filtered = Some(rid);
                            }
                            return None;
                        }
                    }
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
                if rider.weight.value() <= remaining_capacity {
                    Some((rid, rider.weight.value()))
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

        if let Some(rid) = access_rejected {
            actions.push(LoadAction::Reject {
                rider: rid,
                elevator: eid,
                reason: RejectionReason::AccessDenied,
                context: None,
            });
        } else if let Some(rid) = rejected_candidate {
            actions.push(LoadAction::Reject {
                rider: rid,
                elevator: eid,
                reason: RejectionReason::OverCapacity,
                context: Some(RejectionContext {
                    attempted_weight: world.rider(rid).map_or(0.0, |r| r.weight.value()).into(),
                    current_load: car.current_load.value().into(),
                    capacity: car.weight_capacity.value().into(),
                }),
            });
        } else if let Some(rid) = preference_rejected {
            actions.push(LoadAction::Reject {
                rider: rid,
                elevator: eid,
                reason: RejectionReason::PreferenceBased,
                context: Some(RejectionContext {
                    attempted_weight: world.rider(rid).map_or(0.0, |r| r.weight.value()).into(),
                    current_load: car.current_load.value().into(),
                    capacity: car.weight_capacity.value().into(),
                }),
            });
            // A preference-filtered rider just skipped a crowded car.
            // Emit an observable signal so games can animate it; the
            // rider remains Waiting unless `abandon_on_full` is set, in
            // which case the Skip arm below escalates to Abandoned
            // immediately — event-triggered, this phase, independent
            // of the abandon_after_ticks time budget.
            if let Some(stop) = world.rider(rid).and_then(|r| r.current_stop) {
                actions.push(LoadAction::Skip {
                    rider: rid,
                    elevator: eid,
                    at_stop: stop,
                });
            }
        } else if direction_filtered.is_some()
            && car.riders.is_empty()
            && !(car.going_up && car.going_down)
        {
            // Empty car, no boards / exits / rejections this tick, but at
            // least one eligible waiting rider was filtered out purely by
            // this car's direction lamps. Nothing commits the car to its
            // current direction — re-light both lamps so the next Loading
            // tick can board the rider. Otherwise doors would cycle closed
            // and dispatch would immediately re-send the car to the same
            // stop (infinite loop). Skipped when the car has riders aboard,
            // since their destinations legitimately pin the direction.
            actions.push(LoadAction::ResetIndicators { elevator: eid });
        }
    }

    actions
}

/// Mutation pass: apply collected actions to the world and emit events.
#[allow(clippy::too_many_lines)]
fn apply_actions(
    actions: Vec<LoadAction>,
    world: &mut World,
    events: &mut EventBus,
    ctx: &PhaseContext,
    rider_index: &mut RiderIndex,
) {
    for action in actions {
        match action {
            LoadAction::Exit {
                rider,
                elevator,
                stop,
            } => {
                // Guard: skip if rider is no longer Riding this elevator (another
                // elevator may have already exited them in an earlier action).
                if world
                    .rider(rider)
                    .is_none_or(|r| r.phase != RiderPhase::Riding(elevator))
                {
                    continue;
                }
                let rider_weight = world
                    .rider(rider)
                    .map_or(crate::components::Weight::ZERO, |rd| rd.weight);
                if let Some(car) = world.elevator_mut(elevator) {
                    car.riders.retain(|r| *r != rider);
                    car.current_load -= rider_weight;
                }
                let tag = world.rider(rider).map_or(0, crate::components::Rider::tag);
                if let Some(rd) = world.rider_mut(rider) {
                    rd.phase = RiderPhase::Exiting(elevator);
                    rd.current_stop = Some(stop);
                }
                events.emit(Event::RiderExited {
                    rider,
                    elevator,
                    stop,
                    tag,
                    tick: ctx.tick,
                });
                // Clear the rider from any CarCall's pending list; drop
                // CarCalls for this floor whose riders have all exited.
                if let Some(calls) = world.car_calls_mut(elevator) {
                    for c in calls.iter_mut() {
                        c.pending_riders.retain(|r| *r != rider);
                    }
                    calls.retain(|c| c.floor != stop || !c.pending_riders.is_empty());
                }
                if let Some(car) = world.elevator(elevator) {
                    events.emit(Event::CapacityChanged {
                        elevator,
                        current_load: OrderedFloat(car.current_load.value()),
                        capacity: OrderedFloat(car.weight_capacity.value()),
                        tick: ctx.tick,
                    });
                }
            }
            LoadAction::Board {
                rider,
                elevator,
                weight,
            } => {
                // Guard: skip if rider is no longer Waiting (another elevator at
                // the same stop may have already boarded them in an earlier action).
                let boarding_stop = world.rider(rider).and_then(|r| {
                    if r.phase == RiderPhase::Waiting {
                        r.current_stop
                    } else {
                        None
                    }
                });
                let Some(stop) = boarding_stop else {
                    continue;
                };
                rider_index.remove_waiting(stop, rider);
                if let Some(car) = world.elevator_mut(elevator) {
                    car.current_load += crate::components::Weight::from(weight);
                    car.riders.push(rider);
                }
                let tag = world.rider(rider).map_or(0, crate::components::Rider::tag);
                if let Some(rd) = world.rider_mut(rider) {
                    rd.phase = RiderPhase::Boarding(elevator);
                    rd.board_tick = Some(ctx.tick);
                    rd.current_stop = None;
                }
                events.emit(Event::RiderBoarded {
                    rider,
                    elevator,
                    tag,
                    tick: ctx.tick,
                });
                if let Some(car) = world.elevator(elevator) {
                    events.emit(Event::CapacityChanged {
                        elevator,
                        current_load: OrderedFloat(car.current_load.value()),
                        capacity: OrderedFloat(car.weight_capacity.value()),
                        tick: ctx.tick,
                    });
                }
                // Car-call registration: the rider "presses a floor
                // button" for their destination. Aggregates with any
                // existing call for the same floor. CarCall events are
                // only meaningful in Classic mode; in Destination mode
                // the destination was already known at press time, but
                // emitting here is still harmless bookkeeping.
                if let Some(dest) = world
                    .route(rider)
                    .and_then(crate::components::Route::current_destination)
                {
                    register_car_call(world, events, elevator, dest, rider, ctx.tick);
                }
            }
            LoadAction::Reject {
                rider,
                elevator,
                reason,
                context,
            } => {
                let tag = world.rider(rider).map_or(0, crate::components::Rider::tag);
                events.emit(Event::RiderRejected {
                    rider,
                    elevator,
                    reason,
                    context,
                    tag,
                    tick: ctx.tick,
                });
            }
            LoadAction::ResetIndicators { elevator } => {
                update_indicators(world, events, elevator, true, true, ctx.tick);
            }
            LoadAction::Skip {
                rider,
                elevator,
                at_stop,
            } => {
                let tag = world.rider(rider).map_or(0, crate::components::Rider::tag);
                events.emit(Event::RiderSkipped {
                    rider,
                    elevator,
                    at_stop,
                    tag,
                    tick: ctx.tick,
                });
                // Honor `Preferences::abandon_on_full`: the rider doesn't
                // wait for another car — they abandon immediately.
                let escalate = world
                    .preferences(rider)
                    .is_some_and(Preferences::abandon_on_full);
                if escalate
                    && world
                        .rider(rider)
                        .is_some_and(|r| r.phase == RiderPhase::Waiting)
                {
                    if let Some(r) = world.rider_mut(rider) {
                        r.phase = RiderPhase::Abandoned;
                    }
                    rider_index.remove_waiting(at_stop, rider);
                    rider_index.insert_abandoned(at_stop, rider);
                    events.emit(Event::RiderAbandoned {
                        rider,
                        stop: at_stop,
                        tag,
                        tick: ctx.tick,
                    });
                }
            }
        }
    }
}

/// Register a car-call on behalf of a rider who just boarded, emitting
/// [`Event::CarButtonPressed`] for the first press per floor.
fn register_car_call(
    world: &mut World,
    events: &mut EventBus,
    car: EntityId,
    floor: EntityId,
    rider: EntityId,
    tick: u64,
) {
    let Some(calls) = world.car_calls_mut(car) else {
        return;
    };
    if let Some(existing) = calls.iter_mut().find(|c| c.floor == floor) {
        if !existing.pending_riders.contains(&rider) {
            existing.pending_riders.push(rider);
        }
        return;
    }
    let mut call = crate::components::CarCall::new(car, floor, tick);
    call.pending_riders.push(rider);
    // Loading doesn't know the group's ack latency without a groups
    // slice in its signature. Conservative default: immediate ack —
    // real latency enforcement happens for hall calls (the user-facing
    // signal). CarCall latency can be plumbed through later.
    call.acknowledged_at = Some(tick);
    calls.push(call);
    let tag = world.rider(rider).map_or(0, crate::components::Rider::tag);
    events.emit(Event::CarButtonPressed {
        car,
        floor,
        rider: Some(rider),
        tag: Some(tag),
        tick,
    });
}

/// One rider boards or exits per tick per elevator.
pub fn run(
    world: &mut World,
    events: &mut EventBus,
    ctx: &PhaseContext,
    groups: &[crate::dispatch::ElevatorGroup],
    elevator_ids: &[EntityId],
    rider_index: &mut RiderIndex,
) {
    let actions = collect_actions(world, groups, elevator_ids, rider_index);
    apply_actions(actions, world, events, ctx, rider_index);
}
