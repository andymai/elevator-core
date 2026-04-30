//! Sole pathway for mutating a rider's lifecycle state.
//!
//! [`Simulation::transition_rider`] is the only legitimate way to change a
//! rider's `phase`, `current_stop`, or `board_tick` after the rider is alive.
//! It atomically updates these fields, the [`RiderIndex`] partitioning, and
//! validates the requested transition against a pragmatic legality matrix.
//!
//! Callers retain responsibility for emitting rider-lifecycle events: the
//! same `(from, to)` pair can correspond to different events depending on
//! context (e.g. a `Waiting → Abandoned` move could be `RiderAbandoned` from
//! patience expiry or part of a stop-removal cleanup), so the gateway leaves
//! that decision to the caller.
//!
//! # Why this exists
//!
//! Before the gateway, every transition site (lifecycle, world, dispatch,
//! systems) had to remember to: (a) flip `rider.phase`, (b) update
//! `rider.current_stop`, (c) keep `RiderIndex` in sync with the at-stop
//! buckets, and (d) maintain `board_tick`. Forgetting any one produced a
//! "ghost rider" — phase says one thing, the index says another. The
//! gateway concentrates these four concerns in one auditable place.

use super::Simulation;
use crate::components::RiderPhaseKind;
use crate::components::rider_state::RiderState;
use crate::entity::EntityId;
use crate::error::SimError;
use crate::rider_index::RiderIndex;
use crate::world::World;

impl Simulation {
    /// Transition a rider to a new lifecycle state, updating all dependent
    /// bookkeeping atomically.
    ///
    /// Sole legitimate pathway for mutating `Rider::phase`,
    /// `Rider::current_stop`, and `Rider::board_tick` after the rider is
    /// alive. See [`transition_rider`] for the full contract.
    ///
    /// # Errors
    ///
    /// - [`SimError::EntityNotFound`] if `id` is not a live rider.
    /// - [`SimError::IllegalTransition`] if the move is rejected by the
    ///   legality matrix.
    pub(crate) fn transition_rider(
        &mut self,
        id: EntityId,
        new_state: RiderState,
    ) -> Result<(), SimError> {
        transition_rider(
            &mut self.world,
            &mut self.rider_index,
            self.tick,
            id,
            new_state,
        )
    }
}

/// Free-function form of the transition gateway, callable from system
/// contexts (`systems/loading.rs`, `systems/advance_transient.rs`, etc.) that
/// hold separate `&mut World` and `&mut RiderIndex` borrows rather than the
/// full `&mut Simulation`.
///
/// On success the rider's four state fields and the `RiderIndex`
/// partitioning are guaranteed consistent. On error nothing is mutated.
///
/// # Errors
///
/// - [`SimError::EntityNotFound`] if `id` is not a live rider.
/// - [`SimError::IllegalTransition`] if moving from the rider's current
///   phase to `new_state` is rejected by [`is_legal_transition`].
pub(crate) fn transition_rider(
    world: &mut World,
    rider_index: &mut RiderIndex,
    tick: u64,
    id: EntityId,
    new_state: RiderState,
) -> Result<(), SimError> {
    // Snapshot old state into Copy locals so the immutable borrow on
    // `world` ends before we touch `rider_index` / `world.rider_mut`.
    let (old_phase, old_stop, was_aboard) = {
        let rider = world.rider(id).ok_or(SimError::EntityNotFound(id))?;
        (rider.phase, rider.current_stop, rider.phase.is_aboard())
    };

    let from_kind = old_phase.kind();
    let to_kind = new_state.kind();
    if !is_legal_transition(from_kind, to_kind) {
        return Err(SimError::IllegalTransition {
            rider: id,
            from: from_kind,
            to: to_kind,
        });
    }

    // Sync the rider_index: remove from the old at-stop bucket (if any),
    // insert into the new one (if any). When neither old nor new state
    // is indexed, this is a no-op.
    let old_bucket = indexed_bucket(from_kind).zip(old_stop);
    let new_bucket = indexed_bucket(to_kind).zip(new_state.at_stop());
    if old_bucket != new_bucket {
        if let Some((bucket, stop)) = old_bucket {
            bucket.remove_from(rider_index, stop, id);
        }
        if let Some((bucket, stop)) = new_bucket {
            bucket.insert_into(rider_index, stop, id);
        }
    }

    // Apply the state to the rider record.
    let now_aboard = matches!(
        to_kind,
        RiderPhaseKind::Boarding | RiderPhaseKind::Riding | RiderPhaseKind::Exiting
    );
    if let Some(r) = world.rider_mut(id) {
        r.phase = new_state.as_phase();
        r.current_stop = new_state.at_stop();
        if !was_aboard && now_aboard {
            r.board_tick = Some(tick);
        } else if was_aboard && !now_aboard {
            r.board_tick = None;
        }
    }

    Ok(())
}

/// Index buckets exposed by [`RiderIndex`].
///
/// The index only partitions three phases (`Waiting`, `Resident`, `Abandoned`);
/// the gateway maps phase kinds to buckets via [`indexed_bucket`] and
/// dispatches insert/remove calls through this enum to keep the gateway free
/// of per-bucket match arms.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum IndexBucket {
    /// The `Waiting` partition of `RiderIndex`.
    Waiting,
    /// The `Resident` partition of `RiderIndex`.
    Resident,
    /// The `Abandoned` partition of `RiderIndex`.
    Abandoned,
}

impl IndexBucket {
    /// Add `rider` to this bucket at `stop`.
    fn insert_into(self, idx: &mut RiderIndex, stop: EntityId, rider: EntityId) {
        match self {
            Self::Waiting => idx.insert_waiting(stop, rider),
            Self::Resident => idx.insert_resident(stop, rider),
            Self::Abandoned => idx.insert_abandoned(stop, rider),
        }
    }

    /// Remove `rider` from this bucket at `stop`.
    fn remove_from(self, idx: &mut RiderIndex, stop: EntityId, rider: EntityId) {
        match self {
            Self::Waiting => idx.remove_waiting(stop, rider),
            Self::Resident => idx.remove_resident(stop, rider),
            Self::Abandoned => idx.remove_abandoned(stop, rider),
        }
    }
}

/// Map a phase kind to its index bucket, or `None` for unindexed phases.
const fn indexed_bucket(kind: RiderPhaseKind) -> Option<IndexBucket> {
    match kind {
        RiderPhaseKind::Waiting => Some(IndexBucket::Waiting),
        RiderPhaseKind::Resident => Some(IndexBucket::Resident),
        RiderPhaseKind::Abandoned => Some(IndexBucket::Abandoned),
        _ => None,
    }
}

/// Pragmatic transition legality matrix.
///
/// Rejects only the transitions that would skip a required intermediate
/// state and produce double-counting or stale references in the index:
///
/// - `Resident` / `Arrived` / `Abandoned` → `Boarding`/`Riding`/`Exiting`
///   (cannot board directly from a parked or terminal state — must reroute
///   to `Waiting` first).
/// - `Walking` → `Boarding`/`Riding`/`Exiting` (must reach a stop first).
/// - `Waiting` → `Riding`/`Exiting` (must `Boarding` first).
/// - `Boarding` → `Exiting` (must `Riding` first).
///
/// Everything else is allowed, including rescue transitions
/// (`Boarding`/`Riding`/`Exiting` → `Waiting` for elevator-despawn ejection),
/// forward progress, terminal moves, and same-state self-transitions.
const fn is_legal_transition(from: RiderPhaseKind, to: RiderPhaseKind) -> bool {
    use RiderPhaseKind::{
        Abandoned, Arrived, Boarding, Exiting, Resident, Riding, Waiting, Walking,
    };
    // Read this as: an arrow at column "to" is rejected from any source on
    // the row to its left.
    //
    // ```
    //                 to=Boarding   to=Riding              to=Exiting
    // Resident             ✗            ✗                       ✗
    // Arrived              ✗            ✗                       ✗
    // Abandoned            ✗            ✗                       ✗
    // Walking              ✗            ✗                       ✗
    // Waiting              -            ✗                       ✗
    // Boarding             -            -                       ✗
    // ```
    !matches!(
        (from, to),
        (Resident | Arrived | Abandoned | Walking, Boarding)
            | (Resident | Arrived | Abandoned | Walking | Waiting, Riding)
            | (
                Resident | Arrived | Abandoned | Walking | Waiting | Boarding,
                Exiting
            )
    )
}

#[cfg(test)]
mod tests {
    //! Gateway behaviour and legality-matrix tests.
    //!
    //! Tests that exercise the gateway through real `Simulation` flows live
    //! in the integration-style test files (`api_surface_tests.rs`,
    //! `lifecycle_tests.rs`); these unit tests cover the pure legality
    //! helper and IndexBucket dispatch.

    use super::*;
    use crate::components::RiderPhaseKind::*;

    #[test]
    fn legality_rejects_resident_to_aboard() {
        assert!(!is_legal_transition(Resident, Boarding));
        assert!(!is_legal_transition(Resident, Riding));
        assert!(!is_legal_transition(Resident, Exiting));
    }

    #[test]
    fn legality_rejects_terminal_to_aboard() {
        for from in [Arrived, Abandoned] {
            for to in [Boarding, Riding, Exiting] {
                assert!(
                    !is_legal_transition(from, to),
                    "{from:?} -> {to:?} should be illegal"
                );
            }
        }
    }

    #[test]
    fn legality_rejects_walking_to_aboard() {
        assert!(!is_legal_transition(Walking, Boarding));
        assert!(!is_legal_transition(Walking, Riding));
        assert!(!is_legal_transition(Walking, Exiting));
    }

    #[test]
    fn legality_rejects_skipping_boarding_or_riding() {
        assert!(!is_legal_transition(Waiting, Riding));
        assert!(!is_legal_transition(Waiting, Exiting));
        assert!(!is_legal_transition(Boarding, Exiting));
    }

    #[test]
    fn legality_allows_rescue_back_to_waiting() {
        // The elevator-despawn rescue path: an aboard rider needs to be
        // resettable to Waiting. This is the linchpin for fixing the
        // world.rs:204 footgun.
        assert!(is_legal_transition(Boarding, Waiting));
        assert!(is_legal_transition(Riding, Waiting));
        assert!(is_legal_transition(Exiting, Waiting));
    }

    #[test]
    fn legality_allows_settle_paths() {
        // Arrived -> Resident and Abandoned -> Resident are the
        // settle_rider() flows.
        assert!(is_legal_transition(Arrived, Resident));
        assert!(is_legal_transition(Abandoned, Resident));
        // Resident -> Waiting is reroute_rider.
        assert!(is_legal_transition(Resident, Waiting));
    }

    #[test]
    fn legality_allows_forward_progress() {
        assert!(is_legal_transition(Waiting, Boarding));
        assert!(is_legal_transition(Boarding, Riding));
        assert!(is_legal_transition(Riding, Exiting));
        assert!(is_legal_transition(Exiting, Arrived));
    }

    #[test]
    fn legality_allows_patience_abandonment() {
        // Waiting -> Abandoned via patience timeout.
        assert!(is_legal_transition(Waiting, Abandoned));
    }

    #[test]
    fn indexed_bucket_covers_only_three_phases() {
        assert!(indexed_bucket(Waiting).is_some());
        assert!(indexed_bucket(Resident).is_some());
        assert!(indexed_bucket(Abandoned).is_some());
        assert!(indexed_bucket(Boarding).is_none());
        assert!(indexed_bucket(Riding).is_none());
        assert!(indexed_bucket(Exiting).is_none());
        assert!(indexed_bucket(Arrived).is_none());
        assert!(indexed_bucket(Walking).is_none());
    }
}
