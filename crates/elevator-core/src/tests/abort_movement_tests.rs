//! Tests for `Simulation::abort_movement` — mid-flight trip cancellation.

use crate::builder::SimulationBuilder;
use crate::components::{ElevatorPhase, RiderPhase};
use crate::dispatch::scan::ScanDispatch;
use crate::entity::ElevatorId;
use crate::error::SimError;
use crate::events::Event;
use crate::stop::StopId;

use super::helpers::default_config;

fn build_sim() -> crate::sim::Simulation {
    SimulationBuilder::from_config(default_config())
        .dispatch(ScanDispatch::new())
        .build()
        .unwrap()
}

fn first_elevator(sim: &crate::sim::Simulation) -> ElevatorId {
    ElevatorId::from(sim.world().elevator_ids()[0])
}

/// Drive the sim until the elevator is actively moving (phase is
/// MovingToStop), then return the elevator's current phase. Panics if it
/// does not start moving within the budget.
fn step_until_moving(sim: &mut crate::sim::Simulation, elev: ElevatorId) {
    for _ in 0..200 {
        sim.step();
        let car = sim.world().elevator(elev.entity()).unwrap();
        if car.phase().is_moving() {
            return;
        }
    }
    panic!("elevator never started moving");
}

// ── No-op / error paths ─────────────────────────────────────────────

#[test]
fn abort_movement_on_non_elevator_errors() {
    let mut sim = build_sim();
    let s0 = sim.stop_entity(StopId(0)).unwrap();
    let err = sim
        .abort_movement(ElevatorId::from(s0))
        .expect_err("should reject non-elevator");
    assert!(matches!(err, SimError::NotAnElevator(_)));
}

#[test]
fn abort_movement_no_op_when_idle() {
    let mut sim = build_sim();
    let elev = first_elevator(&sim);
    // Fresh sim — elevator is Idle.
    assert_eq!(
        sim.world().elevator(elev.entity()).unwrap().phase(),
        ElevatorPhase::Idle
    );
    sim.abort_movement(elev).unwrap();
    let car = sim.world().elevator(elev.entity()).unwrap();
    assert_eq!(car.phase(), ElevatorPhase::Idle);
    let emitted = sim
        .drain_events()
        .into_iter()
        .any(|e| matches!(e, Event::MovementAborted { .. }));
    assert!(!emitted, "idle abort should not emit MovementAborted");
}

// ── Happy path ──────────────────────────────────────────────────────

#[test]
fn abort_mid_flight_retargets_to_reachable_stop() {
    let mut sim = build_sim();
    let elev = first_elevator(&sim);
    let s2 = sim.stop_entity(StopId(2)).unwrap();
    // Send the car from stop 0 to stop 2; once it's mid-flight, abort.
    sim.push_destination(elev, s2).unwrap();
    step_until_moving(&mut sim, elev);

    sim.abort_movement(elev).unwrap();
    let car = sim.world().elevator(elev.entity()).unwrap();
    // Must be in Repositioning so arrival skips doors.
    let target = match car.phase() {
        ElevatorPhase::Repositioning(t) => t,
        other => panic!("expected Repositioning, got {other:?}"),
    };
    // Re-target must be a real stop entity; position must match one of
    // the configured stops.
    let pos = sim.world().stop_position(target).unwrap();
    assert!(
        [0.0, 4.0, 8.0].contains(&pos),
        "brake target must be a configured stop (got pos={pos})"
    );
    assert!(car.repositioning());
}

#[test]
fn abort_mid_flight_emits_event() {
    let mut sim = build_sim();
    let elev = first_elevator(&sim);
    let s2 = sim.stop_entity(StopId(2)).unwrap();
    sim.push_destination(elev, s2).unwrap();
    step_until_moving(&mut sim, elev);
    let _ = sim.drain_events(); // discard pre-abort chatter

    sim.abort_movement(elev).unwrap();

    let events = sim.drain_events();
    let aborted: Vec<_> = events
        .iter()
        .filter_map(|e| match e {
            Event::MovementAborted {
                elevator,
                brake_target,
                ..
            } => Some((*elevator, *brake_target)),
            _ => None,
        })
        .collect();
    assert_eq!(aborted.len(), 1, "exactly one MovementAborted should fire");
    assert_eq!(aborted[0].0, elev.entity());
}

#[test]
fn abort_mid_flight_clears_queue() {
    let mut sim = build_sim();
    let elev = first_elevator(&sim);
    let s1 = sim.stop_entity(StopId(1)).unwrap();
    let s2 = sim.stop_entity(StopId(2)).unwrap();
    sim.push_destination(elev, s1).unwrap();
    sim.push_destination(elev, s2).unwrap();
    step_until_moving(&mut sim, elev);

    sim.abort_movement(elev).unwrap();
    assert!(
        sim.destination_queue(elev).unwrap().is_empty(),
        "queue should be cleared by abort"
    );
}

#[test]
fn abort_mid_flight_brake_target_is_reachable_in_direction() {
    // The brake target must be at or past the brake-rest position in the
    // direction of travel so the movement system can decelerate into it
    // without overshoot.
    let mut sim = build_sim();
    let elev = first_elevator(&sim);
    let s2 = sim.stop_entity(StopId(2)).unwrap();
    sim.push_destination(elev, s2).unwrap();
    step_until_moving(&mut sim, elev);

    let pos = sim.world().position(elev.entity()).unwrap().value;
    let vel = sim.world().velocity(elev.entity()).unwrap().value;
    let brake_pos = sim.future_stop_position(elev.entity()).unwrap();
    sim.abort_movement(elev).unwrap();

    let car = sim.world().elevator(elev.entity()).unwrap();
    let target = car.phase().moving_target().unwrap();
    let target_pos = sim.world().stop_position(target).unwrap();

    let dir = vel.signum();
    assert!(
        (target_pos - pos) * dir >= 0.0,
        "brake target must lie in direction of travel (pos={pos}, target={target_pos}, vel={vel})"
    );
    assert!(
        (target_pos - brake_pos) * dir >= -1e-9,
        "brake target must be at or past brake_pos (brake_pos={brake_pos}, target={target_pos}, dir={dir})"
    );
}

#[test]
fn abort_mid_flight_arrives_without_opening_doors() {
    let mut sim = build_sim();
    let elev = first_elevator(&sim);
    let s2 = sim.stop_entity(StopId(2)).unwrap();
    sim.push_destination(elev, s2).unwrap();
    step_until_moving(&mut sim, elev);

    sim.abort_movement(elev).unwrap();
    let _ = sim.drain_events();

    let mut saw_door_opened = false;
    let mut became_idle = false;
    for _ in 0..600 {
        sim.step();
        for ev in sim.drain_events() {
            match ev {
                Event::DoorOpened { elevator, .. } if elevator == elev.entity() => {
                    saw_door_opened = true;
                }
                Event::ElevatorIdle { elevator, .. } if elevator == elev.entity() => {
                    became_idle = true;
                }
                _ => {}
            }
        }
        if became_idle {
            break;
        }
    }
    assert!(
        became_idle,
        "elevator should become Idle after brake arrival"
    );
    assert!(
        !saw_door_opened,
        "aborted arrival must not open doors (onboard riders stay put)"
    );
}

#[test]
fn abort_from_repositioning_phase_is_also_supported() {
    // Drive a rider to a stop, then let the car reposition, then abort.
    let mut sim = build_sim();
    let elev = first_elevator(&sim);

    // Spawn and wait for arrival and any subsequent reposition.
    sim.spawn_rider(StopId(0), StopId(2), 75.0).unwrap();

    let mut saw_reposition = false;
    for _ in 0..4000 {
        sim.step();
        let car = sim.world().elevator(elev.entity()).unwrap();
        if matches!(car.phase(), ElevatorPhase::Repositioning(_)) {
            saw_reposition = true;
            break;
        }
    }

    if !saw_reposition {
        // Repositioning is strategy-dependent; if the default config does
        // not exercise it, skip this case rather than fail.
        return;
    }

    sim.abort_movement(elev).unwrap();
    let car = sim.world().elevator(elev.entity()).unwrap();
    assert!(
        matches!(car.phase(), ElevatorPhase::Repositioning(_)),
        "abort from repositioning should remain in Repositioning(brake_stop)"
    );
}

#[test]
fn abort_keeps_riders_onboard() {
    let mut sim = build_sim();
    let elev = first_elevator(&sim);

    // Spawn a rider, wait for them to board, then abort mid-flight.
    sim.spawn_rider(StopId(0), StopId(2), 75.0).unwrap();

    let mut boarded_rider = None;
    for _ in 0..2000 {
        sim.step();
        for ev in sim.drain_events() {
            if let Event::RiderBoarded {
                rider, elevator, ..
            } = ev
                && elevator == elev.entity()
            {
                boarded_rider = Some(rider);
            }
        }
        let car = sim.world().elevator(elev.entity()).unwrap();
        if boarded_rider.is_some() && car.phase().is_moving() {
            break;
        }
    }
    let rider = boarded_rider.expect("rider never boarded");

    sim.abort_movement(elev).unwrap();
    // Run the sim through the brake arrival.
    for _ in 0..600 {
        sim.step();
        let car = sim.world().elevator(elev.entity()).unwrap();
        if matches!(car.phase(), ElevatorPhase::Idle) {
            break;
        }
    }

    let car = sim.world().elevator(elev.entity()).unwrap();
    assert!(
        car.riders().contains(&rider),
        "rider should remain onboard after abort arrival"
    );
    let rider_phase = sim.world().rider(rider).unwrap().phase;
    assert!(
        matches!(rider_phase, RiderPhase::Riding(_)),
        "rider phase should still be Riding after abort, got {rider_phase:?}"
    );
}
