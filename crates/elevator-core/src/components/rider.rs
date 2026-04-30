//! Rider (passenger/cargo) core data and lifecycle.

use serde::{Deserialize, Serialize};

use super::units::Weight;
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
    /// Exiting an elevator (transient, one tick).
    #[serde(alias = "Alighting")]
    Exiting(EntityId),
    /// Walking between transfer stops.
    Walking,
    /// Reached final destination.
    Arrived,
    /// Gave up waiting.
    Abandoned,
    /// Parked at a stop, not seeking an elevator.
    Resident,
}

impl RiderPhase {
    /// True when the rider is currently inside or transitioning through an
    /// elevator cab — i.e., [`Boarding`](Self::Boarding),
    /// [`Riding`](Self::Riding), or [`Exiting`](Self::Exiting).
    ///
    /// Useful for code that needs to treat all three mid-elevator phases
    /// uniformly (rendering, per-elevator population counts, skipping
    /// stop-queue updates) without writing a three-arm `match`.
    #[must_use]
    pub const fn is_aboard(&self) -> bool {
        matches!(self, Self::Boarding(_) | Self::Riding(_) | Self::Exiting(_))
    }

    /// True when the rider is currently at a stop — i.e., one of the
    /// phases for which [`Rider::current_stop`] is expected to be `Some`:
    /// [`Waiting`](Self::Waiting), [`Boarding`](Self::Boarding),
    /// [`Exiting`](Self::Exiting), [`Arrived`](Self::Arrived),
    /// [`Abandoned`](Self::Abandoned), or [`Resident`](Self::Resident).
    ///
    /// Companion to [`is_aboard`](Self::is_aboard). Note `Boarding` and
    /// `Exiting` are *both* aboard and at a stop: the rider is mid-transfer
    /// between a stop and an elevator cab.
    #[must_use]
    pub const fn is_at_stop(&self) -> bool {
        matches!(
            self,
            Self::Waiting
                | Self::Boarding(_)
                | Self::Exiting(_)
                | Self::Arrived
                | Self::Abandoned
                | Self::Resident
        )
    }
}

/// Data-less companion to [`RiderPhase`] for error messages and pattern matching
/// without requiring the inner `EntityId`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[non_exhaustive]
pub enum RiderPhaseKind {
    /// Waiting at a stop.
    Waiting,
    /// Boarding an elevator.
    Boarding,
    /// Riding in an elevator.
    Riding,
    /// Exiting an elevator.
    Exiting,
    /// Walking between transfer stops.
    Walking,
    /// Reached final destination.
    Arrived,
    /// Gave up waiting.
    Abandoned,
    /// Parked at a stop.
    Resident,
}

impl RiderPhase {
    /// Return the data-less kind of this phase.
    #[must_use]
    pub const fn kind(&self) -> RiderPhaseKind {
        match self {
            Self::Waiting => RiderPhaseKind::Waiting,
            Self::Boarding(_) => RiderPhaseKind::Boarding,
            Self::Riding(_) => RiderPhaseKind::Riding,
            Self::Exiting(_) => RiderPhaseKind::Exiting,
            Self::Walking => RiderPhaseKind::Walking,
            Self::Arrived => RiderPhaseKind::Arrived,
            Self::Abandoned => RiderPhaseKind::Abandoned,
            Self::Resident => RiderPhaseKind::Resident,
        }
    }
}

impl std::fmt::Display for RiderPhaseKind {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Waiting => write!(f, "Waiting"),
            Self::Boarding => write!(f, "Boarding"),
            Self::Riding => write!(f, "Riding"),
            Self::Exiting => write!(f, "Exiting"),
            Self::Walking => write!(f, "Walking"),
            Self::Arrived => write!(f, "Arrived"),
            Self::Abandoned => write!(f, "Abandoned"),
            Self::Resident => write!(f, "Resident"),
        }
    }
}

impl std::fmt::Display for RiderPhase {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Waiting => write!(f, "Waiting"),
            Self::Boarding(id) => write!(f, "Boarding({id:?})"),
            Self::Riding(id) => write!(f, "Riding({id:?})"),
            Self::Exiting(id) => write!(f, "Exiting({id:?})"),
            Self::Walking => write!(f, "Walking"),
            Self::Arrived => write!(f, "Arrived"),
            Self::Abandoned => write!(f, "Abandoned"),
            Self::Resident => write!(f, "Resident"),
        }
    }
}

/// Core component for any entity that rides elevators.
///
/// This is the minimum data the simulation needs. Games attach
/// additional components (`VipTag`, `FreightData`, `PersonData`, etc.)
/// for game-specific behavior. An entity with `Rider` but no
/// Route component can be boarded/exited manually by game code.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Rider {
    /// Weight contributed to elevator load.
    pub(crate) weight: Weight,
    /// Current rider lifecycle phase.
    pub(crate) phase: RiderPhase,
    /// The stop entity this rider is currently at (while Waiting/Arrived/Abandoned/Resident).
    pub(crate) current_stop: Option<EntityId>,
    /// Tick when this rider was spawned.
    pub(crate) spawn_tick: u64,
    /// Tick when this rider boarded (for ride-time metrics).
    pub(crate) board_tick: Option<u64>,
    /// Opaque consumer-attached tag. The engine doesn't interpret
    /// this value — it survives snapshot round-trip so consumers
    /// can correlate riders with external identifiers (e.g. a
    /// game-side sim id, a player id, a freight-shipment id) without
    /// maintaining a parallel map keyed by `RiderId`. Defaults to 0
    /// (no tag); `0` is reserved by convention for "untagged."
    #[serde(default)]
    pub(crate) tag: u64,
}

impl Rider {
    /// Weight contributed to elevator load.
    #[must_use]
    pub const fn weight(&self) -> Weight {
        self.weight
    }

    /// Current rider lifecycle phase.
    #[must_use]
    pub const fn phase(&self) -> RiderPhase {
        self.phase
    }

    /// The stop entity this rider is currently at (while Waiting/Arrived/Abandoned/Resident).
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

    /// Opaque consumer-attached tag. The engine doesn't interpret this
    /// value; consumers use it to correlate riders with external
    /// identifiers (e.g. a game-side sim id, a player id, a freight
    /// shipment id) without maintaining a parallel `RiderId → u64` map.
    /// Defaults to `0`, which is reserved by convention for "untagged."
    #[must_use]
    pub const fn tag(&self) -> u64 {
        self.tag
    }
}
