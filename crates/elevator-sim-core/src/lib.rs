//! Engine-agnostic elevator simulation library.
//!
//! Provides a tick-based simulation with pluggable dispatch strategies,
//! trapezoidal velocity profiles, and a typed event bus for UI/metrics consumers.

#![forbid(unsafe_code)]
#![deny(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

/// Entity-component data types for the simulation.
pub mod components;
/// ECS-style query builder for iterating entities by component composition.
pub mod query;
/// Entity identity and allocation.
pub mod entity;
/// Simulation error types.
pub mod error;
/// Typed identifiers for groups, zones, and other sim concepts.
pub mod ids;
/// Tick-loop system phases (dispatch, movement, doors, loading, metrics).
pub mod systems;
/// Central entity/component storage.
pub mod world;

/// Fluent builder for constructing a Simulation programmatically.
pub mod builder;
/// Building and elevator configuration (RON deserialization).
pub mod config;
/// Pluggable dispatch strategies (SCAN, LOOK, nearest-car, ETD).
pub mod dispatch;
/// Door finite-state machine.
pub mod door;
/// Simulation event bus and event types.
pub mod events;
/// Lifecycle hooks for injecting logic before/after simulation phases.
pub mod hooks;
/// Aggregate simulation metrics.
pub mod metrics;
/// Trapezoidal velocity-profile movement math.
pub mod movement;
/// Scenario replay from recorded event streams.
pub mod scenario;
/// Top-level simulation runner.
pub mod sim;
/// Stop configuration helpers.
pub mod stop;
/// Tick-to-wall-clock time conversion.
pub mod time;
/// Traffic generation (arrival patterns).
#[cfg(feature = "traffic")]
pub mod traffic;

/// Common imports for consumers of this library.
pub mod prelude {
    pub use crate::builder::SimulationBuilder;
    pub use crate::components::{
        Elevator, ElevatorPhase, Patience, Position, Preferences, Rider, RiderPhase, Route, Stop,
        Velocity, Zone,
    };
    pub use crate::config::SimConfig;
    pub use crate::dispatch::{DispatchDecision, DispatchStrategy};
    pub use crate::entity::EntityId;
    pub use crate::error::{RejectionReason, SimError};
    pub use crate::dispatch::ElevatorGroup;
    pub use crate::events::{Event, EventBus, EventChannel};
    pub use crate::hooks::Phase;
    pub use crate::ids::GroupId;
    pub use crate::metrics::Metrics;
    pub use crate::sim::{ElevatorParams, Simulation};
    pub use crate::systems::PhaseContext;
    pub use crate::stop::StopId;
    pub use crate::time::TimeAdapter;
}

#[cfg(test)]
mod tests;
