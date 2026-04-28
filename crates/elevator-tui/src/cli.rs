//! Command-line interface definition.

use std::path::PathBuf;

use clap::Parser;

/// Terminal UI debugger for elevator-core.
#[derive(Debug, Parser)]
#[command(version, about)]
pub struct Cli {
    /// Path to a RON `SimConfig` file (e.g. `assets/config/default.ron`).
    pub config: PathBuf,

    /// Run non-interactively: step the sim, print summary, exit.
    #[arg(long)]
    pub headless: bool,

    /// In headless mode, the absolute tick to stop at. Ignored when
    /// interactive. Defaults to 1000.
    #[arg(long, default_value_t = 1000)]
    pub until: u64,

    /// In headless mode, optional path to write the drained event stream
    /// as JSON. Ignored when interactive.
    #[arg(long)]
    pub emit: Option<PathBuf>,

    /// Initial interactive tick rate as a multiplier of the config's
    /// `ticks_per_second`. `1.0` = real-time. Adjust live with `+`/`-`.
    #[arg(long, default_value_t = 1.0)]
    pub tick_rate: f64,

    /// In headless mode, skip Poisson traffic generation. Useful when
    /// you want to step a sim that's already been seeded externally
    /// (snapshot restore, scripted spawn, etc.) without diluting it
    /// with new arrivals. Ignored when interactive.
    #[arg(long)]
    pub no_traffic: bool,

    /// Suppress the first-launch welcome overlay. Ignored in headless
    /// mode; intended for scripted demos / screen recordings where the
    /// overlay would obscure the first frames.
    #[arg(long)]
    pub no_welcome: bool,
}
