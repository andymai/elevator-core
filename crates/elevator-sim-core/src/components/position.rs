/// Position along the shaft axis.
#[derive(Debug, Clone, Copy)]
pub struct Position {
    pub value: f64,
}

/// Velocity along the shaft axis (signed: +up, -down).
#[derive(Debug, Clone, Copy)]
pub struct Velocity {
    pub value: f64,
}
