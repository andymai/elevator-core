//! End-to-end integration tests for elevator-core.

#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use elevator_core::prelude::*;

#[test]
fn riders_arrive_at_destination() {
    let mut sim = SimulationBuilder::new().build().unwrap();

    // Spawn 5 riders going from ground to top.
    for _ in 0..5 {
        sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 70.0)
            .unwrap();
    }

    // Step until all riders arrive or timeout.
    for _ in 0..2000 {
        sim.step();
        let all_arrived = sim
            .world()
            .iter_riders()
            .all(|(_, r)| r.phase() == RiderPhase::Arrived);
        if all_arrived {
            break;
        }
    }

    let all_arrived = sim
        .world()
        .iter_riders()
        .all(|(_, r)| r.phase() == RiderPhase::Arrived);
    assert!(all_arrived, "all riders should arrive within 2000 ticks");
    assert_eq!(sim.metrics().total_delivered(), 5);
}
