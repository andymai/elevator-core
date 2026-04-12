//! Elevator state and configuration component.

use crate::door::DoorState;
use crate::entity::EntityId;
use crate::ids::GroupId;

/// Operational phase of an elevator.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ElevatorPhase {
    /// Parked with no pending requests.
    Idle,
    /// Travelling toward a specific stop.
    MovingToStop(EntityId),
    /// Doors are currently opening.
    DoorOpening,
    /// Doors open; riders may board or alight.
    Loading,
    /// Doors are currently closing.
    DoorClosing,
    /// Stopped at a floor (doors closed, awaiting dispatch).
    Stopped,
}

/// Component for an elevator entity.
#[derive(Debug, Clone)]
pub struct Elevator {
    /// Current operational phase.
    pub phase: ElevatorPhase,
    /// Door finite-state machine.
    pub door: DoorState,
    /// Maximum travel speed (distance/tick).
    pub max_speed: f64,
    /// Acceleration rate (distance/tick^2).
    pub acceleration: f64,
    /// Deceleration rate (distance/tick^2).
    pub deceleration: f64,
    /// Maximum weight the car can carry.
    pub weight_capacity: f64,
    /// Total weight of riders currently aboard.
    pub current_load: f64,
    /// Entity IDs of riders currently aboard.
    pub riders: Vec<EntityId>,
    /// Stop entity the car is heading toward, if any.
    pub target_stop: Option<EntityId>,
    /// Ticks for a door open/close transition.
    pub door_transition_ticks: u32,
    /// Ticks the door stays fully open.
    pub door_open_ticks: u32,
    /// Elevator group this car belongs to.
    pub group: GroupId,
}
