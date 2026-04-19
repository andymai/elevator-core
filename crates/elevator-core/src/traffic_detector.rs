//! Traffic-mode detector.
//!
//! Classifies the current simulation moment into one of a small set of
//! [`TrafficMode`]s by reading the [`ArrivalLog`](crate::arrival_log::ArrivalLog)'s
//! rolling window. Consumers — dispatch tuning, adaptive reposition,
//! HUD narration — read [`TrafficDetector::current_mode`] each tick to
//! get a cheap, pre-computed answer instead of re-deriving it
//! themselves.
//!
//! V1 implements the hard-rule classifier from Siikonen's
//! fuzzy-labelled traffic patterns (the fuzzy membership math reduces
//! to the same threshold crossings once defuzzified): up-peak is
//! triggered when the lobby-origin fraction crosses a threshold over
//! a rolling window; idle when the total arrival rate is below a
//! noise floor; everything else is inter-floor. Down-peak detection
//! needs a destination signal (rides heading *to* the lobby, not
//! arrivals *from* it) which the base [`ArrivalLog`] doesn't carry;
//! `DownPeak` is in [`TrafficMode`] for API stability and will flip
//! on in a follow-up.

use crate::arrival_log::ArrivalLog;
use crate::entity::EntityId;
use serde::{Deserialize, Serialize};

/// Detected traffic mode. Consumers read this via
/// [`TrafficDetector::current_mode`] each tick.
///
/// `#[non_exhaustive]` so adding variants (`DownPeak`, `Lunch`) in
/// follow-up PRs is a minor-version bump, not a break.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[non_exhaustive]
pub enum TrafficMode {
    /// Total arrival rate is below [`TrafficDetector::idle_rate_threshold`].
    /// Reposition strategies should stay put; dispatch can drop
    /// starvation-avoidance bonuses.
    #[default]
    Idle,
    /// Lobby-origin fraction is above [`TrafficDetector::up_peak_fraction`].
    /// Classic morning rush — reposition to lobby, prefer faster
    /// lobby↔upper cycles.
    UpPeak,
    /// Arrivals are distributed across stops without a strong lobby
    /// skew. Default non-rush state.
    InterFloor,
    /// Reserved for a future destination-aware classifier (rides to
    /// the lobby dominate). Never emitted by the V1 implementation;
    /// present in the enum so downstream match arms can compile once
    /// the down-peak signal lands.
    DownPeak,
}

/// Rolling-window classifier for the sim's current traffic pattern.
///
/// Stored as a world resource under `World::resource::<TrafficDetector>()`
/// and auto-refreshed each tick in the metrics phase. Manual reconstruction
/// is supported via [`TrafficDetector::with_*`] builders for tests that
/// bypass `Simulation`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrafficDetector {
    /// Window over which arrivals are counted (ticks).
    window_ticks: u64,
    /// Minimum per-tick arrival rate to leave [`TrafficMode::Idle`].
    /// `arrivals_total / window_ticks` must exceed this.
    idle_rate_threshold: f64,
    /// Lobby-origin fraction at or above which we flip to
    /// [`TrafficMode::UpPeak`]. 0.6 matches the Siikonen-Aalto
    /// threshold for "clear up-peak" from the rolling-average
    /// classifier lineage.
    up_peak_fraction: f64,
    /// Last classified mode; returned by [`current_mode`](Self::current_mode).
    current: TrafficMode,
    /// Tick of the most recent `update` call. Read by snapshot
    /// inspectors; not used for staleness (the metrics phase always
    /// refreshes before consumers read).
    last_update_tick: u64,
}

impl Default for TrafficDetector {
    fn default() -> Self {
        Self {
            window_ticks: crate::arrival_log::DEFAULT_ARRIVAL_WINDOW_TICKS,
            // Two arrivals per minute at 60 Hz = ~0.000555 per tick.
            // Below that the sim is effectively idle from a traffic
            // perspective — empty overnight or cold-start scenarios.
            idle_rate_threshold: 2.0 / 3600.0,
            up_peak_fraction: 0.6,
            current: TrafficMode::Idle,
            last_update_tick: 0,
        }
    }
}

impl TrafficDetector {
    /// Create with default thresholds.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Override the rolling-window size (ticks).
    ///
    /// # Panics
    /// Panics on `window_ticks = 0` — the classifier would divide by
    /// zero when computing the rate.
    #[must_use]
    pub const fn with_window_ticks(mut self, window_ticks: u64) -> Self {
        assert!(
            window_ticks > 0,
            "TrafficDetector::with_window_ticks requires a positive window"
        );
        self.window_ticks = window_ticks;
        self
    }

    /// Override the idle-rate threshold (arrivals per tick).
    ///
    /// # Panics
    /// Panics on non-finite or negative values.
    #[must_use]
    pub fn with_idle_rate_threshold(mut self, rate: f64) -> Self {
        assert!(
            rate.is_finite() && rate >= 0.0,
            "idle_rate_threshold must be finite and non-negative, got {rate}"
        );
        self.idle_rate_threshold = rate;
        self
    }

    /// Override the lobby-origin fraction that trips up-peak.
    ///
    /// # Panics
    /// Panics if `fraction` is NaN or outside `[0.0, 1.0]`.
    #[must_use]
    pub fn with_up_peak_fraction(mut self, fraction: f64) -> Self {
        assert!(
            fraction.is_finite() && (0.0..=1.0).contains(&fraction),
            "up_peak_fraction must be finite and in [0, 1], got {fraction}"
        );
        self.up_peak_fraction = fraction;
        self
    }

    /// The most recently classified mode.
    #[must_use]
    pub const fn current_mode(&self) -> TrafficMode {
        self.current
    }

    /// Tick of the last `update` call (diagnostic only).
    #[must_use]
    pub const fn last_update_tick(&self) -> u64 {
        self.last_update_tick
    }

    /// Rolling-window size (ticks).
    #[must_use]
    pub const fn window_ticks(&self) -> u64 {
        self.window_ticks
    }

    /// Re-classify using arrivals from `log` as of tick `now`. `stops`
    /// is the list of stop entities to aggregate over; the *first*
    /// entry is treated as the lobby for up-peak classification, so
    /// callers must pass them in position order (lobby first).
    ///
    /// Idempotent — calling twice with the same inputs yields the
    /// same mode. Called once per tick by the metrics phase; callers
    /// driving the sim manually (tests, games stepping by hand) can
    /// invoke it directly.
    pub fn update(&mut self, log: &ArrivalLog, now: u64, stops: &[EntityId]) {
        self.last_update_tick = now;
        if stops.is_empty() || self.window_ticks == 0 {
            self.current = TrafficMode::Idle;
            return;
        }
        let lobby = stops[0];
        let lobby_count = log.arrivals_in_window(lobby, now, self.window_ticks);
        let mut total: u64 = 0;
        for &s in stops {
            total = total.saturating_add(log.arrivals_in_window(s, now, self.window_ticks));
        }
        // An empty window is always `Idle`, independent of the
        // configured threshold. Guards the `idle_rate_threshold = 0.0`
        // edge case where the strict `<` comparison below wouldn't
        // catch `total == 0` (greptile review of #361).
        if total == 0 {
            self.current = TrafficMode::Idle;
            return;
        }
        #[allow(clippy::cast_precision_loss)] // counts fit in f64 mantissa
        let rate_per_tick = total as f64 / self.window_ticks as f64;
        if rate_per_tick < self.idle_rate_threshold {
            self.current = TrafficMode::Idle;
            return;
        }
        #[allow(clippy::cast_precision_loss)]
        let fraction = lobby_count as f64 / total as f64;
        if fraction >= self.up_peak_fraction {
            self.current = TrafficMode::UpPeak;
            return;
        }
        self.current = TrafficMode::InterFloor;
    }
}
