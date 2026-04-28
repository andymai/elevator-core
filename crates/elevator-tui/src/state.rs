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

/// Which side panel currently dominates the right column.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RightPanel {
    /// Events / Dispatch / Metrics stack (default).
    Overview,
    /// Per-car drill-down (queue, riders, recent car-touching events).
    DrillDown,
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

/// Bounded ring of recent samples used by sparkline panels.
///
/// Backed by a contiguous `Vec` (not `VecDeque`) so the renderer can
/// borrow the buffer as `&[u64]` without allocating per frame. When
/// the ring is full, `push` shifts existing samples down by one slot
/// — O(n) but n ≤ `SPARKLINE_CAP` (256) is a single cache line and
/// happens at most once per tick, dwarfed by the surrounding sim work.
/// The trade is worth it: render runs at ~30 Hz and reads the slice
/// twice per frame, so a per-render `collect` adds up.
#[derive(Debug, Clone)]
pub struct Sparkline {
    /// Samples in insertion order; oldest at index 0.
    pub samples: Vec<u64>,
    /// Maximum sample count retained.
    pub capacity: usize,
}

impl Sparkline {
    /// New empty sparkline of the given capacity.
    #[must_use]
    pub fn new(capacity: usize) -> Self {
        Self {
            samples: Vec::with_capacity(capacity),
            capacity,
        }
    }

    /// Push a sample, dropping the oldest if at capacity.
    pub fn push(&mut self, value: u64) {
        if self.samples.len() == self.capacity {
            // Shift everything down by one. See struct doc for the
            // rationale (small cap, infrequent calls, alloc-free reads).
            self.samples.copy_within(1.., 0);
            self.samples.pop();
        }
        self.samples.push(value);
    }

    /// Slice view of the buffered samples (oldest first), suitable for
    /// `ratatui::widgets::Sparkline::data`. Zero-cost; no allocation.
    #[must_use]
    pub fn as_slice(&self) -> &[u64] {
        &self.samples
    }
}

/// Top-level interactive app state.
#[derive(Debug)]
#[allow(clippy::struct_excessive_bools)]
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
    /// Right-column mode: overview vs. per-car drill-down.
    pub right_panel: RightPanel,
    /// Bounded ring of drained events (newest at end).
    pub event_log: std::collections::VecDeque<LoggedEvent>,
    /// Cap for `event_log`.
    pub event_log_cap: usize,
    /// p95 wait-time samples per tick.
    pub wait_sparkline: Sparkline,
    /// Total occupancy across all cars per tick.
    pub occupancy_sparkline: Sparkline,
    /// Spawns-per-second samples, one per second of sim time.
    /// Updated from the spawn counter every `ticks_per_second` ticks.
    pub spawn_rate_sparkline: Sparkline,
    /// Spawns observed in the current 1-second bucket. Reset to 0 each
    /// time we push to [`spawn_rate_sparkline`](Self::spawn_rate_sparkline).
    pub spawn_bucket: u64,
    /// Tick at which the current spawn-rate bucket started; rolled over
    /// once `current_tick - bucket_started_at >= ticks_per_second`.
    pub bucket_started_at: u64,
    /// In-memory snapshot slot (`s` saves, `l` restores).
    pub snapshot_slot: Option<elevator_core::snapshot::WorldSnapshot>,
    /// Status banner (transient feedback after a hotkey action).
    pub status: Option<String>,
    /// Monotonically incrementing counter bumped each time [`flash`] is
    /// called. The event loop watches this to reset its wall-clock
    /// timer when one flash *replaces* another, so a new banner gets
    /// its full display time even when the previous one was still
    /// showing. (See `Self::flash`.)
    ///
    /// [`flash`]: Self::flash
    pub status_seq: u64,
    /// Help overlay is visible (toggled by `?`).
    pub show_help: bool,
    /// First-launch welcome overlay is visible. Dismissed by any key.
    /// Default `true` unless suppressed by `--no-welcome`.
    pub show_welcome: bool,
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
            right_panel: RightPanel::Overview,
            event_log: std::collections::VecDeque::with_capacity(EVENT_LOG_CAP),
            event_log_cap: EVENT_LOG_CAP,
            wait_sparkline: Sparkline::new(SPARKLINE_CAP),
            occupancy_sparkline: Sparkline::new(SPARKLINE_CAP),
            spawn_rate_sparkline: Sparkline::new(SPARKLINE_CAP),
            spawn_bucket: 0,
            bucket_started_at: 0,
            snapshot_slot: None,
            status: None,
            status_seq: 0,
            show_help: false,
            show_welcome: true,
            quit: false,
        }
    }

    /// Suppress the first-launch welcome overlay. Honoured by `--no-welcome`.
    #[must_use]
    pub const fn without_welcome(mut self) -> Self {
        self.show_welcome = false;
        self
    }

    /// Roll the 1-second spawn-rate bucket forward, pushing samples to
    /// [`spawn_rate_sparkline`](Self::spawn_rate_sparkline) every full
    /// second of sim time. Called once per `step_once`.
    pub fn advance_spawn_bucket(&mut self, current_tick: u64, ticks_per_second: f64) {
        let window = ticks_per_second.max(1.0).round() as u64;
        // Push at most one sample per call: even if `current_tick` jumps
        // (`,` step×10), the bucket math is monotonic — leftover ticks
        // roll into the next iteration. We don't backfill missed
        // buckets because the metric is "spawns observed per real
        // second", not "rate at every wall-clock second".
        if current_tick.saturating_sub(self.bucket_started_at) >= window {
            self.spawn_rate_sparkline.push(self.spawn_bucket);
            self.spawn_bucket = 0;
            self.bucket_started_at = current_tick;
        }
    }

    /// Increment the rolling spawn bucket. Call once per `RiderSpawned`
    /// event drained from the sim.
    pub const fn observe_spawn(&mut self) {
        self.spawn_bucket = self.spawn_bucket.saturating_add(1);
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
    ///
    /// Increments [`status_seq`](Self::status_seq) so the event loop
    /// can detect a back-to-back replacement and reset its display
    /// timer.
    pub fn flash(&mut self, msg: impl Into<String>) {
        self.status = Some(msg.into());
        self.status_seq = self.status_seq.wrapping_add(1);
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
/// Cap on retained sparkline samples.
const SPARKLINE_CAP: usize = 256;

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
    fn sparkline_pushes_drop_oldest() {
        let mut spark = Sparkline::new(3);
        spark.push(1);
        spark.push(2);
        spark.push(3);
        spark.push(4);
        assert_eq!(spark.as_slice(), &[2, 3, 4]);
    }

    #[test]
    fn flash_increments_status_seq_each_call() {
        let mut state = AppState::new(1.0);
        assert_eq!(state.status_seq, 0);
        state.flash("first");
        assert_eq!(state.status_seq, 1);
        state.flash("second"); // replaces the first while still set
        assert_eq!(state.status_seq, 2);
        // The event loop in app.rs uses this counter to reset its
        // wall-clock display timer; a stale counter would let the
        // second flash inherit the first's age and disappear early.
    }

    #[test]
    fn all_categories_set_size_matches_known_variants() {
        // Pin the expected count so a new EventCategory variant in core
        // forces an update here. Bumping this is a one-line ack that the
        // TUI's filter UI needs a new toggle hotkey too.
        assert_eq!(all_categories().len(), 7);
    }
}
