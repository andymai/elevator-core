//! Entry point: parse CLI, branch to interactive or headless mode.

use clap::Parser as _;
use elevator_tui::{app, cli::Cli, config_io, headless};

fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    let config = config_io::load_config(&cli.config)?;
    let sim = config_io::build_simulation(&config)?;

    if cli.headless {
        headless::run(sim, &config, cli.until, cli.emit.as_deref(), cli.no_traffic)
    } else {
        app::run(sim, cli.tick_rate)
    }
}
