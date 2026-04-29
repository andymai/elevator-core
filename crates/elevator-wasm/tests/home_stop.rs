//! Tests for `WasmSim::setElevatorHomeStop` / `clearElevatorHomeStop`
//! / `elevatorHomeStop`.
//!
//! Pin persistence and rejection paths are covered exhaustively at the
//! Rust level in `tests::home_stop_tests`; these tests verify the wasm
//! shape: ref encoding, the `0n` sentinel for "no pin", and the
//! WasmU64Result/WasmVoidResult error wrapping.

use elevator_wasm::{WasmSim, WasmU64Result, WasmVoidResult};

const SCENARIO: &str = r#"SimConfig(
    building: BuildingConfig(
        name: "Home Stop",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby",   position: 0.0),
            StopConfig(id: StopId(1), name: "Floor 2", position: 4.0),
            StopConfig(id: StopId(2), name: "Top",     position: 8.0),
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

fn ok_void(r: WasmVoidResult) {
    match r {
        WasmVoidResult::Ok {} => {}
        WasmVoidResult::Err { error } => panic!("void result err: {error}"),
    }
}

fn ok_u64(r: WasmU64Result) -> u64 {
    match r {
        WasmU64Result::Ok { value } => value,
        WasmU64Result::Err { error } => panic!("u64 result err: {error}"),
    }
}

/// Pull the elevator + stop refs from `world_view()`. The view is the
/// canonical place game adapters look up entity refs.
fn refs(sim: &WasmSim) -> (u64, Vec<u64>) {
    let view = sim.world_view();
    let elev_ref = view.cars[0].id;
    let stop_refs: Vec<u64> = view.stops.iter().map(|s| s.entity_id).collect();
    (elev_ref, stop_refs)
}

#[test]
fn defaults_to_zero_for_unpinned_car() {
    let sim = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    let (elev_ref, _) = refs(&sim);

    assert_eq!(
        ok_u64(sim.elevator_home_stop(elev_ref)),
        0,
        "unpinned car must report 0n (the no-pin sentinel)"
    );
}

#[test]
fn round_trips_set_and_clear() {
    let mut sim = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    let (elev_ref, stops) = refs(&sim);
    let stop2_ref = stops[2];

    ok_void(sim.set_elevator_home_stop(elev_ref, stop2_ref));
    assert_eq!(ok_u64(sim.elevator_home_stop(elev_ref)), stop2_ref);

    ok_void(sim.clear_elevator_home_stop(elev_ref));
    assert_eq!(ok_u64(sim.elevator_home_stop(elev_ref)), 0);
}

#[test]
fn errors_on_unknown_elevator_ref() {
    let mut sim = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    let (_, stops) = refs(&sim);

    // Bogus elevator ref (slot id 999 that never existed).
    let bogus_elev = 999u64 << 32;
    let result = sim.set_elevator_home_stop(bogus_elev, stops[0]);
    assert!(matches!(result, WasmVoidResult::Err { .. }));
    assert!(matches!(
        sim.elevator_home_stop(bogus_elev),
        WasmU64Result::Err { .. }
    ));
}
