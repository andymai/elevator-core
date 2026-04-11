use crate::elevator::Elevator;
use crate::passenger::PassengerId;
use crate::stop::{StopConfig, StopId};
use std::collections::HashMap;

/// Decision returned by a dispatch strategy.
#[derive(Debug, Clone, PartialEq)]
pub enum DispatchDecision {
    GoToStop(StopId),
    Idle,
}

/// Snapshot of waiting passengers and riders, owned to avoid borrow conflicts.
pub struct WaitingManifest {
    /// Passengers waiting at each stop.
    pub waiting_at_stop: HashMap<StopId, Vec<PassengerId>>,
    /// Passengers currently riding in the elevator.
    pub riders: Vec<PassengerId>,
    /// Destination for each known passenger.
    pub passenger_destinations: HashMap<PassengerId, StopId>,
}

/// Trait for pluggable elevator dispatch algorithms.
pub trait DispatchStrategy: Send + Sync {
    fn decide(
        &mut self,
        elevator: &Elevator,
        stops: &[StopConfig],
        waiting: &WaitingManifest,
    ) -> DispatchDecision;
}
