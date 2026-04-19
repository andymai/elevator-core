//! Regression test for the "all cars converge on one rider" bug.
//!
//! Before the fix: when a car arrived at a pickup stop, its phase
//! transitioned to `DoorOpening` (out of the dispatch pool). The rider
//! hadn't yet boarded — riders only transition `Waiting → Boarding`
//! in the Loading phase, one tick later — so
//! `DispatchManifest::has_demand` still flagged the stop as pending
//! and the next dispatch tick pulled a second car toward the same
//! call. With three cars and one rider, the visible result in the
//! playground was two or three cars converging on a single rider.
//!
//! The fix filters `pending_stops` inside `dispatch::assign` so a
//! stop is excluded when an elevator is already at it in any door
//! phase AND can absorb every waiting rider there. This test locks
//! in that invariant under the skyscraper-like setup (3 cars on a
//! 13-stop shaft with ETD) that surfaced the bug.

#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use elevator_core::dispatch::{BuiltinReposition, EtdDispatch};
use elevator_core::prelude::*;

fn three_car_sim() -> Simulation {
    let stops: Vec<StopConfig> = (0..13)
        .map(|i| StopConfig {
            id: StopId(i),
            name: format!("Floor {i}"),
            position: f64::from(i) * 4.0,
        })
        .collect();
    let elevators: Vec<ElevatorConfig> = [0u32, 6, 12]
        .iter()
        .enumerate()
        .map(|(idx, &start)| ElevatorConfig {
            id: u32::try_from(idx).unwrap(),
            name: format!("Car {}", char::from(b'A' + u8::try_from(idx).unwrap())),
            max_speed: Speed::from(4.0),
            acceleration: Accel::from(2.0),
            deceleration: Accel::from(2.5),
            weight_capacity: Weight::from(1200.0),
            starting_stop: StopId(start),
            door_open_ticks: 300,
            door_transition_ticks: 72,
            restricted_stops: Vec::new(),
            #[cfg(feature = "energy")]
            energy_profile: None,
            service_mode: None,
            inspection_speed_factor: 0.25,
            bypass_load_up_pct: None,
            bypass_load_down_pct: None,
        })
        .collect();
    let mut sim = SimulationBuilder::new()
        .stops(stops)
        .elevators(elevators)
        .dispatch(EtdDispatch::new())
        .reposition(
            elevator_core::dispatch::reposition::SpreadEvenly,
            BuiltinReposition::SpreadEvenly,
        )
        .build()
        .unwrap();
    // Warm up so SpreadEvenly has a tick to settle any starting-position drift.
    for _ in 0..60 {
        sim.step();
    }
    sim
}

/// Count how many cars have `target_stop == expected_stop` right now.
fn cars_targeting(sim: &Simulation, expected_stop: StopId) -> usize {
    let expected_eid = sim.stop_entity(expected_stop).unwrap();
    sim.world()
        .iter_elevators()
        .filter(|(_, _, car)| car.target_stop() == Some(expected_eid))
        .count()
}

#[test]
fn single_rider_pulls_exactly_one_car_across_many_ticks() {
    let mut sim = three_car_sim();
    sim.spawn_rider(StopId(5), StopId(10), 70.0).unwrap();

    let mut max_concurrent = 0usize;
    for _ in 0..1000 {
        sim.step();
        let c = cars_targeting(&sim, StopId(5));
        if c > max_concurrent {
            max_concurrent = c;
        }
        let delivered = sim
            .world()
            .iter_riders()
            .all(|(_, r)| r.phase() == RiderPhase::Arrived);
        if delivered {
            break;
        }
    }

    assert!(
        max_concurrent <= 1,
        "at most one car should ever target the single-rider pickup stop at the same time; saw {max_concurrent}"
    );
}
