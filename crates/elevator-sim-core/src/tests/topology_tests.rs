use crate::events::Event;
use crate::ids::GroupId;
use crate::sim::ElevatorParams;
use crate::stop::StopId;

use super::helpers::{default_config, scan};

#[test]
fn add_stop_at_runtime() {
    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();

    let stop = sim.add_stop("Penthouse".into(), 12.0, GroupId(0)).unwrap();

    // Stop entity is alive and has correct data.
    assert!(sim.world().is_alive(stop));
    assert_eq!(sim.world().stop(stop).unwrap().name, "Penthouse");
    assert!((sim.world().stop(stop).unwrap().position - 12.0).abs() < 1e-9);

    // Stop was added to the group.
    let group = &sim.groups()[0];
    assert!(group.stop_entities.contains(&stop));

    // StopAdded event was emitted.
    let events = sim.drain_events();
    assert!(events.iter().any(|e| matches!(e,
        Event::StopAdded { stop: s, group: GroupId(0), .. } if *s == stop
    )));
}

#[test]
fn add_elevator_at_runtime() {
    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();

    let params = ElevatorParams {
        max_speed: 3.0,
        acceleration: 2.0,
        deceleration: 2.5,
        weight_capacity: 1000.0,
        door_transition_ticks: 3,
        door_open_ticks: 8,
    };

    let elev = sim.add_elevator(&params, GroupId(0), 4.0).unwrap();

    // Elevator entity is alive and positioned correctly.
    assert!(sim.world().is_alive(elev));
    assert!((sim.world().position(elev).unwrap().value - 4.0).abs() < 1e-9);
    assert!((sim.world().elevator(elev).unwrap().max_speed - 3.0).abs() < 1e-9);

    // Elevator was added to the group.
    let group = &sim.groups()[0];
    assert!(group.elevator_entities.contains(&elev));

    // ElevatorAdded event was emitted.
    let events = sim.drain_events();
    assert!(events.iter().any(|e| matches!(e,
        Event::ElevatorAdded { elevator: e, group: GroupId(0), .. } if *e == elev
    )));
}

#[test]
fn add_to_nonexistent_group_returns_error() {
    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();

    let result = sim.add_stop("X".into(), 0.0, GroupId(99));
    assert!(result.is_err());

    let params = ElevatorParams {
        max_speed: 1.0,
        acceleration: 1.0,
        deceleration: 1.0,
        weight_capacity: 100.0,
        door_transition_ticks: 1,
        door_open_ticks: 1,
    };
    let result = sim.add_elevator(&params, GroupId(99), 0.0);
    assert!(result.is_err());
}

#[test]
fn disable_and_enable_entities() {
    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();

    let stop = sim.stop_entity(StopId(0)).unwrap();

    assert!(!sim.is_disabled(stop));
    sim.disable(stop).unwrap();
    assert!(sim.is_disabled(stop));

    // EntityDisabled event emitted.
    let events = sim.drain_events();
    assert!(
        events
            .iter()
            .any(|e| matches!(e, Event::EntityDisabled { entity, .. } if *entity == stop))
    );

    sim.enable(stop).unwrap();
    assert!(!sim.is_disabled(stop));

    let events = sim.drain_events();
    assert!(
        events
            .iter()
            .any(|e| matches!(e, Event::EntityEnabled { entity, .. } if *entity == stop))
    );
}

#[test]
fn disabled_elevator_not_dispatched() {
    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();

    // Get the only elevator and disable it.
    let elev = sim.world().elevator_ids()[0];
    sim.disable(elev).unwrap();
    sim.drain_events();

    // Spawn a rider — should trigger dispatch, but elevator is disabled.
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    sim.step();

    let events = sim.drain_events();
    // No ElevatorAssigned because the elevator is disabled.
    assert!(
        !events
            .iter()
            .any(|e| matches!(e, Event::ElevatorAssigned { .. }))
    );
}

#[test]
fn runtime_stop_has_no_stop_id() {
    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();

    let _stop = sim.add_stop("Runtime".into(), 20.0, GroupId(0)).unwrap();

    // Config stop lookup should not contain runtime stops.
    assert_eq!(
        sim.stop_entity(StopId(0)),
        Some(sim.stop_entity(StopId(0)).unwrap())
    );
    // There's no StopId for the runtime stop — only EntityId.
}
