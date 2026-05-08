//! Interactive event loop: terminal setup, key handling, sim driving,
//! and per-frame rendering.

use std::io::{self, Stdout};
use std::time::{Duration, Instant};

use anyhow::{Context as _, Result};
use crossterm::event::{
    self, DisableMouseCapture, EnableMouseCapture, Event as TermEvent, KeyCode, KeyEventKind,
    KeyModifiers, MouseButton, MouseEvent, MouseEventKind,
};
use crossterm::execute;
use crossterm::terminal::{EnterAlternateScreen, LeaveAlternateScreen};
use elevator_core::config::SimConfig;
use elevator_core::events::EventCategory;
use elevator_core::sim::Simulation;
use elevator_core::traffic::{PoissonSource, TrafficSource as _};
use ratatui::Terminal;
use ratatui::backend::CrosstermBackend;

use crate::state::{
    AppState, FocusedPane, RightPanel, ScrollMotion, ShaftMode, Sparkline, UiOverlay,
};
use crate::ui;

/// Run the interactive TUI until the user quits.
///
/// `initial_tick_rate` is multiplied by the sim's configured
/// `ticks_per_second`; `1.0` runs the sim in real wall-clock time.
/// When `show_welcome` is `false`, the first-launch welcome overlay is
/// suppressed (e.g. `--no-welcome`).
///
/// `config` is required so the interactive loop can drive a
/// [`PoissonSource`] each tick — without it the sim has no built-in
/// spawner and the TUI sits forever on an empty event stream.
///
/// # Errors
///
/// Returns the underlying I/O error if terminal setup, polling, or
/// rendering fails. The terminal is always restored on the way out
/// (success, error, or panic via `Drop`).
pub fn run(
    sim: Simulation,
    config: &SimConfig,
    initial_tick_rate: f64,
    show_welcome: bool,
) -> Result<()> {
    let mut terminal = setup_terminal().context("setting up terminal")?;
    // RAII: the terminal is restored when `_guard` drops, whether
    // `event_loop` returns Ok, returns Err, or panics.
    let _guard = TerminalGuard;
    event_loop(&mut terminal, sim, config, initial_tick_rate, show_welcome)
}

/// Frame budget — caps render rate at ~144 fps.
///
/// The aggressive cap is what sells the sub-cell shaft motion landing
/// in PR4: at 144 Hz a car interpolating between rows updates roughly
/// every 7 ms, which is below the threshold most viewers perceive as
/// discrete steps. ratatui's diffing only writes changed cells, so the
/// per-frame work is small even on slow terminals; the cap is a safety
/// net, not a target the loop has to hit every iteration.
const FRAME_BUDGET: Duration = Duration::from_millis(7);

/// Inner loop, broken out so the terminal restoration in [`run`] runs
/// even when this returns an error.
fn event_loop(
    terminal: &mut Terminal<CrosstermBackend<Stdout>>,
    mut sim: Simulation,
    config: &SimConfig,
    initial_tick_rate: f64,
    show_welcome: bool,
) -> Result<()> {
    let mut state = AppState::new(initial_tick_rate);
    if !show_welcome {
        state = state.without_welcome();
    }
    let mut traffic = PoissonSource::from_config(config);
    let cfg_tps = sim.time().ticks_per_second();
    let mut accumulator = 0.0_f64;
    let mut last = Instant::now();
    let mut status_set_at = Instant::now();
    let mut last_status_seq = state.status_seq;

    loop {
        // Drain any input that arrived during the frame.
        let frame_start = Instant::now();
        while let Some(remaining) = FRAME_BUDGET.checked_sub(frame_start.elapsed()) {
            if !event::poll(remaining).context("polling input")? {
                break;
            }
            match event::read().context("reading input")? {
                TermEvent::Key(key) if key.kind == KeyEventKind::Press => {
                    handle_key(&mut state, &mut sim, key.code, key.modifiers);
                }
                TermEvent::Mouse(mouse) => handle_mouse(&mut state, &mut sim, mouse),
                _ => {}
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
                step_once(&mut sim, &mut traffic, &mut state);
                accumulator -= 1.0;
                budget -= 1;
            }
            if accumulator > max_per_frame {
                accumulator = 0.0;
            }
        }

        // Auto-clear the status banner after a couple of seconds so it
        // doesn't drift indefinitely on the footer. The wall-clock
        // timer is reset whenever `state.flash()` ran since the last
        // frame (detected via `status_seq`), so a back-to-back
        // replacement gets the full display window — fixing the bug
        // where a 1.9 s-old flash being replaced would vanish ~0.1 s
        // later.
        if state.status_seq != last_status_seq {
            status_set_at = Instant::now();
            last_status_seq = state.status_seq;
        }
        if state.status.is_some() && status_set_at.elapsed() > Duration::from_secs(2) {
            state.status = None;
        }

        terminal
            .draw(|frame| ui::draw(frame, &state, &sim))
            .context("drawing frame")?;
    }
}

/// Drive a single sim tick (with Poisson spawning), drain events,
/// update sparklines.
///
/// Spawn requests are issued *before* the step so each new rider is in
/// place before the dispatcher runs its planning pass. Failed spawns
/// are silently dropped — they generally point at a config/topology
/// mismatch and the next tick's request will tell the same story
/// without us spamming the events panel.
fn step_once(sim: &mut Simulation, traffic: &mut PoissonSource, state: &mut AppState) {
    for req in traffic.generate(sim.current_tick()) {
        let _ = sim.spawn_rider(req.origin, req.destination, req.weight);
    }
    sim.step();
    record_step(sim, state);
}

/// Step variant used when no traffic source is in scope (manual `.`
/// stepping in unit tests, primarily). Doesn't spawn riders.
fn step_no_traffic(sim: &mut Simulation, state: &mut AppState) {
    sim.step();
    record_step(sim, state);
}

/// Post-step bookkeeping: drain events into the log, update sparklines,
/// roll the spawn bucket. Runs after every step — auto or manual.
fn record_step(sim: &mut Simulation, state: &mut AppState) {
    let tick = sim.current_tick();
    let drained = sim.drain_events();
    let mut spawned: u64 = 0;
    let flash_expiry = tick + crate::state::FLASH_DURATION_TICKS;
    for event in &drained {
        match event {
            elevator_core::events::Event::RiderSpawned { .. } => spawned += 1,
            // Set / refresh the accent flash for the elevator that
            // arrived or whose doors opened — the eye-catch readers
            // rely on at-a-glance.
            elevator_core::events::Event::ElevatorArrived { elevator, .. }
            | elevator_core::events::Event::DoorOpened { elevator, .. } => {
                state.flash_until.insert(*elevator, flash_expiry);
            }
            _ => {}
        }
    }
    for _ in 0..spawned {
        state.observe_spawn();
    }
    // GC expired flashes so the map stays bounded by live entity count.
    state.flash_until.retain(|_, exp| *exp > tick);
    state.push_events(tick, drained);

    state.wait_sparkline.push(sim.metrics().p95_wait_time());
    let total_occupancy: usize = ui::shaft::cars_iter(sim).map(|car| car.riders.len()).sum();
    state.occupancy_sparkline.push(total_occupancy as u64);
    state.advance_spawn_bucket(tick, sim.time().ticks_per_second());

    // Auto-snapshot for the time scrubber. Skipped while the user is
    // *in* scrub mode — record_step still runs there if they manual-
    // step `.` while paused, but we don't want to pollute the ring
    // with replay-induced snapshots.
    if state.scrub_offset.is_none() && tick.is_multiple_of(crate::state::SNAPSHOT_INTERVAL_TICKS) {
        if state.snapshot_ring.len() == crate::state::SNAPSHOT_RING_CAP {
            state.snapshot_ring.pop_front();
        }
        state.snapshot_ring.push_back(crate::state::RingEntry {
            tick,
            snapshot: sim.snapshot(),
        });
    }
}

/// Map a single keypress to a state transition (and possibly a sim
/// mutation, for single-step).
///
/// Top-level dispatcher: routes to the mode-specific handler based
/// on which overlay (if any) is active. The breakdown by mode keeps
/// each binding independently reviewable and lets new bindings land
/// without affecting unrelated overlays.
fn handle_key(state: &mut AppState, sim: &mut Simulation, code: KeyCode, modifiers: KeyModifiers) {
    // Ctrl-C escapes every mode, including overlays and filter input.
    if matches!(code, KeyCode::Char('c')) && modifiers.contains(KeyModifiers::CONTROL) {
        state.quit = true;
        return;
    }
    match state.overlay {
        Some(UiOverlay::Welcome) => {
            handle_key_welcome(state);
            return;
        }
        Some(UiOverlay::Help) => {
            handle_key_help(state, code);
            return;
        }
        None => {}
    }
    // Filter-input mode swallows most keys so the user can type a
    // query containing `q`, `j`, `:`, etc. without firing the global
    // bindings. Only Ctrl-C above and the four control keys below
    // affect the input itself.
    if state.pending_filter.is_some() {
        handle_key_filter_input(state, code);
        return;
    }
    if state.pending_command.is_some() {
        handle_key_command_input(state, sim, code);
        return;
    }
    handle_key_main(state, sim, code, modifiers);
}

/// Mouse handler — wheel scrolls the events pane (when focused),
/// left-click on a tracked pane refocuses it, scroll over a pane
/// also refocuses it as a side effect of the wheel motion. Click
/// on a car or event row is deferred to a follow-up PR.
fn handle_mouse(state: &mut AppState, _sim: &mut Simulation, mouse: MouseEvent) {
    // While the drilldown popup is up it overlays parts of the right
    // column. `pane_rects` still tracks the panes underneath, so a
    // click landing inside the popup that happens to fall over the
    // events / metrics rect would silently change focus on hidden
    // content. Skip click-to-focus entirely until the popup closes.
    let popup_active = state.right_panel == RightPanel::DrillDown;
    let rects = state.pane_rects.get();
    let (col, row) = (mouse.column, mouse.row);
    match mouse.kind {
        MouseEventKind::Down(MouseButton::Left) if !popup_active => {
            if let Some(pane) = rects.hit(col, row) {
                state.focused_pane = pane;
                state.flash(format!("focus → {}", pane.label()));
            }
        }
        MouseEventKind::ScrollUp
            if rects.events.is_some_and(|b| b.contains(col, row))
                || state.focused_pane == FocusedPane::Events =>
        {
            state.scroll_events(crate::state::ScrollMotion::Up);
        }
        MouseEventKind::ScrollDown
            if rects.events.is_some_and(|b| b.contains(col, row))
                || state.focused_pane == FocusedPane::Events =>
        {
            state.scroll_events(crate::state::ScrollMotion::Down);
        }
        _ => {}
    }
}

/// Filter-input handler — keys flow into `state.pending_filter`
/// until Enter commits or Esc cancels.
fn handle_key_filter_input(state: &mut AppState, code: KeyCode) {
    match code {
        KeyCode::Esc => state.filter_input_cancel(),
        KeyCode::Enter => state.filter_input_commit(),
        KeyCode::Backspace => state.filter_input_backspace(),
        KeyCode::Char(c) => state.filter_input_push(c),
        _ => {}
    }
}

/// Command-palette handler — keys flow into `state.pending_command`
/// until Enter dispatches the verb or Esc cancels.
fn handle_key_command_input(state: &mut AppState, sim: &mut Simulation, code: KeyCode) {
    match code {
        KeyCode::Esc => state.command_input_cancel(),
        KeyCode::Enter => {
            if let Some(buf) = state.command_input_take() {
                execute_command(state, sim, buf.trim());
            }
        }
        KeyCode::Backspace => state.command_input_backspace(),
        KeyCode::Char(c) => state.command_input_push(c),
        _ => {}
    }
}

/// Parse and execute a command typed into the `:` palette. Unknown
/// commands raise a status flash so the user sees the typo without a
/// silent failure.
fn execute_command(state: &mut AppState, _sim: &mut Simulation, raw: &str) {
    if raw.is_empty() {
        return;
    }
    let mut parts = raw.split_whitespace();
    let Some(verb) = parts.next() else { return };
    match verb {
        "shaft" | "dispatch" | "events" | "metrics" | "traffic" => {
            // Pane targets only meaningful in Overview mode; Esc out
            // of drilldown first to make the focus change visible.
            if state.right_panel == RightPanel::DrillDown {
                state.right_panel = RightPanel::Overview;
            }
            let pane = match verb {
                "shaft" => FocusedPane::Shaft,
                "dispatch" => FocusedPane::Dispatch,
                "events" => FocusedPane::Events,
                "metrics" => FocusedPane::Metrics,
                "traffic" => FocusedPane::Traffic,
                _ => unreachable!("verb matched by outer arm"),
            };
            state.focused_pane = pane;
            state.flash(format!("focus → {verb}"));
        }
        "drill" | "drilldown" => {
            state.right_panel = RightPanel::DrillDown;
            state.flash("drill-down");
        }
        "close" | "overview" => {
            state.right_panel = RightPanel::Overview;
            state.flash("overview");
        }
        "follow" => {
            state.follow_focused = !state.follow_focused;
            state.flash(if state.follow_focused {
                "follow on"
            } else {
                "follow off"
            });
        }
        "help" | "?" => state.overlay = Some(UiOverlay::Help),
        "quit" | "q" | "exit" => state.quit = true,
        other => state.flash(format!("unknown command: {other}")),
    }
}

/// Welcome overlay handler.
///
/// Swallows the first keypress, no matter what it is — including
/// `q`, so a user who hits q-then-q doesn't accidentally quit while
/// reading. Ctrl-C is checked in the dispatcher and still escapes.
const fn handle_key_welcome(state: &mut AppState) {
    state.overlay = None;
}

/// Help overlay handler.
///
/// Closes on `?`, Esc, or `q`. `q` here means "close help", not
/// "quit the app" — same justification as welcome above.
const fn handle_key_help(state: &mut AppState, code: KeyCode) {
    if matches!(code, KeyCode::Char('?' | 'q') | KeyCode::Esc) {
        state.overlay = None;
    }
}

/// Main viewer handler — overview / drill-down / metrics share these
/// bindings; the right-panel toggle (Enter / Esc) flips between
/// `Overview` and `DrillDown` without changing the keymap.
///
/// Long because every binding is a one-arm match; splitting across
/// helpers loses scannability without separating concerns.
#[allow(clippy::too_many_lines)]
fn handle_key_main(
    state: &mut AppState,
    sim: &mut Simulation,
    code: KeyCode,
    modifiers: KeyModifiers,
) {
    // Vim scroll motions on the focused-events pane. Routed before the
    // letter-key match so j/k/g/G never collide with global bindings.
    // `gg_pending` is cleared inside `handle_events_scroll` regardless
    // of whether the key was a scroll motion, so a stray `g` followed
    // by an unrelated key doesn't leave the chord half-armed.
    if state.focused_pane == FocusedPane::Events
        && state.right_panel == RightPanel::Overview
        && handle_events_scroll(state, code, modifiers)
    {
        return;
    }
    match code {
        KeyCode::Char('?') => state.overlay = Some(UiOverlay::Help),
        KeyCode::Char('q') => state.quit = true,
        KeyCode::Char(' ') => {
            state.paused = !state.paused;
            state.flash(if state.paused { "paused" } else { "running" });
        }
        KeyCode::Char('.') => {
            step_no_traffic(sim, state);
            state.flash(format!("step → tick {}", sim.current_tick()));
        }
        KeyCode::Char(',') => {
            for _ in 0..10 {
                step_no_traffic(sim, state);
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
        // Filter input only meaningful for the events pane today.
        // PR4 (popup drilldown) will widen this to the rider list.
        KeyCode::Char('/')
            if state.focused_pane == FocusedPane::Events
                && state.right_panel == RightPanel::Overview =>
        {
            state.open_filter_input();
        }
        // `:` opens the command palette — view-switch verbs and a few
        // global actions (`:quit`, `:help`). The palette captures most
        // keys until Enter dispatches or Esc cancels.
        KeyCode::Char(':') => state.open_command_palette(),
        // While DrillDown owns the right column the right-side panes
        // aren't on screen, so cycling focus would leave the user with a
        // flash announcing a change that nothing visible reflects (the
        // footer ignores `focused_pane` in that mode). Treat Tab as a
        // no-op until they Esc out — matches "Tab cycles among visible
        // panes." PR4 dissolves this once drilldown becomes a popup.
        KeyCode::Tab if state.right_panel == RightPanel::Overview => {
            state.focused_pane = state.focused_pane.next();
            state.flash(format!("focus → {}", state.focused_pane.label()));
        }
        KeyCode::BackTab if state.right_panel == RightPanel::Overview => {
            state.focused_pane = state.focused_pane.prev();
            state.flash(format!("focus → {}", state.focused_pane.label()));
        }
        KeyCode::Enter => {
            state.right_panel = match state.right_panel {
                RightPanel::Overview => RightPanel::DrillDown,
                RightPanel::DrillDown => RightPanel::Overview,
            };
        }
        KeyCode::Esc => {
            // Exit scrub mode first (the user's "go back to live"
            // gesture); fall through to close drilldown only when
            // not scrubbing.
            if state.scrub_offset.is_some() {
                handle_key_scrub_exit(state, sim);
            } else {
                state.right_panel = RightPanel::Overview;
            }
        }
        KeyCode::Char('s') => {
            state.snapshot_slot = Some(sim.snapshot());
            state.flash(format!("snapshot saved @ tick {}", sim.current_tick()));
        }
        KeyCode::Char('l') => handle_key_main_load_snapshot(state, sim),
        // `<` / `>` step the time scrubber. The first `<` snapshots
        // the live state, pauses, and restores the newest ring entry;
        // subsequent `<` go further back. `>` walks toward live; `Esc`
        // jumps back to live in one go.
        KeyCode::Char('<') => handle_key_scrub_back(state, sim),
        KeyCode::Char('>') => handle_key_scrub_forward(state, sim),
        _ => {}
    }
}

/// Vim-style scroll motions on the events pane. Returns `true` if the
/// key was consumed; the caller skips the global binding match in that
/// case. Always clears `gg_pending` on a non-`g` key so the chord
/// can't get half-armed by a stray keypress.
const fn handle_events_scroll(
    state: &mut AppState,
    code: KeyCode,
    modifiers: KeyModifiers,
) -> bool {
    let ctrl = modifiers.contains(KeyModifiers::CONTROL);
    let was_gg_pending = state.gg_pending;
    state.gg_pending = false;
    match code {
        KeyCode::Char('j') | KeyCode::Down => {
            state.scroll_events(ScrollMotion::Down);
            true
        }
        KeyCode::Char('k') | KeyCode::Up => {
            state.scroll_events(ScrollMotion::Up);
            true
        }
        // Both Ctrl+f and Ctrl+d (helix / vim) — same outcome.
        KeyCode::Char('f' | 'd') if ctrl => {
            state.scroll_events(ScrollMotion::HalfPageDown);
            true
        }
        KeyCode::Char('b' | 'u') if ctrl => {
            state.scroll_events(ScrollMotion::HalfPageUp);
            true
        }
        KeyCode::Char('g') => {
            if was_gg_pending {
                state.scroll_events(ScrollMotion::Top);
            } else {
                state.gg_pending = true;
            }
            true
        }
        KeyCode::Char('G') => {
            state.scroll_events(ScrollMotion::Bottom);
            true
        }
        _ => false,
    }
}

/// Step the time scrubber backward by one ring entry. The first
/// press snapshots the live state (so `Esc` can restore it),
/// pauses, and lands on the newest ring entry. Subsequent presses
/// walk further back until the ring is exhausted.
///
/// The scrub-entry mutations (`live_snapshot`, `paused`,
/// `scrub_offset`) are committed only *after* the ring restore
/// succeeds, so a failed restore leaves the user in their original
/// state — no orphan `live_snapshot`, no silent pause without the
/// REPLAY badge.
fn handle_key_scrub_back(state: &mut AppState, sim: &mut Simulation) {
    if state.snapshot_ring.is_empty() {
        state.flash("no history yet — keep stepping");
        return;
    }
    let max_offset = state.snapshot_ring.len() - 1;
    let (next_offset, is_entry) = match state.scrub_offset {
        None => (0, true),
        Some(o) if o < max_offset => (o + 1, false),
        Some(_) => {
            state.flash("at oldest snapshot");
            return;
        }
    };
    let live_to_capture = is_entry.then(|| crate::state::LiveSnapshot {
        snapshot: sim.snapshot(),
        was_paused: state.paused,
    });
    if apply_scrub_offset(state, sim, next_offset).is_err() {
        // Restore failed — apply_scrub_offset already flashed the
        // error and left scrub_offset alone. Drop our staged live
        // snapshot too so we don't carry it back to a future call.
        return;
    }
    if let Some(live) = live_to_capture {
        state.live_snapshot = Some(live);
        state.paused = true;
    }
}

/// Step the scrubber forward by one entry. At offset 0, exits scrub
/// mode and restores the live snapshot.
fn handle_key_scrub_forward(state: &mut AppState, sim: &mut Simulation) {
    let Some(o) = state.scrub_offset else {
        return;
    };
    if o == 0 {
        handle_key_scrub_exit(state, sim);
    } else {
        // Failure here leaves scrub_offset on the prior step, which
        // is the right behavior — user just sees the flash and can
        // try `>` again or `Esc` out.
        let _ = apply_scrub_offset(state, sim, o - 1);
    }
}

/// Exit scrub mode and restore the live snapshot taken on entry.
/// `Esc` triggers this when scrubbing, mirroring how `>` would walk
/// all the way forward. Preserves the pre-scrub pause state so a
/// user who manually paused stays paused after exiting.
///
/// On restore failure (snapshot missing or `restore` errors) we
/// flash the error and *don't* clear the scrub indicator — the sim
/// would otherwise silently drift, with the user looking at a
/// replayed past state but no REPLAY badge to flag it.
fn handle_key_scrub_exit(state: &mut AppState, sim: &mut Simulation) {
    let Some(live) = state.live_snapshot.take() else {
        state.flash("scrub exit: no live snapshot to restore");
        return;
    };
    // Clone the snapshot for `restore` so we can stash the original
    // back on failure — no retry path otherwise.
    match live.snapshot.clone().restore(None) {
        Ok(restored) => {
            *sim = restored;
            state.scrub_offset = None;
            state.paused = live.was_paused;
            state.flash(format!("live @ tick {}", sim.current_tick()));
        }
        Err(e) => {
            state.live_snapshot = Some(live);
            state.flash(format!("scrub exit failed: {e}"));
        }
    }
}

/// Restore the ring entry at `offset` (counted from newest) and
/// update the scrub indicator. Helper used by both `<` and `>`.
/// Returns `Ok` after a successful restore (with `scrub_offset`
/// committed), `Err(())` on either a missing entry or a restore
/// failure (in which case the indicator is *not* mutated, so the
/// caller can leave the user's prior state intact).
fn apply_scrub_offset(state: &mut AppState, sim: &mut Simulation, offset: usize) -> Result<(), ()> {
    let idx = state
        .snapshot_ring
        .len()
        .saturating_sub(1)
        .saturating_sub(offset);
    let Some(entry) = state.snapshot_ring.get(idx) else {
        state.flash("scrub: snapshot ring entry missing");
        return Err(());
    };
    match entry.snapshot.clone().restore(None) {
        Ok(restored) => {
            *sim = restored;
            state.scrub_offset = Some(offset);
            state.flash(format!("replay -{offset} @ tick {tick}", tick = entry.tick));
            Ok(())
        }
        Err(e) => {
            state.flash(format!("scrub failed: {e}"));
            Err(())
        }
    }
}

/// Restore the last-saved snapshot, if any, and reset the derived
/// view state (event log, sparklines, focused car). Extracted so the
/// main keymap stays easy to scan.
fn handle_key_main_load_snapshot(state: &mut AppState, sim: &mut Simulation) {
    let Some(snap) = state.snapshot_slot.clone() else {
        state.flash("no snapshot saved");
        return;
    };
    match snap.restore(None) {
        Ok(restored) => {
            *sim = restored;
            state.event_log.clear();
            state.wait_sparkline = Sparkline::new(state.wait_sparkline.capacity);
            state.occupancy_sparkline = Sparkline::new(state.occupancy_sparkline.capacity);
            state.focused_car_idx = 0;
            state.events_scroll = 0;
            state.flash(format!("restored @ tick {}", sim.current_tick()));
        }
        Err(e) => state.flash(format!("restore failed: {e}")),
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

/// Switch the terminal into raw mode + alternate screen, enable
/// mouse capture, and wrap stdout in a [`Terminal`] backed by
/// [`CrosstermBackend`].
fn setup_terminal() -> io::Result<Terminal<CrosstermBackend<Stdout>>> {
    crossterm::terminal::enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    Terminal::new(CrosstermBackend::new(stdout))
}

/// RAII guard that restores the terminal on drop. Acts as the safety
/// net for panics inside [`event_loop`].
struct TerminalGuard;

impl Drop for TerminalGuard {
    fn drop(&mut self) {
        let _ = crossterm::terminal::disable_raw_mode();
        let _ = execute!(io::stdout(), DisableMouseCapture, LeaveAlternateScreen);
    }
}

#[cfg(test)]
#[allow(clippy::expect_used, clippy::panic, clippy::unwrap_used)]
mod tests {
    use super::*;
    use crate::state::FocusedPane;
    use elevator_core::dispatch::scan::ScanDispatch;

    fn demo_sim() -> Simulation {
        elevator_core::builder::SimulationBuilder::demo()
            .dispatch(ScanDispatch::new())
            .build()
            .expect("demo builder must succeed")
    }

    #[test]
    fn space_toggles_pause() {
        let mut state = AppState::new(1.0).without_welcome();
        let mut sim = demo_sim();
        assert!(!state.paused);
        handle_key(&mut state, &mut sim, KeyCode::Char(' '), KeyModifiers::NONE);
        assert!(state.paused);
        handle_key(&mut state, &mut sim, KeyCode::Char(' '), KeyModifiers::NONE);
        assert!(!state.paused);
    }

    #[test]
    fn dot_advances_one_tick() {
        let mut state = AppState::new(1.0).without_welcome();
        let mut sim = demo_sim();
        let before = sim.current_tick();
        handle_key(&mut state, &mut sim, KeyCode::Char('.'), KeyModifiers::NONE);
        assert_eq!(sim.current_tick(), before + 1);
    }

    #[test]
    fn rate_clamps_to_safe_bounds() {
        let mut state = AppState::new(1.0).without_welcome();
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
        let mut state = AppState::new(1.0).without_welcome();
        let mut sim = demo_sim();
        let before = state.category_filter.len();
        handle_key(&mut state, &mut sim, KeyCode::Char('2'), KeyModifiers::NONE);
        assert_eq!(state.category_filter.len(), before - 1);
    }

    #[test]
    fn save_then_load_restores_tick() {
        let mut state = AppState::new(1.0).without_welcome();
        let mut sim = demo_sim();
        for _ in 0..5 {
            sim.step();
        }
        handle_key(&mut state, &mut sim, KeyCode::Char('s'), KeyModifiers::NONE);
        let saved_tick = sim.current_tick();
        for _ in 0..5 {
            sim.step();
        }
        assert_eq!(sim.current_tick(), saved_tick + 5);
        handle_key(&mut state, &mut sim, KeyCode::Char('l'), KeyModifiers::NONE);
        assert_eq!(sim.current_tick(), saved_tick);
    }

    #[test]
    fn enter_toggles_drilldown() {
        let mut state = AppState::new(1.0).without_welcome();
        let mut sim = demo_sim();
        assert_eq!(state.right_panel, RightPanel::Overview);
        handle_key(&mut state, &mut sim, KeyCode::Enter, KeyModifiers::NONE);
        assert_eq!(state.right_panel, RightPanel::DrillDown);
        handle_key(&mut state, &mut sim, KeyCode::Esc, KeyModifiers::NONE);
        assert_eq!(state.right_panel, RightPanel::Overview);
    }

    #[test]
    fn tab_cycles_focus_forward() {
        let mut state = AppState::new(1.0).without_welcome();
        let mut sim = demo_sim();
        assert_eq!(state.focused_pane, FocusedPane::Shaft);
        for expected in [
            FocusedPane::Dispatch,
            FocusedPane::Events,
            FocusedPane::Metrics,
            FocusedPane::Traffic,
            FocusedPane::Shaft,
        ] {
            handle_key(&mut state, &mut sim, KeyCode::Tab, KeyModifiers::NONE);
            assert_eq!(state.focused_pane, expected);
        }
    }

    #[test]
    fn tab_is_noop_while_drilldown_open() {
        // Tab while DrillDown owns the right column would announce a
        // focus change the footer doesn't reflect (the footer ignores
        // focused_pane in that mode). Tab must be a no-op until the
        // user Esc's out of drilldown.
        let mut state = AppState::new(1.0).without_welcome();
        let mut sim = demo_sim();
        state.right_panel = RightPanel::DrillDown;
        let initial = state.focused_pane;
        handle_key(&mut state, &mut sim, KeyCode::Tab, KeyModifiers::NONE);
        assert_eq!(state.focused_pane, initial);
        handle_key(&mut state, &mut sim, KeyCode::BackTab, KeyModifiers::SHIFT);
        assert_eq!(state.focused_pane, initial);
    }

    #[test]
    fn shift_tab_cycles_focus_backward() {
        let mut state = AppState::new(1.0).without_welcome();
        let mut sim = demo_sim();
        assert_eq!(state.focused_pane, FocusedPane::Shaft);
        // BackTab is what crossterm reports for Shift+Tab.
        handle_key(&mut state, &mut sim, KeyCode::BackTab, KeyModifiers::SHIFT);
        assert_eq!(state.focused_pane, FocusedPane::Traffic);
        handle_key(&mut state, &mut sim, KeyCode::BackTab, KeyModifiers::SHIFT);
        assert_eq!(state.focused_pane, FocusedPane::Metrics);
    }

    #[test]
    fn slash_opens_filter_when_events_focused() {
        let mut state = AppState::new(1.0).without_welcome();
        let mut sim = demo_sim();
        state.focused_pane = FocusedPane::Events;
        handle_key(&mut state, &mut sim, KeyCode::Char('/'), KeyModifiers::NONE);
        assert_eq!(state.pending_filter.as_deref(), Some(""));
    }

    #[test]
    fn slash_noop_when_other_pane_focused() {
        let mut state = AppState::new(1.0).without_welcome();
        let mut sim = demo_sim();
        state.focused_pane = FocusedPane::Shaft;
        handle_key(&mut state, &mut sim, KeyCode::Char('/'), KeyModifiers::NONE);
        assert!(state.pending_filter.is_none());
    }

    #[test]
    fn filter_input_typing_then_commit() {
        let mut state = AppState::new(1.0).without_welcome();
        let mut sim = demo_sim();
        state.focused_pane = FocusedPane::Events;
        handle_key(&mut state, &mut sim, KeyCode::Char('/'), KeyModifiers::NONE);
        for c in "rider".chars() {
            handle_key(&mut state, &mut sim, KeyCode::Char(c), KeyModifiers::NONE);
        }
        assert_eq!(state.pending_filter.as_deref(), Some("rider"));
        handle_key(&mut state, &mut sim, KeyCode::Enter, KeyModifiers::NONE);
        assert!(state.pending_filter.is_none());
        assert_eq!(state.events_filter, "rider");
    }

    #[test]
    fn filter_input_esc_cancels() {
        let mut state = AppState::new(1.0).without_welcome();
        let mut sim = demo_sim();
        state.events_filter = "previous".into();
        state.focused_pane = FocusedPane::Events;
        handle_key(&mut state, &mut sim, KeyCode::Char('/'), KeyModifiers::NONE);
        handle_key(&mut state, &mut sim, KeyCode::Char('x'), KeyModifiers::NONE);
        handle_key(&mut state, &mut sim, KeyCode::Esc, KeyModifiers::NONE);
        assert!(state.pending_filter.is_none());
        // Esc keeps the previously committed filter intact.
        assert_eq!(state.events_filter, "previous");
    }

    #[test]
    fn vim_keys_scroll_events_pane() {
        let mut state = AppState::new(1.0).without_welcome();
        let mut sim = demo_sim();
        state.focused_pane = FocusedPane::Events;
        handle_key(&mut state, &mut sim, KeyCode::Char('j'), KeyModifiers::NONE);
        handle_key(&mut state, &mut sim, KeyCode::Char('j'), KeyModifiers::NONE);
        assert_eq!(state.events_scroll, 2);
        handle_key(&mut state, &mut sim, KeyCode::Char('k'), KeyModifiers::NONE);
        assert_eq!(state.events_scroll, 1);
        handle_key(
            &mut state,
            &mut sim,
            KeyCode::Char('f'),
            KeyModifiers::CONTROL,
        );
        assert_eq!(state.events_scroll, 1 + AppState::EVENTS_HALF_PAGE);
        handle_key(&mut state, &mut sim, KeyCode::Char('g'), KeyModifiers::NONE);
        handle_key(&mut state, &mut sim, KeyCode::Char('g'), KeyModifiers::NONE);
        assert_eq!(state.events_scroll, 0);
    }

    #[test]
    fn vim_keys_inert_when_other_pane_focused() {
        // The j/k scroll path is gated on focused_pane == Events. When
        // shaft is focused, `j` should be ignored entirely.
        let mut state = AppState::new(1.0).without_welcome();
        let mut sim = demo_sim();
        assert_eq!(state.focused_pane, FocusedPane::Shaft);
        handle_key(&mut state, &mut sim, KeyCode::Char('j'), KeyModifiers::NONE);
        assert_eq!(state.events_scroll, 0);
    }

    #[test]
    fn colon_opens_command_palette() {
        let mut state = AppState::new(1.0).without_welcome();
        let mut sim = demo_sim();
        handle_key(&mut state, &mut sim, KeyCode::Char(':'), KeyModifiers::NONE);
        assert_eq!(state.pending_command.as_deref(), Some(""));
    }

    #[test]
    fn command_palette_dispatches_view_switch() {
        let mut state = AppState::new(1.0).without_welcome();
        let mut sim = demo_sim();
        handle_key(&mut state, &mut sim, KeyCode::Char(':'), KeyModifiers::NONE);
        for c in "events".chars() {
            handle_key(&mut state, &mut sim, KeyCode::Char(c), KeyModifiers::NONE);
        }
        handle_key(&mut state, &mut sim, KeyCode::Enter, KeyModifiers::NONE);
        assert!(state.pending_command.is_none());
        assert_eq!(state.focused_pane, FocusedPane::Events);
    }

    #[test]
    fn command_palette_unknown_verb_flashes() {
        let mut state = AppState::new(1.0).without_welcome();
        let mut sim = demo_sim();
        handle_key(&mut state, &mut sim, KeyCode::Char(':'), KeyModifiers::NONE);
        for c in "nonsense".chars() {
            handle_key(&mut state, &mut sim, KeyCode::Char(c), KeyModifiers::NONE);
        }
        handle_key(&mut state, &mut sim, KeyCode::Enter, KeyModifiers::NONE);
        assert!(state.pending_command.is_none());
        assert!(
            state
                .status
                .as_deref()
                .is_some_and(|s| s.contains("unknown command")),
            "expected unknown-command flash, got {:?}",
            state.status
        );
    }

    #[test]
    fn command_palette_quit_sets_quit_flag() {
        let mut state = AppState::new(1.0).without_welcome();
        let mut sim = demo_sim();
        handle_key(&mut state, &mut sim, KeyCode::Char(':'), KeyModifiers::NONE);
        for c in "quit".chars() {
            handle_key(&mut state, &mut sim, KeyCode::Char(c), KeyModifiers::NONE);
        }
        handle_key(&mut state, &mut sim, KeyCode::Enter, KeyModifiers::NONE);
        assert!(state.quit);
    }

    #[test]
    fn command_palette_esc_cancels() {
        let mut state = AppState::new(1.0).without_welcome();
        let mut sim = demo_sim();
        handle_key(&mut state, &mut sim, KeyCode::Char(':'), KeyModifiers::NONE);
        handle_key(&mut state, &mut sim, KeyCode::Char('q'), KeyModifiers::NONE);
        handle_key(&mut state, &mut sim, KeyCode::Esc, KeyModifiers::NONE);
        assert!(state.pending_command.is_none());
        assert!(!state.quit);
    }

    #[test]
    fn scrub_back_pauses_and_walks_history() {
        let mut state = AppState::new(1.0).without_welcome();
        let mut sim = demo_sim();
        // Build up a small snapshot ring so the scrubber has somewhere
        // to go. Three intervals → three ring entries.
        for _ in 0..(crate::state::SNAPSHOT_INTERVAL_TICKS * 3) {
            handle_key(&mut state, &mut sim, KeyCode::Char('.'), KeyModifiers::NONE);
        }
        assert_eq!(state.snapshot_ring.len(), 3);
        let live_tick = sim.current_tick();
        handle_key(&mut state, &mut sim, KeyCode::Char('<'), KeyModifiers::NONE);
        assert_eq!(state.scrub_offset, Some(0));
        assert!(state.paused);
        assert!(state.live_snapshot.is_some());
        assert!(sim.current_tick() <= live_tick);
        handle_key(&mut state, &mut sim, KeyCode::Char('<'), KeyModifiers::NONE);
        assert_eq!(state.scrub_offset, Some(1));
    }

    #[test]
    fn scrub_exit_preserves_pre_scrub_pause() {
        // Greptile P1: user-paused → scrub → exit must stay paused.
        let mut state = AppState::new(1.0).without_welcome();
        let mut sim = demo_sim();
        for _ in 0..(crate::state::SNAPSHOT_INTERVAL_TICKS * 2) {
            handle_key(&mut state, &mut sim, KeyCode::Char('.'), KeyModifiers::NONE);
        }
        // User pauses manually before scrubbing.
        state.paused = true;
        handle_key(&mut state, &mut sim, KeyCode::Char('<'), KeyModifiers::NONE);
        assert!(state.scrub_offset.is_some());
        handle_key(&mut state, &mut sim, KeyCode::Esc, KeyModifiers::NONE);
        assert!(state.scrub_offset.is_none());
        assert!(state.paused, "pre-scrub pause should survive scrub exit");
    }

    #[test]
    fn esc_while_scrubbing_returns_to_live() {
        let mut state = AppState::new(1.0).without_welcome();
        let mut sim = demo_sim();
        for _ in 0..(crate::state::SNAPSHOT_INTERVAL_TICKS * 2) {
            handle_key(&mut state, &mut sim, KeyCode::Char('.'), KeyModifiers::NONE);
        }
        let live_tick = sim.current_tick();
        handle_key(&mut state, &mut sim, KeyCode::Char('<'), KeyModifiers::NONE);
        assert!(state.scrub_offset.is_some());
        handle_key(&mut state, &mut sim, KeyCode::Esc, KeyModifiers::NONE);
        assert!(state.scrub_offset.is_none());
        assert!(!state.paused);
        assert_eq!(sim.current_tick(), live_tick);
    }

    #[test]
    fn flash_until_gc_drops_expired_entries() {
        // After enough ticks pass, expired flash entries are reaped
        // by `record_step` rather than accumulating indefinitely.
        let mut state = AppState::new(1.0).without_welcome();
        let mut sim = demo_sim();
        // Seed a flash that already expired (key chosen to avoid
        // colliding with `state` per clippy::similar_names).
        let phantom_id = elevator_core::entity::EntityId::from(slotmap::KeyData::from_ffi(99));
        state.flash_until.insert(phantom_id, 0);
        // Step once to trigger record_step's GC pass.
        handle_key(&mut state, &mut sim, KeyCode::Char('.'), KeyModifiers::NONE);
        assert!(!state.flash_until.contains_key(&phantom_id));
    }

    #[test]
    fn ctrl_c_quits() {
        let mut state = AppState::new(1.0).without_welcome();
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
