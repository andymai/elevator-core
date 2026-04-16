//! Physical quantity newtypes for compile-time unit safety.

use serde::{Deserialize, Serialize};
use std::fmt;

/// Error returned when constructing a unit type from an invalid `f64`.
///
/// The value was not finite or was negative.
///
/// ```
/// # use elevator_core::components::units::UnitError;
/// let err = UnitError { unit: "Weight", value: f64::NAN };
/// assert_eq!(
///     format!("{err}"),
///     "invalid Weight value: NaN (must be finite and non-negative)"
/// );
/// ```
#[derive(Debug, Clone, PartialEq)]
pub struct UnitError {
    /// Name of the unit type that failed validation.
    pub unit: &'static str,
    /// The rejected value.
    pub value: f64,
}

impl fmt::Display for UnitError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "invalid {} value: {} (must be finite and non-negative)",
            self.unit, self.value
        )
    }
}

impl std::error::Error for UnitError {}

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

    /// Fallible constructor — returns `Err` for NaN, infinity, or negative values.
    ///
    /// # Errors
    ///
    /// Returns [`UnitError`] if `value` is not finite or is negative.
    ///
    /// ```
    /// # use elevator_core::components::Weight;
    /// assert!(Weight::try_new(75.0).is_ok());
    /// assert!(Weight::try_new(f64::NAN).is_err());
    /// assert!(Weight::try_new(-1.0).is_err());
    /// ```
    pub fn try_new(value: f64) -> Result<Self, UnitError> {
        if value.is_finite() && value >= 0.0 {
            Ok(Self { value })
        } else {
            Err(UnitError {
                unit: "Weight",
                value,
            })
        }
    }

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

#[allow(clippy::panic)]
impl From<f64> for Weight {
    fn from(value: f64) -> Self {
        assert!(
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
            value: (self.value - rhs.value).max(0.0),
        }
    }
}

impl std::ops::SubAssign for Weight {
    fn sub_assign(&mut self, rhs: Self) {
        self.value = (self.value - rhs.value).max(0.0);
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
    /// Fallible constructor — returns `Err` for NaN, infinity, or negative values.
    ///
    /// # Errors
    ///
    /// Returns [`UnitError`] if `value` is not finite or is negative.
    ///
    /// ```
    /// # use elevator_core::components::Speed;
    /// assert!(Speed::try_new(2.0).is_ok());
    /// assert!(Speed::try_new(f64::INFINITY).is_err());
    /// ```
    pub fn try_new(value: f64) -> Result<Self, UnitError> {
        if value.is_finite() && value >= 0.0 {
            Ok(Self { value })
        } else {
            Err(UnitError {
                unit: "Speed",
                value,
            })
        }
    }

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

#[allow(clippy::panic)]
impl From<f64> for Speed {
    fn from(value: f64) -> Self {
        assert!(
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
    /// Fallible constructor — returns `Err` for NaN, infinity, or negative values.
    ///
    /// # Errors
    ///
    /// Returns [`UnitError`] if `value` is not finite or is negative.
    ///
    /// ```
    /// # use elevator_core::components::Accel;
    /// assert!(Accel::try_new(1.5).is_ok());
    /// assert!(Accel::try_new(-0.5).is_err());
    /// ```
    pub fn try_new(value: f64) -> Result<Self, UnitError> {
        if value.is_finite() && value >= 0.0 {
            Ok(Self { value })
        } else {
            Err(UnitError {
                unit: "Accel",
                value,
            })
        }
    }

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

#[allow(clippy::panic)]
impl From<f64> for Accel {
    fn from(value: f64) -> Self {
        assert!(
            value.is_finite() && value >= 0.0,
            "Accel must be finite and non-negative, got {value}"
        );
        Self { value }
    }
}
