//! Loading simulation config from a RON file.
#![allow(
    clippy::unwrap_used,
    clippy::expect_used,
    clippy::missing_docs_in_private_items
)]

use elevator_core::config::SimConfig;
use elevator_core::dispatch::scan::ScanDispatch;
use elevator_core::prelude::*;
use std::fs;

fn main() {
    let ron_str =
        fs::read_to_string("assets/config/default.ron").expect("failed to read config file");
    let config: SimConfig = ron::from_str(&ron_str).expect("failed to parse config");

    println!("Building: {}", config.building.name);
    println!("Stops: {}", config.building.stops.len());
    println!("Elevators: {}", config.elevators.len());

    let mut sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();

    sim.spawn_rider_by_stop_id(StopId(0), StopId(4), 75.0)
        .unwrap();

    for _ in 0..1000 {
        sim.step();
    }

    println!("Delivered: {}", sim.metrics().total_delivered());
}
