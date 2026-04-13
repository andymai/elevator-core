//! Patience and boarding preference components.

use serde::{Deserialize, Serialize};

/// Tracks how long a rider will wait before abandoning.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Patience {
    /// Maximum ticks the rider will wait before abandoning.
    pub(crate) max_wait_ticks: u64,
    /// Ticks waited so far (incremented while in `Waiting` phase).
    pub(crate) waited_ticks: u64,
}

impl Patience {
    /// Maximum ticks the rider will wait before abandoning.
    #[must_use]
    pub const fn max_wait_ticks(&self) -> u64 {
        self.max_wait_ticks
    }

    /// Ticks waited so far (incremented while in `Waiting` phase).
    #[must_use]
    pub const fn waited_ticks(&self) -> u64 {
        self.waited_ticks
    }
}

impl Default for Patience {
    fn default() -> Self {
        Self {
            max_wait_ticks: 600,
            waited_ticks: 0,
        }
    }
}

/// Boarding preferences for a rider.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Preferences {
    /// If true, the rider will skip a crowded elevator and wait for the next.
    pub(crate) skip_full_elevator: bool,
    /// Maximum load factor (0.0-1.0) the rider will tolerate when boarding.
    pub(crate) max_crowding_factor: f64,
}

impl Preferences {
    /// If true, the rider will skip a crowded elevator and wait for the next.
    #[must_use]
    pub const fn skip_full_elevator(&self) -> bool {
        self.skip_full_elevator
    }

    /// Maximum load factor (0.0-1.0) the rider will tolerate when boarding.
    #[must_use]
    pub const fn max_crowding_factor(&self) -> f64 {
        self.max_crowding_factor
    }
}

impl Default for Preferences {
    fn default() -> Self {
        Self {
            skip_full_elevator: false,
            max_crowding_factor: 0.8,
        }
    }
}
