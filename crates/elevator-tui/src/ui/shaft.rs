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
    // Loop topology renders as a horizontal strip per line: stops
    // placed along the [0, circumference) axis, cars overlaid at
    // their current cyclic position, with a `|` seam marker at the
    // wrap-around. The vertical Index/Distance modes are meaningless
    // for a loop (there's no top-to-bottom axis), so a sim whose
    // every line is a Loop bypasses them entirely. Mixed-topology
    // sims (Linear + Loop in different groups) keep the vertical
    // view for v1; an integrated split-pane layout is a follow-up.
    let lines: Vec<Line<'_>> = if all_loop(sim) {
        render_loop_strips(&ctx, inner.width)
    } else {
        match state.shaft_mode {
            ShaftMode::Index => render_index_mode(&stops, &ctx, inner.height),
            ShaftMode::Distance => render_distance_mode(&stops, &ctx, inner.height),
        }
    };
    frame.render_widget(Paragraph::new(lines), inner);
}

/// True if every line in the sim has `LineKind::Loop` topology.
///
/// A sim with no lines (legacy single-group topology) trivially fails
/// the check — we render the vertical view there. The function is
/// `pub(super)` so the recommended-width path can also branch on it
/// in the future (loop strips have a different width contract than
/// the per-car column-based vertical mode).
fn all_loop(sim: &Simulation) -> bool {
    let mut saw_line = false;
    for group in sim.groups() {
        for line in group.lines() {
            saw_line = true;
            if !sim.is_loop(line.entity()) {
                return false;
            }
        }
    }
    saw_line
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

/// Render every Loop line in the sim as one horizontal strip showing
/// stops along the `[0, circumference)` axis and cars overlaid at
/// their current cyclic positions.
///
/// Each loop produces three rows:
///
/// ```text
///   Loop                  N · 100.0           ←
///   ┃───[N]────────────[E]────────────[S]────────────[W]───┃
///       ↑                                              c1
/// ```
///
/// The top row is the line label + waiting-counts header (one
/// `name(n)` per stop with non-zero waiters). The middle row is the
/// track itself: stops sit at `position / circumference` of the
/// available width; the `┃` glyphs at the ends mark the seam (loop
/// wrap). The bottom row is the car overlay: each car maps its
/// continuous cyclic position to the same x-axis and draws a single
/// glyph, with the focused car bolded and flashing cars accent-tinted.
///
/// Width budget: a 4-column inner area is the smallest layout that
/// can carry a stop and a seam at each edge; anything narrower
/// silently collapses to a no-op line per loop.
fn render_loop_strips<'a>(ctx: &RenderCtx<'a>, width: u16) -> Vec<Line<'a>> {
    let mut lines: Vec<Line<'a>> = Vec::new();
    // The strip itself spans `(width - 2)` cells: one cell on each
    // end is reserved for the seam glyph. The math below works out
    // to roughly the same range for narrow widths so a 6-cell pane
    // still produces *something* legible.
    let strip_cols: usize = usize::from(width.saturating_sub(2)).max(1);

    for group in ctx.sim.groups() {
        for line_info in group.lines() {
            let line_eid = line_info.entity();
            let Some(line) = ctx.sim.world().line(line_eid) else {
                continue;
            };
            let Some(circumference) = line.circumference() else {
                // Defensive: `all_loop` already filtered to Loop lines,
                // but skip silently if a future variant slips through.
                continue;
            };

            // Header: line name + circumference summary, padded to
            // fit before the first stop column.
            let header_summary = format!(
                "{} · C={:.1} · {} stop(s)",
                line.name(),
                circumference,
                line_info.serves().len(),
            );
            lines.push(Line::from(Span::styled(
                header_summary,
                Style::default()
                    .fg(palette::TITLE)
                    .add_modifier(Modifier::BOLD),
            )));

            lines.push(loop_track_row(
                line_info.serves(),
                circumference,
                strip_cols,
                ctx,
            ));
            lines.push(loop_cars_row(line_eid, circumference, strip_cols, ctx));
            // Spacer between consecutive loops so two strips don't
            // visually merge into a single-line ladder.
            lines.push(Line::from(""));
        }
    }
    lines
}

/// Build the per-loop track row: seam markers at both ends, `─` rule
/// across, and `[X]` labels at each stop's fractional position.
///
/// Stops at exactly position 0 land *on* the seam — they take the
/// seam cell with their own label and the wrap visual is implied by
/// the adjacent end of the strip. Stops at coincident positions
/// would overwrite each other; construction validation rejects that
/// case, so it's defensible to take the first-wins behaviour here.
fn loop_track_row<'a>(
    served: &'a [EntityId],
    circumference: f64,
    strip_cols: usize,
    ctx: &RenderCtx<'a>,
) -> Line<'a> {
    let mut cells: Vec<char> = vec!['─'; strip_cols];

    // Per-stop letter overlay: place the first character of each stop
    // name at its cyclic-fraction column. Adjacent stops on a tight
    // loop will collide; let the later one win (deterministic given
    // `served`'s sort order).
    for &stop_eid in served {
        let Some(stop) = ctx.sim.world().stop(stop_eid) else {
            continue;
        };
        let col = cyclic_column(stop.position(), circumference, strip_cols);
        if let Some(label) = stop.name().chars().next() {
            cells[col] = label;
        }
    }

    let mut spans = Vec::with_capacity(strip_cols + 2);
    spans.push(Span::styled("┃", Style::default().fg(palette::ACCENT)));
    let mut current_run: String = String::new();
    let mut current_style = Style::default().fg(palette::DIM_STRONG);
    for ch in cells {
        let style = if ch == '─' {
            Style::default().fg(palette::DIM_STRONG)
        } else {
            Style::default()
                .fg(palette::TITLE)
                .add_modifier(Modifier::BOLD)
        };
        if style != current_style && !current_run.is_empty() {
            spans.push(Span::styled(current_run.clone(), current_style));
            current_run.clear();
        }
        current_style = style;
        current_run.push(ch);
    }
    if !current_run.is_empty() {
        spans.push(Span::styled(current_run, current_style));
    }
    spans.push(Span::styled("┃", Style::default().fg(palette::ACCENT)));
    Line::from(spans)
}

/// Per-loop car-overlay row. Walks every car on the line, computes its
/// cyclic-fraction column, and writes a glyph (`▼` by default; `★` for
/// the focused car; flash-accent tint when the car was recently
/// touched).
fn loop_cars_row<'a>(
    line_eid: EntityId,
    circumference: f64,
    strip_cols: usize,
    ctx: &RenderCtx<'a>,
) -> Line<'a> {
    let mut cells: Vec<Span<'a>> = Vec::with_capacity(strip_cols + 2);
    let mut buf: Vec<Option<(char, Style)>> = vec![None; strip_cols];
    for car in ctx.cars {
        if car.elevator.line() != line_eid {
            continue;
        }
        let col = cyclic_column(car.position, circumference, strip_cols);
        let is_focused = ctx.focused == Some(car.id);
        let is_flashing = (ctx.flashing)(car.id);
        let glyph = if is_focused { '★' } else { '▼' };
        let style = if is_flashing {
            palette::flash_style()
        } else if is_focused {
            Style::default()
                .fg(palette::ACCENT)
                .add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(palette::TITLE)
        };
        // Multiple cars sharing a column → the later writer wins;
        // the headway clamp keeps real loops away from this case,
        // and a deterministic-but-imperfect collapse is more useful
        // than a heuristic merge glyph.
        buf[col] = Some((glyph, style));
    }
    // Leading-space column to balance the seam glyph on the track row,
    // so the car cells align with the track cells underneath them.
    cells.push(Span::raw(" "));
    for slot in buf {
        match slot {
            Some((ch, style)) => cells.push(Span::styled(ch.to_string(), style)),
            None => cells.push(Span::raw(" ")),
        }
    }
    cells.push(Span::raw(" "));
    Line::from(cells)
}

/// Map a cyclic position (`[0, circumference)`) to a column in the
/// strip, clamped to `[0, strip_cols - 1]`.
///
/// Positions are wrapped via `rem_euclid` so an off-range input (a
/// numerical near-circumference value or a negative drift) lands on
/// the correct cell rather than blowing the index. `strip_cols == 0`
/// would zero-divide; the caller already enforces `strip_cols >= 1`.
pub(super) fn cyclic_column(position: f64, circumference: f64, strip_cols: usize) -> usize {
    if !position.is_finite() || !circumference.is_finite() || circumference <= 0.0 {
        return 0;
    }
    let wrapped = position.rem_euclid(circumference);
    let fraction = wrapped / circumference;
    #[allow(
        clippy::cast_sign_loss,
        clippy::cast_possible_truncation,
        reason = "fraction is in [0,1); strip_cols is usize; product fits a usize"
    )]
    let raw = (fraction * strip_cols as f64) as usize;
    raw.min(strip_cols.saturating_sub(1))
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
    let rows_f = (rows as f64 - 1.0).max(1.0);
    for car in ctx.cars {
        let exact_row = (max_pos - car.position) / span * rows_f;
        let integer_row = (exact_row.floor() as usize).min(rows - 1);
        let fraction = exact_row - integer_row as f64;

        // Sub-cell motion: divide each cell into upper / lower halves
        // using `▀` and `▄` so a car between two integer rows reads
        // visibly between them at 144 fps. Four positions per cell
        // pair = twice the resolution of `round()` snapping.
        let glyph = sub_cell_glyph(car, ctx.focused, row, integer_row, fraction);
        spans.push(glyph);
        spans.push(Span::raw(" "));
    }
    Line::from(spans)
}

/// Pick the per-row sub-cell glyph for one car. `integer_row` is the
/// row containing the car's primary half; `fraction` is the 0..1
/// offset within that row (0.0 = top, 0.5 = halfway, 1.0 = bottom).
fn sub_cell_glyph<'a>(
    car: &CarView<'a>,
    focused: Option<EntityId>,
    row: usize,
    integer_row: usize,
    fraction: f64,
) -> Span<'a> {
    let direction_color = if car.elevator.going_up() {
        palette::UP
    } else if car.elevator.going_down() {
        palette::DOWN
    } else {
        palette::DIM_STRONG
    };
    let style = if Some(car.id) == focused {
        palette::focused_style()
    } else {
        Style::default().fg(direction_color)
    };
    if integer_row == row {
        if fraction < 0.25 {
            Span::styled("*", style)
        } else if fraction < 0.5 {
            Span::styled("▄", style)
        } else {
            Span::styled("·", Style::default().fg(palette::DIM))
        }
    } else if integer_row + 1 == row {
        if fraction >= 0.75 {
            Span::styled("*", style)
        } else if fraction >= 0.5 {
            Span::styled("▀", style)
        } else {
            Span::styled("·", Style::default().fg(palette::DIM))
        }
    } else {
        Span::styled("·", Style::default().fg(palette::DIM))
    }
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

    #[test]
    fn cyclic_column_maps_zero_to_first_cell() {
        // Position 0 maps to column 0 regardless of circumference,
        // matching the visual "seam-anchored" mental model.
        assert_eq!(cyclic_column(0.0, 100.0, 20), 0);
        assert_eq!(cyclic_column(0.0, 7.5, 4), 0);
    }

    #[test]
    fn cyclic_column_maps_half_circumference_to_middle() {
        // Half-circumference lands on the midpoint cell.
        assert_eq!(cyclic_column(50.0, 100.0, 20), 10);
        assert_eq!(cyclic_column(25.0, 100.0, 20), 5);
        assert_eq!(cyclic_column(75.0, 100.0, 20), 15);
    }

    #[test]
    fn cyclic_column_wraps_past_circumference() {
        // Cars near-but-past the seam end up back at column 0 rather
        // than off the right edge. Defends against accumulated
        // floating-point drift in the cyclic integrator.
        assert_eq!(cyclic_column(100.0, 100.0, 20), 0);
        assert_eq!(cyclic_column(101.5, 100.0, 20), 0);
        assert_eq!(cyclic_column(-10.0, 100.0, 20), 18);
    }

    #[test]
    fn cyclic_column_clamps_to_last_cell() {
        // The largest valid output is `strip_cols - 1`. Fractions
        // approaching 1.0 must not produce `strip_cols` and overflow
        // the buffer the caller indexes with this value.
        let last = cyclic_column(99.9999, 100.0, 20);
        assert!(
            last < 20,
            "cyclic_column must stay within [0, strip_cols); got {last}"
        );
    }

    #[test]
    fn cyclic_column_handles_degenerate_inputs() {
        // Non-finite and non-positive inputs collapse to column 0
        // rather than panic or zero-divide. Matches the cyclic helper
        // module's defensive-degradation contract.
        assert_eq!(cyclic_column(f64::NAN, 100.0, 20), 0);
        assert_eq!(cyclic_column(50.0, f64::INFINITY, 20), 0);
        assert_eq!(cyclic_column(50.0, 0.0, 20), 0);
        assert_eq!(cyclic_column(50.0, -100.0, 20), 0);
    }
}
