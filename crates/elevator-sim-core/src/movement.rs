/// Result of one tick of movement physics.
#[derive(Debug, Clone, Copy)]
pub struct MovementResult {
    pub position: f64,
    pub velocity: f64,
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
pub fn tick_movement(
    position: f64,
    velocity: f64,
    target_position: f64,
    max_speed: f64,
    acceleration: f64,
    deceleration: f64,
    dt: f64,
) -> MovementResult {
    // Will be implemented in Task 4
    MovementResult {
        position,
        velocity,
        arrived: false,
    }
}
