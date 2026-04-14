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
//!   redirect to the new front (or fall back to `Idle` if the queue is empty
//!   and we are not repositioning).

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
    elevator_ids: &[EntityId],
) {
    for &eid in elevator_ids {
        if world.is_disabled(eid) {
            continue;
        }
        let Some(car) = world.elevator(eid) else {
            continue;
        };
        // Don't interfere with repositioning — it has its own lifecycle.
        if car.repositioning {
            continue;
        }
        let phase = car.phase;
        let current_target = car.target_stop;
        let Some(queue) = world.destination_queue(eid) else {
            continue;
        };
        let front = queue.front();

        match phase {
            ElevatorPhase::Idle | ElevatorPhase::Stopped => {
                let Some(next) = front else { continue };
                let pos = world.position(eid).map_or(0.0, |p| p.value);
                let at_stop = world.find_stop_at_position(pos);
                if at_stop == Some(next) {
                    // Already at the queued stop — pop and open doors.
                    if let Some(q) = world.destination_queue_mut(eid) {
                        q.pop_front();
                    }
                    events.emit(Event::ElevatorArrived {
                        elevator: eid,
                        at_stop: next,
                        tick: ctx.tick,
                    });
                    if let Some(car) = world.elevator_mut(eid) {
                        car.phase = ElevatorPhase::DoorOpening;
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
            ElevatorPhase::MovingToStop(t) => {
                if front == Some(t) {
                    // In sync — nothing to do.
                    continue;
                }
                match front {
                    Some(new_target) => {
                        let pos = world.position(eid).map_or(0.0, |p| p.value);
                        let (new_up, new_down) = indicators_for_travel(world, new_target, pos);
                        if let Some(car) = world.elevator_mut(eid) {
                            car.phase = ElevatorPhase::MovingToStop(new_target);
                            car.target_stop = Some(new_target);
                        }
                        update_indicators(world, events, eid, new_up, new_down, ctx.tick);
                    }
                    None => {
                        // Queue was cleared; leave current target in place for
                        // this PR (clearing does not abort mid-flight — see
                        // TODO on Simulation::clear_destinations).
                        let _ = current_target;
                    }
                }
            }
            _ => {}
        }
    }
}
