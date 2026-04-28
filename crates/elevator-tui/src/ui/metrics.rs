//! Metrics panel — aggregate counters plus rolling sparklines for p95
//! wait time and total occupancy. Sparkline colors track health so a
//! glance is enough to spot a slow sim.

use elevator_core::sim::Simulation;
use ratatui::Frame;
use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, BorderType, Borders, Paragraph, Sparkline};

use crate::state::AppState;
use crate::ui::palette;

/// Render the metrics panel.
#[allow(clippy::too_many_lines)]
pub fn draw(frame: &mut Frame<'_>, area: Rect, state: &AppState, sim: &Simulation) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(Style::default().fg(palette::DIM_STRONG))
        .title(super::bracketed_title(
            "metrics",
            Some("aggregate health".into()),
        ));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    if inner.height == 0 {
        return;
    }

    // Inside the panel:
    //   3 counter rows, then two single-row labels + sparklines.
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Min(3),    // 3 counter lines
            Constraint::Length(2), // wait sparkline header + bar
            Constraint::Length(2), // occupancy sparkline header + bar
        ])
        .split(inner);

    let m = sim.metrics();
    let abandon_rate = m.abandonment_rate();
    let abandon_color = if abandon_rate < 0.05 {
        palette::SUCCESS
    } else if abandon_rate < 0.20 {
        palette::WARN
    } else {
        palette::DANGER
    };
    let p95 = m.p95_wait_time();
    let counters = vec![
        Line::from(vec![
            label("spawned "),
            value(m.total_spawned().to_string()),
            label("   delivered "),
            value(m.total_delivered().to_string()),
            label("   abandoned "),
            Span::styled(
                format!("{}", m.total_abandoned()),
                Style::default()
                    .fg(abandon_color)
                    .add_modifier(Modifier::BOLD),
            ),
            Span::styled(
                format!(" ({:.1}%)", abandon_rate * 100.0),
                Style::default().fg(abandon_color),
            ),
        ]),
        Line::from(vec![
            label("wait avg "),
            value(format!("{:.1}t", m.avg_wait_time())),
            label("   p95 "),
            Span::styled(
                format!("{p95}t"),
                Style::default()
                    .fg(palette::wait_color_for(p95))
                    .add_modifier(Modifier::BOLD),
            ),
            label("   max "),
            value(format!("{}t", m.max_wait_time())),
        ]),
        Line::from(vec![
            label("ride avg "),
            value(format!("{:.1}t", m.avg_ride_time())),
            label("   throughput "),
            value(format!(
                "{}/{}t",
                m.throughput(),
                m.throughput_window_ticks()
            )),
            label("   util "),
            value(format!("{:.0}%", m.avg_utilization() * 100.0)),
        ]),
    ];
    frame.render_widget(Paragraph::new(counters), chunks[0]);

    // p95 wait sparkline — color follows the most-recent sample.
    let wait_color = state
        .wait_sparkline
        .as_slice()
        .last()
        .copied()
        .map_or(palette::SUCCESS, palette::wait_color_for);
    frame.render_widget(
        Sparkline::default()
            .block(Block::default().title(Line::from(Span::styled(
                "p95 wait (ticks)",
                Style::default().fg(palette::DIM_STRONG),
            ))))
            .style(Style::default().fg(wait_color))
            .data(state.wait_sparkline.as_slice()),
        chunks[1],
    );

    // Occupancy sparkline — uses the accent so it visually pairs with
    // the dispatch panel above (capacity bars use the same tone).
    frame.render_widget(
        Sparkline::default()
            .block(Block::default().title(Line::from(Span::styled(
                "total occupancy",
                Style::default().fg(palette::DIM_STRONG),
            ))))
            .style(Style::default().fg(palette::ACCENT))
            .data(state.occupancy_sparkline.as_slice()),
        chunks[2],
    );
}

/// Dim label span used to introduce a counter (e.g. `wait avg `).
fn label(text: &str) -> Span<'static> {
    Span::styled(text.to_string(), Style::default().fg(palette::DIM))
}

/// Bold body-tint span used for the number that follows a label.
fn value(text: impl Into<String>) -> Span<'static> {
    Span::styled(
        text.into(),
        Style::default()
            .fg(palette::DIM_STRONG)
            .add_modifier(Modifier::BOLD),
    )
}
