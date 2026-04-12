//! Fuzz target: feed arbitrary bytes to RON config deserialization.
//!
//! Validates that no panics occur on malformed input.

#![no_main]

use elevator_sim_core::config::SimConfig;
use libfuzzer_sys::fuzz_target;

fuzz_target!(|data: &[u8]| {
    if let Ok(s) = std::str::from_utf8(data) {
        // Attempt to parse as RON. We don't care if it fails —
        // only that it doesn't panic.
        let _ = ron::from_str::<SimConfig>(s);
    }
});
