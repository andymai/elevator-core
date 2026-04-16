//! Physical quantity newtypes for compile-time unit safety.

use serde::{Deserialize, Serialize};
use std::fmt;

/// Weight / mass (always non-negative).
///
/// Used for rider weight, elevator load, and weight capacity.
///
/// ```
/// # use elevator_core::components::Weight;
/// let w = Weight::from(75.0);
/// assert_eq!(w.value(), 75.0);
/// assert_eq!(format!("{w}"), "75.00kg");
/// ```
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Weight {
    /// The inner f64 value.
    pub(crate) value: f64,
}

impl Weight {
    /// Zero weight.
    pub const ZERO: Self = Self { value: 0.0 };

    /// The inner value.
    #[must_use]
    pub const fn value(self) -> f64 {
        self.value
    }
}

impl fmt::Display for Weight {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:.2}kg", self.value)
    }
}

impl From<f64> for Weight {
    fn from(value: f64) -> Self {
        debug_assert!(
            value.is_finite() && value >= 0.0,
            "Weight must be finite and non-negative, got {value}"
        );
        Self { value }
    }
}

impl std::ops::Add for Weight {
    type Output = Self;
    fn add(self, rhs: Self) -> Self {
        Self {
            value: self.value + rhs.value,
        }
    }
}

impl std::ops::AddAssign for Weight {
    fn add_assign(&mut self, rhs: Self) {
        self.value += rhs.value;
    }
}

impl std::ops::Sub for Weight {
    type Output = Self;
    fn sub(self, rhs: Self) -> Self {
        Self {
            value: self.value - rhs.value,
        }
    }
}

impl std::ops::SubAssign for Weight {
    fn sub_assign(&mut self, rhs: Self) {
        self.value -= rhs.value;
    }
}

/// Maximum travel speed (always non-negative, distance units per second).
///
/// ```
/// # use elevator_core::components::Speed;
/// let s = Speed::from(2.0);
/// assert_eq!(format!("{s}"), "2.00m/s");
/// ```
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Speed {
    /// The inner f64 value.
    pub(crate) value: f64,
}

impl Speed {
    /// The inner value.
    #[must_use]
    pub const fn value(self) -> f64 {
        self.value
    }
}

impl fmt::Display for Speed {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:.2}m/s", self.value)
    }
}

impl From<f64> for Speed {
    fn from(value: f64) -> Self {
        debug_assert!(
            value.is_finite() && value >= 0.0,
            "Speed must be finite and non-negative, got {value}"
        );
        Self { value }
    }
}

/// Acceleration / deceleration rate (always non-negative, distance units per second²).
///
/// ```
/// # use elevator_core::components::Accel;
/// let a = Accel::from(1.5);
/// assert_eq!(format!("{a}"), "1.50m/s²");
/// ```
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Accel {
    /// The inner f64 value.
    pub(crate) value: f64,
}

impl Accel {
    /// The inner value.
    #[must_use]
    pub const fn value(self) -> f64 {
        self.value
    }
}

impl fmt::Display for Accel {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:.2}m/s²", self.value)
    }
}

impl From<f64> for Accel {
    fn from(value: f64) -> Self {
        debug_assert!(
            value.is_finite() && value >= 0.0,
            "Accel must be finite and non-negative, got {value}"
        );
        Self { value }
    }
}
