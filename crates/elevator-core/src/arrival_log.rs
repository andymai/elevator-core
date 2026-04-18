//! Rolling per-stop arrival log.
//!
//! Commercial group controllers sample per-stop arrival rates to pick
//! traffic modes (up-peak, down-peak) and to pre-position idle cars
//! ahead of expected demand (Otis Compass Infinity's *predictive
//! parking*, KONE Polaris's pattern-driven mode switch). This log is
//! the signal source: dispatch strategies read it via
//! [`DispatchManifest::arrivals_at`](crate::dispatch::DispatchManifest::arrivals_at),
//! reposition strategies read it directly from `World` resources.
//!
//! The log is append-only during a tick and pruned at the start of each
//! tick to keep memory bounded under long runs. Stored entries are
//! `(tick, stop)` pairs; queries are by stop and time window only.

use crate::entity::EntityId;
use serde::{Deserialize, Serialize};

/// Default rolling window (in ticks).
///
/// Used by [`DispatchManifest::arrivals_at`](crate::dispatch::DispatchManifest::arrivals_at)
/// when the sim doesn't override it. Five minutes of real time at the
/// default 60 Hz tick rate, matching the window commercial controllers
/// use to detect up-peak / down-peak transitions.
pub const DEFAULT_ARRIVAL_WINDOW_TICKS: u64 = 18_000;

/// Append-only log of per-stop arrival events used to compute rolling
/// arrival-rate signals.
///
/// Stored as a `Vec<(tick, stop)>` sorted by tick (records are appended
/// in tick order during normal sim execution). Queries are `O(n)` worst
/// case but typically `O(window_size)`; `prune_before` keeps the tail
/// short enough that this is a non-issue for practical window sizes.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ArrivalLog {
    /// `(tick, stop)` pairs. Entries are appended in tick order.
    entries: Vec<(u64, EntityId)>,
}

impl ArrivalLog {
    /// Record an arrival at `stop` on `tick`.
    pub fn record(&mut self, tick: u64, stop: EntityId) {
        self.entries.push((tick, stop));
    }

    /// Count arrivals at `stop` within the window `[now - window, now]`
    /// inclusive. `window_ticks = 0` always returns 0.
    #[must_use]
    pub fn arrivals_in_window(&self, stop: EntityId, now: u64, window_ticks: u64) -> u64 {
        if window_ticks == 0 {
            return 0;
        }
        let lower = now.saturating_sub(window_ticks);
        self.entries
            .iter()
            .filter(|(t, s)| *s == stop && *t >= lower && *t <= now)
            .count() as u64
    }

    /// Drop every entry with tick strictly before `cutoff`. Called each
    /// tick by the sim with `cutoff = current_tick - max_window` so the
    /// log can't grow without bound.
    pub fn prune_before(&mut self, cutoff: u64) {
        self.entries.retain(|(t, _)| *t >= cutoff);
    }

    /// Number of recorded events currently in the log. Intended for
    /// snapshot inspection and tests.
    #[must_use]
    pub const fn len(&self) -> usize {
        self.entries.len()
    }

    /// Whether the log has no recorded events.
    #[must_use]
    pub const fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }
}
