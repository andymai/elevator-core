use crate::error::SimError;
use crate::sim::Simulation;
use crate::stop::{StopConfig, StopId};

use super::helpers::{default_config, scan};

// ── Config validation ────────────────────────────────────────────

#[test]
fn rejects_zero_stops() {
    let mut config = default_config();
    config.building.stops.clear();
    let err = Simulation::new(&config, scan()).unwrap_err();
    assert!(matches!(err, SimError::InvalidConfig { field: "building.stops", .. }));
}

#[test]
fn rejects_duplicate_stop_ids() {
    let mut config = default_config();
    config.building.stops.push(StopConfig {
        id: StopId(0), // duplicate
        name: "Dup".into(),
        position: 12.0,
    });
    let err = Simulation::new(&config, scan()).unwrap_err();
    assert!(matches!(err, SimError::InvalidConfig { field: "building.stops", .. }));
}

#[test]
fn rejects_zero_elevators() {
    let mut config = default_config();
    config.elevators.clear();
    let err = Simulation::new(&config, scan()).unwrap_err();
    assert!(matches!(err, SimError::InvalidConfig { field: "elevators", .. }));
}

#[test]
fn rejects_negative_max_speed() {
    let mut config = default_config();
    config.elevators[0].max_speed = -1.0;
    let err = Simulation::new(&config, scan()).unwrap_err();
    assert!(matches!(err, SimError::InvalidConfig { field: "elevators.max_speed", .. }));
}

#[test]
fn rejects_zero_acceleration() {
    let mut config = default_config();
    config.elevators[0].acceleration = 0.0;
    let err = Simulation::new(&config, scan()).unwrap_err();
    assert!(matches!(err, SimError::InvalidConfig { field: "elevators.acceleration", .. }));
}

#[test]
fn rejects_negative_deceleration() {
    let mut config = default_config();
    config.elevators[0].deceleration = -0.5;
    let err = Simulation::new(&config, scan()).unwrap_err();
    assert!(matches!(err, SimError::InvalidConfig { field: "elevators.deceleration", .. }));
}

#[test]
fn rejects_zero_weight_capacity() {
    let mut config = default_config();
    config.elevators[0].weight_capacity = 0.0;
    let err = Simulation::new(&config, scan()).unwrap_err();
    assert!(matches!(err, SimError::InvalidConfig { field: "elevators.weight_capacity", .. }));
}

#[test]
fn rejects_invalid_starting_stop() {
    let mut config = default_config();
    config.elevators[0].starting_stop = StopId(999);
    let err = Simulation::new(&config, scan()).unwrap_err();
    assert!(matches!(err, SimError::InvalidConfig { field: "elevators.starting_stop", .. }));
}

#[test]
fn rejects_zero_ticks_per_second() {
    let mut config = default_config();
    config.simulation.ticks_per_second = 0.0;
    let err = Simulation::new(&config, scan()).unwrap_err();
    assert!(matches!(err, SimError::InvalidConfig { field: "simulation.ticks_per_second", .. }));
}

#[test]
fn rejects_negative_ticks_per_second() {
    let mut config = default_config();
    config.simulation.ticks_per_second = -60.0;
    let err = Simulation::new(&config, scan()).unwrap_err();
    assert!(matches!(err, SimError::InvalidConfig { field: "simulation.ticks_per_second", .. }));
}

#[test]
fn valid_config_succeeds() {
    let config = default_config();
    assert!(Simulation::new(&config, scan()).is_ok());
}

// ── Spawn errors ─────────────────────────────────────────────────

#[test]
fn spawn_rider_unknown_stop_returns_error() {
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    let err = sim.spawn_rider_by_stop_id(StopId(99), StopId(0), 70.0).unwrap_err();
    assert!(matches!(err, SimError::StopNotFound(StopId(99))));
}

#[test]
fn spawn_rider_unknown_destination_returns_error() {
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    let err = sim.spawn_rider_by_stop_id(StopId(0), StopId(99), 70.0).unwrap_err();
    assert!(matches!(err, SimError::StopNotFound(StopId(99))));
}
