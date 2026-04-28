//! Per-car drill-down panel — replaces the right column with a deep
//! view of the focused car: phase, queue, riders aboard, and the recent
//! events that touch it.

use elevator_core::sim::Simulation;
use ratatui::Frame;
use ratatui::layout::Rect;
use ratatui::style::Style;
use ratatui::text::Line;
use ratatui::widgets::{Block, BorderType, Borders, Paragraph};

use crate::state::AppState;
use crate::ui::{events, palette, shaft};

/// Render the drill-down panel.
pub fn draw(frame: &mut Frame<'_>, area: Rect, state: &AppState, sim: &Simulation) {
    let cars: Vec<_> = shaft::cars_iter(sim).collect();
    let Some(focused) = cars.get(state.focused_car_idx) else {
        let block = Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .border_style(Style::default().fg(palette::DIM_STRONG))
            .title(super::bracketed_title("drill-down", None));
        let inner = block.inner(area);
        frame.render_widget(block, area);
        frame.render_widget(Paragraph::new("no cars in this sim"), inner);
        return;
    };

    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(Style::default().fg(palette::DIM_STRONG))
        .title(super::bracketed_title(
            "drill-down",
            Some(format!("{:?}", focused.id)),
        ));
    let inner = block.inner(area);
    frame.render_widget(block, area);

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
