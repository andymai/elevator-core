//! Shaft view — the leftmost panel showing each car's vertical position
//! relative to its served stops.
//!
//! Two render modes share `cars_iter` and the per-car column derivation
//! but differ in row scaling:
//!
//! - **Index mode** allocates one row per stop, ignoring distance.
//!   Compact and stable for tall buildings; truncates to fit when the
//!   stop count exceeds the panel height.
//! - **Distance mode** scales rows to actual stop positions, so a car
//!   between two stops 80 km apart sits visibly mid-cable. Honours
//!   `space_elevator.ron`-class scenarios at the cost of leaving wide
//!   blank stretches when stops are clumped.

use elevator_core::components::{Elevator, ElevatorPhase, Stop};
use elevator_core::entity::EntityId;
use elevator_core::sim::Simulation;
use ratatui::Frame;
use ratatui::layout::Rect;
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph};

use crate::state::{AppState, ShaftMode};

/// Resolved view of one car for rendering.
pub struct CarView<'a> {
    /// Entity id of the car.
    pub id: EntityId,
    /// Borrowed `Elevator` component.
    pub elevator: &'a Elevator,
    /// Position along the shaft (rendered).
    pub position: f64,
    /// List of riders aboard, used for occupancy and follow-mode lookups.
    pub riders: &'a [EntityId],
}

/// Iterate every car across every group, in deterministic group→line order.
///
/// Re-exported for `app.rs` so it can compute the focused-car index without
/// duplicating the traversal.
pub fn cars_iter(sim: &Simulation) -> impl Iterator<Item = CarView<'_>> + '_ {
    sim.groups()
        .iter()
        .flat_map(|group| {
            group
                .lines()
                .iter()
                .flat_map(|line| line.elevators().iter())
        })
        .copied()
        .filter_map(move |id| {
            let elevator = sim.world().elevator(id)?;
            let position = sim
                .world()
                .position(id)
                .map_or(0.0, elevator_core::components::Position::value);
            Some(CarView {
                id,
                elevator,
                position,
                riders: elevator.riders(),
            })
        })
}

/// Resolve every stop the sim knows about, sorted by position descending
/// (top of shaft first — matches how a building elevation looks on screen).
fn stops_top_down(sim: &Simulation) -> Vec<(EntityId, &Stop)> {
    let mut stops: Vec<_> = sim
        .stop_lookup_iter()
        .filter_map(|(_, eid)| sim.world().stop(*eid).map(|s| (*eid, s)))
        .collect();
    stops.sort_by(|a, b| b.1.position().total_cmp(&a.1.position()));
    stops
}

/// Recommended panel width in cells. Each row is laid out as:
///
/// ```text
/// │name(10) pos(5) │ c c c c │
/// ```
///
/// — i.e. 19 cells of label + delimiter, plus 2 cells per car (glyph
/// + trailing space), wrapped in a 1-cell border on each side.
#[must_use]
pub fn recommended_width(sim: &Simulation) -> u16 {
    let car_count: usize = cars_iter(sim).count();
    let cars: u16 = u16::try_from(car_count).unwrap_or(u16::MAX);
    let base: u16 = 21; // label + pos + delim + borders
    base.saturating_add(cars.saturating_mul(2))
}

/// Render the shaft panel.
pub fn draw(frame: &mut Frame<'_>, area: Rect, state: &AppState, sim: &Simulation) {
    let stops = stops_top_down(sim);
    let cars: Vec<CarView<'_>> = cars_iter(sim).collect();
    let focused = cars.get(state.focused_car_idx).map(|c| c.id);

    let block = Block::default()
        .borders(Borders::ALL)
        .title(format!(" shaft · {} car(s) ", cars.len()));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    // Index mode needs a per-car row anchor since `position` is a continuous
    // f64 between stops. Pick the closest stop by absolute distance — that
    // way moving cars appear at their current floor rather than vanishing
    // until they arrive.
    let nearest_stop_by_car: std::collections::HashMap<EntityId, EntityId> = cars
        .iter()
        .filter_map(|car| {
            stops
                .iter()
                .min_by(|a, b| {
                    (a.1.position() - car.position)
                        .abs()
                        .total_cmp(&(b.1.position() - car.position).abs())
                })
                .map(|(eid, _)| (car.id, *eid))
        })
        .collect();

    let lines: Vec<Line<'_>> = match state.shaft_mode {
        ShaftMode::Index => {
            render_index_mode(&stops, &cars, &nearest_stop_by_car, focused, inner.height)
        }
        ShaftMode::Distance => render_distance_mode(&stops, &cars, focused, inner.height),
    };
    frame.render_widget(Paragraph::new(lines), inner);
}

/// One row per stop. Stop list truncates to fit the available height.
fn render_index_mode<'a>(
    stops: &'a [(EntityId, &'a Stop)],
    cars: &'a [CarView<'a>],
    nearest_stop_by_car: &std::collections::HashMap<EntityId, EntityId>,
    focused: Option<EntityId>,
    height: u16,
) -> Vec<Line<'a>> {
    let max_rows = height as usize;
    let take = stops.len().min(max_rows.saturating_sub(1).max(1));
    let mut lines = Vec::with_capacity(take + 1);
    for (eid, stop) in stops.iter().take(take) {
        lines.push(stop_row(*eid, stop, cars, nearest_stop_by_car, focused));
    }
    if stops.len() > take {
        lines.push(Line::from(format!(
            "  … {} more stop(s) hidden — narrow terminal",
            stops.len() - take
        )));
    }
    lines
}

/// Rows scaled to actual stop positions. The full vertical range is
/// quantized to `height` rows; a stop is placed in the row matching its
/// fraction of the range.
fn render_distance_mode<'a>(
    stops: &'a [(EntityId, &'a Stop)],
    cars: &'a [CarView<'a>],
    focused: Option<EntityId>,
    height: u16,
) -> Vec<Line<'a>> {
    if stops.is_empty() || height < 2 {
        return Vec::new();
    }
    let max_pos = stops.first().map_or(0.0, |(_, stop)| stop.position());
    let min_pos = stops.last().map_or(0.0, |(_, stop)| stop.position());
    let span = (max_pos - min_pos).max(1e-9);
    let rows = height as usize;
    let mut grid: Vec<Option<(EntityId, &Stop)>> = vec![None; rows];
    for (eid, stop) in stops {
        let fraction = (max_pos - stop.position()) / span;
        let row = ((fraction * (rows as f64 - 1.0)).round() as usize).min(rows - 1);
        if grid[row].is_none() {
            grid[row] = Some((*eid, *stop));
        }
    }
    // Distance mode plots cars by their actual position (in `spacer_row`),
    // so the per-row "nearest stop" map is unused. Pass an empty one.
    let empty: std::collections::HashMap<EntityId, EntityId> = std::collections::HashMap::new();
    grid.into_iter()
        .enumerate()
        .map(|(row, slot)| match slot {
            Some((eid, stop)) => stop_row(eid, stop, cars, &empty, focused),
            None => spacer_row(cars.len(), row, rows, max_pos, min_pos, cars, focused),
        })
        .collect()
}

/// Render one stop row: `name@pos │ c c c` where each `c` is a car
/// glyph at its corresponding column index.
fn stop_row<'a>(
    stop_id: EntityId,
    stop: &'a Stop,
    cars: &'a [CarView<'a>],
    nearest_stop_by_car: &std::collections::HashMap<EntityId, EntityId>,
    focused: Option<EntityId>,
) -> Line<'a> {
    let label = format!("{:>10} ", truncate(stop.name(), 10));
    let pos = format!("{:>5.1} ", stop.position());
    let mut spans = vec![Span::raw(label), Span::raw(pos), Span::raw("│ ")];
    for car in cars {
        let here = nearest_stop_by_car.get(&car.id) == Some(&stop_id);
        spans.push(car_glyph_for_stop(car, stop_id, stop, here, focused));
        spans.push(Span::raw(" "));
    }
    Line::from(spans)
}

/// Render a row in distance mode that doesn't sit on a stop. Cars whose
/// continuous position rounds to this row still get drawn in the right
/// column; otherwise the slot is blank.
fn spacer_row<'a>(
    _car_count: usize,
    row: usize,
    rows: usize,
    max_pos: f64,
    min_pos: f64,
    cars: &'a [CarView<'a>],
    focused: Option<EntityId>,
) -> Line<'a> {
    let span = (max_pos - min_pos).max(1e-9);
    let label = format!("{:>10} ", "");
    let row_pos_label = format!(
        "{:>5.1} ",
        (row as f64 / (rows as f64 - 1.0)).mul_add(-span, max_pos)
    );
    let mut spans = vec![Span::raw(label), Span::raw(row_pos_label), Span::raw("│ ")];
    for car in cars {
        let car_row = ((max_pos - car.position) / span * (rows as f64 - 1.0)).round() as usize;
        let car_row = car_row.min(rows - 1);
        let glyph = if car_row == row {
            Span::styled("*", car_style(car, focused))
        } else {
            Span::raw("·")
        };
        spans.push(glyph);
        spans.push(Span::raw(" "));
    }
    Line::from(spans)
}

/// Pick the glyph + style for a car at a given stop.
fn car_glyph_for_stop<'a>(
    car: &CarView<'a>,
    _stop_id: EntityId,
    _stop: &Stop,
    here: bool,
    focused: Option<EntityId>,
) -> Span<'a> {
    if !here {
        return Span::raw("·");
    }
    let glyph = match car.elevator.phase() {
        ElevatorPhase::Loading => "L",
        ElevatorPhase::DoorOpening => "O",
        ElevatorPhase::DoorClosing => "C",
        ElevatorPhase::Stopped => "■",
        ElevatorPhase::MovingToStop(_) | ElevatorPhase::Repositioning(_) => {
            // Use a directional arrow so movement is visible even when
            // the car sits at the same row for several frames.
            if car.elevator.going_up() {
                "▲"
            } else if car.elevator.going_down() {
                "▼"
            } else {
                "█"
            }
        }
        _ => "█",
    };
    Span::styled(glyph, car_style(car, focused))
}

/// Style used to highlight the focused car. Adds bold + reverse so the
/// glyph stands out under any palette without depending on color.
fn car_style(car: &CarView<'_>, focused: Option<EntityId>) -> Style {
    if focused == Some(car.id) {
        Style::default()
            .add_modifier(Modifier::BOLD)
            .add_modifier(Modifier::REVERSED)
    } else {
        Style::default()
    }
}

/// Trim a string to `max` chars, padding with spaces if shorter.
fn truncate(s: &str, max: usize) -> String {
    if s.len() <= max {
        format!("{s:<max$}")
    } else {
        s.chars().take(max).collect()
    }
}
