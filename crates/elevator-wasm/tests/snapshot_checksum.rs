//! Tests for `WasmSim::snapshot_checksum` — the cheap u64 hash used
//! by lockstep consumers to detect divergence between runtimes that
//! should be stepping the same state.
//!
//! Snapshot/restore is byte-symmetric: a fresh sim and a restored
//! sim with the same logical state hash equal. (Earlier first-
//! restore asymmetry was fixed by registering the `AssignedCar`
//! extension type during `Simulation::new` to match the restore
//! path.) These tests pin both the same-sim and fresh-vs-restored
//! equality properties.

use elevator_wasm::{WasmBytesResult, WasmSim, WasmU64Result};

const SCENARIO: &str = r#"SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: "Checksum",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby",   position: 0.0),
            StopConfig(id: StopId(1), name: "Floor 2", position: 4.0),
            StopConfig(id: StopId(2), name: "Floor 3", position: 8.0),
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

fn unwrap_u64(r: WasmU64Result) -> u64 {
    match r {
        WasmU64Result::Ok { value } => value,
        WasmU64Result::Err { error } => panic!("snapshot_checksum failed: {error}"),
    }
}

fn unwrap_bytes(r: WasmBytesResult) -> Vec<u8> {
    match r {
        WasmBytesResult::Ok { value } => value,
        WasmBytesResult::Err { error } => panic!("snapshot_bytes failed: {error}"),
    }
}

#[test]
fn checksum_is_stable_for_repeat_reads_of_same_sim() {
    let sim = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    let h1 = unwrap_u64(sim.snapshot_checksum());
    let h2 = unwrap_u64(sim.snapshot_checksum());
    assert_eq!(h1, h2, "re-reading the same sim must produce the same hash");
}

#[test]
fn checksum_changes_after_step() {
    let mut sim = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    let before = unwrap_u64(sim.snapshot_checksum());
    sim.step_many(50);
    let after = unwrap_u64(sim.snapshot_checksum());
    assert_ne!(before, after, "stepping must change the checksum");
}

/// The lockstep property: a fresh sim and two sims that went
/// through `from_snapshot_bytes` from the same source bytes —
/// stepped identically — must all hash identically. The fresh-vs-
/// restored equality is the post-fix property; earlier code had
/// an asymmetry where restore materialized the `AssignedCar`
/// extension type that fresh sims didn't, breaking byte equality
/// of the snapshot bytes round-trip.
#[test]
fn fresh_and_restored_sims_hash_equal_under_identical_steps() {
    let mut source = WasmSim::new(SCENARIO, "look", None).expect("source");
    source.step_many(100);
    let bytes = unwrap_bytes(source.snapshot_bytes());

    let mut a = WasmSim::from_snapshot_bytes(&bytes, "look".to_string(), None).expect("restore a");
    let mut b = WasmSim::from_snapshot_bytes(&bytes, "look".to_string(), None).expect("restore b");

    for tick in 0..50 {
        source.step_many(1);
        a.step_many(1);
        b.step_many(1);
        let h_source = unwrap_u64(source.snapshot_checksum());
        let h_a = unwrap_u64(a.snapshot_checksum());
        let h_b = unwrap_u64(b.snapshot_checksum());
        assert_eq!(h_a, h_b, "two restored sims diverged at tick {tick}");
        assert_eq!(
            h_source, h_a,
            "fresh sim diverged from restored at tick {tick}"
        );
    }
}

/// Snapshot/restore is now byte-symmetric: bytes from a fresh sim
/// equal bytes from a restored sim with the same logical state.
/// Pinned by this test — earlier code couldn't make this guarantee
/// because `Simulation::from_parts` registered the `AssignedCar`
/// extension type while `Simulation::new` didn't, yielding
/// different `extensions` `BTreeMap` shapes in the snapshot.
#[test]
fn snapshot_round_trip_is_byte_symmetric() {
    let sim = WasmSim::new(SCENARIO, "look", None).expect("source");
    let pre_restore_bytes = unwrap_bytes(sim.snapshot_bytes());

    let restored = WasmSim::from_snapshot_bytes(&pre_restore_bytes, "look".to_string(), None)
        .expect("restore");
    let post_restore_bytes = unwrap_bytes(restored.snapshot_bytes());

    assert_eq!(
        pre_restore_bytes, post_restore_bytes,
        "snapshot bytes diverged across the first restore"
    );
}
