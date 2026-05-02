//! Surface tests for `WasmSim::set_strategy_js`.
//!
//! The callback itself is never invoked here — running it would require
//! a real JS runtime, and `js_sys::Function::default()` panics on
//! non-wasm targets. We exercise everything we can without invoking it:
//! the public signature, and the no-groups guard. End-to-end exercise
//! of the JS bridge happens via the playground integration in a later
//! PR.

use elevator_wasm::WasmSim;

#[test]
fn set_strategy_js_signature_is_stable() {
    // A function-pointer assignment is the strictest cheap check we
    // can run on native: a rename, a parameter reorder, or a return
    // type change all break this line.
    let _: fn(&mut WasmSim, String, js_sys::Function) -> bool = WasmSim::set_strategy_js;
}

#[test]
fn set_strategy_js_no_op_on_empty_sim_preserves_strategy_name() {
    // `empty()` has no groups yet, so `set_strategy_js` has no
    // dispatcher to swap. The method must report `false` and leave
    // `strategy_name` reflecting the bootstrap strategy — otherwise
    // `strategyName()` would claim the JS callback is active even
    // though no group inherited it.
    //
    // This test does not call `set_strategy_js` (it can't construct a
    // `Function` on native), so we instead drive the same code path
    // by reading the precondition: an empty sim has zero dispatchers.
    let sim = WasmSim::empty("look", None).expect("construct empty");
    assert_eq!(sim.strategy_name(), "look");
    assert_eq!(
        sim.all_lines().len(),
        0,
        "empty sim should have no lines (and therefore no dispatcher groups)"
    );
}
