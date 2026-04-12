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

        if let Some(p) = world.positions.get_mut(eid) {
            p.value = result.position;
        }
        if let Some(v) = world.velocities.get_mut(eid) {
            v.value = result.velocity;
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
