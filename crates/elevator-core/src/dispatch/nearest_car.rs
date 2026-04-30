//! Nearest-car dispatch — assigns each call to the closest idle elevator.

use super::{DispatchStrategy, RankContext, pair_is_useful};

/// Scores `(car, stop)` by absolute distance between the car and the stop.
///
/// Paired with the Hungarian assignment in the dispatch system, this
/// yields the globally minimum-total-distance matching across the group
/// — no two cars can be sent to the same hall call.
///
/// Two guards are applied on top of the raw distance, both via the
/// shared [`pair_is_useful`] predicate:
///
/// 1. The `(car, stop)` pair must be serviceable — at least one aboard
///    rider can exit, or at least one waiting rider can fit. A full car
///    at a pickup stop it cannot serve otherwise self-assigns at zero
///    cost (doors cycle open → reject → close forever).
/// 2. A car carrying riders refuses pickups that would pull it backward
///    (off the path to every aboard rider's destination). Without this,
///    a stream of closer-destination boarders can indefinitely preempt
///    a farther aboard rider's delivery — the reported "never reaches
///    the passenger's desired stop" loop.
pub struct NearestCarDispatch;

impl NearestCarDispatch {
    /// Create a new `NearestCarDispatch`.
    #[must_use]
    pub const fn new() -> Self {
        Self
    }
}

impl Default for NearestCarDispatch {
    fn default() -> Self {
        Self::new()
    }
}

impl DispatchStrategy for NearestCarDispatch {
    fn rank(&mut self, ctx: &RankContext<'_>) -> Option<f64> {
        if !pair_is_useful(ctx, true) {
            return None;
        }
        Some((ctx.car_position - ctx.stop_position).abs())
    }

    fn builtin_id(&self) -> Option<super::BuiltinStrategy> {
        Some(super::BuiltinStrategy::NearestCar)
    }
}
