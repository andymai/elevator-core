//! Trapezoidal velocity-profile movement physics.

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
    let stopping_distance = speed * speed / (2.0 * deceleration);

    let new_velocity = if stopping_distance >= distance_remaining - EPSILON {
        // Decelerate
        let v = (-deceleration * dt).mul_add(velocity.signum(), velocity);
        // Clamp to zero if sign would flip.
        if velocity > 0.0 && v < 0.0 || velocity < 0.0 && v > 0.0 {
            0.0
        } else {
            v
        }
    } else if speed < max_speed {
        // Accelerate toward target
        let v = (acceleration * dt).mul_add(sign, velocity);
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

    let new_pos = new_velocity.mul_add(dt, position);

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
