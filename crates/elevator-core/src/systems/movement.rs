//! Phase 3: update position/velocity for moving elevators.

use crate::components::{ElevatorPhase, Route};
use crate::door::DoorState;
use crate::entity::EntityId;
use crate::events::{Event, EventBus};
use crate::metrics::Metrics;
use crate::movement::tick_movement;
use crate::world::{SortedStops, World};

use super::PhaseContext;
use super::dispatch::update_indicators;

/// Compute direction lamps for a just-arrived car from aboard-rider
/// destinations and the remaining destination queue. The travel-leg
/// direction (`going_up` / `going_down` during `MovingToStop`) reflects
/// where the car came *from* — on arrival at an edge floor (top or
/// bottom) or after delivering the last passenger for one direction,
/// it's stale. The loading-phase direction filter trusts these lamps,
/// so a stale `(up=true, down=false)` silently rejects every down-rider
/// waiting at the top floor.
///
/// Returns `(true, true)` when there's no committed next direction (no
/// aboard riders and no queued stops) — the car is effectively idle at
/// this stop and should accept hall calls in either direction. The same
/// rule applies when the car will continue in both directions (unusual
/// but possible with a multi-destination queue that crosses back over
/// the stop).
fn direction_from_remaining_work(world: &World, eid: EntityId, stop_pos: f64) -> (bool, bool) {
    let Some(car) = world.elevator(eid) else {
        return (true, true);
    };
    let mut needs_up = false;
    let mut needs_down = false;
    for &rid in &car.riders {
        if let Some(dest) = world.route(rid).and_then(Route::current_destination)
            && let Some(dest_pos) = world.stop_position(dest)
        {
            if dest_pos > stop_pos {
                needs_up = true;
            } else if dest_pos < stop_pos {
                needs_down = true;
            }
        }
    }
    if let Some(q) = world.destination_queue(eid) {
        for &next_stop in q {
            if let Some(next_pos) = world.stop_position(next_stop) {
                if next_pos > stop_pos {
                    needs_up = true;
                } else if next_pos < stop_pos {
                    needs_down = true;
                }
            }
        }
    }
    // No committed next direction → accept both. Ensures a car that
    // arrived for an unassigned hall call doesn't bounce a rider going
    // the opposite direction from its last leg.
    if !needs_up && !needs_down {
        return (true, true);
    }
    (needs_up, needs_down)
}

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
        if world
            .service_mode(eid)
            .is_some_and(|m| *m == crate::components::ServiceMode::Manual)
        {
            tick_manual(world, events, ctx, eid, metrics);
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
            car.max_speed.value() * car.inspection_speed_factor
        } else {
            car.max_speed.value()
        };
        let acceleration = car.acceleration.value();
        let deceleration = car.deceleration.value();
        let door_transition_ticks = car.door_transition_ticks;
        let door_open_ticks = car.door_open_ticks;
        // Authoritative source for "is this a reposition trip?" is the
        // phase variant. The `repositioning` bool is a legacy mirror kept
        // around for downstream predicates (e.g. `Elevator::repositioning`)
        // — asserted equivalent below so a desync in either direction is
        // caught early in debug builds.
        let is_repositioning = matches!(car.phase, ElevatorPhase::Repositioning(_));
        debug_assert_eq!(
            is_repositioning, car.repositioning,
            "ElevatorPhase::Repositioning and car.repositioning flag diverged at eid={eid:?}"
        );

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
            if let Some(q) = world.destination_queue_mut(eid)
                && q.front() == Some(target_stop_eid)
            {
                q.pop_front();
            }
            // Tracked and applied after the `&mut car` block ends —
            // `world.resource_mut` can't coexist with the car borrow.
            let mut reposition_arrived = false;
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
                // A reposition trip sets the indicators to its travel
                // direction (via `indicators_for_travel` in dispatch /
                // advance_queue), but once the car is parked with no
                // committed work the lamps should read "both" — otherwise
                // the next dispatch tick rejects opposite-direction hall
                // calls at this stop via `pair_can_do_work`, and the
                // Hungarian picks a different, farther car to serve
                // them while this one sits there.
                let indicators_dirty = !(car.going_up && car.going_down);
                car.phase = ElevatorPhase::Idle;
                car.target_stop = None;
                car.repositioning = false;
                car.going_up = true;
                car.going_down = true;
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
                if indicators_dirty {
                    events.emit(Event::DirectionIndicatorChanged {
                        elevator: eid,
                        going_up: true,
                        going_down: true,
                        tick: ctx.tick,
                    });
                }
                // Arm the reposition cooldown below, once the
                // `&mut car` borrow ends — `world.resource_mut`
                // needs `&mut world` and can't coexist with it.
                reposition_arrived = true;
            } else {
                car.phase = ElevatorPhase::DoorOpening;
                car.door = DoorState::request_open(door_transition_ticks, door_open_ticks);
                events.emit(Event::ElevatorArrived {
                    elevator: eid,
                    at_stop: target_stop_eid,
                    tick: ctx.tick,
                });
                // Refresh direction lamps from remaining work (aboard
                // riders + queue) rather than the just-ended travel leg.
                // Without this the loading-phase direction filter rejects
                // every rider wanting to go opposite to the travel
                // direction — the penthouse down-rider bug.
                let (new_up, new_down) = direction_from_remaining_work(world, eid, target_pos);
                update_indicators(world, events, eid, new_up, new_down, ctx.tick);
            }
            if reposition_arrived
                && let Some(cooldowns) =
                    world.resource_mut::<crate::dispatch::reposition::RepositionCooldowns>()
            {
                cooldowns.record_arrival(eid, ctx.tick);
            }
        }
    }
}

/// One tick of manual-mode physics: ramp velocity toward
/// `manual_target_velocity` using the car's `acceleration`/`deceleration`
/// caps, then integrate position. Emits [`Event::PassingFloor`] for any
/// stops crossed during the tick.
fn tick_manual(
    world: &mut World,
    events: &mut EventBus,
    ctx: &PhaseContext,
    eid: crate::entity::EntityId,
    metrics: &mut Metrics,
) {
    let Some(car) = world.elevator(eid) else {
        return;
    };
    let target = car.manual_target_velocity.unwrap_or(0.0);
    let accel = car.acceleration.value();
    let decel = car.deceleration.value();
    let max_speed = car.max_speed.value();
    let Some(pos_comp) = world.position(eid) else {
        return;
    };
    let old_pos = pos_comp.value;
    let Some(vel_comp) = world.velocity(eid) else {
        return;
    };
    let vel = vel_comp.value;

    // Signed clamp of target to the kinematic cap.
    let target = target.clamp(-max_speed, max_speed);

    // Pick the right rate: if we're slowing down (target is closer to 0
    // than current speed, or opposite sign), use deceleration; otherwise
    // use acceleration.
    let slowing = target.abs() < vel.abs() || target.signum() * vel.signum() < 0.0;
    let rate = if slowing { decel } else { accel };
    let dv_max = rate * ctx.dt;

    let new_vel = if (target - vel).abs() <= dv_max {
        target
    } else if target > vel {
        vel + dv_max
    } else {
        vel - dv_max
    };

    let new_pos = new_vel.mul_add(ctx.dt, old_pos);

    if let Some(p) = world.position_mut(eid) {
        p.value = new_pos;
    }
    if let Some(v) = world.velocity_mut(eid) {
        v.value = new_vel;
    }

    // PassingFloor for every stop actually crossed.
    let mut passing_moves: u64 = 0;
    let (lo, hi) = if new_pos >= old_pos {
        (old_pos, new_pos)
    } else {
        (new_pos, old_pos)
    };
    let moving_up = new_pos > old_pos;
    if (hi - lo) > 1e-9
        && let Some(sorted) = world.resource::<SortedStops>()
    {
        let start = sorted.0.partition_point(|&(p, _)| p <= lo + 1e-9);
        let end = sorted.0.partition_point(|&(p, _)| p < hi - 1e-9);
        for &(_, stop_eid) in &sorted.0[start..end] {
            events.emit(Event::PassingFloor {
                elevator: eid,
                stop: stop_eid,
                moving_up,
                tick: ctx.tick,
            });
            passing_moves += 1;
        }
    }
    if passing_moves > 0
        && let Some(car) = world.elevator_mut(eid)
    {
        car.move_count += passing_moves;
        metrics.total_moves += passing_moves;
    }
}
