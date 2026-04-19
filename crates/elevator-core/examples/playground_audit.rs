//! Headless audit of the playground scenarios.
//!
//! Mirrors the playground's six scenarios (RON configs + phase tables +
//! `abandonAfterSec` budgets) against a deterministic rider driver,
//! then reports the metrics a human would be squinting at in the
//! browser: delivered, abandoned, abandonment rate, avg/max wait, peak
//! waiting-queue length across the whole run.
//!
//! Purpose: verify that playground-level tuning changes (demand rates,
//! elevator counts, abandonment budgets) produce bounded queues and
//! realistic abandonment rates *without* needing to spin up a browser
//! and watch the UI for minutes at a time. If the office's abandonment
//! fix landed correctly, its peak-queue figure here should be finite
//! and its `abandoned > 0` should reflect the demand/supply gap.
//!
//! This intentionally **duplicates** the scenario data from
//! `playground/src/scenarios.ts` — one RON string and phase table per
//! scenario, copied verbatim. A single-source-of-truth refactor would
//! require a JSON pivot that both TS and Rust consume; not worth the
//! scope cost right now. If the scenarios.ts numbers change, this file
//! needs a mirror edit. Comments at the top of each scenario anchor to
//! the TS side's cruise-capacity docstring so divergence is easy to
//! spot in review.
//!
//! Run with:
//! ```sh
//! cargo run --example playground_audit --release
//! cargo run --example playground_audit --release -- office  # single scenario
//! ```

#![allow(
    clippy::unwrap_used,
    clippy::expect_used,
    clippy::cast_precision_loss,
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    clippy::missing_docs_in_private_items,
    clippy::print_stdout,
    clippy::too_many_lines,
    clippy::panic,
    clippy::option_if_let_else,
    clippy::missing_const_for_fn,
    clippy::suboptimal_flops,
    clippy::while_float
)]

use elevator_core::config::SimConfig;
use elevator_core::dispatch::{
    DestinationDispatch, EtdDispatch, LookDispatch, NearestCarDispatch, ScanDispatch,
};
use elevator_core::sim::Simulation;
use elevator_core::stop::StopId;

const TICKS_PER_SECOND: u64 = 60;

/// One phase of a scenario's day cycle. Mirrors `playground/src/types.ts`
/// `Phase` — duration in sim-seconds, rate in riders/min, unnormalized
/// stop weights.
struct Phase {
    duration_sec: u32,
    riders_per_min: f64,
    /// Unnormalized; 0.0 in a slot excludes that stop. Length must match stop count.
    origin_weights: &'static [f64],
    /// Same shape. If drawn `dest == origin`, rotated forward.
    dest_weights: &'static [f64],
}

struct Scenario {
    id: &'static str,
    label: &'static str,
    ron: &'static str,
    phases: &'static [Phase],
    /// `None` = riders never abandon (matches `abandonAfterSec` omission).
    abandon_after_sec: Option<u32>,
    /// Seed pre-loaded spawns before measurement starts. Mirrors
    /// `ScenarioMeta.seedSpawns` — used by convention burst.
    seed_spawns: u32,
}

/// Seconds of sim-time to run per (scenario, strategy). Covers at least
/// one full day-cycle for the scenarios whose phase total is ≤ 5 min.
const RUN_SEC: u32 = 360;

fn main() {
    // Poor-man's CLI: positional filter + optional `--no-abandon` flag.
    // Full `clap` would be overkill — this is an audit tool, not a
    // user-facing binary.
    let args: Vec<String> = std::env::args().skip(1).collect();
    let no_abandon = args.iter().any(|a| a == "--no-abandon");
    let filter = args.iter().find(|a| !a.starts_with("--")).cloned();
    let mut any = false;
    for scenario in SCENARIOS {
        if let Some(f) = &filter
            && !scenario.id.contains(f.as_str())
        {
            continue;
        }
        any = true;
        let effective_budget = if no_abandon {
            None
        } else {
            scenario.abandon_after_sec
        };
        println!("\n=== {} ({}) ===", scenario.label, scenario.id);
        println!(
            "  abandon_after: {}  run: {}s",
            effective_budget.map_or_else(|| "never".to_string(), |s| format!("{s}s")),
            RUN_SEC
        );
        println!(
            "  {:<12} {:>10} {:>10} {:>10} {:>10} {:>10} {:>10}",
            "strategy", "delivered", "abandoned", "aband%", "avg_wait", "max_wait", "peak_q"
        );
        for strategy in ["scan", "look", "nearest", "etd", "destination"] {
            let report = run_once(scenario, strategy, effective_budget);
            println!(
                "  {:<12} {:>10} {:>10} {:>9.1}% {:>9.1}s {:>9.1}s {:>10}",
                strategy,
                report.delivered,
                report.abandoned,
                report.abandonment_pct,
                report.avg_wait_s,
                report.max_wait_s,
                report.peak_waiting,
            );
        }
    }
    if !any {
        eprintln!("no scenario matched filter {filter:?}");
        std::process::exit(1);
    }
}

struct Report {
    delivered: u64,
    abandoned: u64,
    abandonment_pct: f64,
    avg_wait_s: f64,
    max_wait_s: f64,
    peak_waiting: usize,
}

fn run_once(scenario: &Scenario, strategy_name: &str, abandon_override: Option<u32>) -> Report {
    let config: SimConfig = ron::from_str(scenario.ron).expect("scenario RON must parse");

    // `Simulation::new` wants `impl DispatchStrategy + 'static`, not a
    // trait object — the generic monomorphizes per strategy. Dispatch
    // on the name here rather than box/dyn'ing to avoid the `Sized`
    // bound mismatch.
    let mut sim = match strategy_name {
        "scan" => Simulation::new(&config, ScanDispatch::new()),
        "look" => Simulation::new(&config, LookDispatch::new()),
        "nearest" => Simulation::new(&config, NearestCarDispatch::new()),
        "etd" => Simulation::new(&config, EtdDispatch::new()),
        "destination" => Simulation::new(&config, DestinationDispatch::new()),
        _ => panic!("unknown strategy: {strategy_name}"),
    }
    .expect("sim build");
    if strategy_name == "destination" {
        // DCS needs Destination hall-call mode + the AssignedCar
        // extension registered, otherwise `pre_dispatch` early-returns
        // and dispatch silently falls back to Idle.
        for g in sim.groups_mut() {
            g.set_hall_call_mode(elevator_core::dispatch::HallCallMode::Destination);
        }
        sim.world_mut()
            .register_ext::<elevator_core::dispatch::AssignedCar>(
                elevator_core::dispatch::destination::ASSIGNED_CAR_KEY,
            );
    }

    let stop_ids: Vec<StopId> = config.building.stops.iter().map(|s| s.id).collect();
    // Resolve StopId → EntityId once; `waiting_count_at` wants the
    // entity form. `stop_entity` is None for unknown StopIds — shouldn't
    // happen for a freshly-built sim, but filter defensively.
    let stop_entities: Vec<_> = stop_ids
        .iter()
        .filter_map(|id| sim.stop_entity(*id))
        .collect();
    let mut driver = Driver::new(42, scenario.phases);

    // Pre-seed — convention scenario burst. Each spawn call advances the
    // driver's internal accumulator by a fixed dt; 300 steps at 1/60s is
    // enough to drain 300 × (rate/60) ticks of scheduled spawns from the
    // first phase. Matches the playground's seedSpawns loop shape.
    for _ in 0..scenario.seed_spawns {
        let specs = driver.drain(1.0 / 60.0);
        for spec in specs {
            spawn(
                &mut sim,
                spec.origin,
                spec.dest,
                spec.weight,
                abandon_override,
            );
        }
    }

    let mut peak_waiting = 0usize;
    let dt = 1.0 / f64::from(TICKS_PER_SECOND as u32);
    let total_ticks = u64::from(RUN_SEC) * TICKS_PER_SECOND;
    for _ in 0..total_ticks {
        for spec in driver.drain(dt) {
            spawn(
                &mut sim,
                spec.origin,
                spec.dest,
                spec.weight,
                abandon_override,
            );
        }
        sim.step();
        sim.drain_events();
        let waiting: usize = stop_entities.iter().map(|&e| sim.waiting_count_at(e)).sum();
        if waiting > peak_waiting {
            peak_waiting = waiting;
        }
    }

    let m = sim.metrics();
    let delivered = m.total_delivered();
    let abandoned = m.total_abandoned();
    let spawned = m.total_spawned();
    let abandonment_pct = if spawned > 0 {
        100.0 * abandoned as f64 / spawned as f64
    } else {
        0.0
    };
    Report {
        delivered,
        abandoned,
        abandonment_pct,
        // Metrics store times in ticks; convert for human-friendly output.
        avg_wait_s: m.avg_wait_time() / TICKS_PER_SECOND as f64,
        max_wait_s: m.max_wait_time() as f64 / TICKS_PER_SECOND as f64,
        peak_waiting,
    }
}

fn spawn(
    sim: &mut Simulation,
    origin: StopId,
    dest: StopId,
    weight: f64,
    abandon_after_sec: Option<u32>,
) {
    let mut builder = match sim.build_rider(origin, dest) {
        Ok(b) => b.weight(weight),
        Err(_) => return, // unreachable pairs silently drop
    };
    if let Some(sec) = abandon_after_sec {
        builder = builder.patience(u64::from(sec) * TICKS_PER_SECOND);
    }
    let _ = builder.spawn();
}

/// Deterministic traffic driver — straight port of
/// `playground/src/traffic.ts` minus the intensity slider (headless
/// audit doesn't need a multiplier). Uses the same splitmix64 seed
/// mixing and weighted-index draw so the same seed produces the same
/// rider stream across Rust and JS.
struct Driver {
    state: u64,
    accumulator: f64,
    elapsed_in_cycle_sec: f64,
    total_duration_sec: f64,
    phases: &'static [Phase],
}

struct Spec {
    origin: StopId,
    dest: StopId,
    weight: f64,
}

impl Driver {
    fn new(seed: u32, phases: &'static [Phase]) -> Self {
        let total = phases.iter().map(|p| f64::from(p.duration_sec)).sum();
        Self {
            state: mix_seed(u64::from(seed)),
            accumulator: 0.0,
            elapsed_in_cycle_sec: 0.0,
            total_duration_sec: total,
            phases,
        }
    }

    fn current_phase(&self) -> &'static Phase {
        if self.phases.is_empty() {
            unreachable!("called current_phase with no phases installed");
        }
        let mut t = self.elapsed_in_cycle_sec;
        for phase in self.phases {
            t -= f64::from(phase.duration_sec);
            if t < 0.0 {
                return phase;
            }
        }
        self.phases.last().unwrap()
    }

    fn drain(&mut self, elapsed_sec: f64) -> Vec<Spec> {
        if self.phases.is_empty() {
            return Vec::new();
        }
        // Snapshot the phase pointer so we can mutate `self` inside
        // the emission loop. Phase data is `&'static` so a raw copy
        // of the reference is cheap and borrow-free.
        let phase: &'static Phase = self.current_phase();
        // Clamp dt the same way the TS driver does (4 frames @ 60Hz).
        let dt = elapsed_sec.min(4.0 / 60.0);
        self.accumulator += phase.riders_per_min / 60.0 * dt;
        self.elapsed_in_cycle_sec =
            (self.elapsed_in_cycle_sec + dt) % self.total_duration_sec.max(1.0);
        let mut out = Vec::new();
        while self.accumulator >= 1.0 {
            self.accumulator -= 1.0;
            out.push(self.next_spec(phase));
        }
        out
    }

    fn next_spec(&mut self, phase: &Phase) -> Spec {
        let n = phase.origin_weights.len();
        let origin_idx = self.pick_weighted(n, phase.origin_weights);
        let mut dest_idx = self.pick_weighted(n, phase.dest_weights);
        if dest_idx == origin_idx {
            dest_idx = (dest_idx + 1) % n;
        }
        Spec {
            origin: StopId(origin_idx as u32),
            dest: StopId(dest_idx as u32),
            weight: 50.0 + self.next_float() * 50.0,
        }
    }

    fn pick_weighted(&mut self, n: usize, weights: &[f64]) -> usize {
        let total: f64 = weights.iter().map(|w| w.max(0.0)).sum();
        if total <= 0.0 {
            return self.next_int(n);
        }
        let mut r = self.next_float() * total;
        for (i, &w) in weights.iter().enumerate() {
            r -= w.max(0.0);
            if r < 0.0 {
                return i;
            }
        }
        n - 1
    }

    fn next_u64(&mut self) -> u64 {
        self.state = self.state.wrapping_add(0x9e37_79b9_7f4a_7c15);
        let mut z = self.state;
        z = (z ^ (z >> 30)).wrapping_mul(0xbf58_476d_1ce4_e5b9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94d0_49bb_1331_11eb);
        z ^ (z >> 31)
    }

    fn next_int(&mut self, n: usize) -> usize {
        (self.next_u64() % n as u64) as usize
    }

    fn next_float(&mut self) -> f64 {
        (self.next_u64() >> 11) as f64 / (1u64 << 53) as f64
    }
}

fn mix_seed(seed: u64) -> u64 {
    let mut z = seed.wrapping_add(0x9e37_79b9_7f4a_7c15);
    z = (z ^ (z >> 30)).wrapping_mul(0xbf58_476d_1ce4_e5b9);
    z = (z ^ (z >> 27)).wrapping_mul(0x94d0_49bb_1331_11eb);
    z ^ (z >> 31)
}

// ─── Scenario data — mirrors playground/src/scenarios.ts ───────────
// KEEP IN SYNC: changes to rates, weights, elevator configs, or
// abandonment budgets in the TS file require a mirror edit here.

// Helper constructors for weight arrays; Rust can't express JS's
// array-spread-fill succinctly, so the vectors are written out.
const OFFICE_PHASES: &[Phase] = &[
    Phase {
        duration_sec: 45,
        riders_per_min: 3.0,
        origin_weights: &[1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
        dest_weights: &[1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
    },
    Phase {
        duration_sec: 60,
        riders_per_min: 30.0,
        origin_weights: &[8.5, 0.3, 0.3, 0.3, 0.3, 0.3],
        // topBias(6) × (i==0 ? 0 : w): 0, 1.1, 1.2, 1.3, 1.4, 1.5
        dest_weights: &[0.0, 1.1, 1.2, 1.3, 1.4, 1.5],
    },
    Phase {
        duration_sec: 60,
        riders_per_min: 16.0,
        origin_weights: &[1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
        dest_weights: &[1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
    },
    Phase {
        duration_sec: 45,
        riders_per_min: 36.0,
        origin_weights: &[0.3, 3.0, 2.0, 2.0, 2.0, 2.0],
        dest_weights: &[0.3, 3.0, 2.0, 2.0, 2.0, 2.0],
    },
    Phase {
        duration_sec: 60,
        riders_per_min: 30.0,
        // topBias(6) × (i==0 ? 0 : w): 0, 1.1, 1.2, 1.3, 1.4, 1.5
        origin_weights: &[0.0, 1.1, 1.2, 1.3, 1.4, 1.5],
        dest_weights: &[1.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    },
];

const OFFICE_RON: &str = r#"SimConfig(
    building: BuildingConfig(
        name: "Mid-Rise Office",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby",   position: 0.0),
            StopConfig(id: StopId(1), name: "Floor 2", position: 4.0),
            StopConfig(id: StopId(2), name: "Floor 3", position: 8.0),
            StopConfig(id: StopId(3), name: "Floor 4", position: 12.0),
            StopConfig(id: StopId(4), name: "Floor 5", position: 16.0),
            StopConfig(id: StopId(5), name: "Floor 6", position: 20.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 2.2, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 210, door_transition_ticks: 60,
        ),
        ElevatorConfig(
            id: 1, name: "Car 2",
            max_speed: 2.2, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(3),
            door_open_ticks: 210, door_transition_ticks: 60,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 90,
        weight_range: (50.0, 100.0),
    ),
)"#;

// Skyscraper phase data. 13 stops (lobby + 12). topBias(12) = [1.0,
// 1.045, 1.09, 1.136, 1.18, 1.227, 1.273, 1.318, 1.364, 1.409, 1.455,
// 1.5]. The `[14, ...0.25 × 12]` and its mirror encode lobby-heavy
// origin/dest for morning and evening rushes.
const SKY_PHASES: &[Phase] = &[
    Phase {
        duration_sec: 45,
        riders_per_min: 6.0,
        origin_weights: &[1.0; 13],
        dest_weights: &[1.0; 13],
    },
    Phase {
        duration_sec: 75,
        riders_per_min: 20.0,
        origin_weights: &[
            14.0, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25,
        ],
        dest_weights: &[
            0.0, 1.0, 1.045, 1.091, 1.136, 1.182, 1.227, 1.273, 1.318, 1.364, 1.409, 1.455, 1.5,
        ],
    },
    Phase {
        duration_sec: 60,
        riders_per_min: 13.0,
        origin_weights: &[1.0; 13],
        dest_weights: &[1.0; 13],
    },
    Phase {
        duration_sec: 45,
        riders_per_min: 17.0,
        // Sky lobby at index 6 weighted 3× as origin, 4× as dest.
        origin_weights: &[
            1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 3.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
        ],
        dest_weights: &[
            1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 4.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
        ],
    },
    Phase {
        duration_sec: 75,
        riders_per_min: 18.0,
        origin_weights: &[
            0.0, 1.0, 1.045, 1.091, 1.136, 1.182, 1.227, 1.273, 1.318, 1.364, 1.409, 1.455, 1.5,
        ],
        dest_weights: &[
            14.0, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25,
        ],
    },
];

const SKY_RON: &str = r#"SimConfig(
    building: BuildingConfig(
        name: "Skyscraper (Sky Lobby)",
        stops: [
            StopConfig(id: StopId(0),  name: "Lobby",      position: 0.0),
            StopConfig(id: StopId(1),  name: "Floor 2",    position: 4.0),
            StopConfig(id: StopId(2),  name: "Floor 3",    position: 8.0),
            StopConfig(id: StopId(3),  name: "Floor 4",    position: 12.0),
            StopConfig(id: StopId(4),  name: "Floor 5",    position: 16.0),
            StopConfig(id: StopId(5),  name: "Floor 6",    position: 20.0),
            StopConfig(id: StopId(6),  name: "Sky Lobby",  position: 24.0),
            StopConfig(id: StopId(7),  name: "Floor 8",    position: 28.0),
            StopConfig(id: StopId(8),  name: "Floor 9",    position: 32.0),
            StopConfig(id: StopId(9),  name: "Floor 10",   position: 36.0),
            StopConfig(id: StopId(10), name: "Floor 11",   position: 40.0),
            StopConfig(id: StopId(11), name: "Floor 12",   position: 44.0),
            StopConfig(id: StopId(12), name: "Penthouse",  position: 48.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car A",
            max_speed: 4.0, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1200.0,
            starting_stop: StopId(0),
            door_open_ticks: 300, door_transition_ticks: 72,
            bypass_load_up_pct: Some(0.80), bypass_load_down_pct: Some(0.50),
        ),
        ElevatorConfig(
            id: 1, name: "Car B",
            max_speed: 4.0, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1200.0,
            starting_stop: StopId(6),
            door_open_ticks: 300, door_transition_ticks: 72,
            bypass_load_up_pct: Some(0.80), bypass_load_down_pct: Some(0.50),
        ),
        ElevatorConfig(
            id: 2, name: "Car C",
            max_speed: 4.0, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1200.0,
            starting_stop: StopId(12),
            door_open_ticks: 300, door_transition_ticks: 72,
            bypass_load_up_pct: Some(0.80), bypass_load_down_pct: Some(0.50),
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 30,
        weight_range: (55.0, 100.0),
    ),
)"#;

const SCENARIOS: &[Scenario] = &[
    Scenario {
        id: "office",
        label: "Mid-rise office",
        ron: OFFICE_RON,
        phases: OFFICE_PHASES,
        abandon_after_sec: Some(90),
        seed_spawns: 0,
    },
    Scenario {
        id: "skyscraper",
        label: "Skyscraper (sky lobby)",
        ron: SKY_RON,
        phases: SKY_PHASES,
        abandon_after_sec: Some(180),
        seed_spawns: 0,
    },
];
