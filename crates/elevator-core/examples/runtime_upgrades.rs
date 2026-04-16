//! Runtime elevator upgrades — change `max_speed` mid-simulation and
//! compare throughput before vs. after.
//!
//! This example spawns the same steady stream of riders in two separate
//! simulations. The first runs at baseline speed for the entire run; the
//! second doubles the car's `max_speed` partway through. Printing the
//! delivery counts / average wait times side by side shows the effect
//! the runtime upgrade has on throughput.
//!
//! Run with:
//!
//! ```text
//! cargo run -p elevator-core --example runtime_upgrades --release
//! ```
#![allow(clippy::unwrap_used, clippy::missing_docs_in_private_items)]

use elevator_core::prelude::*;
use elevator_core::stop::StopConfig;

const TOTAL_TICKS: u64 = 6_000;
const UPGRADE_AT: u64 = 3_000;
const SPAWN_EVERY: u64 = 40;

fn make_sim() -> Simulation {
    SimulationBuilder::demo()
        .stops(vec![
            StopConfig {
                id: StopId(0),
                name: "Ground".into(),
                position: 0.0,
            },
            StopConfig {
                id: StopId(1),
                name: "Floor 5".into(),
                position: 16.0,
            },
            StopConfig {
                id: StopId(2),
                name: "Floor 10".into(),
                position: 32.0,
            },
        ])
        .build()
        .unwrap()
}

fn spawn_wave(sim: &mut Simulation, tick: u64) {
    if !tick.is_multiple_of(SPAWN_EVERY) {
        return;
    }
    // Alternate origins/destinations to exercise the whole shaft.
    let (o, d) = if (tick / SPAWN_EVERY).is_multiple_of(2) {
        (StopId(0), StopId(2))
    } else {
        (StopId(2), StopId(0))
    };
    let _ = sim.spawn_rider(o, d, 75.0);
}

fn run_baseline() -> (u64, f64) {
    let mut sim = make_sim();
    for tick in 0..TOTAL_TICKS {
        spawn_wave(&mut sim, tick);
        sim.step();
    }
    (
        sim.metrics().total_delivered(),
        sim.metrics().avg_wait_time(),
    )
}

fn run_upgraded() -> (u64, f64) {
    let mut sim = make_sim();
    let elev = ElevatorId::from(sim.world().iter_elevators().next().unwrap().0);
    let baseline_speed = sim
        .world()
        .elevator(elev.entity())
        .unwrap()
        .max_speed()
        .value();

    for tick in 0..TOTAL_TICKS {
        spawn_wave(&mut sim, tick);
        if tick == UPGRADE_AT {
            // Double the car's top speed — e.g. the player bought a
            // "VelociGear" upgrade.
            sim.set_max_speed(elev, baseline_speed * 2.0).unwrap();
        }
        sim.step();
    }
    (
        sim.metrics().total_delivered(),
        sim.metrics().avg_wait_time(),
    )
}

fn main() {
    let (base_delivered, base_wait) = run_baseline();
    let (up_delivered, up_wait) = run_upgraded();

    println!("==== runtime_upgrades demo ====");
    println!("Total ticks: {TOTAL_TICKS}, upgrade applied at tick {UPGRADE_AT}");
    println!();
    println!("           delivered   avg wait");
    println!("baseline   {base_delivered:>9}   {base_wait:>7.1}");
    println!("upgraded   {up_delivered:>9}   {up_wait:>7.1}");
    println!();
    let delta =
        i64::try_from(up_delivered).unwrap_or(0) - i64::try_from(base_delivered).unwrap_or(0);
    println!("Delivered delta: {delta:+}");
    let wait_delta = up_wait - base_wait;
    println!("Avg-wait delta:  {wait_delta:+.1} ticks");
}
