//! Trapezoidal velocity-profile movement physics.
//!
//! [`tick_movement`](crate::movement::tick_movement) is the linear
//! integrator used for shafts, tethers, and any
//! [`LineKind::Linear`](crate::components::LineKind::Linear) topology.
//! [`tick_movement_cyclic`](crate::movement::tick_movement_cyclic) (gated
//! by the `loop_lines` feature) wraps the same physics in cyclic-position
//! semantics for [`LineKind::Loop`](crate::components::LineKind::Loop):
//! position is always normalised into `[0, circumference)`, ticks that
//! would jump past the seam wrap correctly, and
//! [`headway_clamp_target`](crate::movement::headway_clamp_target)
//! enforces the no-overtake invariant when multiple cars share a loop.

/// Distance required to brake to a stop from a given velocity at a fixed
/// deceleration rate.
///
/// Uses the standard kinematic formula `v² / (2·a)`. Returns `0.0` for a
/// stationary object or a non-positive deceleration (defensive: avoids
/// division-by-zero / negative-distance footguns in consumer code).
#[must_use]
pub fn braking_distance(velocity: f64, deceleration: f64) -> f64 {
    if deceleration <= 0.0 {
        return 0.0;
    }
    let speed = velocity.abs();
    speed * speed / (2.0 * deceleration)
}

/// Result of one tick of movement physics.
#[derive(Debug, Clone, Copy)]
pub struct MovementResult {
    /// Current position after this tick.
    pub position: f64,
    /// Current velocity after this tick.
    pub velocity: f64,
    /// Whether the elevator has arrived at the target.
    pub arrived: bool,
}

/// Advance position/velocity toward a target using a trapezoidal velocity profile.
///
/// - `position`: current position
/// - `velocity`: current velocity (signed)
/// - `target_position`: where we want to be
/// - `max_speed`: maximum speed magnitude
/// - `acceleration`: acceleration rate (positive)
/// - `deceleration`: deceleration rate (positive)
/// - `dt`: time step
#[must_use]
pub fn tick_movement(
    position: f64,
    velocity: f64,
    target_position: f64,
    max_speed: f64,
    acceleration: f64,
    deceleration: f64,
    dt: f64,
) -> MovementResult {
    const EPSILON: f64 = 1e-9;

    let displacement = target_position - position;

    // Already at target and stationary.
    if displacement.abs() < EPSILON && velocity.abs() < EPSILON {
        return MovementResult {
            position: target_position,
            velocity: 0.0,
            arrived: true,
        };
    }

    let sign = displacement.signum();
    let distance_remaining = displacement.abs();
    let speed = velocity.abs();
    let safe_decel = deceleration.max(EPSILON);
    let stopping_distance = speed * speed / (2.0 * safe_decel);
    // Opposing direction: car is moving away from the (possibly retargeted)
    // destination. Must brake at `deceleration` before accelerating back —
    // not at `acceleration`, which is the wrong physics when accel ≠ decel.
    let opposing = velocity * sign < 0.0;

    let new_velocity = if opposing || stopping_distance >= distance_remaining - EPSILON {
        // Decelerate
        let v = crate::fp::fma(-safe_decel * dt, velocity.signum(), velocity);
        // Clamp to zero if sign would flip.
        if velocity > 0.0 && v < 0.0 || velocity < 0.0 && v > 0.0 {
            0.0
        } else {
            v
        }
    } else if speed < max_speed {
        // Accelerate toward target
        let v = crate::fp::fma(acceleration * dt, sign, velocity);
        // Clamp magnitude to max_speed
        if v.abs() > max_speed {
            sign * max_speed
        } else {
            v
        }
    } else {
        // Cruise
        sign * max_speed
    };

    let new_pos = crate::fp::fma(new_velocity, dt, position);

    // Overshoot check: did we cross the target?
    let new_displacement = target_position - new_pos;
    if new_displacement.abs() < EPSILON || (new_displacement.signum() - sign).abs() > EPSILON {
        return MovementResult {
            position: target_position,
            velocity: 0.0,
            arrived: true,
        };
    }

    MovementResult {
        position: new_pos,
        velocity: new_velocity,
        arrived: false,
    }
}

/// Advance position/velocity along a closed-loop axis using the same
/// trapezoidal profile as [`tick_movement`], with the result wrapped
/// into `[0, circumference)`.
///
/// One-way semantics: a Loop car always travels in the positive
/// direction. The "distance to target" is the *forward cyclic distance*
/// (`position` → `target_position` going forward), which is always
/// non-negative and at most `circumference`. Backwards velocity is
/// physically meaningful only as a transient artefact of the
/// trapezoidal integrator's deceleration step; consumers should treat
/// it as instantaneous and not propagate it as a steady state.
///
/// Seam crossing is handled implicitly: the integrator runs on a virtual
/// linear axis pinned at `position = 0` with target `forward_distance`,
/// then the output is mapped back onto the loop by adding the travelled
/// distance to the original `position` and wrapping. A tick that would
/// jump past `circumference` therefore lands at the correct cyclic
/// position regardless of how far the seam is from the start.
///
/// Returns the unmodified `position` and `velocity = 0` with
/// `arrived = false` when `circumference <= 0.0` or non-finite — the
/// same defensive degradation pattern used by [`super::components::cyclic`].
///
/// # Arguments
///
/// - `position`: current position. Should be in `[0, circumference)`;
///   inputs outside the range are wrapped before integration.
/// - `velocity`: current signed velocity along the loop's forward axis.
/// - `target_position`: where we want to be, in `[0, circumference)`.
/// - `max_speed`, `acceleration`, `deceleration`, `dt`: identical to
///   [`tick_movement`].
/// - `circumference`: total loop length. Must be `> 0` and finite.
#[cfg(feature = "loop_lines")]
#[must_use]
#[allow(
    clippy::too_many_arguments,
    reason = "mirrors tick_movement plus circumference; passing a struct adds boilerplate without clarifying the call site"
)]
pub fn tick_movement_cyclic(
    position: f64,
    velocity: f64,
    target_position: f64,
    max_speed: f64,
    acceleration: f64,
    deceleration: f64,
    dt: f64,
    circumference: f64,
) -> MovementResult {
    use crate::components::cyclic::{forward_distance, wrap_position};

    if !circumference.is_finite() || circumference <= 0.0 {
        return MovementResult {
            position,
            velocity: 0.0,
            arrived: false,
        };
    }

    let pos = wrap_position(position, circumference);
    let target = wrap_position(target_position, circumference);
    let fwd = forward_distance(pos, target, circumference);

    // Run the proven linear integrator on a virtual axis: start at 0,
    // target at `fwd`. Reuses every overshoot / opposing-direction /
    // brake-distance branch in `tick_movement` rather than duplicating
    // them in cyclic form.
    let linear = tick_movement(
        0.0,
        velocity,
        fwd,
        max_speed,
        acceleration,
        deceleration,
        dt,
    );

    if linear.arrived {
        return MovementResult {
            position: target,
            velocity: 0.0,
            arrived: true,
        };
    }

    // `linear.position` is the distance travelled this tick (since the
    // virtual start was 0). Apply it as a forward offset and wrap.
    let new_pos = wrap_position(pos + linear.position, circumference);
    MovementResult {
        position: new_pos,
        velocity: linear.velocity,
        arrived: false,
    }
}

/// Cyclic-aware no-overtake clamp on a trailing car's intended target.
///
/// Returns the *effective* target position the trailer should aim at,
/// guaranteeing the trailer cannot end up within `min_headway` of the
/// leader's tail along the forward direction. The math is purely cyclic:
///
/// - `gap = forward_distance(trailer, leader)` — slack ahead of the
///   trailer right now
/// - `safe_advance = max(0, gap - min_headway)` — how far the trailer
///   can advance without violating headway
/// - if the intended forward distance fits in `safe_advance`, return
///   `intended` unchanged; otherwise return the trailer position
///   advanced by exactly `safe_advance` (wrapped)
///
/// Coincident leader / trailer (gap = 0) collapses to "stay put" — the
/// returned target is the trailer's own position, which the integrator
/// interprets as "already arrived, decelerate to zero". Non-positive or
/// non-finite `circumference` / `min_headway` short-circuits to
/// returning `intended` unchanged so a misconfigured Loop degrades
/// gracefully rather than silently parking every car at its current
/// position.
#[cfg(feature = "loop_lines")]
#[must_use]
pub fn headway_clamp_target(
    trailer_position: f64,
    leader_position: f64,
    intended_target: f64,
    min_headway: f64,
    circumference: f64,
) -> f64 {
    use crate::components::cyclic::{forward_distance, wrap_position};

    if !circumference.is_finite() || circumference <= 0.0 || !min_headway.is_finite() {
        return intended_target;
    }

    let trailer = wrap_position(trailer_position, circumference);
    let leader = wrap_position(leader_position, circumference);
    let intended = wrap_position(intended_target, circumference);

    let gap = forward_distance(trailer, leader, circumference);
    let safe_advance = (gap - min_headway).max(0.0);
    let intended_advance = forward_distance(trailer, intended, circumference);

    debug_assert!(
        safe_advance >= 0.0,
        "headway clamp produced negative safe_advance: gap={gap} min_headway={min_headway}"
    );

    if intended_advance <= safe_advance {
        intended
    } else {
        wrap_position(trailer + safe_advance, circumference)
    }
}

#[cfg(all(test, feature = "loop_lines"))]
#[allow(
    clippy::panic,
    reason = "test-only assertions; production-code lint doesn't apply"
)]
mod cyclic_tests {
    use super::*;
    use crate::components::cyclic::forward_distance;

    const MAX_SPEED: f64 = 5.0;
    const ACCEL: f64 = 2.0;
    const DECEL: f64 = 2.0;
    const DT: f64 = 1.0;
    const C: f64 = 100.0;

    fn approx(actual: f64, expected: f64) {
        assert!(
            (actual - expected).abs() < 1e-9,
            "expected {expected}, got {actual}",
        );
    }

    #[test]
    fn cyclic_arrival_at_target_returns_arrived() {
        let r = tick_movement_cyclic(50.0, 0.0, 50.0, MAX_SPEED, ACCEL, DECEL, DT, C);
        approx(r.position, 50.0);
        approx(r.velocity, 0.0);
        assert!(r.arrived);
    }

    #[test]
    fn cyclic_handles_seam_crossing_in_one_tick() {
        // pos=95, vel=5, dt=1 ⇒ would land at 100 (= 0). Target sits 10 units
        // ahead through the seam at 5, so the integrator should still cruise
        // forward and *not* arrive yet.
        let r = tick_movement_cyclic(95.0, 5.0, 5.0, MAX_SPEED, ACCEL, DECEL, DT, C);
        // Expect position wrapped into [0, C).
        assert!(
            (0.0..C).contains(&r.position),
            "post-seam position {} out of [0, {C})",
            r.position
        );
        // Forward distance to target should have decreased monotonically.
        let new_fwd = forward_distance(r.position, 5.0, C);
        let old_fwd = forward_distance(95.0, 5.0, C);
        assert!(
            new_fwd < old_fwd,
            "forward distance must decrease: {old_fwd} → {new_fwd}",
        );
    }

    #[test]
    fn cyclic_full_lap_eventually_arrives() {
        // Drive from 0 toward 99 (going forward through the seam not needed).
        let mut pos = 0.0;
        let mut vel = 0.0;
        let target = 99.0;
        for _ in 0..200 {
            let r = tick_movement_cyclic(pos, vel, target, MAX_SPEED, ACCEL, DECEL, DT, C);
            pos = r.position;
            vel = r.velocity;
            if r.arrived {
                approx(pos, target);
                return;
            }
        }
        panic!("car failed to arrive within 200 ticks; final pos={pos} vel={vel}");
    }

    #[test]
    fn cyclic_through_seam_eventually_arrives() {
        // Start at 80, target at 20 — the only forward path is through the seam.
        let mut pos = 80.0;
        let mut vel = 0.0;
        let target = 20.0;
        let mut crossed_seam = false;
        for _ in 0..200 {
            let prev = pos;
            let r = tick_movement_cyclic(pos, vel, target, MAX_SPEED, ACCEL, DECEL, DT, C);
            // A forward step that wraps yields new_pos < old_pos.
            if r.position < prev && !r.arrived {
                crossed_seam = true;
            }
            pos = r.position;
            vel = r.velocity;
            if r.arrived {
                approx(pos, target);
                assert!(
                    crossed_seam,
                    "arrival without seam crossing implies wrong-way travel"
                );
                return;
            }
        }
        panic!("did not arrive within 200 ticks");
    }

    #[test]
    fn cyclic_degenerate_circumference_returns_input() {
        let r = tick_movement_cyclic(50.0, 3.0, 60.0, MAX_SPEED, ACCEL, DECEL, DT, 0.0);
        approx(r.position, 50.0);
        approx(r.velocity, 0.0);
        assert!(!r.arrived);
    }

    // ── headway_clamp_target ──────────────────────────────────────

    #[test]
    fn headway_clamp_passes_through_when_gap_is_large() {
        let intended = 30.0;
        let clamped = headway_clamp_target(0.0, 80.0, intended, 5.0, C);
        approx(clamped, 30.0);
    }

    #[test]
    fn headway_clamp_caps_target_at_leader_minus_headway() {
        // trailer=0, leader=10, headway=5 ⇒ safe_advance=5, so intended=20 clamps to 5.
        let clamped = headway_clamp_target(0.0, 10.0, 20.0, 5.0, C);
        approx(clamped, 5.0);
    }

    #[test]
    fn headway_clamp_collapses_to_self_when_gap_is_zero() {
        let clamped = headway_clamp_target(50.0, 50.0, 60.0, 5.0, C);
        approx(clamped, 50.0);
    }

    #[test]
    fn headway_clamp_handles_seam_crossing_gap() {
        // trailer=95, leader=5, headway=2 ⇒ gap=10, safe_advance=8.
        // Intended target is 4 (forward distance 9), exceeds safe_advance 8.
        // Clamped target is 95 + 8 = 103 → wraps to 3.
        let clamped = headway_clamp_target(95.0, 5.0, 4.0, 2.0, C);
        approx(clamped, 3.0);
    }

    #[test]
    fn headway_clamp_degenerate_inputs_pass_through() {
        approx(headway_clamp_target(0.0, 50.0, 30.0, 5.0, 0.0), 30.0);
        approx(headway_clamp_target(0.0, 50.0, 30.0, f64::NAN, C), 30.0);
    }

    // ── property test: cyclic ordering invariant under headway clamp ──

    /// A linear-congruential generator produces deterministic random
    /// values without pulling in the `rand` crate as a dev-dep just for
    /// this test. The seed is fixed so reproducibility across CI runs is
    /// guaranteed; the property holds for *every* sequence the LCG
    /// generates, not just the seeded one.
    fn lcg_next(state: &mut u64) -> f64 {
        // PCG-style multiplier and increment; standard high-quality LCG constants.
        *state = state
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(1_442_695_040_888_963_407);
        // Map upper 53 bits into [0, 1).
        #[allow(
            clippy::cast_precision_loss,
            reason = "mapping the top 53 bits of u64 into [0, 1) is the standard f64 quantisation"
        )]
        let upper = (*state >> 11) as f64;
        upper / ((1u64 << 53) as f64)
    }

    #[test]
    fn property_headway_invariant_holds_across_random_ticks() {
        const N_CARS: usize = 4;
        const HEADWAY: f64 = 5.0;
        const TICKS: u32 = 10_000;

        // Initial spacing > headway, even gaps around the loop.
        let mut positions = [0.0_f64, 25.0, 50.0, 75.0];
        let mut velocities = [0.0_f64; N_CARS];
        // Each car has its own intended target; we shuffle them randomly.
        let mut targets = [10.0_f64, 35.0, 60.0, 85.0];

        let mut rng = 0x00C0_FFEE_u64;

        for tick in 0..TICKS {
            // Once in a while, pick a fresh forward target for one car.
            if tick % 73 == 0 {
                let i = (lcg_next(&mut rng) * N_CARS as f64) as usize % N_CARS;
                let advance = lcg_next(&mut rng).mul_add(30.0, 5.0);
                targets[i] = (positions[i] + advance) % C;
            }

            // For each car, look up its leader (next car forward in cyclic order),
            // clamp its target by headway, and advance one tick.
            // Find indices sorted by forward distance from car 0 to establish order.
            let mut order: [usize; N_CARS] = [0, 1, 2, 3];
            order.sort_by(|&a, &b| {
                let da = forward_distance(positions[0], positions[a], C);
                let db = forward_distance(positions[0], positions[b], C);
                da.partial_cmp(&db).unwrap_or(std::cmp::Ordering::Equal)
            });

            // For each car at index `order[k]`, the leader is at `order[(k+1) % N_CARS]`.
            for k in 0..N_CARS {
                let me = order[k];
                let leader = order[(k + 1) % N_CARS];
                let clamped =
                    headway_clamp_target(positions[me], positions[leader], targets[me], HEADWAY, C);
                let r = tick_movement_cyclic(
                    positions[me],
                    velocities[me],
                    clamped,
                    MAX_SPEED,
                    ACCEL,
                    DECEL,
                    DT,
                    C,
                );
                positions[me] = r.position;
                velocities[me] = r.velocity;
            }

            // Invariant: every pair of consecutive cars in cyclic order has
            // forward gap >= HEADWAY (within a tiny tolerance for the
            // trapezoidal integrator's overshoot epsilon).
            for k in 0..N_CARS {
                let me = order[k];
                let leader = order[(k + 1) % N_CARS];
                let gap = forward_distance(positions[me], positions[leader], C);
                assert!(
                    gap >= HEADWAY - 1e-6,
                    "tick {tick}: headway invariant violated: car {me} → leader {leader} gap={gap} < {HEADWAY}",
                );
            }
        }
    }
}
