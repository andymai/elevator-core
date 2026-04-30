//! Internal lifecycle phase for riders, with location data bundled into
//! variants.
//!
//! [`InternalRiderPhase`] is the engine's source of truth for "where a rider
//! is and what they're doing." It mirrors the public [`RiderPhase`] enum but
//! lifts the rider's `current_stop` (and the elevator they're aboard, where
//! applicable) into the variant payload — making "phase + location" a single
//! atomic value rather than two fields the caller has to keep coherent.
//!
//! The transition gateway (`sim::transition`) accepts an
//! [`InternalRiderPhase`], ensuring every phase change carries its location
//! data. Public API surfaces continue to expose [`RiderPhase`] (the
//! data-less-ish projection); the snapshot wire format remains byte-stable
//! by serializing through `RiderPhase + Option<EntityId> current_stop` and
//! reconstructing internally via [`InternalRiderPhase::from_phase`].
//!
//! # Invariants
//!
//! - `InternalRiderPhase::Waiting`, `Arrived`, `Abandoned`, `Resident` always
//!   carry a `stop: EntityId`.
//! - `InternalRiderPhase::Boarding` and `Exiting` carry both an elevator and
//!   the stop the rider is transferring at.
//! - `InternalRiderPhase::Riding` carries only an elevator (no stop while in
//!   transit).
//! - `InternalRiderPhase::Walking` carries neither — riders walking between
//!   transfer stops are effectively "in transit on foot."
//!
//! These are unrepresentable invalid states by construction, replacing the
//! soft `Option<EntityId>` invariant on `Rider::current_stop`.

use serde::{Deserialize, Serialize};

use super::rider::{RiderPhase, RiderPhaseKind};
use crate::entity::EntityId;

/// Engine-internal lifecycle phase for a rider.
///
/// See module docs for the relationship with [`RiderPhase`] and the
/// per-variant invariants. Named `InternalRiderPhase` (rather than
/// `RiderState`) to follow the codebase's `*Phase` naming convention
/// documented in `CLAUDE.md`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum InternalRiderPhase {
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

impl InternalRiderPhase {
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
    #[allow(dead_code)] // exposed for gateway helpers; only used by tests today
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
    #[allow(dead_code)] // exposed for snapshot/restore reconstruction; tests cover today
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
        assert_eq!(InternalRiderPhase::Waiting { stop }.at_stop(), Some(stop));
        assert_eq!(InternalRiderPhase::Arrived { stop }.at_stop(), Some(stop));
        assert_eq!(InternalRiderPhase::Abandoned { stop }.at_stop(), Some(stop));
        assert_eq!(InternalRiderPhase::Resident { stop }.at_stop(), Some(stop));
        assert_eq!(
            InternalRiderPhase::Boarding {
                elevator: elev,
                stop
            }
            .at_stop(),
            Some(stop)
        );
        assert_eq!(
            InternalRiderPhase::Exiting {
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
        assert_eq!(
            InternalRiderPhase::Riding { elevator: elev }.at_stop(),
            None
        );
        assert_eq!(InternalRiderPhase::Walking.at_stop(), None);
    }

    #[test]
    fn aboard_returns_elevator_for_aboard_variants() {
        let (stop, elev, _) = ids();
        assert_eq!(
            InternalRiderPhase::Boarding {
                elevator: elev,
                stop
            }
            .aboard(),
            Some(elev)
        );
        assert_eq!(
            InternalRiderPhase::Riding { elevator: elev }.aboard(),
            Some(elev)
        );
        assert_eq!(
            InternalRiderPhase::Exiting {
                elevator: elev,
                stop
            }
            .aboard(),
            Some(elev)
        );
        assert_eq!(InternalRiderPhase::Waiting { stop }.aboard(), None);
        assert_eq!(InternalRiderPhase::Walking.aboard(), None);
    }

    #[test]
    fn round_trip_through_phase_preserves_state() {
        let (stop, elev, _) = ids();
        let cases = [
            InternalRiderPhase::Waiting { stop },
            InternalRiderPhase::Boarding {
                elevator: elev,
                stop,
            },
            InternalRiderPhase::Riding { elevator: elev },
            InternalRiderPhase::Exiting {
                elevator: elev,
                stop,
            },
            InternalRiderPhase::Walking,
            InternalRiderPhase::Arrived { stop },
            InternalRiderPhase::Abandoned { stop },
            InternalRiderPhase::Resident { stop },
        ];
        for state in cases {
            let phase = state.as_phase();
            let stop_back = state.at_stop();
            // Compare against `Some(state)` so a `None` result fails the
            // assertion without needing `unwrap()` or `panic!` (both of
            // which are forbidden by the workspace clippy gate).
            assert_eq!(
                InternalRiderPhase::from_phase(phase, stop_back),
                Some(state),
                "round-trip mismatch for {state:?} (phase={phase:?}, stop={stop_back:?})"
            );
        }
    }

    #[test]
    fn riderphase_kind_matches_state_kind() {
        // Sanity: the public RiderPhase::kind() and InternalRiderPhase::kind() must
        // agree for every variant. Catches drift if either enum gains a
        // case without updating the other.
        let (stop, elev, _) = ids();
        let pairs: &[(InternalRiderPhase, RiderPhase)] = &[
            (InternalRiderPhase::Waiting { stop }, RiderPhase::Waiting),
            (
                InternalRiderPhase::Boarding {
                    elevator: elev,
                    stop,
                },
                RiderPhase::Boarding(elev),
            ),
            (
                InternalRiderPhase::Riding { elevator: elev },
                RiderPhase::Riding(elev),
            ),
            (
                InternalRiderPhase::Exiting {
                    elevator: elev,
                    stop,
                },
                RiderPhase::Exiting(elev),
            ),
            (InternalRiderPhase::Walking, RiderPhase::Walking),
            (InternalRiderPhase::Arrived { stop }, RiderPhase::Arrived),
            (
                InternalRiderPhase::Abandoned { stop },
                RiderPhase::Abandoned,
            ),
            (InternalRiderPhase::Resident { stop }, RiderPhase::Resident),
        ];
        for (state, phase) in pairs {
            assert_eq!(state.kind(), phase.kind(), "kind mismatch for {state:?}");
        }
    }

    #[test]
    fn from_phase_rejects_inconsistent_inputs() {
        let (_, elev, _) = ids();
        // Waiting without a stop — the "ghost rider" footgun.
        assert_eq!(
            InternalRiderPhase::from_phase(RiderPhase::Waiting, None),
            None
        );
        assert_eq!(
            InternalRiderPhase::from_phase(RiderPhase::Boarding(elev), None),
            None
        );
        assert_eq!(
            InternalRiderPhase::from_phase(RiderPhase::Arrived, None),
            None
        );
    }

    #[test]
    fn riding_ignores_supplied_stop() {
        // A Riding rider in transit may have a stale current_stop from
        // before they boarded. We accept the phase regardless and produce
        // the canonical no-stop Riding state.
        let (stale_stop, elev, _) = ids();
        assert_eq!(
            InternalRiderPhase::from_phase(RiderPhase::Riding(elev), Some(stale_stop)),
            Some(InternalRiderPhase::Riding { elevator: elev }),
        );
    }

    #[test]
    fn kind_matches_phase_kind() {
        let (stop, elev, _) = ids();
        let pairs: &[(InternalRiderPhase, RiderPhaseKind)] = &[
            (
                InternalRiderPhase::Waiting { stop },
                RiderPhaseKind::Waiting,
            ),
            (
                InternalRiderPhase::Boarding {
                    elevator: elev,
                    stop,
                },
                RiderPhaseKind::Boarding,
            ),
            (
                InternalRiderPhase::Riding { elevator: elev },
                RiderPhaseKind::Riding,
            ),
            (
                InternalRiderPhase::Exiting {
                    elevator: elev,
                    stop,
                },
                RiderPhaseKind::Exiting,
            ),
            (InternalRiderPhase::Walking, RiderPhaseKind::Walking),
            (
                InternalRiderPhase::Arrived { stop },
                RiderPhaseKind::Arrived,
            ),
            (
                InternalRiderPhase::Abandoned { stop },
                RiderPhaseKind::Abandoned,
            ),
            (
                InternalRiderPhase::Resident { stop },
                RiderPhaseKind::Resident,
            ),
        ];
        for (state, expected_kind) in pairs {
            assert_eq!(state.kind(), *expected_kind);
            assert_eq!(state.as_phase().kind(), *expected_kind);
        }
    }
}
