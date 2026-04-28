//! Traffic-shape mini panel — recent rider arrivals as a rolling
//! sparkline. Answers "is the sim doing anything?" at a glance and
//! makes Poisson spikes visible.

use elevator_core::sim::Simulation;
use ratatui::Frame;
use ratatui::layout::Rect;
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, BorderType, Borders, Paragraph, Sparkline};

use crate::state::AppState;
use crate::ui::palette;

/// Render the traffic panel.
pub fn draw(frame: &mut Frame<'_>, area: Rect, state: &AppState, sim: &Simulation) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(Style::default().fg(palette::DIM_STRONG))
        .title(super::bracketed_title(
            "traffic",
            Some("arrivals/sec".into()),
        ));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    if inner.height == 0 {
        return;
    }

    // Inline summary line (current bucket + window-wide rate).
    let total_spawned = sim.metrics().total_spawned();
    let samples = state.spawn_rate_sparkline.as_slice();
    let current = state.spawn_bucket;
    let avg_rate = if samples.is_empty() {
        0.0
    } else {
        f64::from(u32::try_from(samples.iter().sum::<u64>()).unwrap_or(u32::MAX))
            / samples.len() as f64
    };
    let header = Line::from(vec![
        Span::styled(
            format!("  {current:>2}/s now"),
            Style::default()
                .fg(palette::ACCENT)
                .add_modifier(Modifier::BOLD),
        ),
        Span::styled(
            format!("   avg {avg_rate:>4.1}/s"),
            Style::default().fg(palette::DIM_STRONG),
        ),
        Span::styled(
            format!("   total {total_spawned}"),
            Style::default().fg(palette::DIM),
        ),
    ]);
    frame.render_widget(Paragraph::new(header), Rect { height: 1, ..inner });

    // Sparkline takes whatever rows remain.
    if inner.height >= 2 {
        let spark_rect = Rect {
            x: inner.x,
            y: inner.y + 1,
            width: inner.width,
            height: inner.height - 1,
        };
        frame.render_widget(
            Sparkline::default()
                .style(Style::default().fg(palette::SUCCESS))
                .data(samples),
            spark_rect,
        );
    }
}
