//! Tick-loop system phases run in sequence each simulation step.

/// Reconcile elevator phase with its destination queue front.
pub(crate) mod advance_queue;
/// Advance transient states (boarding/exiting) to their next state.
pub(crate) mod advance_transient;
/// Assign idle elevators to stops via dispatch strategy.
pub(crate) mod dispatch;
/// Door open/close finite-state machine progression.
pub(crate) mod doors;
/// Per-tick energy consumption and regeneration tracking.
#[cfg(feature = "energy")]
pub(crate) mod energy;
/// Board and exit riders at stops.
pub(crate) mod loading;
/// Aggregate metrics collection.
pub(crate) mod metrics;
/// Trapezoidal-profile elevator movement.
pub(crate) mod movement;
/// Reposition idle elevators for coverage.
pub(crate) mod reposition;

/// Context passed to every system phase.
#[derive(Debug, Clone, Copy)]
pub struct PhaseContext {
    /// Current simulation tick number.
    pub tick: u64,
    /// Time step for this tick (seconds).
    pub dt: f64,
}
