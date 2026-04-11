use crate::movement::tick_movement;

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

#[test]
fn moving_downward() {
    let mut pos = 10.0;
    let mut vel = 0.0;
    let target = 3.0;

    let r = tick_movement(pos, vel, target, MAX_SPEED, ACCELERATION, DECELERATION, DT);
    assert!(r.velocity < 0.0, "velocity should be negative when moving down");

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
