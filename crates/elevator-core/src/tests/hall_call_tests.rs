//! Tests for the hall-call / car-call public API.

use crate::components::CallDirection;
use crate::events::Event;
use crate::sim::Simulation;
use crate::stop::StopId;

use super::helpers::{default_config, scan};

/// Spawning a rider auto-presses the hall button in the correct direction.
#[test]
fn spawn_rider_auto_presses_hall_button() {
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    let rid = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    let origin = sim.stop_entity(StopId(0)).unwrap();
    let call = sim.world().hall_call(origin, CallDirection::Up).unwrap();
    assert_eq!(call.direction, CallDirection::Up);
    assert!(
        call.pending_riders.contains(&rid),
        "rider should be aggregated into the hall call's pending list"
    );
    let events = sim.drain_events();
    assert!(
        events.iter().any(|e| matches!(
            e,
            Event::HallButtonPressed {
                direction: CallDirection::Up,
                ..
            }
        )),
        "spawning a rider should emit HallButtonPressed"
    );
}

/// Two riders at the same stop heading the same direction aggregate
/// into one call and emit only one `HallButtonPressed`.
#[test]
fn multiple_riders_aggregate_into_one_hall_call() {
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    let r1 = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    sim.drain_events();
    let r2 = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    let origin = sim.stop_entity(StopId(0)).unwrap();
    let call = sim.world().hall_call(origin, CallDirection::Up).unwrap();
    assert!(call.pending_riders.contains(&r1));
    assert!(call.pending_riders.contains(&r2));
    let extra_events = sim.drain_events();
    let press_count = extra_events
        .iter()
        .filter(|e| matches!(e, Event::HallButtonPressed { .. }))
        .count();
    assert_eq!(
        press_count, 0,
        "second rider should not re-press the same call"
    );
}

/// Explicit `press_hall_button` works without a rider (scripted NPC / player input).
#[test]
fn explicit_press_hall_button_without_rider() {
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    let stop = sim.stop_entity(StopId(1)).unwrap();
    sim.press_hall_button(stop, CallDirection::Down).unwrap();
    let call = sim.world().hall_call(stop, CallDirection::Down).unwrap();
    assert!(call.pending_riders.is_empty());
    assert_eq!(call.direction, CallDirection::Down);
}

/// `pin_assignment` records the car and flags the call as pinned.
#[test]
fn pin_assignment_pins_and_assigns() {
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    let stop = sim.stop_entity(StopId(1)).unwrap();
    let car = sim.world().elevator_ids()[0];
    sim.press_hall_button(stop, CallDirection::Up).unwrap();
    sim.pin_assignment(car, stop, CallDirection::Up).unwrap();
    let call = sim.world().hall_call(stop, CallDirection::Up).unwrap();
    assert_eq!(call.assigned_car, Some(car));
    assert!(call.pinned);
    sim.unpin_assignment(stop, CallDirection::Up);
    let call = sim.world().hall_call(stop, CallDirection::Up).unwrap();
    assert!(!call.pinned);
}

// Test for DCS-mode destination population is deferred until a public
// API exists to construct a group in Destination mode (config wiring
// lands in a follow-up commit). The runtime behavior is covered by
// `register_hall_call_for_rider` internally.

/// With `ack_latency_ticks = 0` (default), a call is acknowledged on
/// the same tick it was pressed.
#[test]
fn zero_latency_acknowledges_immediately() {
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    let origin = sim.stop_entity(StopId(0)).unwrap();
    let call = sim.world().hall_call(origin, CallDirection::Up).unwrap();
    assert_eq!(
        call.acknowledged_at,
        Some(sim.current_tick()),
        "zero-latency controller should ack on press tick"
    );
    // A matching HallCallAcknowledged event should have fired.
    let events = sim.drain_events();
    assert!(
        events
            .iter()
            .any(|e| matches!(e, Event::HallCallAcknowledged { .. })),
        "zero-latency press should emit HallCallAcknowledged immediately"
    );
}

/// When the car opens doors at a stop, any hall call in the car's
/// indicated direction is cleared and a `HallCallCleared` event fires.
#[test]
fn door_opening_clears_hall_call() {
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    let origin = sim.stop_entity(StopId(0)).unwrap();
    assert!(sim.world().hall_call(origin, CallDirection::Up).is_some());

    // Step until a HallCallCleared event fires for the origin.
    let mut cleared = false;
    for _ in 0..500 {
        sim.step();
        for e in sim.drain_events() {
            if let Event::HallCallCleared {
                stop,
                direction: CallDirection::Up,
                ..
            } = e
                && stop == origin
            {
                cleared = true;
            }
        }
        if cleared {
            break;
        }
    }
    assert!(cleared, "HallCallCleared should fire when car opens doors");
    assert!(
        sim.world().hall_call(origin, CallDirection::Up).is_none(),
        "hall call should be removed once cleared"
    );
}
