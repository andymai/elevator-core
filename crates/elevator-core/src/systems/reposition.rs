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

        // Apply per-elevator home-stop overrides first. Cars with a
        // hard-pinned home stop are routed there directly and removed
        // from the pool the strategy sees, so the strategy stays
        // single-purpose (no per-car override branch in N different
        // implementations) and a future strategy gets the behavior for
        // free.
        let strategy_pool =
            apply_home_stop_overrides(world, &idle_elevators, &stop_positions, decisions);
        strategy.reposition(&strategy_pool, &stop_positions, group, world, decisions);

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

            // Emit departure from current stop if applicable. Use the
            // per-line lookup so a sky-lobby served by multiple banks
            // doesn't ambiguously resolve to the wrong line's stop.
            if let Some(pos) = elev_pos {
                let serves = crate::dispatch::elevator_line_serves(world, groups, elev_eid);
                let from = serves.map_or_else(
                    || world.find_stop_at_position(pos),
                    |s| world.find_stop_at_position_in(pos, s),
                );
                if let Some(from) = from {
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

/// Pull pinned cars out of the idle pool and emit reposition decisions
/// straight to `decisions` for any pinned car that isn't already at
/// home. Returns the residual pool for the group's reposition strategy.
///
/// A pin is only honored when the home stop is in this group's served
/// set; a dangling `EntityId` (e.g. from a stop removal) silently falls
/// back to the strategy rather than emitting a decision the rest of
/// the pipeline can't act on.
fn apply_home_stop_overrides(
    world: &World,
    idle_elevators: &[(EntityId, f64)],
    stop_positions: &[(EntityId, f64)],
    decisions: &mut Vec<(EntityId, EntityId)>,
) -> Vec<(EntityId, f64)> {
    let mut strategy_pool: Vec<(EntityId, f64)> = Vec::with_capacity(idle_elevators.len());
    for &(elev_eid, elev_pos) in idle_elevators {
        // Fold "is this car pinned?" and "where is the pinned stop?"
        // into one lookup: if the home stop is missing from
        // `stop_positions` (e.g. removed since the pin was set), the
        // car silently falls back to the strategy pool rather than
        // emitting a dangling decision the rest of the pipeline can't
        // act on.
        let pinned: Option<(EntityId, f64)> = world
            .elevator(elev_eid)
            .and_then(crate::components::Elevator::home_stop)
            .and_then(|home_eid| stop_positions.iter().find(|(s, _)| *s == home_eid).copied());

        match pinned {
            Some((home_eid, home_pos)) => {
                // Only emit a reposition decision if the car isn't
                // already parked at home — matches `ReturnToLobby`'s
                // 1e-6 epsilon to avoid a no-op reposition cycle.
                if (elev_pos - home_pos).abs() > 1e-6 {
                    decisions.push((elev_eid, home_eid));
                }
            }
            None => strategy_pool.push((elev_eid, elev_pos)),
        }
    }
    strategy_pool
}
