//! Adaptive-reposition coverage against the canonical traffic patterns.
//!
//! Unlike `dispatch_matrix`, these tests configure both a dispatcher
//! and an `AdaptiveParking` repositioner on the same scenario, so the
//! `TrafficDetector`-gated reposition branch is actually exercised
//! end-to-end. Without this suite the detector could silently degrade
//! to `InterFloor` in every scenario and the existing tests would stay
//! green — a regression surface we explicitly want to guard.
//!
//! Thresholds are fresh as of this suite's introduction; rebaseline with
//! `SCENARIO_DUMP=1 cargo test --test scenarios_adaptive_reposition -- \
//! --nocapture --test-threads=1` when the `AdaptiveParking` strategy
//! evolves.

#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use elevator_core::dispatch::reposition::AdaptiveParking;
use elevator_core::dispatch::{BuiltinReposition, RsrDispatch};
use elevator_core::ids::GroupId;
use elevator_core::scenario::{Scenario, ScenarioRunner};
use elevator_core::traffic_detector::{TrafficDetector, TrafficMode};

#[path = "common/mod.rs"]
mod common;

use common::{canonical_building, evening_rush, morning_rush};

const RIDERS: usize = 30;
const WINDOW: u64 = 600;
const TOP_STOP: u32 = 9;
const MAX_TICKS: u64 = 10_000;

/// Build a runner with `RsrDispatch` and `AdaptiveParking` attached to
/// the default group.
fn runner_with_adaptive(scenario: Scenario) -> ScenarioRunner {
    let mut runner = ScenarioRunner::new(scenario, RsrDispatch::new()).unwrap();
    runner.sim_mut().set_reposition(
        GroupId(0),
        Box::new(AdaptiveParking::new()),
        BuiltinReposition::Adaptive,
    );
    runner
}

/// Record of every mode classification observed during a run.
///
/// `current_mode()` at end-of-run is unreliable as a signal: arrivals
/// spawned in the first 600 ticks may have aged out of the rolling
/// window by tick 5000, dropping the classifier back to `Idle`. We
/// instead record *every* mode the detector enters so tests can assert
/// "`UpPeak` was observed at some point" rather than "`UpPeak` is the
/// terminal mode".
#[derive(Default)]
struct ModeTrace {
    up_peak_seen: bool,
    down_peak_seen: bool,
    inter_floor_seen: bool,
}

fn run_until_done(runner: &mut ScenarioRunner) -> (elevator_core::metrics::Metrics, ModeTrace) {
    let mut trace = ModeTrace::default();
    for _ in 0..MAX_TICKS {
        runner.tick();
        match current_mode(runner) {
            TrafficMode::UpPeak => trace.up_peak_seen = true,
            TrafficMode::DownPeak => trace.down_peak_seen = true,
            TrafficMode::InterFloor => trace.inter_floor_seen = true,
            _ => {}
        }
        let metrics = runner.sim().metrics();
        let spawned = metrics.total_spawned();
        if spawned > 0 && metrics.total_delivered() + metrics.total_abandoned() >= spawned {
            break;
        }
    }
    (runner.sim().metrics().clone(), trace)
}

/// Peek the detector's mode. `AdaptiveParking` reads this each
/// reposition pass; if the value stays `Idle` forever the test is
/// pointless.
fn current_mode(runner: &ScenarioRunner) -> TrafficMode {
    runner
        .sim()
        .world()
        .resource::<TrafficDetector>()
        .map_or(TrafficMode::Idle, TrafficDetector::current_mode)
}

// ── Morning rush: detector should reach UpPeak ──────────────────────

/// 30 riders over a 600-tick morning burst drives the lobby-origin
/// fraction past 60%, flipping the detector to `UpPeak`. Adaptive
/// reposition then parks idle cars at the lobby rather than spreading.
#[test]
fn adaptive_observes_up_peak_under_morning_rush() {
    let scenario = Scenario {
        name: "Adaptive morning rush".into(),
        config: canonical_building(),
        spawns: morning_rush(RIDERS, WINDOW, TOP_STOP, 101),
        conditions: vec![],
        max_ticks: MAX_TICKS,
    };
    let mut runner = runner_with_adaptive(scenario);
    let (metrics, trace) = run_until_done(&mut runner);

    assert!(
        trace.up_peak_seen,
        "morning rush must trip UpPeak at some point during the run"
    );
    assert!(
        metrics.total_delivered() >= (RIDERS as u64 * 9) / 10,
        "morning rush must deliver ≥ 90% of riders, got {}",
        metrics.total_delivered()
    );
}

// ── Evening rush: detector should reach DownPeak ────────────────────

/// 30 riders over a 600-tick evening burst all heading to the lobby.
/// `DestinationLog` carries the lobby-destination fraction past the
/// threshold, tripping `DownPeak` — a mode that was unreachable before
/// the `DestinationLog` wiring. Pins the end-to-end signal path.
#[test]
fn adaptive_observes_down_peak_under_evening_rush() {
    let scenario = Scenario {
        name: "Adaptive evening rush".into(),
        config: canonical_building(),
        spawns: evening_rush(RIDERS, WINDOW, TOP_STOP, 202),
        conditions: vec![],
        max_ticks: MAX_TICKS,
    };
    let mut runner = runner_with_adaptive(scenario);
    let (metrics, trace) = run_until_done(&mut runner);

    assert!(
        trace.down_peak_seen,
        "evening rush must trip DownPeak at some point — regression guard \
         for #371's DestinationLog install fix"
    );
    assert!(
        metrics.total_delivered() >= (RIDERS as u64 * 9) / 10,
        "evening rush must deliver ≥ 90% of riders, got {}",
        metrics.total_delivered()
    );
}

/// Regression guard: the `ScenarioRunner`'s default path installs both
/// `ArrivalLog` and `DestinationLog` (since #371). If a future change
/// breaks that, this test catches it at the scenario level — not just
/// in the unit test.
#[test]
fn scenario_runner_installs_both_logs() {
    use elevator_core::arrival_log::{ArrivalLog, DestinationLog};

    let scenario = Scenario {
        name: "log-install regression".into(),
        config: canonical_building(),
        spawns: vec![],
        conditions: vec![],
        max_ticks: 10,
    };
    let runner = runner_with_adaptive(scenario);
    let world = runner.sim().world();
    assert!(
        world.resource::<ArrivalLog>().is_some(),
        "ScenarioRunner must install ArrivalLog"
    );
    assert!(
        world.resource::<DestinationLog>().is_some(),
        "ScenarioRunner must install DestinationLog"
    );
}
