use crate::door::DoorState;
use crate::entity::EntityId;
use crate::ids::GroupId;

/// Operational state of an elevator car.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ElevatorState {
    Idle,
    MovingToStop(EntityId),
    DoorOpening,
    Loading,
    DoorClosing,
    Stopped,
}

/// Component for an elevator car entity.
#[derive(Debug, Clone)]
pub struct ElevatorCar {
    pub state: ElevatorState,
    pub door: DoorState,
    pub max_speed: f64,
    pub acceleration: f64,
    pub deceleration: f64,
    pub weight_capacity: f64,
    pub current_load: f64,
    pub riders: Vec<EntityId>,
    pub target_stop: Option<EntityId>,
    pub door_transition_ticks: u32,
    pub door_open_ticks: u32,
    pub group: GroupId,
}
