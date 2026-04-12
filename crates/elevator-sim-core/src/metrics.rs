/// Aggregated simulation metrics, updated each tick from events.
///
/// Games query this via `sim.metrics()` for HUD display, scoring,
/// or scenario evaluation.
#[derive(Debug, Clone, Default)]
pub struct Metrics {
    // -- Public queryable metrics --
    /// Average wait time in ticks (spawn to board).
    pub avg_wait_time: f64,
    /// Average ride time in ticks (board to alight).
    pub avg_ride_time: f64,
    /// Maximum wait time observed (ticks).
    pub max_wait_time: u64,
    /// Riders delivered in the current throughput window.
    pub throughput: u64,
    /// Riders delivered total.
    pub total_delivered: u64,
    /// Riders who abandoned.
    pub total_abandoned: u64,
    /// Total riders spawned.
    pub total_spawned: u64,
    /// Abandonment rate (0.0 - 1.0).
    pub abandonment_rate: f64,
    /// Total distance traveled by all elevators.
    pub total_distance: f64,

    // -- Internal accumulators --
    /// Running sum of wait ticks across all boarded riders.
    sum_wait_ticks: u64,
    /// Running sum of ride ticks across all delivered riders.
    sum_ride_ticks: u64,
    /// Number of riders that have boarded.
    boarded_count: u64,
    /// Number of riders that have been delivered.
    delivered_count: u64,
    /// Sliding window for throughput: (tick, count) of recent deliveries.
    delivery_window: Vec<u64>,
    /// Window size for throughput calculation.
    pub throughput_window_ticks: u64,
}

impl Metrics {
    /// Create a new `Metrics` with default throughput window (3600 ticks).
    pub fn new() -> Self {
        Self {
            throughput_window_ticks: 3600, // default: 1 minute at 60 tps
            ..Default::default()
        }
    }

    /// Set the throughput window size (builder pattern).
    #[must_use]
    pub const fn with_throughput_window(mut self, window_ticks: u64) -> Self {
        self.throughput_window_ticks = window_ticks;
        self
    }

    /// Record a rider spawning.
    pub const fn record_spawn(&mut self) {
        self.total_spawned += 1;
    }

    /// Record a rider boarding. `wait_ticks` = `tick_boarded` - `tick_spawned`.
    #[allow(clippy::cast_precision_loss)]
    pub fn record_board(&mut self, wait_ticks: u64) {
        self.boarded_count += 1;
        self.sum_wait_ticks += wait_ticks;
        self.avg_wait_time = self.sum_wait_ticks as f64 / self.boarded_count as f64;
        if wait_ticks > self.max_wait_time {
            self.max_wait_time = wait_ticks;
        }
    }

    /// Record a rider alighting. `ride_ticks` = `tick_alighted` - `tick_boarded`.
    #[allow(clippy::cast_precision_loss)]
    pub fn record_delivery(&mut self, ride_ticks: u64, tick: u64) {
        self.delivered_count += 1;
        self.total_delivered += 1;
        self.sum_ride_ticks += ride_ticks;
        self.avg_ride_time = self.sum_ride_ticks as f64 / self.delivered_count as f64;
        self.delivery_window.push(tick);
    }

    /// Record a rider abandoning.
    #[allow(clippy::cast_precision_loss)]
    pub fn record_abandonment(&mut self) {
        self.total_abandoned += 1;
        if self.total_spawned > 0 {
            self.abandonment_rate = self.total_abandoned as f64 / self.total_spawned as f64;
        }
    }

    /// Record elevator distance traveled this tick.
    pub fn record_distance(&mut self, distance: f64) {
        self.total_distance += distance;
    }

    /// Update windowed throughput. Call once per tick.
    #[allow(clippy::cast_possible_truncation)]
    pub fn update_throughput(&mut self, current_tick: u64) {
        let cutoff = current_tick.saturating_sub(self.throughput_window_ticks);
        self.delivery_window.retain(|&t| t > cutoff);
        self.throughput = self.delivery_window.len() as u64;
    }
}
