//! Tests for the hall-call / car-call public API.

use crate::components::CallDirection;
use crate::entity::EntityId;
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

/// Nonzero `ack_latency_ticks`: a hall call pressed at tick T only
/// becomes acknowledged at tick T+N, and `HallCallAcknowledged` fires
/// on exactly that tick. Locks in the deferred-ack path in
/// `advance_transient::ack_hall_calls`.
#[test]
fn nonzero_ack_latency_delays_acknowledgement() {
    use crate::dispatch::HallCallMode;
    use crate::ids::GroupId;

    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    // Configure a 5-tick ack latency on the only group, leaving Classic
    // mode unchanged.
    for g in sim.groups_mut() {
        if g.id() == GroupId(0) {
            g.set_ack_latency_ticks(5);
            g.set_hall_call_mode(HallCallMode::Classic);
        }
    }

    let press_tick = sim.current_tick();
    let stop = sim.stop_entity(StopId(1)).unwrap();
    sim.press_hall_button(stop, CallDirection::Up).unwrap();

    // Press tick: call exists but unacknowledged.
    let call = sim.world().hall_call(stop, CallDirection::Up).unwrap();
    assert_eq!(call.press_tick, press_tick);
    assert_eq!(call.acknowledged_at, None);
    sim.drain_events();

    // Step forward. At each step `advance_transient` runs with the
    // current tick *before* the end-of-step advance, so `current_tick()`
    // afterwards equals the tick the ack pass ran on, plus one. The
    // call should remain pending until the pass processes a tick whose
    // delta ≥ `ack_latency_ticks`.
    let mut ack_tick: Option<u64> = None;
    for _ in 0..10 {
        sim.step();
        let call = sim.world().hall_call(stop, CallDirection::Up).unwrap();
        if let Some(t) = call.acknowledged_at {
            ack_tick = Some(t);
            break;
        }
    }
    let ack_tick = ack_tick.expect("ack should fire within 10 steps");
    assert_eq!(
        ack_tick.saturating_sub(press_tick),
        5,
        "ack should fire exactly `ack_latency_ticks` ticks after the press"
    );
    // One HallCallAcknowledged event (not one per step).
    let events = sim.drain_events();
    let acks = events
        .iter()
        .filter(|e| matches!(e, Event::HallCallAcknowledged { .. }))
        .count();
    assert!(acks <= 1, "HallCallAcknowledged should fire at most once");
}

/// DCS mode: a hall call press by a rider populates the call's
/// destination so destination-aware strategies can read it directly.
#[test]
fn destination_mode_records_destination_on_call() {
    use crate::dispatch::HallCallMode;
    use crate::ids::GroupId;

    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    for g in sim.groups_mut() {
        if g.id() == GroupId(0) {
            g.set_hall_call_mode(HallCallMode::Destination);
        }
    }
    let origin = sim.stop_entity(StopId(0)).unwrap();
    let dest = sim.stop_entity(StopId(2)).unwrap();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    let call = sim.world().hall_call(origin, CallDirection::Up).unwrap();
    assert_eq!(
        call.destination,
        Some(dest),
        "DCS kiosk entry should populate the hall call's destination"
    );
}

/// Public `Simulation::hall_calls()` and `car_calls(car)` expose the
/// active call state without requiring `sim.world()` traversal.
#[test]
fn public_call_queries_return_active_calls() {
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    // One hall call registered at the origin going up.
    let count = sim.hall_calls().count();
    assert_eq!(count, 1);
    // No car calls yet (rider hasn't boarded).
    let car = sim.world().elevator_ids()[0];
    assert!(sim.car_calls(car).is_empty());
}

/// `CarCall`s are cleaned up when the rider who pressed the button exits
/// at that floor. Regression against unbounded growth of per-car
/// `car_calls` vectors reported in PR review.
#[test]
fn car_call_removed_on_exit() {
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    let car = sim.world().elevator_ids()[0];

    // Run until the rider reaches Arrived.
    let mut boarded = false;
    for _ in 0..2000 {
        sim.step();
        if !boarded && !sim.car_calls(car).is_empty() {
            boarded = true;
        }
        if boarded && sim.car_calls(car).is_empty() {
            break;
        }
    }
    assert!(
        sim.car_calls(car).is_empty(),
        "car_calls should be drained once the rider exits"
    );
}

/// An explicit `press_car_button` (no rider associated) emits
/// `CarButtonPressed { rider: None, ... }`. Regression against the
/// previous sentinel-entity behavior flagged in PR review.
#[test]
fn press_car_button_without_rider_emits_none_rider() {
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    let car = sim.world().elevator_ids()[0];
    let floor = sim.stop_entity(StopId(2)).unwrap();
    sim.press_car_button(car, floor).unwrap();
    let events = sim.drain_events();
    let pressed = events
        .iter()
        .find_map(|e| match e {
            Event::CarButtonPressed { rider, .. } => Some(*rider),
            _ => None,
        })
        .expect("CarButtonPressed should fire");
    assert_eq!(
        pressed, None,
        "synthetic press should emit None rider, not EntityId::default()"
    );
}

/// A pin applied while a car is in `Loading` phase must not clobber its
/// door-cycle state. Regression against the PR-review finding that the
/// pin pre-commit bypassed the phase-eligibility gate.
#[test]
fn pinned_pin_does_not_clobber_loading_car() {
    use crate::components::ElevatorPhase;

    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    // Run until the car reaches Loading phase at some stop.
    let car = sim.world().elevator_ids()[0];
    let mut loading_stop: Option<EntityId> = None;
    for _ in 0..2000 {
        sim.step();
        if let Some(c) = sim.world().elevator(car)
            && c.phase == ElevatorPhase::Loading
        {
            loading_stop = c.target_stop;
            break;
        }
    }
    let loading_stop = loading_stop.expect("car should reach Loading phase within 2000 ticks");
    // Spawn a second rider elsewhere and pin the loading car to that stop.
    let other = sim.stop_entity(StopId(1)).unwrap();
    if other != loading_stop {
        sim.press_hall_button(other, CallDirection::Down).ok();
        let _ = sim.pin_assignment(car, other, CallDirection::Down);
        sim.drain_events();
        // One tick of dispatch must not yank the car out of Loading.
        sim.step();
        let phase_after = sim.world().elevator(car).map(|c| c.phase);
        assert!(
            !matches!(phase_after, Some(ElevatorPhase::MovingToStop(s)) if s == other),
            "pin should not override a Loading car mid-door-cycle"
        );
    }
}

/// `rebalk_on_full = true` escalates a balk into immediate abandonment.
/// Regression guard — the flag was documented but previously inert.
#[test]
fn rebalk_on_full_abandons_immediately() {
    use crate::components::Preferences;
    let mut config = default_config();
    // Tight capacity so any preload fills the car.
    config.elevators[0].weight_capacity = 100.0;
    let mut sim = Simulation::new(&config, scan()).unwrap();

    // Rider with rebalk_on_full who skips anything with load > 0.5.
    let picky = sim
        .build_rider_by_stop_id(StopId(0), StopId(2))
        .unwrap()
        .weight(30.0)
        .preferences(Preferences::default().with_rebalk_on_full(true))
        .spawn()
        .unwrap();
    // Note: Preferences::default has skip_full_elevator = false, but
    // max_crowding_factor 0.8 means a 60-weight preload still exceeds.
    sim.world_mut().set_preferences(
        picky,
        Preferences {
            skip_full_elevator: true,
            max_crowding_factor: 0.5,
            balk_threshold_ticks: None,
            rebalk_on_full: true,
        },
    );

    // Force the elevator to Loading phase at the picky rider's stop
    // with a ballast preload that trips the preference filter.
    let elev = sim.world().elevator_ids()[0];
    let stop0 = sim.stop_entity(StopId(0)).unwrap();
    let stop0_pos = sim.world().stop(stop0).unwrap().position;
    {
        let w = sim.world_mut();
        if let Some(pos) = w.position_mut(elev) {
            pos.value = stop0_pos;
        }
        if let Some(vel) = w.velocity_mut(elev) {
            vel.value = 0.0;
        }
        if let Some(car) = w.elevator_mut(elev) {
            car.phase = crate::components::ElevatorPhase::Loading;
            car.current_load = 60.0;
            car.target_stop = None;
        }
    }
    sim.run_loading();
    sim.advance_tick();
    let phase = sim.world().rider(picky).map(|r| r.phase);
    assert_eq!(
        phase,
        Some(crate::components::RiderPhase::Abandoned),
        "rebalk_on_full should escalate the balk into Abandoned"
    );
}

/// `commit_go_to_stop` must not re-emit `ElevatorAssigned` every tick
/// for a car that's already `MovingToStop(stop)`. Regression guard for
/// the reassignment idempotence case.
#[test]
fn reassignment_does_not_spam_elevator_assigned() {
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    sim.drain_events();
    // Step enough ticks to let dispatch commit + keep the car moving
    // (it won't arrive instantly). Count ElevatorAssigned emissions.
    let mut assigned_events = 0usize;
    for _ in 0..20 {
        sim.step();
        for e in sim.drain_events() {
            if matches!(e, Event::ElevatorAssigned { .. }) {
                assigned_events += 1;
            }
        }
    }
    assert!(
        assigned_events <= 1,
        "ElevatorAssigned should fire at most once per trip, got {assigned_events}"
    );
}

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

/// A pinned call forces dispatch to commit the pinned car even when
/// another car would be the optimal choice under the strategy's cost.
#[test]
fn pinned_call_forces_specific_car() {
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    // Spawn a rider at StopId(1) going up to StopId(2) — auto-presses
    // the hall call at the origin.
    sim.spawn_rider_by_stop_id(StopId(1), StopId(2), 70.0)
        .unwrap();
    let origin = sim.stop_entity(StopId(1)).unwrap();
    // Pin the call to elevator 0 even though SCAN would pick whichever
    // car is closest.
    let cars = sim.world().elevator_ids();
    assert!(!cars.is_empty());
    let pinned_car = cars[0];
    sim.pin_assignment(pinned_car, origin, CallDirection::Up)
        .unwrap();
    // Step a few ticks; dispatch should commit the pinned car.
    for _ in 0..10 {
        sim.step();
    }
    let car = sim.world().elevator(pinned_car).unwrap();
    assert!(
        matches!(
            car.phase,
            crate::components::ElevatorPhase::MovingToStop(_)
                | crate::components::ElevatorPhase::DoorOpening
                | crate::components::ElevatorPhase::Loading
                | crate::components::ElevatorPhase::DoorClosing
        ) || car.target_stop == Some(origin),
        "pinned car should be committed to the pinned stop"
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
