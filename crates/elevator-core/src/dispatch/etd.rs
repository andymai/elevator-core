//! Estimated Time to Destination (ETD) dispatch algorithm.
//!
//! The per-call cost-minimization approach is drawn from Barney, G. C. &
//! dos Santos, S. M., *Elevator Traffic Analysis, Design and Control* (2nd
//! ed., 1985). Commercial controllers (Otis Elevonic, KONE Polaris, etc.)
//! use variants of the same idea; this implementation is a simplified
//! educational model, not a faithful reproduction of any vendor's system.

use smallvec::SmallVec;

use crate::components::{ElevatorPhase, Route};
use crate::entity::EntityId;
use crate::world::World;

use super::{DispatchManifest, DispatchStrategy, ElevatorGroup, RankContext, pair_can_do_work};

/// Estimated Time to Destination (ETD) dispatch algorithm.
///
/// For each `(car, stop)` pair the rank is a cost estimate combining
/// travel time, delay imposed on riders already aboard, door-overhead
/// for intervening stops, and a small bonus for cars already heading
/// toward the stop. The dispatch system runs an optimal assignment
/// across all pairs so the globally best matching is chosen.
pub struct EtdDispatch {
    /// Weight for travel time to reach the calling stop.
    pub wait_weight: f64,
    /// Weight for delay imposed on existing riders.
    pub delay_weight: f64,
    /// Weight for door open/close overhead at intermediate stops.
    pub door_weight: f64,
    /// Weight for the squared-wait "group-time" fairness bonus. Each
    /// candidate stop's cost is reduced by this weight times the sum
    /// of `wait_ticks²` across waiting riders at the stop, so stops
    /// hosting older calls win ties. Defaults to `0.0` (no bias);
    /// positive values damp the long-wait tail (Aalto EJOR 2016
    /// group-time assignment model).
    pub wait_squared_weight: f64,
    /// Weight for the linear waiting-age fairness term. Each candidate
    /// stop's cost is reduced by this weight times the sum of
    /// `wait_ticks` across waiting riders at the stop, so stops hosting
    /// older calls win ties without the quadratic blow-up of
    /// [`wait_squared_weight`](Self::wait_squared_weight). Defaults to
    /// `0.0` (no bias); positive values implement the linear
    /// collective-group-control fairness term from Lim 1983 /
    /// Barney–dos Santos 1985 CGC.
    ///
    /// Composes additively with `wait_squared_weight`: users wanting
    /// the full CGC shape can set both (`k·Σw + λ·Σw²`).
    pub age_linear_weight: f64,
    /// Positions of every demanded stop in the group, cached by
    /// [`DispatchStrategy::pre_dispatch`] so `rank` avoids rebuilding the
    /// list for every `(car, stop)` pair.
    pending_positions: SmallVec<[f64; 16]>,
}

impl EtdDispatch {
    /// Create a new `EtdDispatch` with default weights.
    ///
    /// Defaults: `wait_weight = 1.0`, `delay_weight = 1.0`,
    /// `door_weight = 0.5`, `wait_squared_weight = 0.0`,
    /// `age_linear_weight = 0.0`.
    #[must_use]
    pub fn new() -> Self {
        Self {
            wait_weight: 1.0,
            delay_weight: 1.0,
            door_weight: 0.5,
            wait_squared_weight: 0.0,
            age_linear_weight: 0.0,
            pending_positions: SmallVec::new(),
        }
    }

    /// Create with a single delay weight (backwards-compatible shorthand).
    #[must_use]
    pub fn with_delay_weight(delay_weight: f64) -> Self {
        Self {
            wait_weight: 1.0,
            delay_weight,
            door_weight: 0.5,
            wait_squared_weight: 0.0,
            age_linear_weight: 0.0,
            pending_positions: SmallVec::new(),
        }
    }

    /// Create with fully custom weights.
    #[must_use]
    pub fn with_weights(wait_weight: f64, delay_weight: f64, door_weight: f64) -> Self {
        Self {
            wait_weight,
            delay_weight,
            door_weight,
            wait_squared_weight: 0.0,
            age_linear_weight: 0.0,
            pending_positions: SmallVec::new(),
        }
    }

    /// Turn on the squared-wait fairness bonus. Higher values prefer
    /// older waiters more aggressively; `0.0` (the default) disables.
    ///
    /// # Panics
    /// Panics on non-finite or negative weights. A `NaN` weight would
    /// propagate through `mul_add` and silently disable every dispatch
    /// rank; a negative weight would invert the fairness ordering.
    /// Either is a programming error rather than a valid configuration.
    #[must_use]
    pub fn with_wait_squared_weight(mut self, weight: f64) -> Self {
        assert!(
            weight.is_finite() && weight >= 0.0,
            "wait_squared_weight must be finite and non-negative, got {weight}"
        );
        self.wait_squared_weight = weight;
        self
    }

    /// Turn on the linear waiting-age fairness term. Higher values
    /// prefer older waiters more aggressively; `0.0` (the default)
    /// disables. Composes additively with
    /// [`with_wait_squared_weight`](Self::with_wait_squared_weight).
    ///
    /// # Panics
    /// Panics on non-finite or negative weights, for the same reasons
    /// as [`with_wait_squared_weight`](Self::with_wait_squared_weight).
    #[must_use]
    pub fn with_age_linear_weight(mut self, weight: f64) -> Self {
        assert!(
            weight.is_finite() && weight >= 0.0,
            "age_linear_weight must be finite and non-negative, got {weight}"
        );
        self.age_linear_weight = weight;
        self
    }
}

impl Default for EtdDispatch {
    fn default() -> Self {
        Self::new()
    }
}

impl DispatchStrategy for EtdDispatch {
    fn pre_dispatch(
        &mut self,
        group: &ElevatorGroup,
        manifest: &DispatchManifest,
        world: &mut World,
    ) {
        self.pending_positions.clear();
        for &s in group.stop_entities() {
            if manifest.has_demand(s)
                && let Some(p) = world.stop_position(s)
            {
                self.pending_positions.push(p);
            }
        }
    }

    fn rank(&mut self, ctx: &RankContext<'_>) -> Option<f64> {
        // Exclude `(car, stop)` pairs that can't produce any useful work.
        // Without this guard, a full car whose only candidate stop is a
        // pickup it lacks capacity to serve collapses to a zero-cost
        // self-assignment (travel, detour, and door terms are all 0 when
        // the car is already at the stop). Dispatch then re-selects that
        // stop every tick — doors cycle open, reject, close, repeat — and
        // the aboard riders are never carried to their destinations.
        if !pair_can_do_work(ctx) {
            return None;
        }
        let mut cost = self.compute_cost(ctx.car, ctx.car_position, ctx.stop_position, ctx.world);
        if self.wait_squared_weight > 0.0 {
            let wait_sq: f64 = ctx
                .manifest
                .waiting_riders_at(ctx.stop)
                .iter()
                .map(|r| {
                    let w = r.wait_ticks as f64;
                    w * w
                })
                .sum();
            cost = self.wait_squared_weight.mul_add(-wait_sq, cost).max(0.0);
        }
        if self.age_linear_weight > 0.0 {
            let wait_sum: f64 = ctx
                .manifest
                .waiting_riders_at(ctx.stop)
                .iter()
                .map(|r| r.wait_ticks as f64)
                .sum();
            cost = self.age_linear_weight.mul_add(-wait_sum, cost).max(0.0);
        }
        if cost.is_finite() { Some(cost) } else { None }
    }

    fn builtin_id(&self) -> Option<super::BuiltinStrategy> {
        Some(super::BuiltinStrategy::Etd)
    }
}

impl EtdDispatch {
    /// Compute ETD cost for assigning an elevator to serve a stop.
    ///
    /// Cost = `wait_weight` * travel\_time + `delay_weight` * existing\_rider\_delay
    ///      + `door_weight` * door\_overhead + direction\_bonus
    fn compute_cost(
        &self,
        elev_eid: EntityId,
        elev_pos: f64,
        target_pos: f64,
        world: &World,
    ) -> f64 {
        let Some(car) = world.elevator(elev_eid) else {
            return f64::INFINITY;
        };

        let distance = (elev_pos - target_pos).abs();
        let travel_time = if car.max_speed.value() > 0.0 {
            distance / car.max_speed.value()
        } else {
            return f64::INFINITY;
        };

        // Door overhead is a seconds-denominated cost so the Hungarian
        // can compare it apples-to-apples against travel time and
        // existing-rider delay. Pre-fix, this was summed in ticks,
        // multiplied by `door_weight` (dimensionless), and added to
        // seconds-valued terms — giving door cost ~60× the intended
        // influence at 60 Hz. A single intervening stop could then
        // outweigh a long travel time and bias ETD toward distant
        // cars with clear shafts over closer ones with a single
        // waypoint. Convert with the sim's tick rate (resource-
        // provided) and fall back to 60 Hz for bare-World contexts
        // such as unit-test fixtures.
        let tick_rate = world
            .resource::<crate::time::TickRate>()
            .map_or(60.0, |r| r.0);
        let door_overhead_per_stop =
            f64::from(car.door_transition_ticks * 2 + car.door_open_ticks) / tick_rate;

        // Intervening pending stops between car and target contribute door overhead.
        let (lo, hi) = if elev_pos < target_pos {
            (elev_pos, target_pos)
        } else {
            (target_pos, elev_pos)
        };
        let intervening_stops = self
            .pending_positions
            .iter()
            .filter(|p| **p > lo + 1e-9 && **p < hi - 1e-9)
            .count() as f64;
        let door_cost = intervening_stops * door_overhead_per_stop;

        let mut existing_rider_delay = 0.0_f64;
        for &rider_eid in car.riders() {
            if let Some(dest) = world.route(rider_eid).and_then(Route::current_destination)
                && let Some(dest_pos) = world.stop_position(dest)
            {
                let direct_dist = (elev_pos - dest_pos).abs();
                let detour_dist = (elev_pos - target_pos).abs() + (target_pos - dest_pos).abs();
                let extra = (detour_dist - direct_dist).max(0.0);
                if car.max_speed.value() > 0.0 {
                    existing_rider_delay += extra / car.max_speed.value();
                }
            }
        }

        // Direction bonus: if the car is already heading this way, subtract.
        // Scoring model requires non-negative costs, so clamp at zero — losing
        // a small amount of discriminative power vs. a pure free-for-all when
        // two assignments tie.
        let direction_bonus = match car.phase.moving_target() {
            Some(current_target) => world.stop_position(current_target).map_or(0.0, |ctp| {
                let moving_up = ctp > elev_pos;
                let target_is_ahead = if moving_up {
                    target_pos > elev_pos && target_pos <= ctp
                } else {
                    target_pos < elev_pos && target_pos >= ctp
                };
                if target_is_ahead {
                    -travel_time * 0.5
                } else {
                    0.0
                }
            }),
            None if car.phase == ElevatorPhase::Idle => -travel_time * 0.3,
            _ => 0.0,
        };

        let raw = self.wait_weight.mul_add(
            travel_time,
            self.delay_weight.mul_add(
                existing_rider_delay,
                self.door_weight.mul_add(door_cost, direction_bonus),
            ),
        );
        raw.max(0.0)
    }
}
