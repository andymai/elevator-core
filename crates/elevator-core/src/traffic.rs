//! Traffic generation for rider arrivals.
//!
//! This module provides:
//!
//! - [`TrafficPattern`](crate::traffic::TrafficPattern) — origin/destination distribution
//!   presets (up-peak, down-peak, etc.).
//! - [`TrafficSchedule`](crate::traffic::TrafficSchedule) — time-varying pattern selection
//!   across a simulated day.
//! - [`TrafficSource`](crate::traffic::TrafficSource) — trait for external traffic
//!   generators that feed riders into a [`Simulation`](crate::sim::Simulation) each tick.
//! - [`PoissonSource`](crate::traffic::PoissonSource) — Poisson-arrival traffic generator
//!   using schedules and spawn config.
//! - [`SpawnRequest`](crate::traffic::SpawnRequest) — a single rider spawn instruction
//!   returned by a traffic source.
//!
//! # Design
//!
//! Traffic generation is **external to the simulation loop**. A
//! [`TrafficSource`](crate::traffic::TrafficSource) produces
//! [`SpawnRequest`](crate::traffic::SpawnRequest)s each tick; the consumer feeds them into
//! [`Simulation::spawn_rider`](crate::sim::Simulation::spawn_rider)
//! (or the [`RiderBuilder`](crate::sim::RiderBuilder) for richer configuration).
//!
//! ```rust,no_run
//! use elevator_core::prelude::*;
//! use elevator_core::config::SimConfig;
//! use elevator_core::traffic::{PoissonSource, TrafficSource};
//! # fn run(config: &SimConfig) -> Result<(), SimError> {
//! let mut sim = SimulationBuilder::from_config(config.clone()).build()?;
//! let mut source = PoissonSource::from_config(config);
//!
//! for _ in 0..10_000 {
//!     let tick = sim.current_tick();
//!     for req in source.generate(tick) {
//!         let _ = sim.spawn_rider(req.origin, req.destination, req.weight);
//!     }
//!     sim.step();
//! }
//! # Ok(())
//! # }
//! ```

use crate::config::SimConfig;
use crate::entity::EntityId;
use crate::stop::StopId;
use rand::RngExt;
use serde::{Deserialize, Serialize};

// ── TrafficPattern ───────────────────────────────────────────────────

/// Traffic pattern for generating realistic rider origin/destination distributions.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[non_exhaustive]
pub enum TrafficPattern {
    /// Uniform random: equal probability for all origin/destination pairs.
    Uniform,
    /// Morning rush: most riders originate from the lobby (first stop) going up.
    UpPeak,
    /// Evening rush: most riders head to the lobby (first stop) from upper stops.
    DownPeak,
    /// Lunch rush: riders go from upper stops to a mid-range stop and back.
    Lunchtime,
    /// Mixed: combination of up-peak, down-peak, and inter-floor traffic.
    Mixed,
}

/// Sample an (origin, destination) index pair from `n` stops.
///
/// Returns indices into the stops slice. All pattern logic lives here;
/// public methods just map indices to their concrete ID types.
fn sample_indices(
    pattern: TrafficPattern,
    n: usize,
    rng: &mut impl RngExt,
) -> Option<(usize, usize)> {
    if n < 2 {
        return None;
    }

    let lobby = 0;
    let mid = n / 2;

    match pattern {
        TrafficPattern::Uniform => Some(uniform_pair_indices(n, rng)),

        TrafficPattern::UpPeak => {
            // 80% from lobby, 20% inter-floor.
            if rng.random_range(0.0..1.0) < 0.8 {
                Some((lobby, rng.random_range(1..n)))
            } else {
                Some(uniform_pair_indices(n, rng))
            }
        }

        TrafficPattern::DownPeak => {
            // 80% heading to lobby, 20% inter-floor.
            if rng.random_range(0.0..1.0) < 0.8 {
                Some((rng.random_range(1..n), lobby))
            } else {
                Some(uniform_pair_indices(n, rng))
            }
        }

        TrafficPattern::Lunchtime => {
            // 40% upper→mid, 40% mid→upper, 20% random.
            if n < 2 {
                return Some(uniform_pair_indices(n, rng));
            }
            let r: f64 = rng.random_range(0.0..1.0);
            let upper_start = n.div_ceil(2);
            if r < 0.4 && upper_start < n && upper_start != mid {
                Some((rng.random_range(upper_start..n), mid))
            } else if r < 0.8 && upper_start < n && upper_start != mid {
                Some((mid, rng.random_range(upper_start..n)))
            } else {
                Some(uniform_pair_indices(n, rng))
            }
        }

        TrafficPattern::Mixed => {
            // 30% up-peak, 30% down-peak, 40% inter-floor.
            let r: f64 = rng.random_range(0.0..1.0);
            if r < 0.3 {
                Some((lobby, rng.random_range(1..n)))
            } else if r < 0.6 {
                Some((rng.random_range(1..n), lobby))
            } else {
                Some(uniform_pair_indices(n, rng))
            }
        }
    }
}

/// Pick two distinct random indices from `0..n`.
fn uniform_pair_indices(n: usize, rng: &mut impl RngExt) -> (usize, usize) {
    let o = rng.random_range(0..n);
    let mut d = rng.random_range(0..n);
    while d == o {
        d = rng.random_range(0..n);
    }
    (o, d)
}

impl TrafficPattern {
    /// Sample an (origin, destination) pair from the given stops.
    ///
    /// `stops` must be sorted by position (lowest first). The first stop
    /// is treated as the "lobby" for peak patterns.
    ///
    /// Returns `None` if fewer than 2 stops are provided.
    pub fn sample(
        &self,
        stops: &[EntityId],
        rng: &mut impl RngExt,
    ) -> Option<(EntityId, EntityId)> {
        let (o, d) = sample_indices(*self, stops.len(), rng)?;
        Some((stops[o], stops[d]))
    }

    /// Sample an (origin, destination) pair using config [`StopId`]s.
    ///
    /// Same as [`sample`](Self::sample) but works with `StopId` slices for
    /// use outside the simulation (no `EntityId` resolution needed).
    pub fn sample_stop_ids(
        &self,
        stops: &[StopId],
        rng: &mut impl RngExt,
    ) -> Option<(StopId, StopId)> {
        let (o, d) = sample_indices(*self, stops.len(), rng)?;
        Some((stops[o], stops[d]))
    }
}

// ── TrafficSchedule ──────────────────────────────────────────────────

/// A time-varying traffic schedule that selects patterns based on tick count.
///
/// Maps tick ranges to traffic patterns, enabling realistic daily cycles
/// (e.g., up-peak in the morning, lunchtime at noon, down-peak in evening).
///
/// # Example
///
/// ```rust,no_run
/// use elevator_core::prelude::*;
/// use elevator_core::traffic::{TrafficPattern, TrafficSchedule};
/// use rand::{SeedableRng, rngs::StdRng};
///
/// let schedule = TrafficSchedule::new(vec![
///     (0..3600, TrafficPattern::UpPeak),      // First hour: morning rush
///     (3600..7200, TrafficPattern::Uniform),   // Second hour: normal
///     (7200..10800, TrafficPattern::Lunchtime), // Third hour: lunch
///     (10800..14400, TrafficPattern::DownPeak), // Fourth hour: evening rush
/// ]);
///
/// // Sampling uses the pattern active at the given tick
/// let stops = vec![StopId(0), StopId(1)];
/// let mut rng = StdRng::seed_from_u64(0);
/// let tick: u64 = 0;
/// let (origin, dest) = schedule.sample_stop_ids(tick, &stops, &mut rng).unwrap();
/// # let _ = (origin, dest);
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrafficSchedule {
    /// Tick ranges mapped to traffic patterns, in order.
    segments: Vec<(std::ops::Range<u64>, TrafficPattern)>,
    /// Pattern to use when tick falls outside all segments.
    fallback: TrafficPattern,
}

impl TrafficSchedule {
    /// Create a schedule from segments.
    ///
    /// Segments are `(tick_range, pattern)` pairs. If the current tick
    /// doesn't fall within any segment, the fallback `Uniform` pattern is used.
    #[must_use]
    pub const fn new(segments: Vec<(std::ops::Range<u64>, TrafficPattern)>) -> Self {
        Self {
            segments,
            fallback: TrafficPattern::Uniform,
        }
    }

    /// Set the fallback pattern for ticks outside all segments.
    #[must_use]
    pub const fn with_fallback(mut self, pattern: TrafficPattern) -> Self {
        self.fallback = pattern;
        self
    }

    /// Get the active traffic pattern for the given tick.
    #[must_use]
    pub fn pattern_at(&self, tick: u64) -> &TrafficPattern {
        self.segments
            .iter()
            .find(|(range, _)| range.contains(&tick))
            .map_or(&self.fallback, |(_, pattern)| pattern)
    }

    /// Sample an (origin, destination) pair using the pattern active at `tick`.
    ///
    /// Delegates to [`TrafficPattern::sample()`] for the active pattern.
    pub fn sample(
        &self,
        tick: u64,
        stops: &[EntityId],
        rng: &mut impl RngExt,
    ) -> Option<(EntityId, EntityId)> {
        self.pattern_at(tick).sample(stops, rng)
    }

    /// Sample an (origin, destination) pair by [`StopId`] using the active pattern.
    pub fn sample_stop_ids(
        &self,
        tick: u64,
        stops: &[StopId],
        rng: &mut impl RngExt,
    ) -> Option<(StopId, StopId)> {
        self.pattern_at(tick).sample_stop_ids(stops, rng)
    }

    /// Create a typical office-building daily schedule.
    ///
    /// Assumes `ticks_per_hour` ticks per real-world hour:
    /// - Hours 0-1: Up-peak (morning rush)
    /// - Hours 1-4: Uniform (normal traffic)
    /// - Hours 4-5: Lunchtime
    /// - Hours 5-8: Uniform (afternoon)
    /// - Hours 8-9: Down-peak (evening rush)
    /// - Hours 9+: Uniform (fallback)
    #[must_use]
    pub fn office_day(ticks_per_hour: u64) -> Self {
        Self::new(vec![
            (0..ticks_per_hour, TrafficPattern::UpPeak),
            (ticks_per_hour..4 * ticks_per_hour, TrafficPattern::Uniform),
            (
                4 * ticks_per_hour..5 * ticks_per_hour,
                TrafficPattern::Lunchtime,
            ),
            (
                5 * ticks_per_hour..8 * ticks_per_hour,
                TrafficPattern::Uniform,
            ),
            (
                8 * ticks_per_hour..9 * ticks_per_hour,
                TrafficPattern::DownPeak,
            ),
        ])
    }

    /// Create a constant schedule that uses the same pattern for all ticks.
    #[must_use]
    pub const fn constant(pattern: TrafficPattern) -> Self {
        Self {
            segments: Vec::new(),
            fallback: pattern,
        }
    }
}

// ── TrafficSource + SpawnRequest ─────────────────────────────────────

/// A request to spawn a single rider, produced by a [`TrafficSource`].
///
/// Feed these into [`Simulation::spawn_rider`](crate::sim::Simulation::spawn_rider)
/// or the [`RiderBuilder`](crate::sim::RiderBuilder) each tick.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SpawnRequest {
    /// Origin stop (config ID).
    pub origin: StopId,
    /// Destination stop (config ID).
    pub destination: StopId,
    /// Rider weight.
    pub weight: f64,
}

/// Trait for external traffic generators.
///
/// Implementors produce zero or more [`SpawnRequest`]s per tick. The consumer
/// is responsible for feeding them into the simulation:
///
/// ```rust,no_run
/// # use elevator_core::prelude::*;
/// # use elevator_core::traffic::TrafficSource;
/// # fn run(sim: &mut Simulation, source: &mut impl TrafficSource, tick: u64) -> Result<(), SimError> {
/// for req in source.generate(tick) {
///     sim.spawn_rider(req.origin, req.destination, req.weight)?;
/// }
/// # Ok(())
/// # }
/// ```
///
/// This design keeps traffic generation external to the simulation loop,
/// giving consumers full control over when and how riders are spawned.
pub trait TrafficSource {
    /// Generate spawn requests for the given tick.
    ///
    /// May return an empty vec (no arrivals this tick) or multiple requests
    /// (burst arrivals). The implementation controls the arrival process.
    fn generate(&mut self, tick: u64) -> Vec<SpawnRequest>;
}

// ── PoissonSource ────────────────────────────────────────────────────

/// Poisson-arrival traffic generator with time-varying patterns.
///
/// Uses an exponential inter-arrival time model: each tick, the generator
/// checks whether enough time has elapsed since the last spawn. The mean
/// interval comes from
/// [`PassengerSpawnConfig::mean_interval_ticks`](crate::config::PassengerSpawnConfig::mean_interval_ticks).
///
/// Origin/destination pairs are sampled from a [`TrafficSchedule`] that
/// selects the active [`TrafficPattern`] based on the current tick.
///
/// # Example
///
/// ```rust,no_run
/// use elevator_core::prelude::*;
/// use elevator_core::config::SimConfig;
/// use elevator_core::traffic::{PoissonSource, TrafficSchedule};
///
/// # fn run(config: &SimConfig) {
/// // From a SimConfig (reads stops and spawn parameters).
/// let mut source = PoissonSource::from_config(config);
///
/// // Or build manually.
/// let stops = vec![StopId(0), StopId(1)];
/// let mut source = PoissonSource::new(
///     stops,
///     TrafficSchedule::office_day(3600),
///     120,           // mean_interval_ticks
///     (60.0, 90.0),  // weight_range
/// );
/// # let _ = source;
/// # }
/// ```
pub struct PoissonSource {
    /// Sorted stop IDs (lowest position first).
    stops: Vec<StopId>,
    /// Time-varying pattern schedule.
    schedule: TrafficSchedule,
    /// Mean ticks between arrivals (lambda = 1/mean).
    mean_interval: u32,
    /// Weight range `(min, max)` for spawned riders.
    weight_range: (f64, f64),
    /// RNG for sampling. Defaults to an OS-seeded [`rand::rngs::StdRng`];
    /// swap in a user-seeded RNG via [`Self::with_rng`] for deterministic
    /// traffic.
    rng: rand::rngs::StdRng,
    /// Tick of the next scheduled arrival.
    next_arrival_tick: u64,
}

impl PoissonSource {
    /// Create a new Poisson traffic source.
    ///
    /// `stops` should be sorted by position (lowest first) to match
    /// [`TrafficPattern`] expectations (first stop = lobby).
    ///
    /// If `weight_range.0 > weight_range.1`, the values are swapped.
    #[must_use]
    pub fn new(
        stops: Vec<StopId>,
        schedule: TrafficSchedule,
        mean_interval_ticks: u32,
        weight_range: (f64, f64),
    ) -> Self {
        let weight_range = if weight_range.0 > weight_range.1 {
            (weight_range.1, weight_range.0)
        } else {
            weight_range
        };
        let mut rng = rand::make_rng::<rand::rngs::StdRng>();
        let next = sample_next_arrival(0, mean_interval_ticks, &mut rng);
        Self {
            stops,
            schedule,
            mean_interval: mean_interval_ticks,
            weight_range,
            rng,
            next_arrival_tick: next,
        }
    }

    /// Create a Poisson source from a [`SimConfig`].
    ///
    /// Reads stop IDs from the building config and spawn parameters from
    /// `passenger_spawning`. Uses a constant [`TrafficPattern::Uniform`] schedule
    /// by default — call [`with_schedule`](Self::with_schedule) to override.
    #[must_use]
    pub fn from_config(config: &SimConfig) -> Self {
        // Sort by position so stops[0] is the lobby (lowest position),
        // matching TrafficPattern's assumption.
        let mut stop_entries: Vec<_> = config.building.stops.iter().collect();
        stop_entries.sort_by(|a, b| {
            a.position
                .partial_cmp(&b.position)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        let stops: Vec<StopId> = stop_entries.iter().map(|s| s.id).collect();
        let spawn = &config.passenger_spawning;
        Self::new(
            stops,
            TrafficSchedule::constant(TrafficPattern::Uniform),
            spawn.mean_interval_ticks,
            spawn.weight_range,
        )
    }

    /// Replace the traffic schedule.
    #[must_use]
    pub fn with_schedule(mut self, schedule: TrafficSchedule) -> Self {
        self.schedule = schedule;
        self
    }

    /// Replace the mean arrival interval and resample the next arrival.
    ///
    /// The first scheduled arrival is drawn in [`Self::new`] using whatever
    /// mean the constructor received. Without resampling here, a chain like
    /// `PoissonSource::new(stops, schedule, 1, range).with_mean_interval(1200)`
    /// silently keeps the tick-0-ish arrival drawn at lambda = 1 — users
    /// get their first rider ~1 tick in despite asking for one every 1200.
    ///
    /// The method draws `next_arrival_tick` afresh from the updated mean,
    /// anchored to the source's current `next_arrival_tick` so that mid-
    /// simulation calls do not rewind the anchor and trigger a catch-up
    /// burst on the next [`generate`](TrafficSource::generate). See
    /// [`with_rng`](Self::with_rng) for the analogous rationale.
    #[must_use]
    pub fn with_mean_interval(mut self, ticks: u32) -> Self {
        self.mean_interval = ticks;
        self.next_arrival_tick =
            sample_next_arrival(self.next_arrival_tick, self.mean_interval, &mut self.rng);
        self
    }

    /// Tick of the next scheduled arrival.
    ///
    /// Exposed so callers (and tests) can confirm when the next spawn is
    /// due without advancing the simulation.
    #[must_use]
    pub const fn next_arrival_tick(&self) -> u64 {
        self.next_arrival_tick
    }

    /// Replace the internal RNG with a caller-supplied one.
    ///
    /// Pair with a seeded [`rand::rngs::StdRng`] (via
    /// `StdRng::seed_from_u64(...)`) to make `PoissonSource` output
    /// reproducible across runs — closing the gap called out in
    /// [Snapshots and Determinism](https://andymai.github.io/elevator-core/snapshots-determinism.html).
    ///
    /// The next scheduled arrival is resampled from the new RNG, anchored
    /// to the source's current `next_arrival_tick`. That means:
    ///
    /// - **At construction time** (the usual pattern, and what the doc
    ///   example shows) the anchor is still the tick-0-ish draw from
    ///   [`Self::new`]; resampling produces a fresh interval from there.
    /// - **Mid-simulation** — if `with_rng` is called after the source has
    ///   been stepped — the resample starts from the already-advanced
    ///   anchor, so the next arrival is drawn forward from "now" rather
    ///   than from tick 0. A naïve `sample_next_arrival(0, ...)` would
    ///   rewind the anchor and cause the next `generate(tick)` call to
    ///   catch-up-emit every backlogged arrival in a single burst.
    ///
    /// ```
    /// use elevator_core::traffic::{PoissonSource, TrafficPattern, TrafficSchedule};
    /// use elevator_core::stop::StopId;
    /// use rand::SeedableRng;
    ///
    /// let seeded = rand::rngs::StdRng::seed_from_u64(42);
    /// let source = PoissonSource::new(
    ///     vec![StopId(0), StopId(1)],
    ///     TrafficSchedule::constant(TrafficPattern::Uniform),
    ///     120,
    ///     (60.0, 90.0),
    /// )
    /// .with_rng(seeded);
    /// # let _ = source;
    /// ```
    #[must_use]
    pub fn with_rng(mut self, rng: rand::rngs::StdRng) -> Self {
        self.rng = rng;
        self.next_arrival_tick =
            sample_next_arrival(self.next_arrival_tick, self.mean_interval, &mut self.rng);
        self
    }

    /// Replace the weight range.
    ///
    /// If `range.0 > range.1`, the values are swapped.
    #[must_use]
    pub const fn with_weight_range(mut self, range: (f64, f64)) -> Self {
        if range.0 > range.1 {
            self.weight_range = (range.1, range.0);
        } else {
            self.weight_range = range;
        }
        self
    }
}

impl TrafficSource for PoissonSource {
    fn generate(&mut self, tick: u64) -> Vec<SpawnRequest> {
        let mut requests = Vec::new();

        while tick >= self.next_arrival_tick {
            // Use the scheduled arrival tick (not the current tick) so catch-up
            // arrivals sample from the pattern that was active when they were due.
            let arrival_tick = self.next_arrival_tick;
            if let Some((origin, destination)) =
                self.schedule
                    .sample_stop_ids(arrival_tick, &self.stops, &mut self.rng)
            {
                let weight = self
                    .rng
                    .random_range(self.weight_range.0..=self.weight_range.1);
                requests.push(SpawnRequest {
                    origin,
                    destination,
                    weight,
                });
            }
            self.next_arrival_tick =
                sample_next_arrival(self.next_arrival_tick, self.mean_interval, &mut self.rng);
        }

        requests
    }
}

impl std::fmt::Debug for PoissonSource {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("PoissonSource")
            .field("stops", &self.stops)
            .field("schedule", &self.schedule)
            .field("mean_interval", &self.mean_interval)
            .field("weight_range", &self.weight_range)
            .field("next_arrival_tick", &self.next_arrival_tick)
            .finish_non_exhaustive()
    }
}

/// Sample the next arrival tick using exponential inter-arrival time.
///
/// The uniform sample is clamped to `[0.0001, 1.0)` to avoid `ln(0) = -inf`.
/// This caps the maximum inter-arrival time at ~9.2× the mean interval,
/// truncating the exponential tail to prevent rare extreme gaps.
fn sample_next_arrival(current: u64, mean_interval: u32, rng: &mut impl RngExt) -> u64 {
    if mean_interval == 0 {
        return current + 1;
    }
    let u: f64 = rng.random_range(0.0001..1.0);
    let interval = -(f64::from(mean_interval)) * u.ln();
    current + (interval as u64).max(1)
}
