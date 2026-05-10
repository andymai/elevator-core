//! Cyclic-distance helpers for closed-loop topologies.
//!
//! These helpers operate on positions along a one-dimensional axis that
//! wraps modulo `circumference`. They are the foundation that
//! [`LineKind::Loop`](super::line::LineKind) consumers — movement physics,
//! ETA math, headway clamping — build on.
//!
//! All helpers treat `circumference <= 0.0` and non-finite inputs as
//! degenerate and return safe values (typically `0.0` or the input
//! unchanged) rather than panicking. Construction-time validation is
//! responsible for rejecting such configurations before they reach
//! these helpers; the defensive returns exist so a misconfigured run
//! degrades gracefully rather than producing NaN cascades.

/// Normalize a position into `[0, circumference)`.
///
/// Uses [`f64::rem_euclid`] so negative inputs wrap correctly (unlike
/// `%` which preserves the sign). The `>= circumference` guard handles
/// the rare case where `rem_euclid` rounds a tiny negative input up to
/// exactly `circumference` due to floating-point precision loss —
/// without it the `[0, C)` invariant would be silently violated.
///
/// Returns the input unchanged when `circumference <= 0.0` or when
/// `p` is non-finite.
///
/// ```
/// # use elevator_core::components::cyclic::wrap_position;
/// assert_eq!(wrap_position(0.0, 100.0), 0.0);
/// assert_eq!(wrap_position(50.0, 100.0), 50.0);
/// assert_eq!(wrap_position(100.0, 100.0), 0.0);
/// assert_eq!(wrap_position(125.0, 100.0), 25.0);
/// assert_eq!(wrap_position(-25.0, 100.0), 75.0);
/// assert_eq!(wrap_position(-100.0, 100.0), 0.0);
/// ```
#[must_use]
pub fn wrap_position(p: f64, circumference: f64) -> f64 {
    if circumference <= 0.0 || !p.is_finite() {
        return p;
    }
    let r = p.rem_euclid(circumference);
    if r >= circumference { 0.0 } else { r }
}

/// Forward (one-way) cyclic distance from `from` to `to` along a loop.
///
/// Always returns a value in `[0, circumference)`. Coincident positions
/// return `0.0`, not `circumference` — distance to "the same point" is
/// zero, even though "going all the way around back to the same point"
/// is also a meaningful concept on a loop. Callers that need the
/// "full lap" interpretation should add `circumference` to a `0.0`
/// result themselves.
///
/// Returns `0.0` when `circumference <= 0.0`.
///
/// ```
/// # use elevator_core::components::cyclic::forward_distance;
/// assert_eq!(forward_distance(10.0, 30.0, 100.0), 20.0);
/// assert_eq!(forward_distance(90.0, 10.0, 100.0), 20.0);
/// assert_eq!(forward_distance(50.0, 50.0, 100.0), 0.0);
/// assert_eq!(forward_distance(0.0, 99.0, 100.0), 99.0);
/// // Inputs outside [0, C) are wrapped first.
/// assert_eq!(forward_distance(110.0, 30.0, 100.0), 20.0);
/// assert_eq!(forward_distance(-10.0, 30.0, 100.0), 40.0);
/// ```
#[must_use]
pub fn forward_distance(from: f64, to: f64, circumference: f64) -> f64 {
    // Guard non-finite inputs: `wrap_position` is documented to return
    // them unchanged, and the subtraction below would then propagate
    // `±∞` / `NaN` into ETA / dispatch math. Returning `0.0` matches
    // the module-level "safe degenerate value" contract.
    if circumference <= 0.0 || !from.is_finite() || !to.is_finite() {
        return 0.0;
    }
    let from = wrap_position(from, circumference);
    let to = wrap_position(to, circumference);
    let d = to - from;
    if d < 0.0 { d + circumference } else { d }
}

/// Shortest unsigned cyclic distance between `a` and `b` along a loop.
///
/// Returns the smaller of [`forward_distance(a, b)`](forward_distance)
/// and `circumference - forward_distance(a, b)`. Always in `[0, C/2]`.
///
/// Useful when the direction of travel is irrelevant (e.g. spatial
/// adjacency queries). For dispatch and ETA on a one-way loop, use
/// [`forward_distance`] instead — the shorter chord is the wrong
/// answer when you can only travel one way.
///
/// ```
/// # use elevator_core::components::cyclic::cyclic_distance;
/// assert_eq!(cyclic_distance(10.0, 30.0, 100.0), 20.0);
/// assert_eq!(cyclic_distance(90.0, 10.0, 100.0), 20.0);
/// assert_eq!(cyclic_distance(0.0, 50.0, 100.0), 50.0);
/// assert_eq!(cyclic_distance(0.0, 51.0, 100.0), 49.0);
/// ```
#[must_use]
pub fn cyclic_distance(a: f64, b: f64, circumference: f64) -> f64 {
    if circumference <= 0.0 {
        return 0.0;
    }
    let fwd = forward_distance(a, b, circumference);
    let back = circumference - fwd;
    fwd.min(back)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// `assert_eq!` on f64 trips `clippy::float_cmp`; this helper expresses
    /// the bit-exact intent the tests actually want when inputs are powers
    /// of two and arithmetic is closed under f64.
    fn approx(actual: f64, expected: f64) {
        assert!(
            (actual - expected).abs() < 1e-12,
            "expected {expected}, got {actual}",
        );
    }

    #[test]
    fn wrap_handles_zero_circumference() {
        approx(wrap_position(50.0, 0.0), 50.0);
        approx(wrap_position(50.0, -1.0), 50.0);
    }

    #[test]
    fn wrap_handles_non_finite() {
        assert!(wrap_position(f64::NAN, 100.0).is_nan());
        assert!(wrap_position(f64::INFINITY, 100.0).is_infinite());
    }

    #[test]
    fn forward_distance_is_directional() {
        approx(forward_distance(10.0, 30.0, 100.0), 20.0);
        approx(forward_distance(30.0, 10.0, 100.0), 80.0);
    }

    #[test]
    fn forward_distance_returns_zero_on_non_finite() {
        approx(forward_distance(f64::INFINITY, 30.0, 100.0), 0.0);
        approx(forward_distance(30.0, f64::INFINITY, 100.0), 0.0);
        approx(forward_distance(f64::NAN, 30.0, 100.0), 0.0);
        approx(forward_distance(30.0, f64::NAN, 100.0), 0.0);
        approx(forward_distance(f64::NEG_INFINITY, 30.0, 100.0), 0.0);
    }

    #[test]
    fn forward_distance_zero_on_coincident() {
        approx(forward_distance(50.0, 50.0, 100.0), 0.0);
        approx(forward_distance(0.0, 100.0, 100.0), 0.0);
    }

    #[test]
    fn cyclic_distance_is_symmetric() {
        for &(a, b) in &[(10.0_f64, 30.0_f64), (5.0, 95.0), (0.0, 50.0)] {
            let ab = cyclic_distance(a, b, 100.0);
            let ba = cyclic_distance(b, a, 100.0);
            assert!((ab - ba).abs() < 1e-12, "{a} -> {b}: {ab} vs {ba}");
        }
    }

    #[test]
    fn cyclic_distance_capped_at_half_circumference() {
        for d in 0..=100 {
            let result = cyclic_distance(0.0, f64::from(d), 100.0);
            assert!(result <= 50.0 + 1e-12, "d={d} result={result}");
        }
    }
}
