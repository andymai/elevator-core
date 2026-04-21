//! Service mode component for elevator operational modes.

use serde::{Deserialize, Serialize};

/// Operational service mode for an elevator, orthogonal to [`ElevatorPhase`](super::ElevatorPhase).
///
/// Normal is the default. Modes modify how simulation phases behave without
/// replacing `ElevatorPhase` — an elevator in any service mode may occupy
/// any phase (`Idle`, `MovingToStop`, `Repositioning`, etc.). `Independent`
/// elevators are excluded from automatic dispatch and repositioning, so in
/// practice they only move under direct API control.
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
    /// Manual mode: elevator is driven by direct velocity commands from the
    /// game (see
    /// [`Simulation::set_target_velocity`](crate::sim::Simulation::set_target_velocity)
    /// and [`Simulation::emergency_stop`](crate::sim::Simulation::emergency_stop)).
    /// Excluded from dispatch and repositioning; doors follow the manual
    /// door-control API. Can stop at any position — the elevator is not
    /// required to align with a configured stop.
    Manual,
    /// Out of service: the elevator is shut down. Excluded from dispatch
    /// and repositioning; auto-boarding is disabled. In-flight trips
    /// complete and doors cycle normally, but no riders board or exit.
    /// Once idle the car is fully inert.
    ///
    /// Unlike [`Simulation::disable`](crate::sim::Simulation::disable),
    /// the entity remains visible in queries and is not skipped by
    /// iteration — games can render an "out of order" indicator.
    OutOfService,
}

impl ServiceMode {
    /// `true` if elevators in this mode are skipped by the automatic
    /// dispatch and repositioning phases.
    ///
    /// Returns `true` for [`Independent`](Self::Independent),
    /// [`Manual`](Self::Manual), [`Inspection`](Self::Inspection), and
    /// [`OutOfService`](Self::OutOfService). Independent and Manual hand
    /// movement over to the consumer; Inspection is technician-controlled;
    /// `OutOfService` is fully inert.
    #[must_use]
    pub const fn is_dispatch_excluded(self) -> bool {
        matches!(
            self,
            Self::Independent | Self::Manual | Self::Inspection | Self::OutOfService
        )
    }

    /// `true` if the loading phase should automatically board and exit
    /// riders at open doors.
    ///
    /// Only [`Normal`](Self::Normal) allows auto-boarding. All other
    /// modes hand rider management to the consumer or are operationally
    /// unsuitable for passenger service.
    #[must_use]
    pub const fn allows_auto_boarding(self) -> bool {
        matches!(self, Self::Normal)
    }
}

impl std::fmt::Display for ServiceMode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Normal => write!(f, "Normal"),
            Self::Independent => write!(f, "Independent"),
            Self::Inspection => write!(f, "Inspection"),
            Self::Manual => write!(f, "Manual"),
            Self::OutOfService => write!(f, "OutOfService"),
        }
    }
}
