//! Car calls: the floor buttons riders press from inside a cab.
//!
//! When a rider boards in [`HallCallMode::Classic`](
//! crate::dispatch::HallCallMode) the cab doesn't yet know where they want
//! to go — the hall call only conveyed direction. At that point the rider
//! "presses a floor button" and a [`CarCall`] is registered on the car.
//! Dispatch reads the list to plan intermediate stops on the way to the
//! sweep's far end.
//!
//! In `Destination` mode car calls are unused: the kiosk entry at the
//! hall reveals the destination up front, and the car's
//! [`DestinationQueue`](crate::components::DestinationQueue) is populated
//! directly by [`DestinationDispatch`](crate::dispatch::DestinationDispatch).

use serde::{Deserialize, Serialize};

use crate::entity::EntityId;

/// A floor button press inside `car` requesting service to `floor`.
///
/// Stored as a list attached to each elevator. One `CarCall` per
/// `(car, floor)` pair — subsequent presses for the same floor increase
/// `pending_riders` rather than duplicating the call.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[non_exhaustive]
pub struct CarCall {
    /// Elevator the button was pressed inside.
    pub car: EntityId,
    /// Stop the button requests.
    pub floor: EntityId,
    /// Tick the button was pressed.
    pub press_tick: u64,
    /// Tick dispatch first sees this call (after ack latency).
    /// `None` while still pending acknowledgement.
    pub acknowledged_at: Option<u64>,
    /// Riders who pressed the button (usually one; aggregated if multiple
    /// riders heading to the same floor board together).
    pub pending_riders: Vec<EntityId>,
}

impl CarCall {
    /// Create a new unacknowledged car call.
    #[must_use]
    pub const fn new(car: EntityId, floor: EntityId, press_tick: u64) -> Self {
        Self {
            car,
            floor,
            press_tick,
            acknowledged_at: None,
            pending_riders: Vec::new(),
        }
    }

    /// Returns `true` once the ack latency has elapsed and dispatch can
    /// plan around this call.
    #[must_use]
    pub const fn is_acknowledged(&self) -> bool {
        self.acknowledged_at.is_some()
    }
}
