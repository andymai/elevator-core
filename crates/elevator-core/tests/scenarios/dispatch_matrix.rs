//! Dispatch × traffic coverage: every built-in dispatch strategy under
//! every canonical traffic pattern.
//!
//! Thresholds sit ~20% above the observed run-once baseline. When a
//! dispatch tweak shifts metrics, rebaseline with:
//!
//!     SCENARIO_DUMP=1 cargo test --test scenarios_dispatch_matrix -- \
//!       --nocapture --test-threads=1
//!
//! and update the thresholds inline below.
//!
//! Baseline (captured during suite authoring):
//!
//!   morning rush — all four strategies converge on 2714 ticks,
//!     `avg_wait` 227, `max_wait` 423 (up-peak collapses dispatcher
//!     differences into a single round-trip).
//!   evening rush — ETD 4072 / avg 1082, NEAREST 3583 / avg 1045,
//!     LOOK+SCAN 7956 / avg 2894 (down-peak exposes the LOOK/SCAN
//!     sweep-direction pathology).
//!   interfloor  — ETD+NEAREST 4307 / avg 741, LOOK+SCAN 4592 / avg 878.
//!   burst       — all four converge on 750 ticks, avg 176 (single
//!     call, one-shot absorption).

#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use elevator_core::dispatch::{EtdDispatch, LookDispatch, NearestCarDispatch, ScanDispatch};
use elevator_core::scenario::{Condition, Scenario};
use elevator_core::stop::StopId;

#[path = "common/mod.rs"]
mod common;

use common::{burst, canonical_building, evening_rush, interfloor, morning_rush};

const MORNING_RIDERS: usize = 30;
const MORNING_WINDOW: u64 = 600;
const MORNING_SEED: u64 = 101;

const EVENING_RIDERS: usize = 30;
const EVENING_WINDOW: u64 = 600;
const EVENING_SEED: u64 = 202;

const INTERFLOOR_RIDERS: usize = 30;
const INTERFLOOR_WINDOW: u64 = 1200;
const INTERFLOOR_SEED: u64 = 303;

const BURST_RIDERS: usize = 15;
const BURST_TICK: u64 = 60;

const TOP_STOP: u32 = 9;
const MAX_TICKS: u64 = 10_000;

// ── Morning rush ────────────────────────────────────────────────────
// All four strategies converge on the same numbers: deliver in 2714 t,
// avg_wait 227. Identical conditions.

fn morning_conditions() -> Vec<Condition> {
    vec![
        Condition::AllDeliveredByTick(3257),
        // Bumped from 273 → 390 when the dispatch commitment-set fix
        // (commits in-flight cars so Hungarian stops yanking them off
        // mid-trip) landed. Average wait rose ~19% in exchange for
        // eliminating the double-dispatch + reassignment-ping-pong
        // that the playground was reporting as empty lobby touch-
        // and-gos and "the other two cars wandering" behaviour.
        // 390 leaves ~20% headroom over the new 324-tick observed
        // baseline, matching the top-comment convention.
        Condition::AvgWaitBelow(390.0),
        Condition::AbandonmentRateBelow(0.05),
    ]
}

scenario_test!(
    etd_under_morning_rush,
    Scenario {
        name: "ETD morning rush".into(),
        config: canonical_building(),
        spawns: morning_rush(MORNING_RIDERS, MORNING_WINDOW, TOP_STOP, MORNING_SEED),
        conditions: morning_conditions(),
        max_ticks: MAX_TICKS,
    },
    EtdDispatch::new(),
);

scenario_test!(
    look_under_morning_rush,
    Scenario {
        name: "LOOK morning rush".into(),
        config: canonical_building(),
        spawns: morning_rush(MORNING_RIDERS, MORNING_WINDOW, TOP_STOP, MORNING_SEED),
        conditions: morning_conditions(),
        max_ticks: MAX_TICKS,
    },
    LookDispatch::new(),
);

scenario_test!(
    scan_under_morning_rush,
    Scenario {
        name: "SCAN morning rush".into(),
        config: canonical_building(),
        spawns: morning_rush(MORNING_RIDERS, MORNING_WINDOW, TOP_STOP, MORNING_SEED),
        conditions: morning_conditions(),
        max_ticks: MAX_TICKS,
    },
    ScanDispatch::new(),
);

scenario_test!(
    nearest_under_morning_rush,
    Scenario {
        name: "Nearest morning rush".into(),
        config: canonical_building(),
        spawns: morning_rush(MORNING_RIDERS, MORNING_WINDOW, TOP_STOP, MORNING_SEED),
        conditions: morning_conditions(),
        max_ticks: MAX_TICKS,
    },
    NearestCarDispatch::new(),
);

// ── Evening rush ────────────────────────────────────────────────────
// Down-peak discriminates the strategies. SCAN and LOOK hit the
// sweep-direction pathology (~7956 ticks / avg 2894); ETD and NEAREST
// route opportunistically (~4000 ticks / avg ~1050).

fn evening_fast_conditions() -> Vec<Condition> {
    // ETD + NEAREST baseline
    vec![
        Condition::AllDeliveredByTick(4887),
        Condition::AvgWaitBelow(1299.0),
        Condition::AbandonmentRateBelow(0.05),
    ]
}

fn evening_sweep_conditions() -> Vec<Condition> {
    // LOOK + SCAN baseline (sweep-direction pathology under down-peak)
    vec![
        Condition::AllDeliveredByTick(9548),
        Condition::AvgWaitBelow(3474.0),
        Condition::AbandonmentRateBelow(0.05),
    ]
}

scenario_test!(
    etd_under_evening_rush,
    Scenario {
        name: "ETD evening rush".into(),
        config: canonical_building(),
        spawns: evening_rush(EVENING_RIDERS, EVENING_WINDOW, TOP_STOP, EVENING_SEED),
        conditions: evening_fast_conditions(),
        max_ticks: MAX_TICKS,
    },
    EtdDispatch::new(),
);

scenario_test!(
    look_under_evening_rush,
    Scenario {
        name: "LOOK evening rush".into(),
        config: canonical_building(),
        spawns: evening_rush(EVENING_RIDERS, EVENING_WINDOW, TOP_STOP, EVENING_SEED),
        conditions: evening_sweep_conditions(),
        max_ticks: MAX_TICKS,
    },
    LookDispatch::new(),
);

scenario_test!(
    scan_under_evening_rush,
    Scenario {
        name: "SCAN evening rush".into(),
        config: canonical_building(),
        spawns: evening_rush(EVENING_RIDERS, EVENING_WINDOW, TOP_STOP, EVENING_SEED),
        conditions: evening_sweep_conditions(),
        max_ticks: MAX_TICKS,
    },
    ScanDispatch::new(),
);

scenario_test!(
    nearest_under_evening_rush,
    Scenario {
        name: "Nearest evening rush".into(),
        config: canonical_building(),
        spawns: evening_rush(EVENING_RIDERS, EVENING_WINDOW, TOP_STOP, EVENING_SEED),
        conditions: evening_fast_conditions(),
        max_ticks: MAX_TICKS,
    },
    NearestCarDispatch::new(),
);

// ── Interfloor ──────────────────────────────────────────────────────
// Mixed traffic. SCAN and LOOK trail ETD+NEAREST by ~15%.

fn interfloor_fast_conditions() -> Vec<Condition> {
    vec![
        Condition::AllDeliveredByTick(5169),
        Condition::AvgWaitBelow(890.0),
        Condition::AbandonmentRateBelow(0.05),
    ]
}

fn interfloor_sweep_conditions() -> Vec<Condition> {
    vec![
        Condition::AllDeliveredByTick(5511),
        // Bumped from 1054 → 1740 by the dispatch commitment-set
        // fix. Interfloor traffic reassigns heavily (every rider
        // generates a new dispatch call), so the regression is
        // larger than morning rush. 1740 leaves ~20% headroom over
        // the new 1447-tick observed baseline.
        Condition::AvgWaitBelow(1740.0),
        Condition::AbandonmentRateBelow(0.05),
    ]
}

scenario_test!(
    etd_under_interfloor,
    Scenario {
        name: "ETD interfloor".into(),
        config: canonical_building(),
        spawns: interfloor(INTERFLOOR_RIDERS, INTERFLOOR_WINDOW, 10, INTERFLOOR_SEED),
        conditions: interfloor_fast_conditions(),
        max_ticks: MAX_TICKS,
    },
    EtdDispatch::new(),
);

scenario_test!(
    look_under_interfloor,
    Scenario {
        name: "LOOK interfloor".into(),
        config: canonical_building(),
        spawns: interfloor(INTERFLOOR_RIDERS, INTERFLOOR_WINDOW, 10, INTERFLOOR_SEED),
        conditions: interfloor_sweep_conditions(),
        max_ticks: MAX_TICKS,
    },
    LookDispatch::new(),
);

scenario_test!(
    scan_under_interfloor,
    Scenario {
        name: "SCAN interfloor".into(),
        config: canonical_building(),
        spawns: interfloor(INTERFLOOR_RIDERS, INTERFLOOR_WINDOW, 10, INTERFLOOR_SEED),
        conditions: interfloor_sweep_conditions(),
        max_ticks: MAX_TICKS,
    },
    ScanDispatch::new(),
);

scenario_test!(
    nearest_under_interfloor,
    Scenario {
        name: "Nearest interfloor".into(),
        config: canonical_building(),
        spawns: interfloor(INTERFLOOR_RIDERS, INTERFLOOR_WINDOW, 10, INTERFLOOR_SEED),
        conditions: interfloor_fast_conditions(),
        max_ticks: MAX_TICKS,
    },
    NearestCarDispatch::new(),
);

// ── Burst ───────────────────────────────────────────────────────────
// 15 riders at Floor 3 → Floor 8 at tick 60. All strategies converge
// on 750 ticks / avg_wait 176.

fn burst_conditions() -> Vec<Condition> {
    vec![
        Condition::AllDeliveredByTick(900),
        Condition::AvgWaitBelow(212.0),
        Condition::AbandonmentRateBelow(0.05),
    ]
}

scenario_test!(
    etd_under_burst,
    Scenario {
        name: "ETD burst".into(),
        config: canonical_building(),
        spawns: burst(BURST_RIDERS, BURST_TICK, StopId(3), StopId(8)),
        conditions: burst_conditions(),
        max_ticks: MAX_TICKS,
    },
    EtdDispatch::new(),
);

scenario_test!(
    look_under_burst,
    Scenario {
        name: "LOOK burst".into(),
        config: canonical_building(),
        spawns: burst(BURST_RIDERS, BURST_TICK, StopId(3), StopId(8)),
        conditions: burst_conditions(),
        max_ticks: MAX_TICKS,
    },
    LookDispatch::new(),
);

scenario_test!(
    scan_under_burst,
    Scenario {
        name: "SCAN burst".into(),
        config: canonical_building(),
        spawns: burst(BURST_RIDERS, BURST_TICK, StopId(3), StopId(8)),
        conditions: burst_conditions(),
        max_ticks: MAX_TICKS,
    },
    ScanDispatch::new(),
);

scenario_test!(
    nearest_under_burst,
    Scenario {
        name: "Nearest burst".into(),
        config: canonical_building(),
        spawns: burst(BURST_RIDERS, BURST_TICK, StopId(3), StopId(8)),
        conditions: burst_conditions(),
        max_ticks: MAX_TICKS,
    },
    NearestCarDispatch::new(),
);
