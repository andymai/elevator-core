//! First-launch welcome overlay.
//!
//! Sits on top of a *running* sim — by the time the user finishes
//! reading, the sparklines underneath already have data, so dismissing
//! reveals a lively interface rather than a cold frame. Any keypress
//! dismisses (handled in `app::handle_key`); `--no-welcome` suppresses
//! it entirely.

use elevator_core::sim::Simulation;
use ratatui::Frame;
use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, BorderType, Borders, Clear, Paragraph};

use crate::ui::palette;

/// Render the welcome modal over `area`.
pub fn draw(frame: &mut Frame<'_>, area: Rect, sim: &Simulation) {
    let modal = super::centered_rect(area, 64, 18);
    frame.render_widget(Clear, modal);

    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(Style::default().fg(palette::ACCENT))
        .title(super::bracketed_title(
            "welcome",
            Some("press any key to continue".into()),
        ));
    let inner = block.inner(modal);
    frame.render_widget(block, modal);

    let car_count = sim
        .groups()
        .iter()
        .flat_map(|g| g.lines().iter())
        .map(|l| l.elevators().len())
        .sum::<usize>();
    let stop_count = sim.stop_lookup_iter().count();

    let lines = vec![
        Line::from(""),
        center_line(
            "elevator-tui",
            Style::default()
                .fg(palette::ACCENT)
                .add_modifier(Modifier::BOLD),
        ),
        center_line(
            "live debugger for the elevator-core engine",
            Style::default().fg(palette::DIM_STRONG),
        ),
        Line::from(""),
        bullet(format!(
            "loaded sim · {car_count} car(s) · {stop_count} stop(s) · {tps:.0} t/s",
            tps = sim.time().ticks_per_second(),
        )),
        bullet("the shaft on the left shows each car against its served stops"),
        bullet("the right column streams events, dispatch, traffic, and metrics"),
        bullet("color-coded gauges fill up as cars get crowded — green→yellow→red"),
        Line::from(""),
        center_line(
            "press ? at any time for the full keybinding list",
            Style::default().fg(palette::TITLE),
        ),
        Line::from(""),
        center_line(
            "any key to begin",
            Style::default()
                .fg(palette::ACCENT)
                .add_modifier(Modifier::BOLD),
        ),
    ];

    let inside = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(1),
            Constraint::Min(0),
            Constraint::Length(1),
        ])
        .split(inner);
    frame.render_widget(Paragraph::new(lines), inside[1]);
}

/// A line whose text is centered within an 64-wide modal — uses
/// arithmetic-padded `format!` rather than `Alignment::Center` so the
/// surrounding `Paragraph` doesn't have to apply alignment per-call.
fn center_line(text: &str, style: Style) -> Line<'_> {
    Line::from(Span::styled(format!("{text:^60}"), style))
}

/// One bullet line in the body block.
fn bullet(text: impl Into<String>) -> Line<'static> {
    Line::from(vec![
        Span::raw("    "),
        Span::styled("• ", Style::default().fg(palette::ACCENT)),
        Span::styled(text.into(), Style::default().fg(palette::DIM_STRONG)),
    ])
}
