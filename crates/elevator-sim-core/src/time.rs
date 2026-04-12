//! Tick-to-wall-clock time conversion.

use std::time::Duration;

/// Converts between simulation ticks and wall-clock time.
///
/// The core simulation is purely tick-based for determinism.
/// Game integrations use `TimeAdapter` to display real-time
/// values and schedule events in human-readable units.
#[derive(Debug, Clone, Copy)]
pub struct TimeAdapter {
    /// Ticks per real-time second.
    ticks_per_second: f64,
}

impl TimeAdapter {
    /// Create a new adapter with the given tick rate.
    pub const fn new(ticks_per_second: f64) -> Self {
        Self { ticks_per_second }
    }

    /// Convert ticks to seconds.
    #[allow(clippy::cast_precision_loss)] // tick counts within f64 range
    pub fn ticks_to_seconds(&self, ticks: u64) -> f64 {
        ticks as f64 / self.ticks_per_second
    }

    /// Convert seconds to ticks, rounded to nearest.
    #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)] // intentional rounding
    pub fn seconds_to_ticks(&self, seconds: f64) -> u64 {
        (seconds * self.ticks_per_second).round() as u64
    }

    /// Convert a `Duration` to ticks, rounded to nearest.
    #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)] // intentional rounding
    pub fn duration_to_ticks(&self, duration: Duration) -> u64 {
        (duration.as_secs_f64() * self.ticks_per_second).round() as u64
    }

    /// Convert ticks to a `Duration`.
    #[allow(clippy::cast_precision_loss)] // tick counts within f64 range
    pub fn ticks_to_duration(&self, ticks: u64) -> Duration {
        Duration::from_secs_f64(ticks as f64 / self.ticks_per_second)
    }

    /// The configured tick rate.
    pub const fn ticks_per_second(&self) -> f64 {
        self.ticks_per_second
    }
}
