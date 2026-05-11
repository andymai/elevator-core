//! Phase 3: update position/velocity for moving elevators.

use crate::components::{ElevatorPhase, Line, Route};
use crate::door::DoorState;
use crate::entity::EntityId;
use crate::events::{Event, EventBus};
use crate::metrics::Metrics;
use crate::movement::tick_movement;
#[cfg(feature = "loop_lines")]
use crate::movement::tick_movement_cyclic;
use crate::world::{SortedStops, World};

use super::PhaseContext;
use super::dispatch::update_indicators;

/// Wrapped position of the nearest car forward of `pos` on the same
/// Loop line. Returns `None` for a solo car on the line.
///
/// Coincident cars (`forward_distance == 0`) are included as valid
/// leaders so the caller's headway clamp collapses to "stay put"
/// rather than silently treating a same-position sibling as a full lap
/// ahead.
#[cfg(feature = "loop_lines")]
fn loop_leader_pos(
    world: &World,
    eid: EntityId,
    car_line: EntityId,
    pos: f64,
    circumference: f64,
) -> Option<f64> {
    world
        .iter_elevators()
        .filter(|&(other, _, other_car)| other != eid && other_car.line == car_line)
        .map(|(_, p, _)| {
            (
                crate::components::cyclic::forward_distance(pos, p.value, circumference),
                p.value,
            )
        })
        .min_by(|a, b| a.0.total_cmp(&b.0))
        .map(|(_, p)| p)
}

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
        let car_line = car.line;
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

        // Loop cars use cyclic motion: position wraps modulo the line's
        // circumference, the integrator picks the forward path to the
        // target, and seam-crossings (old_pos > new_pos within a single
        // tick) are emitted in two passing-floor ranges below. Linear
        // cars take the existing trapezoidal-on-axis path.
        #[cfg(feature = "loop_lines")]
        let circumference = world.line(car_line).and_then(Line::circumference);
        // Mirrored unconditional binding so the seam-aware passing-floor
        // logic below (which is itself unconditional, just behaviourally
        // a no-op without a `circumference`) compiles on either feature
        // configuration.
        #[cfg(not(feature = "loop_lines"))]
        let circumference: Option<f64> = None;

        #[cfg(feature = "loop_lines")]
        #[allow(
            clippy::option_if_let_else,
            reason = "the Loop arm runs a multi-step leader-find + clamp before integrating; collapsing into a closure would duplicate every argument"
        )]
        let result = match circumference {
            Some(c) => {
                // No-overtake clamp: pull the intended target back to the
                // leader's position minus `min_headway` along the forward
                // direction. The integrator and dispatcher together can't
                // guarantee this — dispatch assigns stops without seeing
                // sibling cars, and the integrator only sees its own
                // target — so the clamp is the only line of defense
                // against a faster trailer riding into a slower leader.
                let min_headway = world
                    .line(car_line)
                    .and_then(Line::min_headway)
                    .unwrap_or(0.0);
                let effective_target = loop_leader_pos(world, eid, car_line, pos, c)
                    .map_or(target_pos, |lp| {
                        crate::movement::headway_clamp_target(pos, lp, target_pos, min_headway, c)
                    });
                tick_movement_cyclic(
                    pos,
                    vel,
                    effective_target,
                    max_speed,
                    acceleration,
                    deceleration,
                    ctx.dt,
                    c,
                )
            }
            None => tick_movement(
                pos,
                vel,
                target_pos,
                max_speed,
                acceleration,
                deceleration,
                ctx.dt,
            ),
        };
        #[cfg(not(feature = "loop_lines"))]
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

        // Track repositioning distance. On a Loop line a tick that wraps
        // through the seam has `new_pos < old_pos` even though the car
        // travelled forward; the chord `(new - old).abs()` would record
        // `circumference - arc` instead of the actual arc travelled.
        // Compute via forward cyclic distance when a circumference is
        // present so the metric tracks the *real* path.
        if is_repositioning {
            let dist = circumference.map_or_else(
                || (new_pos - old_pos).abs(),
                |c| crate::components::cyclic::forward_distance(old_pos, new_pos, c),
            );
            if dist > 0.0 {
                metrics.record_reposition_distance(dist);
            }
        }

        // Emit PassingFloor for any stops crossed between old and new position
        // (excluding the target stop — that gets an ElevatorArrived instead).
        //
        // On a Loop line a single tick can cross the seam: `old_pos > new_pos`
        // even though we travelled forward. In that case the swept range is
        // `[old_pos, circumference) ∪ [0, new_pos)` rather than a single
        // `[lo, hi)` interval, so we walk the sorted-stops index in two
        // passes. Linear and Loop-without-seam ticks fall through to the
        // single-pass path.
        let mut passing_moves: u64 = 0;
        if !result.arrived {
            let crossed_seam = circumference.is_some() && new_pos < old_pos;
            // Loop cars always patrol forward; otherwise the existing
            // sign-of-displacement rule still holds.
            let moving_up = circumference.is_some() || new_pos > old_pos;

            // `inclusive_lo = true` includes a stop at exactly `lo` in the
            // emitted range. The seam-crossing case uses this for the
            // wrap-around segment `[0, new_pos)`: the car physically
            // sweeps through position 0, so a stop sitting there should
            // fire `PassingFloor`. The default exclusive form is used for
            // the linear case and the seam's pre-wrap segment, where `lo`
            // is the position the car *left* this tick and would
            // double-count if included.
            let emit_range = |lo: f64,
                              hi: f64,
                              inclusive_lo: bool,
                              world_ref: &World,
                              events_ref: &mut EventBus| {
                if hi <= lo + 1e-9 {
                    return 0u64;
                }
                let Some(sorted) = world_ref.resource::<SortedStops>() else {
                    return 0;
                };
                let lo_threshold = if inclusive_lo { lo - 1e-9 } else { lo + 1e-9 };
                let start = sorted.0.partition_point(|&(p, _)| p <= lo_threshold);
                let end = sorted.0.partition_point(|&(p, _)| p < hi - 1e-9);
                let mut count = 0;
                for &(_, stop_eid) in &sorted.0[start..end] {
                    if stop_eid == target_stop_eid {
                        continue;
                    }
                    events_ref.emit(Event::PassingFloor {
                        elevator: eid,
                        stop: stop_eid,
                        moving_up,
                        tick: ctx.tick,
                    });
                    count += 1;
                }
                count
            };

            if let Some(c) = circumference.filter(|_| crossed_seam) {
                // Pre-wrap: car was at `old_pos`, exclude it.
                passing_moves += emit_range(old_pos, c, false, world, events);
                // Post-wrap: car physically crossed position 0 forward,
                // so include a stop sitting there.
                passing_moves += emit_range(0.0, new_pos, true, world, events);
            } else {
                let (lo, hi) = if moving_up {
                    (old_pos, new_pos)
                } else {
                    (new_pos, old_pos)
                };
                passing_moves += emit_range(lo, hi, false, world, events);
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
                // calls at this stop via `pair_is_useful`, and the
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
                // Loop cars don't carry up/down lamps — the door FSM
                // re-asserts `going_forward = true` when closing
                // finishes. Computing linear up/down here from the
                // remaining work would emit a spurious indicator change
                // (Forward → Up/Down) for the duration of the dwell.
                //
                // For Linear cars: refresh the lamps from aboard riders
                // + remaining queue rather than the just-ended travel
                // leg. Without this the loading-phase direction filter
                // rejects every rider wanting to go opposite to the
                // travel direction — the penthouse down-rider bug.
                if !world.line(car_line).is_some_and(Line::is_loop) {
                    let (new_up, new_down) = direction_from_remaining_work(world, eid, target_pos);
                    update_indicators(world, events, eid, new_up, new_down, ctx.tick);
                }
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
    #[cfg(feature = "loop_lines")]
    let car_line = car.line;
    let Some(pos_comp) = world.position(eid) else {
        return;
    };
    let old_pos = pos_comp.value;
    let Some(vel_comp) = world.velocity(eid) else {
        return;
    };
    let vel = vel_comp.value;

    #[cfg(feature = "loop_lines")]
    let circumference = world.line(car_line).and_then(Line::circumference);
    #[cfg(not(feature = "loop_lines"))]
    let circumference: Option<f64> = None;

    // Signed clamp of target to the kinematic cap. Loop cars are one-way
    // at the API layer (`set_target_velocity` rejects negative targets on
    // Loop), so the same symmetric clamp serves both topologies.
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

    let raw_new_pos = crate::fp::fma(new_vel, ctx.dt, old_pos);

    // Loop-aware landing: wrap into `[0, C)`, then enforce the no-overtake
    // headway invariant by pulling the landing back to `leader - min_headway`
    // if the integrator would otherwise push past it. The clamp produces a
    // "soft collision" — the car physically stops behind the leader and the
    // player can't drive further until the leader moves. Velocity is zeroed
    // when the clamp engages so the next tick doesn't accelerate into the
    // leader. Linear cars take the untouched raw landing.
    #[cfg(feature = "loop_lines")]
    let (new_pos, new_vel) = circumference.map_or((raw_new_pos, new_vel), |c| {
        let wrapped = crate::components::cyclic::wrap_position(raw_new_pos, c);
        let min_headway = world
            .line(car_line)
            .and_then(Line::min_headway)
            .unwrap_or(0.0);
        loop_leader_pos(world, eid, car_line, old_pos, c).map_or((wrapped, new_vel), |lp| {
            let clamped =
                crate::movement::headway_clamp_target(old_pos, lp, wrapped, min_headway, c);
            let was_clamped = (clamped - wrapped).abs() > 1e-9;
            (clamped, if was_clamped { 0.0 } else { new_vel })
        })
    });
    #[cfg(not(feature = "loop_lines"))]
    let (new_pos, new_vel) = (raw_new_pos, new_vel);

    if let Some(p) = world.position_mut(eid) {
        p.value = new_pos;
    }
    if let Some(v) = world.velocity_mut(eid) {
        v.value = new_vel;
    }

    // PassingFloor for every stop actually crossed. On a Loop with a
    // seam-crossing tick the linear `(lo, hi)` chord would skip stops
    // between the seam and the wrapped landing; emit two ranges in that
    // case, mirroring the dispatch-driven movement path above.
    let mut passing_moves: u64 = 0;
    let crossed_seam = circumference.is_some() && new_pos < old_pos && new_vel >= 0.0;
    let moving_up = circumference.is_some() || new_pos > old_pos;
    if let Some(c) = circumference.filter(|_| crossed_seam) {
        // Forward through the seam: sweep `[old_pos, C)` then `[0, new_pos)`.
        passing_moves +=
            emit_passing_range(world, events, eid, old_pos, c, false, moving_up, ctx.tick);
        passing_moves +=
            emit_passing_range(world, events, eid, 0.0, new_pos, true, moving_up, ctx.tick);
    } else {
        let (lo, hi) = if new_pos >= old_pos {
            (old_pos, new_pos)
        } else {
            (new_pos, old_pos)
        };
        passing_moves += emit_passing_range(world, events, eid, lo, hi, false, moving_up, ctx.tick);
    }
    if passing_moves > 0
        && let Some(car) = world.elevator_mut(eid)
    {
        car.move_count += passing_moves;
        metrics.total_moves += passing_moves;
    }
}

/// Emit `PassingFloor` for every stop in the half-open span `[lo, hi)`
/// (or `(lo, hi)` when `inclusive_lo == false`). Returns the number of
/// stops crossed so the caller can update aggregate move counters.
///
/// `inclusive_lo` matters on the post-wrap segment of a seam-crossing
/// tick: the car physically sweeps through position 0, so a stop sitting
/// there must fire. For every other range `lo` is the position the car
/// *left* this tick and would double-count if included.
#[allow(
    clippy::too_many_arguments,
    reason = "every parameter is a distinct meaningful axis (range bounds, range bias, direction, identity, tick); bundling would just add boilerplate at every call site"
)]
fn emit_passing_range(
    world: &World,
    events: &mut EventBus,
    eid: EntityId,
    lo: f64,
    hi: f64,
    inclusive_lo: bool,
    moving_up: bool,
    tick: u64,
) -> u64 {
    if hi <= lo + 1e-9 {
        return 0;
    }
    let Some(sorted) = world.resource::<SortedStops>() else {
        return 0;
    };
    let lo_threshold = if inclusive_lo { lo - 1e-9 } else { lo + 1e-9 };
    let start = sorted.0.partition_point(|&(p, _)| p <= lo_threshold);
    let end = sorted.0.partition_point(|&(p, _)| p < hi - 1e-9);
    let mut count = 0;
    for &(_, stop_eid) in &sorted.0[start..end] {
        events.emit(Event::PassingFloor {
            elevator: eid,
            stop: stop_eid,
            moving_up,
            tick,
        });
        count += 1;
    }
    count
}
