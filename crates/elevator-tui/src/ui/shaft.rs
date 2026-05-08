//! Shaft view — the leftmost panel showing each car's vertical position.
//!
//! Each row carries the served stop, optional hall-call lamps, the
//! waiting-rider count, and one glyph per car so traffic pressure reads
//! at a glance without leaving the panel.
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

use std::collections::HashMap;

use elevator_core::components::hall_call::CallDirection;
use elevator_core::components::{Elevator, ElevatorPhase, Stop};
use elevator_core::entity::EntityId;
use elevator_core::sim::Simulation;
use ratatui::Frame;
use ratatui::layout::Rect;
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, BorderType, Borders, Paragraph};

use crate::state::{AppState, FocusedPane, ShaftMode};
use crate::ui::palette;

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

/// Width of the per-row text + delim prefix inside the shaft block,
/// in cells.
///
/// Layout: 2 hall-call lamps + 10-char name + 6-char position +
/// 5-char waiting count + 3-char delimiter (` │ `). Excludes the
/// outer borders and the per-car columns. Exposed so the input
/// handlers (mouse hit-test in `app.rs`) can resolve a click column
/// to a car index without re-deriving the layout.
pub const TEXT_PREFIX_CELLS: u16 = 26;

/// Cells per car column in the per-row layout: 1-char glyph + 1-char
/// trailing space.
pub const CELLS_PER_CAR: u16 = 2;

/// Recommended panel width in cells. Each row is laid out as:
///
/// ```text
/// │  ↑Lobby  0.0 (12) │ c c c │
/// ```
///
/// The fixed prefix is `TEXT_PREFIX_CELLS` cells (hall lamps + name +
/// position + waiting + delim). Each car adds `CELLS_PER_CAR` cells,
/// and the whole row is wrapped in a 1-cell border on each side.
#[must_use]
pub fn recommended_width(sim: &Simulation) -> u16 {
    let car_count: usize = cars_iter(sim).count();
    let cars: u16 = u16::try_from(car_count).unwrap_or(u16::MAX);
    let base: u16 = TEXT_PREFIX_CELLS + 2; // + left/right border
    base.saturating_add(cars.saturating_mul(CELLS_PER_CAR))
}

/// Map a click column inside the shaft pane to a car index, if the
/// column lands on a car cell. Pure function so the math is unit-
/// testable without instantiating a multi-car sim.
///
/// `shaft_x` is the panel's left edge (the border column); cars
/// start at `shaft_x + 1 + TEXT_PREFIX_CELLS`. Returns `None` for
/// clicks on the prefix region or past the last car column.
#[must_use]
pub fn column_to_car_idx(shaft_x: u16, click_col: u16, car_count: usize) -> Option<usize> {
    let cars_origin = shaft_x.saturating_add(1).saturating_add(TEXT_PREFIX_CELLS);
    if click_col < cars_origin {
        return None;
    }
    let offset = click_col - cars_origin;
    let idx = (offset / CELLS_PER_CAR) as usize;
    (idx < car_count).then_some(idx)
}

/// Render the shaft panel.
pub fn draw(frame: &mut Frame<'_>, area: Rect, state: &AppState, sim: &Simulation) {
    let stops = stops_top_down(sim);
    let cars: Vec<CarView<'_>> = cars_iter(sim).collect();
    let focused = cars.get(state.focused_car_idx).map(|c| c.id);

    let suffix = format!("{} cars · {:?}", cars.len(), state.shaft_mode).to_lowercase();
    let pane_focused = state.focused_pane == FocusedPane::Shaft;
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(palette::border_style(pane_focused))
        .title(super::bracketed_title("shaft", Some(suffix)));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    // Aggregate hall-call directions per stop. `iter_hall_calls` yields
    // one entry per `(stop, direction)` pair; we collapse to a tuple of
    // (up?, down?) so the renderer doesn't have to scan twice per row.
    let hall_calls: HashMap<EntityId, (bool, bool)> = {
        let mut map: HashMap<EntityId, (bool, bool)> = HashMap::new();
        for call in sim.world().iter_hall_calls() {
            let entry = map.entry(call.stop).or_default();
            match call.direction {
                CallDirection::Up => entry.0 = true,
                CallDirection::Down => entry.1 = true,
                _ => {}
            }
        }
        map
    };

    // Index mode needs a per-car row anchor since `position` is a continuous
    // f64 between stops. Pick the closest stop by absolute distance — that
    // way moving cars appear at their current floor rather than vanishing
    // until they arrive.
    let nearest_stop_by_car: HashMap<EntityId, EntityId> = cars
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

    // Filter the flash-until map down to live entries for this tick.
    // Carrying the whole map into row rendering would be fine but the
    // closure capture is cleaner with a `Fn(EntityId) -> bool`.
    let now = sim.current_tick();
    let is_flashing = |id: EntityId| state.flash_until.get(&id).is_some_and(|&exp| exp > now);
    let ctx = RenderCtx {
        cars: &cars,
        nearest_stop_by_car: &nearest_stop_by_car,
        focused,
        hall_calls: &hall_calls,
        sim,
        flashing: &is_flashing,
    };
    let lines: Vec<Line<'_>> = match state.shaft_mode {
        ShaftMode::Index => render_index_mode(&stops, &ctx, inner.height),
        ShaftMode::Distance => render_distance_mode(&stops, &ctx, inner.height),
    };
    frame.render_widget(Paragraph::new(lines), inner);
}

/// Bundle of per-frame resolution data shared across stop rows.
struct RenderCtx<'a> {
    /// Every car in the sim, in deterministic group→line order.
    cars: &'a [CarView<'a>],
    /// Index-mode anchor: which stop row each car's continuous position
    /// rounds to.
    nearest_stop_by_car: &'a HashMap<EntityId, EntityId>,
    /// Currently focused car, if any (highlighted in the per-car columns).
    focused: Option<EntityId>,
    /// Per-stop active hall-call directions: `(up?, down?)`.
    hall_calls: &'a HashMap<EntityId, (bool, bool)>,
    /// Borrowed simulation, used for waiting-rider counts and stop lookups.
    sim: &'a Simulation,
    /// `true` for entities whose accent flash is still live this frame.
    flashing: &'a dyn Fn(EntityId) -> bool,
}

/// One row per stop. Stop list truncates to fit the available height.
fn render_index_mode<'a>(
    stops: &'a [(EntityId, &'a Stop)],
    ctx: &RenderCtx<'a>,
    height: u16,
) -> Vec<Line<'a>> {
    let max_rows = height as usize;
    let take = stops.len().min(max_rows.saturating_sub(1).max(1));
    let mut lines = Vec::with_capacity(take + 1);
    for (eid, stop) in stops.iter().take(take) {
        lines.push(stop_row(*eid, stop, ctx));
    }
    if stops.len() > take {
        lines.push(Line::from(Span::styled(
            format!(
                "  … {} more stop(s) hidden — narrow terminal",
                stops.len() - take
            ),
            Style::default().fg(palette::DIM),
        )));
    }
    lines
}

/// Rows scaled to actual stop positions. The full vertical range is
/// quantized to `height` rows; a stop is placed in the row matching its
/// fraction of the range.
fn render_distance_mode<'a>(
    stops: &'a [(EntityId, &'a Stop)],
    ctx: &RenderCtx<'a>,
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
    grid.into_iter()
        .enumerate()
        .map(|(row, slot)| match slot {
            Some((eid, stop)) => stop_row(eid, stop, ctx),
            None => spacer_row(row, rows, max_pos, min_pos, ctx),
        })
        .collect()
}

/// Render one stop row: `↑Lobby   0.0 (3) │ ▲  ·  ▼` with the hall-call
/// glyphs colored by demand.
fn stop_row<'a>(stop_id: EntityId, stop: &'a Stop, ctx: &RenderCtx<'a>) -> Line<'a> {
    let (up_call, down_call) = ctx
        .hall_calls
        .get(&stop_id)
        .copied()
        .unwrap_or((false, false));
    let waiting = ctx.sim.waiting_count_at(stop_id);

    let mut spans = Vec::with_capacity(8 + ctx.cars.len() * 2);
    spans.push(Span::styled(
        if up_call { "↑" } else { " " },
        Style::default().fg(palette::WARN),
    ));
    spans.push(Span::styled(
        if down_call { "↓" } else { " " },
        Style::default().fg(palette::WARN),
    ));
    spans.push(Span::styled(
        format!("{:>10}", truncate(stop.name(), 10)),
        Style::default().fg(palette::TITLE),
    ));
    spans.push(Span::styled(
        format!(" {:>5.1}", stop.position()),
        Style::default().fg(palette::DIM_STRONG),
    ));
    let waiting_text = if waiting > 0 {
        format!(" ({waiting:>2})")
    } else {
        "     ".to_string()
    };
    spans.push(Span::styled(
        waiting_text,
        if waiting > 0 {
            Style::default()
                .fg(palette::ACCENT)
                .add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(palette::DIM)
        },
    ));
    spans.push(Span::styled(
        " │ ",
        Style::default().fg(palette::DIM_STRONG),
    ));
    for car in ctx.cars {
        let here = ctx.nearest_stop_by_car.get(&car.id) == Some(&stop_id);
        let flashing = (ctx.flashing)(car.id);
        spans.push(car_glyph_for_stop(car, here, ctx.focused, flashing));
        spans.push(Span::raw(" "));
    }
    Line::from(spans)
}

/// Render a row in distance mode that doesn't sit on a stop. Cars whose
/// continuous position rounds to this row still get drawn in the right
/// column; otherwise the slot is blank.
fn spacer_row<'a>(
    row: usize,
    rows: usize,
    max_pos: f64,
    min_pos: f64,
    ctx: &RenderCtx<'a>,
) -> Line<'a> {
    let span = (max_pos - min_pos).max(1e-9);
    // `      ` is 2 lamp + 10 name + 6 pos + 5 waiting + 1 space columns.
    let row_pos_label = format!(
        "{:>10} {:>5.1}     ",
        "",
        (row as f64 / (rows as f64 - 1.0)).mul_add(-span, max_pos),
    );
    let mut spans: Vec<Span<'_>> = vec![
        Span::raw("  "),
        Span::styled(row_pos_label, Style::default().fg(palette::DIM)),
        Span::styled(" │ ", Style::default().fg(palette::DIM_STRONG)),
    ];
    for car in ctx.cars {
        let car_row = ((max_pos - car.position) / span * (rows as f64 - 1.0)).round() as usize;
        let car_row = car_row.min(rows - 1);
        let glyph = if car_row == row {
            Span::styled("*", car_style(car.id, ctx.focused))
        } else {
            Span::styled("·", Style::default().fg(palette::DIM))
        };
        spans.push(glyph);
        spans.push(Span::raw(" "));
    }
    Line::from(spans)
}

/// Pick the glyph + style for a car at a given stop. `flashing`
/// overlays an accent style when the car just arrived or its doors
/// just opened — a per-frame visual cue that decays over
/// `FLASH_DURATION_TICKS`.
fn car_glyph_for_stop<'a>(
    car: &CarView<'a>,
    here: bool,
    focused: Option<EntityId>,
    flashing: bool,
) -> Span<'a> {
    if !here {
        return Span::styled("·", Style::default().fg(palette::DIM));
    }
    let (glyph, color) = match car.elevator.phase() {
        ElevatorPhase::Loading => ("L", palette::ACCENT),
        ElevatorPhase::DoorOpening => ("O", palette::ACCENT),
        ElevatorPhase::DoorClosing => ("C", palette::ACCENT),
        ElevatorPhase::Stopped => ("■", palette::DIM_STRONG),
        ElevatorPhase::MovingToStop(_) | ElevatorPhase::Repositioning(_) => {
            // Use a directional arrow so movement is visible even when
            // the car sits at the same row for several frames.
            if car.elevator.going_up() {
                ("▲", palette::UP)
            } else if car.elevator.going_down() {
                ("▼", palette::DOWN)
            } else {
                ("█", palette::DIM_STRONG)
            }
        }
        _ => ("█", palette::DIM_STRONG),
    };
    let style = if focused == Some(car.id) {
        palette::focused_style()
    } else if flashing {
        palette::flash_style()
    } else {
        Style::default().fg(color)
    };
    Span::styled(glyph, style)
}

/// Style applied to a focused car glyph when no contextual color exists
/// (e.g. `*` in distance mode). Bold + reverse for legibility under any
/// background; falls through to the default style otherwise.
fn car_style(id: EntityId, focused: Option<EntityId>) -> Style {
    if focused == Some(id) {
        palette::focused_style()
    } else {
        Style::default().fg(palette::DIM_STRONG)
    }
}

/// Trim a string to `max` chars, padding with spaces if shorter.
///
/// Compares by character count, not byte length: a stop name like
/// "Café" is 4 chars but 5 bytes, and would otherwise hit the
/// truncation branch unnecessarily and emit a misaligned row.
fn truncate(s: &str, max: usize) -> String {
    let char_count = s.chars().count();
    if char_count <= max {
        format!("{s:<max$}")
    } else {
        s.chars().take(max).collect()
    }
}

#[cfg(test)]
#[allow(clippy::expect_used)]
mod tests {
    use super::*;

    /// Layout-prefix sanity: the constants must add up to the
    /// `recommended_width` formula. If anyone tweaks `TEXT_PREFIX_CELLS`
    /// without updating the layout, this catches it.
    #[test]
    fn recommended_width_constants_consistent() {
        // shaft.x = 0, panel x = 0..30 for 1 car: 1 border + 26 text +
        // 2 cells (1 car * CELLS_PER_CAR) + 1 border = 30.
        let expected_for_one_car = 1 + TEXT_PREFIX_CELLS + CELLS_PER_CAR + 1;
        assert_eq!(expected_for_one_car, 30);
    }

    #[test]
    fn column_to_car_idx_at_first_car_glyph() {
        // shaft.x = 0 → cars_origin = 0 + 1 + 26 = 27.
        assert_eq!(column_to_car_idx(0, 27, 3), Some(0));
    }

    #[test]
    fn column_to_car_idx_at_first_cars_trailing_space() {
        // The 1-cell trailing space is part of car 0's column.
        assert_eq!(column_to_car_idx(0, 28, 3), Some(0));
    }

    #[test]
    fn column_to_car_idx_at_second_car_glyph() {
        assert_eq!(column_to_car_idx(0, 29, 3), Some(1));
    }

    #[test]
    fn column_to_car_idx_at_third_car_glyph() {
        assert_eq!(column_to_car_idx(0, 31, 3), Some(2));
    }

    #[test]
    fn column_to_car_idx_past_last_car() {
        // Click one cell past the last car's trailing space — not a
        // valid car column.
        assert_eq!(column_to_car_idx(0, 33, 3), None);
    }

    #[test]
    fn column_to_car_idx_in_text_prefix() {
        // Click in the stop-name region.
        assert_eq!(column_to_car_idx(0, 5, 3), None);
    }

    #[test]
    fn column_to_car_idx_with_offset_shaft_x() {
        // Shaft pane starts at column 10 in the terminal. First car
        // is at 10 + 1 + 26 = 37.
        assert_eq!(column_to_car_idx(10, 37, 1), Some(0));
        assert_eq!(column_to_car_idx(10, 36, 1), None);
    }
}
