//! Headless JSON-trace driver — proves the core is truly engine-agnostic.
//!
//! Loads a RON config, runs the simulation for a fixed number of ticks,
//! and writes a newline-delimited-JSON (NDJSON) event stream to stdout
//! or a file. There is no engine, no renderer, no game loop — just
//! `sim.step()` in a loop and `sim.drain_events()` consumed by
//! `serde_json`. Exactly the integration shape a non-Bevy consumer
//! (macroquad, a web backend, a CLI analysis tool) would use.
//!
//! ## Usage
//!
//! ```text
//! cargo run --example headless_trace -- \
//!     --config assets/config/default.ron \
//!     --ticks 2000 \
//!     --output /tmp/trace.ndjson
//! ```
//!
//! Arguments (all optional):
//!
//! - `--config PATH` — RON config to load. Default: `assets/config/default.ron`.
//! - `--ticks N`     — number of ticks to step. Default: `1000`.
//! - `--output PATH` — write NDJSON here. Default: stdout.
//! - `--spawn N`     — number of demo riders to spawn at tick 0 from the
//!   first stop to the last stop. Default: `5`.
//!
//! Each output line is one serialized [`Event`](elevator_core::events::Event)
//! using serde's default externally-tagged enum representation, e.g.
//! `{"RiderSpawned":{"rider":{"idx":8,"version":1},"origin":...,"tick":0}}`.
//! Every event variant carries its own `"tick"` field, so no outer wrapping
//! is needed. The final line is a `{"summary": ...}` object with aggregate
//! metrics.
#![allow(
    clippy::unwrap_used,
    clippy::expect_used,
    clippy::panic,
    clippy::missing_docs_in_private_items
)]

use std::fs;
use std::io::{self, BufWriter, Write};
use std::path::PathBuf;
use std::process::ExitCode;

use elevator_core::config::SimConfig;
use elevator_core::prelude::*;

struct Args {
    config: PathBuf,
    ticks: u64,
    output: Option<PathBuf>,
    spawn: u64,
}

impl Args {
    fn parse() -> Result<Self, String> {
        let mut config = PathBuf::from("assets/config/default.ron");
        let mut ticks: u64 = 1000;
        let mut output: Option<PathBuf> = None;
        let mut spawn: u64 = 5;

        let mut it = std::env::args().skip(1);
        while let Some(arg) = it.next() {
            match arg.as_str() {
                "--config" => {
                    config = it.next().ok_or("--config needs a PATH")?.into();
                }
                "--ticks" => {
                    ticks = it
                        .next()
                        .ok_or("--ticks needs N")?
                        .parse()
                        .map_err(|e| format!("--ticks: {e}"))?;
                }
                "--output" => {
                    output = Some(it.next().ok_or("--output needs a PATH")?.into());
                }
                "--spawn" => {
                    spawn = it
                        .next()
                        .ok_or("--spawn needs N")?
                        .parse()
                        .map_err(|e| format!("--spawn: {e}"))?;
                }
                "-h" | "--help" => {
                    println!("{}", Self::help());
                    std::process::exit(0);
                }
                other => return Err(format!("unknown arg: {other}")),
            }
        }

        Ok(Self {
            config,
            ticks,
            output,
            spawn,
        })
    }

    const fn help() -> &'static str {
        "headless_trace — drive elevator-core without a game engine\n\
         \n\
         Usage:\n  \
           cargo run --example headless_trace -- [OPTIONS]\n\
         \n\
         Options:\n  \
           --config PATH   RON config (default: assets/config/default.ron)\n  \
           --ticks N       Ticks to simulate (default: 1000)\n  \
           --output PATH   NDJSON output file (default: stdout)\n  \
           --spawn N       Demo riders to spawn at tick 0 (default: 5)\n  \
           -h, --help      Print this help"
    }
}

fn main() -> ExitCode {
    let args = match Args::parse() {
        Ok(a) => a,
        Err(e) => {
            eprintln!("error: {e}\n\n{}", Args::help());
            return ExitCode::from(2);
        }
    };

    let ron_str = match fs::read_to_string(&args.config) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("error: cannot read {}: {e}", args.config.display());
            return ExitCode::from(1);
        }
    };
    let config: SimConfig = match ron::from_str(&ron_str) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("error: cannot parse {}: {e}", args.config.display());
            return ExitCode::from(1);
        }
    };

    // Spawn demo riders from the first to the last configured stop so the
    // example produces a nontrivial event stream on any config.
    let first = config.building.stops.first().expect("no stops").id;
    let last = config.building.stops.last().expect("no stops").id;

    let mut sim = SimulationBuilder::from_config(config).build().unwrap();
    for i in 0..args.spawn {
        let weight = 70.0 + f64::from(u32::try_from(i).unwrap_or(0)) * 2.5;
        sim.spawn_rider_by_stop_id(first, last, weight).unwrap();
    }

    // Dispatch the output writer once. Both sinks go through BufWriter so
    // large traces don't do a syscall per event.
    let mut out: BufWriter<Box<dyn Write>> = args.output.as_ref().map_or_else(
        || BufWriter::new(Box::new(io::stdout().lock()) as Box<dyn Write>),
        |p| BufWriter::new(Box::new(fs::File::create(p).unwrap()) as Box<dyn Write>),
    );

    for _ in 0..args.ticks {
        sim.step();
        for event in sim.drain_events() {
            // Use the tick embedded in each event variant rather than
            // sim.current_tick() — some events are emitted at construction.
            let line = serde_json::to_string(&event).unwrap();
            writeln!(out, "{line}").unwrap();
        }
    }

    // Final summary row — aggregate metrics for downstream consumers.
    let m = sim.metrics();
    let summary = serde_json::json!({
        "summary": {
            "ticks_run": args.ticks,
            "delivered": m.total_delivered(),
            "abandoned": m.total_abandoned(),
            "avg_wait_ticks": m.avg_wait_time(),
            "max_wait_ticks": m.max_wait_time(),
            "avg_ride_ticks": m.avg_ride_time(),
            "total_distance": m.total_distance(),
        }
    });
    writeln!(out, "{summary}").unwrap();

    ExitCode::SUCCESS
}
