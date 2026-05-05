//! Smoke scenario: a handful of riders must reach their destination.
//!
//! The oldest integration test in the crate — preserved as the canonical
//! "does the sim step forward and deliver anyone at all?" check. Other
//! scenario files assume this passes.

#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use elevator_core::config::{
    BuildingConfig, ElevatorConfig, PassengerSpawnConfig, SimConfig, SimulationParams,
};
use elevator_core::dispatch::ScanDispatch;
use elevator_core::scenario::{Condition, Scenario, TimedSpawn};
use elevator_core::stop::{StopConfig, StopId};

#[path = "common/mod.rs"]
mod common;

fn basic_config() -> SimConfig {
    SimConfig {
        schema_version: elevator_core::config::CURRENT_CONFIG_SCHEMA_VERSION,
        building: BuildingConfig {
            name: "Basic".into(),
            stops: vec![
                StopConfig {
                    id: StopId(0),
                    name: "Ground".into(),
                    position: 0.0,
                },
                StopConfig {
                    id: StopId(1),
                    name: "Top".into(),
                    position: 10.0,
                },
            ],
            lines: None,
            groups: None,
        },
        elevators: vec![ElevatorConfig {
            starting_stop: StopId(0),
            ..ElevatorConfig::default()
        }],
        simulation: SimulationParams::default(),
        passenger_spawning: PassengerSpawnConfig::default(),
    }
}

scenario_test!(
    five_riders_arrive_within_budget,
    Scenario {
        name: "Five riders arrive".into(),
        config: basic_config(),
        spawns: (0..5)
            .map(|_| TimedSpawn {
                tick: 0,
                origin: StopId(0),
                destination: StopId(1),
                weight: 70.0,
            })
            .collect(),
        conditions: vec![Condition::AllDeliveredByTick(2000)],
        max_ticks: 2000,
    },
    ScanDispatch::new(),
);
