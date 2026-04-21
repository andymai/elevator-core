//! Property-based invariants that hold for *any* built-in hall-call
//! dispatch strategy under *any* random workload.
//!
//! Unit tests pin specific behaviours; these tests pin **class-level
//! guarantees** — the kind of bugs that have repeatedly landed as
//! fixes (disabled-stops in queues, cars idling with riders aboard,
//! full-car self-assign stalls, rider-index desync) are all
//! invariant violations. A single proptest harness that runs every
//! builtin strategy against random workloads and asserts four
//! system-wide invariants after every tick would have caught each of
//! those.
//!
//! Strategies covered: [`ScanDispatch`], [`LookDispatch`],
//! [`NearestCarDispatch`], [`EtdDispatch`], [`RsrDispatch`].
//! [`DestinationDispatch`] is excluded — it requires DCS hall-call
//! pre-registration and doesn't service plain `spawn_rider` demand;
//! covering it needs a workload generator that issues
//! `press_hall_button`, which is a separate concern.
//!
//! Invariants asserted every tick:
//!
//! 1. **Conservation.** No rider silently vanishes or duplicates:
//!    `world.iter_riders().count() == metrics.total_spawned()` and
//!    `metrics.total_abandoned() == count(phase == Abandoned)`.
//! 2. **Capacity.** No car is ever overloaded:
//!    `car.current_load() <= car.weight_capacity() + ε`.
//! 3. **Index consistency.** The O(1) [`RiderIndex`] matches a
//!    from-scratch rebuild from `World`. Generalises the
//!    single-strategy test in [`super::rider_index_tests`].
//! 4. **Metrics monotonicity.** Counters that are non-decreasing by
//!    construction (`total_delivered`, `total_abandoned`,
//!    `max_wait_time`, `total_distance`, `total_moves`,
//!    `total_settled`, `total_rerouted`, `reposition_distance`)
//!    never decrease tick-over-tick. `total_spawned` is asserted by
//!    the conservation invariant instead — pre-spawning makes
//!    tick-over-tick monotonicity trivial there.

use proptest::prelude::*;

use crate::components::{Accel, RiderPhase, Speed, Weight};
use crate::config::{
    BuildingConfig, ElevatorConfig, PassengerSpawnConfig, SimConfig, SimulationParams,
};
use crate::dispatch::{
    etd::EtdDispatch, look::LookDispatch, nearest_car::NearestCarDispatch, rsr::RsrDispatch,
    scan::ScanDispatch,
};
use crate::metrics::Metrics;
use crate::rider_index::RiderIndex;
use crate::sim::Simulation;
use crate::stop::{StopConfig, StopId};

/// Identifier for the five hall-call dispatch strategies this harness
/// exercises. A plain `Copy` enum sidesteps the
/// trait-object-in-proptest awkwardness: [`build_sim`] matches on
/// the kind and constructs the concrete strategy at the top of each
/// test case rather than carrying a boxed dispatcher through the
/// proptest machinery.
#[derive(Debug, Clone, Copy)]
enum StrategyKind {
    Scan,
    Look,
    NearestCar,
    Etd,
    Rsr,
}

impl StrategyKind {
    fn label(self) -> &'static str {
        match self {
            Self::Scan => "Scan",
            Self::Look => "Look",
            Self::NearestCar => "NearestCar",
            Self::Etd => "Etd",
            Self::Rsr => "Rsr",
        }
    }
}

/// A single rider spawn (origin, destination, weight) to apply after
/// the sim is built. Sampled with a uniform 60..=100 kg weight — wide
/// enough to make capacity pressure plausible, tight enough to avoid
/// the config-level weight-range guard rejecting any spawn.
#[derive(Debug, Clone, Copy)]
struct RiderSpawn {
    origin: u32,
    destination: u32,
    weight: f64,
}

/// A sampled workload: building shape and the set of riders to spawn.
#[derive(Debug, Clone)]
struct Workload {
    stop_count: u32,
    elevator_count: u32,
    capacity: f64,
    spawns: Vec<RiderSpawn>,
}

impl Workload {
    fn to_config(&self) -> SimConfig {
        let stops: Vec<StopConfig> = (0..self.stop_count)
            .map(|i| StopConfig {
                id: StopId(i),
                name: format!("Floor {i}"),
                position: f64::from(i) * 4.0,
            })
            .collect();
        let elevators: Vec<ElevatorConfig> = (0..self.elevator_count)
            .map(|i| ElevatorConfig {
                id: i,
                name: format!("Car {i}"),
                max_speed: Speed::from(3.0),
                acceleration: Accel::from(1.5),
                deceleration: Accel::from(2.0),
                weight_capacity: Weight::from(self.capacity),
                starting_stop: StopId(0),
                door_open_ticks: 8,
                door_transition_ticks: 4,
                restricted_stops: Vec::new(),
                #[cfg(feature = "energy")]
                energy_profile: None,
                service_mode: None,
                inspection_speed_factor: 0.25,
                bypass_load_up_pct: None,
                bypass_load_down_pct: None,
            })
            .collect();
        SimConfig {
            building: BuildingConfig {
                name: "Invariant Building".into(),
                stops,
                lines: None,
                groups: None,
            },
            elevators,
            simulation: SimulationParams {
                ticks_per_second: 60.0,
            },
            passenger_spawning: PassengerSpawnConfig {
                mean_interval_ticks: 120,
                weight_range: (50.0, 100.0),
            },
        }
    }
}

/// Proptest generator for a strategy kind, uniformly over the five
/// covered built-ins.
fn any_strategy() -> impl Strategy<Value = StrategyKind> {
    prop_oneof![
        Just(StrategyKind::Scan),
        Just(StrategyKind::Look),
        Just(StrategyKind::NearestCar),
        Just(StrategyKind::Etd),
        Just(StrategyKind::Rsr),
    ]
}

/// Proptest generator for a random workload: 3–6 stops, 1–3 cars,
/// 600–1200 kg capacity, and 5–30 rider spawns with distinct
/// origin/destination stops.
///
/// `destination` is sampled as `(origin + delta) % stop_count` with
/// `delta ∈ 1..stop_count`, which gives a uniform distribution over
/// the `stop_count - 1` non-origin stops for every `origin`. A naive
/// "sample destination independently, then fix collisions by bumping
/// to `origin + 1`" scheme would over-represent upward pairs in
/// small buildings — at `stop_count = 3` a third of draws collide
/// and all of them become `origin → origin + 1 (mod 3)`, leaving
/// the `origin → origin - 1 (mod 3)` pair starved.
fn any_workload() -> impl Strategy<Value = Workload> {
    (3u32..=6, 1u32..=3, 600.0..=1200.0_f64, 5usize..=30).prop_flat_map(
        |(stop_count, elevator_count, capacity, spawn_count)| {
            let spawns = prop::collection::vec(
                (0..stop_count, 1..stop_count, 60.0..=100.0_f64).prop_map(
                    move |(origin, delta, weight)| RiderSpawn {
                        origin,
                        destination: (origin + delta) % stop_count,
                        weight,
                    },
                ),
                spawn_count,
            );
            spawns.prop_map(move |spawns| Workload {
                stop_count,
                elevator_count,
                capacity,
                spawns,
            })
        },
    )
}

/// Build a sim with the given strategy + workload, spawning all riders
/// up-front. Returns the sim and the list of stop entity ids for
/// index-consistency queries. `Simulation::new` takes `impl
/// DispatchStrategy + 'static` (not a trait object), so each arm
/// constructs the concrete strategy type rather than routing through
/// a boxed dispatcher.
fn build_sim(
    kind: StrategyKind,
    workload: &Workload,
) -> (Simulation, Vec<crate::entity::EntityId>) {
    let config = workload.to_config();
    let mut sim = match kind {
        StrategyKind::Scan => Simulation::new(&config, ScanDispatch::new()),
        StrategyKind::Look => Simulation::new(&config, LookDispatch::new()),
        StrategyKind::NearestCar => Simulation::new(&config, NearestCarDispatch::new()),
        StrategyKind::Etd => Simulation::new(&config, EtdDispatch::new()),
        StrategyKind::Rsr => Simulation::new(&config, RsrDispatch::new()),
    }
    .expect("build sim");
    for spawn in &workload.spawns {
        sim.spawn_rider(
            StopId(spawn.origin),
            StopId(spawn.destination),
            spawn.weight,
        )
        .expect("spawn rider");
    }
    let stops: Vec<_> = sim.world().iter_stops().map(|(eid, _)| eid).collect();
    (sim, stops)
}

/// Snapshot of the monotone-metric subset captured each tick.
///
/// `total_spawned` is intentionally omitted: this harness pre-spawns
/// every rider in [`build_sim`] and then only calls `step`, so the
/// spawn counter is constant across the tick loop and a
/// `>=` check would be trivially satisfied. The conservation
/// invariant already asserts the stronger `== expected_spawned`
/// property for that counter.
#[derive(Debug, Clone, Copy)]
struct MonotoneSnapshot {
    total_delivered: u64,
    total_abandoned: u64,
    total_settled: u64,
    total_rerouted: u64,
    max_wait_time: u64,
    total_distance: f64,
    reposition_distance: f64,
    total_moves: u64,
}

impl MonotoneSnapshot {
    fn capture(m: &Metrics) -> Self {
        Self {
            total_delivered: m.total_delivered(),
            total_abandoned: m.total_abandoned(),
            total_settled: m.total_settled(),
            total_rerouted: m.total_rerouted(),
            max_wait_time: m.max_wait_time(),
            total_distance: m.total_distance(),
            reposition_distance: m.reposition_distance(),
            total_moves: m.total_moves(),
        }
    }
}

/// Budget on the number of ticks to drive each case. Scenarios with
/// 30 riders across 6 stops and a single car routinely need 3–5k
/// ticks; 8k gives headroom so cases don't spuriously trip a "stuck"
/// check inside an invariant (there is no such check — we stop when
/// the budget is exhausted regardless of delivery state).
const TICK_BUDGET: u64 = 8_000;

// ── Invariants ──────────────────────────────────────────────────────

// Conservation:
// - every spawned rider remains visible in `World` (nothing deleted);
// - the tally by phase sums to the spawned count;
// - the abandonment counter matches the count of riders in the
//   `Abandoned` phase.
proptest! {
    #![proptest_config(ProptestConfig::with_cases(12))]

    #[test]
    fn conservation_holds_across_strategies(
        kind in any_strategy(),
        workload in any_workload(),
    ) {
        let (mut sim, _stops) = build_sim(kind, &workload);
        let expected_spawned = workload.spawns.len() as u64;
        let label = kind.label();

        for tick in 0..TICK_BUDGET {
            sim.step();
            let _ = sim.drain_events();

            let actual = sim.world().iter_riders().count() as u64;
            prop_assert_eq!(
                actual, expected_spawned,
                "[{}] tick {}: rider count {} != spawned {}",
                label, tick, actual, expected_spawned,
            );

            let total_spawned = sim.metrics().total_spawned();
            prop_assert_eq!(
                total_spawned, expected_spawned,
                "[{}] tick {}: metrics.total_spawned() = {} expected {}",
                label, tick, total_spawned, expected_spawned,
            );

            let abandoned_in_phase = sim
                .world()
                .iter_riders()
                .filter(|(_, r)| r.phase == RiderPhase::Abandoned)
                .count() as u64;
            let total_abandoned = sim.metrics().total_abandoned();
            prop_assert_eq!(
                abandoned_in_phase, total_abandoned,
                "[{}] tick {}: abandoned phase {} != total_abandoned {}",
                label, tick, abandoned_in_phase, total_abandoned,
            );
        }
    }
}

// Capacity: every tick, every elevator's current load must stay at
// or below its configured weight capacity. A float epsilon allows
// the tiny rounding noise that can accumulate when loads are summed.
proptest! {
    #![proptest_config(ProptestConfig::with_cases(12))]

    #[test]
    fn capacity_never_exceeded_across_strategies(
        kind in any_strategy(),
        workload in any_workload(),
    ) {
        let (mut sim, _stops) = build_sim(kind, &workload);
        let label = kind.label();

        for tick in 0..TICK_BUDGET {
            sim.step();
            let _ = sim.drain_events();

            for (_, _, elev) in sim.world().iter_elevators() {
                let load = elev.current_load().value();
                let cap = elev.weight_capacity().value();
                prop_assert!(
                    load <= cap + 1e-9,
                    "[{}] tick {}: load {} > capacity {}",
                    label, tick, load, cap,
                );
            }
        }
    }
}

// Index consistency: at every tick the live `RiderIndex` must agree
// with a from-scratch rebuild. Generalises
// `rider_index_consistent_through_tick_cycles` (SCAN-only) to the
// full strategy set and random workloads.
proptest! {
    #![proptest_config(ProptestConfig::with_cases(12))]

    #[test]
    fn rider_index_consistent_across_strategies(
        kind in any_strategy(),
        workload in any_workload(),
    ) {
        let (mut sim, stops) = build_sim(kind, &workload);
        let label = kind.label();

        for tick in 0..TICK_BUDGET {
            sim.step();
            let _ = sim.drain_events();

            let mut fresh = RiderIndex::default();
            fresh.rebuild(sim.world());

            for &stop in &stops {
                let live = sim.waiting_count_at(stop);
                let rebuilt = fresh.waiting_count_at(stop);
                prop_assert_eq!(
                    live, rebuilt,
                    "[{}] tick {}: waiting mismatch at {:?}: live={}, rebuilt={}",
                    label, tick, stop, live, rebuilt,
                );
                let live = sim.resident_count_at(stop);
                let rebuilt = fresh.resident_count_at(stop);
                prop_assert_eq!(
                    live, rebuilt,
                    "[{}] tick {}: resident mismatch at {:?}: live={}, rebuilt={}",
                    label, tick, stop, live, rebuilt,
                );
                let live = sim.abandoned_count_at(stop);
                let rebuilt = fresh.abandoned_count_at(stop);
                prop_assert_eq!(
                    live, rebuilt,
                    "[{}] tick {}: abandoned mismatch at {:?}: live={}, rebuilt={}",
                    label, tick, stop, live, rebuilt,
                );
            }
        }
    }
}

// Monotonicity: the counters that are non-decreasing by construction
// never slip backwards tick-over-tick. Total-distance and
// reposition-distance are `f64` but accumulate only from `+=` of
// non-negative deltas, so a strict `>=` (with a small float epsilon
// for addition noise) is the right contract.
proptest! {
    #![proptest_config(ProptestConfig::with_cases(12))]

    #[test]
    fn metrics_monotone_across_strategies(
        kind in any_strategy(),
        workload in any_workload(),
    ) {
        let (mut sim, _stops) = build_sim(kind, &workload);
        let mut prev = MonotoneSnapshot::capture(sim.metrics());
        let label = kind.label();

        for tick in 0..TICK_BUDGET {
            sim.step();
            let _ = sim.drain_events();
            let cur = MonotoneSnapshot::capture(sim.metrics());

            prop_assert!(
                cur.total_delivered >= prev.total_delivered,
                "[{}] tick {}: total_delivered decreased {} -> {}",
                label, tick, prev.total_delivered, cur.total_delivered,
            );
            prop_assert!(
                cur.total_abandoned >= prev.total_abandoned,
                "[{}] tick {}: total_abandoned decreased {} -> {}",
                label, tick, prev.total_abandoned, cur.total_abandoned,
            );
            prop_assert!(
                cur.total_settled >= prev.total_settled,
                "[{}] tick {}: total_settled decreased {} -> {}",
                label, tick, prev.total_settled, cur.total_settled,
            );
            prop_assert!(
                cur.total_rerouted >= prev.total_rerouted,
                "[{}] tick {}: total_rerouted decreased {} -> {}",
                label, tick, prev.total_rerouted, cur.total_rerouted,
            );
            prop_assert!(
                cur.max_wait_time >= prev.max_wait_time,
                "[{}] tick {}: max_wait_time decreased {} -> {}",
                label, tick, prev.max_wait_time, cur.max_wait_time,
            );
            prop_assert!(
                cur.total_moves >= prev.total_moves,
                "[{}] tick {}: total_moves decreased {} -> {}",
                label, tick, prev.total_moves, cur.total_moves,
            );
            prop_assert!(
                cur.total_distance + 1e-9 >= prev.total_distance,
                "[{}] tick {}: total_distance decreased {} -> {}",
                label, tick, prev.total_distance, cur.total_distance,
            );
            prop_assert!(
                cur.reposition_distance + 1e-9 >= prev.reposition_distance,
                "[{}] tick {}: reposition_distance decreased {} -> {}",
                label, tick, prev.reposition_distance, cur.reposition_distance,
            );

            prev = cur;
        }
    }
}
