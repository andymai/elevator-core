//! JS-callback adapter for [`elevator_core::dispatch::DispatchStrategy`].
//!
//! Lets a wasm consumer install a JavaScript function as the dispatch
//! strategy: every `(car, stop)` pair the engine considers in a
//! dispatch pass is forwarded to JS as a [`JsRankContext`], and the
//! returned number (or `null`/`undefined`) maps onto the trait's
//! `Option<f64>` rank.

use elevator_core::dispatch::{BuiltinStrategy, DispatchStrategy, RankContext};
use serde::Serialize;
use slotmap::Key;
use tsify::Tsify;
use wasm_bindgen::JsValue;

/// Subset of [`RankContext`] forwarded to a JS rank callback.
///
/// Field set is deliberately small for v1 — enough for distance-based
/// heuristics (nearest-car and friends). [`RankContext`] in core is
/// `#[non_exhaustive]`; new fields can be added here later without
/// breaking existing callbacks because JS reads only the keys it cares
/// about.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct JsRankContext {
    /// Elevator entity. Encoded with [`slotmap::KeyData::as_ffi`] so
    /// stale references fail the next world lookup instead of aliasing
    /// reused slots. Surfaces as `bigint` in JS.
    pub car: u64,
    /// Position of the car along the shaft axis, in core's distance
    /// units (typically metres).
    pub car_position: f64,
    /// Candidate stop entity, encoded the same way as `car`.
    pub stop: u64,
    /// Position of the candidate stop.
    pub stop_position: f64,
}

/// `DispatchStrategy` that delegates ranking to a JS function.
///
/// One instance is installed per group (the trait carries per-group
/// state in general, even though this adapter holds none). The JS
/// callback is shared across every group via `js_sys::Function::clone`
/// — a cheap reference-bump on the underlying `JsValue`.
pub struct JsDispatchStrategy {
    callback: js_sys::Function,
    /// Stable identity used in snapshots. Surfaces as
    /// `BuiltinStrategy::Custom(name)` so a snapshot taken while a
    /// JS strategy is active round-trips its identity even though the
    /// callback itself can't be serialized.
    name: String,
}

impl JsDispatchStrategy {
    pub fn new(name: String, callback: js_sys::Function) -> Self {
        Self { callback, name }
    }
}

// js_sys::Function wraps a JsValue, which is `!Send + !Sync`. The
// `DispatchStrategy` trait requires both. wasm32-unknown-unknown is
// single-threaded, so the bound is structurally satisfied: the value
// never crosses a thread boundary because there are none. Native
// builds of this crate (e.g. `cargo check --workspace` outside wasm)
// link against `wasm-bindgen`'s stub which produces `JsValue`s that
// also never escape, so the impls hold there too.
unsafe impl Send for JsDispatchStrategy {}
unsafe impl Sync for JsDispatchStrategy {}

impl DispatchStrategy for JsDispatchStrategy {
    fn rank(&mut self, ctx: &RankContext<'_>) -> Option<f64> {
        let dto = JsRankContext {
            car: ctx.car.data().as_ffi(),
            car_position: ctx.car_position,
            stop: ctx.stop.data().as_ffi(),
            stop_position: ctx.stop_position,
        };
        // `to_value` defaults to f64 numbers for `u64`, which truncates
        // any slotmap key above 2^53. Switching to bigint preserves
        // the full `(generation << 32) | index` encoding so stale
        // references fail the next world lookup instead of aliasing
        // a reused slot.
        let serializer =
            serde_wasm_bindgen::Serializer::new().serialize_large_number_types_as_bigints(true);
        let arg = dto.serialize(&serializer).ok()?;
        let ret = self.callback.call1(&JsValue::NULL, &arg).ok()?;
        if ret.is_null() || ret.is_undefined() {
            return None;
        }
        let score = ret.as_f64()?;
        // The trait contract requires finite, non-negative scores;
        // anything else can destabilize the Hungarian solver. Treat
        // bad returns as `None` (excluded) rather than panicking, so
        // a buggy JS callback degrades to "this car can't take this
        // stop" instead of taking down the sim.
        if score.is_finite() && score >= 0.0 {
            Some(score)
        } else {
            None
        }
    }

    fn builtin_id(&self) -> Option<BuiltinStrategy> {
        Some(BuiltinStrategy::Custom(self.name.clone()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Anything that touches `js_sys::Function` panics on non-wasm
    // targets ("cannot call wasm-bindgen imported functions"), so the
    // bridge wiring (`WasmSim::set_strategy_js` → `JsDispatchStrategy`
    // → `set_dispatch`) is validated by the playground integration in
    // a later PR rather than here. This module's native tests are
    // limited to the pieces that don't construct a `Function`.

    #[test]
    fn rank_context_serializes_camel_case() {
        // Tsify generates the TS surface from this serde shape; the JS
        // callback receives `carPosition` / `stopPosition`, not the
        // snake_case field names. RON respects `rename_all` the same
        // way wasm-bindgen's serializer does, so a native ron round-trip
        // pins the field names.
        let dto = JsRankContext {
            car: 0x1234,
            car_position: 4.0,
            stop: 0x5678,
            stop_position: 8.0,
        };
        let serialized = ron::to_string(&dto).expect("serialize");
        assert!(serialized.contains("carPosition"), "{serialized}");
        assert!(serialized.contains("stopPosition"), "{serialized}");
        assert!(!serialized.contains("car_position"), "{serialized}");
    }
}
