//! Tests for the `fp` floating-point helpers.

use crate::fp::fma;

#[test]
fn fma_returns_a_b_plus_c() {
    // Trivial values where both fused and non-fused agree exactly.
    assert!((fma(2.0, 3.0, 4.0) - 10.0).abs() < f64::EPSILON);
    assert!((fma(-1.5, 2.0, 0.5) - (-2.5)).abs() < f64::EPSILON);
    assert!((fma(0.0, 99.0, 1.0) - 1.0).abs() < f64::EPSILON);
}

#[test]
fn fma_is_deterministic_across_repeat_calls() {
    let a = 0.1_f64;
    let b = 0.2_f64;
    let c = 0.3_f64;
    let first = fma(a, b, c);
    for _ in 0..1000 {
        assert_eq!(
            fma(a, b, c),
            first,
            "fma must produce identical bits across repeated calls"
        );
    }
}

/// Under the `deterministic-fp` feature, fma must equal `(a * b) + c`
/// exactly — that's the definition of the flag. The default build
/// uses `f64::mul_add` which can differ from `(a * b) + c` by one ULP
/// for some inputs (it's one rounded operation vs two). Both are
/// internally consistent; the flag picks which one the engine uses.
#[cfg(feature = "deterministic-fp")]
#[allow(clippy::suboptimal_flops)]
#[test]
fn deterministic_fp_matches_naive_expression() {
    // Specific value where mul_add and (a*b)+c differ in the last bit.
    let a = 0.1_f64;
    let b = 0.2_f64;
    let c = -(a * b);
    // (0.1 * 0.2) - (0.1 * 0.2) — naively zero but the rounding of
    // (a*b) leaves a tiny residue; mul_add eliminates the residue
    // by fusing. With deterministic-fp on, we keep the residue.
    let naive = (a * b) + c;
    assert_eq!(
        fma(a, b, c),
        naive,
        "deterministic-fp build must match (a*b)+c exactly"
    );
}
