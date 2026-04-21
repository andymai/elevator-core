//! Shared sweep-direction logic for the SCAN and LOOK dispatch algorithms.
//!
//! Both algorithms track a per-car direction and an accept mode, and apply
//! identical positional filtering. This module centralises that logic so the
//! two strategy structs stay thin and consistent.

use crate::world::World;

use super::{DispatchManifest, ElevatorGroup};

/// Tolerance for floating-point position comparisons.
pub const EPSILON: f64 = 1e-9;

/// Sweep direction for a single car.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum SweepDirection {
    /// Traveling upward (increasing position).
    Up,
    /// Traveling downward (decreasing position).
    Down,
}

impl SweepDirection {
    /// Return the opposite direction.
    pub const fn reversed(self) -> Self {
        match self {
            Self::Up => Self::Down,
            Self::Down => Self::Up,
        }
    }
}

/// Per-car accept mode for one dispatch pass.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum SweepMode {
    /// Demand exists strictly ahead — accept only strictly-ahead stops.
    Strict,
    /// Sweep just reversed — accept stops in the non-strict half (including
    /// the car's current position).
    Lenient,
}

/// True if any demanded stop is strictly ahead of `car_pos` in `dir`.
pub fn strict_demand_ahead(
    dir: SweepDirection,
    car_pos: f64,
    group: &ElevatorGroup,
    manifest: &DispatchManifest,
    world: &World,
) -> bool {
    group.stop_entities().iter().any(|&s| {
        if !manifest.has_demand(s) {
            return false;
        }
        let Some(p) = world.stop_position(s) else {
            return false;
        };
        match dir {
            SweepDirection::Up => p > car_pos + EPSILON,
            SweepDirection::Down => p < car_pos - EPSILON,
        }
    })
}

/// Return the rank cost for a `(car, stop)` pair given the car's current
/// direction and mode. Returns `None` when the stop is outside the
/// accepted half-sweep.
pub fn rank(
    mode: SweepMode,
    direction: SweepDirection,
    car_position: f64,
    stop_position: f64,
) -> Option<f64> {
    let accept = match (mode, direction) {
        (SweepMode::Strict, SweepDirection::Up) => stop_position > car_position + EPSILON,
        (SweepMode::Strict, SweepDirection::Down) => stop_position < car_position - EPSILON,
        (SweepMode::Lenient, SweepDirection::Up) => stop_position > car_position - EPSILON,
        (SweepMode::Lenient, SweepDirection::Down) => stop_position < car_position + EPSILON,
    };
    if accept {
        Some((car_position - stop_position).abs())
    } else {
        None
    }
}
