//! Per-elevator scratch helper for custom dispatch strategies.
//!
//! Custom strategies that carry per-car state (idle counters, last-served
//! ticks, learned weights, ...) typically reach for a
//! `HashMap<EntityId, T>`. Each one then has to remember to drop the
//! entry from `notify_removed`, or per-car state leaks every time an
//! elevator is removed or reassigned.
//!
//! [`PrepareScratch`] is a typed wrapper around that pattern with
//! batteries — `entry`, `get`, `get_mut`, `insert`, `remove`, `clear` —
//! and a clear name so a strategy carrying multiple buckets reads as
//! "the per-car scratch for X" rather than "another HashMap".

use std::collections::HashMap;

use crate::entity::EntityId;

/// Per-elevator scratch storage, keyed by `EntityId`.
///
/// Custom strategies use `PrepareScratch<T>` to hold per-car state that
/// is computed in `prepare_car` and read in `rank`. Drop entries from
/// `notify_removed` so an elevator leaving the group doesn't leak.
///
/// # Example
///
/// ```
/// use elevator_core::dispatch::{
///     DispatchStrategy, PrepareScratch, RankContext, ElevatorGroup, DispatchManifest,
/// };
/// use elevator_core::entity::EntityId;
/// use elevator_core::world::World;
///
/// #[derive(Default)]
/// struct CarStats { idle_for: f64 }
///
/// #[derive(Default)]
/// struct IdleAware {
///     stats: PrepareScratch<CarStats>,
/// }
///
/// impl DispatchStrategy for IdleAware {
///     fn prepare_car(
///         &mut self,
///         car: EntityId,
///         _car_position: f64,
///         _group: &ElevatorGroup,
///         _manifest: &DispatchManifest,
///         _world: &World,
///     ) {
///         self.stats.entry(car).idle_for += 1.0;
///     }
///
///     fn rank(&self, ctx: &RankContext<'_>) -> Option<f64> {
///         let idle = self.stats.get(ctx.car).map_or(0.0, |s| s.idle_for);
///         Some((ctx.car_position() - ctx.stop_position()).abs() - 0.01 * idle)
///     }
///
///     fn notify_removed(&mut self, eid: EntityId) {
///         self.stats.remove(eid);
///     }
/// }
/// ```
#[derive(Debug, Clone, Default)]
pub struct PrepareScratch<T: Default> {
    /// The underlying per-entity bucket.
    inner: HashMap<EntityId, T>,
}

impl<T: Default> PrepareScratch<T> {
    /// Empty scratch.
    #[must_use]
    pub fn new() -> Self {
        Self {
            inner: HashMap::new(),
        }
    }

    /// Read-only access to `eid`'s scratch slot.
    #[must_use]
    pub fn get(&self, eid: EntityId) -> Option<&T> {
        self.inner.get(&eid)
    }

    /// Mutable access to `eid`'s scratch slot, if it exists.
    pub fn get_mut(&mut self, eid: EntityId) -> Option<&mut T> {
        self.inner.get_mut(&eid)
    }

    /// Mutable access to `eid`'s scratch slot, inserting `T::default()`
    /// if absent. Mirrors `HashMap::entry(...).or_default()` but takes
    /// the typed `EntityId` directly and returns `&mut T` so callers can
    /// chain field updates (`scratch.entry(car).field = …`).
    pub fn entry(&mut self, eid: EntityId) -> &mut T {
        self.inner.entry(eid).or_default()
    }

    /// Replace the scratch value for `eid`, returning the previous value
    /// if any.
    pub fn insert(&mut self, eid: EntityId, value: T) -> Option<T> {
        self.inner.insert(eid, value)
    }

    /// Drop the scratch entry for `eid`. Call from `notify_removed` so
    /// the scratch doesn't outlive the elevator.
    pub fn remove(&mut self, eid: EntityId) -> Option<T> {
        self.inner.remove(&eid)
    }

    /// Drop every scratch entry.
    pub fn clear(&mut self) {
        self.inner.clear();
    }

    /// Number of scratch entries.
    #[must_use]
    pub fn len(&self) -> usize {
        self.inner.len()
    }

    /// Whether the scratch is empty.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.inner.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use slotmap::KeyData;

    fn fake_id(idx: u64) -> EntityId {
        EntityId::from(KeyData::from_ffi(idx))
    }

    #[test]
    fn entry_inserts_default_then_returns_mut() {
        #[derive(Default, Debug, PartialEq)]
        struct CarStats {
            counter: u32,
        }
        let mut scratch: PrepareScratch<CarStats> = PrepareScratch::new();
        let id = fake_id(0x4242_0000_0000_0001);
        scratch.entry(id).counter = 7;
        assert_eq!(scratch.get(id).map(|s| s.counter), Some(7));
        scratch.entry(id).counter += 5;
        assert_eq!(scratch.get(id).map(|s| s.counter), Some(12));
    }

    #[test]
    fn remove_returns_old_value_and_drops_entry() {
        let mut scratch: PrepareScratch<u32> = PrepareScratch::new();
        let id = fake_id(0x1234_0000_0000_0001);
        scratch.insert(id, 99);
        assert_eq!(scratch.remove(id), Some(99));
        assert!(scratch.get(id).is_none());
        assert!(scratch.is_empty());
    }
}
