//! Phase 7 (optional): reposition idle elevators for better coverage.
//!
//! Runs after dispatch. Only acts on elevators that are still idle
//! (no pending assignment from the dispatch phase). Each group's
//! [`RepositionStrategy`] decides where to send idle cars.

use crate::components::ElevatorPhase;
use crate::dispatch::{ElevatorGroup, RepositionStrategy};
use crate::entity::EntityId;
use crate::events::{Event, EventBus};
use crate::ids::GroupId;
use crate::world::World;
use std::collections::BTreeMap;

use super::PhaseContext;

/// Reposition idle elevators according to per-group strategies.
pub fn run(
    world: &mut World,
    events: &mut EventBus,
    ctx: &PhaseContext,
    groups: &[ElevatorGroup],
    repositioners: &mut BTreeMap<GroupId, Box<dyn RepositionStrategy>>,
) {
    for group in groups {
        let Some(strategy) = repositioners.get_mut(&group.id()) else {
            continue;
        };

        // Collect idle elevators in this group.
        let idle_elevators: Vec<(EntityId, f64)> = group
            .elevator_entities()
            .iter()
            .filter_map(|&eid| {
                if world.is_disabled(eid) {
                    return None;
                }
                let car = world.elevator(eid)?;
                if car.phase == ElevatorPhase::Idle {
                    let pos = world.position(eid)?.value;
                    Some((eid, pos))
                } else {
                    None
                }
            })
            .collect();

        if idle_elevators.is_empty() {
            continue;
        }

        // Stop positions in this group.
        let stop_positions: Vec<(EntityId, f64)> = group
            .stop_entities()
            .iter()
            .filter_map(|&sid| world.stop_position(sid).map(|p| (sid, p)))
            .collect();

        if stop_positions.is_empty() {
            continue;
        }

        let decisions = strategy.reposition(&idle_elevators, &stop_positions, group, world);

        for (elev_eid, target_stop) in decisions {
            if let Some(car) = world.elevator_mut(elev_eid) {
                car.phase = ElevatorPhase::MovingToStop(target_stop);
                car.target_stop = Some(target_stop);
                car.repositioning = true;
            }

            events.emit(Event::ElevatorRepositioning {
                elevator: elev_eid,
                to_stop: target_stop,
                tick: ctx.tick,
            });

            // Emit departure from current stop if applicable.
            let elev_pos = world.position(elev_eid).map(|p| p.value);
            if let Some(pos) = elev_pos {
                if let Some(from) = world.find_stop_at_position(pos) {
                    events.emit(Event::ElevatorDeparted {
                        elevator: elev_eid,
                        from_stop: from,
                        tick: ctx.tick,
                    });
                }
            }
        }
    }
}
