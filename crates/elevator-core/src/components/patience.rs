//! Patience and boarding preference components.

use serde::{Deserialize, Serialize};

/// Tracks how long a rider will wait before abandoning.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
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
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Preferences {
    /// If true, the rider will skip a crowded elevator and wait for the next.
    pub(crate) skip_full_elevator: bool,
    /// Maximum load factor (0.0-1.0) the rider will tolerate when boarding.
    pub(crate) max_crowding_factor: f64,
    /// Wait budget before the rider abandons. `None` disables time-
    /// based abandonment; `Some(n)` causes the rider to enter
    /// [`RiderPhase::Abandoned`](crate::components::RiderPhase) after
    /// `n` ticks of being [`Waiting`](crate::components::RiderPhase::Waiting).
    ///
    /// The counter consulted is [`Patience::waited_ticks`] when a
    /// [`Patience`] component is attached — that counter only
    /// increments during `Waiting` and correctly excludes ride time for
    /// multi-leg routes. Without `Patience`, the budget degrades to
    /// lifetime ticks since spawn, which matches single-leg behavior.
    #[serde(alias = "balk_threshold_ticks")]
    pub(crate) abandon_after_ticks: Option<u32>,
    /// Abandon on the first full-car skip, rather than silently
    /// passing and continuing to wait. Default `false`.
    ///
    /// This is an **independent** abandonment axis from
    /// [`abandon_after_ticks`](Self::abandon_after_ticks) — the two
    /// do not compose or gate each other:
    ///
    /// - `abandon_on_full` is *event-triggered* from the loading phase
    ///   (`systems::loading`), firing on a full-car skip.
    /// - `abandon_after_ticks` is *time-triggered* from the transient
    ///   phase (`systems::advance_transient`), firing when the rider's
    ///   wait budget elapses.
    ///
    /// Both paths set [`RiderPhase::Abandoned`](crate::components::RiderPhase);
    /// whichever condition is reached first wins. Setting
    /// `abandon_on_full = true` with `abandon_after_ticks = None` is
    /// valid and abandons on the first full-car skip regardless of
    /// wait time.
    pub(crate) abandon_on_full: bool,
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

    /// Wait budget before the rider abandons. `None` disables time-
    /// based abandonment.
    #[must_use]
    pub const fn abandon_after_ticks(&self) -> Option<u32> {
        self.abandon_after_ticks
    }

    /// Should skipping a full car convert directly to abandonment?
    #[must_use]
    pub const fn abandon_on_full(&self) -> bool {
        self.abandon_on_full
    }

    /// Builder: set `skip_full_elevator`.
    #[must_use]
    pub const fn with_skip_full_elevator(mut self, skip: bool) -> Self {
        self.skip_full_elevator = skip;
        self
    }

    /// Builder: set `max_crowding_factor`.
    #[must_use]
    pub const fn with_max_crowding_factor(mut self, factor: f64) -> Self {
        self.max_crowding_factor = factor;
        self
    }

    /// Builder: set `abandon_after_ticks`.
    #[must_use]
    pub const fn with_abandon_after_ticks(mut self, ticks: Option<u32>) -> Self {
        self.abandon_after_ticks = ticks;
        self
    }

    /// Builder: set `abandon_on_full`.
    #[must_use]
    pub const fn with_abandon_on_full(mut self, abandon: bool) -> Self {
        self.abandon_on_full = abandon;
        self
    }
}

impl Default for Preferences {
    fn default() -> Self {
        Self {
            skip_full_elevator: false,
            max_crowding_factor: 0.8,
            abandon_after_ticks: None,
            abandon_on_full: false,
        }
    }
}
