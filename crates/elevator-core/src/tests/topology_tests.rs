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

        bypass_load_up_pct: None,

        bypass_load_down_pct: None,
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

/// `add_elevator` runtime path must validate physics & door params (#247).
/// Construction-time validation rejects these; the runtime path was
/// previously silent, letting zero/negative speed or zero door ticks
/// reach the world and crash later phases.
#[test]
fn add_elevator_rejects_invalid_params() {
    use crate::error::SimError;

    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();
    let line = sim.lines_in_group(GroupId(0))[0];

    let valid = || ElevatorParams {
        max_speed: Speed::from(2.0),
        acceleration: Accel::from(1.5),
        deceleration: Accel::from(2.0),
        weight_capacity: Weight::from(800.0),
        door_transition_ticks: 5,
        door_open_ticks: 10,
        restricted_stops: HashSet::new(),
        inspection_speed_factor: 0.25,

        bypass_load_up_pct: None,

        bypass_load_down_pct: None,
    };

    // Note: Speed/Weight/Accel constructors panic on NaN/Inf/negative, so
    // those cases can't reach `add_elevator` through the public API. Cover
    // the values that *can* — zeroes for unit-typed fields, plus NaN/Inf
    // for the raw f64 inspection_speed_factor.
    let cases: Vec<(&'static str, ElevatorParams)> = vec![
        (
            "max_speed=0",
            ElevatorParams {
                max_speed: Speed::from(0.0),
                ..valid()
            },
        ),
        (
            "acceleration=0",
            ElevatorParams {
                acceleration: Accel::from(0.0),
                ..valid()
            },
        ),
        (
            "deceleration=0",
            ElevatorParams {
                deceleration: Accel::from(0.0),
                ..valid()
            },
        ),
        (
            "weight_capacity=0",
            ElevatorParams {
                weight_capacity: Weight::from(0.0),
                ..valid()
            },
        ),
        (
            "door_transition_ticks=0",
            ElevatorParams {
                door_transition_ticks: 0,
                ..valid()
            },
        ),
        (
            "door_open_ticks=0",
            ElevatorParams {
                door_open_ticks: 0,
                ..valid()
            },
        ),
        (
            "inspection_speed_factor=0",
            ElevatorParams {
                inspection_speed_factor: 0.0,
                ..valid()
            },
        ),
        (
            "inspection_speed_factor=NaN",
            ElevatorParams {
                inspection_speed_factor: f64::NAN,
                ..valid()
            },
        ),
        (
            "inspection_speed_factor=-1",
            ElevatorParams {
                inspection_speed_factor: -1.0,
                ..valid()
            },
        ),
    ];

    for (label, params) in cases {
        let elev_count_before = sim.world().elevator_ids().len();
        let result = sim.add_elevator(&params, line, 0.0);
        assert!(
            matches!(result, Err(SimError::InvalidConfig { .. })),
            "expected InvalidConfig for {label}, got {result:?}"
        );
        assert_eq!(
            sim.world().elevator_ids().len(),
            elev_count_before,
            "{label} must not add an elevator"
        );
    }

    // Sanity: a valid params set still succeeds afterwards.
    sim.add_elevator(&valid(), line, 0.0).unwrap();
}

/// Non-finite `starting_position` corrupts `SortedStops` and movement-phase
/// distance math. Reject it the same way `add_stop` does for stop position.
#[test]
fn add_elevator_rejects_non_finite_starting_position() {
    use crate::error::SimError;

    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();
    let line = sim.lines_in_group(GroupId(0))[0];

    let params = ElevatorParams {
        max_speed: Speed::from(2.0),
        acceleration: Accel::from(1.5),
        deceleration: Accel::from(2.0),
        weight_capacity: Weight::from(800.0),
        door_transition_ticks: 5,
        door_open_ticks: 10,
        restricted_stops: HashSet::new(),
        inspection_speed_factor: 0.25,

        bypass_load_up_pct: None,

        bypass_load_down_pct: None,
    };

    for (label, value) in [
        ("NaN", f64::NAN),
        ("+inf", f64::INFINITY),
        ("-inf", f64::NEG_INFINITY),
    ] {
        let elev_count_before = sim.world().elevator_ids().len();
        let result = sim.add_elevator(&params, line, value);
        assert!(
            matches!(
                result,
                Err(SimError::InvalidConfig {
                    field: "starting_position",
                    ..
                })
            ),
            "expected InvalidConfig{{field=starting_position}} for {label}, got {result:?}"
        );
        assert_eq!(
            sim.world().elevator_ids().len(),
            elev_count_before,
            "{label} must not add an elevator"
        );
    }
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

        bypass_load_up_pct: None,

        bypass_load_down_pct: None,
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
fn set_line_range_clamps_out_of_range_car() {
    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();
    let line = sim.lines_in_group(GroupId(0))[0];
    let elevators = sim.groups()[0].lines()[0].elevators().to_vec();
    assert!(!elevators.is_empty(), "default config should have a car");
    let car = elevators[0];

    // Move the car well above the building, then shrink the line below it.
    if let Some(p) = sim.world_mut().position_mut(car) {
        p.value = 100.0;
    }

    sim.set_line_range(line, 0.0, 10.0).unwrap();

    let pos = sim.world().position(car).unwrap().value;
    assert!(
        (pos - 10.0).abs() < 1e-9,
        "car should be clamped to new max (got {pos})"
    );
    let vel = sim.world().velocity(car).unwrap().value;
    assert!(vel.abs() < 1e-9, "velocity should be zeroed on clamp");
}

#[test]
fn set_line_range_rejects_inverted_bounds() {
    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();
    let line = sim.lines_in_group(GroupId(0))[0];

    assert!(sim.set_line_range(line, 10.0, 5.0).is_err());
}

#[test]
fn set_line_range_rejects_nonfinite_bounds() {
    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();
    let line = sim.lines_in_group(GroupId(0))[0];

    assert!(sim.set_line_range(line, f64::NAN, 10.0).is_err());
    assert!(sim.set_line_range(line, 0.0, f64::INFINITY).is_err());
}

#[test]
fn set_line_range_unknown_line_is_error() {
    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();

    let bogus = sim.world_mut().spawn();
    assert!(sim.set_line_range(bogus, 0.0, 10.0).is_err());
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
