//! Scenario replay: timed rider spawns with pass/fail conditions.

use crate::config::SimConfig;
use crate::dispatch::DispatchStrategy;
use crate::error::SimError;
use crate::metrics::Metrics;
use crate::sim::Simulation;
use crate::stop::StopId;
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
    /// All riders must be delivered by this tick.
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
}

impl ScenarioRunner {
    /// Create a new runner from a scenario definition and dispatch strategy.
    ///
    /// Returns `Err` if the scenario's config is invalid.
    pub fn new(
        scenario: Scenario,
        dispatch: Box<dyn DispatchStrategy>,
    ) -> Result<Self, SimError> {
        let sim = Simulation::new(&scenario.config, dispatch)?;
        Ok(Self {
            sim,
            spawns: scenario.spawns,
            spawn_cursor: 0,
            conditions: scenario.conditions,
            max_ticks: scenario.max_ticks,
            name: scenario.name,
        })
    }

    /// Access the underlying simulation.
    #[must_use] 
    pub const fn sim(&self) -> &Simulation {
        &self.sim
    }

    /// Run one tick: spawn scheduled riders, then tick simulation.
    pub fn tick(&mut self) {
        // Spawn any riders scheduled for this tick.
        while self.spawn_cursor < self.spawns.len()
            && self.spawns[self.spawn_cursor].tick <= self.sim.current_tick()
        {
            let spawn = &self.spawns[self.spawn_cursor];
            // Ignore errors from invalid stop IDs in scenario spawns.
            let _ = self.sim
                .spawn_rider_by_stop_id(spawn.origin, spawn.destination, spawn.weight);
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
                let all_done = self
                    .sim
                    .world()
                    .iter_riders()
                    .all(|(_, r)| matches!(r.phase, RiderPhase::Arrived | RiderPhase::Abandoned));
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
fn evaluate_condition(condition: &Condition, metrics: &Metrics, current_tick: u64) -> ConditionResult {
    match condition {
        Condition::AvgWaitBelow(threshold) => ConditionResult {
            condition: condition.clone(),
            passed: metrics.avg_wait_time < *threshold,
            actual_value: metrics.avg_wait_time,
        },
        Condition::MaxWaitBelow(threshold) => ConditionResult {
            condition: condition.clone(),
            passed: metrics.max_wait_time < *threshold,
            actual_value: metrics.max_wait_time as f64,
        },
        Condition::ThroughputAbove(threshold) => ConditionResult {
            condition: condition.clone(),
            passed: metrics.throughput > *threshold,
            actual_value: metrics.throughput as f64,
        },
        Condition::AllDeliveredByTick(deadline) => ConditionResult {
            condition: condition.clone(),
            passed: current_tick <= *deadline && metrics.total_delivered == metrics.total_spawned,
            actual_value: current_tick as f64,
        },
        Condition::AbandonmentRateBelow(threshold) => ConditionResult {
            condition: condition.clone(),
            passed: metrics.abandonment_rate < *threshold,
            actual_value: metrics.abandonment_rate,
        },
    }
}
