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

/// Kills `replace * with + in braking_distance` (the `speed * speed` half).
///
/// With asymmetric inputs, `v²/d` and `(v+v)/d` diverge:
/// - `v=5, d=1` → original `25/2 = 12.5`, mutant `10/2 = 5.0`.
#[test]
fn braking_distance_is_quadratic_in_velocity() {
    let d = braking_distance(5.0, 1.0);
    assert!(
        (d - 12.5).abs() < 1e-12,
        "braking_distance(5.0, 1.0) should be 12.5 (v²/2d), got {d}"
    );
}

/// Kills `replace * with + in braking_distance` (the `2.0 * deceleration` half).
///
/// `v² / (2·d)` vs `v² / (2+d)` diverge for asymmetric `d`:
/// - `v=4, d=5` → original `16/10 = 1.6`, mutant `16/7 ≈ 2.286`.
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
    // Speed 10, decel 1: stopping_distance = 100/2 = 50. Target 2 units away.
    // Original: stopping_distance(50) >= remaining(2) → decelerate. New vel
    // = 10 + (-1 * 1) = 9.0.
    // Mutant (speed+speed): stopping_distance = (10+10)/2 = 10; still >= 2,
    // same decelerate branch, same velocity. Need a setup where the mutant
    // picks the *accelerate* branch instead.
    //
    // Speed 2, decel 1, target 10 away: stopping = 4/2 = 2. `2 >= 10 - EPS`
    // false → accelerate. Mutant: stopping = 4/2 = 2, same. Not useful.
    //
    // Speed 10, decel 1, target 10 away: stopping = 100/2 = 50 >= 10 →
    // decelerate, new vel = 9. Mutant: stopping = 20/2 = 10 >= 10 → still
    // decelerate. Borderline.
    //
    // Speed 5, decel 1, target 9 away: stopping = 25/2 = 12.5 >= 9 →
    // decelerate. Mutant: stopping = 10/2 = 5 < 9 → accelerate (new vel = 6).
    // Original new vel = 4. Divergence!
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
/// new vel = 4 + 5·1 = 9 clamped to max 10. Mutant stopping=2.29 >= 2 →
/// decelerate; new vel = 4 - 5 = -1 clamped to 0. Divergence on sign and
/// magnitude.
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

// ── tick_movement fast-path: displacement boundary ──────────────────

/// Verifies that a velocity well above `EPSILON` (1e-3 ≫ 1e-9) is not
/// mistaken for stationary: the fast-path is skipped, the sign-flip
/// clamp drives velocity to 0, and the overshoot check marks arrival.
///
/// Note: the `velocity.abs() < EPSILON` → `<= EPSILON` mutant at the
/// fast-path guard is an **equivalent mutant** — at the exact-EPSILON
/// boundary both paths converge to `{arrived: true, velocity: 0,
/// position: target}`, so no test input can distinguish them. This test
/// is retained for defense-in-depth against a drift in the trapezoidal
/// deceleration / sign-flip chain.
#[test]
fn tick_movement_fastpath_requires_velocity_below_epsilon() {
    // EPSILON is 1e-9 in tick_movement. Use velocity = 1e-3 so we are well
    // above the boundary; the fast-path must be skipped either way. This
    // covers the observable behavior at "nonzero-but-small" velocities.
    let result = tick_movement(5.0, 1e-3, 5.0, 10.0, 1.0, 1.0, 1.0);
    // With non-zero velocity, the trapezoidal path enters decelerate;
    // the sign-flip clamp then forces velocity to 0 and the overshoot
    // check arrives at target. Observable signal: velocity ends at 0.
    assert!(
        (result.velocity).abs() < 1e-9,
        "expected velocity clamped to 0 via decel + sign-flip, got {}",
        result.velocity
    );
    assert!(
        result.arrived,
        "expected arrival at exact target via overshoot check"
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

// ── tick_movement accelerate / cruise transition (lines 76-80) ──────

/// Defense-in-depth: asserts canonical cruise behavior when
/// `speed == max_speed` with a distant target — velocity stays at
/// `max_speed`, not pushed above it.
///
/// Note: the `speed < max_speed` → `<= max_speed` mutant is an
/// **equivalent mutant** — under `<=` the accelerate branch would
/// compute `v = 2.0 + 1·0.5 = 2.5` and then clamp to `max_speed = 2.0`,
/// producing the same observable velocity as the cruise branch. This
/// test is retained for structural coverage against a rewrite of the
/// cruise or cap branches.
#[test]
fn tick_movement_speed_at_max_cruises_not_accelerates() {
    let result = tick_movement(0.0, 2.0, 100.0, 2.0, 1.0, 1.0, 0.5);
    // Under cruise: new_velocity = 1 · max_speed = 2.0. No overshoot.
    // If `speed < max_speed` mutates to `<=`, accelerate fires:
    // new_velocity = 2.0 + 1·0.5 = 2.5, then clamp to max_speed = 2.0.
    // Net: same result. This mutant is therefore equivalent at the
    // boundary — we still assert the canonical behavior for
    // defense-in-depth (catches a rewrite of the cruise branch).
    assert!(
        (result.velocity - 2.0).abs() < 1e-9,
        "expected cruise at max_speed = 2.0, got {}",
        result.velocity
    );
    assert!(
        !result.arrived,
        "should still be en route to distant target"
    );
}

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
