//! Nearest-car dispatch — assigns each call to the closest idle elevator.

use crate::components::Route;

use super::{DispatchStrategy, RankContext, pair_can_do_work};

/// Scores `(car, stop)` by absolute distance between the car and the stop.
///
/// Paired with the Hungarian assignment in the dispatch system, this
/// yields the globally minimum-total-distance matching across the group
/// — no two cars can be sent to the same hall call.
///
/// Two guards are applied on top of the raw distance:
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
        if !pair_is_useful(ctx) {
            return None;
        }
        Some((ctx.car_position - ctx.stop_position).abs())
    }
}

/// Decide whether assigning `ctx.car` to `ctx.stop` is on the path to
/// any aboard rider's destination. Combined with
/// [`pair_can_do_work`](super::pair_can_do_work), this keeps a car
/// carrying riders from being pulled backward by closer pickups.
fn pair_is_useful(ctx: &RankContext<'_>) -> bool {
    if !pair_can_do_work(ctx) {
        return false;
    }

    let Some(car) = ctx.world.elevator(ctx.car) else {
        return false;
    };
    // Exiting an aboard rider is always on-the-way for that rider.
    let can_exit_here = car
        .riders()
        .iter()
        .any(|&rid| ctx.world.route(rid).and_then(Route::current_destination) == Some(ctx.stop));
    if can_exit_here || car.riders().is_empty() {
        return true;
    }

    // Route-less aboard riders (game-managed manual riders) don't
    // publish a destination, so there's no committed path to protect.
    // Any pickup is trivially on-the-way — fall back to the raw
    // servability check. Otherwise we'd refuse every pickup the moment
    // the car carried its first manually-managed passenger.
    let has_routed_rider = car.riders().iter().any(|&rid| {
        ctx.world
            .route(rid)
            .and_then(Route::current_destination)
            .is_some()
    });
    if !has_routed_rider {
        return true;
    }

    // Pickups allowed only on the path to an aboard rider's destination.
    // Candidate at the car's position (to_cand = 0) trivially qualifies —
    // useful for same-floor boards.
    let to_cand = ctx.stop_position - ctx.car_position;
    car.riders().iter().any(|&rid| {
        let Some(dest) = ctx.world.route(rid).and_then(Route::current_destination) else {
            return false;
        };
        let Some(dest_pos) = ctx.world.stop_position(dest) else {
            return false;
        };
        let to_dest = dest_pos - ctx.car_position;
        to_dest * to_cand >= 0.0 && to_cand.abs() <= to_dest.abs()
    })
}
