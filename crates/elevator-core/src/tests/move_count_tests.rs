//! Tests for the `move_count` elevator counter and `total_moves` aggregate.

use crate::components::RiderPhase;
use crate::components::{Accel, Speed, Weight};
use crate::config::*;
use crate::dispatch::scan::ScanDispatch;
use crate::sim::Simulation;
use crate::stop::{StopConfig, StopId};
use crate::tests::helpers;

fn two_elevator_config() -> SimConfig {
    SimConfig {
        schema_version: crate::config::CURRENT_CONFIG_SCHEMA_VERSION,
        building: BuildingConfig {
            name: "Test".into(),
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
        elevators: vec![
            ElevatorConfig {
                id: 0,
                name: "E1".into(),
                max_speed: Speed::from(2.0),
                acceleration: Accel::from(1.5),
                deceleration: Accel::from(2.0),
                weight_capacity: Weight::from(800.0),
                starting_stop: StopId(0),
                door_open_ticks: 5,
                door_transition_ticks: 3,
                restricted_stops: Vec::new(),
                #[cfg(feature = "energy")]
                energy_profile: None,
                service_mode: None,
                inspection_speed_factor: 0.25,

                bypass_load_up_pct: None,

                bypass_load_down_pct: None,
            },
            ElevatorConfig {
                id: 1,
                name: "E2".into(),
                max_speed: Speed::from(2.0),
                acceleration: Accel::from(1.5),
                deceleration: Accel::from(2.0),
                weight_capacity: Weight::from(800.0),
                starting_stop: StopId(2),
                door_open_ticks: 5,
                door_transition_ticks: 3,
                restricted_stops: Vec::new(),
                #[cfg(feature = "energy")]
                energy_profile: None,
                service_mode: None,
                inspection_speed_factor: 0.25,

                bypass_load_up_pct: None,

                bypass_load_down_pct: None,
            },
        ],
        simulation: SimulationParams {
            ticks_per_second: 60.0,
        },
        passenger_spawning: PassengerSpawnConfig {
            mean_interval_ticks: 120,
            weight_range: (50.0, 100.0),
        },
    }
}

#[test]
fn move_count_starts_at_zero() {
    let config = helpers::default_config();
    let sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let elev = sim
        .world()
        .iter_elevators()
        .next()
        .map(|(id, _, _)| id)
        .unwrap();

    assert_eq!(sim.elevator_move_count(elev), Some(0));
    assert_eq!(sim.metrics().total_moves(), 0);
}

#[test]
fn move_count_increments_on_arrival() {
    let config = helpers::default_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let elev = sim
        .world()
        .iter_elevators()
        .next()
        .map(|(id, _, _)| id)
        .unwrap();

    // Rider 0 -> 1: elevator moves past zero stops, arrives at stop 1. 1 move.
    sim.spawn_rider(StopId(0), StopId(1), 70.0).unwrap();

    for _ in 0..2000 {
        sim.step();
        let all_arrived = sim
            .world()
            .iter_riders()
            .all(|(_, r)| r.phase == RiderPhase::Arrived);
        if all_arrived {
            break;
        }
    }

    assert_eq!(
        sim.elevator_move_count(elev),
        Some(1),
        "one arrival = one move"
    );
    assert_eq!(sim.metrics().total_moves(), 1);
}

#[test]
fn move_count_counts_passing_floors() {
    let config = helpers::default_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let elev = sim
        .world()
        .iter_elevators()
        .next()
        .map(|(id, _, _)| id)
        .unwrap();

    // Rider 0 -> 2: elevator passes stop 1, arrives at stop 2. 2 moves.
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    for _ in 0..2000 {
        sim.step();
        let all_arrived = sim
            .world()
            .iter_riders()
            .all(|(_, r)| r.phase == RiderPhase::Arrived);
        if all_arrived {
            break;
        }
    }

    assert_eq!(
        sim.elevator_move_count(elev),
        Some(2),
        "1 passing floor + 1 arrival"
    );
    assert_eq!(sim.metrics().total_moves(), 2);
}

#[test]
fn total_moves_aggregates_across_elevators() {
    let config = two_elevator_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    // Elevator 0 starts at stop 0 (pos 0), elevator 1 starts at stop 2 (pos 10).
    // Spawn one rider 0 -> 2 (goes up, picked up by E1 — 2 moves)
    // and one rider 2 -> 0 (goes down, picked up by E2 — 2 moves).
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.spawn_rider(StopId(2), StopId(0), 70.0).unwrap();

    for _ in 0..3000 {
        sim.step();
        let all_arrived = sim
            .world()
            .iter_riders()
            .all(|(_, r)| r.phase == RiderPhase::Arrived);
        if all_arrived {
            break;
        }
    }

    // Sum of all elevator move counts should equal total_moves.
    let counts: Vec<u64> = sim
        .world()
        .iter_elevators()
        .map(|(_, _, e)| e.move_count())
        .collect();
    let sum: u64 = counts.iter().sum();
    assert_eq!(sim.metrics().total_moves(), sum);
    // Both elevators must have moved at least twice (pickup + delivery legs).
    assert!(
        counts.iter().all(|&c| c >= 2),
        "each elevator should make >= 2 moves, got {counts:?}"
    );
    // Aggregate must reflect all moves across both elevators.
    assert!(
        sim.metrics().total_moves() >= 4,
        "total_moves should aggregate across elevators"
    );
}

#[test]
fn move_count_zero_when_stationary() {
    // Build sim WITHOUT the default passenger spawner by using a config with
    // no spawns. Our helpers::default_config() has a passenger_spawning config
    // but the simulation only spawns when the host app tells it to — stepping
    // alone should not spawn riders.
    let config = helpers::default_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let elev = sim
        .world()
        .iter_elevators()
        .next()
        .map(|(id, _, _)| id)
        .unwrap();

    for _ in 0..100 {
        sim.step();
    }

    assert_eq!(sim.elevator_move_count(elev), Some(0));
    assert_eq!(sim.metrics().total_moves(), 0);
}

#[test]
fn move_count_persists_across_snapshot() {
    let config = helpers::default_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    for _ in 0..2000 {
        sim.step();
        let all_arrived = sim
            .world()
            .iter_riders()
            .all(|(_, r)| r.phase == RiderPhase::Arrived);
        if all_arrived {
            break;
        }
    }

    let moves_before = sim.metrics().total_moves();
    assert!(moves_before > 0, "precondition: some moves occurred");

    let elev = sim
        .world()
        .iter_elevators()
        .next()
        .map(|(id, _, _)| id)
        .unwrap();
    let per_elev_before = sim.elevator_move_count(elev).unwrap();

    let snap = sim.snapshot();
    let restored = snap.restore(None).unwrap();

    assert_eq!(restored.metrics().total_moves(), moves_before);
    let restored_elev = restored
        .world()
        .iter_elevators()
        .next()
        .map(|(id, _, _)| id)
        .unwrap();
    assert_eq!(
        restored.elevator_move_count(restored_elev),
        Some(per_elev_before)
    );
}

/// Regression for greptile P1: the arrival increment lived in the non-reposition
/// branch, so a repositioning elevator that crossed intermediate floors credited
/// the passing moves but not the final arrival — breaking the
/// "every rounded-floor crossing (passing + arrival)" contract.
#[test]
fn move_count_counts_reposition_arrivals() {
    use crate::dispatch::reposition::ReturnToLobby;
    use crate::ids::GroupId;

    // Start the elevator at the top so ReturnToLobby has work to do.
    let mut config = helpers::default_config();
    config.elevators[0].starting_stop = StopId(2);

    let mut sim = crate::builder::SimulationBuilder::from_config(config)
        .reposition_for_group(
            GroupId(0),
            ReturnToLobby::new(),
            crate::dispatch::BuiltinReposition::ReturnToLobby,
        )
        .build()
        .unwrap();

    let elev = sim
        .world()
        .iter_elevators()
        .next()
        .map(|(id, _, _)| id)
        .unwrap();

    // Let the repositioning trip run to completion (top → lobby, passing stop 1).
    for _ in 0..3000 {
        sim.step();
        if sim
            .world()
            .elevator(elev)
            .is_some_and(|c| matches!(c.phase(), crate::components::ElevatorPhase::Idle))
        {
            break;
        }
    }

    // Expected: 1 passing (stop 1) + 1 arrival (stop 0) = 2 moves.
    let count = sim.elevator_move_count(elev).unwrap();
    assert!(
        count >= 2,
        "expected at least 2 moves (passing + arrival) during reposition, got {count}",
    );
    assert_eq!(
        count,
        sim.metrics().total_moves(),
        "aggregate must equal sum of per-elevator counts",
    );
}
