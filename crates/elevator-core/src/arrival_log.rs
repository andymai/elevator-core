//! Rolling per-stop arrival log.
//!
//! Carries a `CurrentTick` sibling resource that mirrors
//! [`Simulation::current_tick`](crate::sim::Simulation::current_tick)
//! so strategies reading the log from phases without direct access to
//! `PhaseContext` (e.g. [`RepositionStrategy`](crate::dispatch::RepositionStrategy))
//! can still compute windowed queries.
//!
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

/// World resource mirroring the current simulation tick.
///
/// Kept in sync by [`Simulation::step`](crate::sim::Simulation::step).
/// Lets phases that don't receive a `PhaseContext` (reposition
/// strategies, custom `World` consumers) compute rolling-window queries
/// against [`ArrivalLog`] without plumbing tick through their
/// signatures.
#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize)]
pub struct CurrentTick(
    /// Tick value at the start of the last `step()` entry.
    pub u64,
);

/// Default rolling window (in ticks).
///
/// Used by [`DispatchManifest::arrivals_at`](crate::dispatch::DispatchManifest::arrivals_at)
/// when the sim doesn't override it. Five minutes of real time at the
/// default 60 Hz tick rate, matching the window commercial controllers
/// use to detect up-peak / down-peak transitions.
pub const DEFAULT_ARRIVAL_WINDOW_TICKS: u64 = 18_000;

/// World resource controlling how far back the [`ArrivalLog`] retains
/// entries before `Simulation::advance_tick` prunes them.
///
/// Defaults to [`DEFAULT_ARRIVAL_WINDOW_TICKS`].
/// [`Simulation::set_reposition`](crate::sim::Simulation::set_reposition)
/// auto-widens this to the installed strategy's
/// [`min_arrival_log_window`](crate::dispatch::RepositionStrategy::min_arrival_log_window)
/// so e.g. `PredictiveParking::with_window_ticks(50_000)` keeps
/// `50_000` ticks of arrivals retained without a separate setter call.
/// Override manually via
/// [`Simulation::set_arrival_log_retention_ticks`](crate::sim::Simulation::set_arrival_log_retention_ticks)
/// when retention should differ from any strategy's window (e.g. tests
/// or custom consumers reading the log directly).
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct ArrivalLogRetention(pub u64);

impl Default for ArrivalLogRetention {
    fn default() -> Self {
        Self(DEFAULT_ARRIVAL_WINDOW_TICKS)
    }
}

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

    /// Rewrite every entry's stop `EntityId` through `id_remap`, dropping
    /// entries whose stop isn't present in the map. Used by snapshot
    /// restore to translate pre-restore stop IDs to the new allocations.
    pub fn remap_entity_ids(&mut self, id_remap: &std::collections::HashMap<EntityId, EntityId>) {
        self.entries
            .retain_mut(|(_, stop)| match id_remap.get(stop) {
                Some(&new) => {
                    *stop = new;
                    true
                }
                None => false,
            });
    }
}

/// Append-only log of rider *destinations*, mirror of [`ArrivalLog`]
/// for the outgoing side of a trip.
///
/// Enables destination-aware signals that the origin-only
/// `ArrivalLog` can't produce — specifically
/// [`TrafficMode::DownPeak`](crate::traffic_detector::TrafficMode::DownPeak)
/// detection, which triggers on "lots of riders heading *to* the
/// lobby" rather than "lots of riders arriving *from* it."
///
/// Auto-installed alongside [`ArrivalLog`] by `Simulation::new` and
/// appended to in the same rider-spawn path. Shares
/// [`ArrivalLogRetention`]'s retention window so the two logs can't
/// drift against each other's time horizon.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DestinationLog {
    /// `(tick, destination_stop)` pairs. Entries are appended in
    /// tick order; all queries go through
    /// [`destinations_in_window`](Self::destinations_in_window).
    entries: Vec<(u64, EntityId)>,
}

impl DestinationLog {
    /// Record that a rider spawned at `tick` heading to `destination`.
    pub fn record(&mut self, tick: u64, destination: EntityId) {
        self.entries.push((tick, destination));
    }

    /// Count rides to `stop` within the window `[now - window, now]`
    /// inclusive. `window_ticks = 0` always returns 0.
    #[must_use]
    pub fn destinations_in_window(&self, stop: EntityId, now: u64, window_ticks: u64) -> u64 {
        if window_ticks == 0 {
            return 0;
        }
        let lower = now.saturating_sub(window_ticks);
        self.entries
            .iter()
            .filter(|(t, s)| *s == stop && *t >= lower && *t <= now)
            .count() as u64
    }

    /// Prune entries older than `cutoff` ticks. Called from
    /// `Simulation::advance_tick` alongside [`ArrivalLog::prune_before`].
    pub fn prune_before(&mut self, cutoff: u64) {
        self.entries.retain(|(t, _)| *t >= cutoff);
    }

    /// Number of recorded events (diagnostic / tests).
    #[must_use]
    pub const fn len(&self) -> usize {
        self.entries.len()
    }

    /// Whether the log has no recorded events.
    #[must_use]
    pub const fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    /// Remap entity IDs for snapshot restore. Mirrors
    /// [`ArrivalLog::remap_entity_ids`].
    pub fn remap_entity_ids(&mut self, id_remap: &std::collections::HashMap<EntityId, EntityId>) {
        self.entries
            .retain_mut(|(_, stop)| match id_remap.get(stop) {
                Some(&new) => {
                    *stop = new;
                    true
                }
                None => false,
            });
    }
}
