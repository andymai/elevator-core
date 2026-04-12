//! Running a deterministic scenario with pass/fail conditions.
#![allow(clippy::unwrap_used, clippy::missing_docs_in_private_items)]

use elevator_sim_core::config::{
    BuildingConfig, ElevatorConfig, PassengerSpawnConfig, SimConfig, SimulationParams,
};
use elevator_sim_core::dispatch::scan::ScanDispatch;
use elevator_sim_core::scenario::{Condition, Scenario, ScenarioRunner, TimedSpawn};
use elevator_sim_core::stop::{StopConfig, StopId};

fn main() {
    let scenario = Scenario {
        name: "Basic up-peak".into(),
        config: SimConfig {
            building: BuildingConfig {
                name: "Test Building".into(),
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
            },
            elevators: vec![ElevatorConfig {
                id: 0,
                name: "E1".into(),
                max_speed: 2.0,
                acceleration: 1.5,
                deceleration: 2.0,
                weight_capacity: 800.0,
                starting_stop: StopId(0),
                door_open_ticks: 10,
                door_transition_ticks: 5,
            }],
            simulation: SimulationParams {
                ticks_per_second: 60.0,
            },
            passenger_spawning: PassengerSpawnConfig {
                mean_interval_ticks: 120,
                weight_range: (50.0, 100.0),
            },
        },
        spawns: vec![
            TimedSpawn {
                tick: 0,
                origin: StopId(0),
                destination: StopId(1),
                weight: 70.0,
            },
            TimedSpawn {
                tick: 10,
                origin: StopId(0),
                destination: StopId(1),
                weight: 80.0,
            },
        ],
        conditions: vec![
            Condition::AvgWaitBelow(200.0),
            Condition::AbandonmentRateBelow(0.01),
        ],
        max_ticks: 500,
    };

    let mut runner = ScenarioRunner::new(scenario, Box::new(ScanDispatch::new())).unwrap();
    let result = runner.run_to_completion();

    println!("Passed: {}", result.passed);
    println!("Delivered: {}", result.metrics.total_delivered());
    println!("Avg wait: {:.1} ticks", result.metrics.avg_wait_time());
}
