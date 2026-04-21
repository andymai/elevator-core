//! Relative System Response (RSR) dispatch — a composite additive
//! cost stack.
//!
//! Inspired by the Otis patent lineage (Bittar US5024295A, US5146053A)
//! and the Barney–dos Santos CGC framework. Unlike those proprietary
//! systems, this implementation is an educational model, not a
//! faithful reproduction of any vendor's scoring.
//!
//! Shape: `rank = eta_weight · travel_time + Σ penalties − Σ bonuses`.
//! All terms are additive scalars, so they compose cleanly with the
//! library's Kuhn–Munkres assignment. Defaults are tuned so the stack
//! reduces to the nearest-car baseline when every weight is zero.
//!
//! What this deliberately leaves out: online weight tuning, fuzzy
//! inference, and stickiness state. Those belong above the trait, not
//! inside a strategy.

use crate::components::{CarCall, ElevatorPhase};
use crate::traffic_detector::{TrafficDetector, TrafficMode};

use super::{DispatchStrategy, RankContext, pair_can_do_work};

/// Look up the current [`TrafficMode`] from `ctx.world` and return the
/// scaling factor to apply to the wrong-direction penalty.
///
/// Returns `multiplier` when the mode is `UpPeak` or `DownPeak`, else
/// `1.0`. Also returns `1.0` when the detector resource is missing —
/// keeping the strategy functional in tests that skip `Simulation::new`.
fn peak_scaling(ctx: &RankContext<'_>, multiplier: f64) -> f64 {
    let mode = ctx
        .world
        .resource::<TrafficDetector>()
        .map_or(TrafficMode::Idle, TrafficDetector::current_mode);
    match mode {
        TrafficMode::UpPeak | TrafficMode::DownPeak => multiplier,
        _ => 1.0,
    }
}

/// Additive RSR-style cost stack. Lower scores win the Hungarian
/// assignment.
///
/// See module docs for the cost shape. All weights default to `0.0`
/// except `eta_weight` (1.0), giving a baseline that mirrors
/// [`NearestCarDispatch`](super::NearestCarDispatch) until terms are
/// opted in.
///
/// # Weight invariants
///
/// Every weight field must be **finite and non-negative**. The
/// `with_*` builder methods enforce this with `assert!`; direct field
/// mutation bypasses the check and is a caller responsibility. A `NaN` weight propagates through the multiply-add
/// chain and silently collapses every pair's cost to zero (Rust's
/// `NaN.max(0.0) == 0.0`), producing an arbitrary but type-valid
/// assignment from the Hungarian solver — a hard bug to diagnose.
pub struct RsrDispatch {
    /// Weight on `travel_time = distance / max_speed` (seconds).
    /// Default `1.0`; raising it shifts the blend toward travel time.
    pub eta_weight: f64,
    /// Constant added when the candidate stop lies opposite the
    /// car's committed travel direction.
    ///
    /// Default `0.0`; the Otis RSR lineage uses a large value so any
    /// right-direction candidate outranks any wrong-direction one.
    /// Ignored for cars in [`ElevatorPhase::Idle`] or stopped phases,
    /// since an idle car has no committed direction to be opposite to.
    pub wrong_direction_penalty: f64,
    /// Bonus subtracted when the candidate stop is already a car-call
    /// inside this car.
    ///
    /// Merges the new pickup with an existing dropoff instead of
    /// spawning an unrelated trip. Default `0.0`. Read from
    /// [`DispatchManifest::car_calls_for`](super::DispatchManifest::car_calls_for).
    pub coincident_car_call_bonus: f64,
    /// Coefficient on a smooth load-fraction penalty
    /// (`load_penalty_coeff · load_ratio`).
    ///
    /// Fires for partially loaded cars below the `bypass_load_*_pct`
    /// threshold enforced by [`pair_can_do_work`]; lets you prefer
    /// emptier cars for new pickups without an on/off cliff.
    /// Default `0.0`.
    pub load_penalty_coeff: f64,
    /// Multiplier applied to `wrong_direction_penalty` when the
    /// [`TrafficDetector`] classifies the current tick as
    /// [`TrafficMode::UpPeak`] or [`TrafficMode::DownPeak`].
    ///
    /// Default `1.0` (mode-agnostic — behaviour identical to pre-peak
    /// tuning). Raising it strengthens directional commitment during
    /// peaks where a car carrying a lobby-bound load shouldn't be
    /// pulled backwards to grab a new pickup. Off-peak periods keep
    /// the unscaled penalty, leaving inter-floor assignments free
    /// to reverse cheaply.
    ///
    /// Silently reduces to `1.0` when no `TrafficDetector` resource
    /// is installed — tests and custom sims that bypass the auto-install
    /// stay unaffected.
    pub peak_direction_multiplier: f64,
}

impl RsrDispatch {
    /// Create a new `RsrDispatch` with the baseline weights
    /// (`eta_weight = 1.0`, all penalties/bonuses disabled).
    #[must_use]
    pub const fn new() -> Self {
        Self {
            eta_weight: 1.0,
            wrong_direction_penalty: 0.0,
            coincident_car_call_bonus: 0.0,
            load_penalty_coeff: 0.0,
            peak_direction_multiplier: 1.0,
        }
    }

    /// Set the wrong-direction penalty.
    ///
    /// # Panics
    /// Panics on non-finite or negative weights — a negative penalty
    /// would invert the direction ordering, silently preferring
    /// wrong-direction candidates.
    #[must_use]
    pub fn with_wrong_direction_penalty(mut self, weight: f64) -> Self {
        assert!(
            weight.is_finite() && weight >= 0.0,
            "wrong_direction_penalty must be finite and non-negative, got {weight}"
        );
        self.wrong_direction_penalty = weight;
        self
    }

    /// Set the coincident-car-call bonus.
    ///
    /// # Panics
    /// Panics on non-finite or negative weights — the bonus is
    /// subtracted, so a negative value would become a penalty.
    #[must_use]
    pub fn with_coincident_car_call_bonus(mut self, weight: f64) -> Self {
        assert!(
            weight.is_finite() && weight >= 0.0,
            "coincident_car_call_bonus must be finite and non-negative, got {weight}"
        );
        self.coincident_car_call_bonus = weight;
        self
    }

    /// Set the load-penalty coefficient.
    ///
    /// # Panics
    /// Panics on non-finite or negative weights.
    #[must_use]
    pub fn with_load_penalty_coeff(mut self, weight: f64) -> Self {
        assert!(
            weight.is_finite() && weight >= 0.0,
            "load_penalty_coeff must be finite and non-negative, got {weight}"
        );
        self.load_penalty_coeff = weight;
        self
    }

    /// Set the ETA weight.
    ///
    /// # Panics
    /// Panics on non-finite or negative weights. Zero is allowed and
    /// reduces the strategy to penalty/bonus tiebreaking alone.
    #[must_use]
    pub fn with_eta_weight(mut self, weight: f64) -> Self {
        assert!(
            weight.is_finite() && weight >= 0.0,
            "eta_weight must be finite and non-negative, got {weight}"
        );
        self.eta_weight = weight;
        self
    }

    /// Set the peak-direction multiplier.
    ///
    /// # Panics
    /// Panics on non-finite or sub-1.0 values. A multiplier below `1.0`
    /// would *weaken* the direction penalty during peaks (the opposite
    /// of the intent) — explicitly disallowed so a typo doesn't silently
    /// invert the tuning.
    #[must_use]
    pub fn with_peak_direction_multiplier(mut self, factor: f64) -> Self {
        assert!(
            factor.is_finite() && factor >= 1.0,
            "peak_direction_multiplier must be finite and ≥ 1.0, got {factor}"
        );
        self.peak_direction_multiplier = factor;
        self
    }
}

impl Default for RsrDispatch {
    fn default() -> Self {
        Self::new()
    }
}

impl DispatchStrategy for RsrDispatch {
    fn rank(&mut self, ctx: &RankContext<'_>) -> Option<f64> {
        if !pair_can_do_work(ctx) {
            return None;
        }
        let car = ctx.world.elevator(ctx.car)?;

        // ETA — travel time to the candidate stop.
        let distance = (ctx.car_position - ctx.stop_position).abs();
        let max_speed = car.max_speed.value();
        if max_speed <= 0.0 {
            return None;
        }
        let travel_time = distance / max_speed;
        let mut cost = self.eta_weight * travel_time;

        // Wrong-direction penalty. Only applies when the car has a
        // committed direction (not Idle / Stopped) — an idle car can
        // accept any candidate without "reversing" anything.
        if self.wrong_direction_penalty > 0.0
            && let Some(target) = car.phase.moving_target()
            && let Some(target_pos) = ctx.world.stop_position(target)
        {
            let car_going_up = target_pos > ctx.car_position;
            let car_going_down = target_pos < ctx.car_position;
            let cand_above = ctx.stop_position > ctx.car_position;
            let cand_below = ctx.stop_position < ctx.car_position;
            if (car_going_up && cand_below) || (car_going_down && cand_above) {
                // During up-peak/down-peak the directional invariant
                // is load-bearing (a committed car shouldn't reverse
                // to grab a new pickup), so scale the penalty up.
                // Off-peak, the base value still rules — inter-floor
                // traffic wants cheap reversals.
                let scaled = self.wrong_direction_penalty
                    * peak_scaling(ctx, self.peak_direction_multiplier);
                cost += scaled;
            }
        }

        // Coincident-car-call bonus — the candidate stop is already a
        // committed dropoff for this car.
        if self.coincident_car_call_bonus > 0.0
            && ctx
                .manifest
                .car_calls_for(ctx.car)
                .iter()
                .any(|c: &CarCall| c.floor == ctx.stop)
        {
            cost -= self.coincident_car_call_bonus;
        }

        // Smooth load-fraction penalty. `pair_can_do_work` has already
        // filtered over-capacity and bypass-threshold cases; this term
        // shapes preference among the survivors so emptier cars win
        // pickups when all else is equal. Idle cars contribute zero.
        if self.load_penalty_coeff > 0.0 && car.phase() != ElevatorPhase::Idle {
            let capacity = car.weight_capacity().value();
            if capacity > 0.0 {
                let load_ratio = (car.current_load().value() / capacity).clamp(0.0, 1.0);
                cost += self.load_penalty_coeff * load_ratio;
            }
        }

        let cost = cost.max(0.0);
        if cost.is_finite() { Some(cost) } else { None }
    }

    fn builtin_id(&self) -> Option<super::BuiltinStrategy> {
        Some(super::BuiltinStrategy::Rsr)
    }
}
