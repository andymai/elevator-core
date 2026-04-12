//! Pluggable dispatch strategies for assigning elevators to stops.

/// Estimated Time to Destination dispatch algorithm.
pub mod etd;
/// LOOK dispatch algorithm.
pub mod look;
/// Nearest-car dispatch algorithm.
pub mod nearest_car;
/// SCAN dispatch algorithm.
pub mod scan;

use serde::{Deserialize, Serialize};

use crate::entity::EntityId;
use crate::ids::GroupId;
use crate::world::World;
use std::collections::BTreeMap;

/// Metadata about a single rider, available to dispatch strategies.
#[derive(Debug, Clone)]
#[non_exhaustive]
pub struct RiderInfo {
    /// Rider entity ID.
    pub id: EntityId,
    /// Rider's destination stop entity (from route).
    pub destination: Option<EntityId>,
    /// Rider weight.
    pub weight: f64,
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
    pub waiting_at_stop: BTreeMap<EntityId, Vec<RiderInfo>>,
    /// Riders currently aboard elevators, grouped by their destination stop.
    pub riding_to_stop: BTreeMap<EntityId, Vec<RiderInfo>>,
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
            .map_or(0.0, |riders| riders.iter().map(|r| r.weight).sum())
    }

    /// Number of riders heading to a stop (aboard elevators).
    #[must_use]
    pub fn riding_count_to(&self, stop: EntityId) -> usize {
        self.riding_to_stop.get(&stop).map_or(0, Vec::len)
    }

    /// Whether a stop has any demand (waiting riders or riders heading there).
    #[must_use]
    pub fn has_demand(&self, stop: EntityId) -> bool {
        self.waiting_count_at(stop) > 0 || self.riding_count_to(stop) > 0
    }
}

/// Serializable identifier for built-in dispatch strategies.
///
/// Used in snapshots and config files to restore the correct strategy
/// without requiring the game to manually re-wire dispatch. Custom strategies
/// are represented by the `Custom(String)` variant.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[non_exhaustive]
pub enum BuiltinStrategy {
    /// SCAN (elevator) algorithm — sweeps end-to-end.
    Scan,
    /// LOOK algorithm — reverses at last request.
    Look,
    /// Nearest-car — assigns closest idle elevator.
    NearestCar,
    /// Estimated Time to Destination — minimizes total cost.
    Etd,
    /// Custom strategy identified by name. The game must provide a factory.
    Custom(String),
}

impl std::fmt::Display for BuiltinStrategy {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Scan => write!(f, "Scan"),
            Self::Look => write!(f, "Look"),
            Self::NearestCar => write!(f, "NearestCar"),
            Self::Etd => write!(f, "Etd"),
            Self::Custom(name) => write!(f, "Custom({name})"),
        }
    }
}

impl BuiltinStrategy {
    /// Instantiate the dispatch strategy for this variant.
    ///
    /// Returns `None` for `Custom` — the game must provide those via
    /// a factory function.
    #[must_use]
    pub fn instantiate(&self) -> Option<Box<dyn DispatchStrategy>> {
        match self {
            Self::Scan => Some(Box::new(scan::ScanDispatch::new())),
            Self::Look => Some(Box::new(look::LookDispatch::new())),
            Self::NearestCar => Some(Box::new(nearest_car::NearestCarDispatch::new())),
            Self::Etd => Some(Box::new(etd::EtdDispatch::new())),
            Self::Custom(_) => None,
        }
    }
}

/// Decision returned by a dispatch strategy.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[non_exhaustive]
pub enum DispatchDecision {
    /// Go to the specified stop entity.
    GoToStop(EntityId),
    /// Remain idle.
    Idle,
}

/// Per-line relationship data within an [`ElevatorGroup`].
///
/// This is a denormalized cache maintained by [`Simulation`](crate::sim::Simulation).
/// The source of truth for intrinsic line properties is the
/// [`Line`](crate::components::Line) component in World.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineInfo {
    /// Line entity ID.
    entity: EntityId,
    /// Elevator entities on this line.
    elevators: Vec<EntityId>,
    /// Stop entities served by this line.
    serves: Vec<EntityId>,
}

impl LineInfo {
    /// Create a new `LineInfo`.
    #[must_use]
    pub const fn new(entity: EntityId, elevators: Vec<EntityId>, serves: Vec<EntityId>) -> Self {
        Self {
            entity,
            elevators,
            serves,
        }
    }

    /// Line entity ID.
    #[must_use]
    pub const fn entity(&self) -> EntityId {
        self.entity
    }

    /// Elevator entities on this line.
    #[must_use]
    pub fn elevators(&self) -> &[EntityId] {
        &self.elevators
    }

    /// Stop entities served by this line.
    #[must_use]
    pub fn serves(&self) -> &[EntityId] {
        &self.serves
    }

    /// Mutable access to elevator entities on this line.
    pub const fn elevators_mut(&mut self) -> &mut Vec<EntityId> {
        &mut self.elevators
    }

    /// Mutable access to stop entities served by this line.
    pub const fn serves_mut(&mut self) -> &mut Vec<EntityId> {
        &mut self.serves
    }
}

/// Runtime elevator group: a set of lines sharing a dispatch strategy.
///
/// A group is the logical dispatch unit. It contains one or more
/// [`LineInfo`] entries, each representing a physical path with its
/// elevators and served stops.
///
/// The flat `elevator_entities` and `stop_entities` fields are derived
/// caches (union of all lines' elevators/stops), rebuilt automatically
/// via [`rebuild_caches()`](Self::rebuild_caches).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElevatorGroup {
    /// Unique group identifier.
    id: GroupId,
    /// Human-readable group name.
    name: String,
    /// Lines belonging to this group.
    lines: Vec<LineInfo>,
    /// Derived flat cache — rebuilt by `rebuild_caches()`.
    elevator_entities: Vec<EntityId>,
    /// Derived flat cache — rebuilt by `rebuild_caches()`.
    stop_entities: Vec<EntityId>,
}

impl ElevatorGroup {
    /// Create a new group with the given lines. Caches are built automatically.
    #[must_use]
    pub fn new(id: GroupId, name: String, lines: Vec<LineInfo>) -> Self {
        let mut group = Self {
            id,
            name,
            lines,
            elevator_entities: Vec::new(),
            stop_entities: Vec::new(),
        };
        group.rebuild_caches();
        group
    }

    /// Unique group identifier.
    #[must_use]
    pub const fn id(&self) -> GroupId {
        self.id
    }

    /// Human-readable group name.
    #[must_use]
    pub fn name(&self) -> &str {
        &self.name
    }

    /// Lines belonging to this group.
    #[must_use]
    pub fn lines(&self) -> &[LineInfo] {
        &self.lines
    }

    /// Mutable access to lines (call [`rebuild_caches()`](Self::rebuild_caches) after mutating).
    pub const fn lines_mut(&mut self) -> &mut Vec<LineInfo> {
        &mut self.lines
    }

    /// Elevator entities belonging to this group (derived from lines).
    #[must_use]
    pub fn elevator_entities(&self) -> &[EntityId] {
        &self.elevator_entities
    }

    /// Stop entities served by this group (derived from lines, deduplicated).
    #[must_use]
    pub fn stop_entities(&self) -> &[EntityId] {
        &self.stop_entities
    }

    /// Push a stop entity directly into the group's stop cache.
    ///
    /// Use when a stop belongs to the group for dispatch purposes but is
    /// not (yet) assigned to any line. Call `add_stop_to_line` later to
    /// wire it into the topology graph.
    pub(crate) fn push_stop(&mut self, stop: EntityId) {
        if !self.stop_entities.contains(&stop) {
            self.stop_entities.push(stop);
        }
    }

    /// Push an elevator entity directly into the group's elevator cache
    /// (in addition to the line it belongs to).
    pub(crate) fn push_elevator(&mut self, elevator: EntityId) {
        if !self.elevator_entities.contains(&elevator) {
            self.elevator_entities.push(elevator);
        }
    }

    /// Rebuild derived caches from lines. Call after mutating lines.
    pub fn rebuild_caches(&mut self) {
        self.elevator_entities = self
            .lines
            .iter()
            .flat_map(|li| li.elevators.iter().copied())
            .collect();
        let mut stops: Vec<EntityId> = self
            .lines
            .iter()
            .flat_map(|li| li.serves.iter().copied())
            .collect();
        stops.sort_unstable();
        stops.dedup();
        self.stop_entities = stops;
    }
}

/// Pluggable dispatch algorithm.
///
/// Receives a manifest with per-rider metadata grouped by stop.
/// Convenience methods provide aggregate counts; implementations
/// can also iterate individual riders for priority/weight-aware dispatch.
pub trait DispatchStrategy: Send + Sync {
    /// Decide for a single elevator.
    fn decide(
        &mut self,
        elevator: EntityId,
        elevator_position: f64,
        group: &ElevatorGroup,
        manifest: &DispatchManifest,
        world: &World,
    ) -> DispatchDecision;

    /// Decide for all idle elevators in a group.
    /// Default: calls `decide()` per elevator.
    fn decide_all(
        &mut self,
        elevators: &[(EntityId, f64)], // (entity, position)
        group: &ElevatorGroup,
        manifest: &DispatchManifest,
        world: &World,
    ) -> Vec<(EntityId, DispatchDecision)> {
        elevators
            .iter()
            .map(|(eid, pos)| (*eid, self.decide(*eid, *pos, group, manifest, world)))
            .collect()
    }

    /// Notify the strategy that an elevator has been removed.
    ///
    /// Implementations with per-elevator state (e.g., direction tracking)
    /// should clean up here to prevent unbounded memory growth. Default: no-op.
    fn notify_removed(&mut self, _elevator: EntityId) {}
}
