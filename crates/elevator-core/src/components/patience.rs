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
    /// Wait budget before the rider abandons. `None` disables balking-
    /// based abandonment; `Some(n)` causes the rider to enter
    /// [`RiderPhase::Abandoned`](crate::components::RiderPhase) after
    /// `n` ticks of being [`Waiting`](crate::components::RiderPhase::Waiting).
    ///
    /// The counter consulted is [`Patience::waited_ticks`] when a
    /// [`Patience`] component is attached — that counter only
    /// increments during `Waiting` and correctly excludes ride time for
    /// multi-leg routes. Without `Patience`, the budget degrades to
    /// lifetime ticks since spawn, which matches single-leg behavior.
    pub(crate) balk_threshold_ticks: Option<u32>,
    /// When a full car arrives and this rider skips it, should that
    /// count as a balk-and-abandon rather than a silent pass? When
    /// `true`, the rider abandons immediately instead of waiting for
    /// `balk_threshold_ticks` to elapse. Default `false`.
    pub(crate) rebalk_on_full: bool,
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

    /// Wait budget before the rider abandons. `None` disables balking-
    /// based abandonment.
    #[must_use]
    pub const fn balk_threshold_ticks(&self) -> Option<u32> {
        self.balk_threshold_ticks
    }

    /// Should balking a full car convert directly to abandonment?
    #[must_use]
    pub const fn rebalk_on_full(&self) -> bool {
        self.rebalk_on_full
    }

    /// Builder: set `balk_threshold_ticks`.
    #[must_use]
    pub const fn with_balk_threshold_ticks(mut self, ticks: Option<u32>) -> Self {
        self.balk_threshold_ticks = ticks;
        self
    }

    /// Builder: set `rebalk_on_full`.
    #[must_use]
    pub const fn with_rebalk_on_full(mut self, rebalk: bool) -> Self {
        self.rebalk_on_full = rebalk;
        self
    }
}

impl Default for Preferences {
    fn default() -> Self {
        Self {
            skip_full_elevator: false,
            max_crowding_factor: 0.8,
            balk_threshold_ticks: None,
            rebalk_on_full: false,
        }
    }
}
