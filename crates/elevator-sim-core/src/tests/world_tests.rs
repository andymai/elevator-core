use crate::components::*;
use crate::door::DoorState;
use crate::ids::GroupId;
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
    world.positions.insert(id, Position { value: 42.0 });
    world.stop_data.insert(id, StopData {
        name: "Test".into(),
        position: 42.0,
    });

    assert!(world.positions.contains_key(id));
    assert!(world.stop_data.contains_key(id));

    world.despawn(id);

    assert!(!world.is_alive(id));
    assert!(!world.positions.contains_key(id));
    assert!(!world.stop_data.contains_key(id));
    assert_eq!(world.entity_count(), 0);
}

#[test]
fn elevator_query_returns_entities_with_both_components() {
    let mut world = World::new();

    // Entity with both Position + ElevatorCar.
    let elev_id = world.spawn();
    world.positions.insert(elev_id, Position { value: 10.0 });
    world.elevator_cars.insert(elev_id, ElevatorCar {
        state: ElevatorState::Idle,
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
        group: GroupId(0),
    });

    // Entity with only Position (a stop, not an elevator).
    let stop_id = world.spawn();
    world.positions.insert(stop_id, Position { value: 0.0 });

    let elevators: Vec<_> = world.elevators().collect();
    assert_eq!(elevators.len(), 1);
    assert_eq!(elevators[0].0, elev_id);
    assert_eq!(elevators[0].1.value, 10.0);
}

#[test]
fn rider_query() {
    let mut world = World::new();

    let p1 = world.spawn();
    let origin = world.spawn();
    world.rider_data.insert(p1, RiderData {
        weight: 70.0,
        state: RiderState::Waiting,
        current_stop: Some(origin),
        spawn_tick: 0,
        board_tick: None,
    });

    let riders: Vec<_> = world.riders().collect();
    assert_eq!(riders.len(), 1);
    assert_eq!(riders[0].1.weight, 70.0);
}

#[test]
fn find_stop_at_position() {
    let mut world = World::new();

    let s0 = world.spawn();
    world.stop_data.insert(s0, StopData {
        name: "Ground".into(),
        position: 0.0,
    });

    let s1 = world.spawn();
    world.stop_data.insert(s1, StopData {
        name: "Roof".into(),
        position: 100.0,
    });

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

    world.positions.insert(a, Position { value: 1.0 });
    world.positions.insert(b, Position { value: 2.0 });
    world.positions.insert(c, Position { value: 3.0 });

    world.despawn(b);

    assert!(world.is_alive(a));
    assert!(!world.is_alive(b));
    assert!(world.is_alive(c));
    assert_eq!(world.positions.len(), 2);
    assert_eq!(world.entity_count(), 2);
}

#[test]
fn stop_position_helper() {
    let mut world = World::new();
    let s = world.spawn();
    world.stop_data.insert(s, StopData {
        name: "Test".into(),
        position: 42.5,
    });

    assert_eq!(world.stop_position(s), Some(42.5));

    let fake = world.spawn();
    assert_eq!(world.stop_position(fake), None);
}
