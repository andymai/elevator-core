#![allow(
    missing_docs,
    clippy::missing_docs_in_private_items,
    clippy::unwrap_used,
    clippy::cast_precision_loss,
    clippy::items_after_statements,
    clippy::significant_drop_tightening,
    clippy::type_complexity
)]

use criterion::{Criterion, criterion_group, criterion_main};

use elevator_sim_core::config::{
    BuildingConfig, ElevatorConfig, PassengerSpawnConfig, SimConfig, SimulationParams,
};
use elevator_sim_core::dispatch::DispatchStrategy;
use elevator_sim_core::dispatch::etd::EtdDispatch;
use elevator_sim_core::dispatch::look::LookDispatch;
use elevator_sim_core::dispatch::nearest_car::NearestCarDispatch;
use elevator_sim_core::dispatch::scan::ScanDispatch;
use elevator_sim_core::sim::Simulation;
use elevator_sim_core::stop::{StopConfig, StopId};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn make_config(num_stops: u32, num_elevators: u32) -> SimConfig {
    let stops: Vec<StopConfig> = (0..num_stops)
        .map(|i| StopConfig {
            id: StopId(i),
            name: format!("S{i}"),
            position: f64::from(i) * 4.0,
        })
        .collect();

    let elevators: Vec<ElevatorConfig> = (0..num_elevators)
        .map(|i| ElevatorConfig {
            id: i,
            name: format!("E{i}"),
            max_speed: 3.0,
            acceleration: 1.5,
            deceleration: 2.0,
            weight_capacity: 1200.0,
            starting_stop: StopId(i % num_stops),
            door_open_ticks: 5,
            door_transition_ticks: 3,
        })
        .collect();

    SimConfig {
        building: BuildingConfig {
            name: "DispatchBench".into(),
            stops,
        },
        elevators,
        simulation: SimulationParams {
            ticks_per_second: 60.0,
        },
        passenger_spawning: PassengerSpawnConfig {
            mean_interval_ticks: 60,
            weight_range: (60.0, 90.0),
        },
    }
}

fn make_sim_with(
    num_stops: u32,
    num_elevators: u32,
    num_riders: u32,
    strategy: Box<dyn DispatchStrategy>,
) -> Simulation {
    let config = make_config(num_stops, num_elevators);
    let mut sim = Simulation::new(&config, strategy).unwrap();

    for i in 0..num_riders {
        let origin = StopId(i % num_stops);
        let dest = StopId((i + 1) % num_stops);
        sim.spawn_rider_by_stop_id(origin, dest, 75.0).unwrap();
    }

    sim
}

// ---------------------------------------------------------------------------
// Dispatch strategy comparison
// ---------------------------------------------------------------------------

fn bench_dispatch_comparison(c: &mut Criterion) {
    let mut group = c.benchmark_group("dispatch_comparison");
    group.sample_size(20);

    let configs: &[(u32, u32)] = &[(5, 10), (20, 50), (50, 200)];
    let strategies: &[(&str, fn() -> Box<dyn DispatchStrategy>)] = &[
        ("scan", || Box::new(ScanDispatch::new())),
        ("look", || Box::new(LookDispatch::new())),
        ("nearest_car", || Box::new(NearestCarDispatch::new())),
        ("etd", || Box::new(EtdDispatch::new())),
    ];

    for &(elevators, stops) in configs {
        let riders = elevators * 4; // 4 riders per elevator
        for &(name, make_strategy) in strategies {
            group.bench_function(format!("{name}_{elevators}e_{stops}s"), |b| {
                b.iter_batched(
                    || make_sim_with(stops, elevators, riders, make_strategy()),
                    |mut sim| {
                        for _ in 0..100 {
                            sim.run_dispatch();
                        }
                    },
                    criterion::BatchSize::LargeInput,
                );
            });
        }
    }

    group.finish();
}

// ---------------------------------------------------------------------------
// Criterion harness
// ---------------------------------------------------------------------------

criterion_group!(benches, bench_dispatch_comparison);
criterion_main!(benches);
