//! Interactive event loop: terminal setup, key handling, sim driving,
//! and per-frame rendering.

use std::io::{self, Stdout};
use std::time::{Duration, Instant};

use anyhow::{Context as _, Result};
use crossterm::event::{self, Event as TermEvent, KeyCode, KeyEventKind, KeyModifiers};
use crossterm::execute;
use crossterm::terminal::{EnterAlternateScreen, LeaveAlternateScreen};
use elevator_core::events::EventCategory;
use elevator_core::sim::Simulation;
use ratatui::Terminal;
use ratatui::backend::CrosstermBackend;

use crate::state::{AppState, ShaftMode};
use crate::ui;

/// Run the interactive TUI until the user quits.
///
/// `initial_tick_rate` is multiplied by the sim's configured
/// `ticks_per_second`; `1.0` runs the sim in real wall-clock time.
///
/// # Errors
///
/// Returns the underlying I/O error if terminal setup, polling, or
/// rendering fails. The terminal is always restored on the way out
/// (success, error, or panic via `Drop`).
pub fn run(sim: Simulation, initial_tick_rate: f64) -> Result<()> {
    let mut terminal = setup_terminal().context("setting up terminal")?;
    // RAII: the terminal is restored when `_guard` drops, whether
    // `event_loop` returns Ok, returns Err, or panics.
    let _guard = TerminalGuard;
    event_loop(&mut terminal, sim, initial_tick_rate)
}

/// Frame budget — caps render rate at ~30 fps.
const FRAME_BUDGET: Duration = Duration::from_millis(33);

/// Inner loop, broken out so the terminal restoration in [`run`] runs
/// even when this returns an error.
fn event_loop(
    terminal: &mut Terminal<CrosstermBackend<Stdout>>,
    mut sim: Simulation,
    initial_tick_rate: f64,
) -> Result<()> {
    let mut state = AppState::new(initial_tick_rate);
    let cfg_tps = sim.time().ticks_per_second();
    let mut accumulator = 0.0_f64;
    let mut last = Instant::now();
    let mut status_set_at = Instant::now();

    loop {
        // Drain any input that arrived during the frame.
        let frame_start = Instant::now();
        while let Some(remaining) = FRAME_BUDGET.checked_sub(frame_start.elapsed()) {
            if !event::poll(remaining).context("polling input")? {
                break;
            }
            if let TermEvent::Key(key) = event::read().context("reading input")?
                && key.kind == KeyEventKind::Press
            {
                handle_key(&mut state, &mut sim, key.code, key.modifiers);
            }
            if state.quit {
                return Ok(());
            }
        }

        // Auto-advance the sim if running.
        let now = Instant::now();
        let dt = now.duration_since(last).as_secs_f64();
        last = now;
        if state.paused {
            accumulator = 0.0;
        } else {
            accumulator += dt * state.tick_rate * cfg_tps;
            // Cap how many ticks we'll run inside one frame, then
            // discard any leftover backlog. Without this two failure
            // modes appear:
            //   1. Spin: a 100× rate on a slow terminal would queue
            //      seconds of work into a single frame's loop.
            //   2. Catch-up after a long pause: even with a per-frame
            //      cap, deferred ticks accumulate and the sim races
            //      forward over the next several frames trying to
            //      "catch up" wall time. Discarding the leftover
            //      keeps wall-clock and sim time loosely synced; a
            //      rate slider, not a backlog, is how the user asks
            //      for fast playback.
            let max_per_frame = (cfg_tps * state.tick_rate * 0.1).max(1.0).ceil();
            let mut budget = max_per_frame as u64;
            while accumulator >= 1.0 && budget > 0 {
                step_once(&mut sim, &mut state);
                accumulator -= 1.0;
                budget -= 1;
            }
            if accumulator > max_per_frame {
                accumulator = 0.0;
            }
        }

        // Auto-clear the status banner after a couple of seconds so it
        // doesn't drift indefinitely on the footer.
        if state.status.is_some() && status_set_at.elapsed() > Duration::from_secs(2) {
            state.status = None;
        } else if state.status.is_none() {
            status_set_at = Instant::now();
        }

        terminal
            .draw(|frame| ui::draw(frame, &state, &sim))
            .context("drawing frame")?;
    }
}

/// Drive a single sim tick and drain its events into the rolling log.
fn step_once(sim: &mut Simulation, state: &mut AppState) {
    sim.step();
    let tick = sim.current_tick();
    let drained = sim.drain_events();
    state.push_events(tick, drained);
}

/// Map a single keypress to a state transition (and possibly a sim
/// mutation, for single-step).
fn handle_key(state: &mut AppState, sim: &mut Simulation, code: KeyCode, modifiers: KeyModifiers) {
    if matches!(code, KeyCode::Char('c')) && modifiers.contains(KeyModifiers::CONTROL) {
        state.quit = true;
        return;
    }
    match code {
        KeyCode::Char('q') => state.quit = true,
        KeyCode::Char(' ') => {
            state.paused = !state.paused;
            state.flash(if state.paused { "paused" } else { "running" });
        }
        KeyCode::Char('.') => {
            step_once(sim, state);
            state.flash(format!("step → tick {}", sim.current_tick()));
        }
        KeyCode::Char(',') => {
            for _ in 0..10 {
                step_once(sim, state);
            }
            state.flash(format!("step ×10 → tick {}", sim.current_tick()));
        }
        KeyCode::Char('+' | '=') => {
            state.tick_rate = (state.tick_rate * 2.0).min(64.0);
            state.flash(format!("rate {:.2}×", state.tick_rate));
        }
        KeyCode::Char('-' | '_') => {
            state.tick_rate = (state.tick_rate / 2.0).max(0.0625);
            state.flash(format!("rate {:.2}×", state.tick_rate));
        }
        KeyCode::Char('m') => {
            state.shaft_mode = match state.shaft_mode {
                ShaftMode::Index => ShaftMode::Distance,
                ShaftMode::Distance => ShaftMode::Index,
            };
            state.flash(format!("shaft: {:?}", state.shaft_mode));
        }
        KeyCode::Char(']') => {
            let count = ui::shaft::cars_iter(sim).count();
            if count > 0 {
                state.focused_car_idx = (state.focused_car_idx + 1) % count;
            }
        }
        KeyCode::Char('[') => {
            let count = ui::shaft::cars_iter(sim).count();
            if count > 0 {
                state.focused_car_idx = (state.focused_car_idx + count - 1) % count;
            }
        }
        KeyCode::Char('f') => {
            state.follow_focused = !state.follow_focused;
            state.flash(if state.follow_focused {
                "follow on"
            } else {
                "follow off"
            });
        }
        KeyCode::Char(digit @ '1'..='7') => {
            if let Some(category) = digit_to_category(digit) {
                state.toggle_category(category);
                state.flash(format!("toggle {category:?}"));
            }
        }
        _ => {}
    }
}

/// Map a digit `1..=7` to the matching [`EventCategory`] in declaration order.
#[must_use]
const fn digit_to_category(d: char) -> Option<EventCategory> {
    Some(match d {
        '1' => EventCategory::Elevator,
        '2' => EventCategory::Rider,
        '3' => EventCategory::Dispatch,
        '4' => EventCategory::Topology,
        '5' => EventCategory::Reposition,
        '6' => EventCategory::Direction,
        '7' => EventCategory::Observability,
        _ => return None,
    })
}

/// Switch the terminal into raw mode + alternate screen and wrap it
/// in a [`Terminal`] backed by [`CrosstermBackend`].
fn setup_terminal() -> io::Result<Terminal<CrosstermBackend<Stdout>>> {
    crossterm::terminal::enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen)?;
    Terminal::new(CrosstermBackend::new(stdout))
}

/// RAII guard that restores the terminal on drop. Acts as the safety
/// net for panics inside [`event_loop`].
struct TerminalGuard;

impl Drop for TerminalGuard {
    fn drop(&mut self) {
        let _ = crossterm::terminal::disable_raw_mode();
        let _ = execute!(io::stdout(), LeaveAlternateScreen);
    }
}

#[cfg(test)]
#[allow(clippy::expect_used, clippy::panic, clippy::unwrap_used)]
mod tests {
    use super::*;
    use elevator_core::dispatch::scan::ScanDispatch;

    fn demo_sim() -> Simulation {
        elevator_core::builder::SimulationBuilder::demo()
            .dispatch(ScanDispatch::new())
            .build()
            .expect("demo builder must succeed")
    }

    #[test]
    fn space_toggles_pause() {
        let mut state = AppState::new(1.0);
        let mut sim = demo_sim();
        assert!(!state.paused);
        handle_key(&mut state, &mut sim, KeyCode::Char(' '), KeyModifiers::NONE);
        assert!(state.paused);
        handle_key(&mut state, &mut sim, KeyCode::Char(' '), KeyModifiers::NONE);
        assert!(!state.paused);
    }

    #[test]
    fn dot_advances_one_tick() {
        let mut state = AppState::new(1.0);
        let mut sim = demo_sim();
        let before = sim.current_tick();
        handle_key(&mut state, &mut sim, KeyCode::Char('.'), KeyModifiers::NONE);
        assert_eq!(sim.current_tick(), before + 1);
    }

    #[test]
    fn rate_clamps_to_safe_bounds() {
        let mut state = AppState::new(1.0);
        let mut sim = demo_sim();
        for _ in 0..20 {
            handle_key(&mut state, &mut sim, KeyCode::Char('+'), KeyModifiers::NONE);
        }
        assert!(state.tick_rate <= 64.0);
        for _ in 0..20 {
            handle_key(&mut state, &mut sim, KeyCode::Char('-'), KeyModifiers::NONE);
        }
        assert!(state.tick_rate >= 0.0625);
    }

    #[test]
    fn category_digit_keys_toggle_filters() {
        let mut state = AppState::new(1.0);
        let mut sim = demo_sim();
        let before = state.category_filter.len();
        handle_key(&mut state, &mut sim, KeyCode::Char('2'), KeyModifiers::NONE);
        assert_eq!(state.category_filter.len(), before - 1);
    }

    #[test]
    fn ctrl_c_quits() {
        let mut state = AppState::new(1.0);
        let mut sim = demo_sim();
        handle_key(
            &mut state,
            &mut sim,
            KeyCode::Char('c'),
            KeyModifiers::CONTROL,
        );
        assert!(state.quit);
    }
}
