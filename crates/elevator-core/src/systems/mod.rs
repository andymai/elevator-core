//! Tick-loop system phases run in sequence each simulation step.

/// Advance transient states (boarding/alighting) to their next state.
pub mod advance_transient;
/// Assign idle elevators to stops via dispatch strategy.
pub mod dispatch;
/// Door open/close finite-state machine progression.
pub mod doors;
/// Board and alight riders at stops.
pub mod loading;
/// Aggregate metrics collection.
pub mod metrics;
/// Trapezoidal-profile elevator movement.
pub mod movement;
/// Reposition idle elevators for coverage.
pub mod reposition;

/// Context passed to every system phase.
#[derive(Debug, Clone, Copy)]
pub struct PhaseContext {
    /// Current simulation tick number.
    pub tick: u64,
    /// Time step for this tick (seconds).
    pub dt: f64,
}
