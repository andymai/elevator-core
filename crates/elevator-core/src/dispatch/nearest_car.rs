//! Nearest-car dispatch — assigns each call to the closest idle elevator.

use super::{DispatchStrategy, RankContext};

/// Scores `(car, stop)` by absolute distance between the car and the stop.
///
/// Paired with the Hungarian assignment in the dispatch system, this
/// yields the globally minimum-total-distance matching across the group
/// — no two cars can be sent to the same hall call.
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
        Some((ctx.car_position - ctx.stop_position).abs())
    }
}
