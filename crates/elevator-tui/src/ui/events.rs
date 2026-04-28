//! Events panel — filtered, scrollable view of the rolling event log.

use elevator_core::events::{Event, EventCategory};
use elevator_core::sim::Simulation;
use ratatui::Frame;
use ratatui::layout::Rect;
use ratatui::style::Style;
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, BorderType, Borders, List, ListItem};

use crate::state::AppState;
use crate::ui::{palette, shaft};

/// Render the events panel.
pub fn draw(frame: &mut Frame<'_>, area: Rect, state: &AppState, sim: &Simulation) {
    let cars: Vec<_> = shaft::cars_iter(sim).collect();
    let focused = cars.get(state.focused_car_idx).map(|c| c.id);

    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(Style::default().fg(palette::DIM_STRONG))
        .title(super::bracketed_title(
            "events",
            Some(filter_summary(state, focused)),
        ));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let visible_height = inner.height as usize;
    let items: Vec<ListItem<'_>> = state
        .visible_events(focused)
        .rev() // newest at the top
        .take(visible_height)
        .map(|logged| {
            ListItem::new(Line::from(vec![
                Span::styled(
                    format!("t={:>6} ", logged.tick),
                    Style::default().fg(palette::DIM),
                ),
                Span::styled(
                    format_event_body(&logged.event),
                    Style::default().fg(category_color(logged.event.category())),
                ),
            ]))
        })
        .collect();

    frame.render_widget(List::new(items), inner);
}

/// Build the suffix shown in the bracketed panel title — filter and
/// optional follow target.
fn filter_summary(state: &AppState, focused: Option<elevator_core::entity::EntityId>) -> String {
    let cats: Vec<&'static str> = ALL_CATEGORIES_ORDERED
        .iter()
        .copied()
        .filter_map(|(category, label)| state.category_filter.contains(&category).then_some(label))
        .collect();
    let cats_str = if cats.len() == ALL_CATEGORIES_ORDERED.len() {
        "all".to_string()
    } else if cats.is_empty() {
        "(none)".to_string()
    } else {
        cats.join("·")
    };
    let follow = match (state.follow_focused, focused) {
        (true, Some(id)) => format!(" · follow={id:?}"),
        (true, None) => " · follow=(no car)".to_string(),
        (false, _) => String::new(),
    };
    format!("filter [{cats_str}]{follow}")
}

/// Pick a tint per event category so the rolling log reads at a glance.
const fn category_color(category: EventCategory) -> ratatui::style::Color {
    match category {
        EventCategory::Elevator => palette::TITLE,
        EventCategory::Rider => palette::SUCCESS,
        EventCategory::Dispatch => palette::ACCENT,
        EventCategory::Reposition => palette::WARN,
        EventCategory::Direction => palette::UP,
        EventCategory::Observability => palette::DIM,
        // Topology + future variants share the muted body tint.
        _ => palette::DIM_STRONG,
    }
}

/// Categories in the same order as the digit hotkeys (1 = first).
const ALL_CATEGORIES_ORDERED: &[(EventCategory, &str)] = &[
    (EventCategory::Elevator, "Elev"),
    (EventCategory::Rider, "Rdr"),
    (EventCategory::Dispatch, "Dsp"),
    (EventCategory::Topology, "Top"),
    (EventCategory::Reposition, "Rep"),
    (EventCategory::Direction, "Dir"),
    (EventCategory::Observability, "Obs"),
];

/// Tick-prefixed one-line representation; preserved for callers that
/// want a single string (e.g. drilldown panel reuses this rendering).
#[must_use]
pub fn format_event_line(drain_tick: u64, event: &Event) -> String {
    format!("t={drain_tick:>6}  {}", format_event_body(event))
}

/// Compact body-only representation (no tick prefix) used by the
/// rolling-log renderer, which prints the tick in a separate `Span`
/// so the prefix can be dimmed.
#[must_use]
pub fn format_event_body(event: &Event) -> String {
    use Event::{
        CapacityChanged, DoorClosed, DoorCommandApplied, DoorCommandQueued, DoorOpened,
        ElevatorArrived, ElevatorAssigned, ElevatorDeparted, ElevatorIdle, ElevatorRecalled,
        ElevatorRepositioned, ElevatorRepositioning, MovementAborted, PassingFloor, RiderAbandoned,
        RiderBoarded, RiderEjected, RiderExited, RiderRejected, RiderRerouted, RiderSettled,
        RiderSpawned, ServiceModeChanged,
    };
    match event {
        ElevatorDeparted {
            elevator,
            from_stop,
            ..
        } => format!("ElevDeparted   e={elevator:?} from={from_stop:?}"),
        ElevatorArrived {
            elevator, at_stop, ..
        } => format!("ElevArrived    e={elevator:?} at={at_stop:?}"),
        DoorOpened { elevator, .. } => format!("DoorOpened     e={elevator:?}"),
        DoorClosed { elevator, .. } => format!("DoorClosed     e={elevator:?}"),
        DoorCommandQueued { elevator, .. } => format!("DoorCmdQueued  e={elevator:?}"),
        DoorCommandApplied { elevator, .. } => format!("DoorCmdApplied e={elevator:?}"),
        PassingFloor {
            elevator,
            stop,
            moving_up,
            ..
        } => format!(
            "PassingFloor   e={elevator:?} stop={stop:?} dir={}",
            if *moving_up { "up" } else { "down" }
        ),
        MovementAborted {
            elevator,
            brake_target,
            ..
        } => {
            format!("MoveAborted    e={elevator:?} → {brake_target:?}")
        }
        ElevatorIdle { elevator, .. } => format!("ElevIdle       e={elevator:?}"),
        ElevatorAssigned { elevator, stop, .. } => {
            format!("Assigned       e={elevator:?} stop={stop:?}")
        }
        ElevatorRepositioning {
            elevator, to_stop, ..
        } => {
            format!("Repositioning  e={elevator:?} → {to_stop:?}")
        }
        ElevatorRepositioned { elevator, .. } => format!("Repositioned   e={elevator:?}"),
        ElevatorRecalled { elevator, .. } => format!("Recalled       e={elevator:?}"),
        CapacityChanged {
            elevator,
            current_load,
            capacity,
            ..
        } => format!("CapacityChange e={elevator:?} {current_load:?}/{capacity:?}"),
        ServiceModeChanged { elevator, to, .. } => {
            format!("ServiceMode    e={elevator:?} → {to:?}")
        }
        RiderSpawned {
            rider,
            origin,
            destination,
            ..
        } => {
            format!("RiderSpawned   r={rider:?} {origin:?} → {destination:?}")
        }
        RiderBoarded {
            rider, elevator, ..
        } => format!("RiderBoarded   r={rider:?} e={elevator:?}"),
        RiderExited {
            rider,
            elevator,
            stop,
            ..
        } => {
            format!("RiderExited    r={rider:?} e={elevator:?} at={stop:?}")
        }
        RiderRejected {
            rider, elevator, ..
        } => format!("RiderRejected  r={rider:?} e={elevator:?}"),
        RiderAbandoned { rider, .. } => format!("RiderAbandoned r={rider:?}"),
        RiderEjected { rider, .. } => format!("RiderEjected   r={rider:?}"),
        RiderRerouted { rider, .. } => format!("RiderRerouted  r={rider:?}"),
        RiderSettled { rider, .. } => format!("RiderSettled   r={rider:?}"),
        // Anything else: fall back to short Debug. The compact strings
        // above cover the common-case noise; long-tail variants are
        // still legible just less aligned.
        other => format!("{other:?}"),
    }
}
