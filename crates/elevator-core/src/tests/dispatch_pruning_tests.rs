//! Parity tests for the per-car top-K candidate pruning in
//! [`crate::dispatch::assignment::assign_with_scratch`].
//!
//! The pruning trims each car's row in the cost matrix to the K
//! nearest viable pending stops. At realistic-building scale (≤200
//! stops, ≤50 cars) the K=50 default is generous enough that the
//! pruned and unpruned dispatchers must produce identical
//! simulation evolution — same metrics, same per-tick assignment
//! decisions. These tests pin that contract so a future change to
//! the pruning policy can't silently degrade optimality on real
//! buildings.

use crate::components::{Accel, Speed, Weight};
use crate::config::{
    BuildingConfig, ElevatorConfig, PassengerSpawnConfig, SimConfig, SimulationParams,
};
use crate::dispatch::etd::EtdDispatch;
use crate::sim::Simulation;
use crate::stop::{StopConfig, StopId};

/// Build a `scaling_realistic`-shaped config for parity comparison:
/// 50 elevators, 200 stops, ETD dispatch, the same shape the bench
/// uses to time the pruned vs unpruned hot path.
fn realistic_config() -> SimConfig {
    let stops: Vec<StopConfig> = (0..200u32)
        .map(|i| StopConfig {
            id: StopId(i),
            name: format!("S{i}"),
            position: f64::from(i) * 4.0,
        })
        .collect();

    let elevators: Vec<ElevatorConfig> = (0..50u32)
        .map(|i| ElevatorConfig {
            id: i,
            name: format!("E{i}"),
            max_speed: Speed::from(3.0),
            acceleration: Accel::from(1.5),
            deceleration: Accel::from(2.0),
            weight_capacity: Weight::from(1200.0),
            starting_stop: StopId(i % 200),
            door_open_ticks: 5,
            door_transition_ticks: 3,
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
        schema_version: crate::config::CURRENT_CONFIG_SCHEMA_VERSION,
        building: BuildingConfig {
            name: "PruningParity".into(),
            stops,
            lines: None,
            groups: None,
        },
        elevators,
        simulation: SimulationParams {
            ticks_per_second: 60.0,
        },
        passenger_spawning: PassengerSpawnConfig {
            mean_interval_ticks: 60,
            weight_range: (60.0, 90.0),
        },
    }
}

/// Pre-load a fixed sequence of riders so two sims see identical
/// demand. Deterministic in `(origin, dest)` per rider index so the
/// pruned and unpruned paths face the same call set tick-for-tick.
fn preload_riders(sim: &mut Simulation, count: u32, total_stops: u32) {
    for i in 0..count {
        let origin = StopId(i % total_stops);
        let dest = StopId((i + 1) % total_stops);
        sim.spawn_rider(origin, dest, 75.0).unwrap();
    }
}

/// Pruned-vs-unpruned ETD reach the same delivered/abandoned counts
/// after 100 ticks at `scaling_realistic` shape (50 cars / 200 stops /
/// 1000 riders pre-loaded).
///
/// K=50 is generous enough that every car's optimal candidate is
/// inside its top-K viable pool. If a future tweak narrows pruning
/// past the optimality boundary, this test catches it as a metrics
/// divergence — much more readable than a snapshot-bytes diff.
#[test]
fn etd_pruned_matches_unpruned_at_realistic_scale() {
    let cfg = realistic_config();

    let mut pruned = Simulation::new(&cfg, EtdDispatch::default()).unwrap();
    let mut unpruned =
        Simulation::new(&cfg, EtdDispatch::default().with_candidate_limit(None)).unwrap();

    preload_riders(&mut pruned, 1000, 200);
    preload_riders(&mut unpruned, 1000, 200);

    for tick in 0..100 {
        pruned.step();
        unpruned.step();

        // Per-tick metric parity gives a single line of failure
        // diagnostic even when the divergence is subtle (one stop
        // that fell outside K and got assigned later).
        assert_eq!(
            pruned.metrics().total_delivered(),
            unpruned.metrics().total_delivered(),
            "delivery count diverged at tick {tick}"
        );
        assert_eq!(
            pruned.metrics().total_abandoned(),
            unpruned.metrics().total_abandoned(),
            "abandonment count diverged at tick {tick}"
        );
        assert_eq!(
            pruned.metrics().total_moves(),
            unpruned.metrics().total_moves(),
            "move count diverged at tick {tick}"
        );
    }
}

/// `EtdDispatch::with_candidate_limit(None)` round-trips through
/// snapshot config — both the on-state and the explicit-off state.
/// Without this, restoring an opt-out sim would silently re-enable
/// the default Some(50) and produce different post-restore
/// assignments than the captured pre-snapshot ones.
#[test]
fn candidate_limit_round_trips_through_snapshot_config() {
    use crate::dispatch::DispatchStrategy;

    let on = EtdDispatch::default();
    let off = EtdDispatch::default().with_candidate_limit(None);

    // Sanity: `default()` ships pruning on; explicit None disables.
    assert_eq!(
        on.candidate_limit(),
        Some(crate::dispatch::DEFAULT_CANDIDATE_LIMIT)
    );
    assert_eq!(off.candidate_limit(), None);

    let on_serialized = on.snapshot_config().expect("etd serializes");
    let off_serialized = off.snapshot_config().expect("etd serializes");

    let mut on_restored = EtdDispatch::default();
    on_restored.restore_config(&on_serialized).unwrap();
    let mut off_restored = EtdDispatch::default();
    off_restored.restore_config(&off_serialized).unwrap();

    assert_eq!(
        on_restored.candidate_limit(),
        Some(crate::dispatch::DEFAULT_CANDIDATE_LIMIT)
    );
    assert_eq!(off_restored.candidate_limit(), None);
}
