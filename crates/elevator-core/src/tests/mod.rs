#![allow(
    clippy::unwrap_used,
    clippy::expect_used,
    clippy::panic,
    // Tests legitimately compare against exact-zero / exact-constant floats
    // produced by deterministic inputs; fuzzy comparisons would obscure intent.
    clippy::float_cmp,
    // Scenario tests (especially multi-line) are naturally long.
    clippy::too_many_lines,
)]

/// Shared test utilities.
mod helpers;

mod access_tests;
mod builder_tests;
mod config_tests;
mod dispatch_tests;
mod door_tests;
mod error_tests;
mod event_serde_tests;
mod feature_tests;
mod hooks_tests;
mod metrics_tests;
mod movement_tests;
mod proptest_tests;
mod query_tests;
mod reroute_tests;
mod resource_tests;
mod scenario_tests;
mod snapshot_tests;
mod substep_tests;
mod tagged_metrics_tests;
mod time_tests;
mod topology_tests;
#[cfg(feature = "traffic")]
mod traffic_tests;
mod world_tests;

mod abort_movement_tests;
mod api_surface_tests;
mod boundary_tests;
mod braking_tests;
mod destination_dispatch_tests;
mod destination_queue_tests;
mod direction_indicator_tests;
mod door_control_tests;
#[cfg(feature = "energy")]
mod energy_tests;
mod eta_tests;
mod etd_mutant_tests;
mod event_payload_tests;
mod hall_call_tests;
mod manual_mode_tests;
mod move_count_tests;
mod movement_boundary_tests;
mod multi_elevator_tests;
mod multi_line_tests;
mod mutation_kills_tests;
mod phase_helpers_tests;
mod position_interpolation_tests;
mod query_event_tests;
mod reposition_tests;
mod resident_tests;
mod rider_index_tests;
mod runtime_upgrades_tests;
mod service_mode_tests;
mod waiting_direction_tests;
