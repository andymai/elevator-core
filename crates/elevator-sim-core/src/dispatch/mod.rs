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

/// Decision returned by a dispatch strategy.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[non_exhaustive]
pub enum DispatchDecision {
    /// Go to the specified stop entity.
    GoToStop(EntityId),
    /// Remain idle.
    Idle,
}

/// Runtime elevator group: a set of elevators serving a set of stops.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElevatorGroup {
    /// Unique group identifier.
    pub id: GroupId,
    /// Human-readable group name.
    pub name: String,
    /// Elevator entities belonging to this group.
    pub elevator_entities: Vec<EntityId>,
    /// Stop entities served by this group.
    pub stop_entities: Vec<EntityId>,
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
