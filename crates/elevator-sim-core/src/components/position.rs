/// Position along the shaft axis.
#[derive(Debug, Clone, Copy)]
pub struct Position {
    /// Absolute position value.
    pub value: f64,
}

/// Velocity along the shaft axis (signed: +up, -down).
#[derive(Debug, Clone, Copy)]
pub struct Velocity {
    /// Signed velocity value.
    pub value: f64,
}
