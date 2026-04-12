use crate::components::RiderPhase;
use crate::events::Event;
use crate::sim::Simulation;
use crate::stop::StopId;

use super::helpers::{all_riders_arrived, default_config, scan};

#[test]
fn single_rider_delivery() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();

    let max_ticks = 10_000;
    for _ in 0..max_ticks {
        sim.step();
        if all_riders_arrived(&sim) {
            break;
        }
    }

    assert!(all_riders_arrived(&sim));
    assert!(
        sim.current_tick() < max_ticks,
        "Should complete before timeout"
    );
}

#[test]
fn two_riders_opposite_directions() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    sim.spawn_rider_by_stop_id(StopId(2), StopId(0), 80.0)
        .unwrap();

    let max_ticks = 20_000;
    for _ in 0..max_ticks {
        sim.step();
        if all_riders_arrived(&sim) {
            break;
        }
    }

    assert!(
        all_riders_arrived(&sim),
        "All riders should arrive. Phases: {:?}",
        sim.world()
            .iter_riders()
            .map(|(_, r)| r.phase)
            .collect::<Vec<_>>()
    );
    assert!(
        sim.current_tick() < max_ticks,
        "Should complete before timeout"
    );
}

#[test]
fn two_riders_exceeding_capacity_delivered_in_two_trips() {
    let mut config = default_config();
    config.elevators[0].weight_capacity = 100.0;

    let mut sim = Simulation::new(&config, scan()).unwrap();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 70.0)
        .unwrap();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 70.0)
        .unwrap();

    let max_ticks = 20_000;
    for _ in 0..max_ticks {
        sim.step();
        sim.drain_events();
        if all_riders_arrived(&sim) {
            break;
        }
    }

    assert!(
        all_riders_arrived(&sim),
        "All riders should eventually arrive"
    );
}

#[test]
fn overweight_rider_rejected() {
    let mut config = default_config();
    config.elevators[0].weight_capacity = 50.0;

    let mut sim = Simulation::new(&config, scan()).unwrap();
    let light = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(1), 40.0)
        .unwrap();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 60.0)
        .unwrap();

    let mut all_events = Vec::new();
    let max_ticks = 20_000;
    for _ in 0..max_ticks {
        sim.step();
        all_events.extend(sim.drain_events());
        if sim.world().rider(light).map(|r| r.phase) == Some(RiderPhase::Arrived) {
            break;
        }
    }

    assert_eq!(
        sim.world().rider(light).map(|r| r.phase),
        Some(RiderPhase::Arrived)
    );

    let rejections: Vec<_> = all_events
        .iter()
        .filter(|e| matches!(e, Event::RiderRejected { .. }))
        .collect();
    assert!(
        !rejections.is_empty(),
        "Should have at least one rejection for the 60kg rider"
    );
}

#[test]
fn events_are_emitted_in_order() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 70.0)
        .unwrap();

    let mut all_events = Vec::new();
    let max_ticks = 10_000;
    for _ in 0..max_ticks {
        sim.step();
        all_events.extend(sim.drain_events());
        if all_riders_arrived(&sim) {
            break;
        }
    }

    let event_names: Vec<&str> = all_events
        .iter()
        .map(|e| match e {
            Event::RiderSpawned { .. } => "spawned",
            Event::ElevatorDeparted { .. } => "departed",
            Event::ElevatorArrived { .. } => "arrived",
            Event::DoorOpened { .. } => "door_opened",
            Event::DoorClosed { .. } => "door_closed",
            Event::RiderBoarded { .. } => "boarded",
            Event::RiderAlighted { .. } => "alighted",
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
    assert!(
        spawned_idx < boarded_idx,
        "Spawned should come before boarded"
    );
}

#[test]
fn deterministic_replay() {
    let config = default_config();

    let mut sim1 = Simulation::new(&config, scan()).unwrap();
    sim1.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    sim1.spawn_rider_by_stop_id(StopId(1), StopId(0), 60.0)
        .unwrap();

    let mut ticks1 = 0u64;
    for _ in 0..20_000 {
        sim1.step();
        ticks1 += 1;
        if all_riders_arrived(&sim1) {
            break;
        }
    }

    let mut sim2 = Simulation::new(&config, scan()).unwrap();
    sim2.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    sim2.spawn_rider_by_stop_id(StopId(1), StopId(0), 60.0)
        .unwrap();

    let mut ticks2 = 0u64;
    for _ in 0..20_000 {
        sim2.step();
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
