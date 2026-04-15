use std::collections::HashSet;

use crate::components::*;
use crate::dispatch::etd::EtdDispatch;
use crate::dispatch::look::LookDispatch;
use crate::dispatch::nearest_car::NearestCarDispatch;
use crate::dispatch::scan::ScanDispatch;
use crate::dispatch::{
    self, DispatchDecision, DispatchManifest, DispatchStrategy, ElevatorGroup, RiderInfo,
};
use crate::door::DoorState;
use crate::ids::GroupId;
use crate::world::World;

/// Run the assignment for a single car and return its decision.
fn decide_one(
    strategy: &mut dyn DispatchStrategy,
    car: crate::entity::EntityId,
    pos: f64,
    group: &ElevatorGroup,
    manifest: &DispatchManifest,
    world: &World,
) -> DispatchDecision {
    let result = dispatch::assign(strategy, &[(car, pos)], group, manifest, world);
    result.decisions[0].1.clone()
}

/// Run the assignment for several cars in one pass.
fn decide_all(
    strategy: &mut dyn DispatchStrategy,
    cars: &[(crate::entity::EntityId, f64)],
    group: &ElevatorGroup,
    manifest: &DispatchManifest,
    world: &World,
) -> Vec<(crate::entity::EntityId, DispatchDecision)> {
    dispatch::assign(strategy, cars, group, manifest, world).decisions
}

/// Build a `World` with 4 stops and return (world, `stop_entities`).
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
    use crate::dispatch::LineInfo;
    ElevatorGroup::new(
        GroupId(0),
        "Default".into(),
        vec![LineInfo::new(
            crate::entity::EntityId::default(),
            elevator_entities,
            stop_entities.to_vec(),
        )],
    )
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
            line: crate::entity::EntityId::default(),
            repositioning: false,
            restricted_stops: HashSet::new(),
            inspection_speed_factor: 0.25,
            going_up: true,
            going_down: true,
            move_count: 0,
            door_command_queue: Vec::new(),
            manual_target_velocity: None,
        },
    );
    eid
}

/// Add simulated waiting demand at a stop (creates a dummy `RiderInfo`).
fn add_demand(
    manifest: &mut DispatchManifest,
    world: &mut World,
    stop: crate::entity::EntityId,
    weight: f64,
) {
    let dummy = world.spawn();
    manifest
        .waiting_at_stop
        .entry(stop)
        .or_default()
        .push(RiderInfo {
            id: dummy,
            destination: None,
            weight,
            wait_ticks: 0,
        });
}

/// Add a rider destination entry (simulates a rider aboard heading to stop).
fn add_rider_dest(
    manifest: &mut DispatchManifest,
    world: &mut World,
    stop: crate::entity::EntityId,
) {
    let dummy = world.spawn();
    manifest
        .riding_to_stop
        .entry(stop)
        .or_default()
        .push(RiderInfo {
            id: dummy,
            destination: Some(stop),
            weight: 70.0,
            wait_ticks: 0,
        });
}

// ===== SCAN Tests =====

#[test]
fn scan_no_requests_returns_idle() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 0.0);
    let group = test_group(&stops, vec![elev]);
    let manifest = DispatchManifest::default();
    let mut scan = ScanDispatch::new();
    let decision = decide_one(&mut scan, elev, 0.0, &group, &manifest, &world);
    assert_eq!(decision, DispatchDecision::Idle);
}

#[test]
fn scan_goes_to_nearest_in_direction() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 0.0);
    let group = test_group(&stops, vec![elev]);
    let mut manifest = DispatchManifest::default();
    add_demand(&mut manifest, &mut world, stops[1], 70.0);
    add_demand(&mut manifest, &mut world, stops[3], 80.0);
    let mut scan = ScanDispatch::new();
    let decision = decide_one(&mut scan, elev, 0.0, &group, &manifest, &world);
    assert_eq!(decision, DispatchDecision::GoToStop(stops[1]));
}

#[test]
fn scan_reverses_when_nothing_ahead() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 8.0);
    let group = test_group(&stops, vec![elev]);
    let mut manifest = DispatchManifest::default();
    add_demand(&mut manifest, &mut world, stops[0], 70.0);
    add_demand(&mut manifest, &mut world, stops[1], 80.0);
    let mut scan = ScanDispatch::new();
    let decision = decide_one(&mut scan, elev, 8.0, &group, &manifest, &world);
    assert_eq!(decision, DispatchDecision::GoToStop(stops[1]));
}

#[test]
fn scan_serves_rider_destination() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 0.0);
    let group = test_group(&stops, vec![elev]);
    let mut manifest = DispatchManifest::default();
    add_rider_dest(&mut manifest, &mut world, stops[2]);
    let mut scan = ScanDispatch::new();
    let decision = decide_one(&mut scan, elev, 0.0, &group, &manifest, &world);
    assert_eq!(decision, DispatchDecision::GoToStop(stops[2]));
}

#[test]
fn scan_prefers_current_direction() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 4.0);
    let group = test_group(&stops, vec![elev]);
    let mut manifest = DispatchManifest::default();
    add_demand(&mut manifest, &mut world, stops[0], 70.0);
    add_demand(&mut manifest, &mut world, stops[2], 80.0);
    let mut scan = ScanDispatch::new();
    let decision = decide_one(&mut scan, elev, 4.0, &group, &manifest, &world);
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
    let decision = decide_one(&mut look, elev, 0.0, &group, &manifest, &world);
    assert_eq!(decision, DispatchDecision::Idle);
}

#[test]
fn look_reverses_at_last_request() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 0.0);
    let group = test_group(&stops, vec![elev]);
    let mut manifest = DispatchManifest::default();
    // Only demand at stop 1 (pos 4.0) — LOOK should go there then reverse.
    add_demand(&mut manifest, &mut world, stops[1], 70.0);
    let mut look = LookDispatch::new();
    let decision = decide_one(&mut look, elev, 0.0, &group, &manifest, &world);
    assert_eq!(decision, DispatchDecision::GoToStop(stops[1]));
}

// ===== Nearest Car Tests =====

#[test]
fn nearest_car_assigns_closest_elevator() {
    let (mut world, stops) = test_world();
    let elev_a = spawn_elevator(&mut world, 0.0); // at Ground
    let elev_b = spawn_elevator(&mut world, 12.0); // at Roof
    let group = test_group(&stops, vec![elev_a, elev_b]);

    let mut manifest = DispatchManifest::default();
    add_demand(&mut manifest, &mut world, stops[1], 70.0);

    let mut nc = NearestCarDispatch::new();
    let elevators = vec![(elev_a, 0.0), (elev_b, 12.0)];
    let decisions = decide_all(&mut nc, &elevators, &group, &manifest, &world);

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
    add_demand(&mut manifest, &mut world, stops[0], 70.0);
    add_demand(&mut manifest, &mut world, stops[0], 70.0);
    add_demand(&mut manifest, &mut world, stops[3], 70.0);

    let mut nc = NearestCarDispatch::new();
    let elevators = vec![(elev_a, 0.0), (elev_b, 12.0)];
    let decisions = decide_all(&mut nc, &elevators, &group, &manifest, &world);

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
    add_demand(&mut manifest, &mut world, stops[2], 70.0);

    let mut etd = EtdDispatch::new();
    let elevators = vec![(elev_a, 4.0), (elev_b, 4.0)];
    let decisions = decide_all(&mut etd, &elevators, &group, &manifest, &world);

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
    add_demand(&mut manifest, &mut world, stops[2], 70.0);

    let mut etd = EtdDispatch::new();
    let elevators = vec![(elev_a, 0.0), (elev_b, 8.0)];
    let decisions = decide_all(&mut etd, &elevators, &group, &manifest, &world);

    // Stop 2 at position 8.0. elev_b is at 8.0 (distance 0), elev_a at 0.0 (distance 8).
    let b_dec = decisions.iter().find(|(e, _)| *e == elev_b).unwrap();
    assert_eq!(b_dec.1, DispatchDecision::GoToStop(stops[2]));
}

// ===== Mutation-killing tests =====

/// Test that SCAN skips the stop at the elevator's exact position
/// (partition uses `> pos + EPSILON`, not `>= pos + EPSILON`).
#[test]
fn scan_at_exact_stop_skips_current_position() {
    let (mut world, stops) = test_world();
    // Elevator at position 4.0 = same as stops[1].
    let elev = spawn_elevator(&mut world, 4.0);
    let group = test_group(&stops, vec![elev]);
    let mut manifest = DispatchManifest::default();
    // Put demand at stop[1] (pos 4.0, same as elevator) AND stop[2] (pos 8.0).
    add_demand(&mut manifest, &mut world, stops[1], 70.0);
    add_demand(&mut manifest, &mut world, stops[2], 70.0);

    let mut scan = ScanDispatch::new();
    let decision = decide_one(&mut scan, elev, 4.0, &group, &manifest, &world);
    // Elevator is UP. Stop at 4.0 is NOT ahead (it's at current pos).
    // Should go to stop[2] at 8.0, not stop[1] at 4.0.
    assert_eq!(decision, DispatchDecision::GoToStop(stops[2]));
}

/// Test SCAN direction reversal picks the correct nearest stop behind.
#[test]
fn scan_reversal_picks_nearest_behind() {
    let (mut world, stops) = test_world();
    // Elevator at top (12.0), going Up.
    let elev = spawn_elevator(&mut world, 12.0);
    let group = test_group(&stops, vec![elev]);
    let mut manifest = DispatchManifest::default();
    // Demand at stops 0 (pos 0.0) and 2 (pos 8.0).
    add_demand(&mut manifest, &mut world, stops[0], 70.0);
    add_demand(&mut manifest, &mut world, stops[2], 70.0);

    let mut scan = ScanDispatch::new();
    let decision = decide_one(&mut scan, elev, 12.0, &group, &manifest, &world);
    // Nothing ahead (up), reverses to Down. Nearest behind in Down direction = stop[2] at 8.0.
    assert_eq!(decision, DispatchDecision::GoToStop(stops[2]));
}

/// Test that `notify_removed` cleans up direction state for SCAN.
/// After removal, same entity ID should revert to default direction (Up).
#[test]
fn scan_notify_removed_cleans_state() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 12.0);
    let group = test_group(&stops, vec![elev]);
    let mut manifest = DispatchManifest::default();
    // Only demand below — forces reversal to Down.
    add_demand(&mut manifest, &mut world, stops[0], 70.0);
    add_demand(&mut manifest, &mut world, stops[1], 70.0);

    let mut scan = ScanDispatch::new();
    // First call: nothing Up from 12.0 → reverses to Down, picks stops[1] (nearest below).
    let d1 = decide_one(&mut scan, elev, 12.0, &group, &manifest, &world);
    assert_eq!(d1, DispatchDecision::GoToStop(stops[1]));

    // Now direction is stored as Down for this elevator.
    // Notify removal — should clear stored direction.
    scan.notify_removed(elev);

    // Re-query same elevator from position 4.0 with demand above AND below.
    add_demand(&mut manifest, &mut world, stops[2], 70.0);
    let d2 = decide_one(&mut scan, elev, 4.0, &group, &manifest, &world);
    // If notify_removed worked: default direction is Up → goes to stops[2] (pos 8.0).
    // If notify_removed was no-op: direction is still Down → goes to stops[1] (pos 4.0) or stops[0] (pos 0.0).
    assert_eq!(d2, DispatchDecision::GoToStop(stops[2]));
}

/// Test that LOOK `notify_removed` cleans up direction state.
#[test]
fn look_notify_removed_cleans_state() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 12.0);
    let group = test_group(&stops, vec![elev]);
    let mut manifest = DispatchManifest::default();
    add_demand(&mut manifest, &mut world, stops[0], 70.0);

    let mut look = LookDispatch::new();
    // Establish direction state (will reverse to Down since nothing is Up from 12.0).
    decide_one(&mut look, elev, 12.0, &group, &manifest, &world);
    // Remove elevator.
    look.notify_removed(elev);
    // Reuse the same ID — direction should be gone.
    add_demand(&mut manifest, &mut world, stops[2], 70.0);
    let decision = decide_one(&mut look, elev, 4.0, &group, &manifest, &world);
    // Default direction is Up, should go up to stop[2] (pos 8.0).
    assert_eq!(decision, DispatchDecision::GoToStop(stops[2]));
}

/// Test that LOOK correctly partitions with negative direction (Down).
#[test]
fn look_down_direction_partitions_correctly() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 8.0);
    let group = test_group(&stops, vec![elev]);
    let mut manifest = DispatchManifest::default();
    // Demand below at stops 0 and 1.
    add_demand(&mut manifest, &mut world, stops[0], 70.0);
    add_demand(&mut manifest, &mut world, stops[1], 70.0);

    let mut look = LookDispatch::new();
    // First call: nothing ahead (Up from 8.0 with only stops at 0 and 4), reverses.
    let d1 = decide_one(&mut look, elev, 8.0, &group, &manifest, &world);
    // After reversal to Down: nearest below = stops[1] at pos 4.0 (not stops[0] at 0.0).
    assert_eq!(d1, DispatchDecision::GoToStop(stops[1]));

    // Second call: still going Down, both stops ahead. Nearest = stops[1].
    let d2 = decide_one(&mut look, elev, 8.0, &group, &manifest, &world);
    assert_eq!(d2, DispatchDecision::GoToStop(stops[1]));
}

/// Test SCAN in Down direction correctly identifies stops below.
/// Specifically kills `< pos - EPSILON` → `> pos - EPSILON` mutant.
#[test]
fn scan_down_direction_serves_below() {
    let (mut world, stops) = test_world();
    // Elevator at position 8.0 (stops[2]).
    let elev = spawn_elevator(&mut world, 8.0);
    let group = test_group(&stops, vec![elev]);
    let mut manifest = DispatchManifest::default();
    // Demand at stop[1] (pos 4.0, below) and stop[3] (pos 12.0, above).
    add_demand(&mut manifest, &mut world, stops[1], 70.0);
    add_demand(&mut manifest, &mut world, stops[3], 70.0);

    let mut scan = ScanDispatch::new();
    // First call: default Up → goes to stops[3] (above).
    let d1 = decide_one(&mut scan, elev, 8.0, &group, &manifest, &world);
    assert_eq!(d1, DispatchDecision::GoToStop(stops[3]));

    // Remove demand above, only below remains. Call again.
    manifest.waiting_at_stop.remove(&stops[3]);
    let d2 = decide_one(&mut scan, elev, 12.0, &group, &manifest, &world);
    // Nothing ahead (Up from 12.0), reverses to Down. Nearest below = stops[1].
    assert_eq!(d2, DispatchDecision::GoToStop(stops[1]));

    // Now call again at position 8.0 with direction Down.
    // Demand at stops[0] (pos 0.0) and stops[1] (pos 4.0).
    add_demand(&mut manifest, &mut world, stops[0], 70.0);
    let d3 = decide_one(&mut scan, elev, 8.0, &group, &manifest, &world);
    // Direction is Down. Both stops below. Nearest in Down = stops[1] (pos 4.0, highest below).
    assert_eq!(d3, DispatchDecision::GoToStop(stops[1]));
}

/// Test `NearestCar` correctly assigns based on distance subtraction direction.
#[test]
fn nearest_car_distance_calculation() {
    let (mut world, stops) = test_world();
    // Elevator A at 3.0, Elevator B at 5.0. Stop[1] at 4.0.
    let elev_a = spawn_elevator(&mut world, 3.0);
    let elev_b = spawn_elevator(&mut world, 5.0);
    let group = test_group(&stops, vec![elev_a, elev_b]);

    let mut manifest = DispatchManifest::default();
    add_demand(&mut manifest, &mut world, stops[1], 70.0);

    let mut nc = NearestCarDispatch::new();
    let elevators = vec![(elev_a, 3.0), (elev_b, 5.0)];
    let decisions = decide_all(&mut nc, &elevators, &group, &manifest, &world);

    // Both are 1.0 away from stop[1] at 4.0. First in iteration order wins.
    let a_dec = decisions.iter().find(|(e, _)| *e == elev_a).unwrap();
    assert_eq!(a_dec.1, DispatchDecision::GoToStop(stops[1]));
}

/// A custom dispatch strategy that always returns Idle.
/// Demonstrates implementing the trait for game-specific dispatch logic.
struct AlwaysIdleDispatch;

impl DispatchStrategy for AlwaysIdleDispatch {
    fn rank(
        &mut self,
        _car: crate::entity::EntityId,
        _car_position: f64,
        _stop: crate::entity::EntityId,
        _stop_position: f64,
        _group: &ElevatorGroup,
        _manifest: &DispatchManifest,
        _world: &World,
    ) -> Option<f64> {
        None
    }
}

#[test]
fn custom_dispatch_strategy() {
    use crate::builder::SimulationBuilder;
    use crate::stop::StopId;

    let mut sim = SimulationBuilder::demo()
        .dispatch(AlwaysIdleDispatch)
        .build()
        .unwrap();

    // Spawn a rider so there's demand.
    sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 70.0)
        .unwrap();

    // Step several times — the elevator should never move since dispatch always returns Idle.
    for _ in 0..100 {
        sim.step();
    }

    // Elevator should still be at starting position (idle).
    let elevators: Vec<_> = sim.world().iter_elevators().collect();
    assert!(!elevators.is_empty());
    assert!(
        (elevators[0].1.value - 0.0).abs() < f64::EPSILON,
        "elevator should not have moved with AlwaysIdle dispatch"
    );
}

/// Test `NearestCar` ignores stops with zero demand (`waiting_count` = 0).
#[test]
fn nearest_car_ignores_zero_demand() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 0.0);
    let group = test_group(&stops, vec![elev]);

    let mut manifest = DispatchManifest::default();
    // Only real demand at stop[3].
    add_demand(&mut manifest, &mut world, stops[3], 70.0);

    let mut nc = NearestCarDispatch::new();
    let elevators = vec![(elev, 0.0)];
    let decisions = decide_all(&mut nc, &elevators, &group, &manifest, &world);

    let dec = decisions.iter().find(|(e, _)| *e == elev).unwrap();
    // Should skip stop[1] (0 demand) and go to stop[3].
    assert_eq!(dec.1, DispatchDecision::GoToStop(stops[3]));
}

/// Stress the Hungarian matrix with a realistic large group to verify the
/// sentinel + scaling bounds don't overflow `i64` in the solver's internal
/// potential sums. Mirrors the upper end of `benches/dispatch_bench.rs`.
#[test]
fn assign_handles_large_group_without_overflow() {
    let mut world = World::new();
    let stop_count = 64;
    let car_count = 32;
    let stops: Vec<_> = (0..stop_count)
        .map(|i| {
            let eid = world.spawn();
            world.set_stop(
                eid,
                Stop {
                    name: format!("S{i}"),
                    position: i as f64 * 4.0,
                },
            );
            eid
        })
        .collect();
    let cars: Vec<_> = (0..car_count)
        .map(|i| spawn_elevator(&mut world, (i as f64) * 4.0))
        .collect();
    let group = test_group(&stops, cars.clone());
    let mut manifest = DispatchManifest::default();
    for &s in &stops {
        add_demand(&mut manifest, &mut world, s, 70.0);
    }
    let positions: Vec<_> = cars
        .iter()
        .map(|&c| (c, world.position(c).unwrap().value))
        .collect();

    let mut nc = NearestCarDispatch::new();
    let decisions = decide_all(&mut nc, &positions, &group, &manifest, &world);
    // Every car should be assigned to a distinct stop (car_count < stop_count).
    let assigned_stops: HashSet<_> = decisions
        .iter()
        .filter_map(|(_, d)| match d {
            DispatchDecision::GoToStop(s) => Some(*s),
            DispatchDecision::Idle => None,
        })
        .collect();
    assert_eq!(assigned_stops.len(), car_count);
}
