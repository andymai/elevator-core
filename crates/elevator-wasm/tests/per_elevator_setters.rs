//! Tests for per-elevator runtime setters: setDoorOpenTicks,
//! setDoorTransitionTicks, setMaxSpeed, setWeightCapacity.
//!
//! These are the per-entity counterparts to the existing
//! setMaxSpeedAll / setDoorOpenTicksAll bulk setters. Consumers
//! tuning a specific shaft (e.g. tower-together's "set elevator
//! dwell delay" command, scoped per-shaft per-daypart) need
//! per-elevator granularity.

use elevator_wasm::{WasmSim, WasmVoidResult};

const SCENARIO: &str = r#"SimConfig(
    building: BuildingConfig(
        name: "Per-Elevator Setters",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby",   position: 0.0),
            StopConfig(id: StopId(1), name: "Floor 2", position: 4.0),
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

fn elevator_ref(sim: &WasmSim) -> u64 {
    sim.all_lines()
        .into_iter()
        .flat_map(|line| sim.elevators_on_line(line))
        .next()
        .expect("scenario has one elevator")
}

fn assert_ok(label: &str, r: WasmVoidResult) {
    match r {
        WasmVoidResult::Ok {} => {}
        WasmVoidResult::Err { error } => panic!("{label}: {error}"),
    }
}

#[test]
fn set_door_open_ticks_per_elevator_succeeds() {
    let mut sim = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    let r = elevator_ref(&sim);
    assert_ok("setDoorOpenTicks", sim.set_door_open_ticks(r, 90));
    // Stepping doesn't panic — config change took effect.
    sim.step_many(10);
}

#[test]
fn set_door_transition_ticks_per_elevator_succeeds() {
    let mut sim = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    let r = elevator_ref(&sim);
    assert_ok(
        "setDoorTransitionTicks",
        sim.set_door_transition_ticks(r, 20),
    );
    sim.step_many(10);
}

#[test]
fn set_max_speed_per_elevator_succeeds() {
    let mut sim = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    let r = elevator_ref(&sim);
    assert_ok("setMaxSpeed", sim.set_max_speed(r, 4.5));
    sim.step_many(10);
}

#[test]
fn set_weight_capacity_per_elevator_succeeds() {
    let mut sim = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    let r = elevator_ref(&sim);
    assert_ok("setWeightCapacity", sim.set_weight_capacity(r, 1200.0));
    sim.step_many(10);
}

#[test]
fn unknown_elevator_ref_returns_err() {
    let mut sim = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    let bogus = 0xdead_beef_dead_beef;
    let result = sim.set_door_open_ticks(bogus, 90);
    match result {
        WasmVoidResult::Err { .. } => {}
        WasmVoidResult::Ok {} => panic!("bogus ref should have failed"),
    }
}

#[test]
fn invalid_value_returns_err() {
    let mut sim = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    let r = elevator_ref(&sim);
    // Zero ticks rejected by the underlying Simulation::set_door_open_ticks.
    let result = sim.set_door_open_ticks(r, 0);
    match result {
        WasmVoidResult::Err { .. } => {}
        WasmVoidResult::Ok {} => panic!("zero ticks should have failed"),
    }
}

#[test]
fn set_max_speed_rejects_non_positive() {
    let mut sim = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    let r = elevator_ref(&sim);
    for bad in [0.0_f64, -1.0, f64::NAN, f64::INFINITY] {
        match sim.set_max_speed(r, bad) {
            WasmVoidResult::Err { .. } => {}
            WasmVoidResult::Ok {} => panic!("speed={bad} should have failed"),
        }
    }
}

#[test]
fn set_weight_capacity_rejects_non_positive() {
    let mut sim = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    let r = elevator_ref(&sim);
    for bad in [0.0_f64, -1.0, f64::NAN, f64::INFINITY] {
        match sim.set_weight_capacity(r, bad) {
            WasmVoidResult::Err { .. } => {}
            WasmVoidResult::Ok {} => panic!("capacity={bad} should have failed"),
        }
    }
}
