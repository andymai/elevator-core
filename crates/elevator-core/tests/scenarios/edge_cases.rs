//! Edge-case scenarios: capacity overflow, abandonment, patience.
//!
//! Scenarios expressible through `TimedSpawn` use the `scenario_test!`
//! macro. Cases requiring per-rider state (patience, preferences) drop
//! down to plain `#[test]` functions driving `Simulation` directly —
//! `ScenarioRunner` intentionally keeps spawns weight-only for replay
//! fidelity.

#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use elevator_core::components::{Preferences, RiderPhase};
use elevator_core::dispatch::EtdDispatch;
use elevator_core::prelude::*;
use elevator_core::scenario::{Condition, Scenario, TimedSpawn};

#[path = "common/mod.rs"]
mod common;

use common::{canonical_building, compact_building};

// ── Capacity overflow ────────────────────────────────────────────
// 20 riders × 90 kg = 1800 kg at one stop, 1200 kg car cap. One car
// cannot absorb the burst; a second must pick up the spillover. Locks
// in that AllDeliveredByTick is achievable despite the overflow.

scenario_test!(
    heavy_burst_spills_to_second_car,
    Scenario {
        name: "Heavy burst".into(),
        config: canonical_building(),
        spawns: (0..20)
            .map(|_| TimedSpawn {
                tick: 60,
                origin: StopId(4),
                destination: StopId(0),
                weight: 90.0,
            })
            .collect(),
        conditions: vec![
            Condition::AllDeliveredByTick(2000),
            Condition::AbandonmentRateBelow(0.05),
        ],
        max_ticks: 5000,
    },
    EtdDispatch::new(),
);

// ── Zero riders ──────────────────────────────────────────────────
// A scenario with no spawns and a trivial condition should pass — locks
// in the evaluator not panicking when `total_spawned == 0` (division
// by zero inside `abandonment_rate` would surface here).

scenario_test!(
    zero_spawns_are_trivially_satisfied,
    Scenario {
        name: "Zero riders".into(),
        config: canonical_building(),
        spawns: Vec::new(),
        conditions: vec![
            Condition::AllDeliveredByTick(10),
            Condition::AbandonmentRateBelow(0.01),
        ],
        max_ticks: 100,
    },
    EtdDispatch::new(),
);

// ── Mixed floors, sustained load ────────────────────────────────
// Larger rider count than dispatch_matrix: 60 riders in a 300-tick
// window. Confirms the sim terminates under sustained pressure.

scenario_test!(
    sustained_load_terminates_within_budget,
    Scenario {
        name: "Sustained load".into(),
        config: canonical_building(),
        spawns: burst_multi(60, 300),
        conditions: vec![
            Condition::AllDeliveredByTick(9000),
            Condition::AbandonmentRateBelow(0.05),
        ],
        max_ticks: 12_000,
    },
    EtdDispatch::new(),
);

fn burst_multi(n: usize, window: u64) -> Vec<TimedSpawn> {
    // Deterministic mix: riders alternate origin and destination among
    // a small fixed pool so the load is heavy without needing a PRNG.
    let pairs = [(0, 5), (0, 9), (3, 8), (6, 1), (9, 2), (4, 7)];
    (0..n)
        .map(|i| {
            let (o, d) = pairs[i % pairs.len()];
            let tick = ((i as u64) * window) / (n as u64);
            TimedSpawn {
                tick,
                origin: StopId(o),
                destination: StopId(d),
                weight: ((i % 5) as f64).mul_add(5.0, 70.0),
            }
        })
        .collect()
}

// ── Patience exhaustion ──────────────────────────────────────────
// Rider with short `abandon_after_ticks`; sole elevator disabled.
// Rider must enter `Abandoned` once their wait budget elapses.

#[test]
fn patience_exhaustion_produces_abandoned_phase() {
    let mut sim = SimulationBuilder::from_config(compact_building())
        .dispatch(EtdDispatch::new())
        .build()
        .unwrap();

    let only_car = sim
        .world()
        .iter_elevators()
        .next()
        .map(|(id, _, _)| id)
        .expect("compact_building has one elevator");

    // Disable the only car before the rider arrives, so no service is
    // possible. The rider's patience runs out at tick 50, then the
    // Preferences::abandon_after_ticks budget (also 50) fires during
    // the next advance_transient.
    sim.disable(only_car).unwrap();

    let rider = sim
        .build_rider(StopId(0), StopId(2))
        .unwrap()
        .weight(70.0)
        .patience(50)
        .preferences(Preferences::default().with_abandon_after_ticks(Some(50)))
        .spawn()
        .unwrap();

    for _ in 0..200 {
        sim.step();
        if sim
            .world()
            .rider(rider.entity())
            .is_some_and(|r| r.phase() == RiderPhase::Abandoned)
        {
            return;
        }
    }

    let final_phase = sim
        .world()
        .rider(rider.entity())
        .map(elevator_core::components::Rider::phase);
    panic!("rider never abandoned; final phase = {final_phase:?}");
}

// ── Abandon on full ─────────────────────────────────────────────
// A rider with `abandon_on_full = true` should transition to
// `Abandoned` the first time a car skips them for being full, not
// wait patiently for the next.

#[test]
fn abandon_on_full_escalates_a_voluntary_skip_into_abandoned() {
    // Compact 1-car sim. Preload the car past the picky rider's
    // crowding tolerance so when it arrives at the picky rider's
    // stop, they voluntarily skip (skip_full_elevator + crowding
    // threshold), and abandon_on_full escalates that skip into
    // Abandoned rather than letting the rider wait for the next.
    let mut sim = SimulationBuilder::from_config(compact_building())
        .dispatch(EtdDispatch::new())
        .build()
        .unwrap();

    // Ballast rider saturates the 600 kg car (91%).
    sim.spawn_rider(StopId(0), StopId(2), 550.0).unwrap();

    // Picky rider at the intermediate stop: will voluntarily skip
    // any car over 50% load, and escalate the skip to Abandoned.
    let picky = sim
        .build_rider(StopId(1), StopId(2))
        .unwrap()
        .weight(30.0)
        .preferences(
            Preferences::default()
                .with_skip_full_elevator(true)
                .with_max_crowding_factor(0.5)
                .with_abandon_on_full(true),
        )
        .spawn()
        .unwrap();

    for _ in 0..3000 {
        sim.step();
        if sim
            .world()
            .rider(picky.entity())
            .is_some_and(|r| r.phase() == RiderPhase::Abandoned)
        {
            return;
        }
    }
    panic!(
        "picky rider never abandoned after skipping the full car — \
         `abandon_on_full` should have tripped on the first voluntary skip"
    );
}
