#![allow(
    missing_docs,
    clippy::missing_docs_in_private_items,
    clippy::unwrap_used,
    clippy::cast_precision_loss,
    clippy::items_after_statements,
    clippy::significant_drop_tightening
)]

use criterion::{Criterion, criterion_group, criterion_main};

use elevator_core::builder::SimulationBuilder;
use elevator_core::components::Orientation;
use elevator_core::config::{
    BuildingConfig, ElevatorConfig, GroupConfig, LineConfig, PassengerSpawnConfig, SimConfig,
    SimulationParams,
};
use elevator_core::dispatch::BuiltinStrategy;
use elevator_core::dispatch::scan::ScanDispatch;
use elevator_core::ids::GroupId;
use elevator_core::sim::{LineParams, Simulation};
use elevator_core::stop::{StopConfig, StopId};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Build a multi-group config with shared transfer stops between adjacent groups.
///
/// Each group owns `lines_per_group` lines. Each line serves `stops_per_line`
/// stops. Adjacent groups share `shared_stops` transfer points: the last
/// `shared_stops` stops of group N overlap with the first `shared_stops` stops
/// of group N+1.
fn multi_group_config(
    num_groups: usize,
    lines_per_group: usize,
    elevators_per_line: usize,
    stops_per_line: usize,
    shared_stops: usize,
) -> SimConfig {
    // Compute total unique stops. Each group introduces `stops_per_line` stops,
    // but adjacent groups share `shared_stops`.
    let unique_per_group = stops_per_line.saturating_sub(shared_stops);
    let total_stops = if num_groups == 0 {
        0
    } else {
        stops_per_line + (num_groups - 1) * unique_per_group
    };

    let stops: Vec<StopConfig> = (0..total_stops)
        .map(|i| StopConfig {
            id: StopId(i as u32),
            name: format!("S{i}"),
            position: i as f64 * 4.0,
        })
        .collect();

    let mut lines = Vec::new();
    let mut groups_cfg = Vec::new();
    let mut elevator_id = 0u32;
    let mut line_id = 0u32;

    for g in 0..num_groups {
        let group_stop_start = g * unique_per_group;
        let mut group_line_ids = Vec::new();

        for _l in 0..lines_per_group {
            let serves: Vec<StopId> = (group_stop_start..group_stop_start + stops_per_line)
                .map(|s| StopId(s as u32))
                .collect();

            let elevators: Vec<ElevatorConfig> = (0..elevators_per_line)
                .map(|_| {
                    let eid = elevator_id;
                    elevator_id += 1;
                    ElevatorConfig {
                        id: eid,
                        name: format!("E{eid}"),
                        max_speed: 3.0,
                        acceleration: 1.5,
                        deceleration: 2.0,
                        weight_capacity: 1200.0,
                        starting_stop: serves[0],
                        door_open_ticks: 5,
                        door_transition_ticks: 3,
                        restricted_stops: Vec::new(),
                        #[cfg(feature = "energy")]
                        energy_profile: None,
                        service_mode: None,
                        inspection_speed_factor: 0.25,
                    }
                })
                .collect();

            group_line_ids.push(line_id);
            lines.push(LineConfig {
                id: line_id,
                name: format!("L{line_id}"),
                serves,
                elevators,
                orientation: Orientation::Vertical,
                position: None,
                min_position: None,
                max_position: None,
                max_cars: None,
            });
            line_id += 1;
        }

        groups_cfg.push(GroupConfig {
            id: g as u32,
            name: format!("G{g}"),
            lines: group_line_ids,
            dispatch: BuiltinStrategy::Scan,
            reposition: None,
        });
    }

    SimConfig {
        building: BuildingConfig {
            name: "MultiLineBench".into(),
            stops,
            lines: Some(lines),
            groups: Some(groups_cfg),
        },
        elevators: Vec::new(),
        simulation: SimulationParams {
            ticks_per_second: 60.0,
        },
        passenger_spawning: PassengerSpawnConfig {
            mean_interval_ticks: 60,
            weight_range: (60.0, 90.0),
        },
    }
}

/// Build a simulation from a multi-group config.
fn make_multi_sim(config: &SimConfig) -> Simulation {
    SimulationBuilder::from_config(config.clone())
        .build()
        .unwrap()
}

/// Build a flat single-group config with the given total elevators and stops.
fn single_group_config(num_stops: u32, num_elevators: u32) -> SimConfig {
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
            restricted_stops: Vec::new(),
            #[cfg(feature = "energy")]
            energy_profile: None,
            service_mode: None,
            inspection_speed_factor: 0.25,
        })
        .collect();

    SimConfig {
        building: BuildingConfig {
            name: "SingleGroupBench".into(),
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

// ---------------------------------------------------------------------------
// A) Multi-group step vs single-group baseline
// ---------------------------------------------------------------------------

fn bench_multi_group_step(c: &mut Criterion) {
    let mut group = c.benchmark_group("multi_group_step");
    group.sample_size(10);

    // Multi-group: 3 groups, 2 lines each, 5 elevators/line, 20 stops/line, 5 shared
    let multi_cfg = multi_group_config(3, 2, 5, 20, 5);

    // Equivalent single-group: same totals (30 elevators, 50 stops)
    let single_cfg = single_group_config(50, 30);

    // Each group covers `stops_per_line` stops starting at offset.
    let stops_per_line = 20u32;
    let shared = 5u32;
    let unique_per_group = stops_per_line - shared;
    let num_groups = 3u32;

    group.bench_function("multi_3g_2l_5e_20s", |b| {
        b.iter_batched(
            || {
                let mut sim = make_multi_sim(&multi_cfg);
                // Spawn 100 riders spread across groups within each group's range.
                for i in 0..100u32 {
                    let g = i % num_groups;
                    let base = g * unique_per_group;
                    let origin = StopId(base + (i / num_groups) % stops_per_line);
                    let dest = StopId(base + ((i / num_groups) + 1) % stops_per_line);
                    sim.spawn_rider_in_group_by_stop_id(origin, dest, 75.0, GroupId(g))
                        .unwrap();
                }
                sim
            },
            |mut sim| {
                for _ in 0..100 {
                    sim.step();
                }
            },
            criterion::BatchSize::LargeInput,
        );
    });

    group.bench_function("single_30e_50s_baseline", |b| {
        b.iter_batched(
            || {
                let mut sim = Simulation::new(&single_cfg, ScanDispatch::new()).unwrap();
                for i in 0..100u32 {
                    let origin = StopId(i % 50);
                    let dest = StopId((i + 25) % 50);
                    sim.spawn_rider_by_stop_id(origin, dest, 75.0).unwrap();
                }
                sim
            },
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
// B) Cross-group routing: spawn_rider auto-detection overhead
// ---------------------------------------------------------------------------

fn bench_cross_group_routing(c: &mut Criterion) {
    let mut group = c.benchmark_group("cross_group_routing");
    group.sample_size(10);

    for num_groups in [1, 5, 10, 20] {
        let cfg = multi_group_config(num_groups, 2, 3, 10, 3);
        let total_stops = cfg.building.stops.len() as u32;

        group.bench_function(format!("{num_groups}_groups"), |b| {
            b.iter_batched(
                || make_multi_sim(&cfg),
                |mut sim| {
                    for i in 0..1000u32 {
                        let origin = StopId(i % total_stops);
                        let dest = StopId((i + 1) % total_stops);
                        let _ = sim.spawn_rider_by_stop_id(origin, dest, 75.0);
                    }
                },
                criterion::BatchSize::LargeInput,
            );
        });
    }

    group.finish();
}

// ---------------------------------------------------------------------------
// C) Topology queries at scale
// ---------------------------------------------------------------------------

fn bench_topology_queries(c: &mut Criterion) {
    let mut group = c.benchmark_group("topology_queries");

    // 10 groups, 5 lines each, 10 stops per line, 3 shared = 500 total stops.
    let cfg = multi_group_config(10, 5, 1, 10, 3);
    let total_stops = cfg.building.stops.len() as u32;

    group.bench_function("reachable_stops_from", |b| {
        b.iter_batched(
            || make_multi_sim(&cfg),
            |sim| {
                // Query from the first stop.
                let stop = sim.stop_entity(StopId(0)).unwrap();
                sim.reachable_stops_from(stop)
            },
            criterion::BatchSize::SmallInput,
        );
    });

    group.bench_function("transfer_points", |b| {
        b.iter_batched(
            || make_multi_sim(&cfg),
            |sim| sim.transfer_points(),
            criterion::BatchSize::SmallInput,
        );
    });

    group.bench_function("shortest_route", |b| {
        b.iter_batched(
            || make_multi_sim(&cfg),
            |sim| {
                let first = sim.stop_entity(StopId(0)).unwrap();
                let last = sim.stop_entity(StopId(total_stops - 1)).unwrap();
                sim.shortest_route(first, last)
            },
            criterion::BatchSize::SmallInput,
        );
    });

    group.finish();
}

// ---------------------------------------------------------------------------
// D) Dynamic topology changes
// ---------------------------------------------------------------------------

fn bench_dynamic_topology(c: &mut Criterion) {
    let mut group = c.benchmark_group("dynamic_topology");

    // Start with 2 groups, 4 lines (2 per group).
    let cfg = multi_group_config(2, 2, 2, 10, 3);

    group.bench_function("add_line", |b| {
        b.iter_batched(
            || make_multi_sim(&cfg),
            |mut sim| {
                let params = LineParams::new("NewLine", GroupId(0));
                sim.add_line(&params).unwrap();
            },
            criterion::BatchSize::SmallInput,
        );
    });

    group.bench_function("remove_line", |b| {
        b.iter_batched(
            || {
                let mut sim = make_multi_sim(&cfg);
                // Add a line so we can remove it.
                let params = LineParams::new("Removable", GroupId(0));
                let line = sim.add_line(&params).unwrap();
                (sim, line)
            },
            |(mut sim, line)| {
                sim.remove_line(line).unwrap();
            },
            criterion::BatchSize::SmallInput,
        );
    });

    group.bench_function("assign_line_to_group", |b| {
        b.iter_batched(
            || {
                let mut sim = make_multi_sim(&cfg);
                // Add a line to group 0, then measure reassignment to group 1.
                let params = LineParams::new("Movable", GroupId(0));
                let line = sim.add_line(&params).unwrap();
                (sim, line)
            },
            |(mut sim, line)| {
                sim.assign_line_to_group(line, GroupId(1)).unwrap();
            },
            criterion::BatchSize::SmallInput,
        );
    });

    group.bench_function("add_stop_to_line", |b| {
        b.iter_batched(
            || {
                let mut sim = make_multi_sim(&cfg);
                // Add a new line, then measure adding a stop to it.
                let params = LineParams::new("StopTarget", GroupId(0));
                let line = sim.add_line(&params).unwrap();
                // Use an existing stop entity.
                let stop = sim.stop_entity(StopId(0)).unwrap();
                (sim, stop, line)
            },
            |(mut sim, stop, line)| {
                sim.add_stop_to_line(stop, line).unwrap();
            },
            criterion::BatchSize::SmallInput,
        );
    });

    // Measure the lazy graph rebuild cost explicitly.
    group.bench_function("topology_rebuild", |b| {
        b.iter_batched(
            || {
                let mut sim = make_multi_sim(&cfg);
                // Mutate topology to dirty the graph, then force a rebuild.
                let params = LineParams::new("Dirty", GroupId(0));
                sim.add_line(&params).unwrap();
                sim
            },
            |sim| {
                // reachable_stops_from triggers ensure_graph_built -> rebuild.
                let stop = sim.stop_entity(StopId(0)).unwrap();
                sim.reachable_stops_from(stop)
            },
            criterion::BatchSize::SmallInput,
        );
    });

    group.finish();
}

// ---------------------------------------------------------------------------
// Criterion harness
// ---------------------------------------------------------------------------

criterion_group!(
    benches,
    bench_multi_group_step,
    bench_cross_group_routing,
    bench_topology_queries,
    bench_dynamic_topology
);
criterion_main!(benches);
