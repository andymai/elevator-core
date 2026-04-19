//! Phase 2: assign idle/stopped elevators to stops via the dispatch strategy.

use crate::components::{ElevatorPhase, Route};
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
    // Guard: never dispatch an elevator to a stop it is restricted from.
    if world
        .elevator(eid)
        .is_some_and(|car| car.restricted_stops().contains(&stop_eid))
    {
        return;
    }

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
    if stop_pos > car_pos {
        update_assignment(world, stop, CallDirection::Up, car);
    } else if stop_pos < car_pos {
        update_assignment(world, stop, CallDirection::Down, car);
    } else {
        // Equal position: dispatch picks a stop, not a direction. If both
        // Up and Down calls exist at this stop, mark BOTH so the
        // public `sim.assigned_car(stop, _)` accessor gives a consistent
        // answer. Pre-fix only Up was updated (and only when an Up call
        // existed) — Down's `assigned_car` stayed stale, lying to
        // observability consumers. (#294)
        update_assignment(world, stop, CallDirection::Up, car);
        update_assignment(world, stop, CallDirection::Down, car);
    }
}

/// Helper: set `assigned_car` on a hall call if it exists and is unpinned.
fn update_assignment(
    world: &mut World,
    stop: EntityId,
    direction: crate::components::CallDirection,
    car: EntityId,
) {
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
#[allow(clippy::too_many_lines)]
pub fn build_manifest(
    world: &World,
    group: &ElevatorGroup,
    tick: u64,
    rider_index: &RiderIndex,
) -> DispatchManifest {
    let mut manifest = DispatchManifest::default();

    // Per-stop index is O(waiting_riders_in_group); iter_riders would be
    // O(total_riders · groups) and would include residents.
    for &stop in group.stop_entities() {
        for &rid in rider_index.waiting_at(stop) {
            if world.is_disabled(rid) {
                continue;
            }
            let Some(rider) = world.rider(rid) else {
                continue;
            };
            // Route-less riders are untargeted demand; routed riders must
            // match a leg this group can serve.
            let route = world.route(rid);
            if let Some(leg) = route.and_then(Route::current)
                && !group.accepts_leg(leg)
            {
                continue;
            }
            let destination = route.and_then(Route::current_destination);
            // `Patience::waited_ticks` resets each leg; `spawn_tick` is a
            // lifetime counter that overcounts wait at transfer stops.
            let wait_ticks = world.patience(rid).map_or_else(
                || tick.saturating_sub(rider.spawn_tick),
                crate::components::Patience::waited_ticks,
            );
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
                    let weight = rider.map_or(crate::components::Weight::ZERO, |r| r.weight);
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
    //
    // Filter on `is_acknowledged()` so nonzero `ack_latency_ticks`
    // actually hides calls from dispatch until the controller has
    // surfaced them — matches `HallCall::is_acknowledged`'s contract
    // ("when dispatch is allowed to see this call").
    for &stop in group.stop_entities() {
        if let Some(stop_calls) = world.stop_calls(stop) {
            let calls: Vec<_> = stop_calls
                .iter()
                .filter(|c| c.is_acknowledged())
                .cloned()
                .collect();
            if !calls.is_empty() {
                manifest.hall_calls_at_stop.insert(stop, calls);
            }
        }
    }

    // Populate car calls for each car in the group. Same ack filter —
    // a car call pressed under latency shouldn't be planned against
    // until the controller has registered it.
    for &car in group.elevator_entities() {
        let calls: Vec<_> = world
            .car_calls(car)
            .iter()
            .filter(|c| c.is_acknowledged())
            .cloned()
            .collect();
        if !calls.is_empty() {
            manifest.car_calls_by_car.insert(car, calls);
        }
    }

    // Snapshot rolling per-stop arrival rates. Strategies read this via
    // `DispatchManifest::arrivals_at` to drive mode switches and
    // predictive parking without touching world state directly.
    let window = crate::arrival_log::DEFAULT_ARRIVAL_WINDOW_TICKS;
    manifest.arrival_window_ticks = window;
    if let Some(log) = world.resource::<crate::arrival_log::ArrivalLog>() {
        for &stop in group.stop_entities() {
            let count = log.arrivals_in_window(stop, tick, window);
            if count > 0 {
                manifest.arrivals_at_stop.insert(stop, count);
            }
        }
    }

    manifest
}
