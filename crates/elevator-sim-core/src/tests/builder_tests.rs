use crate::builder::SimulationBuilder;
use crate::config::{
    BuildingConfig, ElevatorConfig, PassengerSpawnConfig, SimConfig, SimulationParams,
};
use crate::dispatch::look::LookDispatch;
use crate::hooks::Phase;
use crate::stop::{StopConfig, StopId};
use std::sync::{Arc, Mutex};

#[test]
fn default_builder_produces_valid_sim() {
    let sim = SimulationBuilder::new().build();
    assert!(sim.is_ok());
    let sim = sim.unwrap();
    assert_eq!(sim.current_tick(), 0);
}

#[test]
fn from_config_produces_valid_sim() {
    let config = SimConfig {
        building: BuildingConfig {
            name: "Test".into(),
            stops: vec![
                StopConfig { id: StopId(0), name: "A".into(), position: 0.0 },
                StopConfig { id: StopId(1), name: "B".into(), position: 5.0 },
                StopConfig { id: StopId(2), name: "C".into(), position: 10.0 },
            ],
        },
        elevators: vec![ElevatorConfig {
            id: 0,
            name: "E1".into(),
            max_speed: 3.0,
            acceleration: 2.0,
            deceleration: 2.0,
            weight_capacity: 1000.0,
            starting_stop: StopId(0),
            door_open_ticks: 8,
            door_transition_ticks: 4,
        }],
        simulation: SimulationParams { ticks_per_second: 30.0 },
        passenger_spawning: PassengerSpawnConfig {
            mean_interval_ticks: 60,
            weight_range: (50.0, 90.0),
        },
    };

    let sim = SimulationBuilder::from_config(config).build();
    assert!(sim.is_ok());
}

#[test]
fn custom_dispatch_strategy() {
    let sim = SimulationBuilder::new()
        .dispatch(LookDispatch::new())
        .build();
    assert!(sim.is_ok());
}

#[test]
fn builder_with_stops_and_elevators() {
    let sim = SimulationBuilder::new()
        .stops(vec![
            StopConfig { id: StopId(0), name: "Ground".into(), position: 0.0 },
            StopConfig { id: StopId(1), name: "Floor 2".into(), position: 4.0 },
            StopConfig { id: StopId(2), name: "Floor 3".into(), position: 8.0 },
        ])
        .elevator(ElevatorConfig {
            id: 1,
            name: "E2".into(),
            max_speed: 2.0,
            acceleration: 1.5,
            deceleration: 1.5,
            weight_capacity: 600.0,
            starting_stop: StopId(0),
            door_open_ticks: 10,
            door_transition_ticks: 5,
        })
        .ticks_per_second(120.0)
        .build();
    assert!(sim.is_ok());
}

#[test]
fn builder_propagates_validation_errors() {
    // Zero stops should fail.
    let result = SimulationBuilder::new()
        .stops(vec![])
        .build();
    assert!(result.is_err());
}

#[test]
fn builder_hooks_are_passed_through() {
    let log = Arc::new(Mutex::new(Vec::new()));
    let log_clone = Arc::clone(&log);

    let mut sim = SimulationBuilder::new()
        .before(Phase::Movement, move |_world| {
            log_clone.lock().unwrap().push("before_movement");
        })
        .build()
        .unwrap();

    sim.step();

    let entries = log.lock().unwrap();
    assert_eq!(&*entries, &["before_movement"]);
}

#[test]
fn builder_ticks_per_second() {
    let sim = SimulationBuilder::new()
        .ticks_per_second(120.0)
        .build()
        .unwrap();
    let expected_dt = 1.0 / 120.0;
    assert!((sim.dt() - expected_dt).abs() < 1e-10);
}
