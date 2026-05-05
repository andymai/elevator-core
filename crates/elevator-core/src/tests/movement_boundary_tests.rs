//! Boundary-value tests for [`crate::movement`] targeting the surviving
//! mutants listed in `mutants.out/missed.txt` at the repo root.
//!
//! Each test's doc comment names the mutant(s) it is designed to kill.
//! Follows the pattern established in [`super::mutation_kills_tests`].
//!
//! These tests complement the proptest-based checks in
//! [`super::proptest_tests`]: proptest samples probabilistically, which
//! misses exact-boundary mutations (`<` vs `<=`, `*` vs `+` at symmetric
//! values). Exact-constant tests close that gap.

use crate::movement::{braking_distance, tick_movement};

// ── braking_distance ────────────────────────────────────────────────

/// Kills `replace * with + in braking_distance` on the `2.0 * deceleration`
/// divisor — an asymmetric-input case that
/// [`tests::braking_tests::braking_distance_formula`] and
/// [`tests::movement_tests::braking_distance_matches_kinematic_formula`]
/// cannot distinguish because they use symmetric `v`/`d` pairs where
/// `2·d` happens to equal `2+d` (e.g. `d=2`).
///
/// With `v=4, d=5`: original `16/(2·5) = 1.6`, mutant `16/(2+5) ≈ 2.286`.
#[test]
fn braking_distance_divisor_is_multiplicative() {
    let d = braking_distance(4.0, 5.0);
    assert!(
        (d - 1.6).abs() < 1e-12,
        "braking_distance(4.0, 5.0) should be 1.6 (v²/2d), got {d}"
    );
}

// ── tick_movement stopping_distance kernel ──────────────────────────

/// Kills `replace * with + in tick_movement` on the `speed * speed` factor
/// of `stopping_distance`.
///
/// With the speed-squared kernel, a car moving fast toward a close target
/// starts decelerating; with an additive kernel, it would keep accelerating.
/// Observable: final velocity magnitude after one tick.
#[test]
fn tick_movement_decelerates_when_stopping_distance_exceeds_remaining() {
    // Speed=5, decel=1, target=9 away: original stopping=25/2=12.5 >= 9 →
    // decelerate (new vel=4). Mutant stopping=10/2=5 < 9 → accelerate (new
    // vel=6). Diverges on velocity magnitude.
    let result = tick_movement(0.0, 5.0, 9.0, 10.0, 1.0, 1.0, 1.0);
    assert!(
        (result.velocity - 4.0).abs() < 1e-9,
        "expected decelerate branch (v=4), got v={} — stopping_distance kernel may be corrupted",
        result.velocity
    );
}

/// Kills `replace * with + in tick_movement` on the `2.0 * safe_decel`
/// divisor of `stopping_distance`.
///
/// For speed=4, decel=5: original `stopping = 16/(2·5) = 1.6`; target at
/// 10 → accelerate. Mutant `16/(2+5) = 16/7 ≈ 2.29` → still accelerate.
/// Choose target near the boundary to force divergence.
///
/// Speed=4, decel=5, target=2.0: original stopping=1.6 < 2 → accelerate;
/// new vel = 4 + 5·1 = 9 (below max 10, no cap). Mutant stopping=2.29 >= 2
/// → decelerate; new vel = 4 - 5 = -1 clamped to 0. Divergence on sign
/// and magnitude.
#[test]
fn tick_movement_stopping_distance_divisor_is_multiplicative() {
    let result = tick_movement(0.0, 4.0, 2.0, 10.0, 5.0, 5.0, 1.0);
    // Original: accelerate → new velocity = 9.0. The overshoot check then
    // fires (new_pos = 9.0, target = 2.0 → wrong side), so we land at
    // target with velocity=0.
    // Mutant: decelerate → clamped to 0 mid-stride; new_pos = 0, no
    // overshoot, arrived=false, velocity=0, position stays at 0.
    assert!(
        result.arrived,
        "expected overshoot arrival under correct kernel (arrived={}, pos={}, vel={})",
        result.arrived, result.position, result.velocity
    );
}

// ── tick_movement sign-flip clamp (line 71) ─────────────────────────

/// Kills mutants on the sign-flip comparator at
/// `if velocity > 0.0 && v < 0.0 || velocity < 0.0 && v > 0.0`.
///
/// Starts with a small positive velocity and decel that pushes computed
/// `v` negative. Without the clamp, the car would reverse direction in
/// one tick — a physical impossibility for this motion profile.
#[test]
fn tick_movement_sign_flip_positive_clamps_to_zero() {
    // vel 0.5, decel 1, dt 1: v = -1·1 + 0.5 = -0.5 (sign flip).
    // Target ahead so decelerate branch fires (stopping_distance = 0.125,
    // distance_remaining = 0.1 → stopping_distance >= remaining → decelerate).
    let result = tick_movement(0.0, 0.5, 0.1, 10.0, 1.0, 1.0, 1.0);
    assert!(
        result.velocity.abs() < 1e-9,
        "expected sign-flip clamp to zero, got velocity = {}",
        result.velocity
    );
}

/// Mirror of [`tick_movement_sign_flip_positive_clamps_to_zero`] for the
/// negative-velocity branch of the clamp OR-expression.
#[test]
fn tick_movement_sign_flip_negative_clamps_to_zero() {
    // vel -0.5, decel 1, dt 1, target behind (negative direction).
    // v = -1 · sign(-0.5) + (-0.5) = -1·(-1) - 0.5 = 0.5 (sign flip).
    let result = tick_movement(0.0, -0.5, -0.1, 10.0, 1.0, 1.0, 1.0);
    assert!(
        result.velocity.abs() < 1e-9,
        "expected sign-flip clamp to zero (negative branch), got velocity = {}",
        result.velocity
    );
}

// ── tick_movement accelerate transition ─────────────────────────────

/// Kills `replace > with >= in tick_movement` on the `v.abs() > max_speed`
/// cap.
///
/// When `v.abs()` is strictly below `max_speed`, the cap must *not* fire.
/// A mutant that flips this to `>=` would only diverge if `v.abs() ==
/// max_speed` exactly — but at that boundary both branches produce
/// `sign * max_speed`, which equals `v` itself. Equivalent mutant.
///
/// Non-equivalent angle: assert that `v` passes through unchanged when
/// it's strictly below `max_speed`. Kills a mutant that drops the `else`
/// arm or returns `sign * max_speed` unconditionally.
#[test]
fn tick_movement_accelerate_does_not_cap_below_max_speed() {
    // vel 1, accel 1, dt 0.5, max 3, distant target. New vel = 1 + 1·0.5
    // = 1.5. Must not be clamped to 3.0.
    let result = tick_movement(0.0, 1.0, 100.0, 3.0, 1.0, 1.0, 0.5);
    assert!(
        (result.velocity - 1.5).abs() < 1e-9,
        "expected uncapped velocity 1.5, got {}",
        result.velocity
    );
}

// ── tick_movement opposing-velocity branch ──────────────────────────

/// Kills `replace * with + in tick_movement` on `velocity * sign < 0.0`
/// (the opposing-direction detector).
///
/// With velocity in one direction and target in the other:
/// - Original `velocity * sign`: `1.0 * (-1) = -1.0`, < 0 → opposing → decelerate.
/// - Mutant `velocity + sign`: `1.0 + (-1) = 0.0`, NOT < 0 → fall through to
///   accelerate. The car would speed *up* away from the target instead of
///   braking back toward it — a silent correctness disaster.
///
/// Observable: velocity magnitude after one tick. Original brakes
/// (`new_vel = 1 - 5 · 1 = -4`, sign-flip clamp → 0). Mutant accelerates
/// further away.
#[test]
fn tick_movement_opposing_velocity_decelerates() {
    // pos=0, vel=+1 (moving up), target=-10 (down), decel=5, dt=1.
    let result = tick_movement(0.0, 1.0, -10.0, 10.0, 1.0, 5.0, 1.0);
    assert!(
        result.velocity <= 0.0,
        "opposing-velocity branch must not accelerate further from target: got velocity={}",
        result.velocity
    );
}

// ── tick_movement already-arrived guard ─────────────────────────────

/// Kills `replace < with <= in tick_movement` on the `displacement.abs()
/// < EPSILON` half of the already-arrived guard. Shows the guard does
/// **not** fire when displacement is non-zero (even if velocity is at
/// EPSILON exactly), so mutants flipping the displacement check from
/// `<` to `<=` would still need a separate displacement-equals-EPSILON
/// case to diverge — and at exactly EPSILON the guard's velocity half
/// (also `<`, not `<=`) keeps the mutant equivalent. The behavioural
/// signal is "we did integrate, not short-circuit": post-tick position
/// is no longer the start position when displacement is meaningful.
#[test]
fn tick_movement_does_not_short_circuit_with_pending_displacement() {
    // displacement = 1.0 (well above EPSILON), velocity = 0.
    // The guard must not fire — must integrate one step.
    let result = tick_movement(0.0, 0.0, 1.0, 10.0, 1.0, 1.0, 0.5);
    assert!(
        !result.arrived,
        "already-arrived guard fired with non-zero displacement (pos=0, target=1)"
    );
    assert!(
        result.position > 0.0,
        "expected forward integration, got position={}",
        result.position
    );
}
