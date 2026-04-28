//! Dispatch summary panel — what each car is currently doing and the
//! demand picture every group sees.

use elevator_core::sim::Simulation;
use ratatui::Frame;
use ratatui::layout::Rect;
use ratatui::style::{Modifier, Style};
use ratatui::text::Line;
use ratatui::widgets::{Block, Borders, Paragraph};

use crate::ui::shaft;

/// Render the dispatch panel.
pub fn draw(frame: &mut Frame<'_>, area: Rect, sim: &Simulation) {
    let block = Block::default()
        .borders(Borders::BOTTOM)
        .title(Line::from(" dispatch ").style(Style::default().add_modifier(Modifier::BOLD)));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let mut lines: Vec<Line<'_>> = Vec::new();

    // Per-group strategy + demand counts.
    for group in sim.groups() {
        let strategy = sim
            .strategy_id(group.id())
            .map_or_else(|| "?".to_string(), |s| format!("{s:?}"));
        let manifest = sim.build_dispatch_manifest(group);
        let waiting: usize = group
            .lines()
            .iter()
            .flat_map(|line| line.serves().iter().copied())
            .map(|stop| manifest.waiting_count_at(stop))
            .sum();
        let cars = group
            .lines()
            .iter()
            .map(|line| line.elevators().len())
            .sum::<usize>();
        lines.push(Line::from(format!(
            "{name:<12}  strategy={strategy}  cars={cars}  waiting={waiting}",
            name = group.name(),
        )));
    }

    // One row per car: phase, target, queue depth.
    for car in shaft::cars_iter(sim) {
        let phase = car.elevator.phase();
        let target = phase
            .moving_target()
            .map_or_else(String::new, |t| format!(" → {t:?}"));
        let queue = sim
            .destination_queue(elevator_core::entity::ElevatorId::from(car.id))
            .map_or(0, <[_]>::len);
        lines.push(Line::from(format!(
            "  {:?}  phase={phase}{target}  queue={queue}  load={}/{}",
            car.id,
            car.elevator.current_load(),
            car.elevator.weight_capacity(),
        )));
    }

    frame.render_widget(Paragraph::new(lines), inner);
}
