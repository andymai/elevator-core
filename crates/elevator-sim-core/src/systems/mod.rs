pub mod advance_transient;
pub mod dispatch;
pub mod doors;
pub mod loading;
pub mod movement;

/// Context passed to every system phase.
pub struct PhaseContext {
    pub tick: u64,
    pub dt: f64,
}
