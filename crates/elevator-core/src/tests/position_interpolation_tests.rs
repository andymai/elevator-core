//! Tests for sub-tick position interpolation (`Simulation::position_at`).

use crate::dispatch::scan::ScanDispatch;
use crate::sim::Simulation;
use crate::stop::StopId;
use crate::tests::helpers::default_config;

fn approx_eq(a: f64, b: f64) -> bool {
    (a - b).abs() < 1e-9
}

#[test]
fn position_at_before_first_step_returns_current() {
    let sim = Simulation::new(&default_config(), ScanDispatch::new()).unwrap();
    let elev = sim.world().iter_elevators().next().unwrap().0;
    let current = sim.world().position(elev).unwrap().value();

    assert!(approx_eq(sim.position_at(elev, 0.0).unwrap(), current));
    assert!(approx_eq(sim.position_at(elev, 0.5).unwrap(), current));
    assert!(approx_eq(sim.position_at(elev, 1.0).unwrap(), current));
}

#[test]
fn position_at_interpolates_between_prev_and_current() {
    let mut sim = Simulation::new(&default_config(), ScanDispatch::new()).unwrap();
    let elev = sim.world().iter_elevators().next().unwrap().0;

    sim.spawn_rider(StopId(0), StopId(2), 75.0).unwrap();

    // Run until the elevator is actually moving (non-zero velocity).
    for _ in 0..200 {
        sim.step();
        if sim.velocity(elev).is_some_and(|v| v.abs() > 0.01) {
            break;
        }
    }
    let vel = sim.velocity(elev).expect("velocity");
    assert!(vel.abs() > 0.01, "expected elevator to be moving");

    let prev = sim.world().prev_position(elev).unwrap().value();
    let curr = sim.world().position(elev).unwrap().value();
    assert!(
        (curr - prev).abs() > 0.0,
        "position should have changed across the tick"
    );

    assert!(approx_eq(sim.position_at(elev, 0.0).unwrap(), prev));
    assert!(approx_eq(sim.position_at(elev, 1.0).unwrap(), curr));
    let mid = (curr - prev).mul_add(0.5, prev);
    assert!(approx_eq(sim.position_at(elev, 0.5).unwrap(), mid));
}

#[test]
fn position_at_clamps_alpha_out_of_range() {
    let mut sim = Simulation::new(&default_config(), ScanDispatch::new()).unwrap();
    let elev = sim.world().iter_elevators().next().unwrap().0;

    sim.spawn_rider(StopId(0), StopId(2), 75.0).unwrap();
    for _ in 0..200 {
        sim.step();
        if sim.velocity(elev).is_some_and(|v| v.abs() > 0.01) {
            break;
        }
    }

    let prev = sim.world().prev_position(elev).unwrap().value();
    let curr = sim.world().position(elev).unwrap().value();

    assert!(approx_eq(sim.position_at(elev, -1.0).unwrap(), prev));
    assert!(approx_eq(sim.position_at(elev, 2.0).unwrap(), curr));
    assert!(approx_eq(sim.position_at(elev, f64::NAN).unwrap(), prev));
}

#[test]
fn position_at_returns_none_for_unknown_entity() {
    let sim = Simulation::new(&default_config(), ScanDispatch::new()).unwrap();
    // A stop entity has a position — an arbitrary default EntityId should not.
    let bogus = crate::entity::EntityId::default();
    assert!(sim.position_at(bogus, 0.5).is_none());
    assert!(sim.velocity(bogus).is_none());
}

#[test]
fn velocity_convenience_matches_world_velocity() {
    let mut sim = Simulation::new(&default_config(), ScanDispatch::new()).unwrap();
    let elev = sim.world().iter_elevators().next().unwrap().0;

    sim.spawn_rider(StopId(0), StopId(2), 75.0).unwrap();
    for _ in 0..50 {
        sim.step();
    }

    let world_v = sim.world().velocity(elev).unwrap().value();
    let sim_v = sim.velocity(elev).unwrap();
    assert!(approx_eq(world_v, sim_v));
}

#[test]
fn stationary_elevator_prev_equals_current() {
    let mut sim = Simulation::new(&default_config(), ScanDispatch::new()).unwrap();
    let elev = sim.world().iter_elevators().next().unwrap().0;

    for _ in 0..5 {
        sim.step();
    }

    let prev = sim.world().prev_position(elev).unwrap().value();
    let curr = sim.world().position(elev).unwrap().value();
    assert!(approx_eq(prev, curr));
    assert!(approx_eq(sim.position_at(elev, 0.3).unwrap(), curr));
}
