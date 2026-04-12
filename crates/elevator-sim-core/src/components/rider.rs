//! Rider (passenger/cargo) core data and lifecycle.

use serde::{Deserialize, Serialize};

use crate::entity::EntityId;

/// Lifecycle phase of a rider entity.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[non_exhaustive]
pub enum RiderPhase {
    /// Waiting at a stop.
    Waiting,
    /// Boarding an elevator (transient, one tick).
    Boarding(EntityId),
    /// Riding in an elevator.
    Riding(EntityId),
    /// Alighting from an elevator (transient, one tick).
    Alighting(EntityId),
    /// Walking between transfer stops.
    Walking,
    /// Reached final destination.
    Arrived,
    /// Gave up waiting.
    Abandoned,
}

/// Core component for any entity that rides elevators.
///
/// This is the minimum data the simulation needs. Games attach
/// additional components (`VipTag`, `FreightData`, `PersonData`, etc.)
/// for game-specific behavior. An entity with `Rider` but no
/// Route component can be boarded/alighted manually by game code.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rider {
    /// Weight contributed to elevator load.
    pub weight: f64,
    /// Current rider lifecycle phase.
    pub phase: RiderPhase,
    /// The stop entity this rider is currently at (while Waiting/Arrived/Abandoned).
    pub current_stop: Option<EntityId>,
    /// Tick when this rider was spawned.
    pub spawn_tick: u64,
    /// Tick when this rider boarded (for ride-time metrics).
    pub board_tick: Option<u64>,
}
