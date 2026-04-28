//! Tests for `WasmSim::positions_at_packed` — the batched variant of
//! `position_at` that fills a caller-provided `&mut [f64]` in one
//! wasm-bindgen crossing instead of N calls.

use elevator_wasm::WasmSim;

const SCENARIO: &str = r#"SimConfig(
    building: BuildingConfig(
        name: "Packed Positions",
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
        ElevatorConfig(
            id: 1, name: "Car 2",
            max_speed: 2.2, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(2),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 90,
        weight_range: (50.0, 100.0),
    ),
)"#;

fn elevator_refs(sim: &WasmSim) -> Vec<u64> {
    // Walk every line in the topology and collect the elevators
    // attached to each. Two elevators in the seed scenario; this
    // helper just picks them up in a deterministic-enough order
    // for the tests' equality checks.
    let mut refs = Vec::new();
    for line in sim.all_lines() {
        refs.extend(sim.elevators_on_line(line));
    }
    refs
}

#[test]
fn batched_writes_match_individual_calls() {
    let mut sim = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    sim.step_many(50);

    let refs = elevator_refs(&sim);
    assert_eq!(refs.len(), 2, "scenario has 2 elevators");

    let mut packed = vec![0.0_f64; refs.len()];
    let written = sim.positions_at_packed(refs.clone(), 0.0, &mut packed);
    assert_eq!(written, 2);

    // Compare against per-call values.
    for (i, &raw) in refs.iter().enumerate() {
        let single = sim.position_at(raw, 0.0).expect("position present");
        assert!(
            (packed[i] - single).abs() < 1e-12,
            "packed[{i}]={} differs from single position_at={}",
            packed[i],
            single,
        );
    }
}

#[test]
fn unknown_refs_get_nan() {
    let mut sim = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    sim.step_many(10);

    // Mix valid and invalid refs. The bogus value passes u64_to_entity
    // (any 64-bit value decodes to *some* slotmap key) but the
    // entity won't exist in the world, so position_at returns None
    // and we write NaN.
    let mut refs = elevator_refs(&sim);
    refs.push(0xdead_beef_dead_beef);

    let mut packed = vec![0.0_f64; refs.len()];
    let written = sim.positions_at_packed(refs, 0.0, &mut packed);
    assert_eq!(written, 3);
    assert!(packed[0].is_finite());
    assert!(packed[1].is_finite());
    assert!(packed[2].is_nan());
}

const SENTINEL: f64 = 42.0;

#[test]
#[allow(clippy::float_cmp)]
fn writes_count_caps_at_min_of_refs_and_out() {
    let sim = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    let refs = elevator_refs(&sim);

    // out smaller than refs — only out.len() slots get written.
    let mut short = [SENTINEL; 1];
    let written = sim.positions_at_packed(refs.clone(), 0.0, &mut short);
    assert_eq!(written, 1);
    assert!(short[0].is_finite());

    // out larger than refs — refs.len() slots written, rest unmodified.
    // Strict equality on the sentinel is safe: those slots are
    // untouched memory, not the result of any FP arithmetic.
    let mut long = [SENTINEL; 5];
    let written = sim.positions_at_packed(refs, 0.0, &mut long);
    assert_eq!(written, 2);
    assert!(long[0].is_finite());
    assert!(long[1].is_finite());
    assert_eq!(long[2], SENTINEL);
    assert_eq!(long[3], SENTINEL);
    assert_eq!(long[4], SENTINEL);
}

#[test]
#[allow(clippy::float_cmp)]
fn empty_inputs_write_nothing() {
    let mut sim = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    sim.step_many(1);
    let mut packed = [SENTINEL; 4];
    let written = sim.positions_at_packed(vec![], 0.0, &mut packed);
    assert_eq!(written, 0);
    assert_eq!(packed, [SENTINEL, SENTINEL, SENTINEL, SENTINEL]);
}
