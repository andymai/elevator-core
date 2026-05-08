//! Per-car drill-down — a floating popup over the active view that
//! shows phase, queue, riders aboard, and the recent events touching
//! the focused car.

use elevator_core::sim::Simulation;
use ratatui::Frame;
use ratatui::layout::Rect;
use ratatui::style::Style;
use ratatui::text::Line;
use ratatui::widgets::{Block, BorderType, Borders, Clear, Paragraph};

use crate::state::AppState;
use crate::ui::{events, palette, shaft};

/// Render the drill-down as a centered popup over `area`. Unlike the
/// pre-PR4 layout this no longer steals the right column — the
/// underlying overview keeps rendering so spatial context (the car's
/// shaft position, the live event log) stays visible behind the
/// popup. `Clear` punches a hole in the buffer so the popup body
/// doesn't pick up bleed-through from underneath.
pub fn draw_popup(frame: &mut Frame<'_>, area: Rect, state: &AppState, sim: &Simulation) {
    // 70x24 keeps the popup readable on terminals down to ~80x30.
    // `centered_rect` shrinks to fit on smaller windows.
    let modal = super::centered_rect(area, 70, 24);
    frame.render_widget(Clear, modal);

    let cars: Vec<_> = shaft::cars_iter(sim).collect();
    let Some(focused) = cars.get(state.focused_car_idx) else {
        let block = Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .border_style(Style::default().fg(palette::ACCENT))
            .title(super::bracketed_title("drill-down", None));
        let inner = block.inner(modal);
        frame.render_widget(block, modal);
        frame.render_widget(Paragraph::new("no cars in this sim"), inner);
        return;
    };

    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(Style::default().fg(palette::ACCENT))
        .title(super::bracketed_title(
            "drill-down",
            Some(format!("{:?} · Esc to close", focused.id)),
        ));
    let inner = block.inner(modal);
    frame.render_widget(block, modal);

    let mut lines: Vec<Line<'_>> = Vec::new();
    let elev = focused.elevator;
    lines.push(Line::from(format!("phase     {}", elev.phase())));
    lines.push(Line::from(format!("door      {}", elev.door())));
    lines.push(Line::from(format!(
        "load      {} / {}",
        elev.current_load(),
        elev.weight_capacity(),
    )));
    lines.push(Line::from(format!(
        "speed     max {} / accel {} / decel {}",
        elev.max_speed(),
        elev.acceleration(),
        elev.deceleration(),
    )));
    lines.push(Line::from(format!("position  {:.2}", focused.position)));

    if let Some(queue) = sim.destination_queue(elevator_core::entity::ElevatorId::from(focused.id))
    {
        lines.push(Line::from(""));
        lines.push(Line::from(format!("queue ({} stops)", queue.len())));
        for stop_id in queue {
            lines.push(Line::from(format!("  → {stop_id:?}")));
        }
    }

    lines.push(Line::from(""));
    lines.push(Line::from(format!(
        "riders aboard ({})",
        focused.riders.len()
    )));
    for rider in focused.riders.iter().take(8) {
        lines.push(Line::from(format!("  · {rider:?}")));
    }
    if focused.riders.len() > 8 {
        lines.push(Line::from(format!(
            "  · … {} more",
            focused.riders.len() - 8
        )));
    }

    lines.push(Line::from(""));
    lines.push(Line::from("recent events touching this car"));
    for logged in state
        .event_log
        .iter()
        .rev()
        .filter(|l| crate::state::event_touches(&l.event, focused.id))
        .take(8)
    {
        lines.push(Line::from(format!(
            "  {}",
            events::format_event_line(logged.tick, &logged.event)
        )));
    }

    frame.render_widget(Paragraph::new(lines), inner);
}
