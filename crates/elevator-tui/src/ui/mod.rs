//! Frame composition: title bar, body (shaft + right column), footer.

use elevator_core::sim::Simulation;
use ratatui::Frame;
use ratatui::layout::{Constraint, Direction, Layout};
use ratatui::style::{Modifier, Style};
use ratatui::text::Line;
use ratatui::widgets::{Block, Borders, Paragraph};

use crate::state::{AppState, RightPanel};

pub mod dispatch;
pub mod drilldown;
pub mod events;
pub mod metrics;
pub mod shaft;

/// Top-level draw entry — composes every panel for one frame.
pub fn draw(frame: &mut Frame<'_>, state: &AppState, sim: &Simulation) {
    let outer = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(1), // title bar
            Constraint::Min(0),    // body
            Constraint::Length(1), // footer
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

    match state.right_panel {
        RightPanel::Overview => draw_overview(frame, body[1], state, sim),
        RightPanel::DrillDown => drilldown::draw(frame, body[1], state, sim),
    }

    draw_footer(frame, outer[2], state);
}

/// Status bar: tick, paused/running, rate, mode badge.
fn draw_title(
    frame: &mut Frame<'_>,
    area: ratatui::layout::Rect,
    state: &AppState,
    sim: &Simulation,
) {
    let mode = if state.paused { "PAUSED" } else { "RUNNING" };
    let line = Line::from(format!(
        " elevator-tui   tick {tick}   {mode}   rate {rate:.2}×   shaft {shaft:?}   panel {panel:?}",
        tick = sim.current_tick(),
        rate = state.tick_rate,
        shaft = state.shaft_mode,
        panel = state.right_panel,
    ));
    frame.render_widget(
        Paragraph::new(line).style(Style::default().add_modifier(Modifier::BOLD)),
        area,
    );
}

/// Footer: condensed hotkey reference + transient status flash.
fn draw_footer(frame: &mut Frame<'_>, area: ratatui::layout::Rect, state: &AppState) {
    let mut text = String::from(
        " space pause  . step  , step×10  +/- rate  m shaft  []car  f follow  Enter drill  s save  l load  1-7 filter  q quit",
    );
    if let Some(status) = &state.status {
        text.push_str("   │   ");
        text.push_str(status);
    }
    frame.render_widget(Paragraph::new(text), area);
}

/// Right column = Events / Dispatch / Metrics stacked vertically.
fn draw_overview(
    frame: &mut Frame<'_>,
    area: ratatui::layout::Rect,
    state: &AppState,
    sim: &Simulation,
) {
    let outer = Block::default().borders(Borders::LEFT).title(" overview ");
    let inner = outer.inner(area);
    frame.render_widget(outer, area);

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage(50),
            Constraint::Percentage(25),
            Constraint::Percentage(25),
        ])
        .split(inner);

    events::draw(frame, chunks[0], state, sim);
    dispatch::draw(frame, chunks[1], sim);
    metrics::draw(frame, chunks[2], state, sim);
}
