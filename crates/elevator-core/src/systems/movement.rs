//! Phase 3: update position/velocity for moving elevators.

use crate::components::ElevatorPhase;
use crate::door::DoorState;
use crate::events::{Event, EventBus};
use crate::movement::tick_movement;
use crate::world::{SortedStops, World};

use super::PhaseContext;

/// Update position/velocity for all moving elevators.
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
        let target_stop_eid = match world.elevator(eid) {
            Some(car) => match car.phase {
                ElevatorPhase::MovingToStop(stop_eid) => stop_eid,
                _ => continue,
            },
            None => continue,
        };

        let Some(target_pos) = world.stop_position(target_stop_eid) else {
            continue;
        };
        let Some(pos_comp) = world.position(eid) else {
            continue;
        };
        let pos = pos_comp.value;
        let Some(vel_comp) = world.velocity(eid) else {
            continue;
        };
        let vel = vel_comp.value;

        // Extract elevator params upfront — we already confirmed elevator(eid) is Some above.
        let Some(car) = world.elevator(eid) else {
            continue;
        };
        let max_speed = car.max_speed;
        let acceleration = car.acceleration;
        let deceleration = car.deceleration;
        let door_transition_ticks = car.door_transition_ticks;
        let door_open_ticks = car.door_open_ticks;
        let is_repositioning = car.repositioning;

        let result = tick_movement(
            pos,
            vel,
            target_pos,
            max_speed,
            acceleration,
            deceleration,
            ctx.dt,
        );

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
            if let Some(sorted) = world.resource::<SortedStops>() {
                let start = sorted.0.partition_point(|&(p, _)| p <= lo + 1e-9);
                let end = sorted.0.partition_point(|&(p, _)| p < hi - 1e-9);
                for &(_, stop_eid) in &sorted.0[start..end] {
                    if stop_eid == target_stop_eid {
                        continue;
                    }
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
            if is_repositioning {
                // Repositioned elevators go directly to Idle — no door cycle.
                car.phase = ElevatorPhase::Idle;
                car.target_stop = None;
                car.repositioning = false;
                events.emit(Event::ElevatorRepositioned {
                    elevator: eid,
                    at_stop: target_stop_eid,
                    tick: ctx.tick,
                });
            } else {
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
}
