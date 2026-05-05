//! Compare built-in dispatch strategies on deterministic traffic scenarios.
//!
//! Runs each strategy against three traffic patterns (up-peak, down-peak,
//! interfloor) with a seeded [`PoissonSource`] and prints AWT, AJT,
//! throughput, delivered/spawned, and the delivered-to-spawned ratio.
//!
//! The scenarios are calibrated to keep the sim away from 100% capacity so
//! the measured AWT/AJT reflect per-rider quality rather than backlog-
//! clearing. Each scenario discards a warmup window before enabling
//! rider spawning for measurement; the pre-measurement phase only lets
//! the cars settle. A short warmup of ignored spawns would require
//! resettable metrics (private API); instead we let the sim reach
//! steady state under the measurement window, which is long enough
//! (~10k ticks) that transient effects dominate less.
//!
//! Note: [`Metrics::avg_wait_time`] is averaged across *boarded* riders
//! only. If `delivered/spawned < 0.95`, the scenario is over-loaded and
//! AWT understates queueing delay — a warning is printed so the numbers
//! aren't taken at face value.
//!
//! Run with:
//! ```sh
//! cargo run --example dispatch_comparison --release
//! ```

#![allow(
    clippy::unwrap_used,
    clippy::cast_precision_loss,
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    clippy::missing_docs_in_private_items,
    clippy::print_stdout
)]

use elevator_core::components::{Accel, Speed, Weight};
use elevator_core::config::{
    BuildingConfig, ElevatorConfig, PassengerSpawnConfig, SimConfig, SimulationParams,
};
use elevator_core::dispatch::{
    AssignedCar, DestinationDispatch, DispatchStrategy, EtdDispatch, LookDispatch,
    NearestCarDispatch, ScanDispatch,
};
use elevator_core::prelude::*;
use elevator_core::sim::Simulation;
use elevator_core::stop::StopConfig;
use elevator_core::traffic::{
    PoissonSource, SpawnRequest, TrafficPattern, TrafficSchedule, TrafficSource,
};
use elevator_core::world::ExtKey;
use rand::SeedableRng;

const WARMUP_TICKS: u64 = 1000;
const MEASURE_TICKS: u64 = 30_000;
const TOTAL_TICKS: u64 = WARMUP_TICKS + MEASURE_TICKS;

fn make_config() -> SimConfig {
    let stops: Vec<StopConfig> = (0..10)
        .map(|i| StopConfig {
            id: StopId(i),
            name: format!("F{i}"),
            position: f64::from(i) * 4.0,
        })
        .collect();

    let elevators: Vec<ElevatorConfig> = (0..4)
        .map(|i| ElevatorConfig {
            id: i,
            name: format!("E{i}"),
            max_speed: Speed::from(2.5),
            acceleration: Accel::from(1.5),
            deceleration: Accel::from(2.0),
            weight_capacity: Weight::from(1200.0),
            starting_stop: StopId(i * 2 % 10),
            door_open_ticks: 10,
            door_transition_ticks: 5,
            restricted_stops: Vec::new(),
            #[cfg(feature = "energy")]
            energy_profile: None,
            service_mode: None,
            inspection_speed_factor: 0.25,

            bypass_load_up_pct: None,

            bypass_load_down_pct: None,
        })
        .collect();

    SimConfig {
        schema_version: elevator_core::config::CURRENT_CONFIG_SCHEMA_VERSION,
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
            mean_interval_ticks: 20,
            weight_range: (60.0, 90.0),
        },
    }
}

fn make_source(pattern: TrafficPattern, seed: u64, mean_interval: u32) -> PoissonSource {
    let stops: Vec<StopId> = (0..10).map(StopId).collect();
    let rng = rand::rngs::StdRng::seed_from_u64(seed);
    PoissonSource::new(
        stops,
        TrafficSchedule::constant(pattern),
        mean_interval,
        (60.0, 90.0),
    )
    .with_rng(rng)
}

struct ScenarioResult {
    strategy: &'static str,
    awt: f64,
    ajt: f64,
    throughput: u64,
    delivered: u64,
    spawned: u64,
    ratio: f64,
}

fn run_one<S: DispatchStrategy + 'static>(
    strategy_name: &'static str,
    strategy: S,
    pattern: TrafficPattern,
    seed: u64,
    mean_interval: u32,
) -> ScenarioResult {
    let config = make_config();
    let mut sim = Simulation::new(&config, strategy).unwrap();
    sim.world_mut()
        .register_ext::<AssignedCar>(ExtKey::new("assigned_car"));

    let mut source = make_source(pattern, seed, mean_interval);
    let mut spawned = 0u64;

    // Warmup: step without spawning so cars settle and any initial
    // repositioning completes. (Spawning during warmup would bias the
    // avg_wait metric since it is all-time, not window-scoped.)
    for _ in 0..WARMUP_TICKS {
        sim.step();
    }

    // Measurement: spawn + step.
    for _ in 0..MEASURE_TICKS {
        let tick = sim.current_tick();
        let reqs: Vec<SpawnRequest> = source.generate(tick);
        for req in reqs {
            if sim
                .spawn_rider(req.origin, req.destination, req.weight)
                .is_ok()
            {
                spawned += 1;
            }
        }
        sim.step();
    }

    let m = sim.metrics();
    let delivered = m.total_delivered();
    let ratio = if spawned > 0 {
        delivered as f64 / spawned as f64
    } else {
        0.0
    };

    ScenarioResult {
        strategy: strategy_name,
        awt: m.avg_wait_time(),
        ajt: m.avg_ride_time(),
        throughput: m.throughput(),
        delivered,
        spawned,
        ratio,
    }
}

fn run_scenario(label: &str, pattern: TrafficPattern, seed: u64, mean_interval: u32) {
    println!();
    println!(
        "Scenario: {label} (pattern {pattern:?}, {TOTAL_TICKS} ticks [warmup {WARMUP_TICKS}], seed {seed}, mean_interval {mean_interval})",
    );
    println!("Note: AWT/AJT average across delivered riders only.");
    println!("      delivered/spawned < 0.95 ⇒ over-loaded; AWT understates delay.");
    println!("Strategy       | AWT     | AJT     | Throughput | Delivered | Spawned | D/S ");
    println!("---------------|---------|---------|------------|-----------|---------|------");

    let results = [
        run_one("Scan", ScanDispatch::new(), pattern, seed, mean_interval),
        run_one("Look", LookDispatch::new(), pattern, seed, mean_interval),
        run_one(
            "NearestCar",
            NearestCarDispatch::new(),
            pattern,
            seed,
            mean_interval,
        ),
        run_one("Etd", EtdDispatch::new(), pattern, seed, mean_interval),
        run_one(
            "Destination",
            DestinationDispatch::new(),
            pattern,
            seed,
            mean_interval,
        ),
    ];

    for r in &results {
        println!(
            "{:<14} | {:>7.1} | {:>7.1} | {:>10} | {:>9} | {:>7} | {:>4.2}",
            r.strategy, r.awt, r.ajt, r.throughput, r.delivered, r.spawned, r.ratio,
        );
    }
    for r in &results {
        if r.ratio < 0.95 {
            println!(
                "  WARN {} over-loaded (D/S = {:.2}); AWT understates queueing delay",
                r.strategy, r.ratio,
            );
        }
    }
}

fn main() {
    println!("Dispatch strategy comparison (deterministic, seeded PoissonSource)");
    println!("Building: 10 stops x 4 elevators, weight capacity 1200.0, max speed 2.5, 60 tps");

    // Calibrated intensities target ~70% utilization across most strategies.
    // mean_interval is global across all stops; at ~150 the building
    // produces one rider every ~150 ticks for ~200 riders over 30k ticks.
    run_scenario("up-peak", TrafficPattern::UpPeak, 42, 200);
    run_scenario("down-peak", TrafficPattern::DownPeak, 42, 200);
    run_scenario("interfloor", TrafficPattern::Uniform, 42, 350);
}
