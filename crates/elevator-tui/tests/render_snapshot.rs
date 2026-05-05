#![allow(clippy::expect_used, clippy::unwrap_used, clippy::panic)]
//! Snapshot test: render one frame against a known fixture and pin
//! the resulting buffer with `insta`.
//!
//! What this catches:
//!   - Layout regressions (panel widths/heights, missing borders).
//!   - Format-string drift in the title / footer / per-line widgets.
//!   - Accidental field renames in `Event` / `Elevator` / `Stop` that
//!     change how the TUI renders them.
//!
//! What this *doesn't* catch:
//!   - Live behaviour (key handling, follow-mode filtering, sparkline
//!     evolution). Those are covered by unit tests in `src/`.
//!
//! Snapshots are regenerated with `INSTA_UPDATE=auto cargo test`.

use elevator_core::dispatch::scan::ScanDispatch;
use elevator_core::sim::Simulation;
use elevator_tui::state::{AppState, ShaftMode};
use elevator_tui::ui;
use ratatui::Terminal;
use ratatui::backend::TestBackend;

fn render(sim: &Simulation, state: &AppState, width: u16, height: u16) -> String {
    let backend = TestBackend::new(width, height);
    let mut terminal = Terminal::new(backend).expect("test terminal");
    terminal
        .draw(|frame| ui::draw(frame, state, sim))
        .expect("draw");
    let buffer = terminal.backend().buffer().clone();
    let mut out = String::new();
    for y in 0..buffer.area.height {
        for x in 0..buffer.area.width {
            out.push_str(buffer[(x, y)].symbol());
        }
        out.push('\n');
    }
    out
}

fn demo_sim(steps: u64) -> Simulation {
    let mut sim = elevator_core::builder::SimulationBuilder::demo()
        .dispatch(ScanDispatch::new())
        .build()
        .expect("demo sim builds");
    sim.spawn_rider(
        elevator_core::stop::StopId(0),
        elevator_core::stop::StopId(1),
        75.0,
    )
    .expect("spawn rider");
    for _ in 0..steps {
        sim.step();
    }
    sim
}

#[test]
fn frame_renders_after_a_few_ticks() {
    let sim = demo_sim(120);
    let state = AppState::new(1.0).without_welcome();
    let frame = render(&sim, &state, 100, 30);
    insta::assert_snapshot!("default_after_120_ticks", frame);
}

#[test]
fn frame_in_distance_mode() {
    let sim = demo_sim(60);
    let mut state = AppState::new(1.0).without_welcome();
    state.shaft_mode = ShaftMode::Distance;
    let frame = render(&sim, &state, 100, 30);
    insta::assert_snapshot!("distance_mode_after_60_ticks", frame);
}

#[test]
fn frame_with_welcome_overlay() {
    let sim = demo_sim(60);
    let state = AppState::new(1.0); // welcome shown by default
    let frame = render(&sim, &state, 100, 30);
    insta::assert_snapshot!("welcome_overlay", frame);
}

#[test]
fn frame_with_help_overlay() {
    let sim = demo_sim(60);
    let mut state = AppState::new(1.0).without_welcome();
    state.overlay = Some(elevator_tui::state::UiOverlay::Help);
    let frame = render(&sim, &state, 100, 30);
    insta::assert_snapshot!("help_overlay", frame);
}
