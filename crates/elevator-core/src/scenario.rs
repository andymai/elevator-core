//! Scenario replay: timed rider spawns with pass/fail conditions.

use crate::config::SimConfig;
use crate::dispatch::DispatchStrategy;
use crate::error::SimError;
use crate::metrics::Metrics;
use crate::sim::Simulation;
use crate::stop::StopId;
use crate::traffic::TrafficPattern;
use rand::RngExt;
use serde::{Deserialize, Serialize};

/// A timed rider spawn event within a scenario.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimedSpawn {
    /// Tick at which to spawn this rider.
    pub tick: u64,
    /// Origin stop for the rider.
    pub origin: StopId,
    /// Destination stop for the rider.
    pub destination: StopId,
    /// Weight of the rider.
    pub weight: f64,
}

/// A pass/fail condition for scenario evaluation.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[non_exhaustive]
pub enum Condition {
    /// Average wait time must be below this value (ticks).
    AvgWaitBelow(f64),
    /// Maximum wait time must be below this value (ticks).
    MaxWaitBelow(u64),
    /// Throughput must be above this value (riders per window).
    ThroughputAbove(u64),
    /// All spawned riders must reach a terminal state (delivered or abandoned)
    /// by this tick. Riders that failed to spawn (see
    /// [`ScenarioRunner::skipped_spawns`]) are not counted — check that
    /// value separately when replay fidelity matters.
    AllDeliveredByTick(u64),
    /// Abandonment rate must be below this value (0.0 - 1.0).
    AbandonmentRateBelow(f64),
}

/// A complete scenario: config + timed spawns + success conditions.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Scenario {
    /// Human-readable scenario name.
    pub name: String,
    /// Simulation configuration.
    pub config: SimConfig,
    /// Timed rider spawn events.
    pub spawns: Vec<TimedSpawn>,
    /// Pass/fail conditions for evaluation.
    pub conditions: Vec<Condition>,
    /// Max ticks to run before declaring timeout.
    pub max_ticks: u64,
}

/// Result of evaluating a single condition.
#[derive(Debug, Clone)]
pub struct ConditionResult {
    /// The condition that was evaluated.
    pub condition: Condition,
    /// Whether the condition passed.
    pub passed: bool,
    /// The actual observed value.
    pub actual_value: f64,
}

/// Result of running a complete scenario.
#[derive(Debug, Clone)]
pub struct ScenarioResult {
    /// Scenario name.
    pub name: String,
    /// Whether all conditions passed.
    pub passed: bool,
    /// Number of ticks run.
    pub ticks_run: u64,
    /// Per-condition results.
    pub conditions: Vec<ConditionResult>,
    /// Final simulation metrics.
    pub metrics: Metrics,
}

/// Runs a scenario to completion and evaluates conditions.
pub struct ScenarioRunner {
    /// The underlying simulation.
    sim: Simulation,
    /// Timed spawn events.
    spawns: Vec<TimedSpawn>,
    /// Index of the next spawn to process.
    spawn_cursor: usize,
    /// Pass/fail conditions.
    conditions: Vec<Condition>,
    /// Maximum ticks before timeout.
    max_ticks: u64,
    /// Scenario name.
    name: String,
    /// Number of spawn attempts that failed (e.g. disabled/removed stops).
    skipped_spawns: u64,
}

impl ScenarioRunner {
    /// Create a new runner from a scenario definition and dispatch strategy.
    ///
    /// Returns `Err` if the scenario's config is invalid.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::InvalidConfig`] if the scenario's simulation config is invalid.
    pub fn new(
        scenario: Scenario,
        dispatch: impl DispatchStrategy + 'static,
    ) -> Result<Self, SimError> {
        let sim = Simulation::new(&scenario.config, dispatch)?;
        // Sort spawns by tick so the cursor advance in `tick()` cannot
        // gate an earlier spawn behind a later one. `sort_by_key` is
        // stable, so spawns with the same tick keep their declaration
        // order — important for replay determinism (#271).
        let mut spawns = scenario.spawns;
        spawns.sort_by_key(|s| s.tick);
        Ok(Self {
            sim,
            spawns,
            spawn_cursor: 0,
            conditions: scenario.conditions,
            max_ticks: scenario.max_ticks,
            name: scenario.name,
            skipped_spawns: 0,
        })
    }

    /// Access the underlying simulation.
    #[must_use]
    pub const fn sim(&self) -> &Simulation {
        &self.sim
    }

    /// Mutable access to the underlying simulation.
    ///
    /// Lets scenario drivers toggle service modes, set manual velocities, or
    /// tweak per-elevator state between ticks — for example, switching a car
    /// to [`ServiceMode::Inspection`](crate::components::ServiceMode::Inspection)
    /// mid-run before continuing to call [`tick`](Self::tick).
    pub const fn sim_mut(&mut self) -> &mut Simulation {
        &mut self.sim
    }

    /// Number of rider spawn attempts that were skipped due to errors
    /// (e.g. referencing disabled or removed stops).
    #[must_use]
    pub const fn skipped_spawns(&self) -> u64 {
        self.skipped_spawns
    }

    /// Run one tick: spawn scheduled riders, then tick simulation.
    pub fn tick(&mut self) {
        // Spawn any riders scheduled for this tick.
        while self.spawn_cursor < self.spawns.len()
            && self.spawns[self.spawn_cursor].tick <= self.sim.current_tick()
        {
            let spawn = &self.spawns[self.spawn_cursor];
            // Spawn errors are expected: scenario files may reference stops
            // that were removed or disabled during the run. We skip the
            // spawn but track the count so callers can detect divergence.
            if self
                .sim
                .spawn_rider(spawn.origin, spawn.destination, spawn.weight)
                .is_err()
            {
                self.skipped_spawns += 1;
            }
            self.spawn_cursor += 1;
        }

        self.sim.step();
    }

    /// Run to completion (all riders delivered or `max_ticks` reached).
    pub fn run_to_completion(&mut self) -> ScenarioResult {
        use crate::components::RiderPhase;

        for _ in 0..self.max_ticks {
            self.tick();

            // Check if all spawns have happened and all riders are done.
            if self.spawn_cursor >= self.spawns.len() {
                let all_done =
                    self.sim.world().iter_riders().all(|(_, r)| {
                        matches!(r.phase, RiderPhase::Arrived | RiderPhase::Abandoned)
                    });
                if all_done {
                    break;
                }
            }
        }

        self.evaluate()
    }

    /// Evaluate conditions against current metrics.
    #[must_use]
    pub fn evaluate(&self) -> ScenarioResult {
        let metrics = self.sim.metrics().clone();
        let condition_results: Vec<ConditionResult> = self
            .conditions
            .iter()
            .map(|cond| evaluate_condition(cond, &metrics, self.sim.current_tick()))
            .collect();

        let passed = condition_results.iter().all(|r| r.passed);

        ScenarioResult {
            name: self.name.clone(),
            passed,
            ticks_run: self.sim.current_tick(),
            conditions: condition_results,
            metrics,
        }
    }
}

/// Evaluate a single condition against metrics and the current tick.
fn evaluate_condition(
    condition: &Condition,
    metrics: &Metrics,
    current_tick: u64,
) -> ConditionResult {
    match condition {
        Condition::AvgWaitBelow(threshold) => ConditionResult {
            condition: condition.clone(),
            passed: metrics.avg_wait_time() < *threshold,
            actual_value: metrics.avg_wait_time(),
        },
        Condition::MaxWaitBelow(threshold) => ConditionResult {
            condition: condition.clone(),
            passed: metrics.max_wait_time() < *threshold,
            actual_value: metrics.max_wait_time() as f64,
        },
        Condition::ThroughputAbove(threshold) => ConditionResult {
            condition: condition.clone(),
            passed: metrics.throughput() > *threshold,
            actual_value: metrics.throughput() as f64,
        },
        Condition::AllDeliveredByTick(deadline) => ConditionResult {
            condition: condition.clone(),
            passed: current_tick <= *deadline
                && metrics.total_delivered() + metrics.total_abandoned() == metrics.total_spawned(),
            actual_value: current_tick as f64,
        },
        Condition::AbandonmentRateBelow(threshold) => ConditionResult {
            condition: condition.clone(),
            passed: metrics.abandonment_rate() < *threshold,
            actual_value: metrics.abandonment_rate(),
        },
    }
}

// ── SpawnSchedule builder ───────────────────────────────────────────

/// Fluent builder for [`TimedSpawn`] sequences that feed [`Scenario::spawns`].
///
/// Unifies two common authoring shapes in one place:
/// - Deterministic bursts (fixed origin/destination, fixed tick or regular
///   cadence), where exact tick counts matter — e.g. "20 riders leave the
///   lobby at tick 0", "1 rider every 600 ticks for 10 minutes".
/// - Poisson draws from a [`TrafficPattern`], where the origin/destination
///   pair is stochastic but the arrival process is exponential.
///
/// The final [`Vec<TimedSpawn>`] is extracted via [`into_spawns`](Self::into_spawns)
/// and handed to [`Scenario::spawns`]. Scenarios with mixed shapes chain
/// builders via [`merge`](Self::merge):
///
/// ```
/// use elevator_core::scenario::SpawnSchedule;
/// use elevator_core::stop::StopId;
///
/// let schedule = SpawnSchedule::new()
///     .burst(StopId(0), StopId(5), 10, 0, 70.0)
///     .staggered(StopId(0), StopId(3), 5, 1_000, 300, 70.0);
/// assert_eq!(schedule.len(), 15);
/// ```
#[derive(Debug, Clone, Default)]
pub struct SpawnSchedule {
    /// Accumulated spawns. Order is authoring order;
    /// [`ScenarioRunner::new`] sorts by tick on construction.
    spawns: Vec<TimedSpawn>,
}

impl SpawnSchedule {
    /// Create an empty schedule.
    #[must_use]
    pub const fn new() -> Self {
        Self { spawns: Vec::new() }
    }

    /// Append `count` identical spawns, all firing on `at_tick`. Use this
    /// for the classic "crowd appears simultaneously" shape (morning
    /// stand-up, event dismissal).
    #[must_use]
    pub fn burst(
        mut self,
        origin: StopId,
        destination: StopId,
        count: usize,
        at_tick: u64,
        weight: f64,
    ) -> Self {
        self.spawns.reserve(count);
        for _ in 0..count {
            self.spawns.push(TimedSpawn {
                tick: at_tick,
                origin,
                destination,
                weight,
            });
        }
        self
    }

    /// Append `count` spawns starting at `start_tick`, each `stagger_ticks`
    /// apart. A `stagger_ticks = 0` degenerates to [`burst`](Self::burst).
    /// Use this for deterministic arrival cadences — e.g. "one rider every
    /// 10 seconds" — where Poisson variance would obscure the test signal.
    #[must_use]
    pub fn staggered(
        mut self,
        origin: StopId,
        destination: StopId,
        count: usize,
        start_tick: u64,
        stagger_ticks: u64,
        weight: f64,
    ) -> Self {
        self.spawns.reserve(count);
        for i in 0..count as u64 {
            self.spawns.push(TimedSpawn {
                tick: start_tick + i * stagger_ticks,
                origin,
                destination,
                weight,
            });
        }
        self
    }

    /// Append Poisson-distributed spawns from a [`TrafficPattern`] over
    /// `duration_ticks`, with exponential inter-arrival times of mean
    /// `mean_interval_ticks`. `weight_range` is a uniform draw per spawn.
    /// The supplied `rng` advances but is not taken — callers can continue
    /// using it for other deterministic draws.
    ///
    /// `stops` must be sorted by position (lobby first) to match
    /// [`TrafficPattern`]'s lobby-origin peak-pattern assumption. See
    /// [`TrafficPattern::sample_stop_ids`].
    ///
    /// Returns the schedule with generated spawns appended. If `stops`
    /// has fewer than 2 entries, no spawns are generated (pattern
    /// sampling requires at least two stops).
    #[must_use]
    pub fn from_pattern(
        mut self,
        pattern: TrafficPattern,
        stops: &[StopId],
        duration_ticks: u64,
        mean_interval_ticks: u32,
        weight_range: (f64, f64),
        rng: &mut impl RngExt,
    ) -> Self {
        if stops.len() < 2 || mean_interval_ticks == 0 {
            return self;
        }
        let (wlo, whi) = if weight_range.0 > weight_range.1 {
            (weight_range.1, weight_range.0)
        } else {
            weight_range
        };
        let mut tick = 0u64;
        loop {
            // Exponential inter-arrival time, clamped to avoid ln(0).
            let u: f64 = rng.random_range(0.0001..1.0);
            let interval = -(f64::from(mean_interval_ticks)) * u.ln();
            #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
            let step = (interval as u64).max(1);
            tick = tick.saturating_add(step);
            if tick >= duration_ticks {
                break;
            }
            if let Some((origin, destination)) = pattern.sample_stop_ids(stops, rng) {
                let weight = rng.random_range(wlo..=whi);
                self.spawns.push(TimedSpawn {
                    tick,
                    origin,
                    destination,
                    weight,
                });
            }
        }
        self
    }

    /// Append a single spawn. Useful for one-off riders mixed into a
    /// larger pattern (e.g. a "stranded top-floor" rider sitting atop
    /// a [`from_pattern`](Self::from_pattern) stream).
    #[must_use]
    pub fn push(mut self, spawn: TimedSpawn) -> Self {
        self.spawns.push(spawn);
        self
    }

    /// Absorb another schedule's spawns. Chainable drop-in for
    /// composing heterogeneous arrival shapes — e.g. up-peak burst
    /// plus a uniform inter-floor background:
    ///
    /// ```
    /// # use elevator_core::scenario::SpawnSchedule;
    /// # use elevator_core::stop::StopId;
    /// # use elevator_core::traffic::TrafficPattern;
    /// # use rand::SeedableRng;
    /// let mut rng = rand::rngs::StdRng::seed_from_u64(7);
    /// let stops = vec![StopId(0), StopId(1), StopId(2)];
    /// let background = SpawnSchedule::new().from_pattern(
    ///     TrafficPattern::Uniform, &stops, 10_000, 300, (70.0, 80.0), &mut rng,
    /// );
    /// let up_peak = SpawnSchedule::new().burst(StopId(0), StopId(2), 20, 0, 70.0);
    /// let combined = up_peak.merge(background);
    /// assert!(combined.len() >= 20);
    /// ```
    #[must_use]
    pub fn merge(mut self, other: Self) -> Self {
        self.spawns.extend(other.spawns);
        self
    }

    /// Number of spawns currently in the schedule.
    #[must_use]
    pub const fn len(&self) -> usize {
        self.spawns.len()
    }

    /// Whether the schedule has no spawns.
    #[must_use]
    pub const fn is_empty(&self) -> bool {
        self.spawns.is_empty()
    }

    /// Borrow the underlying spawns (useful for inspection in tests).
    #[must_use]
    pub fn spawns(&self) -> &[TimedSpawn] {
        &self.spawns
    }

    /// Consume the builder and return the spawns, ready to drop into
    /// [`Scenario::spawns`]. [`ScenarioRunner::new`] sorts them by tick
    /// on construction, so builders don't need to maintain a sorted
    /// invariant.
    #[must_use]
    pub fn into_spawns(self) -> Vec<TimedSpawn> {
        self.spawns
    }
}
