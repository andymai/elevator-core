use crate::door::DoorTransition;
use crate::elevator::{Elevator, ElevatorState};
use crate::events::{EventBus, SimEvent};

/// Tick door FSMs and handle state transitions.
pub fn run(elevators: &mut [Elevator], events: &mut EventBus, tick: u64) {
    for elevator in elevators {
        if elevator.door.is_closed() && elevator.state != ElevatorState::DoorOpening {
            continue;
        }

        let transition = elevator.door.tick();

        match transition {
            DoorTransition::FinishedOpening => {
                elevator.state = ElevatorState::Loading;
                events.emit(SimEvent::DoorOpened {
                    elevator: elevator.id,
                    tick,
                });
            }
            DoorTransition::FinishedOpen => {
                elevator.state = ElevatorState::DoorClosing;
            }
            DoorTransition::FinishedClosing => {
                elevator.state = ElevatorState::Stopped;
                elevator.target_stop = None;
                events.emit(SimEvent::DoorClosed {
                    elevator: elevator.id,
                    tick,
                });
            }
            DoorTransition::None => {}
        }
    }
}
