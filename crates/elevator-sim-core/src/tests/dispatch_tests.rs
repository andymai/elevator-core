use crate::components::*;
use crate::dispatch::etd::EtdDispatch;
use crate::dispatch::look::LookDispatch;
use crate::dispatch::nearest_car::NearestCarDispatch;
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
        world.set_stop(
            eid,
            Stop {
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
    world.set_position(eid, Position { value: position });
    world.set_velocity(eid, Velocity { value: 0.0 });
    world.set_elevator(
        eid,
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
            group: GroupId(0),
        },
    );
    eid
}

// ===== SCAN Tests =====

#[test]
fn scan_no_requests_returns_idle() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 0.0);
    let group = test_group(&stops, vec![elev]);
    let manifest = DispatchManifest::default();
    let mut scan = ScanDispatch::new();
    let decision = scan.decide(elev, 0.0, &group, &manifest, &world);
    assert_eq!(decision, DispatchDecision::Idle);
}

#[test]
fn scan_goes_to_nearest_in_direction() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 0.0);
    let group = test_group(&stops, vec![elev]);
    let mut manifest = DispatchManifest::default();
    manifest.demand_at_stop.insert(stops[1], StopDemand { waiting_count: 1, total_waiting_weight: 70.0 });
    manifest.demand_at_stop.insert(stops[3], StopDemand { waiting_count: 1, total_waiting_weight: 80.0 });
    let mut scan = ScanDispatch::new();
    let decision = scan.decide(elev, 0.0, &group, &manifest, &world);
    assert_eq!(decision, DispatchDecision::GoToStop(stops[1]));
}

#[test]
fn scan_reverses_when_nothing_ahead() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 8.0);
    let group = test_group(&stops, vec![elev]);
    let mut manifest = DispatchManifest::default();
    manifest.demand_at_stop.insert(stops[0], StopDemand { waiting_count: 1, total_waiting_weight: 70.0 });
    manifest.demand_at_stop.insert(stops[1], StopDemand { waiting_count: 1, total_waiting_weight: 80.0 });
    let mut scan = ScanDispatch::new();
    let decision = scan.decide(elev, 8.0, &group, &manifest, &world);
    assert_eq!(decision, DispatchDecision::GoToStop(stops[1]));
}

#[test]
fn scan_serves_rider_destination() {
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
fn scan_prefers_current_direction() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 4.0);
    let group = test_group(&stops, vec![elev]);
    let mut manifest = DispatchManifest::default();
    manifest.demand_at_stop.insert(stops[0], StopDemand { waiting_count: 1, total_waiting_weight: 70.0 });
    manifest.demand_at_stop.insert(stops[2], StopDemand { waiting_count: 1, total_waiting_weight: 80.0 });
    let mut scan = ScanDispatch::new();
    let decision = scan.decide(elev, 4.0, &group, &manifest, &world);
    assert_eq!(decision, DispatchDecision::GoToStop(stops[2]));
}

// ===== LOOK Tests =====

#[test]
fn look_no_requests_returns_idle() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 0.0);
    let group = test_group(&stops, vec![elev]);
    let manifest = DispatchManifest::default();
    let mut look = LookDispatch::new();
    let decision = look.decide(elev, 0.0, &group, &manifest, &world);
    assert_eq!(decision, DispatchDecision::Idle);
}

#[test]
fn look_reverses_at_last_request() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 0.0);
    let group = test_group(&stops, vec![elev]);
    let mut manifest = DispatchManifest::default();
    // Only demand at stop 1 (pos 4.0) — LOOK should go there then reverse.
    manifest.demand_at_stop.insert(stops[1], StopDemand { waiting_count: 1, total_waiting_weight: 70.0 });
    let mut look = LookDispatch::new();
    let decision = look.decide(elev, 0.0, &group, &manifest, &world);
    assert_eq!(decision, DispatchDecision::GoToStop(stops[1]));
}

// ===== Nearest Car Tests =====

#[test]
fn nearest_car_assigns_closest_elevator() {
    let (mut world, stops) = test_world();
    let elev_a = spawn_elevator(&mut world, 0.0);  // at Ground
    let elev_b = spawn_elevator(&mut world, 12.0); // at Roof
    let group = test_group(&stops, vec![elev_a, elev_b]);

    let mut manifest = DispatchManifest::default();
    manifest.demand_at_stop.insert(stops[1], StopDemand { waiting_count: 1, total_waiting_weight: 70.0 });

    let mut nc = NearestCarDispatch::new();
    let elevators = vec![(elev_a, 0.0), (elev_b, 12.0)];
    let decisions = nc.decide_all(&elevators, &group, &manifest, &world);

    // Elevator A (at 0.0) is closer to stop 1 (at 4.0) than Elevator B (at 12.0).
    let a_decision = decisions.iter().find(|(e, _)| *e == elev_a).unwrap();
    assert_eq!(a_decision.1, DispatchDecision::GoToStop(stops[1]));

    let b_decision = decisions.iter().find(|(e, _)| *e == elev_b).unwrap();
    assert_eq!(b_decision.1, DispatchDecision::Idle);
}

#[test]
fn nearest_car_multiple_stops() {
    let (mut world, stops) = test_world();
    let elev_a = spawn_elevator(&mut world, 0.0);
    let elev_b = spawn_elevator(&mut world, 12.0);
    let group = test_group(&stops, vec![elev_a, elev_b]);

    let mut manifest = DispatchManifest::default();
    manifest.demand_at_stop.insert(stops[0], StopDemand { waiting_count: 2, total_waiting_weight: 140.0 });
    manifest.demand_at_stop.insert(stops[3], StopDemand { waiting_count: 1, total_waiting_weight: 70.0 });

    let mut nc = NearestCarDispatch::new();
    let elevators = vec![(elev_a, 0.0), (elev_b, 12.0)];
    let decisions = nc.decide_all(&elevators, &group, &manifest, &world);

    // Stop 0 has higher demand — assigned first. elev_a (at 0.0) is nearest to stop 0.
    // Stop 3: elev_b (at 12.0) is nearest to stop 3.
    let a_dec = decisions.iter().find(|(e, _)| *e == elev_a).unwrap();
    assert_eq!(a_dec.1, DispatchDecision::GoToStop(stops[0]));
    let b_dec = decisions.iter().find(|(e, _)| *e == elev_b).unwrap();
    assert_eq!(b_dec.1, DispatchDecision::GoToStop(stops[3]));
}

// ===== ETD Tests =====

#[test]
fn etd_prefers_idle_elevator() {
    let (mut world, stops) = test_world();
    let elev_a = spawn_elevator(&mut world, 4.0);
    let elev_b = spawn_elevator(&mut world, 4.0);
    // Make elev_b busy with riders.
    world.elevator_mut(elev_b).unwrap().riders = vec![world.spawn(), world.spawn()];

    let group = test_group(&stops, vec![elev_a, elev_b]);
    let mut manifest = DispatchManifest::default();
    manifest.demand_at_stop.insert(stops[2], StopDemand { waiting_count: 1, total_waiting_weight: 70.0 });

    let mut etd = EtdDispatch::new();
    let elevators = vec![(elev_a, 4.0), (elev_b, 4.0)];
    let decisions = etd.decide_all(&elevators, &group, &manifest, &world);

    // elev_a (0 riders) should be preferred over elev_b (2 riders).
    let a_dec = decisions.iter().find(|(e, _)| *e == elev_a).unwrap();
    assert_eq!(a_dec.1, DispatchDecision::GoToStop(stops[2]));
}

#[test]
fn etd_closer_elevator_wins() {
    let (mut world, stops) = test_world();
    let elev_a = spawn_elevator(&mut world, 0.0);
    let elev_b = spawn_elevator(&mut world, 8.0);
    let group = test_group(&stops, vec![elev_a, elev_b]);

    let mut manifest = DispatchManifest::default();
    manifest.demand_at_stop.insert(stops[2], StopDemand { waiting_count: 1, total_waiting_weight: 70.0 });

    let mut etd = EtdDispatch::new();
    let elevators = vec![(elev_a, 0.0), (elev_b, 8.0)];
    let decisions = etd.decide_all(&elevators, &group, &manifest, &world);

    // Stop 2 at position 8.0. elev_b is at 8.0 (distance 0), elev_a at 0.0 (distance 8).
    let b_dec = decisions.iter().find(|(e, _)| *e == elev_b).unwrap();
    assert_eq!(b_dec.1, DispatchDecision::GoToStop(stops[2]));
}
