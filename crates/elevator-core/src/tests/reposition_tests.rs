//! Tests for the repositioning system and ETD dispatch overhaul.

use crate::builder::SimulationBuilder;
use crate::components::{ElevatorPhase, RiderPhase};
use crate::dispatch::etd::EtdDispatch;
use crate::dispatch::reposition::{DemandWeighted, NearestIdle, ReturnToLobby, SpreadEvenly};
use crate::dispatch::{
    BuiltinReposition, DispatchManifest, DispatchStrategy, ElevatorGroup, LineInfo,
    RepositionStrategy,
};
use crate::entity::EntityId;
use crate::events::Event;
use crate::ids::GroupId;
use crate::stop::{StopConfig, StopId};

// ===== Helpers =====

use crate::components::{Elevator, Position, Rider, Route, Stop, Velocity};
use crate::config::ElevatorConfig;
use crate::dispatch::{DispatchDecision, RiderInfo};
use crate::door::DoorState;
use crate::tagged_metrics::MetricTags;
use crate::world::World;
use std::collections::HashSet;

/// Build a `World` with `n` stops evenly spaced (0.0, 10.0, 20.0, ...)
/// and return `(world, stop_entities)`.
fn test_world_n(n: usize) -> (World, Vec<EntityId>) {
    let mut world = World::new();
    let stops: Vec<_> = (0..n)
        .map(|i| {
            let eid = world.spawn();
            world.set_stop(
                eid,
                Stop {
                    name: format!("Stop {i}"),
                    position: i as f64 * 10.0,
                },
            );
            eid
        })
        .collect();
    (world, stops)
}

fn test_group(stop_entities: &[EntityId], elevator_entities: Vec<EntityId>) -> ElevatorGroup {
    ElevatorGroup::new(
        GroupId(0),
        "Default".into(),
        vec![LineInfo::new(
            EntityId::default(),
            elevator_entities,
            stop_entities.to_vec(),
        )],
    )
}

fn spawn_elevator(world: &mut World, position: f64) -> EntityId {
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
            door_transition_ticks: 5,
            door_open_ticks: 10,
            line: EntityId::default(),
            repositioning: false,
            restricted_stops: HashSet::new(),
            inspection_speed_factor: 0.25,
            going_up: true,
            going_down: true,
            move_count: 0,
        },
    );
    eid
}

fn add_demand(manifest: &mut DispatchManifest, world: &mut World, stop: EntityId, weight: f64) {
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

// ===== Repositioning Strategy Tests =====

// 1. SpreadEvenly: 2 idle elevators, 5 stops — verify they spread apart.
#[test]
fn spread_evenly_distributes_elevators() {
    let (mut world, stops) = test_world_n(5);
    // Elevator A at stop 0 (pos 0.0), Elevator B at stop 2 (pos 20.0).
    let elev_a = spawn_elevator(&mut world, 0.0);
    let elev_b = spawn_elevator(&mut world, 20.0);
    let group = test_group(&stops, vec![elev_a, elev_b]);

    let idle = vec![(elev_a, 0.0), (elev_b, 20.0)];
    let stop_pos: Vec<(EntityId, f64)> = stops
        .iter()
        .map(|&sid| (sid, world.stop_position(sid).unwrap()))
        .collect();

    let mut strategy = SpreadEvenly;
    let result = strategy.reposition(&idle, &stop_pos, &group, &world);

    // Both should move to new positions (they shouldn't stay where they are).
    assert!(
        !result.is_empty(),
        "at least one elevator should be repositioned"
    );
    // They should go to different stops.
    if result.len() == 2 {
        assert_ne!(result[0].1, result[1].1, "should spread to different stops");
    }
    // The first elevator should be sent to the farthest unoccupied stop (stop 4 at 40.0),
    // maximizing min-distance from the other occupied position (elev_b at 20.0).
    assert_eq!(result[0].1, stops[4]);
}

// SpreadEvenly edge case: single stop — no movement needed if already there.
#[test]
fn spread_evenly_single_stop_no_movement() {
    let (mut world, stops) = test_world_n(1);
    let elev = spawn_elevator(&mut world, 0.0); // already at the only stop
    let group = test_group(&stops, vec![elev]);

    let idle = vec![(elev, 0.0)];
    let stop_pos = vec![(stops[0], 0.0)];

    let mut strategy = SpreadEvenly;
    let result = strategy.reposition(&idle, &stop_pos, &group, &world);
    assert!(
        result.is_empty(),
        "no movement when already at the only stop"
    );
}

// SpreadEvenly edge case: all elevators at same position.
#[test]
fn spread_evenly_all_at_same_position() {
    let (mut world, stops) = test_world_n(3);
    let elev_a = spawn_elevator(&mut world, 10.0);
    let elev_b = spawn_elevator(&mut world, 10.0);
    let group = test_group(&stops, vec![elev_a, elev_b]);

    let idle = vec![(elev_a, 10.0), (elev_b, 10.0)];
    let stop_pos: Vec<(EntityId, f64)> = stops
        .iter()
        .map(|&sid| (sid, world.stop_position(sid).unwrap()))
        .collect();

    let mut strategy = SpreadEvenly;
    let result = strategy.reposition(&idle, &stop_pos, &group, &world);

    // At least one should move away from the shared position.
    assert!(!result.is_empty());
    // They shouldn't both go to the same place.
    if result.len() == 2 {
        assert_ne!(result[0].1, result[1].1);
    }
}

// 2. ReturnToLobby: idle elevators return to home stop (index 0).
#[test]
fn return_to_lobby_sends_to_home() {
    let (mut world, stops) = test_world_n(3);
    let elev = spawn_elevator(&mut world, 20.0); // at stop 2
    let group = test_group(&stops, vec![elev]);

    let idle = vec![(elev, 20.0)];
    let stop_pos: Vec<(EntityId, f64)> = stops
        .iter()
        .map(|&sid| (sid, world.stop_position(sid).unwrap()))
        .collect();

    let mut strategy = ReturnToLobby::new();
    let result = strategy.reposition(&idle, &stop_pos, &group, &world);

    assert_eq!(result.len(), 1);
    assert_eq!(result[0], (elev, stops[0]));
}

// ReturnToLobby with `with_home(2)`.
#[test]
fn return_to_lobby_custom_home() {
    let (mut world, stops) = test_world_n(3);
    let elev = spawn_elevator(&mut world, 0.0); // at stop 0
    let group = test_group(&stops, vec![elev]);

    let idle = vec![(elev, 0.0)];
    let stop_pos: Vec<(EntityId, f64)> = stops
        .iter()
        .map(|&sid| (sid, world.stop_position(sid).unwrap()))
        .collect();

    let mut strategy = ReturnToLobby::with_home(2);
    let result = strategy.reposition(&idle, &stop_pos, &group, &world);

    assert_eq!(result.len(), 1);
    assert_eq!(result[0], (elev, stops[2]));
}

// ReturnToLobby edge case: already at home.
#[test]
fn return_to_lobby_already_at_home() {
    let (mut world, stops) = test_world_n(3);
    let elev = spawn_elevator(&mut world, 0.0);
    let group = test_group(&stops, vec![elev]);

    let idle = vec![(elev, 0.0)];
    let stop_pos: Vec<(EntityId, f64)> = stops
        .iter()
        .map(|&sid| (sid, world.stop_position(sid).unwrap()))
        .collect();

    let mut strategy = ReturnToLobby::new();
    let result = strategy.reposition(&idle, &stop_pos, &group, &world);

    assert!(result.is_empty(), "no movement when already at home");
}

// 3. DemandWeighted: elevators move toward high-demand stops.
#[test]
fn demand_weighted_prefers_high_demand() {
    let (mut world, stops) = test_world_n(3);
    // Elevator at stop 0.
    let elev = spawn_elevator(&mut world, 0.0);
    let group = test_group(&stops, vec![elev]);

    // Set up MetricTags with higher throughput at stop 2.
    let mut tags = MetricTags::default();
    tags.tag(stops[0], "stop0");
    tags.tag(stops[1], "stop1");
    tags.tag(stops[2], "stop2");

    // Simulate demand: record many deliveries at stop 2.
    for _ in 0..20 {
        tags.record_delivery(stops[2]);
    }
    // A few at stop 1.
    for _ in 0..3 {
        tags.record_delivery(stops[1]);
    }
    world.insert_resource(tags);

    let idle = vec![(elev, 0.0)];
    let stop_pos: Vec<(EntityId, f64)> = stops
        .iter()
        .map(|&sid| (sid, world.stop_position(sid).unwrap()))
        .collect();

    let mut strategy = DemandWeighted;
    let result = strategy.reposition(&idle, &stop_pos, &group, &world);

    assert_eq!(result.len(), 1);
    // Should move toward the highest-demand stop (stop 2).
    assert_eq!(result[0], (elev, stops[2]));
}

// 4. NearestIdle: verify no movements generated.
#[test]
fn nearest_idle_returns_empty() {
    let (mut world, stops) = test_world_n(3);
    let elev = spawn_elevator(&mut world, 0.0);
    let group = test_group(&stops, vec![elev]);

    let idle = vec![(elev, 0.0)];
    let stop_pos: Vec<(EntityId, f64)> = stops
        .iter()
        .map(|&sid| (sid, world.stop_position(sid).unwrap()))
        .collect();

    let mut strategy = NearestIdle;
    let result = strategy.reposition(&idle, &stop_pos, &group, &world);

    assert!(result.is_empty(), "NearestIdle should never generate moves");
}

// ===== Repositioning Integration Tests =====

/// Helper: build a simulation with 1 elevator, 3 stops, `ReturnToLobby` reposition.
/// Elevator starts at stop 2 (position 20.0), should reposition to stop 0 (position 0.0).
fn build_lobby_sim() -> crate::sim::Simulation {
    SimulationBuilder::new()
        .stops(vec![
            StopConfig {
                id: StopId(0),
                name: "Lobby".into(),
                position: 0.0,
            },
            StopConfig {
                id: StopId(1),
                name: "Mid".into(),
                position: 10.0,
            },
            StopConfig {
                id: StopId(2),
                name: "Top".into(),
                position: 20.0,
            },
        ])
        .elevators(vec![ElevatorConfig {
            id: 0,
            name: "A".into(),
            max_speed: 2.0,
            acceleration: 1.5,
            deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(2),
            door_open_ticks: 10,
            door_transition_ticks: 5,
            restricted_stops: Vec::new(),
            #[cfg(feature = "energy")]
            energy_profile: None,
            service_mode: None,
            inspection_speed_factor: 0.25,
        }])
        .dispatch(EtdDispatch::new())
        .reposition(ReturnToLobby::new(), BuiltinReposition::ReturnToLobby)
        .build()
        .unwrap()
}

// 5. Repositioning flag lifecycle.
#[test]
fn repositioning_flag_lifecycle() {
    let mut sim = build_lobby_sim();

    // Drain the initial events.
    sim.drain_events();

    // Step once to trigger repositioning (elevator at stop 2 should head to lobby).
    sim.step();

    let elevators = sim.world().elevator_ids();
    let eid = elevators[0];
    let car = sim.world().elevator(eid).unwrap();
    assert!(
        car.repositioning(),
        "elevator should be repositioning after first tick"
    );
    assert!(
        matches!(car.phase(), ElevatorPhase::Repositioning(_)),
        "elevator should be in Repositioning phase while repositioning"
    );

    // Run enough ticks for the elevator to arrive at lobby (20 units at 2.0 u/s, ~600 ticks).
    for _ in 0..2000 {
        sim.step();
    }

    // After arrival at lobby, it stays at lobby (ReturnToLobby is idempotent there).
    let car = sim.world().elevator(eid).unwrap();
    assert!(
        !car.repositioning(),
        "repositioning flag should be false after arrival at home stop"
    );
    assert_eq!(
        car.phase(),
        ElevatorPhase::Idle,
        "elevator should be Idle after repositioning arrival"
    );
}

// 6. Door skip on repositioning arrival: should emit ElevatorRepositioned, not ElevatorArrived.
#[test]
fn repositioning_arrival_skips_doors() {
    let mut sim = build_lobby_sim();
    sim.drain_events();

    // Run until repositioning completes (20 units at 2.0 u/s).
    for _ in 0..2000 {
        sim.step();
    }
    let events = sim.drain_events();

    // Should have ElevatorRepositioned event.
    let repositioned_count = events
        .iter()
        .filter(|e| matches!(e, Event::ElevatorRepositioned { .. }))
        .count();
    assert!(
        repositioned_count > 0,
        "should emit ElevatorRepositioned on arrival"
    );

    // Should have the initial ElevatorRepositioning event too.
    let repositioning_targets: Vec<(EntityId, EntityId)> = events
        .iter()
        .filter_map(|e| match e {
            Event::ElevatorRepositioning {
                elevator, to_stop, ..
            } => Some((*elevator, *to_stop)),
            _ => None,
        })
        .collect();

    // The repositioned stop should NOT have an ElevatorArrived event (doors skip).
    for (elev, stop) in &repositioning_targets {
        let arrived_at_same = events.iter().any(|e| {
            matches!(
                e,
                Event::ElevatorArrived { elevator, at_stop, .. }
                if *elevator == *elev && *at_stop == *stop
            )
        });
        assert!(
            !arrived_at_same,
            "repositioned elevator should NOT emit ElevatorArrived"
        );
    }

    // After repositioning, elevator should be Idle (not DoorOpening).
    let elevators = sim.world().elevator_ids();
    let car = sim.world().elevator(elevators[0]).unwrap();
    assert_eq!(
        car.phase(),
        ElevatorPhase::Idle,
        "elevator should be Idle after repositioning, not DoorOpening"
    );
}

// 7. Dispatch overrides repositioning: when a repositioned elevator goes Idle and a
//    rider appears, dispatch should assign it.
#[test]
fn dispatch_assigns_after_repositioning() {
    let mut sim = build_lobby_sim();
    sim.drain_events();

    // Let repositioning complete (elevator goes from stop 2 to lobby).
    for _ in 0..2000 {
        sim.step();
    }
    sim.drain_events();

    // Elevator should now be Idle at lobby with repositioning == false.
    let elevators = sim.world().elevator_ids();
    let car = sim.world().elevator(elevators[0]).unwrap();
    assert_eq!(car.phase(), ElevatorPhase::Idle);
    assert!(!car.repositioning());

    // Spawn a rider — dispatch should pick up the now-idle elevator.
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    sim.step();

    let events = sim.drain_events();
    let assigned = events
        .iter()
        .any(|e| matches!(e, Event::ElevatorAssigned { .. }));
    assert!(
        assigned,
        "dispatch should assign an elevator after repositioning completes"
    );
}

// 8. Disabled elevator: should not be repositioned.
#[test]
fn disabled_elevator_not_repositioned() {
    let mut sim = build_lobby_sim();
    sim.drain_events();

    let elevators = sim.world().elevator_ids();
    let eid = elevators[0];
    // Disable the elevator before it can be repositioned.
    sim.disable(eid).unwrap();
    sim.drain_events();

    // Step to trigger reposition phase.
    sim.step();
    let events = sim.drain_events();

    // The disabled elevator should not have ElevatorRepositioning events.
    let repositioning_disabled = events.iter().any(|e| {
        matches!(
            e,
            Event::ElevatorRepositioning { elevator, .. } if *elevator == eid
        )
    });
    assert!(
        !repositioning_disabled,
        "disabled elevator should not be repositioned"
    );
}

// ===== ETD Dispatch Tests =====

// 9. Basic cost: closer elevator wins.
#[test]
fn etd_closer_elevator_wins() {
    let (mut world, stops) = test_world_n(4);
    let elev_a = spawn_elevator(&mut world, 0.0);
    let elev_b = spawn_elevator(&mut world, 30.0);
    let group = test_group(&stops, vec![elev_a, elev_b]);

    let mut manifest = DispatchManifest::default();
    // Demand at stop 1 (pos 10.0).
    add_demand(&mut manifest, &mut world, stops[1], 70.0);

    let mut etd = EtdDispatch::new();
    let elevators = vec![(elev_a, 0.0), (elev_b, 30.0)];
    let decisions = etd.decide_all(&elevators, &group, &manifest, &world);

    // elev_a is closer to stop 1 (distance 10) vs elev_b (distance 20).
    let a_dec = decisions.iter().find(|(e, _)| *e == elev_a).unwrap();
    assert_eq!(a_dec.1, DispatchDecision::GoToStop(stops[1]));

    let b_dec = decisions.iter().find(|(e, _)| *e == elev_b).unwrap();
    assert_eq!(b_dec.1, DispatchDecision::Idle);
}

// 10. Direction bonus: moving elevator with target ahead gets cost reduction.
#[test]
fn etd_direction_bonus() {
    let (mut world, stops) = test_world_n(4);
    // elev_a at 5.0, already moving up toward stop 3 (pos 30.0).
    let elev_a = spawn_elevator(&mut world, 5.0);
    world.elevator_mut(elev_a).unwrap().phase = ElevatorPhase::MovingToStop(stops[3]);
    world.elevator_mut(elev_a).unwrap().target_stop = Some(stops[3]);

    // elev_b at 5.0, idle.
    let elev_b = spawn_elevator(&mut world, 5.0);
    let group = test_group(&stops, vec![elev_a, elev_b]);

    let mut manifest = DispatchManifest::default();
    // Demand at stop 1 (pos 10.0), which is ahead of both elevators.
    add_demand(&mut manifest, &mut world, stops[1], 70.0);

    let mut etd = EtdDispatch::new();
    let elevators = vec![(elev_a, 5.0), (elev_b, 5.0)];
    let decisions = etd.decide_all(&elevators, &group, &manifest, &world);

    // elev_a is already moving up and stop 1 is ahead — should get direction bonus
    // (-0.5 * travel_time). elev_b is idle, bonus is -0.3 * travel_time.
    // So elev_a should be preferred.
    let a_dec = decisions.iter().find(|(e, _)| *e == elev_a).unwrap();
    assert_eq!(a_dec.1, DispatchDecision::GoToStop(stops[1]));
}

// 11. Rider delay: elevator with aboard riders heading opposite direction gets higher cost.
#[test]
fn etd_rider_delay_penalizes() {
    let (mut world, stops) = test_world_n(4);
    // elev_a at 20.0 with a rider heading to stop 3 (pos 30.0).
    let elev_a = spawn_elevator(&mut world, 20.0);
    let rider = world.spawn();
    world.set_rider(
        rider,
        Rider {
            phase: RiderPhase::Riding(elev_a),
            weight: 70.0,
            current_stop: None,
            spawn_tick: 0,
            board_tick: Some(0),
        },
    );
    world.set_route(rider, Route::direct(stops[2], stops[3], GroupId(0)));
    world.elevator_mut(elev_a).unwrap().riders.push(rider);

    // elev_b at 20.0, no riders.
    let elev_b = spawn_elevator(&mut world, 20.0);
    let group = test_group(&stops, vec![elev_a, elev_b]);

    let mut manifest = DispatchManifest::default();
    // Demand at stop 0 (pos 0.0) — opposite direction from rider's destination.
    add_demand(&mut manifest, &mut world, stops[0], 70.0);

    let mut etd = EtdDispatch::new();
    let elevators = vec![(elev_a, 20.0), (elev_b, 20.0)];
    let decisions = etd.decide_all(&elevators, &group, &manifest, &world);

    // elev_b (no riders) should win because elev_a would delay its rider.
    let b_dec = decisions.iter().find(|(e, _)| *e == elev_b).unwrap();
    assert_eq!(b_dec.1, DispatchDecision::GoToStop(stops[0]));

    let a_dec = decisions.iter().find(|(e, _)| *e == elev_a).unwrap();
    assert_eq!(a_dec.1, DispatchDecision::Idle);
}

// 12. Door overhead: intervening pending stops increase cost.
//     Verify that an elevator with intervening pending stops pays more than one without.
#[test]
fn etd_door_overhead_for_intervening_stops() {
    let (mut world, stops) = test_world_n(4);
    // 3 elevators, 3 pending stops. Elevators A and B handle stops 1 and 2,
    // leaving elevator C to compete for stop 3.
    let elev_a = spawn_elevator(&mut world, 0.0);
    let elev_b = spawn_elevator(&mut world, 10.0);
    let elev_c = spawn_elevator(&mut world, 25.0);
    let group = test_group(&stops, vec![elev_a, elev_b, elev_c]);

    let mut manifest = DispatchManifest::default();
    add_demand(&mut manifest, &mut world, stops[1], 70.0);
    add_demand(&mut manifest, &mut world, stops[2], 70.0);
    add_demand(&mut manifest, &mut world, stops[3], 70.0);

    // High door weight makes intervening stop overhead dominate.
    let mut etd = EtdDispatch::with_weights(1.0, 1.0, 10.0);
    let elevators = vec![(elev_a, 0.0), (elev_b, 10.0), (elev_c, 25.0)];
    let decisions = etd.decide_all(&elevators, &group, &manifest, &world);

    // Stop 1 (pos 10): elev_b is right there (cost ~0). Gets stop 1.
    // Stop 2 (pos 20): elev_a at 0 (dist 20, intervening stop 1 at 10) vs elev_c at 25 (dist 5, no intervening).
    //   With door_weight=10, elev_a pays 10 * door_overhead for 1 intervening stop. elev_c wins.
    // Stop 3 (pos 30): only elev_a left. Gets stop 3.
    // Key: the mechanism works because intervening pending stops raise the cost.
    let c_dec = decisions.iter().find(|(e, _)| *e == elev_c).unwrap();
    assert_eq!(
        c_dec.1,
        DispatchDecision::GoToStop(stops[2]),
        "elevator C at 25.0 should serve stop 2 (pos 20) due to lower door overhead vs elevator A"
    );

    let a_dec = decisions.iter().find(|(e, _)| *e == elev_a).unwrap();
    assert_eq!(
        a_dec.1,
        DispatchDecision::GoToStop(stops[3]),
        "elevator A should get stop 3 since B and C already assigned"
    );
}

// 13. Weight configuration: with_weights(2.0, 0.5, 0.0) prioritizes travel time over delay.
#[test]
fn etd_custom_weights() {
    let (mut world, stops) = test_world_n(4);
    // elev_a at 0.0, elev_b at 20.0 with a rider heading to stop 3.
    let elev_a = spawn_elevator(&mut world, 0.0);
    let elev_b = spawn_elevator(&mut world, 20.0);

    let rider = world.spawn();
    world.set_rider(
        rider,
        Rider {
            phase: RiderPhase::Riding(elev_b),
            weight: 70.0,
            current_stop: None,
            spawn_tick: 0,
            board_tick: Some(0),
        },
    );
    world.set_route(rider, Route::direct(stops[2], stops[3], GroupId(0)));
    world.elevator_mut(elev_b).unwrap().riders.push(rider);

    let group = test_group(&stops, vec![elev_a, elev_b]);

    let mut manifest = DispatchManifest::default();
    // Demand at stop 2 (pos 20.0).
    add_demand(&mut manifest, &mut world, stops[2], 70.0);

    // High wait weight (2.0), low delay weight (0.5), zero door weight.
    let mut etd = EtdDispatch::with_weights(2.0, 0.5, 0.0);
    let elevators = vec![(elev_a, 0.0), (elev_b, 20.0)];
    let decisions = etd.decide_all(&elevators, &group, &manifest, &world);

    // elev_b is at stop 2 (distance 0), elev_a is 20 away.
    // Even with rider delay, elev_b should win because wait_weight is high
    // and elev_b has zero travel time.
    let b_dec = decisions.iter().find(|(e, _)| *e == elev_b).unwrap();
    assert_eq!(b_dec.1, DispatchDecision::GoToStop(stops[2]));
}

// 14. Zero max_speed: returns INFINITY cost (elevator never assigned).
#[test]
fn etd_zero_max_speed_infinite_cost() {
    let (mut world, stops) = test_world_n(3);
    let elev_a = spawn_elevator(&mut world, 0.0);
    world.elevator_mut(elev_a).unwrap().max_speed = 0.0;

    // Add a normal elevator to ensure demand is served by it instead.
    let elev_b = spawn_elevator(&mut world, 20.0);
    let group = test_group(&stops, vec![elev_a, elev_b]);

    let mut manifest = DispatchManifest::default();
    add_demand(&mut manifest, &mut world, stops[1], 70.0);

    let mut etd = EtdDispatch::new();
    let elevators = vec![(elev_a, 0.0), (elev_b, 20.0)];
    let decisions = etd.decide_all(&elevators, &group, &manifest, &world);

    // elev_a with max_speed=0 should NOT be assigned.
    let a_dec = decisions.iter().find(|(e, _)| *e == elev_a).unwrap();
    assert_eq!(a_dec.1, DispatchDecision::Idle);

    // elev_b should get the assignment.
    let b_dec = decisions.iter().find(|(e, _)| *e == elev_b).unwrap();
    assert_eq!(b_dec.1, DispatchDecision::GoToStop(stops[1]));
}
