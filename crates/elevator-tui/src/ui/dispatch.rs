//! Dispatch summary panel — what each car is currently doing, plus a
//! capacity gauge that fills toward red as the car gets full. The
//! focused car is accented.

use elevator_core::components::ElevatorPhase;
use elevator_core::sim::Simulation;
use ratatui::Frame;
use ratatui::layout::Rect;
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, BorderType, Borders, Paragraph};

use crate::state::AppState;
use crate::ui::{palette, shaft};

/// Render the dispatch panel.
#[allow(clippy::too_many_lines)]
pub fn draw(frame: &mut Frame<'_>, area: Rect, state: &AppState, sim: &Simulation) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(Style::default().fg(palette::DIM_STRONG))
        .title(super::bracketed_title(
            "dispatch",
            Some("per-car state and load".into()),
        ));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let cars: Vec<_> = shaft::cars_iter(sim).collect();
    let focused_id = cars.get(state.focused_car_idx).map(|c| c.id);

    let mut lines: Vec<Line<'_>> = Vec::new();

    // One header row per group: strategy + summary numbers. Building
    // configs typically have one group; this still handles N cleanly.
    for group in sim.groups() {
        let strategy = sim
            .strategy_id(group.id())
            .map_or_else(|| "?".into(), |s| format!("{s:?}"));
        let manifest = sim.build_dispatch_manifest(group);
        let waiting: usize = group
            .lines()
            .iter()
            .flat_map(|line| line.serves().iter().copied())
            .map(|stop| manifest.waiting_count_at(stop))
            .sum();
        let car_count = group
            .lines()
            .iter()
            .map(|line| line.elevators().len())
            .sum::<usize>();
        lines.push(Line::from(vec![
            Span::styled(
                format!("{:<12}", group.name()),
                Style::default()
                    .fg(palette::TITLE)
                    .add_modifier(Modifier::BOLD),
            ),
            Span::styled(" strategy=", Style::default().fg(palette::DIM)),
            Span::styled(strategy, Style::default().fg(palette::DIM_STRONG)),
            Span::styled("  cars=", Style::default().fg(palette::DIM)),
            Span::styled(
                car_count.to_string(),
                Style::default().fg(palette::DIM_STRONG),
            ),
            Span::styled("  waiting=", Style::default().fg(palette::DIM)),
            Span::styled(
                waiting.to_string(),
                if waiting > 0 {
                    Style::default()
                        .fg(palette::ACCENT)
                        .add_modifier(Modifier::BOLD)
                } else {
                    Style::default().fg(palette::DIM_STRONG)
                },
            ),
        ]));
    }

    // One row per car: indexed name (Elevator runtime components don't
    // carry the config-level name), phase, gauge, queue depth.
    for (idx, car) in cars.iter().enumerate() {
        let is_focused = focused_id == Some(car.id);
        let phase = car.elevator.phase();
        let phase_str = phase_short(&phase);
        let target = phase
            .moving_target()
            .map_or_else(String::new, |t| format!("→{}", short_stop(sim, t)));
        let load = car.elevator.current_load().value();
        let cap = car.elevator.weight_capacity().value();
        let ratio = if cap > 0.0 { load / cap } else { 0.0 };
        let bar = capacity_bar(ratio, 10);
        let bar_color = palette::bar_fill_for(ratio);
        let queue = sim
            .destination_queue(elevator_core::entity::ElevatorId::from(car.id))
            .map_or(0, <[_]>::len);

        let name_style = if is_focused {
            Style::default()
                .fg(palette::ACCENT)
                .add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(palette::TITLE)
        };
        let name = format!("car {}", idx + 1);

        lines.push(Line::from(vec![
            Span::styled(format!("  {name:<8}"), name_style),
            Span::styled(
                format!(" {phase_str:<5}"),
                Style::default().fg(palette::DIM_STRONG),
            ),
            Span::styled(format!("{target:<10}"), Style::default().fg(palette::DIM)),
            Span::styled(" ", Style::default()),
            Span::styled(bar, Style::default().fg(bar_color)),
            Span::styled(
                format!(" {load:>4.0}/{cap:<4.0}"),
                Style::default().fg(palette::DIM_STRONG),
            ),
            Span::styled(
                format!(" q={queue}"),
                if queue > 0 {
                    Style::default().fg(palette::WARN)
                } else {
                    Style::default().fg(palette::DIM)
                },
            ),
        ]));
    }

    frame.render_widget(Paragraph::new(lines), inner);
}

/// `[████░░░░░░]` style ASCII bar. Ratio is clamped to `[0.0, 1.0]`.
fn capacity_bar(ratio: f64, width: usize) -> String {
    let r = ratio.clamp(0.0, 1.0);
    let filled = (r * width as f64).round() as usize;
    let mut s = String::with_capacity(width + 2);
    s.push('[');
    for i in 0..width {
        s.push(if i < filled { '█' } else { '░' });
    }
    s.push(']');
    s
}

/// 5-char phase label (`movg`, `door`, `load`, etc). Keeps the dispatch
/// row aligned regardless of how `Display` formats `ElevatorPhase`.
const fn phase_short(phase: &ElevatorPhase) -> &'static str {
    match phase {
        ElevatorPhase::Idle => "idle",
        ElevatorPhase::Stopped => "stop",
        ElevatorPhase::Loading => "load",
        ElevatorPhase::DoorOpening => "open",
        ElevatorPhase::DoorClosing => "shut",
        ElevatorPhase::MovingToStop(_) => "movg",
        ElevatorPhase::Repositioning(_) => "rep",
        _ => "?",
    }
}

/// Resolve a stop entity to its short display name (or its id slot if
/// the name lookup fails — never blocks the dispatch row from rendering).
fn short_stop(sim: &Simulation, stop: elevator_core::entity::EntityId) -> String {
    sim.world()
        .stop(stop)
        .map_or_else(|| format!("{stop:?}"), |s| s.name().to_string())
}
