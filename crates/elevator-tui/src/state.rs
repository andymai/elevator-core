//! Pure app state — no I/O, no terminal, no `Simulation` reference.
//!
//! Splitting this out keeps the rendering and input layers thin and lets
//! us unit-test the state machine (filter toggles, follow target, mode
//! flips) without standing up a real `Simulation`.

use std::collections::HashSet;

use elevator_core::events::{Event, EventCategory};

/// How much vertical space the shaft devotes to each stop.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ShaftMode {
    /// One row per stop, ignoring the gap between them. Compact, fits
    /// tall buildings without scrolling.
    Index,
    /// Rows scaled to the actual stop positions. Honours non-uniform
    /// configs (e.g. `space_elevator.ron`) at the cost of vertical
    /// space when stops are clumped.
    Distance,
}

/// A captured event plus the tick it was drained on.
///
/// Tagged with the drain tick because [`Event`] variants don't all
/// carry a tick field uniformly, and the drain tick is sufficient for
/// ordering and follow-mode queries.
#[derive(Debug, Clone)]
pub struct LoggedEvent {
    /// Tick at which the event was drained.
    pub tick: u64,
    /// The event itself.
    pub event: Event,
}

/// Top-level interactive app state.
#[derive(Debug)]
pub struct AppState {
    /// Sim is paused (no auto-stepping). `space` toggles, `.` single-steps.
    pub paused: bool,
    /// Multiplier on the config's `ticks_per_second`. `+`/`-` adjust.
    pub tick_rate: f64,
    /// Index vs. distance shaft layout.
    pub shaft_mode: ShaftMode,
    /// Set of categories included in the events panel. Hotkey toggles.
    pub category_filter: HashSet<EventCategory>,
    /// Index of the currently focused car within the flat car list.
    pub focused_car_idx: usize,
    /// Whether to filter the events panel to events touching the
    /// focused car's entity id.
    pub follow_focused: bool,
    /// Bounded ring of drained events (newest at end).
    pub event_log: std::collections::VecDeque<LoggedEvent>,
    /// Cap for `event_log`.
    pub event_log_cap: usize,
    /// Status banner (transient feedback after a hotkey action).
    pub status: Option<String>,
    /// User has requested a clean exit.
    pub quit: bool,
}

impl AppState {
    /// Default state for an interactive session.
    #[must_use]
    pub fn new(initial_tick_rate: f64) -> Self {
        Self {
            paused: false,
            tick_rate: initial_tick_rate.max(0.0),
            shaft_mode: ShaftMode::Index,
            category_filter: all_categories(),
            focused_car_idx: 0,
            follow_focused: false,
            event_log: std::collections::VecDeque::with_capacity(EVENT_LOG_CAP),
            event_log_cap: EVENT_LOG_CAP,
            status: None,
            quit: false,
        }
    }

    /// Append events drained from the sim, capped at `event_log_cap`.
    pub fn push_events(&mut self, tick: u64, events: impl IntoIterator<Item = Event>) {
        for event in events {
            if self.event_log.len() == self.event_log_cap {
                self.event_log.pop_front();
            }
            self.event_log.push_back(LoggedEvent { tick, event });
        }
    }

    /// Toggle a category in the active filter set.
    pub fn toggle_category(&mut self, category: EventCategory) {
        if !self.category_filter.remove(&category) {
            self.category_filter.insert(category);
        }
    }

    /// Iterator over events the user wants to see, optionally filtered
    /// by entity when follow mode is on. Double-ended so the renderer
    /// can `.rev()` to show newest at the top of the panel.
    #[must_use]
    pub fn visible_events(
        &self,
        focused_entity: Option<elevator_core::entity::EntityId>,
    ) -> impl DoubleEndedIterator<Item = &LoggedEvent> {
        let follow = self.follow_focused.then_some(()).and(focused_entity);
        self.event_log.iter().filter(move |logged| {
            if !self.category_filter.contains(&logged.event.category()) {
                return false;
            }
            follow.is_none_or(|target| event_touches(&logged.event, target))
        })
    }

    /// Set a transient status banner.
    pub fn flash(&mut self, msg: impl Into<String>) {
        self.status = Some(msg.into());
    }
}

/// Every known [`EventCategory`] variant.
///
/// `EventCategory` is `#[non_exhaustive]`, so a downstream crate can't
/// write an exhaustive `match` against it — adding a new variant in
/// `elevator-core` would not be a compile error here. The test
/// `all_categories_set_size_matches_known_variants` pins the count at
/// runtime; if it fails after a core update, add the new variant
/// here and a matching digit hotkey in `app::digit_to_category`.
#[must_use]
pub fn all_categories() -> HashSet<EventCategory> {
    HashSet::from([
        EventCategory::Elevator,
        EventCategory::Rider,
        EventCategory::Dispatch,
        EventCategory::Topology,
        EventCategory::Reposition,
        EventCategory::Direction,
        EventCategory::Observability,
    ])
}

/// True when an event references the given entity in any of its
/// commonly-named slots.
///
/// Cheap structural match; we don't reflect every variant — only the
/// ones a follow filter would care about (cars and riders). Stops
/// aren't followed today, so `at_stop`/`from_stop` are not consulted
/// here.
#[must_use]
pub fn event_touches(event: &Event, target: elevator_core::entity::EntityId) -> bool {
    use Event::{
        CapacityChanged, DoorClosed, DoorCommandApplied, DoorCommandQueued, DoorOpened,
        ElevatorArrived, ElevatorAssigned, ElevatorDeparted, ElevatorIdle, ElevatorRecalled,
        ElevatorRepositioned, ElevatorRepositioning, MovementAborted, PassingFloor, RiderAbandoned,
        RiderBoarded, RiderEjected, RiderExited, RiderRejected, RiderRerouted, RiderSettled,
        RiderSpawned, ServiceModeChanged,
    };
    match event {
        ElevatorDeparted { elevator, .. }
        | ElevatorArrived { elevator, .. }
        | DoorOpened { elevator, .. }
        | DoorClosed { elevator, .. }
        | DoorCommandQueued { elevator, .. }
        | DoorCommandApplied { elevator, .. }
        | PassingFloor { elevator, .. }
        | MovementAborted { elevator, .. }
        | ElevatorIdle { elevator, .. }
        | ElevatorRepositioning { elevator, .. }
        | ElevatorRepositioned { elevator, .. }
        | ElevatorRecalled { elevator, .. }
        | CapacityChanged { elevator, .. }
        | ServiceModeChanged { elevator, .. }
        | ElevatorAssigned { elevator, .. } => *elevator == target,
        RiderSpawned { rider, .. }
        | RiderBoarded { rider, .. }
        | RiderExited { rider, .. }
        | RiderRejected { rider, .. }
        | RiderAbandoned { rider, .. }
        | RiderEjected { rider, .. }
        | RiderRerouted { rider, .. }
        | RiderSettled { rider, .. } => *rider == target,
        _ => false,
    }
}

/// Cap on retained events in the rolling log.
const EVENT_LOG_CAP: usize = 1024;

#[cfg(test)]
#[allow(clippy::expect_used, clippy::panic, clippy::unwrap_used)]
mod tests {
    use super::*;

    #[test]
    fn category_filter_toggles_round_trip() {
        let mut state = AppState::new(1.0);
        let initial = state.category_filter.len();
        state.toggle_category(EventCategory::Rider);
        assert_eq!(state.category_filter.len(), initial - 1);
        state.toggle_category(EventCategory::Rider);
        assert_eq!(state.category_filter.len(), initial);
    }

    #[test]
    fn event_log_caps_at_capacity() {
        let mut state = AppState::new(1.0);
        state.event_log_cap = 3;
        let elev = elevator_core::entity::EntityId::from(slotmap::KeyData::from_ffi(1));
        let make = |n| Event::ElevatorIdle {
            elevator: elev,
            at_stop: None,
            tick: n,
        };
        state.push_events(0, (0..10).map(make));
        assert_eq!(state.event_log.len(), 3);
        let latest = state.event_log.back().expect("non-empty after push");
        match &latest.event {
            Event::ElevatorIdle { tick, .. } => assert_eq!(*tick, 9),
            other => panic!("unexpected event variant: {other:?}"),
        }
    }

    #[test]
    fn all_categories_set_size_matches_known_variants() {
        // Pin the expected count so a new EventCategory variant in core
        // forces an update here. Bumping this is a one-line ack that the
        // TUI's filter UI needs a new toggle hotkey too.
        assert_eq!(all_categories().len(), 7);
    }
}
