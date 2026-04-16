use crate::movement::{braking_distance, tick_movement};

const DT: f64 = 1.0 / 60.0;
const MAX_SPEED: f64 = 2.0;
const ACCELERATION: f64 = 1.5;
const DECELERATION: f64 = 2.0;

#[test]
fn already_at_target() {
    let result = tick_movement(5.0, 0.0, 5.0, MAX_SPEED, ACCELERATION, DECELERATION, DT);
    assert!(result.arrived);
    assert!((result.position - 5.0).abs() < 1e-9);
    assert!((result.velocity).abs() < 1e-9);
}

#[test]
fn accelerate_from_rest() {
    let result = tick_movement(0.0, 0.0, 100.0, MAX_SPEED, ACCELERATION, DECELERATION, DT);
    assert!(!result.arrived);
    assert!(result.velocity > 0.0, "velocity should be positive");
    assert!(result.position > 0.0, "position should have advanced");
}

#[test]
fn decelerate_to_stop() {
    // Close to target with moderate velocity — should eventually arrive.
    let mut pos = 9.5;
    let mut vel = 1.5;
    let target = 10.0;

    for _ in 0..600 {
        let r = tick_movement(pos, vel, target, MAX_SPEED, ACCELERATION, DECELERATION, DT);
        pos = r.position;
        vel = r.velocity;
        if r.arrived {
            assert!((pos - target).abs() < 1e-9);
            assert!(vel.abs() < 1e-9);
            return;
        }
    }
    panic!("did not arrive within 600 ticks");
}

#[test]
fn short_distance_triangle_profile() {
    // Very short trip — should never reach max_speed.
    let mut pos = 0.0;
    let mut vel = 0.0;
    let target = 0.5;
    let mut peak_speed: f64 = 0.0;

    for _ in 0..600 {
        let r = tick_movement(pos, vel, target, MAX_SPEED, ACCELERATION, DECELERATION, DT);
        pos = r.position;
        vel = r.velocity;
        peak_speed = peak_speed.max(vel.abs());
        if r.arrived {
            assert!((pos - target).abs() < 1e-9);
            assert!(
                peak_speed < MAX_SPEED,
                "should not reach max_speed on short trip, peak was {peak_speed}"
            );
            return;
        }
    }
    panic!("did not arrive within 600 ticks");
}

#[test]
fn full_trip() {
    let mut pos = 0.0;
    let mut vel = 0.0;
    let target = 15.0;
    let mut ticks = 0u32;

    loop {
        let r = tick_movement(pos, vel, target, MAX_SPEED, ACCELERATION, DECELERATION, DT);
        pos = r.position;
        vel = r.velocity;
        ticks += 1;

        if r.arrived {
            assert!((pos - target).abs() < 1e-9);
            assert!(vel.abs() < 1e-9);
            // At max_speed=2.0 floors/s, 15 floors takes ~7.5s plus accel/decel time.
            // Should be roughly 450-700 ticks at 60fps.
            assert!(
                ticks > 100 && ticks < 1200,
                "trip took {ticks} ticks, seems unreasonable"
            );
            return;
        }
        assert!(ticks < 2000, "did not arrive within 2000 ticks");
    }
}

#[test]
fn overshoot_prevention() {
    // Velocity would carry us well past the target in one tick — should snap to target.
    // position=9.99, velocity=2.0, target=10.0, dt=1/60 → would move 0.033 past the 0.01 remaining.
    let result = tick_movement(9.99, 2.0, 10.0, MAX_SPEED, ACCELERATION, DECELERATION, DT);
    assert!(result.arrived, "should snap to target on overshoot");
    assert!((result.position - 10.0).abs() < 1e-9);
    assert!(result.velocity.abs() < 1e-9);
}

// ── Mutation-coverage tests: assert exact numeric outputs from the motion
// primitives so mutants that flip an operator (`*` → `+`, `>` → `>=`) or
// arithmetic (`v² / 2a` → `v² * 2a`) produce a visibly wrong number.

#[test]
fn braking_distance_matches_kinematic_formula() {
    // v² / (2·a). Kills `replace * with +` in braking_distance (speed*speed
    // would become speed+speed = 2·v which is dimensionally wrong).
    // v=2, a=2  →  4 / 4  =  1.0.
    assert!((braking_distance(2.0, 2.0) - 1.0).abs() < 1e-9);
    // v=10, a=2 →  100 / 4 = 25.0.
    assert!((braking_distance(10.0, 2.0) - 25.0).abs() < 1e-9);
    // Scales quadratically with velocity.
    let d1 = braking_distance(3.0, 2.0);
    let d2 = braking_distance(6.0, 2.0);
    assert!(
        (d2 / d1 - 4.0).abs() < 1e-9,
        "doubling velocity should 4× the braking distance, got {d2}/{d1}"
    );
    // Edge: zero velocity, any deceleration → 0.
    assert_eq!(braking_distance(0.0, 2.0), 0.0);
    // Edge: non-positive deceleration → 0 (defensive return).
    assert_eq!(braking_distance(10.0, 0.0), 0.0);
    assert_eq!(braking_distance(10.0, -2.0), 0.0);
    // Velocity sign doesn't matter — uses |v|.
    assert!((braking_distance(-5.0, 2.0) - braking_distance(5.0, 2.0)).abs() < 1e-9);
}

#[test]
fn tick_movement_exact_single_step_from_rest() {
    // Fresh acceleration from rest: new velocity should be a·dt, new
    // position should be v·dt = a·dt² from this tick's movement. Kills
    // `replace * with /` and `replace * with +` mutations in the
    // acceleration branch (v = acc·dt·sign + velocity).
    let r = tick_movement(0.0, 0.0, 100.0, MAX_SPEED, ACCELERATION, DECELERATION, DT);

    let expected_v = ACCELERATION * DT; // 1.5 / 60 = 0.025
    let expected_p = expected_v * DT; // 0.025 / 60 ≈ 4.167e-4
    assert!(
        (r.velocity - expected_v).abs() < 1e-12,
        "velocity after one tick: expected {expected_v}, got {}",
        r.velocity
    );
    assert!(
        (r.position - expected_p).abs() < 1e-12,
        "position after one tick: expected {expected_p}, got {}",
        r.position
    );
    assert!(!r.arrived);
}

#[test]
fn tick_movement_caps_velocity_at_max_speed() {
    // Starting at velocity just below max_speed with plenty of distance to
    // go — the next tick should clamp to exactly max_speed. Kills the
    // `>` vs `>=` mutation on the `v.abs() > max_speed` branch.
    let start_v = MAX_SPEED - 0.001;
    let r = tick_movement(
        0.0,
        start_v,
        1000.0,
        MAX_SPEED,
        ACCELERATION,
        DECELERATION,
        DT,
    );
    assert!(
        (r.velocity - MAX_SPEED).abs() < 1e-9,
        "velocity should clamp to max_speed = {MAX_SPEED}, got {}",
        r.velocity
    );
}

#[test]
fn tick_movement_cruise_phase_holds_max_speed() {
    // At exactly max_speed, with plenty of distance — the cruise branch
    // should keep us at max_speed exactly. Kills `speed < max_speed` vs
    // `<=` mutation.
    let r = tick_movement(
        0.0,
        MAX_SPEED,
        1000.0,
        MAX_SPEED,
        ACCELERATION,
        DECELERATION,
        DT,
    );
    assert!(
        (r.velocity - MAX_SPEED).abs() < 1e-9,
        "cruise velocity should equal max_speed"
    );
    // Position should advance by max_speed * dt.
    let expected_p = MAX_SPEED * DT;
    assert!(
        (r.position - expected_p).abs() < 1e-12,
        "position advances by v·dt during cruise"
    );
}

#[test]
fn tick_movement_snaps_to_target_on_overshoot() {
    // Large velocity within epsilon of the target — next tick crosses
    // target. Kills the `new_displacement.abs() < EPSILON` vs `>=` mutation
    // on the overshoot guard.
    let r = tick_movement(9.999, 2.0, 10.0, MAX_SPEED, ACCELERATION, DECELERATION, DT);
    assert!(r.arrived);
    assert!(
        (r.position - 10.0).abs() < 1e-9,
        "snap to exact target, got {}",
        r.position
    );
    assert!(
        r.velocity.abs() < 1e-9,
        "velocity zeroed on snap, got {}",
        r.velocity
    );
}

#[test]
fn tick_movement_decelerates_near_target() {
    // Position 9.0, velocity 2.0, target 10.0 — braking distance at v=2,
    // a=2 is 1.0, matching remaining distance. The decel branch fires.
    // Kills `stopping_distance >= distance_remaining` vs `<=` mutation.
    let r = tick_movement(9.0, 2.0, 10.0, MAX_SPEED, ACCELERATION, DECELERATION, DT);
    let decel_step = DECELERATION * DT;
    let expected_v = 2.0 - decel_step;
    assert!(
        (r.velocity - expected_v).abs() < 1e-9,
        "should decelerate by decel·dt: expected {expected_v}, got {}",
        r.velocity
    );
    assert!(!r.arrived);
}

#[test]
fn tick_movement_zero_sign_when_already_at_target() {
    // At target with zero velocity — should return arrived with no motion.
    // Kills `velocity > 0.0 ... v < 0.0` sign-flip check when position == target.
    let r = tick_movement(5.0, 0.0, 5.0, MAX_SPEED, ACCELERATION, DECELERATION, DT);
    assert!(r.arrived);
    assert!(
        (r.position - 5.0).abs() < 1e-9,
        "position should be target, got {}",
        r.position
    );
    assert!(
        r.velocity.abs() < 1e-9,
        "velocity should be zero, got {}",
        r.velocity
    );
}

#[test]
fn moving_downward() {
    let mut pos = 10.0;
    let mut vel = 0.0;
    let target = 3.0;

    let r = tick_movement(pos, vel, target, MAX_SPEED, ACCELERATION, DECELERATION, DT);
    assert!(
        r.velocity < 0.0,
        "velocity should be negative when moving down"
    );

    // Run to completion.
    pos = r.position;
    vel = r.velocity;
    for _ in 0..2000 {
        let r = tick_movement(pos, vel, target, MAX_SPEED, ACCELERATION, DECELERATION, DT);
        pos = r.position;
        vel = r.velocity;
        if r.arrived {
            assert!((pos - target).abs() < 1e-9);
            return;
        }
    }
    panic!("did not arrive within 2000 ticks");
}

// ── Edge-case dt tests (#183) ──────────────────────────────────────

#[test]
fn dt_zero_does_not_change_state() {
    // With dt=0, no time passes — position and velocity should remain unchanged.
    let r = tick_movement(5.0, 1.0, 10.0, MAX_SPEED, ACCELERATION, DECELERATION, 0.0);
    // The function may snap to arrived if displacement is within EPSILON,
    // but at 5.0 → 10.0 it should not. Either way, position must not
    // change meaningfully.
    assert!(
        !r.arrived,
        "should not arrive with dt=0 when far from target"
    );
    assert!(
        (r.position - 5.0).abs() < 1e-9,
        "position should not change with dt=0, got {}",
        r.position
    );
    // velocity.abs() should not exceed max_speed.
    assert!(
        r.velocity.abs() <= MAX_SPEED + 1e-9,
        "velocity must not exceed max_speed with dt=0"
    );
    // No NaN.
    assert!(!r.position.is_nan(), "position must not be NaN");
    assert!(!r.velocity.is_nan(), "velocity must not be NaN");
}

#[test]
fn very_large_dt_arrives_without_overshoot() {
    // A huge dt should still arrive at the target without going past it.
    let r = tick_movement(0.0, 0.0, 10.0, MAX_SPEED, ACCELERATION, DECELERATION, 1e6);
    assert!(r.arrived, "should arrive with very large dt");
    assert!(
        (r.position - 10.0).abs() < 1e-9,
        "position should be exactly at target after large dt, got {}",
        r.position
    );
    assert!(
        r.velocity.abs() < 1e-9,
        "velocity should be zero on arrival, got {}",
        r.velocity
    );
}

#[test]
fn very_large_dt_downward() {
    // Same test but moving downward.
    let r = tick_movement(100.0, 0.0, 3.0, MAX_SPEED, ACCELERATION, DECELERATION, 1e6);
    assert!(r.arrived, "should arrive with very large dt (downward)");
    assert!(
        (r.position - 3.0).abs() < 1e-9,
        "position should be at target, got {}",
        r.position
    );
}

#[test]
fn very_small_dt_makes_minimal_progress() {
    // Extremely small dt should make tiny but non-NaN progress.
    let r = tick_movement(
        0.0,
        0.0,
        100.0,
        MAX_SPEED,
        ACCELERATION,
        DECELERATION,
        1e-15,
    );
    assert!(!r.arrived, "should not arrive with tiny dt");
    assert!(!r.position.is_nan(), "position must not be NaN");
    assert!(!r.velocity.is_nan(), "velocity must not be NaN");
    assert!(
        r.position >= 0.0,
        "position should not go backward, got {}",
        r.position
    );
    assert!(
        r.velocity >= 0.0,
        "velocity should not be negative when heading up, got {}",
        r.velocity
    );
}
