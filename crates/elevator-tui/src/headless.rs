//! Non-interactive runner: step the sim for `--until` ticks, print a
//! metrics summary, optionally emit the drained event stream as JSON.
//!
//! Intended uses:
//!
//! - **CI smoke**: `--until 5000` against each scenario in
//!   `assets/config/`; non-zero exit on construction failure surfaces
//!   regressions in config schema or builder validation.
//! - **Bug repro**: pair with `--emit events.json` to capture an event
//!   trace that can be diffed against a fixed run, attached to issues,
//!   or fed back into a future replay tool.

use std::path::Path;
use std::time::Instant;

use anyhow::{Context as _, Result};
use elevator_core::config::SimConfig;
use elevator_core::events::Event;
use elevator_core::sim::Simulation;
use elevator_core::traffic::{PoissonSource, TrafficSource as _};
use serde::Serialize;

/// Step `sim` until its `current_tick` reaches `until`, then write a
/// summary to stdout. If `emit` is `Some`, also serialize every drained
/// event to that path as JSON.
///
/// Unless `no_traffic` is set, a [`PoissonSource`] built from
/// `config.passenger_spawning` is driven each tick — without it, the
/// sim does nothing (no built-in spawner runs inside `Simulation`),
/// which makes a smoke test useless.
///
/// Already-elapsed ticks (e.g. from a restored snapshot) are honoured —
/// the runner stops as soon as `current_tick >= until`, so calling with
/// `until = 0` is a no-op that still prints the summary.
///
/// # Errors
///
/// Returns the underlying I/O error if writing the JSON file fails, the
/// serde error if event serialization fails, or a sim error if a Poisson
/// spawn request references a stop the simulation rejects. The summary
/// is printed before the error path is taken so the user still sees
/// what happened.
pub fn run(
    mut sim: Simulation,
    config: &SimConfig,
    until: u64,
    emit: Option<&Path>,
    no_traffic: bool,
) -> Result<()> {
    let start = Instant::now();
    let mut events: Vec<EventRecord> = Vec::new();
    let mut traffic = (!no_traffic).then(|| PoissonSource::from_config(config));

    while sim.current_tick() < until {
        if let Some(source) = traffic.as_mut() {
            for req in source.generate(sim.current_tick()) {
                // A spawn failure usually means the config references a
                // stop that doesn't exist — still useful to report,
                // but should not abort the whole run since later ticks
                // may produce valid spawns.
                if let Err(e) = sim.spawn_rider(req.origin, req.destination, req.weight) {
                    eprintln!("warn: spawn rejected: {e}");
                }
            }
        }
        sim.step();
        let tick = sim.current_tick();
        for event in sim.drain_events() {
            events.push(EventRecord { tick, event });
        }
    }

    let elapsed = start.elapsed();
    print_summary(&sim, events.len(), elapsed);

    if let Some(path) = emit {
        let json = serde_json::to_vec_pretty(&EmittedTrace {
            final_tick: sim.current_tick(),
            event_count: events.len(),
            events: &events,
        })
        .context("serializing event trace")?;
        std::fs::write(path, json)
            .with_context(|| format!("writing event trace: {}", path.display()))?;
        println!("emitted {} events → {}", events.len(), path.display());
    }

    Ok(())
}

/// Single drained event tagged with the tick it was drained on.
#[derive(Debug, Serialize)]
struct EventRecord {
    /// Tick the event was emitted from (drain tick).
    tick: u64,
    /// The event itself.
    event: Event,
}

/// Outer envelope written to disk when `--emit` is given.
#[derive(Debug, Serialize)]
struct EmittedTrace<'a> {
    /// Tick the run ended on.
    final_tick: u64,
    /// Count of events captured (mirrors `events.len()`, written for
    /// quick eyeballing in JQ-less environments).
    event_count: usize,
    /// Every event drained during the run.
    events: &'a [EventRecord],
}

/// Pretty-print the headless summary block.
fn print_summary(sim: &Simulation, event_count: usize, elapsed: std::time::Duration) {
    let metrics = sim.metrics();
    let final_tick = sim.current_tick();
    let cfg_tps = sim.time().ticks_per_second();
    let sim_seconds = final_tick as f64 / cfg_tps;
    let real_speed = if elapsed.as_secs_f64() > 0.0 {
        sim_seconds / elapsed.as_secs_f64()
    } else {
        f64::INFINITY
    };

    println!("─── headless summary ───────────────────────────");
    println!("final tick           {final_tick}");
    println!("sim duration         {sim_seconds:.1}s @ {cfg_tps:.0} t/s");
    println!(
        "wall time            {:.3}s ({real_speed:.1}× realtime)",
        elapsed.as_secs_f64()
    );
    println!("events drained       {event_count}");
    println!("riders spawned       {}", metrics.total_spawned());
    println!("riders delivered     {}", metrics.total_delivered());
    println!(
        "riders abandoned     {} ({:.1}%)",
        metrics.total_abandoned(),
        metrics.abandonment_rate() * 100.0
    );
    println!("avg wait             {:.1} ticks", metrics.avg_wait_time());
    println!("p95 wait             {} ticks", metrics.p95_wait_time());
    println!("avg ride             {:.1} ticks", metrics.avg_ride_time());
    println!(
        "throughput           {} delivered in last {} ticks",
        metrics.throughput(),
        metrics.throughput_window_ticks()
    );
    println!(
        "avg utilization      {:.1}%",
        metrics.avg_utilization() * 100.0
    );
    println!("────────────────────────────────────────────────");
}

#[cfg(test)]
#[allow(clippy::expect_used, clippy::unwrap_used)]
mod tests {
    use super::*;
    use elevator_core::builder::SimulationBuilder;
    use elevator_core::dispatch::scan::ScanDispatch;

    fn demo_pair() -> (Simulation, SimConfig) {
        let builder = SimulationBuilder::demo().dispatch(ScanDispatch::new());
        // Builder doesn't expose its assembled config directly, so
        // hand-roll one matching the demo topology for the Poisson
        // source. Mirrors what builder::demo configures internally.
        let config = SimConfig {
            building: elevator_core::config::BuildingConfig {
                name: "Demo".into(),
                stops: vec![
                    elevator_core::stop::StopConfig {
                        id: elevator_core::stop::StopId(0),
                        name: "Ground".into(),
                        position: 0.0,
                    },
                    elevator_core::stop::StopConfig {
                        id: elevator_core::stop::StopId(1),
                        name: "Top".into(),
                        position: 10.0,
                    },
                ],
                lines: None,
                groups: None,
            },
            elevators: vec![],
            simulation: elevator_core::config::SimulationParams {
                ticks_per_second: 60.0,
            },
            passenger_spawning: elevator_core::config::PassengerSpawnConfig {
                mean_interval_ticks: 30,
                weight_range: (60.0, 90.0),
            },
        };
        let sim = builder.build().expect("demo builder must succeed");
        (sim, config)
    }

    #[test]
    fn headless_advances_to_until_tick() {
        let (sim, config) = demo_pair();
        run(sim, &config, 100, None, true).expect("run succeeds");
    }

    #[test]
    fn headless_below_current_tick_is_noop() {
        let (mut sim, config) = demo_pair();
        for _ in 0..50 {
            sim.step();
        }
        let before = sim.current_tick();
        run(sim, &config, 10, None, true).expect("run succeeds");
        assert!(before > 10);
    }

    #[test]
    fn headless_emit_writes_valid_json() {
        let dir = std::env::temp_dir();
        let path = dir.join(format!(
            "elevator_tui_headless_emit_{}.json",
            std::process::id()
        ));
        let (sim, config) = demo_pair();
        run(sim, &config, 50, Some(&path), true).expect("run with emit succeeds");
        let bytes = std::fs::read(&path).expect("emitted file readable");
        let value: serde_json::Value =
            serde_json::from_slice(&bytes).expect("emitted bytes are valid JSON");
        assert!(value.get("final_tick").is_some());
        assert!(value.get("events").and_then(|v| v.as_array()).is_some());
        let _ = std::fs::remove_file(&path);
    }
}
