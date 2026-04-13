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
use elevator_core::movement::tick_movement;
use elevator_core::sim::Simulation;
use elevator_core::stop::{StopConfig, StopId};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Build a config with `num_stops` evenly spaced stops and `num_elevators` elevators.
fn make_config(num_stops: u32, num_elevators: u32) -> SimConfig {
    let stops: Vec<StopConfig> = (0..num_stops)
        .map(|i| StopConfig {
            id: StopId(i),
            name: format!("S{i}"),
            position: f64::from(i) * 10.0,
        })
        .collect();

    let elevators: Vec<ElevatorConfig> = (0..num_elevators)
        .map(|i| ElevatorConfig {
            id: i,
            name: format!("E{i}"),
            max_speed: 2.0,
            acceleration: 1.0,
            deceleration: 1.0,
            weight_capacity: 1000.0,
            starting_stop: StopId(0),
            door_open_ticks: 5,
            door_transition_ticks: 3,
        })
        .collect();

    SimConfig {
        building: BuildingConfig {
            name: "Bench".into(),
            stops,
            lines: None,
            groups: None,
        },
        elevators,
        simulation: SimulationParams {
            ticks_per_second: 60.0,
        },
        passenger_spawning: PassengerSpawnConfig {
            mean_interval_ticks: 100,
            weight_range: (60.0, 90.0),
        },
    }
}

/// Build a simulation with `num_stops` stops, `num_elevators` elevators,
/// and `num_riders` riders spread across origin/destination pairs.
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
// A) step() with N riders
// ---------------------------------------------------------------------------

fn bench_step(c: &mut Criterion) {
    let mut group = c.benchmark_group("step");

    for n in [1, 10, 100] {
        group.bench_function(format!("{n}_riders"), |b| {
            b.iter_batched(
                || make_sim(10, 3, n),
                |mut sim| sim.step(),
                criterion::BatchSize::SmallInput,
            );
        });
    }

    group.finish();
}

// ---------------------------------------------------------------------------
// B) tick_movement in isolation
// ---------------------------------------------------------------------------

fn bench_tick_movement(c: &mut Criterion) {
    c.bench_function("tick_movement", |b| {
        b.iter(|| tick_movement(0.0, 0.0, 100.0, 2.0, 1.0, 1.0, 1.0));
    });
}

// ---------------------------------------------------------------------------
// C) Dispatch decisions
// ---------------------------------------------------------------------------

fn bench_dispatch(c: &mut Criterion) {
    let mut group = c.benchmark_group("dispatch");

    for (elevators, stops) in [(3, 10), (10, 50)] {
        let riders = elevators * 2;
        group.bench_function(format!("{elevators}e_{stops}s"), |b| {
            b.iter_batched(
                || make_sim(stops, elevators, riders),
                |mut sim| sim.run_dispatch(),
                criterion::BatchSize::SmallInput,
            );
        });
    }

    group.finish();
}

// ---------------------------------------------------------------------------
// Criterion harness
// ---------------------------------------------------------------------------

criterion_group!(benches, bench_step, bench_tick_movement, bench_dispatch);
criterion_main!(benches);
