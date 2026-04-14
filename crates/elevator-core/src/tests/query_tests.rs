use std::collections::HashSet;

use crate::components::{Elevator, ElevatorPhase, Position, Rider, RiderPhase, Stop, Velocity};
use crate::door::DoorState;
use crate::entity::EntityId;
use crate::query::Ext;
use crate::world::World;

fn test_world() -> (World, EntityId, EntityId, EntityId) {
    let mut w = World::new();

    // Entity A: rider + position
    let a = w.spawn();
    w.set_rider(
        a,
        Rider {
            weight: 70.0,
            phase: RiderPhase::Waiting,
            current_stop: None,
            spawn_tick: 0,
            board_tick: None,
        },
    );
    w.set_position(a, Position { value: 0.0 });

    // Entity B: elevator + position + velocity
    let b = w.spawn();
    w.set_position(b, Position { value: 4.0 });
    w.set_velocity(b, Velocity { value: 1.0 });
    w.set_elevator(
        b,
        Elevator {
            phase: ElevatorPhase::Idle,
            door: DoorState::Closed,
            max_speed: 2.0,
            acceleration: 1.0,
            deceleration: 1.0,
            weight_capacity: 800.0,
            current_load: 0.0,
            riders: vec![],
            target_stop: None,
            door_transition_ticks: 5,
            door_open_ticks: 10,
            line: EntityId::default(),
            repositioning: false,
            restricted_stops: HashSet::new(),
            inspection_speed_factor: 0.25,
            going_up: true,
            going_down: true,
            move_count: 0,
            door_command_queue: Vec::new(),
        },
    );

    // Entity C: stop + position
    let c = w.spawn();
    w.set_stop(
        c,
        Stop {
            name: "Ground".into(),
            position: 0.0,
        },
    );
    w.set_position(c, Position { value: 0.0 });

    (w, a, b, c)
}

#[test]
fn query_single_component() {
    let (w, _a, _b, c) = test_world();
    let stops: Vec<_> = w.query::<(EntityId, &Stop)>().iter().collect();
    assert_eq!(stops.len(), 1);
    assert_eq!(stops[0].0, c);
    assert_eq!(stops[0].1.name, "Ground");
}

#[test]
fn query_multi_component() {
    let (w, _a, b, _c) = test_world();
    // Only entity B has both Position and Velocity.
    let results: Vec<_> = w
        .query::<(EntityId, &Position, &Velocity)>()
        .iter()
        .collect();
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].0, b);
    assert!((results[0].1.value - 4.0).abs() < 1e-9);
    assert!((results[0].2.value - 1.0).abs() < 1e-9);
}

#[test]
fn query_with_filter() {
    let (w, _a, b, _c) = test_world();
    // All entities with Position that also have Elevator.
    let results: Vec<_> = w
        .query::<(EntityId, &Position)>()
        .with::<Elevator>()
        .iter()
        .collect();
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].0, b);
}

#[test]
fn query_without_filter() {
    let (w, a, _b, c) = test_world();
    // All entities with Position but NOT Elevator.
    let results: Vec<_> = w
        .query::<(EntityId, &Position)>()
        .without::<Elevator>()
        .iter()
        .collect();
    assert_eq!(results.len(), 2);
    let ids: Vec<_> = results.iter().map(|(id, _)| *id).collect();
    assert!(ids.contains(&a));
    assert!(ids.contains(&c));
}

#[test]
fn query_optional_component() {
    let (w, a, b, c) = test_world();
    // All entities with Position, optionally with Rider.
    let results: Vec<_> = w
        .query::<(EntityId, &Position, Option<&Rider>)>()
        .iter()
        .collect();
    assert_eq!(results.len(), 3); // a, b, c all have Position

    for (id, _pos, rider_opt) in &results {
        if *id == a {
            assert!(rider_opt.is_some());
        } else if *id == b || *id == c {
            assert!(rider_opt.is_none());
        }
    }
}

#[test]
fn query_get_single_entity() {
    let (w, a, b, _c) = test_world();
    let result = w.query::<(&Rider,)>().get(a);
    assert!(result.is_some());
    assert!((result.unwrap().0.weight - 70.0).abs() < 1e-9);

    // Non-matching entity.
    let result = w.query::<(&Rider,)>().get(b);
    assert!(result.is_none());
}

#[test]
fn query_extension_component() {
    #[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
    struct VipTag {
        level: u32,
    }

    let (mut w, a, b, _c) = test_world();
    w.insert_ext(a, VipTag { level: 3 }, "vip_tag");

    // Query for entities with Rider and VipTag extension.
    let results: Vec<_> = w
        .query::<(EntityId, &Rider, &Ext<VipTag>)>()
        .iter()
        .collect();
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].0, a);
    assert_eq!(results[0].2.level, 3);

    // Entity b has no VipTag.
    let result = w.query::<(&Ext<VipTag>,)>().get(b);
    assert!(result.is_none());
}

#[test]
fn query_ext_with_filter() {
    #[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
    struct Priority(#[allow(dead_code)] u32);

    let (mut w, a, b, c) = test_world();
    w.insert_ext(a, Priority(1), "priority");
    w.insert_ext(c, Priority(2), "priority");

    // Entities with Position that have Priority extension.
    let results: Vec<_> = w
        .query::<(EntityId, &Position)>()
        .ext_with::<Priority>()
        .iter()
        .collect();
    assert_eq!(results.len(), 2);
    let ids: Vec<_> = results.iter().map(|(id, _)| *id).collect();
    assert!(ids.contains(&a));
    assert!(ids.contains(&c));
    assert!(!ids.contains(&b));
}

#[test]
fn query_ext_without_filter() {
    #[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
    struct Marked;

    let (mut w, a, _b, _c) = test_world();
    w.insert_ext(a, Marked, "marked");

    // Riders without Marked extension.
    let count = w
        .query::<(EntityId, &Rider)>()
        .ext_without::<Marked>()
        .iter()
        .count();
    assert_eq!(count, 0); // Only entity a has Rider, and it has Marked
}

#[test]
fn query_empty_world() {
    let w = World::new();
    let count = w.query::<(EntityId, &Rider)>().iter().count();
    assert_eq!(count, 0);
}

#[test]
fn query_entity_id_only() {
    let (w, a, b, c) = test_world();
    let results: Vec<_> = w.query::<(EntityId,)>().iter().collect();
    assert_eq!(results.len(), 3);
    let ids: Vec<_> = results.iter().map(|(id,)| *id).collect();
    assert!(ids.contains(&a));
    assert!(ids.contains(&b));
    assert!(ids.contains(&c));
}
