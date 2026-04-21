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

use elevator_core::config::{
    BuildingConfig, ElevatorConfig, PassengerSpawnConfig, SimConfig, SimulationParams,
};
use elevator_core::dispatch::DispatchStrategy;
use elevator_core::dispatch::destination::DestinationDispatch;
use elevator_core::dispatch::etd::EtdDispatch;
use elevator_core::dispatch::look::LookDispatch;
use elevator_core::dispatch::nearest_car::NearestCarDispatch;
use elevator_core::dispatch::rsr::RsrDispatch;
use elevator_core::dispatch::scan::ScanDispatch;
use elevator_core::sim::Simulation;
use elevator_core::stop::{StopConfig, StopId};

mod common;

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
        .map(|i| common::elevator_cfg(i, StopId(i % num_stops), 3.0, 1.5, 2.0, 1200.0))
        .collect();

    SimConfig {
        building: BuildingConfig {
            name: "DispatchBench".into(),
            stops,
            lines: None,
            groups: None,
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

fn make_sim_with<S: DispatchStrategy + 'static>(
    num_stops: u32,
    num_elevators: u32,
    num_riders: u32,
    strategy: S,
) -> Simulation {
    let config = make_config(num_stops, num_elevators);
    let mut sim = Simulation::new(&config, strategy).unwrap();

    for i in 0..num_riders {
        let origin = StopId(i % num_stops);
        let dest = StopId((i + 1) % num_stops);
        sim.spawn_rider(origin, dest, 75.0).unwrap();
    }

    sim
}

// ---------------------------------------------------------------------------
// Dispatch strategy comparison
// ---------------------------------------------------------------------------

macro_rules! bench_strategy {
    ($group:expr, $name:expr, $elevators:expr, $stops:expr, $riders:expr, $strategy:expr) => {
        $group.bench_function(format!("{}_{}e_{}s", $name, $elevators, $stops), |b| {
            b.iter_batched(
                || make_sim_with($stops, $elevators, $riders, $strategy),
                |mut sim| {
                    for _ in 0..100 {
                        sim.run_dispatch();
                    }
                },
                criterion::BatchSize::LargeInput,
            );
        });
    };
}

fn bench_dispatch_comparison(c: &mut Criterion) {
    let mut group = c.benchmark_group("dispatch_comparison");
    group.sample_size(20);

    let configs: &[(u32, u32)] = &[(5, 10), (20, 50), (50, 200)];

    for &(elevators, stops) in configs {
        let riders = elevators * 4; // 4 riders per elevator
        bench_strategy!(group, "scan", elevators, stops, riders, ScanDispatch::new());
        bench_strategy!(group, "look", elevators, stops, riders, LookDispatch::new());
        bench_strategy!(
            group,
            "nearest_car",
            elevators,
            stops,
            riders,
            NearestCarDispatch::new()
        );
        bench_strategy!(group, "etd", elevators, stops, riders, EtdDispatch::new());
        bench_strategy!(group, "rsr", elevators, stops, riders, RsrDispatch::new());
        bench_strategy!(
            group,
            "destination",
            elevators,
            stops,
            riders,
            DestinationDispatch::new()
        );
    }

    group.finish();
}

// ---------------------------------------------------------------------------
// Criterion harness
// ---------------------------------------------------------------------------

criterion_group!(benches, bench_dispatch_comparison);
criterion_main!(benches);
