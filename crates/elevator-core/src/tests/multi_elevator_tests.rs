//! Tests for multi-elevator coordination.

use crate::components::RiderPhase;
use crate::config::*;
use crate::dispatch::scan::ScanDispatch;
use crate::sim::Simulation;
use crate::stop::{StopConfig, StopId};

fn two_elevator_config() -> SimConfig {
    SimConfig {
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
                max_speed: 2.0,
                acceleration: 1.5,
                deceleration: 2.0,
                weight_capacity: 800.0,
                starting_stop: StopId(0),
                door_open_ticks: 5,
                door_transition_ticks: 3,
                restricted_stops: Vec::new(),
                #[cfg(feature = "energy")]
                energy_profile: None,
                service_mode: None,
                inspection_speed_factor: 0.25,
            },
            ElevatorConfig {
                id: 1,
                name: "E2".into(),
                max_speed: 2.0,
                acceleration: 1.5,
                deceleration: 2.0,
                weight_capacity: 800.0,
                starting_stop: StopId(0),
                door_open_ticks: 5,
                door_transition_ticks: 3,
                restricted_stops: Vec::new(),
                #[cfg(feature = "energy")]
                energy_profile: None,
                service_mode: None,
                inspection_speed_factor: 0.25,
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
fn two_elevators_both_serve_demand() {
    let config = two_elevator_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    // Spawn riders going to different floors.
    for _ in 0..5 {
        sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    }

    // Run until all arrive.
    for _ in 0..3000 {
        sim.step();
        let all = sim
            .world()
            .iter_riders()
            .all(|(_, r)| r.phase == RiderPhase::Arrived);
        if all {
            break;
        }
    }

    let all = sim
        .world()
        .iter_riders()
        .all(|(_, r)| r.phase == RiderPhase::Arrived);
    assert!(all, "all riders should arrive with two elevators");
    assert_eq!(sim.metrics().total_delivered(), 5);
}

#[test]
fn disable_elevator_mid_route_ejects_riders() {
    let config = two_elevator_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    // Run until rider boards.
    let mut boarded_elevator = None;
    for _ in 0..500 {
        sim.step();
        if let Some(r) = sim.world().rider(rider)
            && let RiderPhase::Riding(eid) = r.phase
        {
            boarded_elevator = Some(eid);
            break;
        }
    }

    let elev = boarded_elevator.expect("rider should board within 500 ticks");

    // Disable the elevator the rider is on.
    sim.disable(elev).unwrap();

    // Check that rider was ejected.
    let events = sim.drain_events();
    let ejected = events.iter().any(|e| {
        matches!(
            e,
            crate::events::Event::RiderEjected {
                rider: r,
                ..
            } if *r == rider
        )
    });
    assert!(
        ejected,
        "rider should be ejected when their elevator is disabled"
    );
}
