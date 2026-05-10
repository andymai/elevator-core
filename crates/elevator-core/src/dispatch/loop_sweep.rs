//! `LoopSweep` — call-driven dispatch for [`LineKind::Loop`] groups.
//!
//! On a one-way closed loop, "dispatch" reduces to a label: the
//! `systems::dispatch` phase already kickstarts an `Idle` Loop car onto
//! its forward-next stop and excludes Loop cars from the Hungarian idle
//! pool, and the door FSM hands the car straight from `DoorClosing`
//! back to `MovingToStop(next)` without ever passing through
//! `Stopped`. The loading phase boards every eligible rider regardless
//! of the linear up/down lamps, so a Loop car serves every waiter at
//! every served stop on every lap.
//!
//! That continuous-patrol behaviour is the LoopSweep contract from
//! `docs/plans/loop-lines-v1.md`. This struct exists so that:
//!
//! - Loop groups have a typed default that round-trips through
//!   snapshots and config files via [`BuiltinStrategy::LoopSweep`]
//!   instead of silently inheriting [`BuiltinStrategy::Scan`] — which
//!   would replay any restored sim with the wrong identity.
//! - The construction-time validation can name the only strategy a
//!   Loop group is allowed to carry, rejecting Linear-only strategies
//!   loud rather than silently misbehaving.
//!
//! All [`DispatchStrategy`] hooks fall back to defaults: Loop cars
//! never reach the Hungarian, so [`rank`](DispatchStrategy::rank) is
//! unreachable in practice, and there is no per-car or per-pass scratch
//! that needs to round-trip — the whole struct is unit-shaped.
//!
//! Future Loop-aware behaviour (skip-empty-stops, headway-driven hold
//! recovery) will land in successors (`LoopSchedule`).
//!
//! [`LineKind::Loop`]: crate::components::LineKind::Loop

#![cfg(feature = "loop_lines")]

use super::{BuiltinStrategy, DispatchStrategy, RankContext};

/// Dispatch strategy for [`LineKind::Loop`] groups.
///
/// See the module-level documentation for the full contract. The struct
/// holds no per-pass state — Loop cars patrol forward on their own and
/// never enter the Hungarian assignment — so it is a unit struct. The
/// `Serialize`/`Deserialize` derives keep it round-trip-compatible with
/// the snapshot identity layer for symmetry with the other built-ins.
///
/// [`LineKind::Loop`]: crate::components::LineKind::Loop
#[derive(Debug, Default, Clone, Copy, serde::Serialize, serde::Deserialize)]
pub struct LoopSweepDispatch;

impl LoopSweepDispatch {
    /// Construct a fresh `LoopSweepDispatch`. Equivalent to
    /// `LoopSweepDispatch::default()`; spelled out so call sites read
    /// the same as the other built-ins (`ScanDispatch::new()`, etc.).
    #[must_use]
    pub const fn new() -> Self {
        Self
    }
}

impl DispatchStrategy for LoopSweepDispatch {
    fn rank(&self, _ctx: &RankContext<'_>) -> Option<f64> {
        // Loop cars are excluded from the Hungarian idle pool in
        // `systems::dispatch::run`, so this method is unreachable in
        // practice. Returning `None` keeps the contract conservative
        // (`Some(finite)` is required and we have no meaningful cost
        // to report) without panicking, in case a future caller pushes
        // a Loop car into the matching by mistake.
        None
    }

    fn builtin_id(&self) -> Option<BuiltinStrategy> {
        Some(BuiltinStrategy::LoopSweep)
    }
}
