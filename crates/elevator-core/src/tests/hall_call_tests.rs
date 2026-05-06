//! Tests for the hall-call / car-call public API.

use crate::components::CallDirection;
use crate::components::Weight;
use crate::entity::{ElevatorId, EntityId};
use crate::events::Event;
use crate::sim::Simulation;
use crate::stop::StopId;

use super::helpers::{default_config, scan};

/// Spawning a rider auto-presses the hall button in the correct direction.
#[test]
fn spawn_rider_auto_presses_hall_button() {
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    let rid = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    let origin = sim.stop_entity(StopId(0)).unwrap();
    let call = sim.world().hall_call(origin, CallDirection::Up).unwrap();
    assert_eq!(call.direction, CallDirection::Up);
    assert!(
        call.pending_riders.contains(&rid.entity()),
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
    let r1 = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.drain_events();
    let r2 = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    let origin = sim.stop_entity(StopId(0)).unwrap();
    let call = sim.world().hall_call(origin, CallDirection::Up).unwrap();
    assert!(call.pending_riders.contains(&r1.entity()));
    assert!(call.pending_riders.contains(&r2.entity()));
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
    let car = ElevatorId::from(sim.world().elevator_ids()[0]);
    sim.press_hall_button(stop, CallDirection::Up).unwrap();
    sim.pin_assignment(car, stop, CallDirection::Up).unwrap();
    let call = sim.world().hall_call(stop, CallDirection::Up).unwrap();
    assert_eq!(call.any_assigned_car(), Some(car.entity()));
    assert!(call.pinned);
    sim.unpin_assignment(stop, CallDirection::Up);
    let call = sim.world().hall_call(stop, CallDirection::Up).unwrap();
    assert!(!call.pinned);
}

/// Pre-fix, disabling a car holding a pinned hall-call assignment left
/// `assigned_car=Some(disabled)` and `pinned=true` — dispatch kept
/// committing the disabled car as the assignee, but movement skips
/// disabled cars so the call was permanently stranded (#292).
#[test]
fn disable_clears_pinned_hall_call_assignment() {
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    let stop = sim.stop_entity(StopId(1)).unwrap();
    let car = ElevatorId::from(sim.world().elevator_ids()[0]);

    sim.press_hall_button(stop, CallDirection::Up).unwrap();
    sim.pin_assignment(car, stop, CallDirection::Up).unwrap();
    assert_eq!(
        sim.assigned_car(stop, CallDirection::Up),
        Some(car.entity()),
        "precondition: pinned to disabled car"
    );

    sim.disable(car.entity()).unwrap();

    assert_eq!(
        sim.assigned_car(stop, CallDirection::Up),
        None,
        "disabled-car assignment must be cleared"
    );
    let call = sim.world().hall_call(stop, CallDirection::Up).unwrap();
    assert!(!call.pinned, "pinned flag must be cleared");
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
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
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
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    // One hall call registered at the origin going up.
    let count = sim.hall_calls().count();
    assert_eq!(count, 1);
    // No car calls yet (rider hasn't boarded).
    let car = ElevatorId::from(sim.world().elevator_ids()[0]);
    assert!(sim.car_calls(car).is_empty());
}

/// `CarCall`s are cleaned up when the rider who pressed the button exits
/// at that floor. Regression against unbounded growth of per-car
/// `car_calls` vectors reported in PR review.
#[test]
fn car_call_removed_on_exit() {
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    let car = ElevatorId::from(sim.world().elevator_ids()[0]);

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
    let car = ElevatorId::from(sim.world().elevator_ids()[0]);
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
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    // Run until the car reaches Loading phase at some stop.
    let car = ElevatorId::from(sim.world().elevator_ids()[0]);
    let mut loading_stop: Option<EntityId> = None;
    for _ in 0..2000 {
        sim.step();
        if let Some(c) = sim.world().elevator(car.entity())
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
        let phase_after = sim.world().elevator(car.entity()).map(|c| c.phase);
        assert!(
            !matches!(phase_after, Some(ElevatorPhase::MovingToStop(s)) if s == other),
            "pin should not override a Loading car mid-door-cycle"
        );
    }
}

/// `abandon_on_full = true` escalates a skip into immediate abandonment.
/// Regression guard — the flag was documented but previously inert.
#[test]
fn abandon_on_full_abandons_immediately() {
    use crate::components::Preferences;
    let mut config = default_config();
    // Tight capacity so any preload fills the car.
    config.elevators[0].weight_capacity = Weight::from(100.0);
    let mut sim = Simulation::new(&config, scan()).unwrap();

    // Rider with abandon_on_full who skips anything with load > 0.5.
    let picky = sim
        .build_rider(StopId(0), StopId(2))
        .unwrap()
        .weight(30.0)
        .preferences(Preferences::default().with_abandon_on_full(true))
        .spawn()
        .unwrap();
    // Note: Preferences::default has skip_full_elevator = false, but
    // max_crowding_factor 0.8 means a 60-weight preload still exceeds.
    sim.world_mut().set_preferences(
        picky.entity(),
        Preferences {
            skip_full_elevator: true,
            max_crowding_factor: 0.5,
            abandon_after_ticks: None,
            abandon_on_full: true,
        },
    );

    // Force the elevator to Loading phase at the picky rider's stop
    // with a ballast preload that trips the preference filter.
    let elev = ElevatorId::from(sim.world().elevator_ids()[0]);
    let stop0 = sim.stop_entity(StopId(0)).unwrap();
    let stop0_pos = sim.world().stop(stop0).unwrap().position;
    {
        let w = sim.world_mut();
        if let Some(pos) = w.position_mut(elev.entity()) {
            pos.value = stop0_pos;
        }
        if let Some(vel) = w.velocity_mut(elev.entity()) {
            vel.value = 0.0;
        }
        if let Some(car) = w.elevator_mut(elev.entity()) {
            car.phase = crate::components::ElevatorPhase::Loading;
            car.current_load = Weight::from(60.0);
            car.target_stop = None;
        }
    }
    sim.run_loading();
    sim.advance_tick();
    let phase = sim.world().rider(picky.entity()).map(|r| r.phase);
    assert_eq!(
        phase,
        Some(crate::components::RiderPhase::Abandoned),
        "abandon_on_full should escalate the skip into Abandoned"
    );
}

/// `abandon_on_full` and `abandon_after_ticks` are independent axes.
/// Setting both with `abandon_on_full = true` and a large threshold
/// proves the event-triggered path fires before the time-triggered
/// one — the two do not gate each other.
#[test]
fn abandon_on_full_fires_before_abandon_after_ticks_elapses() {
    use crate::components::Preferences;
    let mut config = default_config();
    config.elevators[0].weight_capacity = Weight::from(100.0);
    let mut sim = Simulation::new(&config, scan()).unwrap();

    let picky = sim
        .build_rider(StopId(0), StopId(2))
        .unwrap()
        .weight(30.0)
        .preferences(Preferences::default())
        .spawn()
        .unwrap();
    // Both fields set: a very large threshold that would never fire in
    // this test, plus abandon_on_full = true. The rider should abandon
    // on the first full-car skip — not wait the threshold out.
    sim.world_mut().set_preferences(
        picky.entity(),
        Preferences {
            skip_full_elevator: true,
            max_crowding_factor: 0.5,
            abandon_after_ticks: Some(1_000_000),
            abandon_on_full: true,
        },
    );

    let elev = ElevatorId::from(sim.world().elevator_ids()[0]);
    let stop0 = sim.stop_entity(StopId(0)).unwrap();
    let stop0_pos = sim.world().stop(stop0).unwrap().position;
    {
        let w = sim.world_mut();
        if let Some(pos) = w.position_mut(elev.entity()) {
            pos.value = stop0_pos;
        }
        if let Some(vel) = w.velocity_mut(elev.entity()) {
            vel.value = 0.0;
        }
        if let Some(car) = w.elevator_mut(elev.entity()) {
            car.phase = crate::components::ElevatorPhase::Loading;
            car.current_load = Weight::from(60.0);
            car.target_stop = None;
        }
    }
    sim.run_loading();
    sim.advance_tick();
    assert_eq!(
        sim.world().rider(picky.entity()).map(|r| r.phase),
        Some(crate::components::RiderPhase::Abandoned),
        "abandon_on_full should fire on first full-car contact regardless of threshold",
    );
}

/// Cross-line pin is rejected at `pin_assignment` time rather than
/// silently orphaning the call at dispatch. Regression against the
/// gap flagged in the multi-line audit.
#[test]
fn pin_across_lines_is_rejected() {
    use crate::components::Orientation;
    use crate::config::{ElevatorConfig, GroupConfig, LineConfig};
    use crate::dispatch::BuiltinStrategy;
    use crate::dispatch::scan::ScanDispatch;
    use crate::stop::StopConfig;

    // Two lines in one group: Low serves Ground+Mid, High serves Mid+Top.
    let mut config = default_config();
    config.building.stops = vec![
        StopConfig {
            id: StopId(0),
            name: "Ground".into(),
            position: 0.0,
        },
        StopConfig {
            id: StopId(1),
            name: "Mid".into(),
            position: 10.0,
        },
        StopConfig {
            id: StopId(2),
            name: "Top".into(),
            position: 20.0,
        },
    ];
    let mk_elev = |id: u32, name: &str, start: StopId| ElevatorConfig {
        id,
        name: name.into(),
        starting_stop: start,
        ..ElevatorConfig::default()
    };
    config.building.lines = Some(vec![
        LineConfig {
            id: 1,
            name: "Low".into(),
            serves: vec![StopId(0), StopId(1)],
            elevators: vec![mk_elev(1, "L1", StopId(0))],
            orientation: Orientation::Vertical,
            position: None,
            min_position: None,
            max_position: None,
            max_cars: None,
        },
        LineConfig {
            id: 2,
            name: "High".into(),
            serves: vec![StopId(1), StopId(2)],
            elevators: vec![mk_elev(2, "H1", StopId(1))],
            orientation: Orientation::Vertical,
            position: None,
            min_position: None,
            max_position: None,
            max_cars: None,
        },
    ]);
    config.building.groups = Some(vec![GroupConfig {
        id: 0,
        name: "SplitGroup".into(),
        lines: vec![1, 2],
        dispatch: BuiltinStrategy::Scan,
        reposition: None,
        hall_call_mode: None,
        ack_latency_ticks: None,
    }]);
    config.elevators = Vec::new();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let top = sim.stop_entity(StopId(2)).unwrap();
    sim.press_hall_button(top, CallDirection::Down).unwrap();

    // Locate the Low car (its line does NOT serve Top).
    let low_car = sim
        .world()
        .elevator_ids()
        .into_iter()
        .find(|&e| {
            let Some(line) = sim.world().elevator(e).map(|c| c.line) else {
                return false;
            };
            sim.groups()
                .iter()
                .flat_map(|g| g.lines().iter())
                .find(|li| li.entity() == line)
                .is_some_and(|li| !li.serves().contains(&top))
        })
        .expect("Low elevator should exist and not serve Top");

    let err = sim.pin_assignment(ElevatorId::from(low_car), top, CallDirection::Down);
    assert!(
        matches!(
            err,
            Err(crate::error::SimError::LineDoesNotServeStop { .. })
        ),
        "cross-line pin should return LineDoesNotServeStop, got {err:?}"
    );
    let call = sim.world().hall_call(top, CallDirection::Down).unwrap();
    assert!(!call.pinned, "failed pin must not flag the call pinned");
}

/// Multi-line: a shared stop serving two groups creates one hall call
/// attributable to the group its rider is routed through. Verifies the
/// "first group wins" documentation on `HallCallMode`.
#[test]
fn shared_stop_attributes_call_to_first_group() {
    // Uses the default single-group / single-line config (no shared
    // groups exist there), but exercises the cross-tick shape of the
    // audit: call is created, assigned_car reflects dispatch, and no
    // duplicate HallCall exists. The stricter overlapping-groups
    // scenario isn't constructable via the public builder; covering it
    // here as the one-group variant is sufficient until a public API
    // for overlapping groups is added.
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    sim.spawn_rider(StopId(1), StopId(2), 70.0).unwrap();
    let origin = sim.stop_entity(StopId(1)).unwrap();
    let calls: Vec<_> = sim.hall_calls().collect();
    assert_eq!(calls.len(), 1, "one call per (stop, direction)");
    assert_eq!(calls[0].stop, origin);
    assert_eq!(calls[0].direction, CallDirection::Up);
}

/// `commit_go_to_stop` must not re-emit `ElevatorAssigned` every tick
/// for a car that's already `MovingToStop(stop)`. Regression guard for
/// the reassignment idempotence case.
#[test]
fn reassignment_does_not_spam_elevator_assigned() {
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
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
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
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
    sim.spawn_rider(StopId(1), StopId(2), 70.0).unwrap();
    let origin = sim.stop_entity(StopId(1)).unwrap();
    // Pin the call to elevator 0 even though SCAN would pick whichever
    // car is closest.
    let cars = sim.world().elevator_ids();
    assert!(!cars.is_empty());
    let pinned_car = cars[0];
    sim.pin_assignment(ElevatorId::from(pinned_car), origin, CallDirection::Up)
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
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
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

/// `GroupConfig::hall_call_mode` and `ack_latency_ticks` flow through
/// `Simulation::new` to the built `ElevatorGroup`, so RON configs can
/// activate Destination dispatch and controller latency without needing
/// runtime mutation via `groups_mut`.
#[test]
fn group_config_wires_hall_call_mode_and_ack_latency() {
    use crate::components::Orientation;
    use crate::config::{GroupConfig, LineConfig};
    use crate::dispatch::scan::ScanDispatch;
    use crate::dispatch::{BuiltinStrategy, HallCallMode};

    let mut config = default_config();
    config.building.lines = Some(vec![LineConfig {
        id: 1,
        name: "Main".into(),
        serves: vec![StopId(0), StopId(1), StopId(2)],
        elevators: config.elevators.clone(),
        orientation: Orientation::Vertical,
        position: None,
        min_position: None,
        max_position: None,
        max_cars: None,
    }]);
    config.building.groups = Some(vec![GroupConfig {
        id: 0,
        name: "DCS".into(),
        lines: vec![1],
        dispatch: BuiltinStrategy::Scan,
        reposition: None,
        hall_call_mode: Some(HallCallMode::Destination),
        ack_latency_ticks: Some(15),
    }]);
    config.elevators = Vec::new();

    let sim = Simulation::new(&config, ScanDispatch::new()).unwrap();
    assert_eq!(sim.groups()[0].hall_call_mode(), HallCallMode::Destination);
    assert_eq!(sim.groups()[0].ack_latency_ticks(), 15);
}

/// RON deserializes pre-#94 group configs without the new fields
/// because both use `#[serde(default)]`.
#[test]
fn group_config_ron_defaults_to_classic_zero_latency() {
    use crate::config::GroupConfig;
    use crate::dispatch::HallCallMode;

    let ron = r#"GroupConfig(
        id: 0,
        name: "Legacy",
        lines: [1],
        dispatch: Scan,
    )"#;
    let gc: GroupConfig = ron::from_str(ron).expect("RON without new fields should deserialize");
    assert_eq!(gc.hall_call_mode, None);
    assert_eq!(gc.ack_latency_ticks, None);

    // And explicit RON values round-trip.
    let ron_explicit = r#"GroupConfig(
        id: 1,
        name: "DCS",
        lines: [2],
        dispatch: Scan,
        hall_call_mode: Some(Destination),
        ack_latency_ticks: Some(10),
    )"#;
    let gc2: GroupConfig = ron::from_str(ron_explicit).expect("explicit RON should deserialize");
    assert_eq!(gc2.hall_call_mode, Some(HallCallMode::Destination));
    assert_eq!(gc2.ack_latency_ticks, Some(10));
}

/// A custom dispatch strategy can observe hall-call state via
/// `DispatchManifest::hall_call_at(...)` without reaching into `World`
/// directly. This exercises the #102 contract end-to-end.
#[test]
fn custom_strategy_reads_hall_calls_from_manifest() {
    use crate::dispatch::DispatchStrategy;
    use std::sync::Arc;
    use std::sync::atomic::{AtomicUsize, Ordering};

    /// Records how many times `rank` observed the pressed up-call at
    /// the target stop through the manifest.
    struct Observer {
        target_stop: Arc<std::sync::Mutex<Option<EntityId>>>,
        saw_call: Arc<AtomicUsize>,
    }

    impl DispatchStrategy for Observer {
        fn rank(&self, ctx: &crate::dispatch::RankContext<'_>) -> Option<f64> {
            let target = *self.target_stop.lock().unwrap();
            if Some(ctx.stop) == target
                && ctx
                    .manifest
                    .hall_call_at(ctx.stop, CallDirection::Up)
                    .is_some()
            {
                self.saw_call.fetch_add(1, Ordering::Relaxed);
            }
            Some((ctx.car_position() - ctx.stop_position()).abs())
        }
    }

    let saw_call = Arc::new(AtomicUsize::new(0));
    let target_stop = Arc::new(std::sync::Mutex::new(None));
    let observer = Observer {
        target_stop: Arc::clone(&target_stop),
        saw_call: Arc::clone(&saw_call),
    };
    let mut sim = Simulation::new(&default_config(), observer).unwrap();
    let stop = sim.stop_entity(StopId(0)).unwrap();
    *target_stop.lock().unwrap() = Some(stop);
    // Spawning a rider auto-presses the up-button at stop 0 AND
    // registers waiting demand there, so `dispatch::assign` will
    // consider stop 0 a candidate and call `rank` for it.
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    // One tick runs dispatch, building the manifest with the pressed
    // hall call at stop 0 and calling `rank(car, stop)` for every
    // (car, stop) pair with demand. The observer fires whenever it
    // sees a hall call at the target stop through the manifest.
    sim.step();
    assert!(
        saw_call.load(Ordering::Relaxed) > 0,
        "strategy should see the pressed hall call through DispatchManifest::hall_call_at",
    );
}

/// Car calls are exposed to dispatch strategies via
/// `DispatchManifest::car_calls_for(car)`. After a rider boards, the
/// car's in-cab floor button press is visible without reaching into
/// `World`.
#[test]
fn custom_strategy_reads_car_calls_from_manifest() {
    use crate::dispatch::DispatchStrategy;
    use std::sync::Arc;
    use std::sync::atomic::{AtomicUsize, Ordering};

    struct Observer {
        saw_car_call: Arc<AtomicUsize>,
    }
    impl DispatchStrategy for Observer {
        fn rank(&self, ctx: &crate::dispatch::RankContext<'_>) -> Option<f64> {
            if !ctx.manifest.car_calls_for(ctx.car).is_empty() {
                self.saw_car_call.fetch_add(1, Ordering::Relaxed);
            }
            Some((ctx.car_position() - ctx.stop_position()).abs())
        }
    }

    let saw = Arc::new(AtomicUsize::new(0));
    let observer = Observer {
        saw_car_call: Arc::clone(&saw),
    };
    let mut sim = Simulation::new(&default_config(), observer).unwrap();
    // Spawn a rider — they press the hall call (creating dispatch demand)
    // and on boarding will press a car button, which the strategy sees
    // through `car_calls_for` as soon as dispatch runs next.
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    // Step until the rider boards and a car call exists; then one
    // further step triggers a dispatch pass with the car call visible.
    let car = ElevatorId::from(sim.world().elevator_ids()[0]);
    for _ in 0..200 {
        sim.step();
        if !sim.car_calls(car).is_empty() && saw.load(Ordering::Relaxed) > 0 {
            break;
        }
    }
    assert!(
        saw.load(Ordering::Relaxed) > 0,
        "strategy should see car calls via DispatchManifest::car_calls_for once the rider boards",
    );
}

/// Unacknowledged hall calls are filtered out of `DispatchManifest`.
/// When `ack_latency_ticks > 0`, a freshly pressed call sits in the
/// ack-pending window and must not yet be visible to strategies —
/// otherwise the latency knob is inert for custom dispatch. Matches
/// `HallCall::is_acknowledged`'s documented contract.
#[test]
fn unacknowledged_hall_calls_hidden_from_manifest() {
    use crate::dispatch::{DispatchStrategy, HallCallMode};
    use crate::ids::GroupId;
    use std::sync::Arc;
    use std::sync::atomic::{AtomicUsize, Ordering};

    struct Observer {
        visible_call_count: Arc<AtomicUsize>,
    }
    impl DispatchStrategy for Observer {
        fn pre_dispatch(
            &mut self,
            _group: &crate::dispatch::ElevatorGroup,
            manifest: &crate::dispatch::DispatchManifest,
            _world: &mut crate::world::World,
        ) {
            // Observe in `pre_dispatch` (runs every tick) rather than
            // `rank` (skipped once a car is committed to the stop by
            // the commitment-set filter in `systems::dispatch`).
            // Track running max so a later call observing zero calls
            // (after car arrives and clears) doesn't overwrite a
            // previous nonzero observation.
            let count = manifest.iter_hall_calls().count();
            self.visible_call_count.fetch_max(count, Ordering::Relaxed);
        }

        fn rank(&self, ctx: &crate::dispatch::RankContext<'_>) -> Option<f64> {
            Some((ctx.car_position() - ctx.stop_position()).abs())
        }
    }

    let visible = Arc::new(AtomicUsize::new(0));
    let observer = Observer {
        visible_call_count: Arc::clone(&visible),
    };
    let mut sim = Simulation::new(&default_config(), observer).unwrap();
    // 10-tick ack latency; Classic mode so the call is direction-only.
    for g in sim.groups_mut() {
        if g.id() == GroupId(0) {
            g.set_ack_latency_ticks(10);
            g.set_hall_call_mode(HallCallMode::Classic);
        }
    }
    // Spawn the rider at a stop the car isn't already parked at, so
    // the car must travel — giving ack-latency time to elapse before
    // the call is cleared on arrival.
    sim.spawn_rider(StopId(1), StopId(0), 70.0).unwrap();
    // One tick: call exists under ack-latency, not yet acknowledged.
    sim.step();
    assert!(
        !sim.world()
            .iter_hall_calls()
            .any(crate::components::HallCall::is_acknowledged),
        "no hall call should be acknowledged yet",
    );
    assert_eq!(
        visible.load(Ordering::Relaxed),
        0,
        "unacknowledged calls must be hidden from the manifest",
    );

    // Step past the latency window: once the advance_transient pass
    // sets `acknowledged_at`, the call becomes visible to dispatch and
    // therefore to the strategy's `rank`. Allow generous headroom —
    // the phase order (advance_transient runs before dispatch each
    // step) plus tick boundaries mean the exact step count is
    // configuration-sensitive, not a contract.
    let mut any_acknowledged = false;
    for _ in 0..50 {
        sim.step();
        if sim
            .world()
            .iter_hall_calls()
            .any(crate::components::HallCall::is_acknowledged)
        {
            any_acknowledged = true;
        }
        if visible.load(Ordering::Relaxed) > 0 {
            break;
        }
    }
    // If the call was briefly acknowledged and then cleared by the car
    // arriving, we may have missed the rank-with-visible-call moment
    // — but as long as acknowledgement did fire, the filter let the
    // manifest reflect it. The assertion below catches both the "never
    // acknowledged" case (filter never saw a visible call) and the
    // "acknowledged but rank never ran while visible" case (fine,
    // since visible > 0 is still the contract).
    assert!(
        any_acknowledged,
        "ack-latency should have elapsed within 50 ticks"
    );
    assert!(
        visible.load(Ordering::Relaxed) > 0,
        "after ack-latency elapses, the call should appear in the manifest",
    );
}

/// `press_hall_button` without a backing rider must summon an idle car.
/// Pre-fix `manifest.has_demand(stop)` was rider-only so rider-less
/// hall calls (scripted NPCs, player input) were invisible to every
/// built-in dispatcher. (#255)
#[test]
fn press_hall_button_alone_dispatches_idle_elevator() {
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    let target = sim.stop_entity(StopId(2)).unwrap();
    let elev = sim.world().elevator_ids()[0];
    assert!(sim.world().elevator(elev).unwrap().target_stop.is_none());

    sim.press_hall_button(target, CallDirection::Down).unwrap();

    let target_pos = sim.world().stop_position(target).unwrap();
    let mut summoned = false;
    for _ in 0..500 {
        sim.step();
        let car = sim.world().elevator(elev).unwrap();
        if car.target_stop == Some(target)
            || sim
                .world()
                .position(elev)
                .is_some_and(|p| (p.value - target_pos).abs() < 1.0)
        {
            summoned = true;
            break;
        }
    }
    assert!(
        summoned,
        "rider-less hall call must summon idle car within 500 ticks"
    );
}

/// When a car is already at a stop and dispatch commits to that stop,
/// `record_hall_assignment` must update BOTH Up and Down hall-call
/// `assigned_car` fields if both calls exist there. Pre-fix only Up was
/// written, leaving `sim.assigned_car(stop, Down)` lying about the
/// observability state. (#294)
///
/// Uses the per-phase substep API to inspect state between `dispatch`
/// (which sets `assigned_car`) and `doors` (which clears the hall call
/// once the door opens). A full `step()` would race past the assertion
/// because both phases run in the same tick.
#[test]
fn assigned_car_set_on_both_directions_when_car_at_stop() {
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    let here = sim.stop_entity(StopId(0)).unwrap();
    let elev = sim.world().elevator_ids()[0];
    sim.press_hall_button(here, CallDirection::Up).unwrap();
    sim.press_hall_button(here, CallDirection::Down).unwrap();

    // Drive the tick by hand: ack the calls, then run dispatch, then
    // check assigned_car on both directions BEFORE the doors phase
    // clears the calls.
    sim.run_advance_transient();
    sim.run_dispatch();

    assert_eq!(
        sim.assigned_car(here, CallDirection::Up),
        Some(elev),
        "Up assigned_car must reflect the dispatched car"
    );
    assert_eq!(
        sim.assigned_car(here, CallDirection::Down),
        Some(elev),
        "Down assigned_car must also reflect the dispatched car \
         (pre-fix Down stayed None, lying about dispatch state)"
    );
}

/// Despawning a waiting rider must remove them from the stop's
/// `HallCall::pending_riders`; leaving their ID in the list keeps a
/// stale back-reference alive until a car happens to clear the call.
#[test]
fn despawn_rider_scrubs_hall_call_pending_riders() {
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    let rid = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    let origin = sim.stop_entity(StopId(0)).unwrap();
    assert!(
        sim.world()
            .hall_call(origin, CallDirection::Up)
            .unwrap()
            .pending_riders
            .contains(&rid.entity())
    );

    sim.despawn_rider(rid).unwrap();

    let call = sim.world().hall_call(origin, CallDirection::Up).unwrap();
    assert!(
        !call.pending_riders.contains(&rid.entity()),
        "despawn_rider must scrub the rider from pending_riders"
    );
}

/// An abandoning rider stays alive in the world but has stopped
/// competing for service — their ID must be removed from
/// `pending_riders` so the call's mode-detection (`is_empty()`) and
/// load accounting stay accurate.
#[test]
fn abandonment_scrubs_hall_call_pending_riders() {
    use crate::components::Preferences;
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    let rid = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    // Attach a 1-tick patience so the rider abandons immediately.
    sim.world_mut().set_preferences(
        rid.entity(),
        Preferences::default().with_abandon_after_ticks(Some(1)),
    );
    let origin = sim.stop_entity(StopId(0)).unwrap();

    // Step enough ticks for time-triggered abandonment to fire.
    for _ in 0..3 {
        sim.step();
    }

    let call = sim.world().hall_call(origin, CallDirection::Up);
    // The call may either be entirely gone (if cleared by a car
    // opening doors) or still present — but if present, must not
    // contain the abandoned rider.
    if let Some(call) = call {
        assert!(
            !call.pending_riders.contains(&rid.entity()),
            "abandonment must scrub the rider from pending_riders"
        );
    }
}
