//! Phase 7 (optional): reposition idle elevators for better coverage.
//!
//! Runs after dispatch. Only acts on elevators that are still idle
//! (no pending assignment from the dispatch phase). Each group's
//! [`RepositionStrategy`] decides where to send idle cars.

use crate::components::ElevatorPhase;
use crate::dispatch::reposition::RepositionCooldowns;
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
    decisions: &mut Vec<(EntityId, EntityId)>,
) {
    // Snapshot cooldown eligibility into an owned map so the filter
    // closure below doesn't hold a borrow of `world` that conflicts
    // with the per-car `world.elevator(eid)` look-ups.
    let cooldowns_snapshot: Option<RepositionCooldowns> =
        world.resource::<RepositionCooldowns>().cloned();

    for group in groups {
        let Some(strategy) = repositioners.get_mut(&group.id()) else {
            continue;
        };

        let idle_elevators: Vec<(EntityId, f64)> = group
            .elevator_entities()
            .iter()
            .filter_map(|&eid| {
                if world.is_disabled(eid) {
                    return None;
                }
                if world
                    .service_mode(eid)
                    .is_some_and(|m| m.is_dispatch_excluded())
                {
                    return None;
                }
                // Recently-arrived reposition targets stay out of the
                // pool until their cooldown elapses. Otherwise the
                // next pass can immediately send the same car somewhere
                // new as the hot-stop ranking shifts — churn we want
                // to avoid.
                if let Some(cd) = &cooldowns_snapshot
                    && cd.is_cooling_down(eid, ctx.tick)
                {
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

        let stop_positions: Vec<(EntityId, f64)> = group
            .stop_entities()
            .iter()
            .filter_map(|&sid| world.stop_position(sid).map(|p| (sid, p)))
            .collect();

        if stop_positions.is_empty() {
            continue;
        }

        decisions.clear();
        strategy.reposition(&idle_elevators, &stop_positions, group, world, decisions);

        for &(elev_eid, target_stop) in decisions.iter() {
            if let Some(car) = world.elevator_mut(elev_eid) {
                car.phase = ElevatorPhase::Repositioning(target_stop);
                car.target_stop = Some(target_stop);
                car.repositioning = true;
            }

            // Update direction indicators from target vs current position so
            // loading-phase direction gating matches the actual travel
            // direction. Mirrors the logic in `systems::dispatch`.
            let elev_pos = world.position(elev_eid).map(|p| p.value);
            if let Some(pos) = elev_pos {
                let target_pos = world.stop_position(target_stop).unwrap_or(pos);
                let (new_up, new_down) = if target_pos > pos {
                    (true, false)
                } else if target_pos < pos {
                    (false, true)
                } else {
                    (true, true)
                };
                super::dispatch::update_indicators(
                    world, events, elev_eid, new_up, new_down, ctx.tick,
                );
            }

            events.emit(Event::ElevatorRepositioning {
                elevator: elev_eid,
                to_stop: target_stop,
                tick: ctx.tick,
            });

            // Emit departure from current stop if applicable.
            if let Some(pos) = elev_pos
                && let Some(from) = world.find_stop_at_position(pos)
            {
                events.emit(Event::ElevatorDeparted {
                    elevator: elev_eid,
                    from_stop: from,
                    tick: ctx.tick,
                });
            }
        }
    }
}
