use crate::components::RiderPhase;
use crate::config::{
    BuildingConfig, ElevatorConfig, PassengerSpawnConfig, SimConfig, SimulationParams,
};
use crate::dispatch::scan::ScanDispatch;
use crate::events::{Event, RouteInvalidReason};
use crate::sim::Simulation;
use crate::stop::{StopConfig, StopId};

fn three_stop_config() -> SimConfig {
    SimConfig {
        building: BuildingConfig {
            name: "Reroute".into(),
            stops: vec![
                StopConfig { id: StopId(0), name: "A".into(), position: 0.0 },
                StopConfig { id: StopId(1), name: "B".into(), position: 10.0 },
                StopConfig { id: StopId(2), name: "C".into(), position: 20.0 },
            ],
        },
        elevators: vec![ElevatorConfig {
            id: 0,
            name: "E0".into(),
            max_speed: 5.0,
            acceleration: 3.0,
            deceleration: 3.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 5,
            door_transition_ticks: 3,
        }],
        simulation: SimulationParams { ticks_per_second: 60.0 },
        passenger_spawning: PassengerSpawnConfig {
            mean_interval_ticks: 120,
            weight_range: (50.0, 100.0),
        },
    }
}

#[test]
fn reroute_changes_rider_destination() {
    let config = three_stop_config();
    let mut sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();

    // Spawn rider from 0 → 2.
    let rider = sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0).unwrap();

    // Reroute to stop 1 instead.
    let stop1 = sim.stop_entity(StopId(1)).unwrap();
    sim.reroute(rider, stop1).unwrap();

    let route = sim.world().route(rider).unwrap();
    assert_eq!(route.current_destination(), Some(stop1));
}

#[test]
fn disable_stop_reroutes_affected_riders() {
    let config = three_stop_config();
    let mut sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();

    // Spawn rider from 0 → 1.
    let rider = sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 70.0).unwrap();

    // Disable stop 1 — rider should be rerouted to nearest alternative (stop 2).
    let stop1 = sim.stop_entity(StopId(1)).unwrap();
    sim.disable(stop1).unwrap();
    sim.drain_events(); // flush

    let route = sim.world().route(rider).unwrap();
    let dest = route.current_destination().unwrap();
    // Should have been rerouted to stop 2 (nearest enabled alternative).
    let stop2 = sim.stop_entity(StopId(2)).unwrap();
    assert_eq!(dest, stop2);
}

#[test]
fn disable_stop_emits_route_invalidated_event() {
    let config = three_stop_config();
    let mut sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();

    sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 70.0).unwrap();

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
                StopConfig { id: StopId(0), name: "A".into(), position: 0.0 },
                StopConfig { id: StopId(1), name: "B".into(), position: 10.0 },
            ],
        },
        elevators: vec![ElevatorConfig {
            id: 0,
            name: "E0".into(),
            max_speed: 5.0,
            acceleration: 3.0,
            deceleration: 3.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 5,
            door_transition_ticks: 3,
        }],
        simulation: SimulationParams { ticks_per_second: 60.0 },
        passenger_spawning: PassengerSpawnConfig {
            mean_interval_ticks: 120,
            weight_range: (50.0, 100.0),
        },
    };

    let mut sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();
    let rider = sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 70.0).unwrap();

    // Disable the only other stop — no alternative available.
    let stop1 = sim.stop_entity(StopId(1)).unwrap();
    sim.disable(stop1).unwrap();

    // Rider should have been abandoned.
    let r = sim.world().rider(rider).unwrap();
    assert_eq!(r.phase, RiderPhase::Abandoned);

    // Should emit NoAlternative event.
    let events = sim.drain_events();
    let invalidated: Vec<_> = events
        .iter()
        .filter(|e| matches!(e, Event::RouteInvalidated { reason: RouteInvalidReason::NoAlternative, .. }))
        .collect();
    assert_eq!(invalidated.len(), 1);
}

#[test]
fn set_rider_route_replaces_route() {
    let config = three_stop_config();
    let mut sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();

    let rider = sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0).unwrap();

    let stop0 = sim.stop_entity(StopId(0)).unwrap();
    let stop1 = sim.stop_entity(StopId(1)).unwrap();
    let stop2 = sim.stop_entity(StopId(2)).unwrap();

    // Set a multi-leg route: 0→1, then 1→2.
    use crate::components::{Route, RouteLeg, TransportMode};
    use crate::ids::GroupId;
    let route = Route {
        legs: vec![
            RouteLeg { from: stop0, to: stop1, via: TransportMode::Elevator(GroupId(0)) },
            RouteLeg { from: stop1, to: stop2, via: TransportMode::Elevator(GroupId(0)) },
        ],
        current_leg: 0,
    };
    sim.set_rider_route(rider, route).unwrap();

    let r = sim.world().route(rider).unwrap();
    assert_eq!(r.legs.len(), 2);
    assert_eq!(r.current_destination(), Some(stop1));
}
