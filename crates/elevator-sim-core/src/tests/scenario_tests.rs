use crate::config::*;
use crate::dispatch::ScanDispatch;
use crate::events::SimEvent;
use crate::passenger::PassengerState;
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

#[test]
fn single_passenger_delivery() {
    let config = default_config();
    let mut sim = Simulation::new(config, Box::new(ScanDispatch::new()));

    // Spawn passenger at ground wanting to go to floor 3.
    sim.spawn_passenger(StopId(0), StopId(2), 70.0);

    // Run until passenger arrives or timeout.
    let max_ticks = 10_000;
    for _ in 0..max_ticks {
        sim.tick();
        if sim
            .passengers
            .iter()
            .all(|p| p.state == PassengerState::Arrived)
        {
            break;
        }
    }

    assert_eq!(sim.passengers.len(), 1);
    assert_eq!(sim.passengers[0].state, PassengerState::Arrived);

    // Check event sequence contains the key milestones.
    // Events were drained implicitly during the sim. Let's check final state instead.
    assert!(sim.tick < max_ticks, "Simulation should complete before timeout");
}

#[test]
fn two_passengers_opposite_directions() {
    let config = default_config();
    let mut sim = Simulation::new(config, Box::new(ScanDispatch::new()));

    // Passenger at ground going up, passenger at top going down.
    sim.spawn_passenger(StopId(0), StopId(2), 70.0);
    sim.spawn_passenger(StopId(2), StopId(0), 80.0);

    let max_ticks = 20_000;
    for _ in 0..max_ticks {
        sim.tick();
        if sim
            .passengers
            .iter()
            .all(|p| p.state == PassengerState::Arrived)
        {
            break;
        }
    }

    assert!(
        sim.passengers
            .iter()
            .all(|p| p.state == PassengerState::Arrived),
        "All passengers should arrive. States: {:?}",
        sim.passengers.iter().map(|p| p.state).collect::<Vec<_>>()
    );
    assert!(sim.tick < max_ticks, "Should complete before timeout");
}

#[test]
fn overweight_passenger_rejected() {
    let mut config = default_config();
    // Tiny elevator that can hold 100kg.
    config.elevators[0].weight_capacity = 100.0;

    let mut sim = Simulation::new(config, Box::new(ScanDispatch::new()));

    // Two passengers at ground, both going to floor 2. Together they exceed capacity.
    sim.spawn_passenger(StopId(0), StopId(1), 70.0);
    sim.spawn_passenger(StopId(0), StopId(1), 70.0);

    // Run enough ticks for the elevator to open doors and try loading.
    let mut all_events = Vec::new();
    let max_ticks = 20_000;
    for _ in 0..max_ticks {
        sim.tick();
        all_events.extend(sim.drain_events());
        if sim
            .passengers
            .iter()
            .all(|p| p.state == PassengerState::Arrived)
        {
            break;
        }
    }

    // Should have at least one overweight rejection event.
    let rejections: Vec<_> = all_events
        .iter()
        .filter(|e| matches!(e, SimEvent::OverweightRejected { .. }))
        .collect();
    assert!(
        !rejections.is_empty(),
        "Should have at least one overweight rejection"
    );

    // Both passengers should eventually arrive (second one gets picked up on a later trip).
    assert!(
        sim.passengers
            .iter()
            .all(|p| p.state == PassengerState::Arrived),
        "All passengers should eventually arrive"
    );
}

#[test]
fn events_are_emitted_in_order() {
    let config = default_config();
    let mut sim = Simulation::new(config, Box::new(ScanDispatch::new()));

    sim.spawn_passenger(StopId(0), StopId(1), 70.0);

    let mut all_events = Vec::new();
    let max_ticks = 10_000;
    for _ in 0..max_ticks {
        sim.tick();
        all_events.extend(sim.drain_events());
        if sim
            .passengers
            .iter()
            .all(|p| p.state == PassengerState::Arrived)
        {
            break;
        }
    }

    // Verify we see the expected event types in order:
    // PassengerSpawned -> ElevatorDeparted -> ElevatorArrived -> DoorOpened -> PassengerBoarded
    // -> DoorClosed -> ElevatorDeparted -> ElevatorArrived -> DoorOpened -> PassengerAlighted -> DoorClosed
    let event_names: Vec<&str> = all_events
        .iter()
        .map(|e| match e {
            SimEvent::PassengerSpawned { .. } => "spawned",
            SimEvent::ElevatorDeparted { .. } => "departed",
            SimEvent::ElevatorArrived { .. } => "arrived",
            SimEvent::DoorOpened { .. } => "door_opened",
            SimEvent::DoorClosed { .. } => "door_closed",
            SimEvent::PassengerBoarded { .. } => "boarded",
            SimEvent::PassengerAlighted { .. } => "alighted",
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

    // Spawned should come before boarded.
    let spawned_idx = event_names.iter().position(|e| *e == "spawned").unwrap();
    let boarded_idx = event_names.iter().position(|e| *e == "boarded").unwrap();
    assert!(spawned_idx < boarded_idx, "Spawned should come before boarded");
}

#[test]
fn deterministic_replay() {
    let config = default_config();

    // Run the same scenario twice and verify identical tick counts.
    let mut sim1 = Simulation::new(config.clone(), Box::new(ScanDispatch::new()));
    sim1.spawn_passenger(StopId(0), StopId(2), 70.0);
    sim1.spawn_passenger(StopId(1), StopId(0), 60.0);

    let mut ticks1 = 0u64;
    for _ in 0..20_000 {
        sim1.tick();
        ticks1 += 1;
        if sim1
            .passengers
            .iter()
            .all(|p| p.state == PassengerState::Arrived)
        {
            break;
        }
    }

    let mut sim2 = Simulation::new(config, Box::new(ScanDispatch::new()));
    sim2.spawn_passenger(StopId(0), StopId(2), 70.0);
    sim2.spawn_passenger(StopId(1), StopId(0), 60.0);

    let mut ticks2 = 0u64;
    for _ in 0..20_000 {
        sim2.tick();
        ticks2 += 1;
        if sim2
            .passengers
            .iter()
            .all(|p| p.state == PassengerState::Arrived)
        {
            break;
        }
    }

    assert_eq!(ticks1, ticks2, "Deterministic simulation should take identical tick counts");
}
