pub mod etd;
pub mod look;
pub mod nearest_car;
pub mod scan;

use crate::entity::EntityId;
use crate::ids::GroupId;
use crate::world::World;
use std::collections::HashMap;

/// Demand at a single stop.
#[derive(Debug, Clone, Default)]
pub struct StopDemand {
    pub waiting_count: u32,
    pub total_waiting_weight: f64,
}

/// Stop-level manifest for dispatch decisions.
///
/// Contains aggregate demand per stop, not individual rider details.
/// Games that need entity-aware dispatch can implement custom
/// DispatchStrategy that reads &World directly.
#[derive(Debug, Clone, Default)]
pub struct DispatchManifest {
    /// Stops with waiting riders: stop entity -> demand.
    pub demand_at_stop: HashMap<EntityId, StopDemand>,
    /// Stops that current riders are heading to: stop entity -> count.
    pub rider_destinations: HashMap<EntityId, u32>,
}

/// Decision returned by a dispatch strategy.
#[derive(Debug, Clone, PartialEq)]
pub enum DispatchDecision {
    GoToStop(EntityId),
    Idle,
}

/// Runtime elevator group: a set of elevators serving a set of stops.
#[derive(Debug, Clone)]
pub struct ElevatorGroup {
    pub id: GroupId,
    pub name: String,
    pub elevator_entities: Vec<EntityId>,
    pub stop_entities: Vec<EntityId>,
}

/// Pluggable dispatch algorithm.
///
/// Receives a stop-level manifest (aggregate demand, not individual riders).
/// For entity-aware dispatch, implementations can store a reference or
/// read from &World passed to decide_all().
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
    /// Default: calls decide() per elevator.
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
}
