//! Position and velocity components along the shaft axis.

use serde::{Deserialize, Serialize};

/// Position along the shaft axis.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Position {
    /// Absolute position value.
    pub(crate) value: f64,
}

impl Position {
    /// Absolute position value.
    #[must_use]
    pub const fn value(&self) -> f64 {
        self.value
    }
}

/// Velocity along the shaft axis (signed: +up, -down).
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Velocity {
    /// Signed velocity value.
    pub(crate) value: f64,
}

impl Velocity {
    /// Signed velocity value.
    #[must_use]
    pub const fn value(&self) -> f64 {
        self.value
    }
}

/// Direction of movement along a line axis.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Direction {
    /// Moving toward higher positions.
    Up,
    /// Moving toward lower positions.
    Down,
}

impl Direction {
    /// Reverse the direction.
    #[must_use]
    pub const fn reversed(self) -> Self {
        match self {
            Self::Up => Self::Down,
            Self::Down => Self::Up,
        }
    }
}
