//! Tick-to-wall-clock time conversion.

use std::time::Duration;

/// Simulation tick rate, exposed as a [`World`](crate::world::World) resource.
///
/// Dispatch strategies and other subsystems that only hold a `&World`
/// need this to convert between tick-denominated elevator fields
/// (e.g. `door_transition_ticks`) and the second-denominated terms
/// they combine with (travel time, rider delay). Inserted once during
/// [`Simulation::new`](crate::sim::Simulation::new) and restored from
/// snapshots via the same path.
///
/// Strategies that miss the resource (e.g. in a bare-bones unit-test
/// world) should fall back to 60 Hz — the canonical default and the
/// only value used across the published scenarios.
#[derive(Debug, Clone, Copy)]
pub struct TickRate(pub f64);

impl Default for TickRate {
    fn default() -> Self {
        Self(60.0)
    }
}

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
    #[must_use]
    pub const fn new(ticks_per_second: f64) -> Self {
        Self { ticks_per_second }
    }

    /// Convert ticks to seconds.
    #[must_use]
    pub fn ticks_to_seconds(&self, ticks: u64) -> f64 {
        ticks as f64 / self.ticks_per_second
    }

    /// Convert seconds to ticks, rounded to nearest.
    #[must_use]
    pub fn seconds_to_ticks(&self, seconds: f64) -> u64 {
        (seconds * self.ticks_per_second).round() as u64
    }

    /// Convert a `Duration` to ticks, rounded to nearest.
    #[must_use]
    pub fn duration_to_ticks(&self, duration: Duration) -> u64 {
        (duration.as_secs_f64() * self.ticks_per_second).round() as u64
    }

    /// Convert ticks to a `Duration`.
    #[must_use]
    pub fn ticks_to_duration(&self, ticks: u64) -> Duration {
        Duration::from_secs_f64(ticks as f64 / self.ticks_per_second)
    }

    /// The configured tick rate.
    #[must_use]
    pub const fn ticks_per_second(&self) -> f64 {
        self.ticks_per_second
    }
}
