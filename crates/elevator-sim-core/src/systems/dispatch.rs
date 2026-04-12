use crate::components::{ElevatorState, RiderState};
use crate::dispatch::{
    DispatchDecision, DispatchManifest, DispatchStrategy, ElevatorGroup, StopDemand,
};
use crate::entity::EntityId;
use crate::events::{EventBus, SimEvent};
use crate::ids::GroupId;
use crate::world::World;

use std::collections::HashMap;
use std::hash::BuildHasher;

use super::PhaseContext;

/// Assign idle/stopped elevators to stops via the dispatch strategy.
pub fn run<S: BuildHasher>(
    world: &mut World,
    events: &mut EventBus,
    ctx: &PhaseContext,
    groups: &[ElevatorGroup],
    dispatchers: &mut HashMap<GroupId, Box<dyn DispatchStrategy>, S>,
) {
    for group in groups {
        let manifest = build_manifest(world, group);

        // Collect idle elevators in this group.
        let idle_elevators: Vec<(EntityId, f64)> = group
            .elevator_entities
            .iter()
            .filter_map(|eid| {
                let car = world.elevator_cars.get(*eid)?;
                if matches!(car.state, ElevatorState::Idle | ElevatorState::Stopped) {
                    let pos = world.positions.get(*eid)?.value;
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
                    let pos = world.positions.get(eid).map_or(0.0, |p| p.value);
                    let current_stop = world.find_stop_at_position(pos);
                    if let Some(car) = world.elevator_cars.get_mut(eid) {
                        car.state = ElevatorState::MovingToStop(stop_eid);
                        car.target_stop = Some(stop_eid);
                    }
                    if let Some(from) = current_stop {
                        events.emit(SimEvent::ElevatorDeparted {
                            elevator: eid,
                            from_stop: from,
                            tick: ctx.tick,
                        });
                    }
                }
                DispatchDecision::Idle => {
                    if let Some(car) = world.elevator_cars.get_mut(eid) {
                        car.state = ElevatorState::Idle;
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
    for (_, rider) in world.riders() {
        if rider.state != RiderState::Waiting {
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
        if let Some(car) = world.elevator_cars.get(elev_eid) {
            for &rider_eid in &car.riders {
                if let Some(route) = world.routes.get(rider_eid)
                    && let Some(dest) = route.current_destination() {
                        *manifest.rider_destinations.entry(dest).or_default() += 1;
                    }
            }
        }
    }

    manifest
}
