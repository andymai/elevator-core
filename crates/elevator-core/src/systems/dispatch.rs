//! Phase 2: assign idle/stopped elevators to stops via the dispatch strategy.

use crate::components::{ElevatorPhase, RiderPhase, Route, TransportMode};
use crate::dispatch::{
    DispatchDecision, DispatchManifest, DispatchStrategy, ElevatorGroup, RiderInfo,
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

        // Collect idle elevators in this group.
        let idle_elevators: Vec<(EntityId, f64)> = group
            .elevator_entities()
            .iter()
            .filter_map(|eid| {
                if world.is_disabled(*eid) {
                    return None;
                }
                // Skip elevators in Independent service mode.
                if world
                    .service_mode(*eid)
                    .is_some_and(|m| *m == crate::components::ServiceMode::Independent)
                {
                    return None;
                }
                let car = world.elevator(*eid)?;
                if matches!(car.phase, ElevatorPhase::Idle | ElevatorPhase::Stopped) {
                    let pos = world.position(*eid)?.value;
                    Some((*eid, pos))
                } else {
                    None
                }
            })
            .collect();

        if idle_elevators.is_empty() {
            continue;
        }

        let Some(dispatch) = dispatchers.get_mut(&group.id()) else {
            continue;
        };

        let decisions = dispatch.decide_all(&idle_elevators, group, &manifest, world);

        for (eid, decision) in decisions {
            match decision {
                DispatchDecision::GoToStop(stop_eid) => {
                    let pos = world.position(eid).map_or(0.0, |p| p.value);
                    let current_stop = world.find_stop_at_position(pos);

                    events.emit(Event::ElevatorAssigned {
                        elevator: eid,
                        stop: stop_eid,
                        tick: ctx.tick,
                    });

                    // Compute direction indicators from target vs current position.
                    let target_pos = world.stop_position(stop_eid).unwrap_or(pos);
                    let (new_up, new_down) = if target_pos > pos {
                        (true, false)
                    } else if target_pos < pos {
                        (false, true)
                    } else {
                        // At the target already — treat as idle (both lamps lit).
                        (true, true)
                    };
                    update_indicators(world, events, eid, new_up, new_down, ctx.tick);

                    // Already at this stop — open doors directly, don't push.
                    if current_stop == Some(stop_eid) {
                        // Pop the queue front if it equals this stop, mirroring
                        // the arrive-in-place branch of advance_queue.
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
                        continue;
                    }

                    // Push onto queue with adjacent dedup; emit event iff appended.
                    // Strategies with `pre_dispatch` (e.g. DestinationDispatch)
                    // may have already committed `stop_eid` to the queue —
                    // short-circuit to avoid a duplicate entry and a phantom
                    // `DestinationQueued` event.
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

    manifest
}
