//! Fuzz target: feed arbitrary bytes to snapshot RON deserialization.
//!
//! Validates that no panics occur on malformed input.

#![no_main]

use libfuzzer_sys::fuzz_target;

fuzz_target!(|data: &[u8]| {
    if let Ok(s) = std::str::from_utf8(data) {
        // Attempt to deserialize arbitrary RON as a WorldSnapshot.
        // This should never panic.
        let _ = ron::from_str::<elevator_sim_core::snapshot::WorldSnapshot>(s);
    }
});
