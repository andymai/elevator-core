//! Engine-agnostic elevator simulation library.
//!
//! Provides a tick-based simulation with pluggable dispatch strategies,
//! trapezoidal velocity profiles, and a typed event bus for UI/metrics consumers.

/// Entity-component data types for the simulation.
pub mod components;
/// Entity identity and allocation.
pub mod entity;
/// Typed identifiers for groups, zones, and other sim concepts.
pub mod ids;
/// Tick-loop system phases (dispatch, movement, doors, loading, metrics).
pub mod systems;
/// Central entity/component storage.
pub mod world;

/// Building and elevator configuration (RON deserialization).
pub mod config;
/// Dispatch strategies (SCAN, nearest-car, ETD, LOOK).
pub mod dispatch;
/// Door finite-state machine.
pub mod door;
/// Simulation event bus and event types.
pub mod events;
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
/// Traffic generation (arrival patterns).
pub mod traffic;

#[cfg(test)]
mod tests;
