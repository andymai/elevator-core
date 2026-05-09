//! Per-tick demand picture handed to dispatch strategies.
//!
//! [`DispatchManifest`] is the read-only view of waiting riders, in-transit
//! riders, hall calls, car calls, and rolling arrival counts that
//! [`DispatchStrategy::rank`](crate::dispatch::DispatchStrategy::rank) uses
//! to score `(car, stop)` pairs.
//! It's built once per group per tick by `systems::dispatch::build_manifest`
//! and discarded after the assignment pass.

use std::collections::BTreeMap;

use crate::components::{CallDirection, CarCall, HallCall, Weight};
use crate::entity::EntityId;

/// Metadata about a single rider, available to dispatch strategies.
#[derive(Debug, Clone)]
#[non_exhaustive]
pub struct RiderInfo {
    /// Rider entity ID.
    pub id: EntityId,
    /// Rider's destination stop entity (from route).
    pub destination: Option<EntityId>,
    /// Rider weight.
    pub weight: Weight,
    /// Ticks this rider has been waiting (0 if riding).
    pub wait_ticks: u64,
}

/// Full demand picture for dispatch decisions.
///
/// Contains per-rider metadata grouped by stop, enabling entity-aware
/// dispatch strategies (priority, weight-aware, VIP-first, etc.).
///
/// Uses `BTreeMap` for deterministic iteration order.
#[derive(Debug, Clone, Default)]
pub struct DispatchManifest {
    /// Riders waiting at each stop, with full per-rider metadata.
    pub(crate) waiting_at_stop: BTreeMap<EntityId, Vec<RiderInfo>>,
    /// Riders currently aboard elevators, grouped by their destination stop.
    pub(crate) riding_to_stop: BTreeMap<EntityId, Vec<RiderInfo>>,
    /// Number of residents at each stop (read-only hint for dispatch strategies).
    pub(crate) resident_count_at_stop: BTreeMap<EntityId, usize>,
    /// Pending hall calls at each stop — at most two entries per stop
    /// (one per [`CallDirection`]). Populated only for stops served by
    /// the group being dispatched. Strategies read this to rank based on
    /// call age, pending-rider count, pin flags, or DCS destinations.
    pub(crate) hall_calls_at_stop: BTreeMap<EntityId, Vec<HallCall>>,
    /// Floor buttons pressed inside each car in the group. Keyed by car
    /// entity. Strategies read this to plan intermediate stops without
    /// poking into `World` directly.
    pub(crate) car_calls_by_car: BTreeMap<EntityId, Vec<CarCall>>,
    /// Recent arrivals per stop, counted over
    /// [`DispatchManifest::arrival_window_ticks`] ticks. Populated from
    /// the [`crate::arrival_log::ArrivalLog`] world resource each pass
    /// so strategies can read a traffic-rate signal without touching
    /// world state directly.
    pub(crate) arrivals_at_stop: BTreeMap<EntityId, u64>,
    /// Window the `arrivals_at_stop` counts cover, in ticks. Exposed so
    /// strategies interpreting the raw counts can convert them to a
    /// rate (per tick or per second).
    pub(crate) arrival_window_ticks: u64,
}

impl DispatchManifest {
    /// Number of riders waiting at a stop.
    #[must_use]
    pub fn waiting_count_at(&self, stop: EntityId) -> usize {
        self.waiting_at_stop.get(&stop).map_or(0, Vec::len)
    }

    /// Total weight of riders waiting at a stop.
    #[must_use]
    pub fn total_weight_at(&self, stop: EntityId) -> f64 {
        self.waiting_at_stop
            .get(&stop)
            .map_or(0.0, |riders| riders.iter().map(|r| r.weight.value()).sum())
    }

    /// Number of riders heading to a stop (aboard elevators).
    #[must_use]
    pub fn riding_count_to(&self, stop: EntityId) -> usize {
        self.riding_to_stop.get(&stop).map_or(0, Vec::len)
    }

    /// Whether a stop has any demand for this group: waiting riders,
    /// riders heading there, or a *rider-less* hall call (one that
    /// `press_hall_button` placed without a backing rider). Pre-fix
    /// the rider-less case was invisible to every built-in dispatcher,
    /// so explicit button presses with no associated rider went
    /// unanswered indefinitely (#255).
    ///
    /// Hall calls *with* `pending_riders` are not double-counted —
    /// those riders already appear in `waiting_count_at` for the
    /// groups whose dispatch surface they belong to. Adding the call
    /// to `has_demand` for *every* group that serves the stop would
    /// pull cars from groups the rider doesn't even want, causing
    /// open/close oscillation regression that the multi-group test
    /// `dispatch_ignores_waiting_rider_targeting_another_group` pins.
    #[must_use]
    pub fn has_demand(&self, stop: EntityId) -> bool {
        self.waiting_count_at(stop) > 0
            || self.riding_count_to(stop) > 0
            || self
                .hall_calls_at_stop
                .get(&stop)
                .is_some_and(|calls| calls.iter().any(|c| c.pending_riders.is_empty()))
    }

    /// Number of residents at a stop (read-only hint, not active demand).
    #[must_use]
    pub fn resident_count_at(&self, stop: EntityId) -> usize {
        self.resident_count_at_stop.get(&stop).copied().unwrap_or(0)
    }

    /// Rider arrivals at `stop` within the last
    /// [`arrival_window_ticks`](Self::arrival_window_ticks) ticks. The
    /// signal is the rolling-window per-stop arrival rate that
    /// commercial controllers use to pick a traffic mode and that
    /// [`crate::dispatch::reposition::PredictiveParking`] uses to
    /// forecast demand. Unvisited stops return 0.
    #[must_use]
    pub fn arrivals_at(&self, stop: EntityId) -> u64 {
        self.arrivals_at_stop.get(&stop).copied().unwrap_or(0)
    }

    /// Window size (in ticks) over which [`arrivals_at`](Self::arrivals_at)
    /// counts events. Strategies convert counts to rates by dividing
    /// by this.
    #[must_use]
    pub const fn arrival_window_ticks(&self) -> u64 {
        self.arrival_window_ticks
    }

    /// The hall call at `(stop, direction)`, if pressed.
    #[must_use]
    pub fn hall_call_at(&self, stop: EntityId, direction: CallDirection) -> Option<&HallCall> {
        self.hall_calls_at_stop
            .get(&stop)?
            .iter()
            .find(|c| c.direction == direction)
    }

    /// All hall calls across every stop in the group (flattened iterator).
    ///
    /// No `#[must_use]` needed: `impl Iterator` already carries that
    /// annotation, and adding our own triggers clippy's
    /// `double_must_use` lint.
    pub fn iter_hall_calls(&self) -> impl Iterator<Item = &HallCall> {
        self.hall_calls_at_stop.values().flatten()
    }

    /// Floor buttons currently pressed inside `car`. Empty slice if the
    /// car has no aboard riders or no outstanding presses.
    #[must_use]
    pub fn car_calls_for(&self, car: EntityId) -> &[CarCall] {
        self.car_calls_by_car.get(&car).map_or(&[], Vec::as_slice)
    }

    /// Riders waiting at a specific stop.
    #[must_use]
    pub fn waiting_riders_at(&self, stop: EntityId) -> &[RiderInfo] {
        self.waiting_at_stop.get(&stop).map_or(&[], Vec::as_slice)
    }

    /// Iterate over all `(stop, riders)` pairs with waiting demand.
    pub fn iter_waiting_stops(&self) -> impl Iterator<Item = (&EntityId, &[RiderInfo])> {
        self.waiting_at_stop
            .iter()
            .map(|(stop, riders)| (stop, riders.as_slice()))
    }

    /// Riders currently riding toward a specific stop.
    #[must_use]
    pub fn riding_riders_to(&self, stop: EntityId) -> &[RiderInfo] {
        self.riding_to_stop.get(&stop).map_or(&[], Vec::as_slice)
    }

    /// Iterate over all `(stop, riders)` pairs with in-transit demand.
    pub fn iter_riding_stops(&self) -> impl Iterator<Item = (&EntityId, &[RiderInfo])> {
        self.riding_to_stop
            .iter()
            .map(|(stop, riders)| (stop, riders.as_slice()))
    }

    /// Iterate over all `(stop, hall_calls)` pairs with active calls.
    pub fn iter_hall_call_stops(&self) -> impl Iterator<Item = (&EntityId, &[HallCall])> {
        self.hall_calls_at_stop
            .iter()
            .map(|(stop, calls)| (stop, calls.as_slice()))
    }
}
