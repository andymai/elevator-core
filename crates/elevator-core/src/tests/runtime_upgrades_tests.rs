//! Tests for the runtime elevator upgrade setters on `Simulation`.
//!
//! Covers happy-path per field, validation errors, unknown-entity errors,
//! velocity preservation when `max_speed` changes mid-flight, door-timing
//! setters not retroactively affecting an in-progress door cycle, and
//! capacity changes applying immediately even when the car is overloaded.

use crate::components::ElevatorPhase;
use crate::dispatch::scan::ScanDispatch;
use crate::entity::EntityId;
use crate::error::SimError;
use crate::events::{Event, UpgradeField, UpgradeValue};
use crate::sim::Simulation;
use crate::stop::StopId;
use crate::tests::helpers::default_config;

fn make_sim() -> (Simulation, EntityId) {
    let config = default_config();
    let sim = Simulation::new(&config, ScanDispatch::new()).unwrap();
    let elev = sim.world().iter_elevators().next().unwrap().0;
    (sim, elev)
}

fn count_upgrades(events: &[Event], field: UpgradeField) -> usize {
    events
        .iter()
        .filter(|e| matches!(e, Event::ElevatorUpgraded { field: f, .. } if *f == field))
        .count()
}

fn find_upgrade(events: &[Event], field: UpgradeField) -> Option<(UpgradeValue, UpgradeValue)> {
    events.iter().find_map(|e| match e {
        Event::ElevatorUpgraded {
            field: f, old, new, ..
        } if *f == field => Some((*old, *new)),
        _ => None,
    })
}

// ── Happy-path per field ─────────────────────────────────────────────

#[test]
fn set_max_speed_applies_and_emits_event() {
    let (mut sim, elev) = make_sim();
    let old = sim.world().elevator(elev).unwrap().max_speed();

    sim.set_max_speed(elev, 4.0).unwrap();

    assert_eq!(sim.world().elevator(elev).unwrap().max_speed().value(), 4.0);
    let events = sim.drain_events();
    assert_eq!(count_upgrades(&events, UpgradeField::MaxSpeed), 1);
    let (old_v, new_v) = find_upgrade(&events, UpgradeField::MaxSpeed).unwrap();
    assert_eq!(old_v, UpgradeValue::float(old.value()));
    assert_eq!(new_v, UpgradeValue::float(4.0));
}

#[test]
fn set_acceleration_applies_and_emits_event() {
    let (mut sim, elev) = make_sim();
    let old = sim.world().elevator(elev).unwrap().acceleration();
    sim.set_acceleration(elev, 3.0).unwrap();
    assert_eq!(
        sim.world().elevator(elev).unwrap().acceleration().value(),
        3.0
    );
    let events = sim.drain_events();
    assert_eq!(count_upgrades(&events, UpgradeField::Acceleration), 1);
    let (old_v, new_v) = find_upgrade(&events, UpgradeField::Acceleration).unwrap();
    assert_eq!(old_v, UpgradeValue::float(old.value()));
    assert_eq!(new_v, UpgradeValue::float(3.0));
}

#[test]
fn set_deceleration_applies_and_emits_event() {
    let (mut sim, elev) = make_sim();
    let old = sim.world().elevator(elev).unwrap().deceleration();
    sim.set_deceleration(elev, 3.5).unwrap();
    assert_eq!(
        sim.world().elevator(elev).unwrap().deceleration().value(),
        3.5
    );
    let events = sim.drain_events();
    assert_eq!(count_upgrades(&events, UpgradeField::Deceleration), 1);
    let (old_v, new_v) = find_upgrade(&events, UpgradeField::Deceleration).unwrap();
    assert_eq!(old_v, UpgradeValue::float(old.value()));
    assert_eq!(new_v, UpgradeValue::float(3.5));
}

#[test]
fn set_weight_capacity_applies_and_emits_event() {
    let (mut sim, elev) = make_sim();
    let old = sim.world().elevator(elev).unwrap().weight_capacity();
    sim.set_weight_capacity(elev, 1200.0).unwrap();
    assert_eq!(
        sim.world()
            .elevator(elev)
            .unwrap()
            .weight_capacity()
            .value(),
        1200.0
    );
    let events = sim.drain_events();
    assert_eq!(count_upgrades(&events, UpgradeField::WeightCapacity), 1);
    let (old_v, new_v) = find_upgrade(&events, UpgradeField::WeightCapacity).unwrap();
    assert_eq!(old_v, UpgradeValue::float(old.value()));
    assert_eq!(new_v, UpgradeValue::float(1200.0));
}

#[test]
fn set_door_transition_ticks_applies_and_emits_event() {
    let (mut sim, elev) = make_sim();
    let old = sim.world().elevator(elev).unwrap().door_transition_ticks();
    sim.set_door_transition_ticks(elev, 3).unwrap();
    assert_eq!(
        sim.world().elevator(elev).unwrap().door_transition_ticks(),
        3
    );
    let events = sim.drain_events();
    assert_eq!(
        count_upgrades(&events, UpgradeField::DoorTransitionTicks),
        1
    );
    let (old_v, new_v) = find_upgrade(&events, UpgradeField::DoorTransitionTicks).unwrap();
    assert_eq!(old_v, UpgradeValue::ticks(old));
    assert_eq!(new_v, UpgradeValue::ticks(3));
}

#[test]
fn set_door_open_ticks_applies_and_emits_event() {
    let (mut sim, elev) = make_sim();
    let old = sim.world().elevator(elev).unwrap().door_open_ticks();
    sim.set_door_open_ticks(elev, 20).unwrap();
    assert_eq!(sim.world().elevator(elev).unwrap().door_open_ticks(), 20);
    let events = sim.drain_events();
    assert_eq!(count_upgrades(&events, UpgradeField::DoorOpenTicks), 1);
    let (old_v, new_v) = find_upgrade(&events, UpgradeField::DoorOpenTicks).unwrap();
    assert_eq!(old_v, UpgradeValue::ticks(old));
    assert_eq!(new_v, UpgradeValue::ticks(20));
}

// ── Validation errors ────────────────────────────────────────────────

#[test]
fn set_max_speed_rejects_non_positive() {
    let (mut sim, elev) = make_sim();
    let before = sim.world().elevator(elev).unwrap().max_speed();
    let err = sim.set_max_speed(elev, -1.0).unwrap_err();
    assert!(matches!(err, SimError::InvalidConfig { .. }));
    assert_eq!(sim.world().elevator(elev).unwrap().max_speed(), before);
}

#[test]
fn set_acceleration_rejects_zero() {
    let (mut sim, elev) = make_sim();
    let before = sim.world().elevator(elev).unwrap().acceleration();
    let err = sim.set_acceleration(elev, 0.0).unwrap_err();
    assert!(matches!(err, SimError::InvalidConfig { .. }));
    assert_eq!(sim.world().elevator(elev).unwrap().acceleration(), before);
}

#[test]
fn set_weight_capacity_rejects_nan() {
    let (mut sim, elev) = make_sim();
    let before = sim.world().elevator(elev).unwrap().weight_capacity();
    let err = sim.set_weight_capacity(elev, f64::NAN).unwrap_err();
    assert!(matches!(err, SimError::InvalidConfig { .. }));
    assert_eq!(
        sim.world().elevator(elev).unwrap().weight_capacity(),
        before
    );
}

#[test]
fn set_deceleration_rejects_infinite() {
    let (mut sim, elev) = make_sim();
    let before = sim.world().elevator(elev).unwrap().deceleration();
    let err = sim.set_deceleration(elev, f64::INFINITY).unwrap_err();
    assert!(matches!(err, SimError::InvalidConfig { .. }));
    assert_eq!(sim.world().elevator(elev).unwrap().deceleration(), before);
}

#[test]
fn set_door_transition_ticks_rejects_zero() {
    let (mut sim, elev) = make_sim();
    let before = sim.world().elevator(elev).unwrap().door_transition_ticks();
    let err = sim.set_door_transition_ticks(elev, 0).unwrap_err();
    assert!(matches!(err, SimError::InvalidConfig { .. }));
    assert_eq!(
        sim.world().elevator(elev).unwrap().door_transition_ticks(),
        before
    );
}

#[test]
fn set_door_open_ticks_rejects_zero() {
    let (mut sim, elev) = make_sim();
    let before = sim.world().elevator(elev).unwrap().door_open_ticks();
    let err = sim.set_door_open_ticks(elev, 0).unwrap_err();
    assert!(matches!(err, SimError::InvalidConfig { .. }));
    assert_eq!(
        sim.world().elevator(elev).unwrap().door_open_ticks(),
        before
    );
}

// ── Unknown elevator ─────────────────────────────────────────────────

#[test]
fn set_on_non_elevator_returns_invalid_state() {
    let (mut sim, _elev) = make_sim();
    // Spawning a rider produces an EntityId that is not an elevator.
    let rider = sim.spawn_rider(StopId(0), StopId(1), 70.0).unwrap();
    let err = sim.set_max_speed(rider, 4.0).unwrap_err();
    assert!(matches!(err, SimError::NotAnElevator(_)));
}

// ── Velocity preservation ────────────────────────────────────────────

/// When `max_speed` is raised mid-flight the current velocity is preserved
/// and the car is free to accelerate up to the new (higher) cap on
/// subsequent ticks.
#[test]
fn raising_max_speed_preserves_current_velocity() {
    let (mut sim, elev) = make_sim();
    // Dispatch far away so the car cruises.
    sim.push_destination(elev, sim.stop_entity(StopId(2)).unwrap())
        .unwrap();
    for _ in 0..30 {
        sim.step();
    }
    let vel_before = sim.world().velocity(elev).unwrap().value;
    assert!(
        vel_before > 0.0,
        "car should be moving; got velocity {vel_before}"
    );

    sim.set_max_speed(elev, 10.0).unwrap();
    sim.step();
    let vel_after = sim.world().velocity(elev).unwrap().value;
    // Velocity should be >= prior velocity (either unchanged or accelerated).
    assert!(
        vel_after >= vel_before - 1e-6,
        "expected preserved-or-increased velocity after raising cap: \
         before={vel_before} after={vel_after}"
    );
}

/// When `max_speed` is lowered below the current velocity the movement
/// integrator clamps velocity to the new cap on the next tick (see
/// `tick_movement`'s cruise branch). Velocity is otherwise not
/// instantaneously zeroed — the car simply stops accelerating and cruises
/// at the new cap.
#[test]
fn lowering_max_speed_clamps_velocity_on_next_tick() {
    let (mut sim, elev) = make_sim();
    sim.push_destination(elev, sim.stop_entity(StopId(2)).unwrap())
        .unwrap();
    for _ in 0..30 {
        sim.step();
    }
    let vel_before = sim.world().velocity(elev).unwrap().value;
    assert!(vel_before > 0.5, "car should be cruising: v={vel_before}");

    // Pick a cap well below current cruising velocity.
    let new_cap = vel_before * 0.5;
    sim.set_max_speed(elev, new_cap).unwrap();
    sim.step();

    let vel_after = sim.world().velocity(elev).unwrap().value;
    assert!(
        vel_after <= new_cap + 1e-6,
        "expected velocity to be clamped at or below new cap {new_cap}, got {vel_after}"
    );
}

// ── Door timing ──────────────────────────────────────────────────────

/// Setting `door_open_ticks` while doors are already open must not
/// retroactively retime the current open period. The new value only
/// applies to the next door cycle.
#[test]
fn door_open_ticks_change_does_not_affect_in_progress_cycle() {
    let (mut sim, elev) = make_sim();
    sim.push_destination(elev, sim.stop_entity(StopId(1)).unwrap())
        .unwrap();

    // Tick until the doors are fully open (phase Loading).
    let mut reached_loading = false;
    for _ in 0..500 {
        sim.step();
        if sim.world().elevator(elev).unwrap().phase() == ElevatorPhase::Loading {
            reached_loading = true;
            break;
        }
    }
    assert!(reached_loading, "elevator should reach Loading phase");

    // Snapshot the current in-progress door state.
    let door_before = *sim.world().elevator(elev).unwrap().door();

    // Change the open-ticks config. This must NOT mutate the current
    // in-progress DoorState — only the next cycle picks it up.
    sim.set_door_open_ticks(elev, 99).unwrap();

    let door_after = *sim.world().elevator(elev).unwrap().door();
    assert_eq!(
        door_before, door_after,
        "in-progress door FSM must not change when door_open_ticks setter is called"
    );
    assert_eq!(sim.world().elevator(elev).unwrap().door_open_ticks(), 99);
}

// ── Capacity below current_load ──────────────────────────────────────

/// Lowering `weight_capacity` below `current_load` applies immediately
/// (the car is temporarily overweight) and no new rider can board that
/// would push the load further over the new cap.
#[test]
fn weight_capacity_below_current_load_still_applies() {
    let (mut sim, elev) = make_sim();
    // Get a rider boarded.
    let rider = sim.spawn_rider(StopId(0), StopId(2), 200.0).unwrap();
    let mut boarded = false;
    for _ in 0..500 {
        sim.step();
        if matches!(
            sim.world().rider(rider).unwrap().phase,
            crate::components::RiderPhase::Riding(_)
                | crate::components::RiderPhase::Exiting(_)
                | crate::components::RiderPhase::Arrived
        ) {
            boarded = true;
            break;
        }
    }
    assert!(boarded, "rider should board within 500 ticks");
    let load = sim.world().elevator(elev).unwrap().current_load().value();
    assert!(load > 0.0, "current_load should be non-zero after boarding");

    // Force capacity below current load.
    let new_cap = load / 2.0;
    sim.set_weight_capacity(elev, new_cap).unwrap();
    assert_eq!(
        sim.world()
            .elevator(elev)
            .unwrap()
            .weight_capacity()
            .value(),
        new_cap
    );
    // current_load is unchanged — no riders ejected.
    assert!(
        (sim.world().elevator(elev).unwrap().current_load().value() - load).abs() < 1e-9,
        "current_load must not change when capacity is lowered"
    );
}
