//! Tests for `WasmSim::setRiderTag` / `WasmSim::riderTag`.
//!
//! The opaque rider tag is the engine-side back-pointer for consumers
//! that already key on `RiderId` (e.g. the tower-together adapter
//! correlating a rider with a game-side `simId`). These tests pin the
//! contract: default 0, round-trips, errors on stale refs, survives
//! `restoreBytes`.

use elevator_wasm::{WasmBytesResult, WasmSim, WasmU64Result, WasmVoidResult};

const SCENARIO: &str = r#"SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: "Tag",
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

fn ok_u64(r: WasmU64Result) -> u64 {
    match r {
        WasmU64Result::Ok { value } => value,
        WasmU64Result::Err { error } => panic!("u64 result err: {error}"),
    }
}

fn ok_void(r: WasmVoidResult) {
    match r {
        WasmVoidResult::Ok {} => {}
        WasmVoidResult::Err { error } => panic!("void result err: {error}"),
    }
}

#[test]
fn defaults_to_zero_for_a_fresh_rider() {
    let mut sim = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    let rider = ok_u64(sim.spawn_rider(0, 1, 75.0, None));
    assert_eq!(ok_u64(sim.rider_tag(rider)), 0);
}

#[test]
fn round_trips_through_set_and_get() {
    let mut sim = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    let rider = ok_u64(sim.spawn_rider(0, 1, 75.0, None));

    ok_void(sim.set_rider_tag(rider, 0xDEAD_BEEF_CAFE_F00D));
    assert_eq!(ok_u64(sim.rider_tag(rider)), 0xDEAD_BEEF_CAFE_F00D);

    ok_void(sim.set_rider_tag(rider, 1));
    assert_eq!(ok_u64(sim.rider_tag(rider)), 1);

    ok_void(sim.set_rider_tag(rider, 0));
    assert_eq!(ok_u64(sim.rider_tag(rider)), 0);
}

#[test]
fn errors_on_stale_rider_ref() {
    let mut sim = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    let rider = ok_u64(sim.spawn_rider(0, 1, 75.0, None));
    ok_void(sim.despawn_rider(rider));

    assert!(matches!(sim.rider_tag(rider), WasmU64Result::Err { .. }));
    assert!(matches!(
        sim.set_rider_tag(rider, 1),
        WasmVoidResult::Err { .. }
    ));
}

#[test]
fn survives_snapshot_bytes_round_trip() {
    let mut sim = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    let rider = ok_u64(sim.spawn_rider(0, 1, 75.0, None));
    ok_void(sim.set_rider_tag(rider, 0x1122_3344_5566_7788));

    let bytes = match sim.snapshot_bytes() {
        WasmBytesResult::Ok { value } => value,
        WasmBytesResult::Err { error } => panic!("snapshot: {error}"),
    };

    let restored = WasmSim::from_snapshot_bytes(&bytes, "look".to_string(), None).expect("restore");
    assert_eq!(ok_u64(restored.rider_tag(rider)), 0x1122_3344_5566_7788);
}
