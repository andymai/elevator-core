//! Cross-host contract test harness.
//!
//! Runs each scenario in `assets/contract-corpus/` against the
//! elevator-core API directly (the "ffi" host — elevator-ffi is a
//! thin C ABI wrapper around the same crate, so a checksum
//! mismatch would surface as an FFI bug regardless), and compares
//! the resulting `Simulation::snapshot_checksum()` against the
//! golden value committed in `assets/contract-corpus/golden.txt`.
//!
//! `crates/elevator-wasm/tests/contract.rs` runs the same scenarios
//! through the wasm-bindgen surface in a headless browser via
//! `wasm-pack test --headless --firefox`. Both hosts share
//! `golden.txt` as the reference; either disagreeing means a host
//! regression.
//!
//! ## Determinism
//!
//! Every scenario drives auto-spawning via a `PoissonSource` seeded
//! with `Scenario::seed` (per-scenario constants below) so the
//! generated rider stream is reproducible run-to-run. Without the
//! seed, `make_rng` would pull from the OS entropy and every harness
//! run would produce different metrics.
//!
//! The checksum is `Simulation::snapshot_checksum()` — FNV-1a over
//! `snapshot_bytes()`. This covers the entire serializable sim state
//! (entities, components, groups, metrics, world resources, dispatcher
//! configs), so a behaviour change anywhere in that surface surfaces
//! as a divergence. Snapshot bytes are deterministic across processes
//! since every map field that gets serialized uses `BTreeMap`.
//!
//! ## Update protocol
//!
//! When a Simulation behaviour change is intentional (a dispatcher
//! tweak, a new event variant, etc.), the contract test will fail
//! with a clear "expected X, got Y" diagnostic. The reviewer
//! confirms the change is intended, runs `cargo run -p
//! elevator-contract -- --update-golden` to regenerate
//! `golden.txt`, and commits the new file alongside the change.

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use elevator_core::builder::SimulationBuilder;
use elevator_core::config::SimConfig;
use elevator_core::sim::Simulation;
use elevator_core::traffic::{PoissonSource, TrafficSource};
use rand::SeedableRng;
use rand::rngs::StdRng;

/// Number of ticks every scenario runs for. Long enough to exercise
/// rider lifecycles end-to-end (spawn → board → ride → exit) under
/// the default 60 tps, short enough that a full corpus run finishes
/// in well under a second.
const SCENARIO_TICKS: u64 = 600;

/// Each scenario's name + Poisson seed. The seed is chosen per
/// scenario so a regression in one doesn't trivially propagate to
/// another via shared randomness, and is hand-picked to surface
/// non-trivial metrics (mix of delivered + abandoned).
const SCENARIOS: &[Scenario] = &[
    Scenario {
        name: "default",
        seed: 0xD0FA17,
    },
    Scenario {
        name: "sparse",
        seed: 0x5141FE,
    },
    Scenario {
        name: "dense_traffic",
        seed: 0xDE15E0,
    },
    Scenario {
        name: "multi_group",
        seed: 0x6600BD,
    },
    Scenario {
        name: "extreme_load",
        seed: 0xE7104D,
    },
];

#[derive(Clone, Copy)]
struct Scenario {
    name: &'static str,
    seed: u64,
}

fn main() -> std::io::Result<()> {
    let mode = match std::env::args().nth(1).as_deref() {
        Some("--update-golden") => Mode::Update,
        Some(other) => {
            eprintln!("error: unknown argument {other:?}; expected --update-golden or no args");
            std::process::exit(2);
        }
        None => Mode::Verify,
    };

    let repo_root = repo_root();
    let corpus_dir = repo_root.join("assets").join("contract-corpus");
    let golden_path = corpus_dir.join("golden.txt");

    let mut current: BTreeMap<String, u64> = BTreeMap::new();
    for scenario in SCENARIOS {
        let cfg_path = corpus_dir.join(format!("{}.ron", scenario.name));
        let checksum = run_scenario(&cfg_path, SCENARIO_TICKS, scenario.seed);
        current.insert(scenario.name.to_string(), checksum);
    }

    match mode {
        Mode::Update => {
            let mut buf = String::with_capacity(SCENARIOS.len() * 32);
            buf.push_str("# Golden snapshot checksums for contract scenarios.\n");
            buf.push_str("# Regenerate via: cargo run -p elevator-contract -- --update-golden\n");
            buf.push_str(&format!("# tick budget: {SCENARIO_TICKS}\n"));
            for (name, checksum) in &current {
                buf.push_str(&format!("{name} {checksum:#018x}\n"));
            }
            std::fs::write(&golden_path, buf)?;
            eprintln!(
                "wrote {} ({} scenarios)",
                golden_path.display(),
                current.len()
            );
            Ok(())
        }
        Mode::Verify => {
            let golden = parse_golden(&golden_path)?;
            let mut mismatches: Vec<(String, u64, Option<u64>)> = Vec::new();
            // Forward direction: every scenario in SCENARIOS must
            // have a matching golden entry.
            for (name, computed) in &current {
                match golden.get(name) {
                    Some(&expected) if expected == *computed => {}
                    Some(&expected) => mismatches.push((name.clone(), *computed, Some(expected))),
                    None => mismatches.push((name.clone(), *computed, None)),
                }
            }
            // Reverse direction: a golden entry without a matching
            // scenario is a stale row left behind when SCENARIOS was
            // shrunk. Surface it explicitly so dropped coverage can't
            // silently accumulate.
            let mut stale: Vec<&str> = Vec::new();
            for name in golden.keys() {
                if !current.contains_key(name) {
                    stale.push(name.as_str());
                }
            }

            if mismatches.is_empty() && stale.is_empty() {
                eprintln!(
                    "ok: contract harness passed ({} scenarios match golden)",
                    current.len()
                );
                Ok(())
            } else {
                if !mismatches.is_empty() {
                    eprintln!(
                        "FAIL: {} scenario(s) diverged from golden:",
                        mismatches.len()
                    );
                    for (name, got, expected) in &mismatches {
                        match expected {
                            Some(exp) => {
                                eprintln!("  {name}: expected {exp:#018x}, got {got:#018x}");
                            }
                            None => eprintln!("  {name}: missing from golden, got {got:#018x}"),
                        }
                    }
                }
                if !stale.is_empty() {
                    eprintln!(
                        "FAIL: {} stale golden entr{} (no matching scenario in SCENARIOS):",
                        stale.len(),
                        if stale.len() == 1 { "y" } else { "ies" }
                    );
                    for name in &stale {
                        eprintln!("  {name}");
                    }
                }
                eprintln!();
                eprintln!(
                    "If the divergence is intentional, run:\n  cargo run -p elevator-contract -- --update-golden\nand commit the updated assets/contract-corpus/golden.txt."
                );
                std::process::exit(1);
            }
        }
    }
}

enum Mode {
    Verify,
    Update,
}

fn repo_root() -> PathBuf {
    // CARGO_MANIFEST_DIR points at this crate's manifest; back up two
    // levels to the workspace root.
    let manifest = Path::new(env!("CARGO_MANIFEST_DIR"));
    manifest
        .parent()
        .and_then(Path::parent)
        .map(Path::to_path_buf)
        .unwrap_or_else(|| manifest.to_path_buf())
}

fn run_scenario(cfg_path: &Path, ticks: u64, seed: u64) -> u64 {
    let cfg_text = std::fs::read_to_string(cfg_path)
        .unwrap_or_else(|e| panic!("read {}: {e}", cfg_path.display()));
    let cfg: SimConfig =
        ron::from_str(&cfg_text).unwrap_or_else(|e| panic!("parse {}: {e}", cfg_path.display()));
    let mut sim: Simulation = SimulationBuilder::from_config(cfg.clone())
        .build()
        .unwrap_or_else(|e| panic!("build {}: {e}", cfg_path.display()));
    let mut source = PoissonSource::from_config(&cfg).with_rng(StdRng::seed_from_u64(seed));
    for tick in 0..ticks {
        for req in source.generate(tick) {
            // Spawn errors (over-capacity, no-route, etc.) increment
            // metrics counters that the checksum reads — drop them
            // here so a config that produces a few rejections still
            // yields a deterministic outcome.
            let _ = sim.spawn_rider(req.origin, req.destination, req.weight);
        }
        sim.step();
    }
    sim.snapshot_checksum()
        .unwrap_or_else(|e| panic!("snapshot_checksum {}: {e}", cfg_path.display()))
}

fn parse_golden(path: &Path) -> std::io::Result<BTreeMap<String, u64>> {
    let text = std::fs::read_to_string(path)?;
    let mut out = BTreeMap::new();
    for (lineno, line) in text.lines().enumerate() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        let mut parts = trimmed.split_whitespace();
        let name = parts.next().unwrap_or("");
        let hex = parts.next().unwrap_or("");
        if name.is_empty() {
            panic!(
                "{}:{}: malformed golden line — missing scenario name: {trimmed:?}",
                path.display(),
                lineno + 1
            );
        }
        let Some(stripped) = hex.strip_prefix("0x") else {
            panic!(
                "{}:{}: malformed golden line — checksum must be 0x-prefixed hex: {trimmed:?}",
                path.display(),
                lineno + 1
            );
        };
        let checksum = u64::from_str_radix(stripped, 16).unwrap_or_else(|e| {
            panic!(
                "{}:{}: malformed checksum {hex:?}: {e}",
                path.display(),
                lineno + 1
            )
        });
        out.insert(name.to_string(), checksum);
    }
    Ok(out)
}
