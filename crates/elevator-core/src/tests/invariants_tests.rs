//! Property-based invariants that hold for *any* built-in dispatch
//! strategy under *any* random workload.
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
//! [`NearestCarDispatch`], [`EtdDispatch`], [`RsrDispatch`],
//! [`DestinationDispatch`]. For DCS the harness flips the group's
//! [`HallCallMode`] to `Destination` before spawning, so
//! [`spawn_rider`](Simulation::spawn_rider) registers each rider's
//! destination on the hall call (see
//! `sim::rider::register_hall_call_for_rider`) — which is what
//! `DestinationDispatch` consumes during its
//! [`pre_dispatch`](crate::dispatch::DispatchStrategy::pre_dispatch)
//! pass.
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
//! 5. **Liveness.** After [`TICK_BUDGET`] ticks every rider must be
//!    in a terminal phase (`Arrived`, `Abandoned`, or `Resident`).
//!    No rider is still `Waiting`, `Boarding`, `Riding`, `Exiting`,
//!    or `Walking`. Catches stuck dispatchers, unserviceable demand,
//!    and reroute loops — classes of bug the per-tick invariants
//!    don't see because they only assert *consistency*, not
//!    *progress*.
//! 6. **Snapshot round-trip determinism.** After `WARMUP_TICKS` ticks
//!    on a sim, `(snapshot, restore)` yields a sim that follows the
//!    original's future trajectory tick-for-tick: after both step
//!    another `COMPARE_TICKS`, their integer `Metrics` counters and
//!    per-phase rider histograms match exactly. Originally surfaced
//!    the strategy-identity bug where legacy-topology construction
//!    hard-coded `BuiltinStrategy::Scan` as the snapshot id — the
//!    fix adds [`DispatchStrategy::builtin_id`] and routes it
//!    through the constructor so every built-in dispatcher round-
//!    trips as itself.
//!
//!    Covers `NearestCar`, `Etd`, `Rsr`, `Destination`. `Scan` and
//!    `Look` are excluded because they carry per-elevator sweep-
//!    direction state in the dispatcher struct (`direction` /
//!    `mode` HashMaps) that isn't part of `WorldSnapshot`. Restore
//!    instantiates them fresh with default-`Up` directions, so
//!    their trajectories legitimately diverge from a running sim
//!    whose elevators are mid-sweep. Round-tripping that state
//!    needs a `serialize_state`/`restore_state` hook on the
//!    `DispatchStrategy` trait — separate change, separate PR.
//!    Floating-point accumulators (`total_distance`,
//!    `reposition_distance`) are also omitted: summation-order
//!    sensitivity means they can diverge by ULPs without
//!    indicating a state-capture bug.

use proptest::prelude::*;

use crate::components::{Accel, RiderPhase, RiderPhaseKind, Speed, Weight};
use crate::config::{
    BuildingConfig, ElevatorConfig, PassengerSpawnConfig, SimConfig, SimulationParams,
};
use crate::dispatch::{
    HallCallMode, destination::DestinationDispatch, etd::EtdDispatch, look::LookDispatch,
    nearest_car::NearestCarDispatch, rsr::RsrDispatch, scan::ScanDispatch,
};
use crate::metrics::Metrics;
use crate::rider_index::RiderIndex;
use crate::sim::Simulation;
use crate::stop::{StopConfig, StopId};

/// Identifier for the six built-in dispatch strategies this harness
/// exercises. A plain `Copy` enum sidesteps the
/// trait-object-in-proptest awkwardness: [`build_sim`] matches on
/// the kind and constructs the concrete strategy at the top of each
/// test case rather than carrying a boxed dispatcher through the
/// proptest machinery. [`Self::Destination`] additionally flips the
/// group's [`HallCallMode`] to `Destination` so DCS can observe
/// each rider's destination on the hall call.
#[derive(Debug, Clone, Copy)]
enum StrategyKind {
    Scan,
    Look,
    NearestCar,
    Etd,
    Rsr,
    Destination,
}

impl StrategyKind {
    fn label(self) -> &'static str {
        match self {
            Self::Scan => "Scan",
            Self::Look => "Look",
            Self::NearestCar => "NearestCar",
            Self::Etd => "Etd",
            Self::Rsr => "Rsr",
            Self::Destination => "Destination",
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

/// Proptest generator for a strategy kind, uniformly over all six
/// built-ins.
fn any_strategy() -> impl Strategy<Value = StrategyKind> {
    prop_oneof![
        Just(StrategyKind::Scan),
        Just(StrategyKind::Look),
        Just(StrategyKind::NearestCar),
        Just(StrategyKind::Etd),
        Just(StrategyKind::Rsr),
        Just(StrategyKind::Destination),
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
/// a boxed dispatcher. For [`StrategyKind::Destination`] the group's
/// hall-call mode is flipped to `Destination` before any rider is
/// spawned, so each hall call carries the rider's destination.
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
        StrategyKind::Destination => Simulation::new(&config, DestinationDispatch::new()),
    }
    .expect("build sim");
    if matches!(kind, StrategyKind::Destination) {
        for group in sim.groups_mut() {
            group.set_hall_call_mode(HallCallMode::Destination);
        }
    }
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
/// ticks; 8k gives headroom so the liveness invariant
/// ([`all_riders_reach_terminal_phase_across_strategies`]) doesn't
/// spuriously flag a case where dispatch just needed more time. If
/// a strategy legitimately requires &gt; 8k ticks to drain a
/// workload this generator produces, that's itself a bug worth
/// surfacing.
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

// Liveness: after TICK_BUDGET ticks every rider must be in a
// terminal phase (Arrived, Abandoned, or Resident). A lingering
// Waiting rider means the dispatcher stopped serving them; a
// lingering Boarding/Riding/Exiting rider means the rider is
// perpetually mid-transition; Walking means a transfer never
// completed. All are stuck-dispatch signatures that the per-tick
// invariants (consistency-only) would miss.
proptest! {
    #![proptest_config(ProptestConfig::with_cases(12))]

    #[test]
    fn all_riders_reach_terminal_phase_across_strategies(
        kind in any_strategy(),
        workload in any_workload(),
    ) {
        let (mut sim, _stops) = build_sim(kind, &workload);
        let label = kind.label();

        for _ in 0..TICK_BUDGET {
            sim.step();
            let _ = sim.drain_events();
        }

        for (id, rider) in sim.world().iter_riders() {
            let terminal = matches!(
                rider.phase,
                RiderPhase::Arrived | RiderPhase::Abandoned | RiderPhase::Resident,
            );
            prop_assert!(
                terminal,
                "[{}] rider {:?} stuck in non-terminal phase {:?} after {} ticks",
                label, id, rider.phase, TICK_BUDGET,
            );
        }
    }
}

// Snapshot round-trip determinism: snapshot mid-run, restore into a
// fresh sim, step both the original and the restore for the same
// number of additional ticks, assert that the discrete observable
// state (integer metrics counters and per-phase rider histogram)
// matches tick-for-tick. `WARMUP_TICKS` is deliberately short enough
// that many riders are still mid-lifecycle at snapshot time —
// snapshotting a drained sim would make the comparison trivial.
// Floating-point accumulators are excluded intentionally (summation-
// order ULP drift isn't a state-capture bug).
const WARMUP_TICKS: u64 = 400;
const COMPARE_TICKS: u64 = 1_200;

/// Fixed-shape histogram of riders by phase kind. Used to compare two
/// sims without depending on `EntityId` stability across
/// snapshot/restore (`WorldSnapshot::restore` renumbers ids). A
/// struct beats a `HashMap`/`BTreeMap` because `RiderPhaseKind`
/// derives neither `Hash` nor `Ord`, and the variant set is closed.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
struct PhaseHistogram {
    waiting: usize,
    boarding: usize,
    riding: usize,
    exiting: usize,
    walking: usize,
    arrived: usize,
    abandoned: usize,
    resident: usize,
}

fn phase_histogram(sim: &Simulation) -> PhaseHistogram {
    let mut h = PhaseHistogram::default();
    for (_, rider) in sim.world().iter_riders() {
        match rider.phase.kind() {
            RiderPhaseKind::Waiting => h.waiting += 1,
            RiderPhaseKind::Boarding => h.boarding += 1,
            RiderPhaseKind::Riding => h.riding += 1,
            RiderPhaseKind::Exiting => h.exiting += 1,
            RiderPhaseKind::Walking => h.walking += 1,
            RiderPhaseKind::Arrived => h.arrived += 1,
            RiderPhaseKind::Abandoned => h.abandoned += 1,
            RiderPhaseKind::Resident => h.resident += 1,
        }
    }
    h
}

/// Proptest generator for the strategies whose in-memory state is
/// entirely captured by `WorldSnapshot`. Excludes `Scan` and `Look`,
/// which hold per-elevator sweep direction on the dispatcher struct.
/// See the top-of-file doc comment for invariant #6.
fn any_snapshottable_strategy() -> impl Strategy<Value = StrategyKind> {
    prop_oneof![
        Just(StrategyKind::NearestCar),
        Just(StrategyKind::Etd),
        Just(StrategyKind::Rsr),
        Just(StrategyKind::Destination),
    ]
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(8))]

    #[test]
    fn snapshot_restore_preserves_trajectory_across_strategies(
        kind in any_snapshottable_strategy(),
        workload in any_workload(),
    ) {
        let (mut sim_a, _stops) = build_sim(kind, &workload);
        let label = kind.label();

        for _ in 0..WARMUP_TICKS {
            sim_a.step();
            let _ = sim_a.drain_events();
        }

        let snap = sim_a.snapshot();
        let mut sim_b = snap.restore(None).expect("restore");

        for tick in 0..COMPARE_TICKS {
            sim_a.step();
            let _ = sim_a.drain_events();
            sim_b.step();
            let _ = sim_b.drain_events();

            let ma = sim_a.metrics();
            let mb = sim_b.metrics();
            prop_assert_eq!(
                ma.total_delivered(), mb.total_delivered(),
                "[{}] compare tick {}: total_delivered drift", label, tick,
            );
            prop_assert_eq!(
                ma.total_abandoned(), mb.total_abandoned(),
                "[{}] compare tick {}: total_abandoned drift", label, tick,
            );
            prop_assert_eq!(
                ma.total_spawned(), mb.total_spawned(),
                "[{}] compare tick {}: total_spawned drift", label, tick,
            );
            prop_assert_eq!(
                ma.max_wait_time(), mb.max_wait_time(),
                "[{}] compare tick {}: max_wait_time drift", label, tick,
            );
            prop_assert_eq!(
                ma.total_moves(), mb.total_moves(),
                "[{}] compare tick {}: total_moves drift", label, tick,
            );

            let ha = phase_histogram(&sim_a);
            let hb = phase_histogram(&sim_b);
            prop_assert_eq!(
                &ha, &hb,
                "[{}] compare tick {}: phase histogram drift\nlive: {:?}\nrestored: {:?}",
                label, tick, ha, hb,
            );
        }
    }
}
