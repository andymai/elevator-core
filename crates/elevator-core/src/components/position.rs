//! Position and velocity components along the shaft axis.

use serde::{Deserialize, Serialize};
use std::fmt;

/// Position along the shaft axis.
///
/// # Display
///
/// Formats as a compact distance string:
///
/// ```
/// # use elevator_core::components::Position;
/// let pos = Position::from(4.5);
/// assert_eq!(format!("{pos}"), "4.50m");
/// ```
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd, Serialize, Deserialize)]
pub struct Position {
    /// Absolute position value.
    pub(crate) value: f64,
}

impl Position {
    /// Zero position (shaft origin).
    pub const ZERO: Self = Self { value: 0.0 };

    /// Absolute position value.
    #[must_use]
    pub const fn value(&self) -> f64 {
        self.value
    }

    /// Absolute distance between two positions.
    #[must_use]
    pub fn distance_to(self, other: Self) -> f64 {
        (self.value - other.value).abs()
    }
}

impl fmt::Display for Position {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:.2}m", self.value)
    }
}

impl From<f64> for Position {
    fn from(value: f64) -> Self {
        debug_assert!(
            value.is_finite(),
            "Position value must be finite, got {value}"
        );
        Self { value }
    }
}

/// Velocity along the shaft axis (signed: +up, -down).
///
/// # Display
///
/// Formats as a compact speed string:
///
/// ```
/// # use elevator_core::components::Velocity;
/// let vel = Velocity::from(1.2);
/// assert_eq!(format!("{vel}"), "1.20m/s");
/// let stopped = Velocity::from(0.0);
/// assert_eq!(format!("{stopped}"), "0.00m/s");
/// ```
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd, Serialize, Deserialize)]
pub struct Velocity {
    /// Signed velocity value.
    pub(crate) value: f64,
}

impl Velocity {
    /// Zero velocity (stationary).
    pub const ZERO: Self = Self { value: 0.0 };

    /// Signed velocity value.
    #[must_use]
    pub const fn value(&self) -> f64 {
        self.value
    }

    /// Absolute speed (magnitude of velocity).
    #[must_use]
    pub const fn speed(self) -> f64 {
        self.value.abs()
    }
}

impl fmt::Display for Velocity {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:.2}m/s", self.value)
    }
}

impl From<f64> for Velocity {
    fn from(value: f64) -> Self {
        debug_assert!(
            value.is_finite(),
            "Velocity value must be finite, got {value}"
        );
        Self { value }
    }
}
