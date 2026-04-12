#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

/// Shared test utilities.
mod helpers;

mod builder_tests;
mod config_tests;
mod feature_tests;
mod hooks_tests;
mod dispatch_tests;
mod door_tests;
mod error_tests;
mod event_serde_tests;
mod metrics_tests;
mod movement_tests;
mod proptest_tests;
mod query_tests;
mod resource_tests;
mod scenario_tests;
mod substep_tests;
mod time_tests;
mod topology_tests;
#[cfg(feature = "traffic")]
mod traffic_tests;
mod world_tests;
