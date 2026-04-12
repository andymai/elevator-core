use crate::elevator::ElevatorId;
use crate::passenger::{CargoId, PassengerId};
use crate::stop::StopId;
use serde::{Deserialize, Serialize};

/// Events emitted by the simulation during ticks.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum SimEvent {
    ElevatorDeparted {
        elevator: ElevatorId,
        from_stop: StopId,
        tick: u64,
    },
    ElevatorArrived {
        elevator: ElevatorId,
        at_stop: StopId,
        tick: u64,
    },
    DoorOpened {
        elevator: ElevatorId,
        tick: u64,
    },
    DoorClosed {
        elevator: ElevatorId,
        tick: u64,
    },
    PassengerSpawned {
        passenger: PassengerId,
        origin: StopId,
        destination: StopId,
        tick: u64,
    },
    PassengerBoarded {
        passenger: PassengerId,
        elevator: ElevatorId,
        tick: u64,
    },
    PassengerAlighted {
        passenger: PassengerId,
        elevator: ElevatorId,
        stop: StopId,
        tick: u64,
    },
    CargoLoaded {
        cargo: CargoId,
        elevator: ElevatorId,
        tick: u64,
    },
    CargoUnloaded {
        cargo: CargoId,
        elevator: ElevatorId,
        stop: StopId,
        tick: u64,
    },
    OverweightRejected {
        entity_kind: String,
        elevator: ElevatorId,
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
