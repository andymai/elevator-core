use crate::door::DoorState;
use crate::elevator::{Elevator, ElevatorState};
use crate::events::{EventBus, SimEvent};
use crate::movement::tick_movement;
use crate::stop::StopConfig;

/// Update position/velocity for all moving elevators.
pub fn run(elevators: &mut [Elevator], stops: &[StopConfig], dt: f64, events: &mut EventBus, tick: u64) {
    for elevator in elevators {
        if let ElevatorState::MovingToStop(target_id) = elevator.state {
            let target_pos = stops
                .iter()
                .find(|s| s.id == target_id)
                .map(|s| s.position)
                .unwrap_or(elevator.position);

            let result = tick_movement(
                elevator.position,
                elevator.velocity,
                target_pos,
                elevator.max_speed,
                elevator.acceleration,
                elevator.deceleration,
                dt,
            );

            elevator.position = result.position;
            elevator.velocity = result.velocity;

            if result.arrived {
                elevator.state = ElevatorState::DoorOpening;
                elevator.door = DoorState::request_open(
                    elevator.door_transition_ticks,
                    elevator.door_open_ticks,
                );
                events.emit(SimEvent::ElevatorArrived {
                    elevator: elevator.id,
                    at_stop: target_id,
                    tick,
                });
            }
        }
    }
}
