//! Frame composition: title bar, body (shaft + right column), mode-aware
//! footer, and modal overlays (welcome / help) on top.

use elevator_core::sim::Simulation;
use ratatui::Frame;
use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::Paragraph;

use crate::state::{AppState, FocusedPane, RightPanel, UiOverlay};

pub mod dispatch;
pub mod drilldown;
pub mod events;
pub mod help;
pub mod metrics;
pub mod palette;
pub mod shaft;
pub mod traffic;
pub mod welcome;

/// Top-level draw entry — composes every panel for one frame.
pub fn draw(frame: &mut Frame<'_>, state: &AppState, sim: &Simulation) {
    let outer = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(1), // title bar
            Constraint::Min(0),    // body
            Constraint::Length(1), // footer (mode-aware)
        ])
        .split(frame.area());

    draw_title(frame, outer[0], state, sim);

    let body = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Length(shaft::recommended_width(sim)),
            Constraint::Min(0),
        ])
        .split(outer[1]);

    shaft::draw(frame, body[0], state, sim);
    // Right column always carries the overview now — the drilldown is
    // a centered popup overlaid on top, not a panel that steals the
    // column. Preserves spatial context (you can still see where the
    // car sits in the shaft behind the popup).
    draw_overview(frame, body[1], state, sim);

    draw_footer(frame, outer[2], state);

    // Drilldown popup sits between the body panels and the help/
    // welcome modals so a user reading help over a focused car still
    // gets help on top.
    if state.right_panel == RightPanel::DrillDown {
        drilldown::draw_popup(frame, frame.area(), state, sim);
    }

    // Modal overlays render last so they sit above every panel.
    match state.overlay {
        Some(UiOverlay::Help) => help::draw(frame, frame.area()),
        Some(UiOverlay::Welcome) => welcome::draw(frame, frame.area(), sim),
        None => {}
    }
}

/// Title bar: app name, tick, run state, rate, modes, help hint.
fn draw_title(frame: &mut Frame<'_>, area: Rect, state: &AppState, sim: &Simulation) {
    let run_glyph = if state.paused { "❚❚" } else { "▶" };
    let run_style = if state.paused {
        Style::default().fg(palette::WARN)
    } else {
        Style::default().fg(palette::SUCCESS)
    };
    let mut spans = vec![
        Span::styled(
            " elevator-tui ",
            Style::default()
                .fg(palette::ACCENT)
                .add_modifier(Modifier::BOLD),
        ),
        Span::styled("· ", Style::default().fg(palette::DIM)),
        Span::styled(
            format!("tick {}", sim.current_tick()),
            Style::default().fg(palette::DIM_STRONG),
        ),
    ];
    // Scrub-mode badge — accent-colored so it visually leaps off the
    // title row, paired with the offset so the user knows how far
    // back they've stepped.
    if let Some(offset) = state.scrub_offset {
        spans.push(Span::styled(" · ", Style::default().fg(palette::DIM)));
        spans.push(Span::styled(
            format!(" REPLAY -{offset} "),
            Style::default()
                .fg(palette::WARN)
                .add_modifier(Modifier::BOLD)
                .add_modifier(Modifier::REVERSED),
        ));
    }
    spans.extend([
        Span::styled(" · ", Style::default().fg(palette::DIM)),
        Span::styled(run_glyph.to_string(), run_style),
        Span::styled(
            format!(" {:.2}×", state.tick_rate),
            Style::default().fg(palette::DIM_STRONG),
        ),
        Span::styled(" · ", Style::default().fg(palette::DIM)),
        Span::styled(
            format!("{:?}", state.shaft_mode).to_lowercase(),
            Style::default().fg(palette::DIM_STRONG),
        ),
        Span::styled(" · ", Style::default().fg(palette::DIM)),
        Span::styled(
            format!("{:?}", state.right_panel).to_lowercase(),
            Style::default().fg(palette::DIM_STRONG),
        ),
    ]);
    frame.render_widget(Paragraph::new(Line::from(spans)), area);
}

/// Mode-aware footer: status badge, focused-pane label, and the 4–6
/// keys most relevant to the current focus. Modeled on helix/zellij's
/// status bar — the user shouldn't have to memorize the full keymap to
/// know what's possible right now.
fn draw_footer(frame: &mut Frame<'_>, area: Rect, state: &AppState) {
    // Padded literals so the badge can be styled directly without a
    // per-frame `format!` allocation.
    let (badge_text, badge_color) = if state.paused {
        (" PAUSED ", palette::WARN)
    } else {
        (" RUNNING ", palette::SUCCESS)
    };

    // When DrillDown owns the right column, the dispatch / events /
    // metrics / traffic panels aren't on screen — so the label and
    // hints describe drilldown rather than the underlying focused
    // pane. Prevents the misleading "events │ 1-7 filter" footer
    // greptile flagged. PR4 turns drilldown into a popup, at which
    // point this short-circuit goes away.
    let (label, hints): (&'static str, &'static [(&'static str, &'static str)]) =
        match state.right_panel {
            RightPanel::DrillDown => ("drill-down", DRILLDOWN_HINTS),
            RightPanel::Overview => (state.focused_pane.label(), pane_hints(state.focused_pane)),
        };
    // Tab is a no-op in DrillDown, so omit it from the footer so users
    // don't press it expecting a pane change.
    let include_tab = state.right_panel == RightPanel::Overview;

    let mut spans = vec![
        Span::styled(
            badge_text,
            Style::default()
                .fg(badge_color)
                .add_modifier(Modifier::BOLD)
                .add_modifier(Modifier::REVERSED),
        ),
        Span::styled(" ", Style::default()),
        Span::styled(label, palette::title_style()),
        Span::styled("  │  ", Style::default().fg(palette::DIM)),
    ];
    // Footer-prompt modes replace the normal hints with whatever the
    // user is typing. `pending_filter` (`/`) and `pending_command`
    // (`:`) are mutually exclusive — the dispatcher routes keys to
    // exactly one of them at a time. Filter wins if both are somehow
    // set, matching the dispatcher precedence.
    if let Some(input) = state.pending_filter.as_deref() {
        extend_with_input_prompt(&mut spans, "/ ", input, "commit");
    } else if let Some(input) = state.pending_command.as_deref() {
        extend_with_input_prompt(&mut spans, ": ", input, "run");
    } else {
        extend_with_key_hints(&mut spans, hints, include_tab);
    }

    if let Some(status) = &state.status {
        spans.push(Span::styled("   ◇ ", Style::default().fg(palette::DIM)));
        spans.push(Span::styled(
            status.clone(),
            Style::default()
                .fg(palette::ACCENT)
                .add_modifier(Modifier::BOLD),
        ));
    }
    frame.render_widget(Paragraph::new(Line::from(spans)), area);
}

/// Render an input-mode prompt as `<sigil><text>█  Esc cancel · ⏎ <verb>`.
/// The trailing block (`█`) acts as a faux text cursor — ratatui
/// doesn't ship a real one and a styled glyph is cheap.
fn extend_with_input_prompt(
    spans: &mut Vec<Span<'static>>,
    sigil: &'static str,
    input: &str,
    enter_verb: &'static str,
) {
    let accent_bold = Style::default()
        .fg(palette::ACCENT)
        .add_modifier(Modifier::BOLD);
    spans.push(Span::styled(sigil, accent_bold));
    spans.push(Span::styled(
        input.to_string(),
        Style::default().fg(palette::TITLE),
    ));
    spans.push(Span::styled("█", accent_bold));
    spans.push(Span::styled("  Esc", Style::default().fg(palette::ACCENT)));
    spans.push(Span::styled(
        " cancel · ",
        Style::default().fg(palette::DIM_STRONG),
    ));
    spans.push(Span::styled("⏎", Style::default().fg(palette::ACCENT)));
    spans.push(Span::styled(
        format!(" {enter_verb}"),
        Style::default().fg(palette::DIM_STRONG),
    ));
}

/// Verbs surfaced when `DrillDown` owns the right column. Same shape
/// as the per-pane tables so the renderer doesn't need a separate path.
///
/// Label values carry their leading space (e.g. `" pause"`) so the
/// renderer can pass them through to `Span::styled` without an
/// allocating `format!` on the 144 fps frame path.
const DRILLDOWN_HINTS: &[(&str, &str)] = &[("Spc", " pause"), ("[/]", " car"), ("Esc", " close")];

/// Per-pane verb table — pane-specific keys first, universal trailers
/// (`Tab`, `?`) appended at render time. Same leading-space convention
/// as `DRILLDOWN_HINTS`.
const fn pane_hints(focus: FocusedPane) -> &'static [(&'static str, &'static str)] {
    match focus {
        FocusedPane::Shaft => &[("Spc", " pause"), ("[/]", " car"), ("m", " mode")],
        FocusedPane::Dispatch => &[("Spc", " pause"), ("[/]", " car"), ("⏎", " drill")],
        FocusedPane::Events => &[("Spc", " pause"), ("1-7", " filter"), ("f", " follow")],
        FocusedPane::Metrics | FocusedPane::Traffic => {
            &[("Spc", " pause"), (".", " step"), ("+/-", " rate")]
        }
    }
}

/// Append the key hints to the footer span buffer, separated by ` · `.
/// `?` always comes last; `Tab pane` is appended only when
/// `include_tab` is true — `DrillDown` mode no-ops Tab and surfacing
/// the hint there would mislead the user into pressing a key that
/// does nothing.
///
/// The list is kept short (≤ 6 hints) so the row fits comfortably in
/// 80 columns alongside the status badge — the full keymap lives in
/// the `?` overlay.
fn extend_with_key_hints(
    spans: &mut Vec<Span<'static>>,
    pane_hints: &'static [(&'static str, &'static str)],
    include_tab: bool,
) {
    let trailers: &[(&'static str, &'static str)] = if include_tab {
        &[("Tab", " pane"), ("?", " help")]
    } else {
        &[("?", " help")]
    };
    let hints = pane_hints.iter().copied().chain(trailers.iter().copied());
    let mut first = true;
    for (key, label) in hints {
        if first {
            first = false;
        } else {
            spans.push(Span::styled(" · ", Style::default().fg(palette::DIM)));
        }
        // Both `key` and `label` are `&'static str` literals — labels in
        // the hint tables include their leading space, so the renderer
        // passes them through without any per-frame allocation.
        spans.push(Span::styled(key, Style::default().fg(palette::ACCENT)));
        spans.push(Span::styled(
            label,
            Style::default().fg(palette::DIM_STRONG),
        ));
    }
}

/// Right column = Dispatch / Events / Traffic / Metrics stacked.
fn draw_overview(frame: &mut Frame<'_>, area: Rect, state: &AppState, sim: &Simulation) {
    // Dispatch fills proportionally to the car count so the panel keeps
    // every car visible even on busier configs (group line + 1 row/car
    // + a 2-row title border = `cars + 3`). Traffic is one sparkline
    // line + border; metrics is 3 counter rows + 2 sparklines + border.
    let car_count = u16::try_from(shaft::cars_iter(sim).count()).unwrap_or(u16::MAX);
    let dispatch_h = car_count.saturating_add(4).clamp(6, 14);
    let traffic_h = 4u16;
    let metrics_h = 8u16;

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(dispatch_h),
            Constraint::Min(5), // events takes the slack
            Constraint::Length(traffic_h),
            Constraint::Length(metrics_h),
        ])
        .split(area);

    dispatch::draw(frame, chunks[0], state, sim);
    events::draw(frame, chunks[1], state, sim);
    traffic::draw(frame, chunks[2], state, sim);
    metrics::draw(frame, chunks[3], state, sim);
}

/// Center a fixed-size rectangle inside `area`. If `area` is smaller
/// than `(w, h)`, the modal shrinks to fit. Used by every modal
/// overlay (help, welcome) — kept here so the geometry can't drift
/// silently across copies.
#[must_use]
pub(super) fn centered_rect(area: Rect, w: u16, h: u16) -> Rect {
    let w = w.min(area.width);
    let h = h.min(area.height);
    Rect {
        x: area.x + (area.width.saturating_sub(w)) / 2,
        y: area.y + (area.height.saturating_sub(h)) / 2,
        width: w,
        height: h,
    }
}

/// Build a bracketed panel title `─┤ name · suffix ├─` styled in the
/// palette accent. Spans render at the top-left of a bordered block.
#[must_use]
pub fn bracketed_title(name: &str, suffix: Option<String>) -> Line<'_> {
    let mut spans = vec![
        Span::styled("┤ ", Style::default().fg(palette::DIM_STRONG)),
        Span::styled(name, palette::title_style()),
    ];
    if let Some(s) = suffix {
        spans.push(Span::styled(
            format!(" · {s}"),
            Style::default().fg(palette::DIM_STRONG),
        ));
    }
    spans.push(Span::styled(" ├", Style::default().fg(palette::DIM_STRONG)));
    Line::from(spans)
}
