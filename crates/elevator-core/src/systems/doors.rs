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
    elevator_ids: &[crate::entity::EntityId],
) {
    for &eid in elevator_ids {
        if world.is_disabled(eid) {
            continue;
        }

        let is_inspection = world
            .service_mode(eid)
            .is_some_and(|m| *m == crate::components::ServiceMode::Inspection);

        process_door_commands(world, events, ctx, eid);

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
                events.emit(Event::DoorOpened {
                    elevator: eid,
                    tick: ctx.tick,
                });
            }
            DoorTransition::FinishedOpen => {
                car.phase = ElevatorPhase::DoorClosing;
            }
            DoorTransition::FinishedClosing => {
                car.phase = ElevatorPhase::Stopped;
                car.target_stop = None;
                events.emit(Event::DoorClosed {
                    elevator: eid,
                    tick: ctx.tick,
                });
            }
            DoorTransition::None => {}
        }
    }
}

/// Drain any door commands that are now valid, leaving the rest queued.
fn process_door_commands(
    world: &mut World,
    events: &mut EventBus,
    ctx: &PhaseContext,
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
        if try_apply_command(world, eid, cmd) {
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
fn try_apply_command(world: &mut World, eid: EntityId, cmd: DoorCommand) -> bool {
    let Some(car) = world.elevator(eid) else {
        return true;
    };
    let phase = car.phase;

    match cmd {
        DoorCommand::Open => apply_open(world, eid, phase),
        DoorCommand::Close => apply_close(world, eid, phase),
        DoorCommand::HoldOpen { ticks } => apply_hold(world, eid, phase, ticks),
        DoorCommand::CancelHold => apply_cancel_hold(world, eid, phase),
    }
}

/// Apply a pending `Open` command. Returns `false` to leave the command
/// queued (car is mid-flight), `true` if applied or a no-op now.
fn apply_open(world: &mut World, eid: EntityId, phase: ElevatorPhase) -> bool {
    match phase {
        // Already open or opening — no-op.
        ElevatorPhase::DoorOpening | ElevatorPhase::Loading => true,
        ElevatorPhase::Stopped | ElevatorPhase::Idle => {
            // Must actually be parked at a stop to open doors.
            let pos = world.position(eid).map_or(0.0, |p| p.value);
            if world.find_stop_at_position(pos).is_none() {
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
