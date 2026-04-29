use crate::components::{Accel, Speed, Weight};
use std::collections::HashSet;

use crate::components::*;
use crate::door::DoorState;
use crate::world::{ExtKey, World};

#[test]
fn spawn_and_check_alive() {
    let mut world = World::new();
    let id = world.spawn();
    assert!(world.is_alive(id));
    assert_eq!(world.entity_count(), 1);
}

#[test]
fn despawn_removes_entity_and_components() {
    let mut world = World::new();
    let id = world.spawn();
    world.set_position(id, Position { value: 42.0 });
    world.set_stop(
        id,
        Stop {
            name: "Test".into(),
            position: 42.0,
        },
    );

    assert!(world.position(id).is_some());
    assert!(world.stop(id).is_some());

    world.despawn(id);

    assert!(!world.is_alive(id));
    assert!(world.position(id).is_none());
    assert!(world.stop(id).is_none());
    assert_eq!(world.entity_count(), 0);
}

#[test]
fn elevator_query_returns_entities_with_both_components() {
    let mut world = World::new();

    // Entity with both Position + Elevator.
    let elev_id = world.spawn();
    world.set_position(elev_id, Position { value: 10.0 });
    world.set_elevator(
        elev_id,
        Elevator {
            phase: ElevatorPhase::Idle,
            door: DoorState::Closed,
            max_speed: Speed::from(2.0),
            acceleration: Accel::from(1.5),
            deceleration: Accel::from(2.0),
            weight_capacity: Weight::from(800.0),
            current_load: Weight::from(0.0),
            riders: vec![],
            target_stop: None,
            door_transition_ticks: 15,
            door_open_ticks: 60,
            line: crate::entity::EntityId::default(),
            repositioning: false,
            restricted_stops: HashSet::new(),
            inspection_speed_factor: 0.25,
            going_up: true,
            going_down: true,
            move_count: 0,
            door_command_queue: Vec::new(),
            manual_target_velocity: None,
            bypass_load_up_pct: None,
            bypass_load_down_pct: None,
            home_stop: None,
        },
    );

    // Entity with only Position (a stop, not an elevator).
    let stop_id = world.spawn();
    world.set_position(stop_id, Position { value: 0.0 });

    let elevators: Vec<_> = world.iter_elevators().collect();
    assert_eq!(elevators.len(), 1);
    assert_eq!(elevators[0].0, elev_id);
    assert!((elevators[0].1.value - 10.0).abs() < f64::EPSILON);
}

#[test]
fn rider_query() {
    let mut world = World::new();

    let p1 = world.spawn();
    let origin = world.spawn();
    world.set_rider(
        p1,
        Rider {
            weight: Weight::from(70.0),
            phase: RiderPhase::Waiting,
            current_stop: Some(origin),
            spawn_tick: 0,
            tag: 0,
            board_tick: None,
        },
    );

    let riders: Vec<_> = world.iter_riders().collect();
    assert_eq!(riders.len(), 1);
    assert!((riders[0].1.weight.value() - 70.0).abs() < f64::EPSILON);
}

#[test]
fn find_stop_at_position() {
    let mut world = World::new();

    let s0 = world.spawn();
    world.set_stop(
        s0,
        Stop {
            name: "Ground".into(),
            position: 0.0,
        },
    );

    let s1 = world.spawn();
    world.set_stop(
        s1,
        Stop {
            name: "Roof".into(),
            position: 100.0,
        },
    );

    assert_eq!(world.find_stop_at_position(0.0), Some(s0));
    assert_eq!(world.find_stop_at_position(100.0), Some(s1));
    assert_eq!(world.find_stop_at_position(50.0), None);
}

#[test]
fn find_stop_at_position_in_disambiguates_co_located_stops() {
    // Two stops at the same physical position — global lookup is
    // ambiguous; the per-line variant must respect the candidates
    // filter so callers get the stop they actually meant.
    let mut world = World::new();
    let s_low = world.spawn();
    world.set_stop(
        s_low,
        Stop {
            name: "Lobby (low bank)".into(),
            position: 0.0,
        },
    );
    let s_high = world.spawn();
    world.set_stop(
        s_high,
        Stop {
            name: "Lobby (high bank)".into(),
            position: 0.0,
        },
    );

    // Asking for stops on the "high bank" line returns s_high regardless
    // of which one wins the global linear scan.
    let high_bank_stops = [s_high];
    assert_eq!(
        world.find_stop_at_position_in(0.0, &high_bank_stops),
        Some(s_high)
    );

    let low_bank_stops = [s_low];
    assert_eq!(
        world.find_stop_at_position_in(0.0, &low_bank_stops),
        Some(s_low)
    );

    // No candidates → None even when stops exist at the position.
    assert_eq!(world.find_stop_at_position_in(0.0, &[]), None);

    // Candidates at a different position → None.
    let other_stops = [s_low];
    assert_eq!(world.find_stop_at_position_in(50.0, &other_stops), None);
}

#[test]
fn multiple_entities_independent() {
    let mut world = World::new();
    let a = world.spawn();
    let b = world.spawn();
    let c = world.spawn();

    world.set_position(a, Position { value: 1.0 });
    world.set_position(b, Position { value: 2.0 });
    world.set_position(c, Position { value: 3.0 });

    world.despawn(b);

    assert!(world.is_alive(a));
    assert!(!world.is_alive(b));
    assert!(world.is_alive(c));
    assert_eq!(world.entity_count(), 2);
}

#[test]
fn stop_position_helper() {
    let mut world = World::new();
    let s = world.spawn();
    world.set_stop(
        s,
        Stop {
            name: "Test".into(),
            position: 42.5,
        },
    );

    assert_eq!(world.stop_position(s), Some(42.5));

    let fake = world.spawn();
    assert_eq!(world.stop_position(fake), None);
}

#[test]
fn extension_components() {
    #[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
    struct VipTag {
        level: u32,
    }

    let mut world = World::new();
    let e = world.spawn();

    // Insert, get, mutate.
    world.insert_ext(e, VipTag { level: 3 }, ExtKey::from_type_name());
    assert_eq!(world.ext::<VipTag>(e), Some(VipTag { level: 3 }));

    world.ext_mut::<VipTag>(e).unwrap().level = 5;
    assert_eq!(world.ext::<VipTag>(e).unwrap().level, 5);

    // Despawn cleans up extensions.
    world.despawn(e);
    assert!(world.ext::<VipTag>(e).is_none());
}

/// `register_ext` panics if a different type already owns this name (#262).
/// Two extension types sharing one `ExtKey` name silently corrupts snapshot
/// serde — `serialize_extensions` collapses both into one slot, and
/// `deserialize_extensions` routes data via non-deterministic `HashMap::iter`.
#[test]
#[should_panic(expected = "already registered")]
fn register_ext_panics_on_name_collision_via_register() {
    #[derive(serde::Serialize, serde::Deserialize)]
    struct A;
    #[derive(serde::Serialize, serde::Deserialize)]
    struct B;

    let mut world = World::new();
    world.register_ext::<A>(ExtKey::new("foo"));
    world.register_ext::<B>(ExtKey::new("foo")); // same name, different type → panic
}

#[test]
#[should_panic(expected = "already registered")]
fn register_ext_panics_on_name_collision_via_insert() {
    #[derive(serde::Serialize, serde::Deserialize)]
    struct A;
    #[derive(serde::Serialize, serde::Deserialize)]
    struct B;

    let mut world = World::new();
    let e = world.spawn();
    world.insert_ext(e, A, ExtKey::new("foo"));
    world.insert_ext(e, B, ExtKey::new("foo")); // panic
}

#[test]
fn register_ext_same_type_same_name_idempotent() {
    // Re-registering the SAME type with the SAME name is a no-op (used for
    // snapshot restore where `register_ext` is called per-type before
    // `deserialize_extensions`).
    #[derive(serde::Serialize, serde::Deserialize)]
    struct A;

    let mut world = World::new();
    world.register_ext::<A>(ExtKey::new("foo"));
    world.register_ext::<A>(ExtKey::new("foo")); // idempotent — no panic
}

/// Verify that despawn cleans up `hall_calls` and `car_calls`.
#[test]
fn despawn_cleans_up_hall_and_car_calls() {
    let mut world = World::new();
    let stop_eid = world.spawn();
    world.set_stop(
        stop_eid,
        Stop {
            name: "S".into(),
            position: 0.0,
        },
    );

    let car_eid = world.spawn();
    world.set_elevator(
        car_eid,
        Elevator {
            phase: ElevatorPhase::Idle,
            door: DoorState::Closed,
            max_speed: Speed::from(2.0),
            acceleration: Accel::from(1.5),
            deceleration: Accel::from(2.0),
            weight_capacity: Weight::from(800.0),
            current_load: Weight::from(0.0),
            riders: vec![],
            target_stop: None,
            door_transition_ticks: 15,
            door_open_ticks: 60,
            line: crate::entity::EntityId::default(),
            repositioning: false,
            restricted_stops: HashSet::new(),
            inspection_speed_factor: 0.25,
            going_up: true,
            going_down: true,
            move_count: 0,
            door_command_queue: Vec::new(),
            manual_target_velocity: None,
            bypass_load_up_pct: None,
            bypass_load_down_pct: None,
            home_stop: None,
        },
    );

    // Populate car_calls for the elevator.
    if let Some(cc) = world.car_calls_mut(car_eid) {
        cc.push(crate::components::CarCall::new(car_eid, stop_eid, 0));
    }
    assert!(!world.car_calls(car_eid).is_empty());

    world.despawn(car_eid);
    assert!(
        world.car_calls(car_eid).is_empty(),
        "car_calls should be cleaned up after despawn"
    );
}
