use crate::components::ElevatorState;
use crate::door::DoorState;
use crate::events::{EventBus, SimEvent};
use crate::movement::tick_movement;
use crate::world::World;

use super::PhaseContext;

/// Update position/velocity for all moving elevators.
pub fn run(world: &mut World, events: &mut EventBus, ctx: &PhaseContext) {
    let elevator_ids: Vec<_> = world.elevator_cars.keys().collect();

    for eid in elevator_ids {
        let target_stop_eid = match world.elevator_cars.get(eid) {
            Some(car) => match car.state {
                ElevatorState::MovingToStop(stop_eid) => stop_eid,
                _ => continue,
            },
            None => continue,
        };

        let target_pos = world.stop_position(target_stop_eid).unwrap_or(0.0);
        let pos = world.positions.get(eid).map(|p| p.value).unwrap_or(0.0);
        let vel = world.velocities.get(eid).map(|v| v.value).unwrap_or(0.0);

        let (max_speed, acceleration, deceleration, door_transition_ticks, door_open_ticks) = {
            let car = world.elevator_cars.get(eid).unwrap();
            (
                car.max_speed,
                car.acceleration,
                car.deceleration,
                car.door_transition_ticks,
                car.door_open_ticks,
            )
        };

        let result = tick_movement(pos, vel, target_pos, max_speed, acceleration, deceleration, ctx.dt);

        let old_pos = pos;
        let new_pos = result.position;

        if let Some(p) = world.positions.get_mut(eid) {
            p.value = new_pos;
        }
        if let Some(v) = world.velocities.get_mut(eid) {
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
            for (stop_eid, stop) in world.stop_data.iter() {
                if stop_eid == target_stop_eid {
                    continue;
                }
                if stop.position > lo + 1e-9 && stop.position < hi - 1e-9 {
                    events.emit(SimEvent::PassingFloor {
                        elevator: eid,
                        stop: stop_eid,
                        moving_up,
                        tick: ctx.tick,
                    });
                }
            }
        }

        if result.arrived {
            let car = world.elevator_cars.get_mut(eid).unwrap();
            car.state = ElevatorState::DoorOpening;
            car.door = DoorState::request_open(door_transition_ticks, door_open_ticks);
            events.emit(SimEvent::ElevatorArrived {
                elevator: eid,
                at_stop: target_stop_eid,
                tick: ctx.tick,
            });
        }
    }
}
