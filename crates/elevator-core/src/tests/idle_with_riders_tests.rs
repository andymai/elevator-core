//! Regression tests: elevators must never go idle with riders aboard.
//!
//! Root cause: `pending_stops_minus_covered` filters out a stop when
//! another car in a door-cycle or `MovingToStop` phase targets it —
//! but "covered" only checks *waiting* demand. If the stop's sole
//! demand comes from aboard riders (`riding_to_stop`) needing to exit
//! there, the filter erroneously removes it from the candidate set.
//! With no pending stops, `fallback()` returns `Idle`, stranding
//! passengers.

use crate::components::{ElevatorPhase, RiderPhase};
use crate::dispatch::etd::EtdDispatch;
use crate::sim::Simulation;
use crate::stop::StopId;

use super::helpers::{default_config, multi_floor_config};

/// Assert no elevator in the sim is idle with riders aboard.
fn assert_no_idle_with_riders(sim: &Simulation, tick: u64) {
    for (eid, _pos, car) in sim.world().iter_elevators() {
        assert!(
            car.phase() != ElevatorPhase::Idle || car.riders().is_empty(),
            "BUG: car {eid:?} went Idle with {} riders aboard at tick {tick}",
            car.riders().len()
        );
    }
}

/// Two cars, both with riders heading to the same destination. When one
/// car is en route (`MovingToStop`), the other car (just finished
/// loading, now `Stopped`) must NOT go idle — its aboard riders still
/// need delivery.
#[test]
fn stopped_car_with_riders_not_idled_when_destination_covered() {
    let cfg = multi_floor_config(3, 2);
    let mut sim = Simulation::new(&cfg, EtdDispatch::new()).unwrap();

    // Spawn two riders at stop 0 heading to stop 2.
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    let max_setup = 500;
    for tick in 0..max_setup {
        sim.step();
        sim.drain_events();
        // Check if both riders have been delivered (fast path — no bug).
        let all_arrived = sim
            .world()
            .iter_riders()
            .all(|(_, r)| r.phase == RiderPhase::Arrived);
        if all_arrived {
            return;
        }
        assert_no_idle_with_riders(&sim, tick);
    }
    panic!("riders not delivered within {max_setup} ticks");
}

/// Single car: after picking up a rider and closing doors, the car
/// must not go idle — it should proceed to the rider's destination.
/// This tests the eligibility path independent of `is_covered`.
#[test]
fn single_car_with_rider_not_idled_after_doors_close() {
    let cfg = default_config();
    let mut sim = Simulation::new(&cfg, EtdDispatch::new()).unwrap();

    // Spawn a rider at stop 0 heading to stop 2.
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    for tick in 0..2000 {
        sim.step();
        sim.drain_events();
        assert_no_idle_with_riders(&sim, tick);
        let all_arrived = sim
            .world()
            .iter_riders()
            .all(|(_, r)| r.phase == RiderPhase::Arrived);
        if all_arrived {
            return;
        }
    }
    panic!("rider never arrived within 2000 ticks");
}

/// Convention-center-like scenario: burst of riders from one floor
/// to another, multiple cars. No car should ever idle with riders.
#[test]
fn burst_scenario_no_idle_with_riders() {
    let cfg = multi_floor_config(5, 4);
    let mut sim = Simulation::new(&cfg, EtdDispatch::new()).unwrap();

    // Burst: 20 riders from stop 4 to stop 0.
    for _ in 0..20 {
        sim.spawn_rider(StopId(4), StopId(0), 75.0).unwrap();
    }

    for tick in 0..10_000 {
        sim.step();
        sim.drain_events();
        assert_no_idle_with_riders(&sim, tick);
        let all_arrived = sim
            .world()
            .iter_riders()
            .all(|(_, r)| matches!(r.phase, RiderPhase::Arrived | RiderPhase::Abandoned));
        if all_arrived {
            return;
        }
    }
    panic!("not all riders delivered within 10000 ticks");
}
