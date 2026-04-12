use crate::entity::EntityId;
use serde::{Deserialize, Serialize};

/// Events emitted by the simulation during ticks.
///
/// All entity references use `EntityId`. Games can look up additional
/// component data on the referenced entity if needed.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum SimEvent {
    // -- Elevator events --
    /// An elevator departed from a stop.
    ElevatorDeparted {
        /// The elevator that departed.
        elevator: EntityId,
        /// The stop it departed from.
        from_stop: EntityId,
        /// The tick when departure occurred.
        tick: u64,
    },
    /// An elevator arrived at a stop.
    ElevatorArrived {
        /// The elevator that arrived.
        elevator: EntityId,
        /// The stop it arrived at.
        at_stop: EntityId,
        /// The tick when arrival occurred.
        tick: u64,
    },
    /// An elevator's doors finished opening.
    DoorOpened {
        /// The elevator whose doors opened.
        elevator: EntityId,
        /// The tick when the doors opened.
        tick: u64,
    },
    /// An elevator's doors finished closing.
    DoorClosed {
        /// The elevator whose doors closed.
        elevator: EntityId,
        /// The tick when the doors closed.
        tick: u64,
    },
    /// Emitted when an elevator passes a stop without stopping.
    /// Games/dispatch can use this to decide whether to add stops mid-travel.
    PassingFloor {
        /// The elevator passing by.
        elevator: EntityId,
        /// The stop being passed.
        stop: EntityId,
        /// Direction: true = moving up, false = moving down.
        moving_up: bool,
        /// The tick when the pass occurred.
        tick: u64,
    },

    // -- Rider events (unified: passengers, cargo, any rideable entity) --
    /// A new rider appeared at a stop and wants to travel.
    RiderSpawned {
        /// The spawned rider entity.
        rider: EntityId,
        /// The stop where the rider appeared.
        origin: EntityId,
        /// The stop the rider wants to reach.
        destination: EntityId,
        /// The tick when the rider spawned.
        tick: u64,
    },
    /// A rider boarded an elevator.
    RiderBoarded {
        /// The rider that boarded.
        rider: EntityId,
        /// The elevator the rider boarded.
        elevator: EntityId,
        /// The tick when boarding occurred.
        tick: u64,
    },
    /// A rider alighted (exited) an elevator at a stop.
    RiderAlighted {
        /// The rider that alighted.
        rider: EntityId,
        /// The elevator the rider exited.
        elevator: EntityId,
        /// The stop where the rider alighted.
        stop: EntityId,
        /// The tick when alighting occurred.
        tick: u64,
    },
    /// A rider was rejected from boarding (e.g., over capacity).
    RiderRejected {
        /// The rider that was rejected.
        rider: EntityId,
        /// The elevator that rejected the rider.
        elevator: EntityId,
        /// The reason for rejection.
        reason: String,
        /// The tick when rejection occurred.
        tick: u64,
    },
    /// A rider gave up waiting and left the stop.
    RiderAbandoned {
        /// The rider that abandoned.
        rider: EntityId,
        /// The stop the rider left.
        stop: EntityId,
        /// The tick when abandonment occurred.
        tick: u64,
    },
}

/// Collects simulation events for consumers to drain.
#[derive(Debug, Default)]
pub struct EventBus {
    /// The pending events not yet consumed.
    events: Vec<SimEvent>,
}

impl EventBus {
    /// Pushes a new event onto the bus.
    pub fn emit(&mut self, event: SimEvent) {
        self.events.push(event);
    }

    /// Returns and clears all pending events.
    pub fn drain(&mut self) -> Vec<SimEvent> {
        std::mem::take(&mut self.events)
    }

    /// Returns a slice of all pending events without clearing them.
    pub fn peek(&self) -> &[SimEvent] {
        &self.events
    }
}
