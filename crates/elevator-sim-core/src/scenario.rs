use crate::config::SimConfig;
use crate::dispatch::DispatchStrategy;
use crate::metrics::Metrics;
use crate::sim::Simulation;
use crate::stop::StopId;
use serde::{Deserialize, Serialize};

/// A timed rider spawn event within a scenario.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimedSpawn {
    pub tick: u64,
    pub origin: StopId,
    pub destination: StopId,
    pub weight: f64,
}

/// A pass/fail condition for scenario evaluation.
#[derive(Debug, Clone, Serialize, Deserialize)]
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
    pub name: String,
    pub config: SimConfig,
    pub spawns: Vec<TimedSpawn>,
    pub conditions: Vec<Condition>,
    /// Max ticks to run before declaring timeout.
    pub max_ticks: u64,
}

/// Result of evaluating a single condition.
#[derive(Debug, Clone)]
pub struct ConditionResult {
    pub condition: Condition,
    pub passed: bool,
    pub actual_value: f64,
}

/// Result of running a complete scenario.
#[derive(Debug, Clone)]
pub struct ScenarioResult {
    pub name: String,
    pub passed: bool,
    pub ticks_run: u64,
    pub conditions: Vec<ConditionResult>,
    pub metrics: Metrics,
}

/// Runs a scenario to completion and evaluates conditions.
pub struct ScenarioRunner {
    sim: Simulation,
    spawns: Vec<TimedSpawn>,
    spawn_cursor: usize,
    conditions: Vec<Condition>,
    max_ticks: u64,
    name: String,
}

impl ScenarioRunner {
    pub fn new(scenario: Scenario, dispatch: Box<dyn DispatchStrategy>) -> Self {
        let sim = Simulation::new(scenario.config, dispatch);
        ScenarioRunner {
            sim,
            spawns: scenario.spawns,
            spawn_cursor: 0,
            conditions: scenario.conditions,
            max_ticks: scenario.max_ticks,
            name: scenario.name,
        }
    }

    /// Access the underlying simulation.
    pub fn sim(&self) -> &Simulation {
        &self.sim
    }

    /// Run one tick: spawn scheduled riders, then tick simulation.
    pub fn tick(&mut self) {
        // Spawn any riders scheduled for this tick.
        while self.spawn_cursor < self.spawns.len()
            && self.spawns[self.spawn_cursor].tick <= self.sim.tick
        {
            let spawn = &self.spawns[self.spawn_cursor];
            self.sim
                .spawn_rider_by_stop_id(spawn.origin, spawn.destination, spawn.weight);
            self.spawn_cursor += 1;
        }

        self.sim.tick();
    }

    /// Run to completion (all riders delivered or max_ticks reached).
    pub fn run_to_completion(&mut self) -> ScenarioResult {
        use crate::components::RiderState;

        for _ in 0..self.max_ticks {
            self.tick();

            // Check if all spawns have happened and all riders are done.
            if self.spawn_cursor >= self.spawns.len() {
                let all_done = self
                    .sim
                    .world
                    .riders()
                    .all(|(_, r)| matches!(r.state, RiderState::Arrived | RiderState::Abandoned));
                if all_done {
                    break;
                }
            }
        }

        self.evaluate()
    }

    /// Evaluate conditions against current metrics.
    pub fn evaluate(&self) -> ScenarioResult {
        let metrics = self.sim.metrics().clone();
        let condition_results: Vec<ConditionResult> = self
            .conditions
            .iter()
            .map(|cond| evaluate_condition(cond, &metrics, self.sim.tick))
            .collect();

        let passed = condition_results.iter().all(|r| r.passed);

        ScenarioResult {
            name: self.name.clone(),
            passed,
            ticks_run: self.sim.tick,
            conditions: condition_results,
            metrics,
        }
    }
}

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
