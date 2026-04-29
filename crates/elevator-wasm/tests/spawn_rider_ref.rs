//! Tests for `WasmSim::spawnRider` returning the rider ref.
//!
//! Earlier versions returned `WasmVoidResult` and discarded the ref.
//! The signature change to `WasmU64Result` (matching
//! `spawnRiderByRef`) lets consumers correlate the spawn with
//! subsequent `rider-*` events without a separate by-ref call.

use elevator_wasm::{WasmSim, WasmU64Result};

const SCENARIO: &str = r#"SimConfig(
    building: BuildingConfig(
        name: "Spawn Ref",
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

#[test]
fn spawn_rider_returns_ref_on_success() {
    let mut sim = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    let result = sim.spawn_rider(0, 1, 75.0, None);
    match result {
        WasmU64Result::Ok { value } => {
            // Slot id is non-zero (slotmap reserves 0 as a null sentinel)
            // — exact value depends on insertion order, just assert
            // we got something we can despawn.
            assert!(value != 0, "rider ref must be non-null");
            // Round-trip: despawn by the same ref.
            let despawn = sim.despawn_rider(value);
            assert!(matches!(despawn, elevator_wasm::WasmVoidResult::Ok {}));
        }
        WasmU64Result::Err { error } => panic!("spawn failed: {error}"),
    }
}

#[test]
fn spawn_rider_returns_err_for_unknown_stop() {
    let mut sim = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    // Stop id 99 doesn't exist in the scenario.
    let result = sim.spawn_rider(0, 99, 75.0, None);
    assert!(matches!(result, WasmU64Result::Err { .. }));
}

#[test]
fn spawn_rider_with_patience_succeeds() {
    let mut sim = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    let result = sim.spawn_rider(0, 1, 75.0, Some(600));
    assert!(matches!(result, WasmU64Result::Ok { .. }));
}
