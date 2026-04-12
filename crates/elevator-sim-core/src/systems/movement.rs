//! Phase 3: update position/velocity for moving elevators.

use crate::components::ElevatorPhase;
use crate::door::DoorState;
use crate::events::{Event, EventBus};
use crate::movement::tick_movement;
use crate::world::World;

use super::PhaseContext;

/// Update position/velocity for all moving elevators.
pub fn run(world: &mut World, events: &mut EventBus, ctx: &PhaseContext) {
    let elevator_ids = world.elevator_ids();

    for eid in elevator_ids {
        if world.is_disabled(eid) {
            continue;
        }
        let target_stop_eid = match world.elevator(eid) {
            Some(car) => match car.phase {
                ElevatorPhase::MovingToStop(stop_eid) => stop_eid,
                _ => continue,
            },
            None => continue,
        };

        let target_pos = world.stop_position(target_stop_eid).unwrap_or(0.0);
        let pos = world.position(eid).map_or(0.0, |p| p.value);
        let vel = world.velocity(eid).map_or(0.0, |v| v.value);

        // Extract elevator params upfront — we already confirmed elevator(eid) is Some above.
        let Some(car) = world.elevator(eid) else {
            continue;
        };
        let max_speed = car.max_speed;
        let acceleration = car.acceleration;
        let deceleration = car.deceleration;
        let door_transition_ticks = car.door_transition_ticks;
        let door_open_ticks = car.door_open_ticks;

        let result = tick_movement(pos, vel, target_pos, max_speed, acceleration, deceleration, ctx.dt);

        let old_pos = pos;
        let new_pos = result.position;

        if let Some(p) = world.position_mut(eid) {
            p.value = new_pos;
        }
        if let Some(v) = world.velocity_mut(eid) {
            v.value = result.velocity;
        }

        // Emit PassingFloor for any stops crossed between old and new position
        // (excluding the target stop — that gets an ElevatorArrived instead).
        if !result.arrived {
            let moving_up = new_pos > old_pos;
            let (lo, hi) = if moving_up {
                (old_pos, new_pos)
            } else {
                (new_pos, old_pos)
            };
            for (stop_eid, stop) in world.iter_stops() {
                if stop_eid == target_stop_eid {
                    continue;
                }
                if stop.position > lo + 1e-9 && stop.position < hi - 1e-9 {
                    events.emit(Event::PassingFloor {
                        elevator: eid,
                        stop: stop_eid,
                        moving_up,
                        tick: ctx.tick,
                    });
                }
            }
        }

        if result.arrived {
            let Some(car) = world.elevator_mut(eid) else {
                continue;
            };
            car.phase = ElevatorPhase::DoorOpening;
            car.door = DoorState::request_open(door_transition_ticks, door_open_ticks);
            events.emit(Event::ElevatorArrived {
                elevator: eid,
                at_stop: target_stop_eid,
                tick: ctx.tick,
            });
        }
    }
}
