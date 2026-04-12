//! Basic elevator simulation: spawn riders and run to completion.
#![allow(clippy::unwrap_used, clippy::missing_docs_in_private_items)]

use elevator_sim_core::prelude::*;

fn main() {
    let mut sim = SimulationBuilder::new()
        .stop(StopId(0), "Ground", 0.0)
        .stop(StopId(1), "Floor 2", 4.0)
        .stop(StopId(2), "Floor 3", 8.0)
        .build()
        .unwrap();

    // Spawn 3 riders going up.
    for i in 0..3 {
        sim.spawn_rider_by_stop_id(StopId(0), StopId(2), f64::from(i).mul_add(5.0, 70.0))
            .unwrap();
    }

    // Run until all arrive.
    for tick in 0..2000 {
        sim.step();

        let all_arrived = sim
            .world()
            .iter_riders()
            .all(|(_, r)| r.phase == RiderPhase::Arrived);

        if all_arrived {
            println!("All riders arrived at tick {tick}!");
            break;
        }
    }

    let m = sim.metrics();
    println!("Delivered: {}", m.total_delivered());
    println!("Avg wait: {:.1} ticks", m.avg_wait_time());
    println!("Avg ride: {:.1} ticks", m.avg_ride_time());
}
