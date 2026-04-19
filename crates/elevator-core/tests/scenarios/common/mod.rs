//! Shared infrastructure for scenario integration tests.
//!
//! Loaded from each `tests/scenarios/*.rs` file via `#[path = "common/mod.rs"] mod common;`
//! (Cargo declares the sibling files as `[[test]]` binaries; this module is
//! not a test on its own.)
//!
//! What lives here:
//! - Canonical `SimConfig` builders for the three building topologies the
//!   suite exercises.
//! - Deterministic traffic-pattern generators (morning rush, evening rush,
//!   interfloor, burst) that return `Vec<TimedSpawn>` from a fixed seed.
//! - The `scenario_test!` macro that wraps the `ScenarioRunner` boilerplate
//!   and emits a pretty-printed failure message listing each tripped
//!   condition.
//! - Assertion helpers for positive and negative scenarios.

#![allow(dead_code)] // Each test binary uses a subset of these helpers.
#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use elevator_core::components::{Accel, Orientation, Speed, Weight};
use elevator_core::config::{
    BuildingConfig, ElevatorConfig, GroupConfig, LineConfig, PassengerSpawnConfig, SimConfig,
    SimulationParams,
};
use elevator_core::dispatch::BuiltinStrategy;
use elevator_core::scenario::{Condition, ConditionResult, ScenarioResult, TimedSpawn};
use elevator_core::stop::{StopConfig, StopId};

use rand::{RngExt, SeedableRng, rngs::StdRng};

// ── Building configurations ─────────────────────────────────────────

/// Canonical 10-stop, 3-car single-group building used by the
/// dispatch × traffic matrix.
///
/// Positions are 4 m apart so trapezoidal acceleration reaches max speed
/// between stops — matches the geometry used in the
/// `single_call_single_car` regression test and the headline playground
/// demo. Starting positions are spaced so `SpreadEvenly` has one tick to
/// settle before rider arrivals, without needing a warm-up loop inside
/// each scenario.
#[must_use]
pub fn canonical_building() -> SimConfig {
    let stops: Vec<StopConfig> = (0..10)
        .map(|i| StopConfig {
            id: StopId(i),
            name: format!("Floor {i}"),
            position: f64::from(i) * 4.0,
        })
        .collect();

    let elevators: Vec<ElevatorConfig> = [0u32, 4, 9]
        .into_iter()
        .enumerate()
        .map(|(idx, start)| ElevatorConfig {
            id: u32::try_from(idx).unwrap(),
            name: format!("Car {}", char::from(b'A' + u8::try_from(idx).unwrap())),
            max_speed: Speed::from(4.0),
            acceleration: Accel::from(2.0),
            deceleration: Accel::from(2.5),
            weight_capacity: Weight::from(1200.0),
            starting_stop: StopId(start),
            door_open_ticks: 60,
            door_transition_ticks: 20,
            ..ElevatorConfig::default()
        })
        .collect();

    SimConfig {
        building: BuildingConfig {
            name: "Canonical".into(),
            stops,
            lines: None,
            groups: None,
        },
        elevators,
        simulation: SimulationParams::default(),
        passenger_spawning: PassengerSpawnConfig::default(),
    }
}

/// Twin-shaft two-line, two-car building for multi-line scenarios.
///
/// Shares geometry with the `single_call_single_car::twin_shaft_sim`
/// fixture so regressions on line-pinned dispatch stay expressible
/// under the same numbers.
#[must_use]
pub fn twin_shaft_building() -> SimConfig {
    let car = |id: u32, name: &str| ElevatorConfig {
        id,
        name: name.into(),
        max_speed: Speed::from(2.0),
        acceleration: Accel::from(1.5),
        deceleration: Accel::from(2.0),
        weight_capacity: Weight::from(800.0),
        starting_stop: StopId(0),
        door_open_ticks: 30,
        door_transition_ticks: 10,
        ..ElevatorConfig::default()
    };

    let line = |id: u32, name: &str, car: ElevatorConfig| LineConfig {
        id,
        name: name.into(),
        serves: vec![StopId(0), StopId(1), StopId(2)],
        elevators: vec![car],
        orientation: Orientation::Vertical,
        position: None,
        min_position: None,
        max_position: None,
        max_cars: None,
    };

    SimConfig {
        building: BuildingConfig {
            name: "Twin Shaft".into(),
            stops: vec![
                StopConfig {
                    id: StopId(0),
                    name: "Lobby".into(),
                    position: 0.0,
                },
                StopConfig {
                    id: StopId(1),
                    name: "Mid".into(),
                    position: 10.0,
                },
                StopConfig {
                    id: StopId(2),
                    name: "Sky".into(),
                    position: 20.0,
                },
            ],
            lines: Some(vec![
                line(1, "Shaft A", car(1, "A")),
                line(2, "Shaft B", car(2, "B")),
            ]),
            groups: Some(vec![GroupConfig {
                id: 0,
                name: "All Shafts".into(),
                lines: vec![1, 2],
                dispatch: BuiltinStrategy::Scan,
                reposition: None,
                hall_call_mode: None,
                ack_latency_ticks: None,
            }]),
        },
        elevators: vec![],
        simulation: SimulationParams::default(),
        passenger_spawning: PassengerSpawnConfig::default(),
    }
}

/// Compact 3-stop, 1-car building for edge cases where a small sim makes
/// the failure mode clearer (abandonment, patience, capacity with one
/// car).
#[must_use]
pub fn compact_building() -> SimConfig {
    SimConfig {
        building: BuildingConfig {
            name: "Compact".into(),
            stops: vec![
                StopConfig {
                    id: StopId(0),
                    name: "Ground".into(),
                    position: 0.0,
                },
                StopConfig {
                    id: StopId(1),
                    name: "Mid".into(),
                    position: 5.0,
                },
                StopConfig {
                    id: StopId(2),
                    name: "Top".into(),
                    position: 10.0,
                },
            ],
            lines: None,
            groups: None,
        },
        elevators: vec![ElevatorConfig {
            id: 0,
            name: "Only".into(),
            max_speed: Speed::from(2.0),
            acceleration: Accel::from(1.5),
            deceleration: Accel::from(2.0),
            weight_capacity: Weight::from(600.0),
            starting_stop: StopId(0),
            door_open_ticks: 30,
            door_transition_ticks: 10,
            ..ElevatorConfig::default()
        }],
        simulation: SimulationParams::default(),
        passenger_spawning: PassengerSpawnConfig::default(),
    }
}

// ── Traffic generators ──────────────────────────────────────────────

/// Ground-to-upper up-peak. All riders spawn at `StopId(0)` with
/// destinations drawn uniformly from `[1, top_stop]`. Spawn ticks are
/// uniformly distributed across `[0, window_ticks)`.
///
/// Returned vector is sorted by tick for replay determinism.
#[must_use]
pub fn morning_rush(n: usize, window_ticks: u64, top_stop: u32, seed: u64) -> Vec<TimedSpawn> {
    let mut rng = StdRng::seed_from_u64(seed);
    let mut spawns: Vec<TimedSpawn> = (0..n)
        .map(|_| TimedSpawn {
            tick: rng.random_range(0..window_ticks),
            origin: StopId(0),
            destination: StopId(rng.random_range(1..=top_stop)),
            weight: rng.random_range(55.0..95.0),
        })
        .collect();
    spawns.sort_by_key(|s| s.tick);
    spawns
}

/// Upper-to-ground down-peak. Mirror of [`morning_rush`] — random upper
/// origins, every destination is the lobby.
#[must_use]
pub fn evening_rush(n: usize, window_ticks: u64, top_stop: u32, seed: u64) -> Vec<TimedSpawn> {
    let mut rng = StdRng::seed_from_u64(seed);
    let mut spawns: Vec<TimedSpawn> = (0..n)
        .map(|_| TimedSpawn {
            tick: rng.random_range(0..window_ticks),
            origin: StopId(rng.random_range(1..=top_stop)),
            destination: StopId(0),
            weight: rng.random_range(55.0..95.0),
        })
        .collect();
    spawns.sort_by_key(|s| s.tick);
    spawns
}

/// Mixed interfloor: random origin and destination drawn independently
/// from `[0, stops)`, re-rolled until distinct.
#[must_use]
pub fn interfloor(n: usize, window_ticks: u64, stops: u32, seed: u64) -> Vec<TimedSpawn> {
    assert!(stops >= 2, "interfloor needs at least 2 stops");
    let mut rng = StdRng::seed_from_u64(seed);
    let mut spawns: Vec<TimedSpawn> = (0..n)
        .map(|_| {
            let origin = rng.random_range(0..stops);
            let mut destination = rng.random_range(0..stops);
            while destination == origin {
                destination = rng.random_range(0..stops);
            }
            TimedSpawn {
                tick: rng.random_range(0..window_ticks),
                origin: StopId(origin),
                destination: StopId(destination),
                weight: rng.random_range(55.0..95.0),
            }
        })
        .collect();
    spawns.sort_by_key(|s| s.tick);
    spawns
}

/// Simultaneous burst at a single stop.
#[must_use]
pub fn burst(n: usize, tick: u64, origin: StopId, destination: StopId) -> Vec<TimedSpawn> {
    (0..n)
        .map(|_| TimedSpawn {
            tick,
            origin,
            destination,
            weight: 70.0,
        })
        .collect()
}

// ── Assertion helpers ───────────────────────────────────────────────

/// Panic with a pretty-printed breakdown of each condition when the
/// scenario's overall `passed` flag is `false`. Passing scenarios
/// return silently.
///
/// Output format mirrors what a reader wants when a test fails in CI:
/// the scenario name, how many ticks it ran, and a `PASS`/`FAIL` line
/// per condition with the observed value. Rerunning with `--nocapture`
/// is not needed to diagnose which threshold tripped.
pub fn assert_scenario_passed(result: &ScenarioResult) {
    maybe_dump(result);
    if result.passed {
        return;
    }
    panic!("{}", format_result(result));
}

/// Print the full result when `SCENARIO_DUMP=1` is set. Intended for
/// threshold tuning: run `SCENARIO_DUMP=1 cargo test --test scenarios_X
/// -- --nocapture` once, read the observed metrics, then inline the
/// tightened thresholds into the `Scenario` literal.
fn maybe_dump(result: &ScenarioResult) {
    if std::env::var_os("SCENARIO_DUMP").is_some() {
        // Using eprintln so output interleaves with test harness output.
        eprintln!("{}", format_result(result));
    }
}

/// Panic unless the scenario failed *and* at least one condition
/// matching `predicate` is in the failing set. Used by the negative
/// suite to confirm the correct condition tripped rather than a
/// vacuous fail from some unrelated check.
pub fn assert_scenario_failed_on(result: &ScenarioResult, predicate: impl Fn(&Condition) -> bool) {
    maybe_dump(result);
    assert!(
        !result.passed,
        "expected negative scenario `{}` to fail but it passed\n{}",
        result.name,
        format_result(result)
    );
    let matched = result
        .conditions
        .iter()
        .any(|cr: &ConditionResult| !cr.passed && predicate(&cr.condition));
    assert!(
        matched,
        "negative scenario `{}` failed, but none of the matching conditions tripped\n{}",
        result.name,
        format_result(result)
    );
}

fn format_result(result: &ScenarioResult) -> String {
    use std::fmt::Write as _;
    let mut msg = format!(
        "scenario `{}` ran for {} ticks (passed = {})\n",
        result.name, result.ticks_run, result.passed
    );
    for cr in &result.conditions {
        let mark = if cr.passed { "PASS" } else { "FAIL" };
        let _ = writeln!(
            msg,
            "  [{mark}] {:?} (actual = {:.3})",
            cr.condition, cr.actual_value
        );
    }
    let _ = writeln!(
        msg,
        "  metrics: delivered={} abandoned={} spawned={} avg_wait={:.2} max_wait={} throughput={}",
        result.metrics.total_delivered(),
        result.metrics.total_abandoned(),
        result.metrics.total_spawned(),
        result.metrics.avg_wait_time(),
        result.metrics.max_wait_time(),
        result.metrics.throughput(),
    );
    msg
}

// ── Macro ───────────────────────────────────────────────────────────

/// Emit a `#[test]` function that runs a scenario end-to-end and asserts
/// it passes, pretty-printing all conditions on failure.
///
/// # Example
///
/// ```ignore
/// scenario_test!(
///     etd_under_morning_rush,
///     Scenario {
///         name: "ETD morning rush".into(),
///         config: canonical_building(),
///         spawns: morning_rush(30, 600, 9, 101),
///         conditions: vec![Condition::AllDeliveredByTick(3600)],
///         max_ticks: 4000,
///     },
///     EtdDispatch::new(),
/// );
/// ```
///
/// The macro expands to a single `#[test] fn` that builds the runner,
/// runs to completion, and asserts `result.passed`. Use the companion
/// [`scenario_test_negative!`] for tests that *should* fail.
#[macro_export]
macro_rules! scenario_test {
    ($name:ident, $scenario:expr, $dispatch:expr $(,)?) => {
        #[test]
        fn $name() {
            let scenario: ::elevator_core::scenario::Scenario = $scenario;
            let mut runner =
                ::elevator_core::scenario::ScenarioRunner::new(scenario, $dispatch).unwrap();
            let result = runner.run_to_completion();
            $crate::common::assert_scenario_passed(&result);
        }
    };
}

/// Emit a `#[test]` function that runs a negative scenario and asserts
/// it fails, with at least one tripped condition matching `predicate`.
#[macro_export]
macro_rules! scenario_test_negative {
    ($name:ident, $scenario:expr, $dispatch:expr, $predicate:expr $(,)?) => {
        #[test]
        fn $name() {
            let scenario: ::elevator_core::scenario::Scenario = $scenario;
            let mut runner =
                ::elevator_core::scenario::ScenarioRunner::new(scenario, $dispatch).unwrap();
            let result = runner.run_to_completion();
            $crate::common::assert_scenario_failed_on(&result, $predicate);
        }
    };
}
