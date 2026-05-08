//! Entry point: parse CLI, branch to interactive or headless mode.

use clap::Parser as _;
use elevator_tui::{app, cli::Cli, config_io, headless, picker};

fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    let config_path = match cli.config {
        Some(path) => path,
        None if cli.headless => {
            anyhow::bail!(
                "headless mode requires --config <path> (no terminal available for picker)"
            );
        }
        None => match picker::pick_scenario()? {
            Some(path) => path,
            None => return Ok(()), // user cancelled
        },
    };
    let config = config_io::load_config(&config_path)?;
    let sim = config_io::build_simulation(&config)?;

    if cli.headless {
        headless::run(sim, &config, cli.until, cli.emit.as_deref(), cli.no_traffic)
    } else {
        app::run(sim, &config, cli.tick_rate, !cli.no_welcome)
    }
}
