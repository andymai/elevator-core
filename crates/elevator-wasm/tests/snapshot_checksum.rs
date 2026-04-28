//! Tests for `WasmSim::snapshot_checksum` — the cheap u64 hash used
//! by lockstep consumers to detect divergence between runtimes that
//! should be stepping the same state.
//!
//! The checksum has the same first-restore asymmetry as raw
//! `snapshot_bytes` (restore materializes default metric-tag rows
//! that fresh sims lazy-allocate), so we don't compare two
//! independently-constructed sims here. The lockstep use case is:
//! both runtimes start from the same snapshot bytes (initial
//! checkpoint) and step identically — that's what these tests
//! validate.

use elevator_wasm::{WasmBytesResult, WasmSim, WasmU64Result};

const SCENARIO: &str = r#"SimConfig(
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

/// The lockstep property: two sims that both went through
/// `from_snapshot_bytes` from the same source bytes, then took
/// identical step counts, must hash identically. This is the
/// scenario that real lockstep deployments encounter — server and
/// client both restore from the initial checkpoint, then step the
/// same input batches.
#[test]
fn parallel_restored_sims_hash_equal_under_identical_steps() {
    let mut source = WasmSim::new(SCENARIO, "look", None).expect("source");
    source.step_many(100);
    let bytes = unwrap_bytes(source.snapshot_bytes());

    let mut a = WasmSim::from_snapshot_bytes(&bytes, "look".to_string(), None).expect("restore a");
    let mut b = WasmSim::from_snapshot_bytes(&bytes, "look".to_string(), None).expect("restore b");

    for tick in 0..50 {
        a.step_many(1);
        b.step_many(1);
        assert_eq!(
            unwrap_u64(a.snapshot_checksum()),
            unwrap_u64(b.snapshot_checksum()),
            "checksums diverged at tick {tick} after restore"
        );
    }
}

/// Pre-restore checksum and post-restore checksum differ for the
/// SAME source bytes — this is the documented first-restore
/// asymmetry. Lockstep consumers should rely on this only after
/// both sides have been restored at least once. Test pins the
/// behavior so any future fix surfaces here loudly.
#[test]
fn first_restore_changes_checksum_documented_asymmetry() {
    let sim = WasmSim::new(SCENARIO, "look", None).expect("source");
    let pre_restore = unwrap_u64(sim.snapshot_checksum());

    let bytes = unwrap_bytes(sim.snapshot_bytes());
    let restored = WasmSim::from_snapshot_bytes(&bytes, "look".to_string(), None).expect("restore");
    let post_restore = unwrap_u64(restored.snapshot_checksum());

    // Asymmetry exists today. If/when someone fixes the underlying
    // metric-tag materialization (mentioned in PR #527's tests),
    // delete this test and tighten parallel_restored_sims_hash_equal
    // to also include a freshly-constructed sim alongside two
    // restored ones.
    assert_ne!(
        pre_restore, post_restore,
        "first-restore asymmetry pinned — see PR #527's restore-tag note"
    );
}
