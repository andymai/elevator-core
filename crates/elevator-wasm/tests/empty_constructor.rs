//! Tests for `WasmSim::empty` — the entity-free constructor.

use elevator_wasm::{WasmBytesResult, WasmSim};

#[test]
fn empty_has_no_lines_or_elevators_or_stops() {
    let sim = WasmSim::empty("look", None).expect("construct empty sim");
    // Direct: no lines.
    assert!(
        sim.all_lines().is_empty(),
        "empty() should leave the topology with no lines"
    );
    // Indirect: no idle elevators (and no busy ones either, since
    // there's nothing to dispatch). idle_elevator_count counts every
    // elevator currently in the Idle phase; with no elevators at all,
    // it must be 0.
    assert_eq!(
        sim.idle_elevator_count(),
        0,
        "empty() should leave no elevators in any phase"
    );
    // Indirect: snapshot bytes from a freshly-constructed empty sim
    // should be substantially smaller than a populated one. The
    // populated 3-stop/1-elevator scenario from other tests
    // produces ~310 bytes; an empty sim is dominated by the
    // envelope + default resources and lands around 250 bytes
    // regardless of strategy choice.
    let empty_bytes = match sim.snapshot_bytes() {
        WasmBytesResult::Ok { value } => value,
        WasmBytesResult::Err { error } => panic!("snapshot: {error}"),
    };
    let populated = WasmSim::new(
        r#"SimConfig(
            building: BuildingConfig(
                name: "P",
                stops: [
                    StopConfig(id: StopId(0), name: "L", position: 0.0),
                    StopConfig(id: StopId(1), name: "F2", position: 4.0),
                    StopConfig(id: StopId(2), name: "F3", position: 8.0),
                ],
            ),
            elevators: [
                ElevatorConfig(
                    id: 0, name: "C1",
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
        )"#,
        "look",
        None,
    )
    .expect("populated");
    let populated_bytes = match populated.snapshot_bytes() {
        WasmBytesResult::Ok { value } => value,
        WasmBytesResult::Err { error } => panic!("snapshot: {error}"),
    };
    assert!(
        empty_bytes.len() < populated_bytes.len(),
        "empty sim snapshot ({} bytes) should be smaller than populated ({} bytes)",
        empty_bytes.len(),
        populated_bytes.len(),
    );
}

#[test]
fn empty_can_step_safely() {
    let mut sim = WasmSim::empty("look", None).expect("construct");
    // No entities means nothing to dispatch, but stepping should
    // still complete without panic and advance the tick counter.
    sim.step_many(10);
    assert_eq!(sim.current_tick(), 10);
}

#[test]
fn empty_supports_runtime_topology_construction() {
    let mut sim = WasmSim::empty("look", None).expect("construct");

    // Add a fresh group, line, and stop entirely at runtime.
    let group_result = sim.add_group("custom".to_string(), "look");
    let group_id = match group_result {
        elevator_wasm::WasmU32Result::Ok { value } => value,
        elevator_wasm::WasmU32Result::Err { error } => panic!("addGroup: {error}"),
    };

    let line_result = sim.add_line(group_id, "Line 1".to_string(), 0.0, 100.0, None);
    let line_ref = match line_result {
        elevator_wasm::WasmU64Result::Ok { value } => value,
        elevator_wasm::WasmU64Result::Err { error } => panic!("addLine: {error}"),
    };

    let stop_result = sim.add_stop(line_ref, "Lobby".to_string(), 0.0);
    assert!(matches!(
        stop_result,
        elevator_wasm::WasmU64Result::Ok { .. }
    ));

    let elev_result = sim.add_elevator(line_ref, 0.0, None, None);
    assert!(matches!(
        elev_result,
        elevator_wasm::WasmU64Result::Ok { .. }
    ));

    // Topology now has one line.
    assert_eq!(sim.all_lines().len(), 1);
}

// Error-path test (`empty("not-a-strategy", None)` must return an
// Err) is intentionally omitted: `JsError::new` can't be called on
// non-wasm targets, so the test would panic in `cargo test` even
// though the assertion would pass under `wasm-pack test`. Same
// pattern as the snapshot_bytes test module.
