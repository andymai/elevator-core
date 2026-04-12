//! Phase 4: tick door FSMs and handle open/close phase transitions.

use crate::components::ElevatorPhase;
use crate::door::DoorTransition;
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

        let Some(car) = world.elevator_mut(eid) else {
            continue;
        };

        if car.door.is_closed() && car.phase != ElevatorPhase::DoorOpening {
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
