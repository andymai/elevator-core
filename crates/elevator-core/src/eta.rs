//! Travel-time estimation for trapezoidal velocity profiles.
//!
//! Given an elevator's kinematic parameters (max speed, acceleration,
//! deceleration), an initial speed, and a remaining distance to a target,
//! [`travel_time`](crate::eta::travel_time) returns the seconds required to coast in, brake, and
//! arrive at rest. Used by [`Simulation::eta`](crate::sim::Simulation::eta)
//! and [`Simulation::best_eta`](crate::sim::Simulation::best_eta) to walk a
//! destination queue and sum per-leg travel plus per-stop door dwell.
//!
//! The profile mirrors [`movement::tick_movement`](crate::movement::tick_movement)
//! at the closed-form level — the per-tick integrator and the closed-form
//! solver agree to within a tick on the same inputs. ETAs are estimates,
//! not bit-exact: load/unload time, dispatch reordering, and door commands
//! issued mid-trip will perturb the actual arrival.

/// Closed-form travel time, in seconds, for a trapezoidal/triangular
/// velocity profile from initial speed `v0` to a full stop over `distance`.
///
/// All inputs are unsigned magnitudes. Returns `0.0` for non-positive
/// `distance` or non-positive kinematic parameters (defensive: a degenerate
/// elevator can't reach anywhere, but we'd rather return a finite zero
/// than `NaN` or an infinity).
///
/// `v0` is clamped to `[0.0, v_max]`; an elevator already moving faster
/// than its current `max_speed` (e.g. just after a runtime-upgrade lowered
/// the cap) is treated as cruising at `v_max`.
#[must_use]
pub fn travel_time(distance: f64, v0: f64, v_max: f64, accel: f64, decel: f64) -> f64 {
    if distance <= 0.0 || v_max <= 0.0 || accel <= 0.0 || decel <= 0.0 {
        return 0.0;
    }
    let v0 = v0.clamp(0.0, v_max);

    // If the brake distance from v0 already exceeds the remaining trip,
    // we can't even reach v0+ε before having to slow — solve the pure
    // deceleration leg `d = v0·t − ½·decel·t²` for the smaller root.
    let brake_d = v0 * v0 / (2.0 * decel);
    if brake_d >= distance {
        let disc = (v0 * v0 - 2.0 * distance * decel).max(0.0);
        return (v0 - disc.sqrt()) / decel;
    }

    // Triangular peak velocity (no cruise): solve d_accel(v) + d_decel(v) = d
    // → v² = (2·d·a·decel + v0²·decel) / (a + decel)
    let v_peak_sq =
        crate::fp::fma(decel, v0 * v0, 2.0 * distance * accel * decel) / (accel + decel);
    let v_peak = v_peak_sq.sqrt();

    if v_peak <= v_max {
        // Triangular profile: accel v0→v_peak, decel v_peak→0
        (v_peak - v0) / accel + v_peak / decel
    } else {
        // Trapezoidal: accel v0→v_max, cruise at v_max, decel v_max→0
        let d_accel = crate::fp::fma(v_max, v_max, -(v0 * v0)) / (2.0 * accel);
        let d_decel = v_max * v_max / (2.0 * decel);
        let d_cruise = distance - d_accel - d_decel;
        (v_max - v0) / accel + d_cruise / v_max + v_max / decel
    }
}
