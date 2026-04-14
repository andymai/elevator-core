//! Phase 3: update position/velocity for moving elevators.

use crate::components::ElevatorPhase;
use crate::door::DoorState;
use crate::events::{Event, EventBus};
use crate::metrics::Metrics;
use crate::movement::tick_movement;
use crate::world::{SortedStops, World};

use super::PhaseContext;

/// Update position/velocity for all moving elevators.
#[allow(clippy::too_many_lines)]
pub fn run(
    world: &mut World,
    events: &mut EventBus,
    ctx: &PhaseContext,
    elevator_ids: &[crate::entity::EntityId],
    metrics: &mut Metrics,
) {
    for &eid in elevator_ids {
        if world.is_disabled(eid) {
            continue;
        }
        let target_stop_eid = match world.elevator(eid) {
            Some(car) => match car.phase {
                ElevatorPhase::MovingToStop(stop_eid) | ElevatorPhase::Repositioning(stop_eid) => {
                    stop_eid
                }
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

        let is_inspection = world
            .service_mode(eid)
            .is_some_and(|m| *m == crate::components::ServiceMode::Inspection);

        // Extract elevator params upfront — we already confirmed elevator(eid) is Some above.
        let Some(car) = world.elevator(eid) else {
            continue;
        };
        let max_speed = if is_inspection {
            car.max_speed * car.inspection_speed_factor
        } else {
            car.max_speed
        };
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

        // Track repositioning distance.
        if is_repositioning {
            let dist = (new_pos - old_pos).abs();
            if dist > 0.0 {
                metrics.record_reposition_distance(dist);
            }
        }

        // Emit PassingFloor for any stops crossed between old and new position
        // (excluding the target stop — that gets an ElevatorArrived instead).
        let mut passing_moves: u64 = 0;
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
                    passing_moves += 1;
                }
            }
        }
        if passing_moves > 0 {
            // Only credit the aggregate if the per-elevator counter could actually
            // be incremented — keep the invariant total_moves == sum(per-elevator).
            if let Some(car) = world.elevator_mut(eid) {
                car.move_count += passing_moves;
                metrics.total_moves += passing_moves;
            }
        }

        if result.arrived {
            // Pop the queue front if it matches the target we arrived at.
            if let Some(q) = world.destination_queue_mut(eid) {
                if q.front() == Some(target_stop_eid) {
                    q.pop_front();
                }
            }
            let Some(car) = world.elevator_mut(eid) else {
                continue;
            };
            // Arrival is a floor crossing too — count it for both repositioning
            // and normal arrivals so the passing-floor + arrival accounting stays
            // consistent. Passing floors during a repositioning trip are already
            // counted above; skipping the arrival here would undercount.
            car.move_count += 1;
            metrics.total_moves += 1;
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
                events.emit(Event::ElevatorIdle {
                    elevator: eid,
                    at_stop: Some(target_stop_eid),
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
