//! Phase 2: assign idle/stopped elevators to stops via the dispatch strategy.

use crate::components::{ElevatorPhase, RiderPhase, Route, TransportMode};
use crate::dispatch::{
    self, DispatchDecision, DispatchManifest, DispatchStrategy, ElevatorGroup, RiderInfo,
};
use crate::entity::EntityId;
use crate::events::{Event, EventBus};
use crate::ids::GroupId;
use crate::rider_index::RiderIndex;
use crate::world::World;

use std::collections::BTreeMap;

use super::PhaseContext;

/// Assign idle/stopped elevators to stops via the dispatch strategy.
#[allow(clippy::too_many_lines)]
pub fn run(
    world: &mut World,
    events: &mut EventBus,
    ctx: &PhaseContext,
    groups: &[ElevatorGroup],
    dispatchers: &mut BTreeMap<GroupId, Box<dyn DispatchStrategy>>,
    rider_index: &RiderIndex,
) {
    for group in groups {
        let manifest = build_manifest(world, group, ctx.tick, rider_index);

        // Give strategies a chance to mutate world state (e.g. write rider
        // assignments to extension storage) before per-elevator decisions.
        if let Some(dispatch) = dispatchers.get_mut(&group.id()) {
            dispatch.pre_dispatch(group, &manifest, world);
        }

        // Apply pinned hall-call assignments first. Pinned pairs are
        // committed straight to `GoToStop` and excluded from the normal
        // Hungarian matching so neither the car nor the stop can be
        // reassigned while the pin is in effect.
        let pinned_pairs: Vec<(EntityId, EntityId)> = world
            .iter_hall_calls()
            .filter(|c| c.pinned)
            .filter_map(|c| {
                c.assigned_car.and_then(|car| {
                    if group.stop_entities().contains(&c.stop)
                        && group.elevator_entities().contains(&car)
                    {
                        Some((car, c.stop))
                    } else {
                        None
                    }
                })
            })
            .collect();

        // Dispatch pool: idle/stopped cars, plus pre-pickup cars with
        // no riders aboard. The second class enables reassignment mid-
        // trip for cars that haven't picked anyone up yet. Cars carrying
        // riders stay committed to their current trip.
        let idle_elevators: Vec<(EntityId, f64)> = group
            .elevator_entities()
            .iter()
            .filter_map(|eid| {
                if world.is_disabled(*eid) {
                    return None;
                }
                if world
                    .service_mode(*eid)
                    .is_some_and(|m| m.is_dispatch_excluded())
                {
                    return None;
                }
                if pinned_pairs.iter().any(|(car, _)| car == eid) {
                    return None;
                }
                let car = world.elevator(*eid)?;
                let eligible = matches!(car.phase, ElevatorPhase::Idle | ElevatorPhase::Stopped)
                    || (matches!(car.phase, ElevatorPhase::MovingToStop(_))
                        && car.riders.is_empty()
                        && !car.repositioning);
                if eligible {
                    let pos = world.position(*eid)?.value;
                    Some((*eid, pos))
                } else {
                    None
                }
            })
            .collect();

        // Commit pinned pairs directly — they bypass the Hungarian
        // solver. Mirror the idle-pool eligibility gate so a pin can't
        // clobber a car mid-door-cycle. Cars in Loading / DoorOpening /
        // DoorClosing retain their current trip until doors are back to
        // closed; the pin is honored next tick.
        for (car_eid, stop_eid) in pinned_pairs.iter().copied() {
            let eligible = world.elevator(car_eid).is_some_and(|c| {
                matches!(c.phase, ElevatorPhase::Idle | ElevatorPhase::Stopped)
                    || (matches!(c.phase, ElevatorPhase::MovingToStop(_)) && c.riders.is_empty())
            });
            if eligible {
                commit_go_to_stop(world, events, ctx, car_eid, stop_eid);
            }
        }

        if idle_elevators.is_empty() {
            continue;
        }

        let Some(dispatch) = dispatchers.get_mut(&group.id()) else {
            continue;
        };

        let result = dispatch::assign(dispatch.as_mut(), &idle_elevators, group, &manifest, world);

        for (eid, decision) in result.decisions {
            match decision {
                DispatchDecision::GoToStop(stop_eid) => {
                    commit_go_to_stop(world, events, ctx, eid, stop_eid);
                    // Update the call's `assigned_car` so games querying
                    // `sim.assigned_car(...)` see dispatch's choice. The
                    // direction written matches the car's travel
                    // direction toward the stop — opposite-direction
                    // calls at the same floor keep their own bookkeeping.
                    record_hall_assignment(world, stop_eid, eid);
                }
                DispatchDecision::Idle => {
                    // Check if elevator was already idle before setting phase.
                    let was_idle = world
                        .elevator(eid)
                        .is_some_and(|car| car.phase == ElevatorPhase::Idle);
                    if let Some(car) = world.elevator_mut(eid) {
                        car.phase = ElevatorPhase::Idle;
                    }
                    // Reset indicators to both-lit when returning to idle.
                    update_indicators(world, events, eid, true, true, ctx.tick);
                    if !was_idle {
                        let at_stop = world
                            .position(eid)
                            .and_then(|p| world.find_stop_at_position(p.value));
                        events.emit(Event::ElevatorIdle {
                            elevator: eid,
                            at_stop,
                            tick: ctx.tick,
                        });
                    }
                }
            }
        }
    }
}

/// Commit a `GoToStop(stop_eid)` decision for `eid`. Encapsulates the
/// indicator update, arrive-in-place short-circuit, destination-queue
/// bookkeeping, phase transition, and departure event emission so
/// both the main dispatch loop and the pin-enforcement path share one
/// implementation.
fn commit_go_to_stop(
    world: &mut World,
    events: &mut EventBus,
    ctx: &PhaseContext,
    eid: EntityId,
    stop_eid: EntityId,
) {
    // Short-circuit the common reassignment case: the same car
    // already committed to the same stop on a prior tick. Re-emitting
    // `ElevatorAssigned` each tick would drown observability consumers
    // (metrics, UI) in redundant events.
    if let Some(car) = world.elevator(eid)
        && car.phase == ElevatorPhase::MovingToStop(stop_eid)
    {
        return;
    }

    let pos = world.position(eid).map_or(0.0, |p| p.value);
    let current_stop = world.find_stop_at_position(pos);

    events.emit(Event::ElevatorAssigned {
        elevator: eid,
        stop: stop_eid,
        tick: ctx.tick,
    });

    let target_pos = world.stop_position(stop_eid).unwrap_or(pos);
    let (new_up, new_down) = if target_pos > pos {
        (true, false)
    } else if target_pos < pos {
        (false, true)
    } else {
        (true, true)
    };
    update_indicators(world, events, eid, new_up, new_down, ctx.tick);

    if current_stop == Some(stop_eid) {
        if let Some(q) = world.destination_queue_mut(eid)
            && q.front() == Some(stop_eid)
        {
            q.pop_front();
        }
        events.emit(Event::ElevatorArrived {
            elevator: eid,
            at_stop: stop_eid,
            tick: ctx.tick,
        });
        if let Some(car) = world.elevator_mut(eid) {
            car.phase = ElevatorPhase::DoorOpening;
            car.target_stop = Some(stop_eid);
            car.door = crate::door::DoorState::request_open(
                car.door_transition_ticks,
                car.door_open_ticks,
            );
        }
        return;
    }

    if let Some(q) = world.destination_queue_mut(eid)
        && !q.contains(&stop_eid)
        && q.push_back(stop_eid)
    {
        events.emit(Event::DestinationQueued {
            elevator: eid,
            stop: stop_eid,
            tick: ctx.tick,
        });
    }

    if let Some(car) = world.elevator_mut(eid) {
        car.phase = ElevatorPhase::MovingToStop(stop_eid);
        car.target_stop = Some(stop_eid);
        car.repositioning = false;
    }
    if let Some(from) = current_stop {
        events.emit(Event::ElevatorDeparted {
            elevator: eid,
            from_stop: from,
            tick: ctx.tick,
        });
    }
}

/// Mirror dispatch's choice back onto the hall call so games querying
/// `Simulation::assigned_car` see which elevator is coming.
///
/// The direction is inferred from the car's travel vector toward the
/// stop: traveling up → serves the Up call; down → Down. An
/// already-at-stop commit (equal positions) writes to whichever
/// direction has a pending call, preferring Up if both exist. Only the
/// matching direction is updated — the other direction's call keeps
/// its own assignment bookkeeping.
fn record_hall_assignment(world: &mut World, stop: EntityId, car: EntityId) {
    use crate::components::CallDirection;
    let Some(car_pos) = world.position(car).map(|p| p.value) else {
        return;
    };
    let Some(stop_pos) = world.stop_position(stop) else {
        return;
    };
    let direction = if stop_pos > car_pos {
        CallDirection::Up
    } else if stop_pos < car_pos {
        CallDirection::Down
    } else {
        // Same position — prefer whichever call exists (Up first).
        if world.hall_call(stop, CallDirection::Up).is_some() {
            CallDirection::Up
        } else {
            CallDirection::Down
        }
    };
    if let Some(call) = world.hall_call_mut(stop, direction)
        && !call.pinned
    {
        call.assigned_car = Some(car);
    }
}

/// Update the direction indicator lamps on an elevator and emit a
/// [`Event::DirectionIndicatorChanged`] iff the pair actually changed.
///
/// Shared with `systems::advance_queue` so both dispatch- and
/// imperative-driven movement keep the indicators in sync.
pub fn update_indicators(
    world: &mut World,
    events: &mut EventBus,
    eid: EntityId,
    new_up: bool,
    new_down: bool,
    tick: u64,
) {
    let Some(car) = world.elevator_mut(eid) else {
        return;
    };
    if car.going_up == new_up && car.going_down == new_down {
        return;
    }
    car.going_up = new_up;
    car.going_down = new_down;
    events.emit(Event::DirectionIndicatorChanged {
        elevator: eid,
        going_up: new_up,
        going_down: new_down,
        tick,
    });
}

/// Build a dispatch manifest with per-rider metadata for a group.
fn build_manifest(
    world: &World,
    group: &ElevatorGroup,
    tick: u64,
    rider_index: &RiderIndex,
) -> DispatchManifest {
    let mut manifest = DispatchManifest::default();

    // Waiting riders at this group's stops.
    for (rid, rider) in world.iter_riders() {
        if world.is_disabled(rid) {
            continue;
        }
        if rider.phase != RiderPhase::Waiting {
            continue;
        }
        if let Some(stop) = rider.current_stop
            && group.stop_entities().contains(&stop)
        {
            // Group/line match: only include riders whose current route leg targets
            // this group (or one of its lines). Mirrors the filter in systems/loading.rs
            // so dispatch and loading agree about which riders this group can serve.
            if let Some(route) = world.route(rid)
                && let Some(leg) = route.current()
            {
                match leg.via {
                    TransportMode::Group(g) => {
                        if g != group.id() {
                            continue;
                        }
                    }
                    TransportMode::Line(l) => {
                        if !group.lines().iter().any(|line| line.entity() == l) {
                            continue;
                        }
                    }
                    TransportMode::Walk => continue,
                }
            }
            let destination = world.route(rid).and_then(Route::current_destination);
            let wait_ticks = tick.saturating_sub(rider.spawn_tick);
            manifest
                .waiting_at_stop
                .entry(stop)
                .or_default()
                .push(RiderInfo {
                    id: rid,
                    destination,
                    weight: rider.weight,
                    wait_ticks,
                });
        }
    }

    // Riders currently aboard this group's elevators, grouped by destination.
    for &elev_eid in group.elevator_entities() {
        if let Some(car) = world.elevator(elev_eid) {
            for &rider_eid in car.riders() {
                let destination = world.route(rider_eid).and_then(Route::current_destination);
                if let Some(dest) = destination {
                    let rider = world.rider(rider_eid);
                    let weight = rider.map_or(0.0, |r| r.weight);
                    manifest
                        .riding_to_stop
                        .entry(dest)
                        .or_default()
                        .push(RiderInfo {
                            id: rider_eid,
                            destination: Some(dest),
                            weight,
                            wait_ticks: 0,
                        });
                }
            }
        }
    }

    // Populate resident counts as read-only hints for dispatch strategies.
    for &stop in group.stop_entities() {
        let count = rider_index.resident_count_at(stop);
        if count > 0 {
            manifest.resident_count_at_stop.insert(stop, count);
        }
    }

    // Populate hall calls at group's stops. Strategies read these for
    // call age, pending-rider count, pin flags, and DCS destinations.
    for &stop in group.stop_entities() {
        if let Some(stop_calls) = world.stop_calls(stop) {
            let calls: Vec<_> = stop_calls.iter().cloned().collect();
            if !calls.is_empty() {
                manifest.hall_calls_at_stop.insert(stop, calls);
            }
        }
    }

    // Populate car calls for each car in the group.
    for &car in group.elevator_entities() {
        let calls = world.car_calls(car);
        if !calls.is_empty() {
            manifest.car_calls_by_car.insert(car, calls.to_vec());
        }
    }

    manifest
}
