//! Unit tests for additive ergonomics shipped with the `Direction` /
//! `Repositioning` / `EventCategory` refactor:
//!
//! - [`ElevatorPhase::is_moving`] and [`ElevatorPhase::moving_target`]
//! - [`Elevator::direction`] / [`Simulation::elevator_direction`]
//! - [`Event::category`]
//! - [`SimulationBuilder::demo`] (happy path) vs `new` (empty + errors)
//!
//! Keeps these small and focused — the integration paths are exercised
//! elsewhere; this file pins the new accessors so a silent regression in
//! their shape is caught immediately.

use crate::builder::SimulationBuilder;
use crate::components::{Direction, ElevatorPhase};
use crate::entity::EntityId;
use crate::events::{Event, EventCategory};
use crate::stop::StopId;
use ordered_float::OrderedFloat;
use slotmap::KeyData;

fn eid(n: u64) -> EntityId {
    EntityId::from(KeyData::from_ffi(n))
}

// ── ElevatorPhase helpers ────────────────────────────────────────────

#[test]
fn is_moving_covers_both_moving_variants() {
    let stop = eid(1);
    assert!(ElevatorPhase::MovingToStop(stop).is_moving());
    assert!(ElevatorPhase::Repositioning(stop).is_moving());
    assert!(!ElevatorPhase::Idle.is_moving());
    assert!(!ElevatorPhase::DoorOpening.is_moving());
    assert!(!ElevatorPhase::Loading.is_moving());
    assert!(!ElevatorPhase::DoorClosing.is_moving());
    assert!(!ElevatorPhase::Stopped.is_moving());
}

#[test]
fn moving_target_extracts_target_from_both_variants() {
    let stop = eid(42);
    assert_eq!(
        ElevatorPhase::MovingToStop(stop).moving_target(),
        Some(stop)
    );
    assert_eq!(
        ElevatorPhase::Repositioning(stop).moving_target(),
        Some(stop)
    );
    assert_eq!(ElevatorPhase::Idle.moving_target(), None);
    assert_eq!(ElevatorPhase::Stopped.moving_target(), None);
    assert_eq!(ElevatorPhase::DoorOpening.moving_target(), None);
}

// ── Direction + elevator_direction ───────────────────────────────────

#[test]
fn elevator_direction_reflects_lamps() {
    let mut sim = SimulationBuilder::demo().build().unwrap();
    let elev = sim.world().elevator_ids()[0];

    // Fresh demo elevator: both lamps lit → Either.
    assert_eq!(sim.elevator_direction(elev), Some(Direction::Either));

    // Non-elevator returns None.
    let stop = sim.stop_entity(StopId(0)).unwrap();
    assert_eq!(sim.elevator_direction(stop), None);

    // Exercise Up / Down / neither-set arms directly — poking the flags
    // guards against a silent swap or broken match in Elevator::direction.
    let car = sim.world_mut().elevator_mut(elev).unwrap();
    car.going_up = true;
    car.going_down = false;
    assert_eq!(sim.elevator_direction(elev), Some(Direction::Up));

    let car = sim.world_mut().elevator_mut(elev).unwrap();
    car.going_up = false;
    car.going_down = true;
    assert_eq!(sim.elevator_direction(elev), Some(Direction::Down));

    // Neither lamp lit also collapses to Either (see doc on Direction::Either).
    let car = sim.world_mut().elevator_mut(elev).unwrap();
    car.going_up = false;
    car.going_down = false;
    assert_eq!(sim.elevator_direction(elev), Some(Direction::Either));
}

// ── Event::category ──────────────────────────────────────────────────

#[test]
fn event_category_classifies_representative_variants() {
    let e = eid(1);
    // One representative per category to ensure the classifier covers each.
    assert_eq!(
        Event::ElevatorArrived {
            elevator: e,
            at_stop: e,
            tick: 0
        }
        .category(),
        EventCategory::Elevator,
    );
    assert_eq!(
        Event::RiderBoarded {
            rider: e,
            elevator: e,
            tick: 0
        }
        .category(),
        EventCategory::Rider,
    );
    assert_eq!(
        Event::ElevatorAssigned {
            elevator: e,
            stop: e,
            tick: 0
        }
        .category(),
        EventCategory::Dispatch,
    );
    assert_eq!(
        Event::ElevatorAdded {
            elevator: e,
            line: e,
            group: crate::ids::GroupId(0),
            tick: 0
        }
        .category(),
        EventCategory::Topology,
    );
    assert_eq!(
        Event::ElevatorRepositioning {
            elevator: e,
            to_stop: e,
            tick: 0
        }
        .category(),
        EventCategory::Reposition,
    );
    assert_eq!(
        Event::DirectionIndicatorChanged {
            elevator: e,
            going_up: true,
            going_down: false,
            tick: 0
        }
        .category(),
        EventCategory::Direction,
    );
    assert_eq!(
        Event::CapacityChanged {
            elevator: e,
            current_load: OrderedFloat(0.0),
            capacity: OrderedFloat(800.0),
            tick: 0
        }
        .category(),
        EventCategory::Observability,
    );
}

// ── Builder: new() vs demo() ─────────────────────────────────────────

#[test]
fn new_is_empty_and_demo_is_prebuilt() {
    // new() cannot build without stops/elevators.
    assert!(SimulationBuilder::new().build().is_err());
    // demo() builds cleanly with the default 2 stops + 1 elevator.
    let sim = SimulationBuilder::demo().build().unwrap();
    assert_eq!(sim.current_tick(), 0);
    assert_eq!(sim.world().elevator_ids().len(), 1);
    assert!(sim.stop_entity(StopId(0)).is_some());
    assert!(sim.stop_entity(StopId(1)).is_some());
}
