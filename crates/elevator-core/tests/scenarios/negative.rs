//! Negative scenarios: deliberately infeasible configs whose
//! expected outcome is `result.passed == false`. These guard the
//! condition evaluator itself — a bug that made every scenario
//! vacuously pass would trip these first.

#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use elevator_core::dispatch::EtdDispatch;
use elevator_core::scenario::{Condition, Scenario, TimedSpawn};
use elevator_core::stop::StopId;

#[path = "common/mod.rs"]
mod common;

use common::{canonical_building, compact_building, morning_rush};

// ── Impossibly tight deadline ───────────────────────────────────
// 30 riders in a 600-tick window, `AllDeliveredByTick(100)` — even
// the fastest strategy cannot hit it. The evaluator must trip the
// `AllDeliveredByTick` condition.

scenario_test_negative!(
    tight_deadline_trips_all_delivered_by_tick,
    Scenario {
        name: "Tight deadline".into(),
        config: canonical_building(),
        spawns: morning_rush(30, 600, 9, 101),
        conditions: vec![Condition::AllDeliveredByTick(100)],
        max_ticks: 10_000,
    },
    EtdDispatch::new(),
    |c| matches!(c, Condition::AllDeliveredByTick(_)),
);

// ── Impossible wait bound ───────────────────────────────────────
// A non-zero rider load cannot produce `avg_wait = 0`. Must trip
// `AvgWaitBelow`.

scenario_test_negative!(
    zero_wait_bound_is_unreachable,
    Scenario {
        name: "Zero wait bound".into(),
        config: canonical_building(),
        spawns: morning_rush(20, 300, 9, 202),
        conditions: vec![Condition::AvgWaitBelow(0.0)],
        max_ticks: 10_000,
    },
    EtdDispatch::new(),
    |c| matches!(c, Condition::AvgWaitBelow(_)),
);

// ── Throughput impossible ───────────────────────────────────────
// Zero spawns → zero throughput; any positive `ThroughputAbove`
// trips. Guards against an evaluator treating the idle case as
// passing trivially.

scenario_test_negative!(
    idle_sim_fails_throughput_above_zero,
    Scenario {
        name: "Idle throughput".into(),
        config: compact_building(),
        spawns: Vec::new(),
        conditions: vec![Condition::ThroughputAbove(1)],
        max_ticks: 500,
    },
    EtdDispatch::new(),
    |c| matches!(c, Condition::ThroughputAbove(_)),
);

// ── Max-ticks timeout ──────────────────────────────────────────
// 40 riders in a compact 1-car building with too-short `max_ticks`:
// the runner bails out before all riders are delivered, so
// `AllDeliveredByTick` fails because the terminal-state check
// inside `evaluate_condition` sees `delivered + abandoned <
// spawned`.

scenario_test_negative!(
    max_ticks_timeout_before_all_delivered,
    Scenario {
        name: "Premature timeout".into(),
        config: compact_building(),
        spawns: (0..40)
            .map(|i| TimedSpawn {
                tick: i,
                origin: StopId(0),
                destination: StopId(2),
                weight: 70.0,
            })
            .collect(),
        conditions: vec![Condition::AllDeliveredByTick(u64::MAX)],
        max_ticks: 200,
    },
    EtdDispatch::new(),
    |c| matches!(c, Condition::AllDeliveredByTick(_)),
);
