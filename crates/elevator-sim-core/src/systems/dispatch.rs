//! Phase 2: assign idle/stopped elevators to stops via the dispatch strategy.

use crate::components::{ElevatorPhase, RiderPhase};
use crate::dispatch::{
    DispatchDecision, DispatchManifest, DispatchStrategy, ElevatorGroup, StopDemand,
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
        let manifest = build_manifest(world, group);

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

/// Build a dispatch manifest summarizing demand and rider destinations for a group.
fn build_manifest(world: &World, group: &ElevatorGroup) -> DispatchManifest {
    let mut manifest = DispatchManifest::default();

    // Demand: riders waiting at this group's stops.
    for (rid, rider) in world.iter_riders() {
        if world.is_disabled(rid) {
            continue;
        }
        if rider.phase != RiderPhase::Waiting {
            continue;
        }
        if let Some(stop) = rider.current_stop
            && group.stop_entities.contains(&stop) {
                let demand = manifest.demand_at_stop.entry(stop).or_insert_with(StopDemand::default);
                demand.waiting_count += 1;
                demand.total_waiting_weight += rider.weight;
            }
    }

    // Rider destinations: where current riders in this group's elevators want to go.
    for &elev_eid in &group.elevator_entities {
        if let Some(car) = world.elevator(elev_eid) {
            for &rider_eid in &car.riders {
                if let Some(route) = world.route(rider_eid)
                    && let Some(dest) = route.current_destination() {
                        *manifest.rider_destinations.entry(dest).or_default() += 1;
                    }
            }
        }
    }

    manifest
}
