//! Simulation event bus and typed event channels.

use crate::entity::EntityId;
use crate::error::{RejectionContext, RejectionReason};
use crate::ids::GroupId;
use ordered_float::OrderedFloat;
use serde::{Deserialize, Serialize};

/// Events emitted by the simulation during ticks.
///
/// All entity references use `EntityId`. Games can look up additional
/// component data on the referenced entity if needed.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[non_exhaustive]
pub enum Event {
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
    /// A rider exited an elevator at a stop.
    #[serde(alias = "RiderAlighted")]
    RiderExited {
        /// The rider that exited.
        rider: EntityId,
        /// The elevator the rider exited.
        elevator: EntityId,
        /// The stop where the rider exited.
        stop: EntityId,
        /// The tick when exiting occurred.
        tick: u64,
    },
    /// A rider was rejected from boarding (e.g., over capacity).
    RiderRejected {
        /// The rider that was rejected.
        rider: EntityId,
        /// The elevator that rejected the rider.
        elevator: EntityId,
        /// The reason for rejection.
        reason: RejectionReason,
        /// Additional numeric context for the rejection.
        context: Option<RejectionContext>,
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

    /// A rider was ejected from an elevator (due to disable or despawn).
    ///
    /// The rider is moved to `Waiting` phase at the nearest stop.
    RiderEjected {
        /// The rider that was ejected.
        rider: EntityId,
        /// The elevator the rider was ejected from.
        elevator: EntityId,
        /// The stop the rider was placed at.
        stop: EntityId,
        /// The tick when ejection occurred.
        tick: u64,
    },

    // -- Dispatch events --
    /// An elevator was assigned to serve a stop by the dispatcher.
    ElevatorAssigned {
        /// The elevator that was assigned.
        elevator: EntityId,
        /// The stop it was assigned to serve.
        stop: EntityId,
        /// The tick when the assignment occurred.
        tick: u64,
    },

    // -- Topology lifecycle events --
    /// A new stop was added to the simulation.
    StopAdded {
        /// The new stop entity.
        stop: EntityId,
        /// The line the stop was added to.
        line: EntityId,
        /// The group the stop was added to.
        group: GroupId,
        /// The tick when the stop was added.
        tick: u64,
    },
    /// A new elevator was added to the simulation.
    ElevatorAdded {
        /// The new elevator entity.
        elevator: EntityId,
        /// The line the elevator was added to.
        line: EntityId,
        /// The group the elevator was added to.
        group: GroupId,
        /// The tick when the elevator was added.
        tick: u64,
    },
    /// An entity was disabled.
    EntityDisabled {
        /// The entity that was disabled.
        entity: EntityId,
        /// The tick when it was disabled.
        tick: u64,
    },
    /// An entity was re-enabled.
    EntityEnabled {
        /// The entity that was re-enabled.
        entity: EntityId,
        /// The tick when it was enabled.
        tick: u64,
    },
    /// A rider's route was invalidated due to topology change.
    ///
    /// Emitted when a stop on a rider's route is disabled or removed.
    /// If no alternative is found, the rider will abandon after a grace period.
    RouteInvalidated {
        /// The affected rider.
        rider: EntityId,
        /// The stop that caused the invalidation.
        affected_stop: EntityId,
        /// Why the route was invalidated.
        reason: RouteInvalidReason,
        /// The tick when invalidation occurred.
        tick: u64,
    },
    /// A rider was manually rerouted via `sim.reroute()` or `sim.reroute_rider()`.
    RiderRerouted {
        /// The rerouted rider.
        rider: EntityId,
        /// The new destination stop.
        new_destination: EntityId,
        /// The tick when rerouting occurred.
        tick: u64,
    },

    /// A rider settled at a stop, becoming a resident.
    RiderSettled {
        /// The rider that settled.
        rider: EntityId,
        /// The stop where the rider settled.
        stop: EntityId,
        /// The tick when settlement occurred.
        tick: u64,
    },
    /// A rider was removed from the simulation.
    RiderDespawned {
        /// The rider that was removed.
        rider: EntityId,
        /// The tick when despawn occurred.
        tick: u64,
    },

    // -- Line lifecycle events --
    /// A line was added to the simulation.
    LineAdded {
        /// The new line entity.
        line: EntityId,
        /// The group the line was added to.
        group: GroupId,
        /// The tick when the line was added.
        tick: u64,
    },
    /// A line was removed from the simulation.
    LineRemoved {
        /// The removed line entity.
        line: EntityId,
        /// The group the line belonged to.
        group: GroupId,
        /// The tick when the line was removed.
        tick: u64,
    },
    /// A line was reassigned to a different group.
    LineReassigned {
        /// The line entity that was reassigned.
        line: EntityId,
        /// The group the line was previously in.
        old_group: GroupId,
        /// The group the line was moved to.
        new_group: GroupId,
        /// The tick when reassignment occurred.
        tick: u64,
    },
    /// An elevator was reassigned to a different line.
    ElevatorReassigned {
        /// The elevator that was reassigned.
        elevator: EntityId,
        /// The line the elevator was previously on.
        old_line: EntityId,
        /// The line the elevator was moved to.
        new_line: EntityId,
        /// The tick when reassignment occurred.
        tick: u64,
    },

    // -- Repositioning events --
    /// An elevator is being repositioned to improve coverage.
    ///
    /// Emitted when an idle elevator begins moving to a new position
    /// as decided by the [`RepositionStrategy`](crate::dispatch::RepositionStrategy).
    ElevatorRepositioning {
        /// The elevator being repositioned.
        elevator: EntityId,
        /// The stop it is being sent to.
        to_stop: EntityId,
        /// The tick when repositioning began.
        tick: u64,
    },
    /// An elevator completed repositioning and arrived at its target.
    ///
    /// Note: this is detected by the movement system — the elevator
    /// arrives just like any other movement. Games can distinguish
    /// repositioning arrivals from dispatch arrivals by tracking
    /// which elevators received `ElevatorRepositioning` events.
    ElevatorRepositioned {
        /// The elevator that completed repositioning.
        elevator: EntityId,
        /// The stop it arrived at.
        at_stop: EntityId,
        /// The tick when it arrived.
        tick: u64,
    },

    /// An elevator's service mode was changed.
    ServiceModeChanged {
        /// The elevator whose mode changed.
        elevator: EntityId,
        /// The previous service mode.
        from: crate::components::ServiceMode,
        /// The new service mode.
        to: crate::components::ServiceMode,
        /// The tick when the change occurred.
        tick: u64,
    },

    // -- Observability events --
    /// Energy consumed/regenerated by an elevator this tick.
    ///
    /// Requires the `energy` feature.
    #[cfg(feature = "energy")]
    EnergyConsumed {
        /// The elevator that consumed energy.
        elevator: EntityId,
        /// Energy consumed this tick.
        consumed: OrderedFloat<f64>,
        /// Energy regenerated this tick.
        regenerated: OrderedFloat<f64>,
        /// The tick when energy was recorded.
        tick: u64,
    },

    /// An elevator's load changed (rider boarded or exited).
    ///
    /// Emitted immediately after [`RiderBoarded`](Self::RiderBoarded) or
    /// [`RiderExited`](Self::RiderExited). Useful for real-time capacity
    /// bar displays in game UIs.
    CapacityChanged {
        /// The elevator whose load changed.
        elevator: EntityId,
        /// Current total weight aboard after the change.
        current_load: OrderedFloat<f64>,
        /// Maximum weight capacity of the elevator.
        capacity: OrderedFloat<f64>,
        /// The tick when the change occurred.
        tick: u64,
    },

    /// An elevator became idle (no more assignments or repositioning).
    ElevatorIdle {
        /// The elevator that became idle.
        elevator: EntityId,
        /// The stop where it became idle (if at a stop).
        at_stop: Option<EntityId>,
        /// The tick when it became idle.
        tick: u64,
    },

    /// An elevator was permanently removed from the simulation.
    ///
    /// Distinct from [`EntityDisabled`] — a disabled elevator can be
    /// re-enabled, but a removed elevator is despawned.
    ElevatorRemoved {
        /// The elevator that was removed.
        elevator: EntityId,
        /// The line it belonged to.
        line: EntityId,
        /// The group it belonged to.
        group: GroupId,
        /// The tick when removal occurred.
        tick: u64,
    },

    /// A stop was permanently removed from the simulation.
    ///
    /// Distinct from [`EntityDisabled`] — a disabled stop can be
    /// re-enabled, but a removed stop is despawned.
    StopRemoved {
        /// The stop that was removed.
        stop: EntityId,
        /// The tick when removal occurred.
        tick: u64,
    },
}

/// Reason a rider's route was invalidated.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[non_exhaustive]
pub enum RouteInvalidReason {
    /// A stop on the route was disabled.
    StopDisabled,
    /// No alternative stop is available in the same group.
    NoAlternative,
}

/// Collects simulation events for consumers to drain.
#[derive(Debug, Default)]
pub struct EventBus {
    /// The pending events not yet consumed.
    events: Vec<Event>,
}

impl EventBus {
    /// Pushes a new event onto the bus.
    pub fn emit(&mut self, event: Event) {
        self.events.push(event);
    }

    /// Returns and clears all pending events.
    pub fn drain(&mut self) -> Vec<Event> {
        std::mem::take(&mut self.events)
    }

    /// Returns a slice of all pending events without clearing them.
    #[must_use]
    pub fn peek(&self) -> &[Event] {
        &self.events
    }
}

/// A typed event channel for game-specific events.
///
/// Games insert this as a global resource on `World`:
///
/// ```
/// use elevator_core::world::World;
/// use elevator_core::events::EventChannel;
///
/// #[derive(Debug)]
/// enum MyGameEvent { Foo, Bar }
///
/// let mut world = World::new();
/// world.insert_resource(EventChannel::<MyGameEvent>::new());
/// // Later:
/// world.resource_mut::<EventChannel<MyGameEvent>>().unwrap().emit(MyGameEvent::Foo);
/// ```
#[derive(Debug)]
pub struct EventChannel<T> {
    /// Pending events not yet consumed.
    events: Vec<T>,
}

impl<T> EventChannel<T> {
    /// Create an empty event channel.
    #[must_use]
    pub const fn new() -> Self {
        Self { events: Vec::new() }
    }

    /// Emit an event into the channel.
    pub fn emit(&mut self, event: T) {
        self.events.push(event);
    }

    /// Drain and return all pending events.
    pub fn drain(&mut self) -> Vec<T> {
        std::mem::take(&mut self.events)
    }

    /// Peek at pending events without clearing.
    #[must_use]
    pub fn peek(&self) -> &[T] {
        &self.events
    }

    /// Check if the channel has no pending events.
    #[must_use]
    pub const fn is_empty(&self) -> bool {
        self.events.is_empty()
    }

    /// Number of pending events.
    #[must_use]
    pub const fn len(&self) -> usize {
        self.events.len()
    }
}

impl<T> Default for EventChannel<T> {
    fn default() -> Self {
        Self::new()
    }
}
