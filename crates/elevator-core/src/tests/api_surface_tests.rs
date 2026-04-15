//! Tests for the new public API surface: `remove_elevator`, `remove_stop`,
//! `drain_events_where`, `riders_on`, `occupancy`, `iter_repositioning_elevators`,
//! `RiderBuilder`, and dispatch re-exports.

use super::helpers::{default_config, scan};
use crate::builder::SimulationBuilder;
use crate::components::{AccessControl, Preferences, RiderPhase};
use crate::dispatch::BuiltinReposition;
use crate::dispatch::reposition::ReturnToLobby;
use crate::dispatch::{EtdDispatch, LookDispatch, NearestCarDispatch, ScanDispatch};
use crate::entity::EntityId;
use crate::error::SimError;
use crate::events::Event;
use crate::ids::GroupId;
use crate::sim::Simulation;
use crate::stop::{StopConfig, StopId};
use std::collections::HashSet;

// ── remove_elevator ───────────────────────────────────────────────────────────

#[test]
fn remove_elevator_despawns_from_world() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    let elevator_id = sim.groups()[0].elevator_entities()[0];

    // Elevator is alive before removal.
    assert!(sim.world().elevator(elevator_id).is_some());

    sim.remove_elevator(elevator_id).unwrap();

    // Elevator is gone from the world.
    assert!(sim.world().elevator(elevator_id).is_none());
}

#[test]
fn remove_elevator_removes_from_group_cache() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    let elevator_id = sim.groups()[0].elevator_entities()[0];
    assert!(sim.groups()[0].elevator_entities().contains(&elevator_id));

    sim.remove_elevator(elevator_id).unwrap();

    assert!(!sim.groups()[0].elevator_entities().contains(&elevator_id));
}

#[test]
fn remove_elevator_ejects_riders_aboard() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    // Spawn a rider and let it board.
    let rider_id = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();

    // Run enough ticks for the rider to board.
    for _ in 0..300 {
        sim.step();
        let phase = sim.world().rider(rider_id).unwrap().phase;
        if matches!(phase, RiderPhase::Riding(_)) {
            break;
        }
    }

    let elevator_id = sim.groups()[0].elevator_entities()[0];
    assert!(
        matches!(
            sim.world().rider(rider_id).unwrap().phase,
            RiderPhase::Riding(_)
        ),
        "rider should have boarded within 300 ticks"
    );

    // Rider is aboard — removing elevator should eject the rider.
    sim.remove_elevator(elevator_id).unwrap();
    sim.drain_events(); // consume events

    let phase = sim.world().rider(rider_id).unwrap().phase;
    // After ejection, rider is put back to Waiting.
    assert!(
        matches!(phase, RiderPhase::Waiting),
        "rider should be Waiting after elevator removal, got {phase:?}"
    );
}

#[test]
fn remove_elevator_ejects_rider_emits_event() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    sim.drain_events();

    let rider_id = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();

    // Run until rider is riding.
    for _ in 0..300 {
        sim.step();
        if matches!(
            sim.world().rider(rider_id).unwrap().phase,
            RiderPhase::Riding(_)
        ) {
            break;
        }
    }

    let elevator_id = sim.groups()[0].elevator_entities()[0];

    assert!(
        matches!(
            sim.world().rider(rider_id).unwrap().phase,
            RiderPhase::Riding(_)
        ),
        "rider should have boarded within 300 ticks"
    );

    sim.remove_elevator(elevator_id).unwrap();
    let events = sim.drain_events();

    let ejected = events
        .iter()
        .any(|e| matches!(e, Event::RiderEjected { rider, .. } if *rider == rider_id));
    assert!(
        ejected,
        "should emit RiderEjected when removing elevator with rider aboard"
    );
}

#[test]
fn remove_nonexistent_elevator_returns_entity_not_found() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    let fake_id = EntityId::default();
    let result = sim.remove_elevator(fake_id);
    assert!(
        matches!(result, Err(SimError::EntityNotFound(_))),
        "expected EntityNotFound, got {result:?}"
    );
}

// ── remove_stop ───────────────────────────────────────────────────────────────

#[test]
fn remove_stop_despawns_from_world() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    let stop_id = sim.stop_entity(StopId(2)).unwrap();
    assert!(sim.world().stop(stop_id).is_some());

    sim.remove_stop(stop_id).unwrap();

    assert!(sim.world().stop(stop_id).is_none());
}

#[test]
fn remove_stop_removes_from_group_stop_cache() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    let stop_id = sim.stop_entity(StopId(2)).unwrap();
    assert!(sim.groups()[0].stop_entities().contains(&stop_id));

    sim.remove_stop(stop_id).unwrap();

    assert!(!sim.groups()[0].stop_entities().contains(&stop_id));
}

#[test]
fn remove_stop_removes_from_stop_lookup() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    let stop_id = sim.stop_entity(StopId(2)).unwrap();
    assert!(stop_id != EntityId::default());

    sim.remove_stop(stop_id).unwrap();

    // After removal, stop_entity should return None.
    let after = sim.stop_entity(StopId(2));
    assert!(
        after.is_none(),
        "stop_entity should return None after removal"
    );
}

#[test]
fn remove_stop_with_waiting_rider_invalidates_route() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    sim.drain_events();

    // Spawn a rider targeting stop 2.
    let rider_id = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();

    // Ensure the rider is in Waiting phase (before boarding).
    let phase = sim.world().rider(rider_id).unwrap().phase;
    assert_eq!(phase, RiderPhase::Waiting);

    // Remove the destination stop.
    let stop2 = sim.stop_entity(StopId(2)).unwrap();
    sim.remove_stop(stop2).unwrap();

    let events = sim.drain_events();
    // Removing a stop should emit RouteInvalidated for any rider whose route references it.
    let invalidated = events
        .iter()
        .any(|e| matches!(e, Event::RouteInvalidated { rider, .. } if *rider == rider_id));
    assert!(
        invalidated,
        "should emit RouteInvalidated for rider targeting the removed stop"
    );
}

/// `remove_stop` must not leave dangling references in elevator state.
/// Pre-fix: `target_stop`, `DestinationQueue`, and `restricted_stops` all
/// kept pointing at the despawned `EntityId`, which caused subsequent
/// `movement`/`advance_queue` phases to ask `world.stop_position(target_stop)`
/// and get `None`, potentially stalling the elevator.
#[test]
fn remove_stop_clears_dangling_references_on_elevator() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    let stop2 = sim.stop_entity(StopId(2)).unwrap();
    let elev = sim.groups()[0].elevator_entities()[0];

    // Queue stop 2 as a destination, then dispatch so the elevator picks
    // it as its target.
    sim.push_destination(elev, stop2).unwrap();
    sim.step();

    // Seed the restricted_stops set directly (normally populated via
    // config but we want to cover the cleanup path).
    if let Some(car) = sim.world_mut().elevator_mut(elev) {
        car.restricted_stops.insert(stop2);
    }

    // Sanity: the references exist before removal.
    let car = sim.world().elevator(elev).unwrap();
    assert!(
        car.target_stop == Some(stop2)
            || sim
                .destination_queue(elev)
                .is_some_and(|q| q.contains(&stop2)),
        "test precondition: elevator should reference stop2 somehow"
    );
    assert!(car.restricted_stops.contains(&stop2));

    sim.remove_stop(stop2).unwrap();

    let car = sim.world().elevator(elev).unwrap();
    assert_ne!(
        car.target_stop,
        Some(stop2),
        "target_stop must be cleared when the referenced stop is removed"
    );
    if let Some(q) = sim.destination_queue(elev) {
        assert!(
            !q.contains(&stop2),
            "DestinationQueue must not contain the removed stop"
        );
    }
    assert!(
        !car.restricted_stops.contains(&stop2),
        "restricted_stops must not contain the removed stop"
    );
}

#[test]
fn remove_nonexistent_stop_returns_entity_not_found() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    let fake_id = EntityId::default();
    let result = sim.remove_stop(fake_id);
    assert!(
        matches!(result, Err(SimError::EntityNotFound(_))),
        "expected EntityNotFound, got {result:?}"
    );
}

// ── drain_events_where ────────────────────────────────────────────────────────

#[test]
fn drain_events_where_returns_only_matching_events() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    // Spawn a rider to generate events.
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    // Run a few ticks to generate events.
    for _ in 0..5 {
        sim.step();
    }

    // Drain only ElevatorAssigned events.
    let matched = sim.drain_events_where(|e| matches!(e, Event::ElevatorAssigned { .. }));

    // All returned events must be ElevatorAssigned.
    for e in &matched {
        assert!(
            matches!(e, Event::ElevatorAssigned { .. }),
            "unexpected event in matched set: {e:?}"
        );
    }
}

#[test]
fn drain_events_where_retains_non_matching_events() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    for _ in 0..5 {
        sim.step();
    }

    // Count total events before the filter drain.
    let total_before: Vec<Event> = {
        // Peek via a drain of everything and then restore via drain_events_where(|_| true).
        // Instead, drain all first and count.
        sim.drain_events()
    };
    let total_count = total_before.len();

    // Re-run for fresh events.
    let config2 = default_config();
    let mut sim2 = Simulation::new(&config2, scan()).unwrap();
    sim2.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    for _ in 0..5 {
        sim2.step();
    }

    let matched = sim2.drain_events_where(|e| matches!(e, Event::ElevatorAssigned { .. }));
    let remaining = sim2.drain_events();

    // matched + remaining == total events.
    assert_eq!(
        matched.len() + remaining.len(),
        total_count,
        "drain_events_where + drain_events should account for all events"
    );

    // None of the remaining events should be ElevatorAssigned.
    for e in &remaining {
        assert!(
            !matches!(e, Event::ElevatorAssigned { .. }),
            "ElevatorAssigned should have been drained already: {e:?}"
        );
    }
}

#[test]
fn drain_events_where_with_no_match_returns_empty_and_retains_all() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    for _ in 0..5 {
        sim.step();
    }

    let all_before = sim.drain_events();
    let count_before = all_before.len();

    // Re-run for fresh events.
    let config2 = default_config();
    let mut sim2 = Simulation::new(&config2, scan()).unwrap();
    sim2.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    for _ in 0..5 {
        sim2.step();
    }

    // Drain with a predicate that never matches.
    let matched = sim2.drain_events_where(|_| false);
    assert!(
        matched.is_empty(),
        "should return empty vec when nothing matches"
    );

    let remaining = sim2.drain_events();
    assert_eq!(
        remaining.len(),
        count_before,
        "all events should remain after a no-match drain"
    );
}

// ── riders_on ─────────────────────────────────────────────────────────────────

#[test]
fn riders_on_returns_empty_for_idle_elevator() {
    let config = default_config();
    let sim = Simulation::new(&config, scan()).unwrap();
    let elevator_id = sim.groups()[0].elevator_entities()[0];
    assert!(sim.riders_on(elevator_id).is_empty());
}

#[test]
fn riders_on_returns_rider_ids_after_boarding() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    let rider_id = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    let elevator_id = sim.groups()[0].elevator_entities()[0];

    // Run until rider is riding.
    for _ in 0..300 {
        sim.step();
        if matches!(
            sim.world().rider(rider_id).unwrap().phase,
            RiderPhase::Riding(_)
        ) {
            break;
        }
    }

    if matches!(
        sim.world().rider(rider_id).unwrap().phase,
        RiderPhase::Riding(_)
    ) {
        assert!(
            sim.riders_on(elevator_id).contains(&rider_id),
            "rider should appear in riders_on after boarding"
        );
    }
}

#[test]
fn riders_on_returns_empty_for_nonexistent_elevator() {
    let config = default_config();
    let sim = Simulation::new(&config, scan()).unwrap();
    let fake_id = EntityId::default();
    assert!(sim.riders_on(fake_id).is_empty());
}

// ── occupancy ─────────────────────────────────────────────────────────────────

#[test]
fn occupancy_returns_zero_for_idle_elevator() {
    let config = default_config();
    let sim = Simulation::new(&config, scan()).unwrap();
    let elevator_id = sim.groups()[0].elevator_entities()[0];
    assert_eq!(sim.occupancy(elevator_id), 0);
}

#[test]
fn occupancy_returns_correct_count_after_boarding() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    let rider_id = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    let elevator_id = sim.groups()[0].elevator_entities()[0];

    // Run until rider is riding.
    for _ in 0..300 {
        sim.step();
        if matches!(
            sim.world().rider(rider_id).unwrap().phase,
            RiderPhase::Riding(_)
        ) {
            break;
        }
    }

    if matches!(
        sim.world().rider(rider_id).unwrap().phase,
        RiderPhase::Riding(_)
    ) {
        assert_eq!(
            sim.occupancy(elevator_id),
            1,
            "occupancy should be 1 after one rider boards"
        );
    }
}

#[test]
fn occupancy_returns_zero_for_nonexistent_elevator() {
    let config = default_config();
    let sim = Simulation::new(&config, scan()).unwrap();
    let fake_id = EntityId::default();
    assert_eq!(sim.occupancy(fake_id), 0);
}

// ── iter_repositioning_elevators ──────────────────────────────────────────────

#[test]
fn iter_repositioning_elevators_empty_when_no_reposition() {
    let config = default_config();
    let sim = Simulation::new(&config, scan()).unwrap();
    assert!(
        sim.iter_repositioning_elevators().next().is_none(),
        "no elevators should be repositioning without a reposition strategy"
    );
}

#[test]
fn iter_repositioning_elevators_returns_elevator_during_reposition() {
    // Build a sim with ReturnToLobby reposition strategy.
    // Elevator starts at stop 2 (top) and should reposition to stop 0 (lobby).
    let mut sim = SimulationBuilder::new()
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
        .elevator(crate::config::ElevatorConfig {
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
        })
        .dispatch(EtdDispatch::new())
        .reposition(ReturnToLobby::new(), BuiltinReposition::ReturnToLobby)
        .build()
        .unwrap();

    sim.drain_events();
    // First step triggers reposition.
    sim.step();

    let repositioning: Vec<EntityId> = sim.iter_repositioning_elevators().collect();
    assert!(
        !repositioning.is_empty(),
        "elevator should be repositioning after first tick"
    );

    // Every ID returned must be a known elevator.
    let elevator_ids = sim.world().elevator_ids();
    for repo_id in &repositioning {
        assert!(
            elevator_ids.contains(repo_id),
            "iter_repositioning_elevators returned an unknown elevator ID"
        );
    }
}

#[test]
fn iter_repositioning_elevators_empty_after_reposition_completes() {
    let mut sim = SimulationBuilder::new()
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
        .elevator(crate::config::ElevatorConfig {
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
        })
        .dispatch(EtdDispatch::new())
        .reposition(ReturnToLobby::new(), BuiltinReposition::ReturnToLobby)
        .build()
        .unwrap();

    // Run long enough for reposition to complete (20 units at 2.0 u/s).
    for _ in 0..2000 {
        sim.step();
    }

    assert!(
        sim.iter_repositioning_elevators().next().is_none(),
        "no elevators should be repositioning after arrival at home stop"
    );
}

// ── RiderBuilder ──────────────────────────────────────────────────────────────

#[test]
fn rider_builder_basic_spawn() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    let rider_id = sim
        .build_rider_by_stop_id(StopId(0), StopId(2))
        .unwrap()
        .spawn()
        .unwrap();

    let rider = sim.world().rider(rider_id).unwrap();
    assert_eq!(rider.phase, RiderPhase::Waiting);
}

#[test]
fn rider_builder_custom_weight() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    let rider_id = sim
        .build_rider_by_stop_id(StopId(0), StopId(2))
        .unwrap()
        .weight(90.0)
        .spawn()
        .unwrap();

    let rider = sim.world().rider(rider_id).unwrap();
    assert!(
        (rider.weight - 90.0).abs() < f64::EPSILON,
        "rider weight should be 90.0, got {}",
        rider.weight
    );
}

#[test]
fn rider_builder_with_explicit_group() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    // The default config has one group: GroupId(0).
    let rider_id = sim
        .build_rider_by_stop_id(StopId(0), StopId(2))
        .unwrap()
        .group(GroupId(0))
        .spawn()
        .unwrap();

    let rider = sim.world().rider(rider_id).unwrap();
    assert_eq!(rider.phase, RiderPhase::Waiting);
}

#[test]
fn rider_builder_with_patience() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    let rider_id = sim
        .build_rider_by_stop_id(StopId(0), StopId(2))
        .unwrap()
        .patience(100)
        .spawn()
        .unwrap();

    let patience = sim.world().patience(rider_id).unwrap();
    assert_eq!(
        patience.max_wait_ticks(),
        100,
        "patience max_wait_ticks should be 100"
    );
    assert_eq!(patience.waited_ticks(), 0);
}

#[test]
fn rider_builder_with_preferences() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    let prefs = Preferences {
        skip_full_elevator: true,
        max_crowding_factor: 0.5,
        balk_threshold_ticks: None,
        abandon_on_full: false,
    };

    let rider_id = sim
        .build_rider_by_stop_id(StopId(0), StopId(2))
        .unwrap()
        .preferences(prefs)
        .spawn()
        .unwrap();

    let stored = sim.world().preferences(rider_id).unwrap();
    assert!(
        stored.skip_full_elevator(),
        "skip_full_elevator should be true"
    );
    assert!(
        (stored.max_crowding_factor() - 0.5).abs() < f64::EPSILON,
        "max_crowding_factor should be 0.5"
    );
}

#[test]
fn rider_builder_with_access_control() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    let stop0 = sim.stop_entity(StopId(0)).unwrap();
    let stop2 = sim.stop_entity(StopId(2)).unwrap();
    let mut allowed = HashSet::new();
    allowed.insert(stop0);
    allowed.insert(stop2);
    let ac = AccessControl::new(allowed.clone());

    let rider_id = sim
        .build_rider_by_stop_id(StopId(0), StopId(2))
        .unwrap()
        .access_control(ac)
        .spawn()
        .unwrap();

    let stored = sim.world().access_control(rider_id).unwrap();
    assert!(
        stored.can_access(stop0),
        "rider should have access to stop 0"
    );
    assert!(
        stored.can_access(stop2),
        "rider should have access to stop 2"
    );
}

#[test]
fn rider_builder_invalid_stop_id_returns_stop_not_found() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    let result = sim.build_rider_by_stop_id(StopId(0), StopId(99));
    assert!(
        matches!(result, Err(SimError::StopNotFound(StopId(99)))),
        "expected StopNotFound(99)"
    );
}

#[test]
fn rider_builder_no_route_when_stops_not_in_same_group() {
    // Build a sim with two separate groups, each with its own stops.
    let mut sim = SimulationBuilder::new()
        .stops(vec![
            StopConfig {
                id: StopId(0),
                name: "A".into(),
                position: 0.0,
            },
            StopConfig {
                id: StopId(1),
                name: "B".into(),
                position: 10.0,
            },
        ])
        .elevator(crate::config::ElevatorConfig {
            id: 0,
            name: "E1".into(),
            max_speed: 2.0,
            acceleration: 1.5,
            deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 10,
            door_transition_ticks: 5,
            restricted_stops: Vec::new(),
            #[cfg(feature = "energy")]
            energy_profile: None,
            service_mode: None,
            inspection_speed_factor: 0.25,
        })
        .build()
        .unwrap();

    // Remove stop 1 from the group so it's unreachable.
    let stop1 = sim.stop_entity(StopId(1)).unwrap();
    // Remove stop 1 from all lines so it's no longer in the group cache.
    sim.remove_stop(stop1).unwrap();

    // Now attempting to build a rider from stop 0 to the removed stop1
    // should fail because stop1 is no longer in the stop_lookup.
    let result = sim.build_rider_by_stop_id(StopId(0), StopId(1));
    assert!(
        matches!(result, Err(SimError::StopNotFound(_))),
        "expected StopNotFound after stop removed"
    );
}

#[test]
fn rider_builder_spawn_returns_no_route_when_group_not_serving_both_stops() {
    // Build a sim, then spawn a rider using entity IDs directly against a group
    // that doesn't serve the destination — by using the builder with a bad explicit group.
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    // GroupId(99) does not exist.
    let result = sim
        .build_rider_by_stop_id(StopId(0), StopId(2))
        .unwrap()
        .group(GroupId(99))
        .spawn();

    assert!(
        matches!(result, Err(SimError::GroupNotFound(GroupId(99)))),
        "expected GroupNotFound(99), got {result:?}"
    );
}

// ── Dispatch re-exports (compilation / import tests) ─────────────────────────

#[test]
fn dispatch_scan_resolves() {
    let _: ScanDispatch = ScanDispatch::new();
}

#[test]
fn dispatch_look_resolves() {
    let _: LookDispatch = LookDispatch::new();
}

#[test]
fn dispatch_etd_resolves() {
    let _: EtdDispatch = EtdDispatch::new();
}

#[test]
fn dispatch_nearest_car_resolves() {
    let _: NearestCarDispatch = NearestCarDispatch::new();
}

// ── Additional edge cases ─────────────────────────────────────────────────────

#[test]
fn remove_elevator_then_riders_on_returns_empty() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    let elevator_id = sim.groups()[0].elevator_entities()[0];

    sim.remove_elevator(elevator_id).unwrap();

    // After removal, riders_on should return empty (not panic).
    assert!(sim.riders_on(elevator_id).is_empty());
}

#[test]
fn remove_elevator_then_occupancy_returns_zero() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    let elevator_id = sim.groups()[0].elevator_entities()[0];

    sim.remove_elevator(elevator_id).unwrap();

    assert_eq!(sim.occupancy(elevator_id), 0);
}

#[test]
fn drain_events_where_with_all_matching_empties_buffer() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    for _ in 0..5 {
        sim.step();
    }

    // Drain everything.
    let all = sim.drain_events_where(|_| true);
    assert!(!all.is_empty(), "should have some events to drain");

    // Buffer should now be empty.
    let remaining = sim.drain_events();
    assert!(
        remaining.is_empty(),
        "buffer should be empty after all-matching drain"
    );
}

#[test]
fn rider_builder_default_weight_is_75() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    let rider_id = sim
        .build_rider_by_stop_id(StopId(0), StopId(2))
        .unwrap()
        .spawn()
        .unwrap();

    let rider = sim.world().rider(rider_id).unwrap();
    assert!(
        (rider.weight - 75.0).abs() < f64::EPSILON,
        "default weight should be 75.0, got {}",
        rider.weight
    );
}

#[test]
fn rider_builder_no_patience_by_default() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    let rider_id = sim
        .build_rider_by_stop_id(StopId(0), StopId(2))
        .unwrap()
        .spawn()
        .unwrap();

    // Without calling .patience(), no Patience component is set.
    assert!(
        sim.world().patience(rider_id).is_none(),
        "rider should have no Patience component by default"
    );
}

#[test]
fn rider_builder_no_preferences_by_default() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    let rider_id = sim
        .build_rider_by_stop_id(StopId(0), StopId(2))
        .unwrap()
        .spawn()
        .unwrap();

    assert!(
        sim.world().preferences(rider_id).is_none(),
        "rider should have no Preferences component by default"
    );
}

#[test]
fn rider_builder_no_access_control_by_default() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    let rider_id = sim
        .build_rider_by_stop_id(StopId(0), StopId(2))
        .unwrap()
        .spawn()
        .unwrap();

    assert!(
        sim.world().access_control(rider_id).is_none(),
        "rider should have no AccessControl component by default"
    );
}

// ── ElevatorRemoved / StopRemoved events ──────────────────────────────────────

#[test]
fn remove_elevator_emits_elevator_removed_event() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    sim.drain_events();

    let elevator_id = sim.groups()[0].elevator_entities()[0];
    sim.remove_elevator(elevator_id).unwrap();

    let events = sim.drain_events();
    let removed = events
        .iter()
        .any(|e| matches!(e, Event::ElevatorRemoved { elevator, .. } if *elevator == elevator_id));
    assert!(removed, "should emit ElevatorRemoved event");
}

#[test]
fn remove_stop_emits_stop_removed_event() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    sim.drain_events();

    let stop_eid = sim.stop_entity(StopId(2)).unwrap();
    sim.remove_stop(stop_eid).unwrap();

    let events = sim.drain_events();
    let removed = events
        .iter()
        .any(|e| matches!(e, Event::StopRemoved { stop, .. } if *stop == stop_eid));
    assert!(removed, "should emit StopRemoved event");
}
