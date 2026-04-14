//! Space-elevator simulation — the flagship "stops at arbitrary positions"
//! use case.
//!
//! Loads `assets/config/space_elevator.ron`, which defines two stops 1000
//! units apart (Ground Station at 0.0, Orbital Platform at 1000.0) and a
//! "Climber Alpha" with 50.0 u/tick max speed — pushing the trapezoidal
//! motion profile over a shaft ~200× taller than a conventional building.
//!
//! Spawns a handful of riders, steps the simulation until everyone arrives
//! (or we time out), and prints total travel time, wait-time stats, and
//! per-stop resident counts. This demonstrates that the same 8-phase tick
//! loop used for a 3-floor office handles an orbital tether with no
//! special-casing — "stops, not floors" is the whole point.
#![allow(
    clippy::unwrap_used,
    clippy::expect_used,
    clippy::missing_docs_in_private_items
)]

use elevator_core::config::SimConfig;
use elevator_core::dispatch::scan::ScanDispatch;
use elevator_core::prelude::*;
use std::fs;

const CONFIG_PATH: &str = "assets/config/space_elevator.ron";

fn main() {
    let ron_str = fs::read_to_string(CONFIG_PATH)
        .unwrap_or_else(|e| panic!("failed to read {CONFIG_PATH}: {e}"));
    let config: SimConfig = ron::from_str(&ron_str).expect("failed to parse RON config");

    println!("▲ {}", config.building.name);
    println!(
        "  {} stops spanning {:.0} units",
        config.building.stops.len(),
        config
            .building
            .stops
            .iter()
            .map(|s| s.position)
            .fold(f64::NEG_INFINITY, f64::max)
            - config
                .building
                .stops
                .iter()
                .map(|s| s.position)
                .fold(f64::INFINITY, f64::min),
    );
    println!(
        "  {} climber(s), {:.1} ticks/second",
        config.elevators.len(),
        config.simulation.ticks_per_second,
    );
    println!();

    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    // Five riders: three ground-to-orbit, two orbit-to-ground.
    // 80 kg astronauts; the climber's 10 000 kg capacity is more than ample.
    let mut spawned = 0_u64;
    for weight in [70.0, 82.0, 95.0] {
        sim.spawn_rider_by_stop_id(StopId(0), StopId(1), weight)
            .unwrap();
        spawned += 1;
    }
    for weight in [68.0, 74.0] {
        sim.spawn_rider_by_stop_id(StopId(1), StopId(0), weight)
            .unwrap();
        spawned += 1;
    }

    println!("Spawned {spawned} riders. Stepping simulation...\n");

    // Run until everyone is delivered, or fail after 10 000 ticks.
    let max_ticks: u64 = 10_000;
    let mut finish_tick: Option<u64> = None;
    for _ in 0..max_ticks {
        sim.step();
        if sim.metrics().total_delivered() >= spawned {
            finish_tick = Some(sim.current_tick());
            break;
        }
    }

    let m = sim.metrics();
    match finish_tick {
        Some(t) => println!(
            "✓ All {} riders delivered by tick {t}.",
            m.total_delivered()
        ),
        None => println!("⚠ Ran {max_ticks} ticks; not all riders arrived."),
    }
    println!(
        "  wait time      — avg {:.1} ticks, max {} ticks",
        m.avg_wait_time(),
        m.max_wait_time(),
    );
    println!("  ride time      — avg {:.1} ticks", m.avg_ride_time());
    println!("  delivered      — {}", m.total_delivered());
    println!("  abandoned      — {}", m.total_abandoned());
    println!("  total distance — {:.1} units", m.total_distance());
}
