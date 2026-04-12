//! Phase 2: assign idle/stopped elevators to stops via the dispatch strategy.

use crate::components::{ElevatorPhase, RiderPhase, Route};
use crate::dispatch::{
    DispatchDecision, DispatchManifest, DispatchStrategy, ElevatorGroup, RiderInfo,
};
use crate::entity::EntityId;
use crate::events::{Event, EventBus};
use crate::ids::GroupId;
use crate::world::World;

use std::collections::BTreeMap;

use super::PhaseContext;

/// Assign idle/stopped elevators to stops via the dispatch strategy.
pub fn run(
    world: &mut World,
    events: &mut EventBus,
    ctx: &PhaseContext,
    groups: &[ElevatorGroup],
    dispatchers: &mut BTreeMap<GroupId, Box<dyn DispatchStrategy>>,
) {
    for group in groups {
        let manifest = build_manifest(world, group, ctx.tick);

        // Collect idle elevators in this group.
        let idle_elevators: Vec<(EntityId, f64)> = group
            .elevator_entities
            .iter()
            .filter_map(|eid| {
                if world.is_disabled(*eid) {
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

        let Some(dispatch) = dispatchers.get_mut(&group.id) else {
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

                    // Already at this stop — open doors directly.
                    if current_stop == Some(stop_eid) {
                        events.emit(Event::ElevatorArrived {
                            elevator: eid,
                            at_stop: stop_eid,
                            tick: ctx.tick,
                        });
                        if let Some(car) = world.elevator_mut(eid) {
                            car.phase = ElevatorPhase::DoorOpening;
                            car.door = crate::door::DoorState::request_open(
                                car.door_transition_ticks,
                                car.door_open_ticks,
                            );
                        }
                        continue;
                    }

                    if let Some(car) = world.elevator_mut(eid) {
                        car.phase = ElevatorPhase::MovingToStop(stop_eid);
                        car.target_stop = Some(stop_eid);
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
                    if let Some(car) = world.elevator_mut(eid) {
                        car.phase = ElevatorPhase::Idle;
                    }
                }
            }
        }
    }
}

/// Build a dispatch manifest with per-rider metadata for a group.
fn build_manifest(world: &World, group: &ElevatorGroup, tick: u64) -> DispatchManifest {
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
            && group.stop_entities.contains(&stop)
        {
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
    for &elev_eid in &group.elevator_entities {
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

    manifest
}
