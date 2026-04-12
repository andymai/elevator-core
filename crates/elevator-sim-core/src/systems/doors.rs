use crate::components::ElevatorState;
use crate::door::DoorTransition;
use crate::events::{EventBus, SimEvent};
use crate::world::World;

use super::PhaseContext;

/// Tick door FSMs and handle state transitions.
pub fn run(world: &mut World, events: &mut EventBus, ctx: &PhaseContext) {
    for (eid, car) in &mut world.elevator_cars {
        if car.door.is_closed() && car.state != ElevatorState::DoorOpening {
            continue;
        }

        let transition = car.door.tick();

        match transition {
            DoorTransition::FinishedOpening => {
                car.state = ElevatorState::Loading;
                events.emit(SimEvent::DoorOpened {
                    elevator: eid,
                    tick: ctx.tick,
                });
            }
            DoorTransition::FinishedOpen => {
                car.state = ElevatorState::DoorClosing;
            }
            DoorTransition::FinishedClosing => {
                car.state = ElevatorState::Stopped;
                car.target_stop = None;
                events.emit(SimEvent::DoorClosed {
                    elevator: eid,
                    tick: ctx.tick,
                });
            }
            DoorTransition::None => {}
        }
    }
}
