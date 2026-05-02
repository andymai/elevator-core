//! Compile-time surface check for `WasmSim::set_strategy_js`.
//!
//! `js_sys::Function::default()` panics on non-wasm targets, so we
//! can't actually invoke `set_strategy_js` from a native test. Instead
//! we lock the public signature with a function pointer assignment so
//! a rename or signature drift breaks the build. End-to-end exercise
//! happens via the playground integration in a later PR.

use elevator_wasm::WasmSim;

#[test]
fn set_strategy_js_signature_is_stable() {
    let _: fn(&mut WasmSim, String, js_sys::Function) = WasmSim::set_strategy_js;
}
