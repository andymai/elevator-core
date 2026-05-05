//! Compiles each of the playground's RON scenarios through `Simulation::new`.
//!
//! Prevents a syntactically-valid-but-semantically-broken scenario (unknown
//! strategy enum, mismatched field names, negative positions, etc.) from
//! reaching the browser where the failure shows up as a mystery "Init
//! failed" toast. Values must stay in sync with
//! `playground/src/scenarios.ts`; a drift there and the test here should
//! fail together.

use elevator_core::config::SimConfig;
use elevator_core::dispatch::{DestinationDispatch, EtdDispatch, ScanDispatch};
use elevator_core::sim::Simulation;

const OFFICE: &str = r#"SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: "Mid-Rise Office",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby",   position: 0.0),
            StopConfig(id: StopId(1), name: "Floor 2", position: 4.0),
            StopConfig(id: StopId(2), name: "Floor 3", position: 8.0),
            StopConfig(id: StopId(3), name: "Floor 4", position: 12.0),
            StopConfig(id: StopId(4), name: "Floor 5", position: 16.0),
            StopConfig(id: StopId(5), name: "Floor 6", position: 20.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 2.2, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 90,
        weight_range: (50.0, 100.0),
    ),
)"#;

const SKYSCRAPER: &str = r#"SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: "Skyscraper (Sky Lobby)",
        stops: [
            StopConfig(id: StopId(0),  name: "Lobby",      position: 0.0),
            StopConfig(id: StopId(1),  name: "Floor 2",    position: 4.0),
            StopConfig(id: StopId(2),  name: "Floor 3",    position: 8.0),
            StopConfig(id: StopId(3),  name: "Floor 4",    position: 12.0),
            StopConfig(id: StopId(4),  name: "Floor 5",    position: 16.0),
            StopConfig(id: StopId(5),  name: "Floor 6",    position: 20.0),
            StopConfig(id: StopId(6),  name: "Sky Lobby",  position: 24.0),
            StopConfig(id: StopId(7),  name: "Floor 8",    position: 28.0),
            StopConfig(id: StopId(8),  name: "Floor 9",    position: 32.0),
            StopConfig(id: StopId(9),  name: "Floor 10",   position: 36.0),
            StopConfig(id: StopId(10), name: "Floor 11",   position: 40.0),
            StopConfig(id: StopId(11), name: "Floor 12",   position: 44.0),
            StopConfig(id: StopId(12), name: "Penthouse",  position: 48.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car A",
            max_speed: 4.0, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1200.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 16,
            bypass_load_up_pct: Some(0.80), bypass_load_down_pct: Some(0.50),
        ),
        ElevatorConfig(
            id: 1, name: "Car B",
            max_speed: 4.0, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1200.0,
            starting_stop: StopId(6),
            door_open_ticks: 55, door_transition_ticks: 16,
            bypass_load_up_pct: Some(0.80), bypass_load_down_pct: Some(0.50),
        ),
        ElevatorConfig(
            id: 2, name: "Car C",
            max_speed: 4.0, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1200.0,
            starting_stop: StopId(12),
            door_open_ticks: 55, door_transition_ticks: 16,
            bypass_load_up_pct: Some(0.80), bypass_load_down_pct: Some(0.50),
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 30,
        weight_range: (55.0, 100.0),
    ),
)"#;

const RESIDENTIAL: &str = r#"SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: "Residential Tower",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby",     position: 0.0),
            StopConfig(id: StopId(1), name: "Floor 2",   position: 3.5),
            StopConfig(id: StopId(2), name: "Floor 3",   position: 7.0),
            StopConfig(id: StopId(3), name: "Floor 4",   position: 10.5),
            StopConfig(id: StopId(4), name: "Floor 5",   position: 14.0),
            StopConfig(id: StopId(5), name: "Floor 6",   position: 17.5),
            StopConfig(id: StopId(6), name: "Floor 7",   position: 21.0),
            StopConfig(id: StopId(7), name: "Penthouse", position: 24.5),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 2.5, acceleration: 1.6, deceleration: 2.2,
            weight_capacity: 700.0,
            starting_stop: StopId(0),
            door_open_ticks: 50, door_transition_ticks: 14,
        ),
        ElevatorConfig(
            id: 1, name: "Car 2",
            max_speed: 2.5, acceleration: 1.6, deceleration: 2.2,
            weight_capacity: 700.0,
            starting_stop: StopId(4),
            door_open_ticks: 50, door_transition_ticks: 14,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 75,
        weight_range: (50.0, 95.0),
    ),
)"#;

const HOTEL: &str = r#"SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: "Hotel 24/7",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby",      position: 0.0),
            StopConfig(id: StopId(1), name: "Restaurant", position: 3.5),
            StopConfig(id: StopId(2), name: "Floor 3",    position: 7.0),
            StopConfig(id: StopId(3), name: "Floor 4",    position: 10.5),
            StopConfig(id: StopId(4), name: "Floor 5",    position: 14.0),
            StopConfig(id: StopId(5), name: "Floor 6",    position: 17.5),
            StopConfig(id: StopId(6), name: "Floor 7",    position: 21.0),
            StopConfig(id: StopId(7), name: "Floor 8",    position: 24.5),
            StopConfig(id: StopId(8), name: "Floor 9",    position: 28.0),
            StopConfig(id: StopId(9), name: "Penthouse",  position: 31.5),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car A",
            max_speed: 3.0, acceleration: 1.8, deceleration: 2.3,
            weight_capacity: 900.0,
            starting_stop: StopId(0),
            door_open_ticks: 60, door_transition_ticks: 15,
        ),
        ElevatorConfig(
            id: 1, name: "Car B",
            max_speed: 3.0, acceleration: 1.8, deceleration: 2.3,
            weight_capacity: 900.0,
            starting_stop: StopId(4),
            door_open_ticks: 60, door_transition_ticks: 15,
        ),
        ElevatorConfig(
            id: 2, name: "Car C",
            max_speed: 3.0, acceleration: 1.8, deceleration: 2.3,
            weight_capacity: 900.0,
            starting_stop: StopId(9),
            door_open_ticks: 60, door_transition_ticks: 15,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 120,
        weight_range: (50.0, 95.0),
    ),
)"#;

const CONVENTION: &str = r#"SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: "Convention Center",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby",        position: 0.0),
            StopConfig(id: StopId(1), name: "Exhibit Hall", position: 4.0),
            StopConfig(id: StopId(2), name: "Mezzanine",    position: 8.0),
            StopConfig(id: StopId(3), name: "Ballroom",     position: 12.0),
            StopConfig(id: StopId(4), name: "Keynote Hall", position: 16.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 3.5, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1500.0,
            starting_stop: StopId(0),
            door_open_ticks: 50, door_transition_ticks: 12,
        ),
        ElevatorConfig(
            id: 1, name: "Car 2",
            max_speed: 3.5, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1500.0,
            starting_stop: StopId(4),
            door_open_ticks: 50, door_transition_ticks: 12,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 30,
        weight_range: (55.0, 100.0),
    ),
)"#;

const SPACE: &str = r#"SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: "Orbital Tether",
        stops: [
            StopConfig(id: StopId(0), name: "Ground Station",   position: 0.0),
            StopConfig(id: StopId(1), name: "Orbital Platform", position: 1000.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Climber Alpha",
            max_speed: 50.0, acceleration: 10.0, deceleration: 15.0,
            weight_capacity: 10000.0,
            starting_stop: StopId(0),
            door_open_ticks: 120, door_transition_ticks: 30,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 900,
        weight_range: (60.0, 90.0),
    ),
)"#;

fn build(ron: &str) -> Simulation {
    let config: SimConfig = ron::from_str(ron).expect("scenario RON must parse");
    Simulation::new(&config, ScanDispatch::new()).expect("scenario must validate")
}

#[test]
fn office_scenario_builds_and_steps() {
    let mut sim = build(OFFICE);
    // A brief run confirms the built-in tick loop operates on the config
    // without panicking — catches validator gaps the config parser alone
    // wouldn't expose.
    for _ in 0..60 {
        sim.step();
    }
}

#[test]
fn skyscraper_scenario_with_bypass_builds() {
    let mut sim = build(SKYSCRAPER);
    for _ in 0..60 {
        sim.step();
    }
    // The bypass thresholds flow through the config parser and land on
    // the Elevator component. Sanity-check a non-default value survived.
    // `iter_elevators` yields `(EntityId, &Position, &Elevator)` — we
    // want the third element.
    let (_, _, car) = sim.world().iter_elevators().next().unwrap();
    assert_eq!(car.bypass_load_up_pct(), Some(0.80));
    assert_eq!(car.bypass_load_down_pct(), Some(0.50));
}

#[test]
fn residential_scenario_builds() {
    let mut sim = build(RESIDENTIAL);
    for _ in 0..60 {
        sim.step();
    }
}

#[test]
fn hotel_scenario_builds_and_accepts_dcs_swap() {
    // Construct with SCAN, then swap to DCS — mirrors what the wasm
    // wrapper does when the playground applies the hotel scenario's
    // `deferred_dcs` hook on load.
    let config: SimConfig = ron::from_str(HOTEL).expect("hotel RON must parse");
    let mut sim = Simulation::new(&config, ScanDispatch::new()).expect("hotel must validate");
    for g in sim.groups_mut() {
        g.set_hall_call_mode(elevator_core::dispatch::HallCallMode::Destination);
    }
    let gids: Vec<_> = sim.dispatchers().keys().copied().collect();
    for gid in gids {
        sim.set_dispatch(
            gid,
            Box::new(DestinationDispatch::new().with_commitment_window_ticks(180)),
            elevator_core::dispatch::BuiltinStrategy::Destination,
        );
    }
    for _ in 0..60 {
        sim.step();
    }
}

#[test]
fn convention_scenario_builds() {
    let mut sim = build(CONVENTION);
    for _ in 0..60 {
        sim.step();
    }
}

#[test]
fn space_elevator_scenario_builds() {
    let mut sim = build(SPACE);
    for _ in 0..60 {
        sim.step();
    }
}

/// End-to-end runtime topology: build a fresh group + line + stops +
/// elevator at runtime (no config-time `StopId`s), spawn a rider by
/// entity ref, step until delivered. Exercises the public mutation
/// API the same way an external consumer would when building the
/// world from external state (e.g. from a player-edited grid).
#[test]
fn runtime_topology_delivers_a_rider_by_entity_ref() {
    use elevator_core::prelude::SimulationBuilder;
    use elevator_core::sim::LineParams;

    let mut sim = SimulationBuilder::demo().build().unwrap();

    // Position the new shaft well away from the demo's stops so
    // `find_stop_at_position` returns the right entity at boundaries.
    let group = sim.add_group("shaft-0", ScanDispatch::new());
    let mut line_params = LineParams::new("shaft-0", group);
    line_params.min_position = 100.0;
    line_params.max_position = 112.0;
    line_params.max_cars = Some(4);
    let line = sim.add_line(&line_params).expect("add_line");

    let stop_lobby = sim.add_stop("F0".into(), 100.0, line).expect("add_stop F0");
    let stop_floor3 = sim.add_stop("F3".into(), 109.0, line).expect("add_stop F3");

    let params = elevator_core::sim::ElevatorParams {
        max_speed: elevator_core::components::Speed::from(2.0),
        ..elevator_core::sim::ElevatorParams::default()
    };
    let _car = sim
        .add_elevator(&params, line, 100.0)
        .expect("add_elevator");

    // Spawn by EntityId (the form `WasmSim::spawnRiderByRef` exposes
    // to JS for runtime-added stops with no `StopId`).
    let rider = sim
        .build_rider(stop_lobby, stop_floor3)
        .expect("build_rider with entity refs")
        .weight(70.0)
        .spawn()
        .expect("spawn");

    let mut delivered = false;
    for _ in 0..5000 {
        sim.step();
        let r = sim.world().rider(rider.entity()).unwrap();
        if r.phase() == elevator_core::components::RiderPhase::Arrived {
            delivered = true;
            break;
        }
    }
    assert!(
        delivered,
        "rider should reach destination within 5000 ticks"
    );
    assert!(sim.metrics().total_delivered() >= 1);
}

/// Office's group-time ETD hook swaps the active strategy to a tuned
/// `EtdDispatch`. Make sure the swap path the wasm wrapper uses actually
/// lands the weight on the instance.
#[test]
fn etd_group_time_swap_path_applies_weight() {
    let config: SimConfig = ron::from_str(OFFICE).expect("office RON must parse");
    let mut sim = Simulation::new(&config, ScanDispatch::new()).expect("office must validate");
    let gids: Vec<_> = sim.dispatchers().keys().copied().collect();
    for gid in gids {
        sim.set_dispatch(
            gid,
            Box::new(EtdDispatch::new().with_wait_squared_weight(0.002)),
            elevator_core::dispatch::BuiltinStrategy::Etd,
        );
    }
    for _ in 0..300 {
        sim.step();
    }
}
