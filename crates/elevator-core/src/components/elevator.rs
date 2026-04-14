//! Elevator state and configuration component.

use serde::{Deserialize, Serialize};
use std::collections::HashSet;

use crate::door::{DoorCommand, DoorState};
use crate::entity::EntityId;

/// Maximum number of manual door commands queued per elevator.
///
/// Beyond this cap, the oldest entry is dropped (after adjacent-duplicate
/// collapsing). Prevents runaway growth if a game submits commands faster
/// than the sim can apply them.
pub const DOOR_COMMAND_QUEUE_CAP: usize = 16;

/// Direction an elevator's indicator lamps are signalling.
///
/// Derived from the pair of `going_up` / `going_down` flags on [`Elevator`].
/// `Either` corresponds to both lamps lit — the car is idle and will accept
/// riders heading either way. `Up` / `Down` correspond to an actively
/// committed direction.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[non_exhaustive]
pub enum Direction {
    /// Car will serve upward trips only.
    Up,
    /// Car will serve downward trips only.
    Down,
    /// Car will serve either direction (idle).
    Either,
}

impl std::fmt::Display for Direction {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Up => write!(f, "Up"),
            Self::Down => write!(f, "Down"),
            Self::Either => write!(f, "Either"),
        }
    }
}

/// Operational phase of an elevator.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[non_exhaustive]
pub enum ElevatorPhase {
    /// Parked with no pending requests.
    Idle,
    /// Travelling toward a specific stop in response to a dispatch
    /// assignment (carrying or about to pick up riders).
    MovingToStop(EntityId),
    /// Travelling toward a stop for repositioning — no rider service
    /// obligation, will transition directly to [`Idle`] on arrival
    /// without opening doors. Distinct from [`MovingToStop`] so that
    /// downstream code (dispatch, UI, metrics) can treat opportunistic
    /// moves differently from scheduled trips.
    ///
    /// [`MovingToStop`]: Self::MovingToStop
    /// [`Idle`]: Self::Idle
    Repositioning(EntityId),
    /// Doors are currently opening.
    DoorOpening,
    /// Doors open; riders may board or exit.
    Loading,
    /// Doors are currently closing.
    DoorClosing,
    /// Stopped at a floor (doors closed, awaiting dispatch).
    Stopped,
}

impl ElevatorPhase {
    /// Whether the elevator is currently travelling (in either a dispatched
    /// or a repositioning move).
    #[must_use]
    pub const fn is_moving(&self) -> bool {
        matches!(self, Self::MovingToStop(_) | Self::Repositioning(_))
    }

    /// The target stop of a moving elevator, if any.
    ///
    /// Returns `Some(stop)` for both [`MovingToStop`] and [`Repositioning`]
    /// variants; `None` otherwise.
    ///
    /// [`MovingToStop`]: Self::MovingToStop
    /// [`Repositioning`]: Self::Repositioning
    #[must_use]
    pub const fn moving_target(&self) -> Option<EntityId> {
        match self {
            Self::MovingToStop(s) | Self::Repositioning(s) => Some(*s),
            _ => None,
        }
    }
}

impl std::fmt::Display for ElevatorPhase {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Idle => write!(f, "Idle"),
            Self::MovingToStop(id) => write!(f, "MovingToStop({id:?})"),
            Self::Repositioning(id) => write!(f, "Repositioning({id:?})"),
            Self::DoorOpening => write!(f, "DoorOpening"),
            Self::Loading => write!(f, "Loading"),
            Self::DoorClosing => write!(f, "DoorClosing"),
            Self::Stopped => write!(f, "Stopped"),
        }
    }
}

/// Component for an elevator entity.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Elevator {
    /// Current operational phase.
    pub(crate) phase: ElevatorPhase,
    /// Door finite-state machine.
    pub(crate) door: DoorState,
    /// Maximum travel speed (distance/tick).
    pub(crate) max_speed: f64,
    /// Acceleration rate (distance/tick^2).
    pub(crate) acceleration: f64,
    /// Deceleration rate (distance/tick^2).
    pub(crate) deceleration: f64,
    /// Maximum weight the car can carry.
    pub(crate) weight_capacity: f64,
    /// Total weight of riders currently aboard.
    pub(crate) current_load: f64,
    /// Entity IDs of riders currently aboard.
    pub(crate) riders: Vec<EntityId>,
    /// Stop entity the car is heading toward, if any.
    pub(crate) target_stop: Option<EntityId>,
    /// Ticks for a door open/close transition.
    pub(crate) door_transition_ticks: u32,
    /// Ticks the door stays fully open.
    pub(crate) door_open_ticks: u32,
    /// Line entity this car belongs to.
    #[serde(alias = "group")]
    pub(crate) line: EntityId,
    /// Whether this elevator is currently repositioning (not serving a dispatch).
    #[serde(default)]
    pub(crate) repositioning: bool,
    /// Stop entity IDs this elevator cannot serve (access restriction).
    #[serde(default)]
    pub(crate) restricted_stops: HashSet<EntityId>,
    /// Speed multiplier for Inspection mode (0.0..1.0).
    #[serde(default = "default_inspection_speed_factor")]
    pub(crate) inspection_speed_factor: f64,
    /// Up-direction indicator lamp: whether this car will serve upward trips.
    ///
    /// Auto-managed by the dispatch phase: set true when heading up (or idle),
    /// false while actively committed to a downward trip. Affects boarding:
    /// a rider whose next leg goes up will not board a car with `going_up=false`.
    #[serde(default = "default_true")]
    pub(crate) going_up: bool,
    /// Down-direction indicator lamp: whether this car will serve downward trips.
    ///
    /// Auto-managed by the dispatch phase: set true when heading down (or idle),
    /// false while actively committed to an upward trip. Affects boarding:
    /// a rider whose next leg goes down will not board a car with `going_down=false`.
    #[serde(default = "default_true")]
    pub(crate) going_down: bool,
    /// Count of rounded-floor transitions (passing-floors + arrivals).
    /// Useful as a scoring axis for efficiency — fewer moves per delivery
    /// means less wasted travel.
    #[serde(default)]
    pub(crate) move_count: u64,
    /// Pending manual door-control commands. Processed at the start of the
    /// doors phase; commands that aren't yet valid remain queued.
    #[serde(default)]
    pub(crate) door_command_queue: Vec<DoorCommand>,
}

/// Default inspection speed factor (25% of normal speed).
const fn default_inspection_speed_factor() -> f64 {
    0.25
}

/// Default value for direction indicator fields (both lamps on = idle/either direction).
const fn default_true() -> bool {
    true
}

impl Elevator {
    /// Current operational phase.
    #[must_use]
    pub const fn phase(&self) -> ElevatorPhase {
        self.phase
    }

    /// Door finite-state machine.
    #[must_use]
    pub const fn door(&self) -> &DoorState {
        &self.door
    }

    /// Maximum travel speed (distance/tick).
    #[must_use]
    pub const fn max_speed(&self) -> f64 {
        self.max_speed
    }

    /// Acceleration rate (distance/tick^2).
    #[must_use]
    pub const fn acceleration(&self) -> f64 {
        self.acceleration
    }

    /// Deceleration rate (distance/tick^2).
    #[must_use]
    pub const fn deceleration(&self) -> f64 {
        self.deceleration
    }

    /// Maximum weight the car can carry.
    #[must_use]
    pub const fn weight_capacity(&self) -> f64 {
        self.weight_capacity
    }

    /// Total weight of riders currently aboard.
    #[must_use]
    pub const fn current_load(&self) -> f64 {
        self.current_load
    }

    /// Entity IDs of riders currently aboard.
    #[must_use]
    pub fn riders(&self) -> &[EntityId] {
        &self.riders
    }

    /// Stop entity the car is heading toward, if any.
    #[must_use]
    pub const fn target_stop(&self) -> Option<EntityId> {
        self.target_stop
    }

    /// Ticks for a door open/close transition.
    #[must_use]
    pub const fn door_transition_ticks(&self) -> u32 {
        self.door_transition_ticks
    }

    /// Ticks the door stays fully open.
    #[must_use]
    pub const fn door_open_ticks(&self) -> u32 {
        self.door_open_ticks
    }

    /// Line entity this car belongs to.
    #[must_use]
    pub const fn line(&self) -> EntityId {
        self.line
    }

    /// Whether this elevator is currently repositioning (not serving a dispatch).
    #[must_use]
    pub const fn repositioning(&self) -> bool {
        self.repositioning
    }

    /// Stop entity IDs this elevator cannot serve (access restriction).
    #[must_use]
    pub const fn restricted_stops(&self) -> &HashSet<EntityId> {
        &self.restricted_stops
    }

    /// Speed multiplier applied during Inspection mode.
    #[must_use]
    pub const fn inspection_speed_factor(&self) -> f64 {
        self.inspection_speed_factor
    }

    /// Whether this car's up-direction indicator lamp is lit.
    ///
    /// A lit up-lamp signals the car will serve upward-travelling riders.
    /// Both lamps lit means the car is idle and will accept either direction.
    #[must_use]
    pub const fn going_up(&self) -> bool {
        self.going_up
    }

    /// Whether this car's down-direction indicator lamp is lit.
    ///
    /// A lit down-lamp signals the car will serve downward-travelling riders.
    /// Both lamps lit means the car is idle and will accept either direction.
    #[must_use]
    pub const fn going_down(&self) -> bool {
        self.going_down
    }

    /// Direction this car is currently committed to, derived from the pair
    /// of indicator-lamp flags.
    ///
    /// - `Direction::Up` — only `going_up` is set
    /// - `Direction::Down` — only `going_down` is set
    /// - `Direction::Either` — both lamps lit (car is idle / accepting
    ///   either direction), or neither is set (treated as `Either` too,
    ///   though the dispatch phase normally keeps at least one lit)
    #[must_use]
    pub const fn direction(&self) -> Direction {
        match (self.going_up, self.going_down) {
            (true, false) => Direction::Up,
            (false, true) => Direction::Down,
            _ => Direction::Either,
        }
    }

    /// Count of rounded-floor transitions this elevator has made
    /// (both passing-floor crossings and arrivals).
    #[must_use]
    pub const fn move_count(&self) -> u64 {
        self.move_count
    }

    /// Pending manual door-control commands for this elevator.
    ///
    /// Populated by
    /// [`Simulation::request_door_open`](crate::sim::Simulation::request_door_open)
    /// and its siblings. Commands are drained at the start of each doors-phase
    /// tick; any that aren't yet valid remain queued.
    #[must_use]
    pub fn door_command_queue(&self) -> &[DoorCommand] {
        &self.door_command_queue
    }
}
