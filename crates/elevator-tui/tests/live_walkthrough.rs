//! End-to-end smoke: load `default.ron`, drive a `PoissonSource` for
//! 300 ticks (matching the interactive runner's tick-by-tick path), and
//! verify the sim actually moved.
//!
//! What this catches that the other snapshot tests don't:
//!   - The interactive runner forgetting to drive Poisson traffic — a
//!     bug that left the events panel and metrics blank in any live
//!     session even though headless mode worked. Asserting
//!     `total_spawned() > 0` is enough; a full-frame snapshot would be
//!     brittle because `PoissonSource` is unseeded.
//!   - `default.ron` regressions: a config that builds but never spawns
//!     riders inside 300 ticks would still pass headless's CLI checks
//!     but produce a useless first-launch experience.
//!
//! Unit tests in `src/` cover `AppState` mechanics; this one exercises
//! the integration path the user actually sees on `cargo run`.

#![allow(clippy::expect_used, clippy::unwrap_used, clippy::panic)]

use elevator_core::traffic::{PoissonSource, TrafficSource as _};
use elevator_tui::config_io;

#[test]
fn live_default_traffic_drives_spawns() {
    // Tests run with cwd = crate root; assets/ lives at the workspace root.
    let cfg = config_io::load_config(std::path::Path::new("../../assets/config/default.ron"))
        .expect("load default.ron");
    let mut sim = config_io::build_simulation(&cfg).expect("build sim");
    let mut traffic = PoissonSource::from_config(&cfg);

    // Mirror exactly what `app::step_once` does each tick: ask the
    // traffic source for spawn requests, hand them to the sim, then
    // step. Anything else is a different code path and wouldn't catch
    // the regression this test exists for.
    while sim.current_tick() < 300 {
        for req in traffic.generate(sim.current_tick()) {
            let _ = sim.spawn_rider(req.origin, req.destination, req.weight);
        }
        sim.step();
        let _ = sim.drain_events();
    }

    // 300 ticks at a 30-tick Poisson mean → 10 expected spawns; even at
    // the very low tail of the distribution we should comfortably clear
    // 1. A zero count means the runner skipped Poisson generation
    // (the original bug) or the config parsed without `passenger_spawning`.
    let spawned = sim.metrics().total_spawned();
    assert!(
        spawned > 0,
        "default.ron should produce spawns within 300 ticks (got {spawned}); \
         did the interactive runner stop driving the Poisson source?"
    );
}
