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

impl std::fmt::Display for RiderPhase {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Waiting => write!(f, "Waiting"),
            Self::Boarding(id) => write!(f, "Boarding({id:?})"),
            Self::Riding(id) => write!(f, "Riding({id:?})"),
            Self::Alighting(id) => write!(f, "Alighting({id:?})"),
            Self::Walking => write!(f, "Walking"),
            Self::Arrived => write!(f, "Arrived"),
            Self::Abandoned => write!(f, "Abandoned"),
        }
    }
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
    pub(crate) weight: f64,
    /// Current rider lifecycle phase.
    pub(crate) phase: RiderPhase,
    /// The stop entity this rider is currently at (while Waiting/Arrived/Abandoned).
    pub(crate) current_stop: Option<EntityId>,
    /// Tick when this rider was spawned.
    pub(crate) spawn_tick: u64,
    /// Tick when this rider boarded (for ride-time metrics).
    pub(crate) board_tick: Option<u64>,
}

impl Rider {
    /// Weight contributed to elevator load.
    #[must_use]
    pub const fn weight(&self) -> f64 {
        self.weight
    }

    /// Current rider lifecycle phase.
    #[must_use]
    pub const fn phase(&self) -> RiderPhase {
        self.phase
    }

    /// The stop entity this rider is currently at (while Waiting/Arrived/Abandoned).
    #[must_use]
    pub const fn current_stop(&self) -> Option<EntityId> {
        self.current_stop
    }

    /// Tick when this rider was spawned.
    #[must_use]
    pub const fn spawn_tick(&self) -> u64 {
        self.spawn_tick
    }

    /// Tick when this rider boarded (for ride-time metrics).
    #[must_use]
    pub const fn board_tick(&self) -> Option<u64> {
        self.board_tick
    }
}
