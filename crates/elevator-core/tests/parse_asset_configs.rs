//! Smoke test: every RON config under `assets/config/` parses into a
//! `SimConfig`, builds a `Simulation`, and survives a handful of ticks.
//!
//! These files are referenced by the README (`cargo run -- assets/config/...`)
//! and the FFI harness, so schema drift that breaks them is a user-visible
//! regression. CI catches it here before publish.

#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use std::fs;
use std::path::Path;

use elevator_core::config::SimConfig;
use elevator_core::prelude::*;

#[test]
fn every_asset_config_parses_and_builds() {
    let config_dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../assets/config");
    let mut seen = 0;

    for entry in
        fs::read_dir(&config_dir).unwrap_or_else(|e| panic!("read {}: {e}", config_dir.display()))
    {
        let path = entry.expect("dir entry").path();
        if path.extension().and_then(|e| e.to_str()) != Some("ron") {
            continue;
        }
        seen += 1;

        let ron_str =
            fs::read_to_string(&path).unwrap_or_else(|e| panic!("read {}: {e}", path.display()));
        let config: SimConfig =
            ron::from_str(&ron_str).unwrap_or_else(|e| panic!("parse {}: {e}", path.display()));

        let mut sim = SimulationBuilder::from_config(config)
            .build()
            .unwrap_or_else(|e| panic!("build {}: {e}", path.display()));

        // Step past construction to surface any runtime invariant
        // violations latent in the config (e.g., an elevator starting
        // at an unserviceable stop).
        for _ in 0..10 {
            sim.step();
        }
    }

    assert!(seen > 0, "no .ron files found in {}", config_dir.display());
}
