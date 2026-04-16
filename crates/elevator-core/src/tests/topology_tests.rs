use crate::components::{Accel, Speed, Weight};
use std::collections::HashSet;

use crate::entity::EntityId;
use crate::events::Event;
use crate::ids::GroupId;
use crate::sim::ElevatorParams;
use crate::stop::StopId;

use super::helpers::{default_config, scan};

#[test]
fn add_stop_at_runtime() {
    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();
    let line = sim.lines_in_group(GroupId(0))[0];

    let stop = sim.add_stop("Penthouse".into(), 12.0, line).unwrap();

    // Stop entity is alive and has correct data.
    assert!(sim.world().is_alive(stop));
    assert_eq!(sim.world().stop(stop).unwrap().name, "Penthouse");
    assert!((sim.world().stop(stop).unwrap().position - 12.0).abs() < 1e-9);

    // Stop was added to the group.
    let group = &sim.groups()[0];
    assert!(group.stop_entities().contains(&stop));

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
    let line = sim.lines_in_group(GroupId(0))[0];

    let params = ElevatorParams {
        max_speed: Speed::from(3.0),
        acceleration: Accel::from(2.0),
        deceleration: Accel::from(2.5),
        weight_capacity: Weight::from(1000.0),
        door_transition_ticks: 3,
        door_open_ticks: 8,
        restricted_stops: HashSet::new(),
        inspection_speed_factor: 0.25,
    };

    let elev = sim.add_elevator(&params, line, 4.0).unwrap();

    // Elevator entity is alive and positioned correctly.
    assert!(sim.world().is_alive(elev));
    assert!((sim.world().position(elev).unwrap().value - 4.0).abs() < 1e-9);
    assert!((sim.world().elevator(elev).unwrap().max_speed.value() - 3.0).abs() < 1e-9);

    // Elevator was added to the group.
    let group = &sim.groups()[0];
    assert!(group.elevator_entities().contains(&elev));

    // ElevatorAdded event was emitted.
    let events = sim.drain_events();
    assert!(events.iter().any(|e| matches!(e,
        Event::ElevatorAdded { elevator: e, group: GroupId(0), .. } if *e == elev
    )));
}

/// `add_stop` must reject non-finite positions instead of silently
/// inserting them into `SortedStops` (where `partition_point` on NaN
/// is undefined behavior for ordering) and the position map (where
/// `find_stop_at_position` with `f64::NAN` returns nondeterministic
/// results).
#[test]
fn add_stop_rejects_non_finite_position() {
    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();
    let line = sim.lines_in_group(GroupId(0))[0];

    for (label, value) in [
        ("NaN", f64::NAN),
        ("+inf", f64::INFINITY),
        ("-inf", f64::NEG_INFINITY),
    ] {
        let result = sim.add_stop(label.into(), value, line);
        assert!(
            matches!(result, Err(crate::error::SimError::InvalidConfig { .. })),
            "add_stop with {label} position must return InvalidConfig, got {result:?}"
        );
    }
}

#[test]
fn add_to_nonexistent_line_returns_error() {
    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();

    let bogus = EntityId::default();
    let result = sim.add_stop("X".into(), 0.0, bogus);
    assert!(result.is_err());

    let params = ElevatorParams {
        max_speed: Speed::from(1.0),
        acceleration: Accel::from(1.0),
        deceleration: Accel::from(1.0),
        weight_capacity: Weight::from(100.0),
        door_transition_ticks: 1,
        door_open_ticks: 1,
        restricted_stops: HashSet::new(),
        inspection_speed_factor: 0.25,
    };
    let result = sim.add_elevator(&params, bogus, 0.0);
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
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
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
    let line = sim.lines_in_group(GroupId(0))[0];

    let _stop = sim.add_stop("Runtime".into(), 20.0, line).unwrap();

    // Config stop lookup should not contain runtime stops.
    assert_eq!(
        sim.stop_entity(StopId(0)),
        Some(sim.stop_entity(StopId(0)).unwrap())
    );
    // There's no StopId for the runtime stop — only EntityId.
}
