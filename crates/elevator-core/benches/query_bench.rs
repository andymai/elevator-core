#![allow(
    missing_docs,
    clippy::missing_docs_in_private_items,
    clippy::unwrap_used,
    clippy::cast_precision_loss,
    clippy::items_after_statements,
    clippy::significant_drop_tightening
)]

use criterion::{Criterion, criterion_group, criterion_main};

use elevator_core::components::{Elevator, Position, Rider, Route};
use elevator_core::config::{
    BuildingConfig, ElevatorConfig, PassengerSpawnConfig, SimConfig, SimulationParams,
};
use elevator_core::dispatch::scan::ScanDispatch;
use elevator_core::entity::EntityId;
use elevator_core::prelude::*;
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
            name: "QueryBench".into(),
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
// A) Single-component query iteration
// ---------------------------------------------------------------------------

fn bench_query_riders(c: &mut Criterion) {
    let mut group = c.benchmark_group("query_riders");

    for n in [100, 1000, 10_000] {
        group.bench_function(format!("{n}_riders"), |b| {
            b.iter_batched(
                || make_sim(50, 5, n),
                |sim| {
                    let mut count = 0u64;
                    for (_id, rider) in sim.world().iter_riders() {
                        if rider.phase() == RiderPhase::Waiting {
                            count += 1;
                        }
                    }
                    count
                },
                criterion::BatchSize::SmallInput,
            );
        });
    }

    group.finish();
}

// ---------------------------------------------------------------------------
// B) Multi-component tuple query
// ---------------------------------------------------------------------------

fn bench_query_tuple(c: &mut Criterion) {
    let mut group = c.benchmark_group("query_tuple");

    for n in [100, 1000, 10_000] {
        group.bench_function(format!("{n}_entities"), |b| {
            b.iter_batched(
                || make_sim(50, 5, n),
                |sim| {
                    let mut total = 0.0_f64;
                    for (_id, _rider, pos) in
                        sim.world().query::<(EntityId, &Rider, &Position)>().iter()
                    {
                        total += pos.value();
                    }
                    total
                },
                criterion::BatchSize::SmallInput,
            );
        });
    }

    group.finish();
}

// ---------------------------------------------------------------------------
// C) Elevator query (smaller entity set, different component)
// ---------------------------------------------------------------------------

fn bench_query_elevators(c: &mut Criterion) {
    let mut group = c.benchmark_group("query_elevators");

    for n in [10, 50, 200] {
        group.bench_function(format!("{n}_elevators"), |b| {
            b.iter_batched(
                || make_sim(100, n, 0),
                |sim| {
                    let mut idle = 0u64;
                    for (_id, elev, pos) in sim
                        .world()
                        .query::<(EntityId, &Elevator, &Position)>()
                        .iter()
                    {
                        if elev.phase() == ElevatorPhase::Idle {
                            idle += 1;
                        }
                        let _ = pos.value();
                    }
                    idle
                },
                criterion::BatchSize::SmallInput,
            );
        });
    }

    group.finish();
}

// ---------------------------------------------------------------------------
// D) Optional-component query (with filter)
// ---------------------------------------------------------------------------

fn bench_query_optional(c: &mut Criterion) {
    let mut group = c.benchmark_group("query_optional");

    for n in [100, 1000] {
        group.bench_function(format!("{n}_riders"), |b| {
            b.iter_batched(
                || make_sim(50, 5, n),
                |sim| {
                    let mut with_route = 0u64;
                    for (_id, _rider, route) in sim
                        .world()
                        .query::<(EntityId, &Rider, Option<&Route>)>()
                        .iter()
                    {
                        if route.is_some() {
                            with_route += 1;
                        }
                    }
                    with_route
                },
                criterion::BatchSize::SmallInput,
            );
        });
    }

    group.finish();
}

// ---------------------------------------------------------------------------
// Criterion harness
// ---------------------------------------------------------------------------

criterion_group!(
    benches,
    bench_query_riders,
    bench_query_tuple,
    bench_query_elevators,
    bench_query_optional
);
criterion_main!(benches);
