//! Phase-partitioned reverse index: stop → rider entity IDs.
//!
//! Maintained incrementally by [`Simulation`](crate::sim::Simulation) methods
//! and the loading/advance-transient systems.
//!
//! The outer `stop → set` map is a `HashMap` for O(1) per-stop lookup, which
//! is what the public `residents_at` / `waiting_at` / `abandoned_at` methods
//! promise. The inner per-stop `BTreeSet` preserves deterministic iteration
//! order when callers walk the riders at a stop.

use std::collections::{BTreeSet, HashMap};

use crate::components::RiderPhase;
use crate::entity::EntityId;
use crate::world::World;

/// Partition map type used by each phase bucket.
///
/// Outer `HashMap` for O(1) lookup; inner `BTreeSet` for deterministic
/// iteration of the riders at a stop.
type Partition = HashMap<EntityId, BTreeSet<EntityId>>;

/// Phase-partitioned reverse index mapping stops to the riders present there.
#[derive(Debug, Clone, Default)]
pub struct RiderIndex {
    /// Riders in `Waiting` phase, keyed by their `current_stop`.
    waiting: Partition,
    /// Riders in `Resident` phase, keyed by their `current_stop`.
    residents: Partition,
    /// Riders in `Abandoned` phase, keyed by their `current_stop`.
    abandoned: Partition,
}

/// Shared empty set returned by reference when a stop has no entries.
static EMPTY: std::sync::LazyLock<BTreeSet<EntityId>> = std::sync::LazyLock::new(BTreeSet::new);

/// Insert a rider into a partition.
fn insert(partition: &mut Partition, stop: EntityId, rider: EntityId) {
    partition.entry(stop).or_default().insert(rider);
}

/// Remove a rider from a partition, pruning empty sets.
fn remove(partition: &mut Partition, stop: EntityId, rider: EntityId) {
    if let Some(set) = partition.get_mut(&stop) {
        set.remove(&rider);
        if set.is_empty() {
            partition.remove(&stop);
        }
    }
}

impl RiderIndex {
    // ── Insertion ────────────────────────────────────────────────────

    /// Add a rider to the waiting set for a stop.
    pub(crate) fn insert_waiting(&mut self, stop: EntityId, rider: EntityId) {
        insert(&mut self.waiting, stop, rider);
    }

    /// Add a rider to the resident set for a stop.
    pub(crate) fn insert_resident(&mut self, stop: EntityId, rider: EntityId) {
        insert(&mut self.residents, stop, rider);
    }

    /// Add a rider to the abandoned set for a stop.
    pub(crate) fn insert_abandoned(&mut self, stop: EntityId, rider: EntityId) {
        insert(&mut self.abandoned, stop, rider);
    }

    // ── Removal ─────────────────────────────────────────────────────

    /// Remove a rider from the waiting set for a stop.
    pub(crate) fn remove_waiting(&mut self, stop: EntityId, rider: EntityId) {
        remove(&mut self.waiting, stop, rider);
    }

    /// Remove a rider from the resident set for a stop.
    pub(crate) fn remove_resident(&mut self, stop: EntityId, rider: EntityId) {
        remove(&mut self.residents, stop, rider);
    }

    /// Remove a rider from the abandoned set for a stop.
    pub(crate) fn remove_abandoned(&mut self, stop: EntityId, rider: EntityId) {
        remove(&mut self.abandoned, stop, rider);
    }

    // ── Queries ─────────────────────────────────────────────────────

    /// Waiting riders at a stop.
    pub(crate) fn waiting_at(&self, stop: EntityId) -> &BTreeSet<EntityId> {
        self.waiting.get(&stop).unwrap_or(&EMPTY)
    }

    /// Resident riders at a stop.
    pub(crate) fn residents_at(&self, stop: EntityId) -> &BTreeSet<EntityId> {
        self.residents.get(&stop).unwrap_or(&EMPTY)
    }

    /// Abandoned riders at a stop.
    pub(crate) fn abandoned_at(&self, stop: EntityId) -> &BTreeSet<EntityId> {
        self.abandoned.get(&stop).unwrap_or(&EMPTY)
    }

    /// Count of waiting riders at a stop.
    pub(crate) fn waiting_count_at(&self, stop: EntityId) -> usize {
        self.waiting.get(&stop).map_or(0, BTreeSet::len)
    }

    /// Count of resident riders at a stop.
    pub(crate) fn resident_count_at(&self, stop: EntityId) -> usize {
        self.residents.get(&stop).map_or(0, BTreeSet::len)
    }

    /// Count of abandoned riders at a stop.
    pub(crate) fn abandoned_count_at(&self, stop: EntityId) -> usize {
        self.abandoned.get(&stop).map_or(0, BTreeSet::len)
    }

    // ── Rebuild ─────────────────────────────────────────────────────

    /// Reconstruct the entire index from current world state.
    ///
    /// Used after snapshot restore or if the index becomes stale.
    pub(crate) fn rebuild(&mut self, world: &World) {
        self.waiting.clear();
        self.residents.clear();
        self.abandoned.clear();

        for (id, rider) in world.iter_riders() {
            if let Some(stop) = rider.current_stop() {
                match rider.phase() {
                    RiderPhase::Waiting => self.insert_waiting(stop, id),
                    RiderPhase::Resident => self.insert_resident(stop, id),
                    RiderPhase::Abandoned => self.insert_abandoned(stop, id),
                    _ => {}
                }
            }
        }
    }
}
