//! Help overlay (`?`).
//!
//! A modal-style centered panel listing every keybinding and glyph.
//! The sim continues running underneath; dismissing the overlay reveals
//! a frame that's already moved on. We render `Clear` first so the
//! frame below doesn't bleed through.

use ratatui::Frame;
use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, BorderType, Borders, Clear, Paragraph};

use crate::ui::palette;

/// Render a centered help modal over `area`.
pub fn draw(frame: &mut Frame<'_>, area: Rect) {
    let modal = centered(area, 72, 28);
    frame.render_widget(Clear, modal);

    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(Style::default().fg(palette::ACCENT))
        .title(super::bracketed_title(
            "help",
            Some("press ? or Esc to close".into()),
        ));
    let inner = block.inner(modal);
    frame.render_widget(block, modal);

    let lines = vec![
        section("Playback"),
        kv("space", "pause / resume"),
        kv(". / ,", "step one tick / ten ticks"),
        kv("+ / -", "halve or double tick rate (0.0625× – 64×)"),
        Line::from(""),
        section("Navigation"),
        kv("[ / ]", "focus previous / next car"),
        kv("f", "follow focused car (event filter)"),
        kv("Enter", "toggle right panel: overview ↔ drill-down"),
        kv("Esc", "close drill-down or this overlay"),
        kv("m", "toggle shaft layout: index ↔ distance"),
        Line::from(""),
        section("Filters & Snapshots"),
        kv("1..7", "toggle event categories (1 Elev, 2 Rdr, 3 Dsp,"),
        kv("", "4 Top, 5 Rep, 6 Dir, 7 Obs)"),
        kv("s / l", "save / restore in-memory snapshot"),
        Line::from(""),
        section("Glyphs"),
        glyph_line("▲ ▼", palette::UP, "going up / going down"),
        glyph_line("■", palette::DIM_STRONG, "stopped"),
        glyph_line("L", palette::ACCENT, "loading riders"),
        glyph_line("O / C", palette::ACCENT, "doors opening / closing"),
        glyph_line("↑↓", palette::WARN, "active hall call (up / down)"),
        glyph_line("(n)", palette::DIM_STRONG, "n riders waiting at this stop"),
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

/// Bold section header line.
fn section(label: &str) -> Line<'static> {
    Line::from(Span::styled(
        format!("  {label}"),
        Style::default()
            .fg(palette::ACCENT)
            .add_modifier(Modifier::BOLD),
    ))
}

/// Key/binding row: padded key column + description.
fn kv(key: &str, description: &str) -> Line<'static> {
    Line::from(vec![
        Span::raw("    "),
        Span::styled(
            format!("{key:<8}"),
            Style::default()
                .fg(palette::TITLE)
                .add_modifier(Modifier::BOLD),
        ),
        Span::styled(
            description.to_string(),
            Style::default().fg(palette::DIM_STRONG),
        ),
    ])
}

/// Glyph row (colored glyph + dim explanation).
fn glyph_line(glyph: &str, color: ratatui::style::Color, description: &str) -> Line<'static> {
    Line::from(vec![
        Span::raw("    "),
        Span::styled(format!("{glyph:<8}"), Style::default().fg(color)),
        Span::styled(
            description.to_string(),
            Style::default().fg(palette::DIM_STRONG),
        ),
    ])
}

/// Center a fixed-size rectangle inside `area`. If `area` is smaller
/// than `(w, h)`, the modal shrinks to fit.
fn centered(area: Rect, w: u16, h: u16) -> Rect {
    let w = w.min(area.width);
    let h = h.min(area.height);
    Rect {
        x: area.x + (area.width.saturating_sub(w)) / 2,
        y: area.y + (area.height.saturating_sub(h)) / 2,
        width: w,
        height: h,
    }
}
