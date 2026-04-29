//! Tag-on-events smoke tests for the wasm DTO surface.
//!
//! Pins the contract that the `tag` field added to every rider-bearing
//! [`EventDto`] variant carries the value last set via `setRiderTag`.
//! The contract for in-process callers is exercised by
//! `elevator-core/src/tests/event_tag_tests.rs`; these tests cover the
//! second hop — DTO conversion — that wasm consumers see.

use elevator_wasm::{EventDto, WasmSim, WasmU64Result, WasmVoidResult};

const SCENARIO: &str = r#"SimConfig(
    building: BuildingConfig(
        name: "Tag Events",
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

const SENTINEL: u64 = 0xCAFE_F00D;

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
fn rider_boarded_dto_carries_tag() {
    let mut sim = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    let rider = ok_u64(sim.spawn_rider(0, 1, 75.0, None));
    ok_void(sim.set_rider_tag(rider, SENTINEL));
    sim.drain_events();

    let mut found = None;
    for _ in 0..400 {
        sim.step_many(1);
        for event in sim.drain_events() {
            if let EventDto::RiderBoarded { tag, .. } = event {
                found = Some(tag);
                break;
            }
        }
        if found.is_some() {
            break;
        }
    }
    assert_eq!(
        found,
        Some(SENTINEL),
        "RiderBoarded DTO must carry the tag set before boarding"
    );
}

#[test]
fn rider_exited_dto_carries_tag() {
    let mut sim = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    let rider = ok_u64(sim.spawn_rider(0, 1, 75.0, None));
    ok_void(sim.set_rider_tag(rider, SENTINEL));
    sim.drain_events();

    let mut found = None;
    for _ in 0..600 {
        sim.step_many(1);
        for event in sim.drain_events() {
            if let EventDto::RiderExited { tag, .. } = event {
                found = Some(tag);
                break;
            }
        }
        if found.is_some() {
            break;
        }
    }
    assert_eq!(
        found,
        Some(SENTINEL),
        "RiderExited DTO must carry the rider's tag, sampled before free"
    );
}

#[test]
fn untagged_rider_dto_yields_zero() {
    let mut sim = WasmSim::new(SCENARIO, "look", None).expect("construct sim");
    let _rider = ok_u64(sim.spawn_rider(0, 1, 75.0, None));

    for _ in 0..600 {
        sim.step_many(1);
        for event in sim.drain_events() {
            let tag = match event {
                EventDto::RiderSpawned { tag, .. }
                | EventDto::RiderBoarded { tag, .. }
                | EventDto::RiderExited { tag, .. }
                | EventDto::RiderRejected { tag, .. }
                | EventDto::RiderAbandoned { tag, .. }
                | EventDto::RiderEjected { tag, .. }
                | EventDto::RiderSettled { tag, .. }
                | EventDto::RiderDespawned { tag, .. }
                | EventDto::RiderRerouted { tag, .. }
                | EventDto::RiderSkipped { tag, .. }
                | EventDto::RouteInvalidated { tag, .. } => Some(tag),
                EventDto::CarButtonPressed { tag, .. } => tag,
                _ => None,
            };
            if let Some(t) = tag {
                assert_eq!(t, 0, "untagged rider must surface tag=0 on every DTO");
            }
        }
    }
}
