//! Tests for the public braking-distance helpers.

use crate::components::ElevatorPhase;
use crate::movement::braking_distance;
use crate::sim::Simulation;
use crate::stop::StopId;

use super::helpers::{default_config, scan};

/// Grab the first elevator in a sim.
fn first_elevator(sim: &Simulation) -> crate::entity::EntityId {
    sim.world().elevator_ids()[0]
}

#[test]
fn braking_distance_zero_velocity_is_zero() {
    assert_eq!(braking_distance(0.0, 2.0), 0.0);
}

#[test]
fn braking_distance_formula() {
    // v=4, a=2 → 16 / 4 = 4.0
    assert!((braking_distance(4.0, 2.0) - 4.0).abs() < 1e-12);
    // Sign-agnostic (magnitude only)
    assert!((braking_distance(-4.0, 2.0) - 4.0).abs() < 1e-12);
}

#[test]
fn braking_distance_rejects_nonpositive_deceleration() {
    // Defensive: deceleration <= 0 returns 0 rather than dividing by zero
    // or returning a negative distance.
    assert_eq!(braking_distance(10.0, 0.0), 0.0);
    assert_eq!(braking_distance(10.0, -2.0), 0.0);
}

#[test]
fn sim_braking_distance_stationary_elevator_is_zero() {
    let sim = Simulation::new(&default_config(), scan()).unwrap();
    let elev = first_elevator(&sim);
    assert_eq!(sim.braking_distance(elev), Some(0.0));
}

#[test]
fn sim_braking_distance_nonzero_while_moving() {
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    // Step until the elevator has picked up speed.
    let elev = first_elevator(&sim);
    for _ in 0..500 {
        sim.step();
        let is_moving = sim
            .world()
            .elevator(elev)
            .is_some_and(|c| matches!(c.phase(), ElevatorPhase::MovingToStop(_)));
        let vel = sim.world().velocity(elev).map_or(0.0, |v| v.value);
        if is_moving && vel.abs() > 0.5 {
            break;
        }
    }

    let d = sim.braking_distance(elev).expect("is an elevator");
    assert!(d > 0.0, "expected nonzero braking distance while moving");
}

#[test]
fn sim_future_stop_position_stationary_equals_current() {
    let sim = Simulation::new(&default_config(), scan()).unwrap();
    let elev = first_elevator(&sim);
    let pos = sim.world().position(elev).unwrap().value;
    assert_eq!(sim.future_stop_position(elev), Some(pos));
}

#[test]
fn sim_future_stop_position_ahead_while_moving_up() {
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    let elev = first_elevator(&sim);
    for _ in 0..500 {
        sim.step();
        let vel = sim.world().velocity(elev).map_or(0.0, |v| v.value);
        if vel > 0.5 {
            break;
        }
    }

    let pos = sim.world().position(elev).unwrap().value;
    let future = sim.future_stop_position(elev).unwrap();
    assert!(
        future > pos,
        "future stop position {future} should be above current {pos} while moving up",
    );
}

#[test]
fn sim_braking_distance_none_for_non_elevator() {
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    let rider = sim.spawn_rider(StopId(0), StopId(1), 70.0).unwrap();
    assert_eq!(sim.braking_distance(rider), None);
    assert_eq!(sim.future_stop_position(rider), None);
}
