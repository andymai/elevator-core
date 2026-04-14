//! Per-elevator destination queue (FIFO of target stop `EntityId`s).
//!
//! Games can push stops to the back or front of the queue, or clear it
//! entirely, without writing a custom `DispatchStrategy`. This is the
//! imperative-dispatch escape hatch for scripted scenarios.
//!
//! The built-in dispatch also writes to the queue (via
//! [`Simulation::push_destination`](crate::sim::Simulation::push_destination)),
//! so the queue is always in sync with the elevator's current target.

use crate::entity::EntityId;
use serde::{Deserialize, Serialize};

/// FIFO queue of target stop `EntityId`s for a single elevator.
///
/// Adjacent duplicates are collapsed on push:
///
/// - `push_back` is a no-op if the *last* entry already equals the new stop.
/// - `push_front` is a no-op if the *first* entry already equals the new stop.
///
/// Games interact with the queue via
/// [`Simulation::push_destination`](crate::sim::Simulation::push_destination),
/// [`Simulation::push_destination_front`](crate::sim::Simulation::push_destination_front),
/// and [`Simulation::clear_destinations`](crate::sim::Simulation::clear_destinations).
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DestinationQueue {
    /// Ordered FIFO of target stop `EntityId`s.
    queue: Vec<EntityId>,
}

impl DestinationQueue {
    /// Create an empty queue.
    #[must_use]
    pub const fn new() -> Self {
        Self { queue: Vec::new() }
    }

    /// Read-only view of the current queue in FIFO order.
    #[must_use]
    pub fn queue(&self) -> &[EntityId] {
        &self.queue
    }

    /// `true` if the queue contains no entries.
    #[must_use]
    pub const fn is_empty(&self) -> bool {
        self.queue.is_empty()
    }

    /// Number of entries in the queue.
    #[must_use]
    pub const fn len(&self) -> usize {
        self.queue.len()
    }

    /// The stop at the front of the queue (next destination).
    #[must_use]
    pub fn front(&self) -> Option<EntityId> {
        self.queue.first().copied()
    }

    /// Push a stop onto the back of the queue.
    ///
    /// Returns `true` if the stop was actually appended. Returns `false` if
    /// the queue is non-empty and its last entry already equals `stop`
    /// (adjacent-duplicate dedup).
    pub(crate) fn push_back(&mut self, stop: EntityId) -> bool {
        if self.queue.last() == Some(&stop) {
            return false;
        }
        self.queue.push(stop);
        true
    }

    /// Insert a stop at the front of the queue (jump to this destination next).
    ///
    /// Returns `true` if the stop was actually inserted. Returns `false` if
    /// the queue is non-empty and its first entry already equals `stop`.
    pub(crate) fn push_front(&mut self, stop: EntityId) -> bool {
        if self.queue.first() == Some(&stop) {
            return false;
        }
        self.queue.insert(0, stop);
        true
    }

    /// Drain all entries.
    pub(crate) fn clear(&mut self) {
        self.queue.clear();
    }

    /// Retain only entries that satisfy `predicate`.
    ///
    /// Used by `remove_stop` to scrub references to a despawned stop.
    pub(crate) fn retain(&mut self, mut predicate: impl FnMut(EntityId) -> bool) {
        self.queue.retain(|&eid| predicate(eid));
    }

    /// `true` if the queue contains `stop` anywhere.
    #[must_use]
    pub fn contains(&self, stop: &EntityId) -> bool {
        self.queue.contains(stop)
    }

    /// Remove and return the front entry.
    pub(crate) fn pop_front(&mut self) -> Option<EntityId> {
        (!self.queue.is_empty()).then(|| self.queue.remove(0))
    }
}
