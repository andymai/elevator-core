//! Floating-point helpers that the engine routes through to give
//! consumers a single switch for cross-host determinism.
//!
//! By default these are zero-cost wrappers — `fma` lowers to
//! `f64::mul_add`, which on hardware-FMA targets is one rounded
//! operation. With the `deterministic-fp` feature flag set, `fma`
//! becomes `(a * b) + c` (two rounded operations) — slightly less
//! precise, but bit-identical across every target without relying
//! on the host's libm or hardware FMA. Required for consumers
//! running lockstep across heterogeneous hosts (native + wasm32,
//! browser + worker, etc.) who need byte-equal sim outputs.
//!
//! All `f64::mul_add` call sites in the engine should go through
//! `fma` so the feature flag covers the whole hot path.

/// Fused multiply-add: returns `(a * b) + c`.
///
/// Default build uses hardware FMA via `f64::mul_add` — one rounded
/// operation, slightly more precise. With the `deterministic-fp`
/// feature flag, this expands to a separate multiply and add — two
/// rounded operations, bit-identical across all hosts and toolchains.
#[cfg(not(feature = "deterministic-fp"))]
#[inline]
#[must_use]
pub fn fma(a: f64, b: f64, c: f64) -> f64 {
    a.mul_add(b, c)
}

/// `deterministic-fp` build of [`fma`]: two rounded operations,
/// bit-identical across all targets. The `clippy::suboptimal_flops`
/// allow is the whole point of the feature flag — clippy would
/// suggest `mul_add`, which is exactly what we're avoiding.
#[cfg(feature = "deterministic-fp")]
#[allow(clippy::suboptimal_flops)]
#[inline]
#[must_use]
pub fn fma(a: f64, b: f64, c: f64) -> f64 {
    (a * b) + c
}
