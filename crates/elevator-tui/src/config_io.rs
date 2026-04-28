//! RON config loading + simulation construction.
//!
//! Mirrors what `elevator-bevy` does: read the file, parse as
//! [`SimConfig`], hand it to a fresh [`Simulation`] with a default
//! dispatch strategy.

use std::path::Path;

use anyhow::{Context as _, Result};
use elevator_core::config::SimConfig;
use elevator_core::dispatch::scan::ScanDispatch;
use elevator_core::sim::Simulation;

/// Read a RON config from `path`.
///
/// # Errors
///
/// Returns the underlying I/O error if the file cannot be read, or the
/// RON deserialize error if it cannot be parsed.
pub fn load_config(path: &Path) -> Result<SimConfig> {
    let raw = std::fs::read_to_string(path)
        .with_context(|| format!("reading config: {}", path.display()))?;
    ron::from_str(&raw).with_context(|| format!("parsing config: {}", path.display()))
}

/// Build a [`Simulation`] from a parsed [`SimConfig`].
///
/// Uses [`ScanDispatch`] as the default strategy. Strategy selection is
/// intentionally not exposed yet — the TUI's purpose is to debug
/// whatever strategy the config opts into via `GroupConfig.dispatch`,
/// and `ScanDispatch` only acts as the fallback for groups that don't
/// override.
///
/// # Errors
///
/// Returns the validation error from [`Simulation::new`] if the config
/// is structurally invalid.
pub fn build_simulation(config: &SimConfig) -> Result<Simulation> {
    Simulation::new(config, ScanDispatch::new()).context("building simulation from config")
}
