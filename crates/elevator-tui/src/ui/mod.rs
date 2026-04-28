//! Frame composition: title bar, legend strip, body (shaft + right
//! column), footer, and modal overlays (welcome / help) on top.

use elevator_core::sim::Simulation;
use ratatui::Frame;
use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::Paragraph;

use crate::state::{AppState, RightPanel};

pub mod dispatch;
pub mod drilldown;
pub mod events;
pub mod help;
pub mod legend;
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
            Constraint::Length(1), // legend strip
            Constraint::Min(0),    // body
            Constraint::Length(1), // footer
        ])
        .split(frame.area());

    draw_title(frame, outer[0], state, sim);
    legend::draw(frame, outer[1]);

    let body = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Length(shaft::recommended_width(sim)),
            Constraint::Min(0),
        ])
        .split(outer[2]);

    shaft::draw(frame, body[0], state, sim);

    match state.right_panel {
        RightPanel::Overview => draw_overview(frame, body[1], state, sim),
        RightPanel::DrillDown => drilldown::draw(frame, body[1], state, sim),
    }

    draw_footer(frame, outer[3], state);

    // Modal overlays render last so they sit above every panel.
    if state.show_help {
        help::draw(frame, frame.area());
    } else if state.show_welcome {
        welcome::draw(frame, frame.area(), sim);
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
    let spans = vec![
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
    ];
    frame.render_widget(Paragraph::new(Line::from(spans)), area);
}

/// Footer: minimal hotkey hint + transient status flash.
///
/// The full keybinding list lives in the help overlay (`?`); this row
/// stays under terminal-width pressure so it never truncates.
fn draw_footer(frame: &mut Frame<'_>, area: Rect, state: &AppState) {
    let mut spans = vec![
        Span::styled(" ?", Style::default().fg(palette::ACCENT)),
        Span::styled(" help", Style::default().fg(palette::DIM_STRONG)),
        Span::styled(" · ", Style::default().fg(palette::DIM)),
        Span::styled("space", Style::default().fg(palette::ACCENT)),
        Span::styled(" pause", Style::default().fg(palette::DIM_STRONG)),
        Span::styled(" · ", Style::default().fg(palette::DIM)),
        Span::styled("[ ]", Style::default().fg(palette::ACCENT)),
        Span::styled(" car", Style::default().fg(palette::DIM_STRONG)),
        Span::styled(" · ", Style::default().fg(palette::DIM)),
        Span::styled("Enter", Style::default().fg(palette::ACCENT)),
        Span::styled(" drill", Style::default().fg(palette::DIM_STRONG)),
        Span::styled(" · ", Style::default().fg(palette::DIM)),
        Span::styled("q", Style::default().fg(palette::ACCENT)),
        Span::styled(" quit", Style::default().fg(palette::DIM_STRONG)),
    ];
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
