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
