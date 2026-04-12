use crate::entity::EntityId;

/// State of a passenger in the simulation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PassengerState {
    /// Waiting at origin stop.
    Waiting,
    /// Boarding an elevator (transient, one tick).
    Boarding(EntityId),
    /// Riding in an elevator.
    Riding(EntityId),
    /// Alighting from an elevator (transient, one tick).
    Alighting(EntityId),
    /// Walking between transfer stops (teleport for now).
    Walking,
    /// Reached final destination.
    Arrived,
    /// Gave up waiting (exceeded patience).
    Abandoned,
}

/// Component for a passenger entity.
#[derive(Debug, Clone)]
pub struct PassengerData {
    pub weight: f64,
    pub origin: EntityId,
    pub destination: EntityId,
    pub spawn_tick: u64,
    pub state: PassengerState,
    /// Tick when the passenger boarded (for ride time metrics).
    pub board_tick: Option<u64>,
}
