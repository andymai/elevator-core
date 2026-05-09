//! Encapsulated strategy + identity pairs for [`Simulation`].
//!
//! Every elevator group carries both a live strategy trait object and a
//! tagged identity ([`BuiltinStrategy`] / [`BuiltinReposition`]). The
//! identity rides along into snapshots so a restored sim can re-instantiate
//! the right built-in (or look up a custom factory by name) without
//! serialising the trait object itself.
//!
//! Pre-encapsulation, the two halves lived in parallel `BTreeMap`s on
//! [`Simulation`] and every insert / remove site had to update both by
//! hand — a class of footguns the hot-swap and reassign paths kept hitting.
//! [`DispatcherSet`] / [`RepositionerSet`] own both maps and expose a
//! single atomic [`insert`](DispatcherSet::insert) /
//! [`remove`](RepositionerSet::remove) so the strategy and its identity
//! can never drift apart.
//!
//! [`Simulation`]: super::Simulation

use crate::dispatch::{BuiltinReposition, BuiltinStrategy, DispatchStrategy, RepositionStrategy};
use crate::ids::GroupId;
use std::collections::BTreeMap;

/// Per-group dispatch strategies paired with their snapshot identity.
///
/// The two halves move together: every [`insert`](Self::insert) writes
/// both, every [`remove`](Self::remove) clears both. Pre-encapsulation
/// the two maps lived as separate `BTreeMap` fields on
/// [`Simulation`](super::Simulation) and a class of bugs came from updating
/// one without the other (snapshot replay would lose the identity, hot-swap
/// would orphan an id, etc.).
pub struct DispatcherSet {
    /// Live trait objects, one per group, queried each tick by the
    /// dispatch system.
    strategies: BTreeMap<GroupId, Box<dyn DispatchStrategy>>,
    /// Snapshot identity per group — the variant of [`BuiltinStrategy`]
    /// that re-instantiates the strategy on snapshot restore.
    ids: BTreeMap<GroupId, BuiltinStrategy>,
}

impl DispatcherSet {
    /// Construct from pre-built map halves (snapshot + builder paths).
    ///
    /// Callers that already produced the two maps in lockstep — snapshot
    /// restore and the legacy builder ctor — hand them in directly.
    /// Asserts in debug builds that the two halves agree on key set so a
    /// future caller bypassing the encapsulation can't silently smuggle
    /// in mismatched maps.
    pub fn from_parts(
        strategies: BTreeMap<GroupId, Box<dyn DispatchStrategy>>,
        ids: BTreeMap<GroupId, BuiltinStrategy>,
    ) -> Self {
        debug_assert!(
            strategies.keys().eq(ids.keys()),
            "DispatcherSet::from_parts: strategies and ids must have identical key sets"
        );
        Self { strategies, ids }
    }

    /// Insert (or replace) the dispatch strategy and its snapshot
    /// identity for `group` atomically.
    pub fn insert(
        &mut self,
        group: GroupId,
        strategy: Box<dyn DispatchStrategy>,
        id: BuiltinStrategy,
    ) {
        self.strategies.insert(group, strategy);
        self.ids.insert(group, id);
    }

    /// Look up the snapshot identity for `group`.
    pub fn id_for(&self, group: GroupId) -> Option<&BuiltinStrategy> {
        self.ids.get(&group)
    }

    /// Strategy map for systems that take `&BTreeMap<GroupId, Box<dyn ..>>`
    /// (dispatch phase, FFI / wasm key iteration, snapshot serialization).
    pub const fn strategies(&self) -> &BTreeMap<GroupId, Box<dyn DispatchStrategy>> {
        &self.strategies
    }

    /// Mutable strategy map. Use sparingly — direct insertion bypasses
    /// the [`insert`](Self::insert) atomicity, leaving `ids` stale.
    /// Callers that swap a strategy at a known group should round-trip
    /// through [`insert`](Self::insert); use this only when a system
    /// needs to mutate an already-installed trait object in place.
    pub const fn strategies_mut(&mut self) -> &mut BTreeMap<GroupId, Box<dyn DispatchStrategy>> {
        &mut self.strategies
    }
}

/// Per-group reposition strategies paired with their snapshot identity.
///
/// Mirrors [`DispatcherSet`] for the optional reposition phase; the same
/// atomicity guarantees apply.
pub struct RepositionerSet {
    /// Live trait objects, one per group, queried by the reposition
    /// phase. Empty when no group opts in.
    strategies: BTreeMap<GroupId, Box<dyn RepositionStrategy>>,
    /// Snapshot identity per group — the variant of
    /// [`BuiltinReposition`] that re-instantiates the strategy on
    /// snapshot restore.
    ids: BTreeMap<GroupId, BuiltinReposition>,
}

impl Default for RepositionerSet {
    fn default() -> Self {
        Self::new()
    }
}

impl RepositionerSet {
    /// An empty set with no groups registered.
    pub const fn new() -> Self {
        Self {
            strategies: BTreeMap::new(),
            ids: BTreeMap::new(),
        }
    }

    /// Construct from pre-built map halves.
    ///
    /// Asserts in debug builds that the two halves agree on key set,
    /// matching [`DispatcherSet::from_parts`].
    pub fn from_parts(
        strategies: BTreeMap<GroupId, Box<dyn RepositionStrategy>>,
        ids: BTreeMap<GroupId, BuiltinReposition>,
    ) -> Self {
        debug_assert!(
            strategies.keys().eq(ids.keys()),
            "RepositionerSet::from_parts: strategies and ids must have identical key sets"
        );
        Self { strategies, ids }
    }

    /// Insert (or replace) the reposition strategy and its snapshot
    /// identity for `group` atomically.
    pub fn insert(
        &mut self,
        group: GroupId,
        strategy: Box<dyn RepositionStrategy>,
        id: BuiltinReposition,
    ) {
        self.strategies.insert(group, strategy);
        self.ids.insert(group, id);
    }

    /// Remove both halves for `group` atomically.
    pub fn remove(&mut self, group: GroupId) {
        self.strategies.remove(&group);
        self.ids.remove(&group);
    }

    /// Look up the snapshot identity for `group`.
    pub fn id_for(&self, group: GroupId) -> Option<&BuiltinReposition> {
        self.ids.get(&group)
    }

    /// True when no group has a reposition strategy installed; the
    /// reposition phase is skipped entirely in that case.
    pub fn is_empty(&self) -> bool {
        self.strategies.is_empty()
    }

    /// Whether `group` has a reposition strategy installed.
    pub fn contains_key(&self, group: GroupId) -> bool {
        self.strategies.contains_key(&group)
    }

    /// Mutable strategy map for the reposition phase.
    pub const fn strategies_mut(&mut self) -> &mut BTreeMap<GroupId, Box<dyn RepositionStrategy>> {
        &mut self.strategies
    }
}
