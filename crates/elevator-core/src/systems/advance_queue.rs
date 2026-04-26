//! Reconcile each elevator's phase/target with the front of its
//! [`DestinationQueue`](crate::components::DestinationQueue).
//!
//! This phase runs after Dispatch and Reposition but before Movement.
//! Dispatch keeps driving elevators the usual way (it sets `target_stop`
//! and `phase` directly AND pushes to the queue, so they stay in sync).
//! This system is primarily responsible for responding to *imperative*
//! mutations from game code — `push_destination_front` / `clear_destinations`
//! — which may bypass dispatch entirely.
//!
//! Rules per elevator:
//!
//! - If phase is `Idle` or `Stopped` and the queue has a front stop:
//!   if we're already at that stop, pop it and open doors; otherwise
//!   transition to `MovingToStop(front)`.
//! - If phase is `MovingToStop(t)` and `queue.front() != Some(t)`:
//!   redirect to the new front.
//! - If phase is `Repositioning(t)` and `queue.front()` exists and differs
//!   from `t`: the imperative push wins. The repositioning move is
//!   cancelled (flag cleared, variant promoted to `MovingToStop(front)`)
//!   so game-driven itineraries override opportunistic reposition moves.

use crate::components::ElevatorPhase;
use crate::door::DoorState;
use crate::entity::EntityId;
use crate::events::{Event, EventBus};
use crate::world::World;

use super::PhaseContext;
use super::dispatch::update_indicators;

/// Compute directional indicator flags for an elevator heading from
/// `from_pos` toward the stop at `target`. Returns `(going_up, going_down)`.
/// Equal or missing target positions leave both lamps lit.
fn indicators_for_travel(world: &World, target: EntityId, from_pos: f64) -> (bool, bool) {
    match world.stop_position(target) {
        Some(p) if p > from_pos => (true, false),
        Some(p) if p < from_pos => (false, true),
        _ => (true, true),
    }
}

/// Reconcile every elevator's phase with its destination-queue front.
pub fn run(
    world: &mut World,
    events: &mut EventBus,
    ctx: &PhaseContext,
    groups: &[crate::dispatch::ElevatorGroup],
    elevator_ids: &[EntityId],
) {
    // Hoist the line→serves walk out of the per-elevator loop so the
    // O(groups × lines) work runs once per phase rather than per car.
    let serves_index = crate::dispatch::build_line_serves_index(groups);

    for &eid in elevator_ids {
        if world.is_disabled(eid) {
            continue;
        }
        let Some(car) = world.elevator(eid) else {
            continue;
        };
        let phase = car.phase;
        let current_target = car.target_stop;
        let is_repositioning = car.repositioning;
        let Some(queue) = world.destination_queue(eid) else {
            continue;
        };
        let front = queue.front();

        // A repositioning car with no imperative push in its queue keeps
        // repositioning — only explicit game-driven pushes should override.
        if is_repositioning && front.is_none() {
            continue;
        }

        match phase {
            ElevatorPhase::Idle | ElevatorPhase::Stopped => {
                let Some(next) = front else { continue };
                let pos = world.position(eid).map_or(0.0, |p| p.value);
                let serves =
                    crate::dispatch::elevator_line_serves_indexed(world, &serves_index, eid);
                let at_stop = serves.map_or_else(
                    || world.find_stop_at_position(pos),
                    |s| world.find_stop_at_position_in(pos, s),
                );
                if at_stop == Some(next) {
                    // Already at the queued stop — pop and open doors.
                    if let Some(q) = world.destination_queue_mut(eid) {
                        q.pop_front();
                    }
                    // Reset indicators to both-lit so stale direction flags
                    // from a prior trip don't filter out waiting riders in
                    // the loading phase. Mirrors dispatch.rs's arrive-in-place
                    // semantics.
                    update_indicators(world, events, eid, true, true, ctx.tick);
                    events.emit(Event::ElevatorArrived {
                        elevator: eid,
                        at_stop: next,
                        tick: ctx.tick,
                    });
                    if let Some(car) = world.elevator_mut(eid) {
                        car.phase = ElevatorPhase::DoorOpening;
                        car.target_stop = Some(next);
                        car.door =
                            DoorState::request_open(car.door_transition_ticks, car.door_open_ticks);
                    }
                } else {
                    let from_stop = at_stop;
                    let (new_up, new_down) = indicators_for_travel(world, next, pos);
                    if let Some(car) = world.elevator_mut(eid) {
                        car.phase = ElevatorPhase::MovingToStop(next);
                        car.target_stop = Some(next);
                    }
                    update_indicators(world, events, eid, new_up, new_down, ctx.tick);
                    if let Some(from) = from_stop {
                        events.emit(Event::ElevatorDeparted {
                            elevator: eid,
                            from_stop: from,
                            tick: ctx.tick,
                        });
                    }
                }
            }
            ElevatorPhase::MovingToStop(t) | ElevatorPhase::Repositioning(t) => {
                if front == Some(t) {
                    // In sync — nothing to do.
                    continue;
                }
                match front {
                    Some(new_target) => {
                        let pos = world.position(eid).map_or(0.0, |p| p.value);
                        let (new_up, new_down) = indicators_for_travel(world, new_target, pos);
                        if let Some(car) = world.elevator_mut(eid) {
                            // Imperative push promotes a reposition move
                            // into a dispatched trip; clear the flag so
                            // Movement phase runs the full arrival cycle.
                            car.phase = ElevatorPhase::MovingToStop(new_target);
                            car.target_stop = Some(new_target);
                            car.repositioning = false;
                        }
                        update_indicators(world, events, eid, new_up, new_down, ctx.tick);
                    }
                    None => {
                        // Queue cleared while moving: finish the current leg
                        // and go idle. Hard-aborting mid-flight is a separate
                        // operation (see Simulation::abort_movement).
                        let _ = current_target;
                    }
                }
            }
            _ => {}
        }
    }
}
