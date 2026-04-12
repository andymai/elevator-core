/// Component tracking a passenger's patience.
#[derive(Debug, Clone, Copy)]
pub struct Patience {
    /// Maximum ticks the passenger will wait before abandoning.
    pub max_wait_ticks: u64,
    /// Ticks waited so far (incremented while in Waiting state).
    pub waited_ticks: u64,
}

/// Component for passenger boarding preferences.
#[derive(Debug, Clone, Copy)]
pub struct Preferences {
    /// If true, passenger will skip a crowded elevator and wait for the next.
    pub skip_full_elevator: bool,
    /// Maximum load factor (0.0-1.0) the passenger will tolerate when boarding.
    pub max_crowding_factor: f64,
}
