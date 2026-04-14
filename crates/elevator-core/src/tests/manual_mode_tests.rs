//! Tests for `ServiceMode::Manual` and its command API.

use crate::components::{RiderPhase, ServiceMode};
use crate::dispatch::scan::ScanDispatch;
use crate::events::Event;
use crate::sim::Simulation;
use crate::stop::StopId;
use crate::tests::helpers::default_config;

fn make_manual() -> (Simulation, crate::entity::EntityId) {
    let mut sim = Simulation::new(&default_config(), ScanDispatch::new()).unwrap();
    let elev = sim.world().iter_elevators().next().unwrap().0;
    sim.set_service_mode(elev, ServiceMode::Manual).unwrap();
    (sim, elev)
}

#[test]
fn manual_skips_dispatch() {
    let (mut sim, _elev) = make_manual();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 75.0)
        .unwrap();
    for _ in 0..500 {
        sim.step();
    }
    assert!(
        sim.world()
            .iter_riders()
            .any(|(_, r)| r.phase() == RiderPhase::Waiting),
        "rider should stay Waiting with Manual elevator"
    );
    assert_eq!(sim.metrics().total_delivered(), 0);
}

#[test]
fn set_target_velocity_moves_elevator_up() {
    let (mut sim, elev) = make_manual();
    sim.set_target_velocity(elev, 1.0).unwrap();

    let p0 = sim.world().position(elev).unwrap().value();
    for _ in 0..60 {
        sim.step();
    }
    let p1 = sim.world().position(elev).unwrap().value();
    let v = sim.velocity(elev).unwrap();
    assert!(p1 > p0, "elevator should move upward: {p0} -> {p1}");
    assert!(v > 0.0, "velocity should be positive, got {v}");
}

#[test]
fn set_target_velocity_ramps_using_acceleration() {
    let (mut sim, elev) = make_manual();
    // max_speed = 2.0, acceleration = 1.5, dt = 1/60. After 1 tick,
    // velocity should be acceleration*dt ≈ 0.025.
    sim.set_target_velocity(elev, 2.0).unwrap();
    sim.step();
    let v = sim.velocity(elev).unwrap();
    assert!(
        (v - (1.5 / 60.0)).abs() < 1e-6,
        "expected ~{}, got {v}",
        1.5 / 60.0
    );
}

#[test]
fn set_target_velocity_clamped_to_max_speed() {
    let (mut sim, elev) = make_manual();
    // Overshoot: request 100 m/s with max_speed = 2.0 — should clamp.
    sim.set_target_velocity(elev, 100.0).unwrap();
    for _ in 0..1000 {
        sim.step();
    }
    let v = sim.velocity(elev).unwrap();
    assert!(v <= 2.0 + 1e-9, "velocity should cap at max_speed, got {v}");
    assert!((v - 2.0).abs() < 1e-6, "should reach max_speed, got {v}");
}

#[test]
fn emergency_stop_decelerates_to_zero() {
    let (mut sim, elev) = make_manual();
    sim.set_target_velocity(elev, 2.0).unwrap();
    for _ in 0..1000 {
        sim.step();
    }
    assert!(sim.velocity(elev).unwrap() > 1.0, "needs to be moving");

    sim.emergency_stop(elev).unwrap();
    for _ in 0..1000 {
        sim.step();
        if sim.velocity(elev).unwrap().abs() < 1e-6 {
            break;
        }
    }
    let v = sim.velocity(elev).unwrap();
    assert!(v.abs() < 1e-6, "velocity should reach zero, got {v}");
}

#[test]
fn manual_elevator_can_stop_at_any_position() {
    let (mut sim, elev) = make_manual();
    sim.set_target_velocity(elev, 0.5).unwrap();
    for _ in 0..200 {
        sim.step();
    }
    sim.emergency_stop(elev).unwrap();
    for _ in 0..1000 {
        sim.step();
        if sim.velocity(elev).unwrap().abs() < 1e-6 {
            break;
        }
    }
    let pos = sim.world().position(elev).unwrap().value();
    // Should be somewhere between stops 0 (0.0) and 1 (4.0) — not snapped.
    assert!(
        pos > 0.1 && pos < 3.9,
        "expected intermediate position, got {pos}"
    );
}

#[test]
fn set_target_velocity_on_non_manual_errors() {
    let mut sim = Simulation::new(&default_config(), ScanDispatch::new()).unwrap();
    let elev = sim.world().iter_elevators().next().unwrap().0;
    // Mode is default Normal.
    let err = sim.set_target_velocity(elev, 1.0).unwrap_err();
    assert!(
        format!("{err}").contains("Manual"),
        "error should mention Manual: {err}"
    );
}

#[test]
fn set_target_velocity_rejects_nonfinite() {
    let (mut sim, elev) = make_manual();
    assert!(sim.set_target_velocity(elev, f64::NAN).is_err());
    assert!(sim.set_target_velocity(elev, f64::INFINITY).is_err());
}

#[test]
fn set_target_velocity_emits_event() {
    let (mut sim, elev) = make_manual();
    sim.drain_events();
    sim.set_target_velocity(elev, 1.5).unwrap();
    let events = sim.drain_events();
    assert!(events.iter().any(|e| matches!(
        e,
        Event::ManualVelocityCommanded { target_velocity: Some(v), .. } if (v.0 - 1.5).abs() < 1e-9
    )));
}

#[test]
fn emergency_stop_emits_event_with_none_payload() {
    let (mut sim, elev) = make_manual();
    sim.drain_events();
    sim.emergency_stop(elev).unwrap();
    let events = sim.drain_events();
    assert!(events.iter().any(|e| matches!(
        e,
        Event::ManualVelocityCommanded {
            target_velocity: None,
            ..
        }
    )));
}

#[test]
fn leaving_manual_clears_target_velocity() {
    let (mut sim, elev) = make_manual();
    sim.set_target_velocity(elev, 1.0).unwrap();
    assert_eq!(
        sim.world().elevator(elev).unwrap().manual_target_velocity(),
        Some(1.0)
    );
    sim.set_service_mode(elev, ServiceMode::Normal).unwrap();
    assert_eq!(
        sim.world().elevator(elev).unwrap().manual_target_velocity(),
        None
    );
}

#[test]
fn manual_mode_emits_passing_floor_events() {
    let (mut sim, elev) = make_manual();
    sim.set_target_velocity(elev, 2.0).unwrap();
    sim.drain_events();
    // Run long enough to cross stop 1 (position 4.0).
    for _ in 0..300 {
        sim.step();
        if sim.world().position(elev).unwrap().value() > 5.0 {
            break;
        }
    }
    let events = sim.drain_events();
    assert!(
        events
            .iter()
            .any(|e| matches!(e, Event::PassingFloor { .. })),
        "should emit PassingFloor while cruising"
    );
}
