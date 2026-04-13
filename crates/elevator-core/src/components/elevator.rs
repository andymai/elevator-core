//! Elevator state and configuration component.

use serde::{Deserialize, Serialize};
use std::collections::HashSet;

use crate::door::DoorState;
use crate::entity::EntityId;

/// Operational phase of an elevator.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[non_exhaustive]
pub enum ElevatorPhase {
    /// Parked with no pending requests.
    Idle,
    /// Travelling toward a specific stop.
    MovingToStop(EntityId),
    /// Doors are currently opening.
    DoorOpening,
    /// Doors open; riders may board or exit.
    Loading,
    /// Doors are currently closing.
    DoorClosing,
    /// Stopped at a floor (doors closed, awaiting dispatch).
    Stopped,
}

impl std::fmt::Display for ElevatorPhase {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Idle => write!(f, "Idle"),
            Self::MovingToStop(id) => write!(f, "MovingToStop({id:?})"),
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
}

/// Default inspection speed factor (25% of normal speed).
const fn default_inspection_speed_factor() -> f64 {
    0.25
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
}
