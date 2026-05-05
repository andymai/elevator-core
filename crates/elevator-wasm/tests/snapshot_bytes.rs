//! Round-trip tests for `WasmSim::snapshot_bytes` / `from_snapshot_bytes`.
//!
//! Uses the `WasmSim` wrapper directly on the host target (`cargo test`,
//! not `wasm-pack test`). The `wasm_bindgen` attributes are no-ops on
//! host targets *except* for any `Result<T, JsError>`-returning
//! functions, which call into wasm-bindgen imports — those tests must
//! run under `wasm-pack test`.
//!
//! Snapshot/restore is byte-symmetric: bytes from a fresh sim equal
//! bytes from a restored sim with the same logical state. The
//! earlier first-restore asymmetry (`assigned_car` extension type
//! materialized on restore but not on `Simulation::new`) was fixed by
//! registering the type on both paths.

use elevator_wasm::{WasmBytesResult, WasmSim};

const SCENARIO: &str = r#"SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: "Snapshot Round-Trip",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby",   position: 0.0),
            StopConfig(id: StopId(1), name: "Floor 2", position: 4.0),
            StopConfig(id: StopId(2), name: "Floor 3", position: 8.0),
            StopConfig(id: StopId(3), name: "Floor 4", position: 12.0),
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

fn unwrap_bytes(r: WasmBytesResult) -> Vec<u8> {
    match r {
        WasmBytesResult::Ok { value } => value,
        WasmBytesResult::Err { error } => panic!("snapshot_bytes failed: {error}"),
    }
}

/// `snapshot → restore → snapshot` is idempotent — the first cycle
/// (and every cycle) is byte-stable. The earlier asymmetry was
/// fixed by registering the `AssignedCar` extension type during
/// `Simulation::new` to match the restore path.
#[test]
fn round_trip_is_idempotent_from_the_first_restore() {
    let mut sim = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    sim.step_many(500);

    let initial = unwrap_bytes(sim.snapshot_bytes());

    let primed =
        WasmSim::from_snapshot_bytes(&initial, "look".to_string(), None).expect("first restore");
    let primed_bytes = unwrap_bytes(primed.snapshot_bytes());

    assert_eq!(
        initial, primed_bytes,
        "first-restore byte symmetry: snapshot(restore(snapshot(s))) == snapshot(s)"
    );

    let rebound = WasmSim::from_snapshot_bytes(&primed_bytes, "look".to_string(), None)
        .expect("second restore");
    let rebound_bytes = unwrap_bytes(rebound.snapshot_bytes());

    assert_eq!(
        primed_bytes, rebound_bytes,
        "second-restore byte symmetry: still bit-stable after multiple cycles"
    );
}

/// Two sims that both went through `restore_bytes` from the same source
/// and were stepped identically afterward must produce the same bytes.
/// This is the property lockstep consumers actually need.
#[test]
fn parallel_restored_sims_diverge_zero_after_identical_steps() {
    let mut original = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    original.step_many(500);
    let bytes = unwrap_bytes(original.snapshot_bytes());

    let mut a = WasmSim::from_snapshot_bytes(&bytes, "look".to_string(), None).expect("restore a");
    let mut b = WasmSim::from_snapshot_bytes(&bytes, "look".to_string(), None).expect("restore b");

    a.step_many(1000);
    b.step_many(1000);

    assert_eq!(
        unwrap_bytes(a.snapshot_bytes()),
        unwrap_bytes(b.snapshot_bytes()),
        "two parallel restored sims must stay bit-identical under the same input"
    );
}

/// Tick + state advances post-restore — confirming the inner `Simulation`
/// is genuinely live, not just deserialized state.
#[test]
fn restored_sim_advances_tick_counter() {
    let mut sim = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    sim.step_many(500);
    let initial_tick = sim.current_tick();

    let bytes = unwrap_bytes(sim.snapshot_bytes());
    let mut restored =
        WasmSim::from_snapshot_bytes(&bytes, "look".to_string(), None).expect("restore");

    assert_eq!(
        restored.current_tick(),
        initial_tick,
        "restored tick counter must match source"
    );

    restored.step_many(100);
    assert_eq!(
        restored.current_tick(),
        initial_tick + 100,
        "stepping post-restore must advance the tick counter"
    );
}
