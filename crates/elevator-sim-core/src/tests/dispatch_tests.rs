use crate::components::*;
use crate::dispatch::scan::ScanDispatch;
use crate::dispatch::*;
use crate::door::DoorState;
use crate::ids::GroupId;
use crate::world::World;

/// Build a World with 4 stops and return (world, stop_entities).
fn test_world() -> (World, Vec<crate::entity::EntityId>) {
    let mut world = World::new();
    let stops: Vec<_> = [
        ("Ground", 0.0),
        ("Floor 2", 4.0),
        ("Floor 3", 8.0),
        ("Roof", 12.0),
    ]
    .iter()
    .map(|(name, pos)| {
        let eid = world.spawn();
        world.stop_data.insert(
            eid,
            StopData {
                name: (*name).into(),
                position: *pos,
            },
        );
        eid
    })
    .collect();
    (world, stops)
}

fn test_group(
    stop_entities: &[crate::entity::EntityId],
    elevator_entities: Vec<crate::entity::EntityId>,
) -> ElevatorGroup {
    ElevatorGroup {
        id: GroupId(0),
        name: "Default".into(),
        elevator_entities,
        stop_entities: stop_entities.to_vec(),
    }
}

fn spawn_elevator(world: &mut World, position: f64) -> crate::entity::EntityId {
    let eid = world.spawn();
    world.positions.insert(eid, Position { value: position });
    world.elevator_cars.insert(
        eid,
        ElevatorCar {
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
        },
    );
    eid
}

#[test]
fn no_requests_returns_idle() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 0.0);
    let group = test_group(&stops, vec![elev]);
    let manifest = DispatchManifest::default();
    let mut scan = ScanDispatch::new();

    let decision = scan.decide(elev, 0.0, &group, &manifest, &world);
    assert_eq!(decision, DispatchDecision::Idle);
}

#[test]
fn goes_to_nearest_stop_in_current_direction() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 0.0);
    let group = test_group(&stops, vec![elev]);

    let mut manifest = DispatchManifest::default();
    manifest.demand_at_stop.insert(
        stops[1],
        StopDemand {
            waiting_count: 1,
            total_waiting_weight: 70.0,
        },
    );
    manifest.demand_at_stop.insert(
        stops[3],
        StopDemand {
            waiting_count: 1,
            total_waiting_weight: 80.0,
        },
    );

    let mut scan = ScanDispatch::new(); // direction: Up
    let decision = scan.decide(elev, 0.0, &group, &manifest, &world);
    assert_eq!(decision, DispatchDecision::GoToStop(stops[1]));
}

#[test]
fn reverses_when_nothing_ahead() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 8.0);
    let group = test_group(&stops, vec![elev]);

    let mut manifest = DispatchManifest::default();
    manifest.demand_at_stop.insert(
        stops[0],
        StopDemand {
            waiting_count: 1,
            total_waiting_weight: 70.0,
        },
    );
    manifest.demand_at_stop.insert(
        stops[1],
        StopDemand {
            waiting_count: 1,
            total_waiting_weight: 80.0,
        },
    );

    let mut scan = ScanDispatch::new(); // direction: Up
    let decision = scan.decide(elev, 8.0, &group, &manifest, &world);
    // Nothing above 8.0 except Roof at 12.0 — but no demand there.
    // Reverses to Down. Nearest below = stops[1] at 4.0.
    assert_eq!(decision, DispatchDecision::GoToStop(stops[1]));
}

#[test]
fn serves_rider_destination() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 0.0);
    let group = test_group(&stops, vec![elev]);

    let mut manifest = DispatchManifest::default();
    manifest.rider_destinations.insert(stops[2], 1);

    let mut scan = ScanDispatch::new();
    let decision = scan.decide(elev, 0.0, &group, &manifest, &world);
    assert_eq!(decision, DispatchDecision::GoToStop(stops[2]));
}

#[test]
fn prefers_current_direction() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 4.0);
    let group = test_group(&stops, vec![elev]);

    let mut manifest = DispatchManifest::default();
    manifest.demand_at_stop.insert(
        stops[0],
        StopDemand {
            waiting_count: 1,
            total_waiting_weight: 70.0,
        },
    );
    manifest.demand_at_stop.insert(
        stops[2],
        StopDemand {
            waiting_count: 1,
            total_waiting_weight: 80.0,
        },
    );

    let mut scan = ScanDispatch::new(); // direction: Up
    let decision = scan.decide(elev, 4.0, &group, &manifest, &world);
    assert_eq!(decision, DispatchDecision::GoToStop(stops[2]));
}
