//! Cross-target contract test: wasm32 host.
//!
//! Compiles the same `Simulation` driver loop as the rust-host harness
//! in `crates/elevator-contract/`, runs it on wasm32 inside a
//! wasm-bindgen-test runner, and asserts the resulting
//! `snapshot_checksum` matches the golden value committed in
//! `assets/contract-corpus/golden.txt`. A divergence between the
//! native and wasm32 build of `elevator-core` (`HashMap` iteration
//! drift, FP semantics, `getrandom` impl difference, etc.) surfaces
//! here as a checksum mismatch keyed by scenario name.
//!
//! Invoked via:
//!
//! ```sh
//! cargo test -p elevator-wasm --target wasm32-unknown-unknown
//! ```
//!
//! Requires `wasm-bindgen-test-runner` on PATH; the workspace
//! `.cargo/config.toml` wires this up automatically for the wasm32
//! target.

use elevator_core::builder::SimulationBuilder;
use elevator_core::config::SimConfig;
use elevator_core::traffic::{PoissonSource, TrafficSource};
use rand::SeedableRng;
use rand::rngs::StdRng;
use wasm_bindgen_test::wasm_bindgen_test;

const SCENARIO_TICKS: u64 = 600;

const DEFAULT_RON: &str = include_str!("../../../assets/contract-corpus/default.ron");
const SPARSE_RON: &str = include_str!("../../../assets/contract-corpus/sparse.ron");
const DENSE_TRAFFIC_RON: &str = include_str!("../../../assets/contract-corpus/dense_traffic.ron");
const MULTI_GROUP_RON: &str = include_str!("../../../assets/contract-corpus/multi_group.ron");
const EXTREME_LOAD_RON: &str = include_str!("../../../assets/contract-corpus/extreme_load.ron");
const GOLDEN_TXT: &str = include_str!("../../../assets/contract-corpus/golden.txt");

/// Drive one scenario for [`SCENARIO_TICKS`] ticks under a Poisson
/// rider stream seeded with `seed`, then return the FNV checksum of
/// the resulting snapshot bytes.
///
/// Identical to `crates/elevator-contract/src/main.rs::run_scenario`
/// in shape — keep them in lockstep so a divergence fingers an actual
/// `elevator-core` cross-target drift, not a harness mismatch.
fn run_scenario(cfg_text: &str, seed: u64) -> u64 {
    let cfg: SimConfig = ron::from_str(cfg_text).expect("parse scenario RON");
    let mut sim = SimulationBuilder::from_config(cfg.clone())
        .build()
        .expect("build sim");
    let mut source = PoissonSource::from_config(&cfg).with_rng(StdRng::seed_from_u64(seed));
    for tick in 0..SCENARIO_TICKS {
        for req in source.generate(tick) {
            let _ = sim.spawn_rider(req.origin, req.destination, req.weight);
        }
        sim.step();
    }
    sim.snapshot_checksum().expect("snapshot_checksum")
}

/// Pull the golden checksum for `name` out of the workspace's
/// `golden.txt` corpus. Format mirrors the rust-host parser:
/// `<name> 0x<hex>` per line, `#` comments skipped.
fn golden_for(name: &str) -> u64 {
    for line in GOLDEN_TXT.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        let mut parts = trimmed.split_whitespace();
        let scenario = parts.next().unwrap_or("");
        let hex = parts.next().unwrap_or("");
        if scenario == name {
            let stripped = hex
                .strip_prefix("0x")
                .unwrap_or_else(|| panic!("golden {name}: missing 0x prefix in {hex:?}"));
            return u64::from_str_radix(stripped, 16)
                .unwrap_or_else(|e| panic!("golden {name}: parse {hex:?}: {e}"));
        }
    }
    panic!("golden.txt missing entry for {name:?}");
}

fn assert_scenario(name: &str, ron: &str, seed: u64) {
    let computed = run_scenario(ron, seed);
    let expected = golden_for(name);
    assert_eq!(
        computed, expected,
        "wasm32 scenario {name:?}: expected {expected:#018x}, got {computed:#018x}; \
         either a cross-target compilation divergence or an unintended core change"
    );
}

#[wasm_bindgen_test]
fn contract_default() {
    assert_scenario("default", DEFAULT_RON, 0x00D0_FA17);
}

#[wasm_bindgen_test]
fn contract_sparse() {
    assert_scenario("sparse", SPARSE_RON, 0x0051_41FE);
}

#[wasm_bindgen_test]
fn contract_dense_traffic() {
    assert_scenario("dense_traffic", DENSE_TRAFFIC_RON, 0x00DE_15E0);
}

#[wasm_bindgen_test]
fn contract_multi_group() {
    assert_scenario("multi_group", MULTI_GROUP_RON, 0x0066_00BD);
}

#[wasm_bindgen_test]
fn contract_extreme_load() {
    assert_scenario("extreme_load", EXTREME_LOAD_RON, 0x00E7_104D);
}
