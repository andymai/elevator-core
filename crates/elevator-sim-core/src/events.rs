use crate::entity::EntityId;
use serde::{Deserialize, Serialize};

/// Events emitted by the simulation during ticks.
///
/// All entity references use `EntityId`. Games can look up additional
/// component data on the referenced entity if needed.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum SimEvent {
    // -- Elevator events --
    ElevatorDeparted {
        elevator: EntityId,
        from_stop: EntityId,
        tick: u64,
    },
    ElevatorArrived {
        elevator: EntityId,
        at_stop: EntityId,
        tick: u64,
    },
    DoorOpened {
        elevator: EntityId,
        tick: u64,
    },
    DoorClosed {
        elevator: EntityId,
        tick: u64,
    },
    /// Emitted when an elevator passes a stop without stopping.
    /// Games/dispatch can use this to decide whether to add stops mid-travel.
    PassingFloor {
        elevator: EntityId,
        stop: EntityId,
        /// Direction: true = moving up, false = moving down.
        moving_up: bool,
        tick: u64,
    },

    // -- Rider events (unified: passengers, cargo, any rideable entity) --
    RiderSpawned {
        rider: EntityId,
        origin: EntityId,
        destination: EntityId,
        tick: u64,
    },
    RiderBoarded {
        rider: EntityId,
        elevator: EntityId,
        tick: u64,
    },
    RiderAlighted {
        rider: EntityId,
        elevator: EntityId,
        stop: EntityId,
        tick: u64,
    },
    RiderRejected {
        rider: EntityId,
        elevator: EntityId,
        reason: String,
        tick: u64,
    },
    RiderAbandoned {
        rider: EntityId,
        stop: EntityId,
        tick: u64,
    },
}

/// Collects simulation events for consumers to drain.
#[derive(Debug, Default)]
pub struct EventBus {
    events: Vec<SimEvent>,
}

impl EventBus {
    pub fn emit(&mut self, event: SimEvent) {
        self.events.push(event);
    }

    /// Returns and clears all pending events.
    pub fn drain(&mut self) -> Vec<SimEvent> {
        std::mem::take(&mut self.events)
    }

    pub fn peek(&self) -> &[SimEvent] {
        &self.events
    }
}
