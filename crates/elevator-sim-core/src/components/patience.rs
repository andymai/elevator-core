//! Patience and boarding preference components.

/// Tracks how long a rider will wait before abandoning.
#[derive(Debug, Clone, Copy)]
pub struct Patience {
    /// Maximum ticks the rider will wait before abandoning.
    pub max_wait_ticks: u64,
    /// Ticks waited so far (incremented while in `Waiting` phase).
    pub waited_ticks: u64,
}

/// Boarding preferences for a rider.
#[derive(Debug, Clone, Copy)]
pub struct Preferences {
    /// If true, the rider will skip a crowded elevator and wait for the next.
    pub skip_full_elevator: bool,
    /// Maximum load factor (0.0-1.0) the rider will tolerate when boarding.
    pub max_crowding_factor: f64,
}
