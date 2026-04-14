//! First-person "player rides the elevator" pattern.
//!
//! Demonstrates how a renderer running at a higher framerate than the sim
//! can produce smooth elevator motion by interpolating between the previous
//! and current tick's position via
//! [`Simulation::position_at`](elevator_core::sim::Simulation::position_at).
//!
//! The loop below fakes a 4× render rate: for every sim tick we sample
//! `position_at` at `alpha = 0.0, 0.25, 0.5, 0.75, 1.0` — the `0.0` and
//! `1.0` samples bracket the tick, and the intermediates are what a camera
//! parented to the elevator car would use between fixed-timestep updates.
//!
//! Run with:
//!
//! ```text
//! cargo run -p elevator-core --example fp_player_rider --release
//! ```
#![allow(clippy::unwrap_used, clippy::missing_docs_in_private_items)]

use elevator_core::prelude::*;

fn main() {
    let mut sim = SimulationBuilder::demo().build().unwrap();
    let elev = sim.world().iter_elevators().next().unwrap().0;

    // Give the car something to do.
    sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 75.0)
        .unwrap();

    println!("tick  alpha=0.00  alpha=0.50  alpha=1.00   vel");
    println!("----  ----------  ----------  ----------  -----");

    for _ in 0..60 {
        sim.step();
        let p0 = sim.position_at(elev, 0.0).unwrap();
        let p_mid = sim.position_at(elev, 0.5).unwrap();
        let p1 = sim.position_at(elev, 1.0).unwrap();
        let v = sim.velocity(elev).unwrap_or(0.0);

        println!(
            "{:>4}   {:>8.3}m   {:>8.3}m   {:>8.3}m  {:>5.2}",
            sim.current_tick(),
            p0,
            p_mid,
            p1,
            v,
        );
    }
}
