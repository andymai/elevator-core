pub mod advance_transient;
pub mod dispatch;
pub mod doors;
pub mod loading;
pub mod metrics;
pub mod movement;
pub mod reposition;

/// Context passed to every system phase.
pub struct PhaseContext {
    pub tick: u64,
    pub dt: f64,
}
