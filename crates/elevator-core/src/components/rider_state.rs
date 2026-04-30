//! Internal lifecycle state for riders, with location data bundled into
//! variants.
//!
//! [`RiderState`] is the engine's source of truth for "where a rider is and
//! what they're doing." It mirrors the public [`RiderPhase`] enum but lifts
//! the rider's `current_stop` (and the elevator they're aboard, where
//! applicable) into the variant payload — making "phase + location" a single
//! atomic value rather than two fields the caller has to keep coherent.
//!
//! The transition gateway (`sim::transition`) accepts a `RiderState`,
//! ensuring every phase change carries its location data. Public API
//! surfaces continue to expose [`RiderPhase`] (the data-less-ish projection)
//! and the snapshot wire format remains byte-stable: see [`From`] impls.
//!
//! # Invariants
//!
//! - `RiderState::Waiting`, `Arrived`, `Abandoned`, `Resident` always carry
//!   a `stop: EntityId`.
//! - `RiderState::Boarding` and `Exiting` carry both an elevator and the
//!   stop the rider is transferring at.
//! - `RiderState::Riding` carries only an elevator (no stop while in transit).
//! - `RiderState::Walking` carries neither — riders walking between transfer
//!   stops are effectively "in transit on foot."
//!
//! These are unrepresentable invalid states by construction, replacing the
//! soft `Option<EntityId>` invariant on `Rider::current_stop`.

use serde::{Deserialize, Serialize};

use super::rider::{RiderPhase, RiderPhaseKind};
use crate::entity::EntityId;

/// Engine-internal lifecycle state for a rider.
///
/// See module docs for the relationship with [`RiderPhase`] and the
/// per-variant invariants.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[allow(dead_code)] // wired up by the transition gateway in a follow-up commit
pub enum RiderState {
    /// Waiting at a stop for an elevator.
    Waiting {
        /// The stop the rider is waiting at.
        stop: EntityId,
    },
    /// Boarding an elevator at a stop (transient, one tick).
    Boarding {
        /// The elevator being boarded.
        elevator: EntityId,
        /// The stop where boarding is happening.
        stop: EntityId,
    },
    /// Riding inside an elevator between stops.
    Riding {
        /// The elevator carrying the rider.
        elevator: EntityId,
    },
    /// Exiting an elevator at a stop (transient, one tick).
    Exiting {
        /// The elevator being exited.
        elevator: EntityId,
        /// The stop the rider is exiting at.
        stop: EntityId,
    },
    /// Walking between transfer stops.
    Walking,
    /// Reached final destination at a stop.
    Arrived {
        /// The stop where the rider arrived.
        stop: EntityId,
    },
    /// Gave up waiting at a stop.
    Abandoned {
        /// The stop where the rider abandoned the wait.
        stop: EntityId,
    },
    /// Parked at a stop, not seeking an elevator.
    Resident {
        /// The stop the rider is parked at.
        stop: EntityId,
    },
}

#[allow(dead_code)] // consumed by the transition gateway in a follow-up commit
impl RiderState {
    /// The stop this rider is currently *at*, if any.
    ///
    /// `Some(stop)` for `Waiting`, `Boarding`, `Exiting`, `Arrived`,
    /// `Abandoned`, `Resident`. `None` for `Riding` (in transit) and
    /// `Walking`.
    #[must_use]
    pub const fn at_stop(&self) -> Option<EntityId> {
        match *self {
            Self::Waiting { stop }
            | Self::Boarding { stop, .. }
            | Self::Exiting { stop, .. }
            | Self::Arrived { stop }
            | Self::Abandoned { stop }
            | Self::Resident { stop } => Some(stop),
            Self::Riding { .. } | Self::Walking => None,
        }
    }

    /// The elevator this rider is currently associated with, if any.
    ///
    /// `Some(elev)` for `Boarding`, `Riding`, `Exiting`. `None` for the
    /// at-stop and walking variants.
    #[must_use]
    pub const fn aboard(&self) -> Option<EntityId> {
        match *self {
            Self::Boarding { elevator, .. }
            | Self::Riding { elevator }
            | Self::Exiting { elevator, .. } => Some(elevator),
            _ => None,
        }
    }

    /// Data-less projection of this state.
    #[must_use]
    pub const fn kind(&self) -> RiderPhaseKind {
        match self {
            Self::Waiting { .. } => RiderPhaseKind::Waiting,
            Self::Boarding { .. } => RiderPhaseKind::Boarding,
            Self::Riding { .. } => RiderPhaseKind::Riding,
            Self::Exiting { .. } => RiderPhaseKind::Exiting,
            Self::Walking => RiderPhaseKind::Walking,
            Self::Arrived { .. } => RiderPhaseKind::Arrived,
            Self::Abandoned { .. } => RiderPhaseKind::Abandoned,
            Self::Resident { .. } => RiderPhaseKind::Resident,
        }
    }

    /// Public-facing phase view (drops the bundled stop, keeps elevator
    /// payload for the aboard variants).
    #[must_use]
    pub const fn as_phase(self) -> RiderPhase {
        match self {
            Self::Waiting { .. } => RiderPhase::Waiting,
            Self::Boarding { elevator, .. } => RiderPhase::Boarding(elevator),
            Self::Riding { elevator } => RiderPhase::Riding(elevator),
            Self::Exiting { elevator, .. } => RiderPhase::Exiting(elevator),
            Self::Walking => RiderPhase::Walking,
            Self::Arrived { .. } => RiderPhase::Arrived,
            Self::Abandoned { .. } => RiderPhase::Abandoned,
            Self::Resident { .. } => RiderPhase::Resident,
        }
    }

    /// Combine a public [`RiderPhase`] with the rider's `current_stop` to
    /// reconstruct the internal state.
    ///
    /// Returns `None` when the input is inconsistent — e.g. `Waiting` with
    /// no stop, or `Boarding` with no stop. The caller should treat such
    /// inputs as the "ghost rider" footgun and refuse to proceed.
    #[must_use]
    pub const fn from_phase(phase: RiderPhase, current_stop: Option<EntityId>) -> Option<Self> {
        match (phase, current_stop) {
            (RiderPhase::Waiting, Some(stop)) => Some(Self::Waiting { stop }),
            (RiderPhase::Boarding(elevator), Some(stop)) => Some(Self::Boarding { elevator, stop }),
            (RiderPhase::Riding(elevator), _) => Some(Self::Riding { elevator }),
            (RiderPhase::Exiting(elevator), Some(stop)) => Some(Self::Exiting { elevator, stop }),
            (RiderPhase::Walking, _) => Some(Self::Walking),
            (RiderPhase::Arrived, Some(stop)) => Some(Self::Arrived { stop }),
            (RiderPhase::Abandoned, Some(stop)) => Some(Self::Abandoned { stop }),
            (RiderPhase::Resident, Some(stop)) => Some(Self::Resident { stop }),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::world::World;

    /// Spawn three distinct `EntityId`s for stop/elevator/extra fixtures.
    fn ids() -> (EntityId, EntityId, EntityId) {
        let mut world = World::new();
        (world.spawn(), world.spawn(), world.spawn())
    }

    #[test]
    fn at_stop_returns_stop_for_at_stop_variants() {
        let (stop, elev, _) = ids();
        assert_eq!(RiderState::Waiting { stop }.at_stop(), Some(stop));
        assert_eq!(RiderState::Arrived { stop }.at_stop(), Some(stop));
        assert_eq!(RiderState::Abandoned { stop }.at_stop(), Some(stop));
        assert_eq!(RiderState::Resident { stop }.at_stop(), Some(stop));
        assert_eq!(
            RiderState::Boarding {
                elevator: elev,
                stop
            }
            .at_stop(),
            Some(stop)
        );
        assert_eq!(
            RiderState::Exiting {
                elevator: elev,
                stop
            }
            .at_stop(),
            Some(stop)
        );
    }

    #[test]
    fn at_stop_returns_none_for_in_transit_variants() {
        let (_, elev, _) = ids();
        assert_eq!(RiderState::Riding { elevator: elev }.at_stop(), None);
        assert_eq!(RiderState::Walking.at_stop(), None);
    }

    #[test]
    fn aboard_returns_elevator_for_aboard_variants() {
        let (stop, elev, _) = ids();
        assert_eq!(
            RiderState::Boarding {
                elevator: elev,
                stop
            }
            .aboard(),
            Some(elev)
        );
        assert_eq!(RiderState::Riding { elevator: elev }.aboard(), Some(elev));
        assert_eq!(
            RiderState::Exiting {
                elevator: elev,
                stop
            }
            .aboard(),
            Some(elev)
        );
        assert_eq!(RiderState::Waiting { stop }.aboard(), None);
        assert_eq!(RiderState::Walking.aboard(), None);
    }

    #[test]
    fn round_trip_through_phase_preserves_state() {
        let (stop, elev, _) = ids();
        let cases = [
            RiderState::Waiting { stop },
            RiderState::Boarding {
                elevator: elev,
                stop,
            },
            RiderState::Riding { elevator: elev },
            RiderState::Exiting {
                elevator: elev,
                stop,
            },
            RiderState::Walking,
            RiderState::Arrived { stop },
            RiderState::Abandoned { stop },
            RiderState::Resident { stop },
        ];
        for state in cases {
            let phase = state.as_phase();
            let stop_back = state.at_stop();
            let reconstructed = RiderState::from_phase(phase, stop_back).unwrap_or_else(|| {
                panic!("from_phase rejected legal pair: phase={phase:?}, stop={stop_back:?}")
            });
            assert_eq!(reconstructed, state, "round-trip mismatch for {state:?}");
        }
    }

    #[test]
    fn riderphase_kind_matches_state_kind() {
        // Sanity: the public RiderPhase::kind() and RiderState::kind() must
        // agree for every variant. Catches drift if either enum gains a
        // case without updating the other.
        let (stop, elev, _) = ids();
        let pairs: &[(RiderState, RiderPhase)] = &[
            (RiderState::Waiting { stop }, RiderPhase::Waiting),
            (
                RiderState::Boarding {
                    elevator: elev,
                    stop,
                },
                RiderPhase::Boarding(elev),
            ),
            (
                RiderState::Riding { elevator: elev },
                RiderPhase::Riding(elev),
            ),
            (
                RiderState::Exiting {
                    elevator: elev,
                    stop,
                },
                RiderPhase::Exiting(elev),
            ),
            (RiderState::Walking, RiderPhase::Walking),
            (RiderState::Arrived { stop }, RiderPhase::Arrived),
            (RiderState::Abandoned { stop }, RiderPhase::Abandoned),
            (RiderState::Resident { stop }, RiderPhase::Resident),
        ];
        for (state, phase) in pairs {
            assert_eq!(state.kind(), phase.kind(), "kind mismatch for {state:?}");
        }
    }

    #[test]
    fn from_phase_rejects_inconsistent_inputs() {
        let (_, elev, _) = ids();
        // Waiting without a stop — the "ghost rider" footgun.
        assert_eq!(RiderState::from_phase(RiderPhase::Waiting, None), None);
        assert_eq!(
            RiderState::from_phase(RiderPhase::Boarding(elev), None),
            None
        );
        assert_eq!(RiderState::from_phase(RiderPhase::Arrived, None), None);
    }

    #[test]
    fn riding_ignores_supplied_stop() {
        // A Riding rider in transit may have a stale current_stop from
        // before they boarded. We accept the phase regardless and produce
        // the canonical no-stop Riding state.
        let (stale_stop, elev, _) = ids();
        let s = RiderState::from_phase(RiderPhase::Riding(elev), Some(stale_stop)).unwrap();
        assert_eq!(s, RiderState::Riding { elevator: elev });
    }

    #[test]
    fn kind_matches_phase_kind() {
        let (stop, elev, _) = ids();
        let pairs: &[(RiderState, RiderPhaseKind)] = &[
            (RiderState::Waiting { stop }, RiderPhaseKind::Waiting),
            (
                RiderState::Boarding {
                    elevator: elev,
                    stop,
                },
                RiderPhaseKind::Boarding,
            ),
            (
                RiderState::Riding { elevator: elev },
                RiderPhaseKind::Riding,
            ),
            (RiderState::Walking, RiderPhaseKind::Walking),
            (RiderState::Arrived { stop }, RiderPhaseKind::Arrived),
            (RiderState::Abandoned { stop }, RiderPhaseKind::Abandoned),
            (RiderState::Resident { stop }, RiderPhaseKind::Resident),
        ];
        for (state, expected_kind) in pairs {
            assert_eq!(state.kind(), *expected_kind);
            assert_eq!(state.as_phase().kind(), *expected_kind);
        }
    }
}
