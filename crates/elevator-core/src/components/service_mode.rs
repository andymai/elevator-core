//! Service mode component for elevator operational modes.

use serde::{Deserialize, Serialize};

/// Operational service mode for an elevator, orthogonal to [`ElevatorPhase`](super::ElevatorPhase).
///
/// Normal is the default. Modes modify how simulation phases behave without
/// replacing `ElevatorPhase` — an elevator in `Independent` mode can still
/// be `Idle` or `MovingToStop`.
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[non_exhaustive]
pub enum ServiceMode {
    /// Normal operation: dispatch assigns stops, doors auto-cycle.
    #[default]
    Normal,
    /// Independent mode: elevator is excluded from dispatch and repositioning.
    /// Consumer controls movement via direct API calls.
    Independent,
    /// Inspection mode: reduced speed, doors hold open indefinitely.
    /// Speed is reduced by [`Elevator::inspection_speed_factor`](super::Elevator::inspection_speed_factor).
    Inspection,
}

impl std::fmt::Display for ServiceMode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Normal => write!(f, "Normal"),
            Self::Independent => write!(f, "Independent"),
            Self::Inspection => write!(f, "Inspection"),
        }
    }
}
