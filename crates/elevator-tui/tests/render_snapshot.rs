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
fn frame_with_drilldown_open_overrides_footer() {
    // Pins the fix for greptile's DrillDown/footer-hint mismatch:
    // when the right column is owned by drilldown, the footer label
    // and key hints describe drilldown rather than the underlying
    // focused pane (which is hidden behind the drilldown panel).
    let sim = demo_sim(60);
    let mut state = AppState::new(1.0).without_welcome();
    state.focused_pane = elevator_tui::state::FocusedPane::Events;
    state.right_panel = elevator_tui::state::RightPanel::DrillDown;
    let frame = render(&sim, &state, 100, 30);
    insta::assert_snapshot!("drilldown_footer_overrides_pane_hints", frame);
}

#[test]
fn frame_with_events_pane_focused() {
    // Pins the "Tab cycled to events" outcome: events panel border
    // brightens to the accent, footer hints adapt to events-pane verbs.
    let sim = demo_sim(120);
    let mut state = AppState::new(1.0).without_welcome();
    state.focused_pane = elevator_tui::state::FocusedPane::Events;
    let frame = render(&sim, &state, 100, 30);
    insta::assert_snapshot!("events_pane_focused", frame);
}

#[test]
fn frame_renders_loop_topology_as_horizontal_strip() {
    // The shipped loop demo exercises the LoopSweep + cyclic motion +
    // door FSM continuation path end-to-end. Render after a few
    // hundred ticks — long enough for both cars to be patrolling,
    // doors cycling, and waiters accumulating. The buffer must
    // contain the seam markers (`┃`) at each strip end and a car
    // glyph (`▼`) somewhere on the cars-overlay row. Existence of
    // those glyphs is what differentiates the loop strip from the
    // vertical shaft view, so this is the load-bearing assertion.
    use elevator_core::config::SimConfig;
    use elevator_core::dispatch::LoopSweepDispatch;

    let ron_str = include_str!("../../../assets/config/loop_demo.ron");
    let config: SimConfig = ron::from_str(ron_str).expect("loop_demo deserializes");
    let mut sim = Simulation::new(&config, LoopSweepDispatch::new()).expect("loop_demo constructs");
    for _ in 0..600 {
        sim.step();
    }

    let state = AppState::new(1.0).without_welcome();
    let frame = render(&sim, &state, 100, 30);

    assert!(
        frame.contains('┃'),
        "loop topology must render seam markers in the strip; got:\n{frame}"
    );
    assert!(
        frame.contains('▼') || frame.contains('★'),
        "loop topology must render at least one car glyph on the overlay row; got:\n{frame}"
    );
    // Don't snapshot this one — the precise glyph layout depends on
    // the RNG seed for rider spawning and the exact tick at which
    // each car arrives. Behavioural-glyph assertions stay stable
    // across RON-schema drift; the existing snapshot tests cover
    // the Linear path's full-pixel buffer.
}

#[test]
fn frame_with_help_overlay() {
    // The help modal grew with the events-pane scroll/filter section
    // landing in PR2. Render at a taller viewport so every binding is
    // legible — most terminals are >= 30 rows in practice. PR7 will
    // revisit the layout for ≤ 24-row terminals.
    let sim = demo_sim(60);
    let mut state = AppState::new(1.0).without_welcome();
    state.overlay = Some(elevator_tui::state::UiOverlay::Help);
    let frame = render(&sim, &state, 100, 40);
    insta::assert_snapshot!("help_overlay", frame);
}

#[test]
fn frame_with_filter_input_open() {
    // Pins the / filter prompt visible in the footer while the user
    // is typing.
    let sim = demo_sim(120);
    let mut state = AppState::new(1.0).without_welcome();
    state.focused_pane = elevator_tui::state::FocusedPane::Events;
    state.pending_filter = Some("rider".into());
    let frame = render(&sim, &state, 100, 30);
    insta::assert_snapshot!("filter_input_open", frame);
}

#[test]
fn frame_with_command_palette_open() {
    // Pins the `:` palette prompt visible in the footer while the
    // user is typing a verb.
    let sim = demo_sim(120);
    let mut state = AppState::new(1.0).without_welcome();
    state.pending_command = Some("metr".into());
    let frame = render(&sim, &state, 100, 30);
    insta::assert_snapshot!("command_palette_open", frame);
}

#[test]
fn frame_with_committed_filter_and_scroll() {
    // Pins the events-panel suffix updating when a filter is active
    // and the user has scrolled into the log.
    let sim = demo_sim(120);
    let mut state = AppState::new(1.0).without_welcome();
    state.focused_pane = elevator_tui::state::FocusedPane::Events;
    state.events_filter = "rider".into();
    state.events_scroll = 3;
    let frame = render(&sim, &state, 100, 30);
    insta::assert_snapshot!("filter_and_scroll", frame);
}
