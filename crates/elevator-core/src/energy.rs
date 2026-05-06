//! Simplified energy modeling for elevators.
//!
//! Provides an [`EnergyProfile`](crate::energy::EnergyProfile) that
//! parameterizes per-tick energy costs and an
//! [`EnergyMetrics`](crate::energy::EnergyMetrics) accumulator for tracking
//! consumption and regeneration over time. The pure function
//! `compute_tick_energy` calculates consumed and regenerated energy for a
//! single tick.

use serde::{Deserialize, Serialize};

/// Per-elevator energy cost parameters.
///
/// Attach to an elevator entity by setting the
/// [`energy_profile`](crate::config::ElevatorConfig::energy_profile) field on
/// [`ElevatorConfig`](crate::config::ElevatorConfig) before constructing the
/// simulation. The energy system automatically initializes [`EnergyMetrics`]
/// if not already present.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnergyProfile {
    /// Energy consumed per tick while idle (doors closed, stationary).
    pub idle_cost_per_tick: f64,
    /// Base energy consumed per tick while moving.
    pub move_cost_per_tick: f64,
    /// Multiplier applied to current load weight when moving.
    pub weight_factor: f64,
    /// Fraction of consumed energy regenerated when descending (0.0 - 1.0).
    pub regen_factor: f64,
}

impl EnergyProfile {
    /// Create a new energy profile with the given parameters.
    #[must_use]
    pub const fn new(
        idle_cost_per_tick: f64,
        move_cost_per_tick: f64,
        weight_factor: f64,
        regen_factor: f64,
    ) -> Self {
        Self {
            idle_cost_per_tick,
            move_cost_per_tick,
            weight_factor,
            regen_factor,
        }
    }

    /// Energy consumed per tick while idle.
    #[must_use]
    pub const fn idle_cost_per_tick(&self) -> f64 {
        self.idle_cost_per_tick
    }

    /// Base energy consumed per tick while moving.
    #[must_use]
    pub const fn move_cost_per_tick(&self) -> f64 {
        self.move_cost_per_tick
    }

    /// Multiplier applied to current load weight when moving.
    #[must_use]
    pub const fn weight_factor(&self) -> f64 {
        self.weight_factor
    }

    /// Fraction of consumed energy regenerated when descending.
    #[must_use]
    pub const fn regen_factor(&self) -> f64 {
        self.regen_factor
    }
}

/// Accumulated energy metrics for a single elevator.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct EnergyMetrics {
    /// Total energy consumed over the simulation.
    pub(crate) total_consumed: f64,
    /// Total energy regenerated over the simulation.
    pub(crate) total_regenerated: f64,
    /// Number of ticks with energy activity recorded.
    pub(crate) ticks_tracked: u32,
}

impl EnergyMetrics {
    /// Total energy consumed.
    #[must_use]
    pub const fn total_consumed(&self) -> f64 {
        self.total_consumed
    }

    /// Total energy regenerated.
    #[must_use]
    pub const fn total_regenerated(&self) -> f64 {
        self.total_regenerated
    }

    /// Number of ticks with energy activity recorded.
    #[must_use]
    pub const fn ticks_tracked(&self) -> u32 {
        self.ticks_tracked
    }

    /// Net energy: consumed minus regenerated.
    #[must_use]
    pub const fn net_energy(&self) -> f64 {
        self.total_consumed - self.total_regenerated
    }

    /// Record a tick's energy consumption and regeneration.
    pub(crate) fn record(&mut self, consumed: f64, regenerated: f64) {
        self.total_consumed += consumed;
        self.total_regenerated += regenerated;
        self.ticks_tracked += 1;
    }
}

/// Compute consumed and regenerated energy for a single tick.
///
/// Returns `(consumed, regenerated)`.
///
/// - Idle: consumed = `idle_cost_per_tick`, regenerated = 0.
/// - Moving: consumed = `move_cost_per_tick + weight_factor * current_load`.
/// - Moving downward (velocity < 0): regenerated = `consumed * regen_factor`.
#[must_use]
pub(crate) fn compute_tick_energy(
    profile: &EnergyProfile,
    is_moving: bool,
    current_load: f64,
    velocity: f64,
) -> (f64, f64) {
    if !is_moving {
        return (profile.idle_cost_per_tick, 0.0);
    }

    let consumed = crate::fp::fma(
        profile.weight_factor,
        current_load,
        profile.move_cost_per_tick,
    );
    let regenerated = if velocity < 0.0 {
        consumed * profile.regen_factor
    } else {
        0.0
    };

    (consumed, regenerated)
}
