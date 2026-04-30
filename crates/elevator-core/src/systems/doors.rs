//! Phase 4: tick door FSMs and handle open/close phase transitions.

use crate::components::{ElevatorPhase, RiderPhase};
use crate::door::{DoorCommand, DoorState, DoorTransition};
use crate::entity::EntityId;
use crate::events::{Event, EventBus};
use crate::world::World;

use super::PhaseContext;

/// Tick door FSMs and handle phase transitions.
pub fn run(
    world: &mut World,
    events: &mut EventBus,
    ctx: &PhaseContext,
    groups: &[crate::dispatch::ElevatorGroup],
    elevator_ids: &[crate::entity::EntityId],
) {
    // Cars that just finished opening doors — collected so hall-call
    // clearing can run outside the `&mut Elevator` borrow below.
    let mut just_opened: Vec<(EntityId, EntityId, bool, bool)> = Vec::new();

    for &eid in elevator_ids {
        if world.is_disabled(eid) {
            continue;
        }

        let is_inspection = world
            .service_mode(eid)
            .is_some_and(|m| *m == crate::components::ServiceMode::Inspection);

        process_door_commands(world, events, ctx, groups, eid);

        let Some(car) = world.elevator_mut(eid) else {
            continue;
        };

        if car.door.is_closed() && car.phase != ElevatorPhase::DoorOpening {
            continue;
        }

        // In Inspection mode, hold doors open — don't tick the door FSM.
        if is_inspection && matches!(car.door, DoorState::Open { .. }) {
            continue;
        }

        let transition = car.door.tick();

        match transition {
            DoorTransition::FinishedOpening => {
                car.phase = ElevatorPhase::Loading;
                let (up, down) = (car.going_up, car.going_down);
                let at_stop = car.target_stop;
                events.emit(Event::DoorOpened {
                    elevator: eid,
                    tick: ctx.tick,
                });
                if let Some(stop) = at_stop {
                    just_opened.push((eid, stop, up, down));
                }
            }
            DoorTransition::FinishedOpen => {
                car.phase = ElevatorPhase::DoorClosing;
            }
            DoorTransition::FinishedClosing => {
                // Transition to Stopped with no committed target — the
                // car is at a stop and free for reassignment. Also
                // reset direction lamps so any stale state from the
                // just-finished leg (e.g., `going_up=false` after a
                // down-trip) doesn't make `pair_is_useful` reject
                // opposite-direction pickup in the next dispatch tick.
                // Without this, a car that dropped a down-bound rider
                // at the lobby sits idle while an up-bound rider
                // waits there — another car gets sent to serve them.
                let indicators_dirty = !(car.going_up && car.going_down);
                car.phase = ElevatorPhase::Stopped;
                car.target_stop = None;
                car.going_up = true;
                car.going_down = true;
                events.emit(Event::DoorClosed {
                    elevator: eid,
                    tick: ctx.tick,
                });
                if indicators_dirty {
                    events.emit(Event::DirectionIndicatorChanged {
                        elevator: eid,
                        going_up: true,
                        going_down: true,
                        tick: ctx.tick,
                    });
                }
            }
            DoorTransition::None => {}
        }
    }

    // Mirror real-world button-light behavior: clear hall calls at the
    // stop whose direction the arriving car is signalling. Runs outside
    // the per-car `&mut Elevator` borrow so it can mutate `hall_calls`.
    for (car, stop, going_up, going_down) in just_opened {
        clear_matching_hall_calls(world, events, car, stop, going_up, going_down, ctx.tick);
    }
}

/// Clear hall calls at `stop` whose direction matches the car's lamps.
/// Both lamps lit (idle-at-stop) clears both sides.
fn clear_matching_hall_calls(
    world: &mut World,
    events: &mut EventBus,
    car: EntityId,
    stop: EntityId,
    going_up: bool,
    going_down: bool,
    tick: u64,
) {
    use crate::components::CallDirection;
    if going_up && world.hall_call(stop, CallDirection::Up).is_some() {
        world.remove_hall_call(stop, CallDirection::Up);
        events.emit(Event::HallCallCleared {
            stop,
            direction: CallDirection::Up,
            car,
            tick,
        });
    }
    if going_down && world.hall_call(stop, CallDirection::Down).is_some() {
        world.remove_hall_call(stop, CallDirection::Down);
        events.emit(Event::HallCallCleared {
            stop,
            direction: CallDirection::Down,
            car,
            tick,
        });
    }
}

/// Drain any door commands that are now valid, leaving the rest queued.
fn process_door_commands(
    world: &mut World,
    events: &mut EventBus,
    ctx: &PhaseContext,
    groups: &[crate::dispatch::ElevatorGroup],
    eid: EntityId,
) {
    // Take the queue out so we can apply commands that need mutable world access.
    let Some(car) = world.elevator_mut(eid) else {
        return;
    };
    if car.door_command_queue.is_empty() {
        return;
    }
    let queue = std::mem::take(&mut car.door_command_queue);
    let mut remaining: Vec<DoorCommand> = Vec::new();

    for cmd in queue {
        if try_apply_command(world, groups, eid, cmd) {
            events.emit(Event::DoorCommandApplied {
                elevator: eid,
                command: cmd,
                tick: ctx.tick,
            });
        } else {
            remaining.push(cmd);
        }
    }

    if let Some(car) = world.elevator_mut(eid) {
        car.door_command_queue = remaining;
    }
}

/// Try to apply `cmd`. Returns `true` if it was applied (or is a no-op in
/// the current state — a no-op still counts as "applied" since there is
/// nothing to defer), `false` if it should remain queued.
fn try_apply_command(
    world: &mut World,
    groups: &[crate::dispatch::ElevatorGroup],
    eid: EntityId,
    cmd: DoorCommand,
) -> bool {
    let Some(car) = world.elevator(eid) else {
        return true;
    };
    let phase = car.phase;

    match cmd {
        DoorCommand::Open => apply_open(world, groups, eid, phase),
        DoorCommand::Close => apply_close(world, eid, phase),
        DoorCommand::HoldOpen { ticks } => apply_hold(world, eid, phase, ticks),
        DoorCommand::CancelHold => apply_cancel_hold(world, eid, phase),
    }
}

/// Apply a pending `Open` command. Returns `false` to leave the command
/// queued (car is mid-flight), `true` if applied or a no-op now.
fn apply_open(
    world: &mut World,
    groups: &[crate::dispatch::ElevatorGroup],
    eid: EntityId,
    phase: ElevatorPhase,
) -> bool {
    match phase {
        // Already open or opening — no-op.
        ElevatorPhase::DoorOpening | ElevatorPhase::Loading => true,
        ElevatorPhase::Stopped | ElevatorPhase::Idle => {
            // Must actually be parked at a stop on the car's line.
            let pos = world.position(eid).map_or(0.0, |p| p.value);
            let serves = crate::dispatch::elevator_line_serves(world, groups, eid);
            let at_stop = serves.map_or_else(
                || world.find_stop_at_position(pos),
                |s| world.find_stop_at_position_in(pos, s),
            );
            if at_stop.is_none() {
                return false;
            }
            if let Some(car) = world.elevator_mut(eid) {
                car.phase = ElevatorPhase::DoorOpening;
                car.door = DoorState::request_open(car.door_transition_ticks, car.door_open_ticks);
            }
            true
        }
        ElevatorPhase::DoorClosing => {
            // Reverse: door was closing, now reopen from the top.
            if let Some(car) = world.elevator_mut(eid) {
                car.phase = ElevatorPhase::DoorOpening;
                car.door = DoorState::request_open(car.door_transition_ticks, car.door_open_ticks);
            }
            true
        }
        // Moving or repositioning — defer until next stop.
        ElevatorPhase::MovingToStop(_) | ElevatorPhase::Repositioning(_) => false,
    }
}

/// Apply a pending `Close` command. Returns `false` to leave the command
/// queued (doors not yet open, or a rider is mid-threshold).
fn apply_close(world: &mut World, eid: EntityId, phase: ElevatorPhase) -> bool {
    match phase {
        ElevatorPhase::Loading => {
            if has_rider_traversing(world, eid) {
                // Safety: someone is mid-threshold; wait.
                return false;
            }
            if let Some(car) = world.elevator_mut(eid) {
                car.phase = ElevatorPhase::DoorClosing;
                car.door = DoorState::Closing {
                    ticks_remaining: car.door_transition_ticks,
                };
            }
            true
        }
        // Not yet open — wait until Loading is reached.
        ElevatorPhase::DoorOpening => false,
        // Anything else (closing, closed, moving) — nothing to do.
        ElevatorPhase::DoorClosing
        | ElevatorPhase::Stopped
        | ElevatorPhase::Idle
        | ElevatorPhase::MovingToStop(_)
        | ElevatorPhase::Repositioning(_) => true,
    }
}

/// Apply a pending `HoldOpen` command. Returns `false` to leave the
/// command queued until the doors finish opening.
fn apply_hold(world: &mut World, eid: EntityId, phase: ElevatorPhase, ticks: u32) -> bool {
    match phase {
        ElevatorPhase::Loading => {
            if let Some(car) = world.elevator_mut(eid)
                && let DoorState::Open {
                    ticks_remaining, ..
                } = &mut car.door
            {
                *ticks_remaining = ticks_remaining.saturating_add(ticks);
            }
            true
        }
        // Doors not open yet — wait. All other phases drop the hold
        // (nothing to extend).
        ElevatorPhase::DoorOpening => false,
        ElevatorPhase::DoorClosing
        | ElevatorPhase::Stopped
        | ElevatorPhase::Idle
        | ElevatorPhase::MovingToStop(_)
        | ElevatorPhase::Repositioning(_) => true,
    }
}

/// Apply a pending `CancelHold` command. Always succeeds; if there is
/// nothing held, it is simply a no-op.
fn apply_cancel_hold(world: &mut World, eid: EntityId, phase: ElevatorPhase) -> bool {
    if matches!(phase, ElevatorPhase::Loading)
        && let Some(car) = world.elevator_mut(eid)
    {
        let base = car.door_open_ticks;
        if let DoorState::Open {
            ticks_remaining, ..
        } = &mut car.door
            && *ticks_remaining > base
        {
            *ticks_remaining = base;
        }
    }
    true
}

/// True if any rider is mid-boarding or mid-exiting for this elevator —
/// meaning they are currently crossing the threshold, so closing the doors
/// would be unsafe.
fn has_rider_traversing(world: &World, eid: EntityId) -> bool {
    world.iter_riders().any(|(_, r)| {
        matches!(
            r.phase,
            RiderPhase::Boarding(e) | RiderPhase::Exiting(e) if e == eid
        )
    })
}
