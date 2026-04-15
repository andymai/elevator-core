//! Nearest-car dispatch — assigns each call to the closest idle elevator.

use crate::entity::EntityId;
use crate::world::World;

use super::{DispatchManifest, DispatchStrategy, ElevatorGroup};

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
    fn rank(
        &mut self,
        _car: EntityId,
        car_position: f64,
        _stop: EntityId,
        stop_position: f64,
        _group: &ElevatorGroup,
        _manifest: &DispatchManifest,
        _world: &World,
    ) -> Option<f64> {
        Some((car_position - stop_position).abs())
    }
}
