//! Fuzz target: interpret bytes as a sequence of simulation commands.
//!
//! Uses a fixed valid config and interprets fuzzer-provided bytes as
//! operations (spawn rider, step, disable entity, etc.). Validates
//! no panics under arbitrary operation sequences.

#![no_main]

use elevator_sim_core::config::{
    BuildingConfig, ElevatorConfig, PassengerSpawnConfig, SimConfig, SimulationParams,
};
use elevator_sim_core::dispatch::scan::ScanDispatch;
use elevator_sim_core::sim::Simulation;
use elevator_sim_core::stop::{StopConfig, StopId};
use libfuzzer_sys::fuzz_target;

const NUM_STOPS: u32 = 5;

fn make_sim() -> Simulation {
    let stops: Vec<StopConfig> = (0..NUM_STOPS)
        .map(|i| StopConfig {
            id: StopId(i),
            name: format!("S{i}"),
            position: f64::from(i) * 5.0,
        })
        .collect();

    let config = SimConfig {
        building: BuildingConfig {
            name: "Fuzz".into(),
            stops,
        },
        elevators: vec![
            ElevatorConfig {
                id: 0,
                name: "E0".into(),
                max_speed: 2.0,
                acceleration: 1.0,
                deceleration: 1.0,
                weight_capacity: 800.0,
                starting_stop: StopId(0),
                door_open_ticks: 5,
                door_transition_ticks: 3,
            },
            ElevatorConfig {
                id: 1,
                name: "E1".into(),
                max_speed: 3.0,
                acceleration: 1.5,
                deceleration: 2.0,
                weight_capacity: 1000.0,
                starting_stop: StopId(2),
                door_open_ticks: 5,
                door_transition_ticks: 3,
            },
        ],
        simulation: SimulationParams {
            ticks_per_second: 60.0,
        },
        passenger_spawning: PassengerSpawnConfig {
            mean_interval_ticks: 60,
            weight_range: (50.0, 100.0),
        },
    };

    Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap()
}

fuzz_target!(|data: &[u8]| {
    let mut sim = make_sim();
    let mut spawned_riders = Vec::new();

    let mut i = 0;
    while i < data.len() {
        let op = data[i];
        i += 1;

        match op % 5 {
            // Step simulation
            0 => {
                let ticks = data.get(i).copied().unwrap_or(1).max(1) as u32;
                i += 1;
                for _ in 0..ticks.min(50) {
                    sim.step();
                }
            }
            // Spawn rider
            1 => {
                let origin = data.get(i).copied().unwrap_or(0) as u32 % NUM_STOPS;
                let dest_raw = data.get(i + 1).copied().unwrap_or(1) as u32 % NUM_STOPS;
                let dest = if dest_raw == origin {
                    (origin + 1) % NUM_STOPS
                } else {
                    dest_raw
                };
                i += 2;
                if let Ok(eid) = sim.spawn_rider_by_stop_id(
                    StopId(origin),
                    StopId(dest),
                    75.0,
                ) {
                    spawned_riders.push(eid);
                }
            }
            // Disable entity
            2 => {
                if let Some(&eid) = spawned_riders.last() {
                    let _ = sim.disable(eid);
                }
                // skip a byte
                i += 1;
            }
            // Enable entity
            3 => {
                if let Some(&eid) = spawned_riders.last() {
                    let _ = sim.enable(eid);
                }
                i += 1;
            }
            // Drain events
            _ => {
                let _ = sim.drain_events();
            }
        }
    }
});
