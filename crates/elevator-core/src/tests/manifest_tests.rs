//! Unit tests for the read-only accessors on `DispatchManifest`.
//!
//! Integration tests cover these accessors indirectly — every dispatch
//! scenario reads them — but mutation testing flagged the empty-queue
//! returns (zero / zero-weight branches) as weakly covered: a mutation
//! flipping the `unwrap_or(0)` to e.g. `unwrap_or(1)` would not fail
//! any existing dispatch scenario unless it happened to exercise an
//! unvisited stop in just the right way. These direct tests pin the
//! contract.

use std::cell::RefCell;
use std::collections::BTreeMap;

use crate::components::Weight;
use crate::dispatch::{DispatchManifest, RiderInfo};
use crate::entity::EntityId;
use slotmap::SlotMap;

thread_local! {
    /// Per-thread `SlotMap` so successive `fresh_id()` calls produce
    /// genuinely distinct keys. Constructing a new map per call would
    /// always return slot 0 / version 1 — same key every time.
    static ID_SOURCE: RefCell<SlotMap<EntityId, ()>> = RefCell::new(SlotMap::with_key());
}

/// Allocate a fresh `EntityId` without spinning up a full `World`.
/// Each call yields a distinct id within the current thread.
fn fresh_id() -> EntityId {
    ID_SOURCE.with(|sm| sm.borrow_mut().insert(()))
}

#[test]
fn waiting_count_at_unvisited_stop_is_zero() {
    let manifest = DispatchManifest::default();
    let stop = fresh_id();
    assert_eq!(manifest.waiting_count_at(stop), 0);
}

#[test]
fn total_weight_at_unvisited_stop_is_zero() {
    let manifest = DispatchManifest::default();
    let stop = fresh_id();
    assert_eq!(manifest.total_weight_at(stop), 0.0);
}

#[test]
fn riding_count_to_unvisited_stop_is_zero() {
    let manifest = DispatchManifest::default();
    let stop = fresh_id();
    assert_eq!(manifest.riding_count_to(stop), 0);
}

#[test]
fn resident_count_at_unvisited_stop_is_zero() {
    let manifest = DispatchManifest::default();
    let stop = fresh_id();
    assert_eq!(manifest.resident_count_at(stop), 0);
}

#[test]
fn arrivals_at_unvisited_stop_is_zero() {
    let manifest = DispatchManifest::default();
    let stop = fresh_id();
    assert_eq!(manifest.arrivals_at(stop), 0);
}

#[test]
fn has_demand_unvisited_stop_is_false() {
    let manifest = DispatchManifest::default();
    let stop = fresh_id();
    assert!(!manifest.has_demand(stop));
}

#[test]
fn empty_waiting_vec_still_returns_zero_count_and_weight() {
    // Different from "unvisited": the stop *is* in the map but its
    // vec is empty. A bug summing over an explicit empty entry should
    // still produce 0, not e.g. NaN from an over-eager sum.
    let stop = fresh_id();
    let mut waiting = BTreeMap::new();
    waiting.insert(stop, Vec::<RiderInfo>::new());
    let manifest = DispatchManifest {
        waiting_at_stop: waiting,
        ..Default::default()
    };
    assert_eq!(manifest.waiting_count_at(stop), 0);
    assert_eq!(manifest.total_weight_at(stop), 0.0);
}

#[test]
fn total_weight_at_sums_rider_weights() {
    let stop = fresh_id();
    let rider1 = fresh_id();
    let rider2 = fresh_id();
    let mut waiting = BTreeMap::new();
    waiting.insert(
        stop,
        vec![
            RiderInfo {
                id: rider1,
                destination: None,
                weight: Weight::try_new(70.0).unwrap(),
                wait_ticks: 0,
            },
            RiderInfo {
                id: rider2,
                destination: None,
                weight: Weight::try_new(50.0).unwrap(),
                wait_ticks: 0,
            },
        ],
    );
    let manifest = DispatchManifest {
        waiting_at_stop: waiting,
        ..Default::default()
    };
    assert_eq!(manifest.total_weight_at(stop), 120.0);
    assert_eq!(manifest.waiting_count_at(stop), 2);
}

#[test]
fn resident_count_at_returns_explicit_zero() {
    // A stop with an explicit zero entry should still return 0 — not
    // confuse "explicit zero" with "missing key" (both currently map
    // to the same return value, but a future internal-representation
    // change shouldn't accidentally diverge them).
    let stop = fresh_id();
    let mut residents = BTreeMap::new();
    residents.insert(stop, 0_usize);
    let manifest = DispatchManifest {
        resident_count_at_stop: residents,
        ..Default::default()
    };
    assert_eq!(manifest.resident_count_at(stop), 0);
}
