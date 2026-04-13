use std::collections::HashSet;

use crate::components::*;
use crate::door::DoorState;
use crate::world::World;

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
            max_speed: 2.0,
            acceleration: 1.5,
            deceleration: 2.0,
            weight_capacity: 800.0,
            current_load: 0.0,
            riders: vec![],
            target_stop: None,
            door_transition_ticks: 15,
            door_open_ticks: 60,
            line: crate::entity::EntityId::default(),
            repositioning: false,
            restricted_stops: HashSet::new(),
            inspection_speed_factor: 0.25,
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
            weight: 70.0,
            phase: RiderPhase::Waiting,
            current_stop: Some(origin),
            spawn_tick: 0,
            board_tick: None,
        },
    );

    let riders: Vec<_> = world.iter_riders().collect();
    assert_eq!(riders.len(), 1);
    assert!((riders[0].1.weight - 70.0).abs() < f64::EPSILON);
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
    world.insert_ext(e, VipTag { level: 3 }, "vip_tag");
    assert_eq!(world.get_ext::<VipTag>(e), Some(VipTag { level: 3 }));

    world.get_ext_mut::<VipTag>(e).unwrap().level = 5;
    assert_eq!(world.get_ext::<VipTag>(e).unwrap().level, 5);

    // Despawn cleans up extensions.
    world.despawn(e);
    assert!(world.get_ext::<VipTag>(e).is_none());
}
