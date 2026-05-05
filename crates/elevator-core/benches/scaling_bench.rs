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
        schema_version: elevator_core::config::CURRENT_CONFIG_SCHEMA_VERSION,
        building: BuildingConfig {
            name: "Scaling".into(),
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

fn make_sim(num_stops: u32, num_elevators: u32, num_riders: u32) -> Simulation {
    let config = make_config(num_stops, num_elevators);
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    for i in 0..num_riders {
        let origin = StopId(i % num_stops);
        let dest = StopId((i + 1) % num_stops);
        sim.spawn_rider(origin, dest, 75.0).unwrap();
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
                    sim.spawn_rider(origin, dest, 75.0).unwrap();
                }
            },
            criterion::BatchSize::LargeInput,
        );
    });

    group.finish();
}

// ---------------------------------------------------------------------------
// D) World-record scale: Shanghai Tower
//
// Shanghai Tower (上海中心大厦) holds the working world record for
// most elevators in a single skyscraper: **149 lifts** (Mitsubishi
// Electric package) across **133 stops** (128 above ground + 5
// below). The real building zones these into an observation
// shuttle, a sky-lobby shuttle bank, and five local zones, but this
// bench keeps a single group so the numbers are directly comparable
// with the other `scaling_*` cases.
//
// Traffic grounding — Shanghai Tower has ~16 000 concurrent
// occupants at peak (CTBUH), and commercial elevator-planning
// practice sizes morning up-peak to handle 11–15 % of population in
// a 5-minute window. That's ~6–8 lobby arrivals per second; in a
// 100-tick (≈1.67 s at 60 Hz) slice, realistic queue depth is a
// few hundred riders, not a few thousand. The two bench cases below
// anchor both ends:
//
// - `realistic_up_peak_300r` — mid-peak queue depth (~300 riders
//   waiting for service). Matches the arrival rate published
//   traffic models predict for this building class.
// - `stress_2000r` — worst-case queue (evacuation, major event let
//   out). Not a typical operating state; included as a "don't
//   regress under extreme load" ceiling.
// ---------------------------------------------------------------------------

fn bench_shanghai_tower(c: &mut Criterion) {
    let mut group = c.benchmark_group("scaling_shanghai_tower");
    group.sample_size(10);

    group.bench_function("realistic_up_peak_300r_100ticks", |b| {
        b.iter_batched(
            || make_sim(133, 149, 300),
            |mut sim| {
                for _ in 0..100 {
                    sim.step();
                }
            },
            criterion::BatchSize::LargeInput,
        );
    });

    group.bench_function("stress_2000r_100ticks", |b| {
        b.iter_batched(
            || make_sim(133, 149, 2_000),
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
// Criterion harness
// ---------------------------------------------------------------------------

criterion_group!(
    benches,
    bench_realistic,
    bench_extreme,
    bench_spawn_pressure,
    bench_shanghai_tower
);
criterion_main!(benches);
