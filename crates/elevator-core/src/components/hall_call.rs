//! Hall calls: the "up"/"down" buttons at each stop.
//!
//! A [`HallCall`] is the sim's representation of a pressed hall button.
//! At most two calls exist per stop (one per [`CallDirection`]), aggregated
//! across every rider who wants to go that direction. Calls are the unit
//! dispatch strategies see — not riders — so the sim can model real
//! collective-control elevators where a car doesn't know *who* is waiting,
//! only that someone going up has pressed the button on floor N.
//!
//! ## Lifecycle
//!
//! 1. **Pressed** — a rider spawns or a game explicitly calls
//!    [`Simulation::press_hall_button`](crate::sim::Simulation::press_hall_button).
//!    `HallCall::press_tick` is set; `acknowledged_at` is `None`.
//! 2. **Acknowledged** — after the group's `ack_latency_ticks` have elapsed,
//!    `acknowledged_at` is set and the call becomes visible to dispatch.
//! 3. **Assigned** — dispatch pairs the call with a car. The assignment
//!    is keyed per-line in [`HallCall::assigned_cars_by_line`] so a stop
//!    shared by multiple lines (e.g. a sky-lobby served by low, high, and
//!    express banks) can record every bank's choice independently. Within
//!    a single line the latest assignment replaces the previous one; across
//!    lines the map grows until the call is cleared or the car is removed.
//! 4. **Cleared** — the assigned car arrives at this stop with its
//!    indicator lamps matching `direction` and opens doors. The HallCall
//!    is removed; an `Event::HallCallCleared` is emitted.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use crate::entity::EntityId;

/// Direction a hall call is requesting service in.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[non_exhaustive]
pub enum CallDirection {
    /// Requesting service upward (toward higher position).
    Up,
    /// Requesting service downward (toward lower position).
    Down,
}

impl CallDirection {
    /// Derive a call direction from the sign of `dest_pos - origin_pos`.
    /// Returns `None` when the two stops share a position (no travel
    /// needed — no hall call required).
    #[must_use]
    pub fn between(origin_pos: f64, dest_pos: f64) -> Option<Self> {
        if dest_pos > origin_pos {
            Some(Self::Up)
        } else if dest_pos < origin_pos {
            Some(Self::Down)
        } else {
            None
        }
    }

    /// The opposite direction.
    #[must_use]
    pub const fn opposite(self) -> Self {
        match self {
            Self::Up => Self::Down,
            Self::Down => Self::Up,
        }
    }
}

/// A pressed hall button at `stop` requesting service in `direction`.
///
/// Stored per `(stop, direction)` pair — at most two per stop. Built-in
/// dispatch reads calls via [`DispatchManifest::iter_hall_calls`](
/// crate::dispatch::DispatchManifest::iter_hall_calls).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[non_exhaustive]
pub struct HallCall {
    /// Stop where the button was pressed.
    pub stop: EntityId,
    /// Direction the button requests.
    pub direction: CallDirection,
    /// Tick at which the button was first pressed.
    pub press_tick: u64,
    /// Tick at which dispatch first sees this call (after ack latency).
    /// `None` while still pending acknowledgement.
    pub acknowledged_at: Option<u64>,
    /// Ticks the controller took to acknowledge this call, copied from
    /// the serving group's [`ElevatorGroup::ack_latency_ticks`](
    /// crate::dispatch::ElevatorGroup::ack_latency_ticks) when the
    /// button was first pressed. Stored on the call itself so
    /// `advance_transient` can tick the counter without needing to
    /// look up the group.
    pub ack_latency_ticks: u32,
    /// Riders currently waiting on this call. Empty in
    /// [`HallCallMode::Destination`](crate::dispatch::HallCallMode) mode
    /// — calls there carry a single destination per press instead of a
    /// shared direction.
    pub pending_riders: Vec<EntityId>,
    /// Destination requested at press time. Populated in
    /// [`HallCallMode::Destination`](crate::dispatch::HallCallMode) mode
    /// (lobby kiosk); `None` in Classic mode.
    pub destination: Option<EntityId>,
    /// Cars assigned to this call by dispatch, keyed by the line entity
    /// the car runs on. A stop served by multiple lines can hold one
    /// entry per line simultaneously — the low-bank car, the express
    /// car, and the service car can all be en route to the same lobby
    /// without one overwriting another. Within a single line the latest
    /// assignment replaces the previous one.
    ///
    /// Pre-15.23 snapshots stored a single `assigned_car: Option<EntityId>`
    /// field. Those snapshots silently drop the transient assignment on
    /// load (serde's default unknown-field handling); the next dispatch
    /// pass repopulates this map.
    #[serde(default)]
    pub assigned_cars_by_line: BTreeMap<EntityId, EntityId>,
    /// When `true`, dispatch is forbidden from reassigning this call to
    /// a different car. Set by
    /// [`Simulation::pin_assignment`](crate::sim::Simulation::pin_assignment).
    pub pinned: bool,
}

impl HallCall {
    /// Create a new unacknowledged, unassigned hall call.
    #[must_use]
    pub const fn new(stop: EntityId, direction: CallDirection, press_tick: u64) -> Self {
        Self {
            stop,
            direction,
            press_tick,
            acknowledged_at: None,
            ack_latency_ticks: 0,
            pending_riders: Vec::new(),
            destination: None,
            assigned_cars_by_line: BTreeMap::new(),
            pinned: false,
        }
    }

    /// Returns `true` when dispatch is allowed to see this call (ack
    /// latency has elapsed).
    #[must_use]
    pub const fn is_acknowledged(&self) -> bool {
        self.acknowledged_at.is_some()
    }

    /// Any car currently assigned to this call, preferring the entry
    /// with the numerically smallest line-entity key (stable across
    /// ticks because `BTreeMap` iteration is ordered). `None` when no
    /// line has recorded an assignment yet.
    ///
    /// This matches the pre-per-line `assigned_car` semantics for
    /// callers that just want "is anyone coming?" The richer shape is
    /// available directly on [`assigned_cars_by_line`](Self::assigned_cars_by_line).
    #[must_use]
    pub fn any_assigned_car(&self) -> Option<EntityId> {
        self.assigned_cars_by_line.values().next().copied()
    }
}
