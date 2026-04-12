//! Phase 1: advance transient rider states and tick patience.

use crate::components::{RiderPhase, Route};
use crate::entity::EntityId;
use crate::events::{Event, EventBus};
use crate::world::World;

use super::PhaseContext;

/// What to do with a transient rider.
enum TransientAction {
    /// Boarding → Riding.
    Board(EntityId),
    /// Alighting → check route or Arrived.
    Alight,
}

/// Advance transient rider phases.
///
/// Boarding → Riding, Alighting → check route:
///   - If more legs remain → Waiting (at transfer stop)
///   - If route complete → Arrived
///
/// These transient states last exactly one tick so they're
/// visible for one frame in the visualization.
pub fn run(world: &mut World, events: &mut EventBus, ctx: &PhaseContext) {
    // Only collect riders in transient phases to avoid allocating all IDs.
    let actionable: Vec<_> = world
        .iter_riders()
        .filter_map(|(id, r)| {
            if world.is_disabled(id) {
                return None;
            }
            match r.phase {
                RiderPhase::Boarding(eid) => Some((id, TransientAction::Board(eid))),
                RiderPhase::Alighting(_) => Some((id, TransientAction::Alight)),
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
            TransientAction::Alight => {
                // Check if the route has more legs.
                let has_more_legs = world.route_mut(id).is_some_and(Route::advance);

                if let Some(r) = world.rider_mut(id) {
                    if has_more_legs {
                        // Transfer: wait at the current stop for the next leg.
                        r.phase = RiderPhase::Waiting;
                    } else {
                        r.phase = RiderPhase::Arrived;
                    }
                }

                // If the rider's next destination is disabled, emit an invalidation event.
                // The game (or a hook) can then reroute the rider.
                if has_more_legs {
                    if let Some(route) = world.route(id) {
                        if let Some(dest) = route.current_destination() {
                            if world.is_disabled(dest) {
                                events.emit(Event::RouteInvalidated {
                                    rider: id,
                                    affected_stop: dest,
                                    reason: crate::events::RouteInvalidReason::StopDisabled,
                                    tick: ctx.tick,
                                });
                            }
                        }
                    }
                }
            }
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
            if patience.waited_ticks >= patience.max_wait_ticks.saturating_sub(1) {
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
    for (id, stop) in abandon {
        if let Some(r) = world.rider_mut(id) {
            r.phase = RiderPhase::Abandoned;
        }
        events.emit(Event::RiderAbandoned {
            rider: id,
            stop,
            tick: ctx.tick,
        });
    }
}
