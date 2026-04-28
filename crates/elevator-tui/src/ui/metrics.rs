//! Metrics panel — aggregate counters plus rolling sparklines for p95
//! wait time and total occupancy.

use elevator_core::sim::Simulation;
use ratatui::Frame;
use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::Line;
use ratatui::widgets::{Block, Borders, Paragraph, Sparkline};

use crate::state::AppState;

/// Render the metrics panel.
pub fn draw(frame: &mut Frame<'_>, area: Rect, state: &AppState, sim: &Simulation) {
    let block = Block::default()
        .borders(Borders::BOTTOM)
        .title(Line::from(" metrics ").style(Style::default().add_modifier(Modifier::BOLD)));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(5), // counter text
            Constraint::Length(2), // wait sparkline
            Constraint::Length(2), // occupancy sparkline
        ])
        .split(inner);

    let m = sim.metrics();
    let counters = vec![
        Line::from(format!(
            "spawned {sp}   delivered {dl}   abandoned {ab} ({rate:.1}%)",
            sp = m.total_spawned(),
            dl = m.total_delivered(),
            ab = m.total_abandoned(),
            rate = m.abandonment_rate() * 100.0,
        )),
        Line::from(format!(
            "wait avg {avg:.1}t   p95 {p95}t   max {max}t",
            avg = m.avg_wait_time(),
            p95 = m.p95_wait_time(),
            max = m.max_wait_time(),
        )),
        Line::from(format!(
            "ride avg {ride:.1}t   throughput {tp}/{w}t   util {ut:.1}%",
            ride = m.avg_ride_time(),
            tp = m.throughput(),
            w = m.throughput_window_ticks(),
            ut = m.avg_utilization() * 100.0,
        )),
    ];
    frame.render_widget(Paragraph::new(counters), chunks[0]);

    let wait = state.wait_sparkline.as_slice();
    frame.render_widget(
        Sparkline::default()
            .block(Block::default().title("p95 wait (ticks)"))
            .data(&wait),
        chunks[1],
    );

    let occ = state.occupancy_sparkline.as_slice();
    frame.render_widget(
        Sparkline::default()
            .block(Block::default().title("total occupancy"))
            .data(&occ),
        chunks[2],
    );
}
