//! Events panel — filtered, scrollable view of the rolling event log.

use elevator_core::events::{Event, EventCategory};
use elevator_core::sim::Simulation;
use ratatui::Frame;
use ratatui::layout::Rect;
use ratatui::style::{Modifier, Style};
use ratatui::text::Line;
use ratatui::widgets::{Block, Borders, List, ListItem};

use crate::state::AppState;
use crate::ui::shaft;

/// Render the events panel.
pub fn draw(frame: &mut Frame<'_>, area: Rect, state: &AppState, sim: &Simulation) {
    let cars: Vec<_> = shaft::cars_iter(sim).collect();
    let focused = cars.get(state.focused_car_idx).map(|c| c.id);

    let title = build_title(state, focused);
    let block = Block::default().borders(Borders::BOTTOM).title(title);
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let visible_height = inner.height as usize;
    let items: Vec<ListItem<'_>> = state
        .visible_events(focused)
        .rev() // newest at the top
        .take(visible_height)
        .map(|logged| ListItem::new(Line::from(format_event_line(logged.tick, &logged.event))))
        .collect();

    frame.render_widget(List::new(items), inner);
}

/// Compose the panel title with the active filter summary.
fn build_title(
    state: &AppState,
    focused: Option<elevator_core::entity::EntityId>,
) -> Line<'static> {
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
        (true, Some(id)) => format!(" follow={id:?}"),
        (true, None) => " follow=(no car)".to_string(),
        (false, _) => String::new(),
    };
    Line::from(format!(" events · filter [{cats_str}]{follow} "))
        .style(Style::default().add_modifier(Modifier::BOLD))
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

/// Compact one-line representation of an event for the rolling log.
///
/// Only the stable fields (tick, primary entity references, key
/// state-change values) are rendered — full debug forms are too noisy
/// to be useful in a scrolling stream.
#[must_use]
pub fn format_event_line(drain_tick: u64, event: &Event) -> String {
    use Event::{
        CapacityChanged, DoorClosed, DoorCommandApplied, DoorCommandQueued, DoorOpened,
        ElevatorArrived, ElevatorAssigned, ElevatorDeparted, ElevatorIdle, ElevatorRecalled,
        ElevatorRepositioned, ElevatorRepositioning, MovementAborted, PassingFloor, RiderAbandoned,
        RiderBoarded, RiderEjected, RiderExited, RiderRejected, RiderRerouted, RiderSettled,
        RiderSpawned, ServiceModeChanged,
    };
    let body = match event {
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
    };
    format!("t={drain_tick:>6}  {body}")
}
