#![allow(
    missing_docs,
    clippy::missing_docs_in_private_items,
    clippy::unwrap_used,
    clippy::cast_precision_loss,
    clippy::items_after_statements,
    clippy::significant_drop_tightening
)]

use criterion::{Criterion, criterion_group, criterion_main};

use elevator_core::config::{
    BuildingConfig, ElevatorConfig, PassengerSpawnConfig, SimConfig, SimulationParams,
};
use elevator_core::dispatch::scan::ScanDispatch;
use elevator_core::sim::Simulation;
use elevator_core::stop::{StopConfig, StopId};

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
            name: "Scaling".into(),
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

fn make_sim(num_stops: u32, num_elevators: u32, num_riders: u32) -> Simulation {
    let config = make_config(num_stops, num_elevators);
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    for i in 0..num_riders {
        let origin = StopId(i % num_stops);
        let dest = StopId((i + 1) % num_stops);
        sim.spawn_rider_by_stop_id(origin, dest, 75.0).unwrap();
    }

    sim
}

// ---------------------------------------------------------------------------
// A) Realistic scale: 50 elevators / 200 stops / 2000 riders
// ---------------------------------------------------------------------------

fn bench_realistic(c: &mut Criterion) {
    let mut group = c.benchmark_group("scaling_realistic");
    group.sample_size(10);

    group.bench_function("50e_200s_2000r_100ticks", |b| {
        b.iter_batched(
            || make_sim(200, 50, 2000),
            |mut sim| {
                for _ in 0..100 {
                    sim.step();
                }
            },
            criterion::BatchSize::LargeInput,
        );
    });

    group.finish();
}

// ---------------------------------------------------------------------------
// B) Extreme scale: 500 elevators / 5000 stops / 50k riders
// ---------------------------------------------------------------------------

fn bench_extreme(c: &mut Criterion) {
    let mut group = c.benchmark_group("scaling_extreme");
    group.sample_size(10);

    group.bench_function("500e_5000s_50000r_10ticks", |b| {
        b.iter_batched(
            || make_sim(5000, 500, 50_000),
            |mut sim| {
                for _ in 0..10 {
                    sim.step();
                }
            },
            criterion::BatchSize::LargeInput,
        );
    });

    group.finish();
}

// ---------------------------------------------------------------------------
// C) Spawn pressure: 10k rider spawns on a pre-loaded world
// ---------------------------------------------------------------------------

fn bench_spawn_pressure(c: &mut Criterion) {
    let mut group = c.benchmark_group("spawn_pressure");
    group.sample_size(10);

    group.bench_function("10k_spawns", |b| {
        b.iter_batched(
            || make_sim(200, 50, 0),
            |mut sim| {
                for i in 0..10_000u32 {
                    let origin = StopId(i % 200);
                    let dest = StopId((i + 1) % 200);
                    sim.spawn_rider_by_stop_id(origin, dest, 75.0).unwrap();
                }
            },
            criterion::BatchSize::LargeInput,
        );
    });

    group.finish();
}

// ---------------------------------------------------------------------------
// Criterion harness
// ---------------------------------------------------------------------------

criterion_group!(
    benches,
    bench_realistic,
    bench_extreme,
    bench_spawn_pressure
);
criterion_main!(benches);
