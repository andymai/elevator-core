//! Persistent glyph legend — a single row that explains what every
//! symbol on the shaft means. Always visible so first-time users don't
//! have to open the help overlay just to read the elevator log.

use ratatui::Frame;
use ratatui::layout::Rect;
use ratatui::style::Style;
use ratatui::text::{Line, Span};
use ratatui::widgets::Paragraph;

use crate::ui::palette;

/// Render the legend strip. Designed to fit in a single 1-row `area`.
pub fn draw(frame: &mut Frame<'_>, area: Rect) {
    let pair = |glyph: &'static str, label: &'static str, glyph_color| {
        [
            Span::styled(glyph, Style::default().fg(glyph_color)),
            Span::styled(
                format!(" {label}"),
                Style::default().fg(palette::DIM_STRONG),
            ),
            Span::styled("  ", Style::default()),
        ]
    };
    let mut spans = vec![Span::styled(" legend ", Style::default().fg(palette::DIM))];
    spans.extend(pair("▲", "up", palette::UP));
    spans.extend(pair("▼", "down", palette::DOWN));
    spans.extend(pair("■", "stopped", palette::DIM_STRONG));
    spans.extend(pair("L", "loading", palette::ACCENT));
    spans.extend(pair("O/C", "doors", palette::ACCENT));
    spans.extend(pair("↑↓", "hall call", palette::WARN));
    spans.extend(pair("(n)", "waiting", palette::DIM_STRONG));
    frame.render_widget(Paragraph::new(Line::from(spans)), area);
}
