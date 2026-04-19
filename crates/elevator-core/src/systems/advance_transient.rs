//! Phase 1: advance transient rider states and tick patience.

use crate::components::{Patience, RiderPhase, Route, TransportMode};
use crate::entity::EntityId;
use crate::events::{Event, EventBus};
use crate::rider_index::RiderIndex;
use crate::world::World;

use super::PhaseContext;

/// What to do with a transient rider.
enum TransientAction {
    /// Boarding → Riding.
    Board(EntityId),
    /// Exiting → check route or Arrived.
    Exit,
}

/// Handle a rider that has just exited: advance the route and transition to
/// the appropriate phase. Walk legs are executed immediately (the rider is
/// teleported to the walk destination).
fn handle_exit(
    id: EntityId,
    world: &mut World,
    events: &mut EventBus,
    ctx: &PhaseContext,
    rider_index: &mut RiderIndex,
) {
    // Check if the route has more legs.
    let has_more_legs = world.route_mut(id).is_some_and(Route::advance);

    if has_more_legs {
        // Consume consecutive Walk legs (teleport rider to each destination).
        loop {
            let is_walk = world
                .route(id)
                .and_then(|r| r.current())
                .is_some_and(|leg| matches!(leg.via, TransportMode::Walk));

            if !is_walk {
                break;
            }

            let walk_dest = world.route(id).and_then(Route::current_destination);
            if let Some(dest) = walk_dest {
                if let Some(r) = world.rider_mut(id) {
                    r.current_stop = Some(dest);
                }
                let more = world.route_mut(id).is_some_and(Route::advance);
                if !more {
                    if let Some(r) = world.rider_mut(id) {
                        r.phase = RiderPhase::Arrived;
                    }
                    // Route complete after walk — skip to invalidation check.
                    break;
                }
            } else {
                break;
            }
        }

        // If still routing (didn't Arrive during walk), wait for next leg.
        if world
            .rider(id)
            .is_some_and(|r| r.phase() != RiderPhase::Arrived)
        {
            // Record arrival at transfer stops so the arrival log and
            // dispatch manifest count demand at sky-lobby floors. Reset
            // both `spawn_tick` and `Patience::waited_ticks` so per-leg
            // wait is measured, not lifetime — `build_manifest` falls
            // back to `spawn_tick` for riders without Patience, so
            // resetting only one of the two would leave that path stuck
            // on the lifetime counter. Matches `reroute_rider`.
            if let Some(r) = world.rider_mut(id) {
                r.phase = RiderPhase::Waiting;
                r.spawn_tick = ctx.tick;
            }
            if let Some(stop) = world.rider(id).and_then(|r| r.current_stop) {
                rider_index.insert_waiting(stop, id);
                if let Some(log) = world.resource_mut::<crate::arrival_log::ArrivalLog>() {
                    log.record(ctx.tick, stop);
                }
                if let Some(p) = world.patience_mut(id) {
                    p.waited_ticks = 0;
                }
            }
        }
    } else if let Some(r) = world.rider_mut(id) {
        r.phase = RiderPhase::Arrived;
    }

    // If the rider's next destination is disabled, emit an invalidation event.
    // The game (or a hook) can then reroute the rider.
    let still_routing = world
        .rider(id)
        .is_some_and(|r| r.phase() == RiderPhase::Waiting);
    if still_routing
        && let Some(route) = world.route(id)
        && let Some(dest) = route.current_destination()
        && world.is_disabled(dest)
    {
        events.emit(Event::RouteInvalidated {
            rider: id,
            affected_stop: dest,
            reason: crate::events::RouteInvalidReason::StopDisabled,
            tick: ctx.tick,
        });
    }
}

/// Advance transient rider phases.
///
/// Boarding → Riding, Exiting → check route:
///   - If more legs remain → Waiting (at transfer stop)
///   - If route complete → Arrived
///
/// These transient states last exactly one tick so they're
/// visible for one frame in the visualization.
pub fn run(
    world: &mut World,
    events: &mut EventBus,
    ctx: &PhaseContext,
    rider_index: &mut RiderIndex,
) {
    // Only collect riders in transient phases to avoid allocating all IDs.
    let actionable: Vec<_> = world
        .iter_riders()
        .filter_map(|(id, r)| {
            if world.is_disabled(id) {
                return None;
            }
            match r.phase {
                RiderPhase::Boarding(eid) => Some((id, TransientAction::Board(eid))),
                RiderPhase::Exiting(_) => Some((id, TransientAction::Exit)),
                _ => None,
            }
        })
        .collect();

    for (id, action) in actionable {
        match action {
            TransientAction::Board(eid) => {
                if let Some(r) = world.rider_mut(id) {
                    r.phase = RiderPhase::Riding(eid);
                }
            }
            TransientAction::Exit => handle_exit(id, world, events, ctx, rider_index),
        }
    }

    // Tick patience for waiting riders and abandon those who exceed their limit.
    // Collect: (rider_id, stop_id) — only riders with a current_stop can abandon.
    let abandon: Vec<(EntityId, EntityId)> = world
        .iter_riders()
        .filter_map(|(id, r)| {
            if world.is_disabled(id) || r.phase != RiderPhase::Waiting {
                return None;
            }
            let patience = world.patience(id)?;
            let stop = r.current_stop?;
            if patience.waited_ticks >= patience.max_wait_ticks {
                Some((id, stop))
            } else {
                None
            }
        })
        .collect();

    // Increment waited_ticks for all waiting riders with patience (including those about to abandon).
    let waiting_with_patience: Vec<EntityId> = world
        .iter_riders()
        .filter(|(id, r)| {
            !world.is_disabled(*id)
                && r.phase == RiderPhase::Waiting
                && world.patience(*id).is_some()
        })
        .map(|(id, _)| id)
        .collect();

    for id in waiting_with_patience {
        if let Some(p) = world.patience_mut(id) {
            p.waited_ticks = p.waited_ticks.saturating_add(1);
        }
    }

    // Apply abandonments.
    for &(id, stop) in &abandon {
        if let Some(r) = world.rider_mut(id) {
            r.phase = RiderPhase::Abandoned;
        }
        // An abandoned rider is not a waiter any more; leaving their
        // ID in `pending_riders` would spuriously hold car calls open
        // and count them in mode-detection `is_empty()` checks.
        world.scrub_rider_from_pending_calls(id);
        rider_index.remove_waiting(stop, id);
        rider_index.insert_abandoned(stop, id);
        events.emit(Event::RiderAbandoned {
            rider: id,
            stop,
            tick: ctx.tick,
        });
    }

    // Time-triggered abandonment: riders with `Preferences::abandon_after_ticks`
    // give up once their *waiting* time exceeds their budget. Uses
    // `Patience::waited_ticks` when available — that counter only
    // increments while the rider is in `Waiting`, so it excludes ride
    // time for multi-leg routes. Riders without `Patience` fall back
    // to `tick - spawn_tick`; `handle_exit` and `reroute_rider` reset
    // `spawn_tick` on every Waiting re-entry, so the fallback is also
    // per-leg. Runs after the patience path so both limits can coexist.
    let time_abandon: Vec<(EntityId, EntityId)> = world
        .iter_riders()
        .filter_map(|(id, r)| {
            if world.is_disabled(id) || r.phase != RiderPhase::Waiting {
                return None;
            }
            let prefs = world.preferences(id)?;
            let threshold = prefs.abandon_after_ticks()?;
            let stop = r.current_stop?;
            let waited = world.patience(id).map_or_else(
                || ctx.tick.saturating_sub(r.spawn_tick),
                Patience::waited_ticks,
            );
            if waited >= u64::from(threshold) {
                Some((id, stop))
            } else {
                None
            }
        })
        .collect();
    for (id, stop) in time_abandon {
        if let Some(r) = world.rider_mut(id) {
            r.phase = RiderPhase::Abandoned;
        }
        world.scrub_rider_from_pending_calls(id);
        rider_index.remove_waiting(stop, id);
        rider_index.insert_abandoned(stop, id);
        events.emit(Event::RiderAbandoned {
            rider: id,
            stop,
            tick: ctx.tick,
        });
    }

    // Acknowledge hall/car calls whose latency window has elapsed.
    ack_hall_calls(world, events, ctx.tick);
    ack_car_calls(world, events, ctx.tick);
}

/// Mark hall calls acknowledged once their ack-latency window elapses
/// and emit [`Event::HallCallAcknowledged`] for each newly-visible call.
fn ack_hall_calls(world: &mut World, events: &mut EventBus, tick: u64) {
    use crate::components::CallDirection;
    // Collect first to avoid long-lived mutable borrow over the iter.
    let mut to_ack: Vec<(EntityId, CallDirection)> = Vec::new();
    for call in world.iter_hall_calls() {
        if call.acknowledged_at.is_some() {
            continue;
        }
        if tick.saturating_sub(call.press_tick) >= u64::from(call.ack_latency_ticks) {
            to_ack.push((call.stop, call.direction));
        }
    }
    for (stop, direction) in to_ack {
        if let Some(call) = world.hall_call_mut(stop, direction) {
            call.acknowledged_at = Some(tick);
        }
        events.emit(Event::HallCallAcknowledged {
            stop,
            direction,
            tick,
        });
    }
}

/// Same as [`ack_hall_calls`] but for per-car floor buttons.
fn ack_car_calls(world: &mut World, _events: &mut EventBus, tick: u64) {
    let car_ids: Vec<EntityId> = world.elevator_ids();
    for car in car_ids {
        let calls = world.car_calls_mut(car);
        let Some(calls) = calls else { continue };
        for call in calls.iter_mut() {
            if call.acknowledged_at.is_some() {
                continue;
            }
            if tick.saturating_sub(call.press_tick) >= u64::from(call.ack_latency_ticks) {
                call.acknowledged_at = Some(tick);
                // Car-call acks don't currently emit an event; dispatch
                // reads `acknowledged_at` directly. Left silent so games
                // don't drown in one event per rider per trip.
            }
        }
    }
}
