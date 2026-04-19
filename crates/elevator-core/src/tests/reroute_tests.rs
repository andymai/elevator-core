use crate::components::RiderPhase;
use crate::components::{Accel, Speed, Weight};
use crate::config::{
    BuildingConfig, ElevatorConfig, PassengerSpawnConfig, SimConfig, SimulationParams,
};
use crate::dispatch::scan::ScanDispatch;
use crate::entity::RiderId;
use crate::error::SimError;
use crate::events::{Event, RouteInvalidReason};
use crate::sim::Simulation;
use crate::stop::{StopConfig, StopId};

fn three_stop_config() -> SimConfig {
    SimConfig {
        building: BuildingConfig {
            name: "Reroute".into(),
            stops: vec![
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
                StopConfig {
                    id: StopId(2),
                    name: "C".into(),
                    position: 20.0,
                },
            ],
            lines: None,
            groups: None,
        },
        elevators: vec![ElevatorConfig {
            id: 0,
            name: "E0".into(),
            max_speed: Speed::from(5.0),
            acceleration: Accel::from(3.0),
            deceleration: Accel::from(3.0),
            weight_capacity: Weight::from(800.0),
            starting_stop: StopId(0),
            door_open_ticks: 5,
            door_transition_ticks: 3,
            restricted_stops: Vec::new(),
            #[cfg(feature = "energy")]
            energy_profile: None,
            service_mode: None,
            inspection_speed_factor: 0.25,

            bypass_load_up_pct: None,

            bypass_load_down_pct: None,
        }],
        simulation: SimulationParams {
            ticks_per_second: 60.0,
        },
        passenger_spawning: PassengerSpawnConfig {
            mean_interval_ticks: 120,
            weight_range: (50.0, 100.0),
        },
    }
}

#[test]
fn reroute_changes_rider_destination() {
    let config = three_stop_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    // Spawn rider from 0 → 2.
    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    // Reroute to stop 1 instead.
    let stop1 = sim.stop_entity(StopId(1)).unwrap();
    sim.reroute(rider, stop1).unwrap();

    let route = sim.world().route(rider.entity()).unwrap();
    assert_eq!(route.current_destination(), Some(stop1));
}

#[test]
fn disable_stop_reroutes_affected_riders() {
    let config = three_stop_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    // Spawn rider from 0 → 1.
    let rider = sim.spawn_rider(StopId(0), StopId(1), 70.0).unwrap();

    // Disable stop 1 — rider should be rerouted to nearest alternative (stop 2).
    let stop1 = sim.stop_entity(StopId(1)).unwrap();
    sim.disable(stop1).unwrap();
    sim.drain_events(); // flush

    let route = sim.world().route(rider.entity()).unwrap();
    let dest = route.current_destination().unwrap();
    // Should have been rerouted to stop 2 (nearest enabled alternative).
    let stop2 = sim.stop_entity(StopId(2)).unwrap();
    assert_eq!(dest, stop2);
}

#[test]
fn disable_stop_emits_route_invalidated_event() {
    let config = three_stop_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    sim.spawn_rider(StopId(0), StopId(1), 70.0).unwrap();

    let stop1 = sim.stop_entity(StopId(1)).unwrap();
    sim.disable(stop1).unwrap();

    let events = sim.drain_events();
    let invalidated: Vec<_> = events
        .iter()
        .filter(|e| matches!(e, Event::RouteInvalidated { .. }))
        .collect();

    assert_eq!(invalidated.len(), 1);
    if let Event::RouteInvalidated { reason, .. } = invalidated[0] {
        assert_eq!(*reason, RouteInvalidReason::StopDisabled);
    }
}

#[test]
fn disable_only_stop_causes_abandonment() {
    // Config with only 2 stops. Disable the destination — no alternative.
    let config = SimConfig {
        building: BuildingConfig {
            name: "Two".into(),
            stops: vec![
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
            ],
            lines: None,
            groups: None,
        },
        elevators: vec![ElevatorConfig {
            id: 0,
            name: "E0".into(),
            max_speed: Speed::from(5.0),
            acceleration: Accel::from(3.0),
            deceleration: Accel::from(3.0),
            weight_capacity: Weight::from(800.0),
            starting_stop: StopId(0),
            door_open_ticks: 5,
            door_transition_ticks: 3,
            restricted_stops: Vec::new(),
            #[cfg(feature = "energy")]
            energy_profile: None,
            service_mode: None,
            inspection_speed_factor: 0.25,

            bypass_load_up_pct: None,

            bypass_load_down_pct: None,
        }],
        simulation: SimulationParams {
            ticks_per_second: 60.0,
        },
        passenger_spawning: PassengerSpawnConfig {
            mean_interval_ticks: 120,
            weight_range: (50.0, 100.0),
        },
    };

    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();
    let rider = sim.spawn_rider(StopId(0), StopId(1), 70.0).unwrap();

    // Disable the only other stop — no alternative available.
    let stop1 = sim.stop_entity(StopId(1)).unwrap();
    sim.disable(stop1).unwrap();

    // Rider should have been abandoned.
    let r = sim.world().rider(rider.entity()).unwrap();
    assert_eq!(r.phase, RiderPhase::Abandoned);

    // Should emit NoAlternative event.
    let events = sim.drain_events();
    let invalidated_count = events
        .iter()
        .filter(|e| {
            matches!(
                e,
                Event::RouteInvalidated {
                    reason: RouteInvalidReason::NoAlternative,
                    ..
                }
            )
        })
        .count();
    assert_eq!(invalidated_count, 1);

    // `invalidate_routes_for_stop`'s abandon path is the fourth
    // rider-abandonment site in the codebase; like the two in
    // `advance_transient` it must scrub the rider from every hall call
    // so `pending_riders.is_empty()` stays accurate for mode detection
    // and car-call cleanup.
    let origin = sim.stop_entity(StopId(0)).unwrap();
    let up = sim
        .world()
        .hall_call(origin, crate::components::CallDirection::Up);
    if let Some(call) = up {
        assert!(
            !call.pending_riders.contains(&rider.entity()),
            "stop-disable abandonment must scrub pending_riders"
        );
    }
}

#[test]
fn set_rider_route_replaces_route() {
    use crate::components::{Route, RouteLeg, TransportMode};
    use crate::ids::GroupId;

    let config = three_stop_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    let stop0 = sim.stop_entity(StopId(0)).unwrap();
    let stop1 = sim.stop_entity(StopId(1)).unwrap();
    let stop2 = sim.stop_entity(StopId(2)).unwrap();

    // Set a multi-leg route: 0→1, then 1→2.
    let route = Route {
        legs: vec![
            RouteLeg {
                from: stop0,
                to: stop1,
                via: TransportMode::Group(GroupId(0)),
            },
            RouteLeg {
                from: stop1,
                to: stop2,
                via: TransportMode::Group(GroupId(0)),
            },
        ],
        current_leg: 0,
    };
    sim.set_rider_route(rider.entity(), route).unwrap();

    let r = sim.world().route(rider.entity()).unwrap();
    assert_eq!(r.legs.len(), 2);
    assert_eq!(r.current_destination(), Some(stop1));
}

#[test]
fn reroute_rejects_non_waiting_rider() {
    let config = three_stop_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    // Advance until rider is boarding or riding.
    for _ in 0..500 {
        sim.step();
        let phase = sim.world().rider(rider.entity()).unwrap().phase;
        if matches!(phase, RiderPhase::Riding(_) | RiderPhase::Arrived) {
            break;
        }
    }

    let stop1 = sim.stop_entity(StopId(1)).unwrap();
    let result = sim.reroute(rider, stop1);

    // Should fail if rider is not Waiting.
    let phase = sim.world().rider(rider.entity()).unwrap().phase;
    if phase != RiderPhase::Waiting {
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            SimError::WrongRiderPhase { .. }
        ));
    }
}

#[test]
fn reroute_nonexistent_rider_returns_error() {
    let config = three_stop_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let stop1 = sim.stop_entity(StopId(1)).unwrap();
    // Use a stop entity as a fake rider — it's a valid EntityId but not a rider.
    let result = sim.reroute(RiderId::from(stop1), stop1);
    assert!(result.is_err());
}
