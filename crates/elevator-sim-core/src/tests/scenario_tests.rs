use crate::components::RiderState;
use crate::config::*;
use crate::dispatch::scan::ScanDispatch;
use crate::events::SimEvent;
use crate::sim::Simulation;
use crate::stop::{StopConfig, StopId};

fn default_config() -> SimConfig {
    SimConfig {
        building: BuildingConfig {
            name: "Test Building".into(),
            stops: vec![
                StopConfig {
                    id: StopId(0),
                    name: "Ground".into(),
                    position: 0.0,
                },
                StopConfig {
                    id: StopId(1),
                    name: "Floor 2".into(),
                    position: 4.0,
                },
                StopConfig {
                    id: StopId(2),
                    name: "Floor 3".into(),
                    position: 8.0,
                },
            ],
        },
        elevators: vec![ElevatorConfig {
            id: 0,
            name: "Main".into(),
            max_speed: 2.0,
            acceleration: 1.5,
            deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 10,
            door_transition_ticks: 5,
        }],
        simulation: SimulationParams {
            ticks_per_second: 60.0,
        },
        passenger_spawning: PassengerSpawnConfig {
            mean_interval_ticks: 120,
            weight_range: (50.0, 100.0),
        },
    }
}

fn all_riders_arrived(sim: &Simulation) -> bool {
    sim.world.riders().all(|(_, r)| r.state == RiderState::Arrived)
}

#[test]
fn single_rider_delivery() {
    let config = default_config();
    let mut sim = Simulation::new(config, Box::new(ScanDispatch::new()));
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0);

    let max_ticks = 10_000;
    for _ in 0..max_ticks {
        sim.tick();
        if all_riders_arrived(&sim) {
            break;
        }
    }

    assert!(all_riders_arrived(&sim));
    assert!(sim.tick < max_ticks, "Should complete before timeout");
}

#[test]
fn two_riders_opposite_directions() {
    let config = default_config();
    let mut sim = Simulation::new(config, Box::new(ScanDispatch::new()));
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0);
    sim.spawn_rider_by_stop_id(StopId(2), StopId(0), 80.0);

    let max_ticks = 20_000;
    for _ in 0..max_ticks {
        sim.tick();
        if all_riders_arrived(&sim) {
            break;
        }
    }

    assert!(
        all_riders_arrived(&sim),
        "All riders should arrive. States: {:?}",
        sim.world
            .riders()
            .map(|(_, r)| r.state)
            .collect::<Vec<_>>()
    );
    assert!(sim.tick < max_ticks, "Should complete before timeout");
}

#[test]
fn two_riders_exceeding_capacity_delivered_in_two_trips() {
    let mut config = default_config();
    config.elevators[0].weight_capacity = 100.0;

    let mut sim = Simulation::new(config, Box::new(ScanDispatch::new()));
    sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 70.0);
    sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 70.0);

    let max_ticks = 20_000;
    for _ in 0..max_ticks {
        sim.tick();
        sim.drain_events();
        if all_riders_arrived(&sim) {
            break;
        }
    }

    assert!(all_riders_arrived(&sim), "All riders should eventually arrive");
}

#[test]
fn overweight_rider_rejected() {
    let mut config = default_config();
    config.elevators[0].weight_capacity = 50.0;

    let mut sim = Simulation::new(config, Box::new(ScanDispatch::new()));
    let light = sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 40.0).unwrap();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 60.0);

    let mut all_events = Vec::new();
    let max_ticks = 20_000;
    for _ in 0..max_ticks {
        sim.tick();
        all_events.extend(sim.drain_events());
        if sim.world.rider_data.get(light).map(|r| r.state) == Some(RiderState::Arrived) {
            break;
        }
    }

    assert_eq!(
        sim.world.rider_data.get(light).map(|r| r.state),
        Some(RiderState::Arrived)
    );

    let rejections: Vec<_> = all_events
        .iter()
        .filter(|e| matches!(e, SimEvent::RiderRejected { .. }))
        .collect();
    assert!(
        !rejections.is_empty(),
        "Should have at least one rejection for the 60kg rider"
    );
}

#[test]
fn events_are_emitted_in_order() {
    let config = default_config();
    let mut sim = Simulation::new(config, Box::new(ScanDispatch::new()));
    sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 70.0);

    let mut all_events = Vec::new();
    let max_ticks = 10_000;
    for _ in 0..max_ticks {
        sim.tick();
        all_events.extend(sim.drain_events());
        if all_riders_arrived(&sim) {
            break;
        }
    }

    let event_names: Vec<&str> = all_events
        .iter()
        .map(|e| match e {
            SimEvent::RiderSpawned { .. } => "spawned",
            SimEvent::ElevatorDeparted { .. } => "departed",
            SimEvent::ElevatorArrived { .. } => "arrived",
            SimEvent::DoorOpened { .. } => "door_opened",
            SimEvent::DoorClosed { .. } => "door_closed",
            SimEvent::RiderBoarded { .. } => "boarded",
            SimEvent::RiderAlighted { .. } => "alighted",
            _ => "other",
        })
        .collect();

    assert!(event_names.contains(&"spawned"));
    assert!(event_names.contains(&"departed"));
    assert!(event_names.contains(&"arrived"));
    assert!(event_names.contains(&"door_opened"));
    assert!(event_names.contains(&"boarded"));
    assert!(event_names.contains(&"alighted"));
    assert!(event_names.contains(&"door_closed"));

    let spawned_idx = event_names.iter().position(|e| *e == "spawned").unwrap();
    let boarded_idx = event_names.iter().position(|e| *e == "boarded").unwrap();
    assert!(spawned_idx < boarded_idx, "Spawned should come before boarded");
}

#[test]
fn deterministic_replay() {
    let config = default_config();

    let mut sim1 = Simulation::new(config.clone(), Box::new(ScanDispatch::new()));
    sim1.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0);
    sim1.spawn_rider_by_stop_id(StopId(1), StopId(0), 60.0);

    let mut ticks1 = 0u64;
    for _ in 0..20_000 {
        sim1.tick();
        ticks1 += 1;
        if all_riders_arrived(&sim1) {
            break;
        }
    }

    let mut sim2 = Simulation::new(config, Box::new(ScanDispatch::new()));
    sim2.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0);
    sim2.spawn_rider_by_stop_id(StopId(1), StopId(0), 60.0);

    let mut ticks2 = 0u64;
    for _ in 0..20_000 {
        sim2.tick();
        ticks2 += 1;
        if all_riders_arrived(&sim2) {
            break;
        }
    }

    assert_eq!(
        ticks1, ticks2,
        "Deterministic simulation should take identical tick counts"
    );
}
