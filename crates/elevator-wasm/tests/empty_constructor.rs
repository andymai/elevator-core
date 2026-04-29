//! Tests for `WasmSim::empty` — the entity-free constructor.

use elevator_wasm::WasmSim;

#[test]
fn empty_has_no_lines_or_elevators_or_stops() {
    let sim = WasmSim::empty("look", None).expect("construct empty sim");
    assert!(
        sim.all_lines().is_empty(),
        "empty() should leave the topology with no lines"
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
