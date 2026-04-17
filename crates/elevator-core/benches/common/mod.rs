//! Shared bench configuration helpers.
//!
//! Each bench file compiles as its own binary, so this module is included
//! via `mod common;` in each bench that needs it. Centralizes the
//! `ElevatorConfig` construction so a field-type change (e.g. `f64` →
//! `Accel`/`Speed`/`Weight`) lands in one place instead of drifting across
//! bench files.

#![allow(dead_code)]

use elevator_core::components::{Accel, Speed, Weight};
use elevator_core::config::ElevatorConfig;
use elevator_core::stop::StopId;

/// Build an `ElevatorConfig` with the given physics and benchmark-default
/// door / service-mode / inspection settings.
pub fn elevator_cfg(
    id: u32,
    starting_stop: StopId,
    max_speed: f64,
    acceleration: f64,
    deceleration: f64,
    weight_capacity: f64,
) -> ElevatorConfig {
    ElevatorConfig {
        id,
        name: format!("E{id}"),
        max_speed: Speed::from(max_speed),
        acceleration: Accel::from(acceleration),
        deceleration: Accel::from(deceleration),
        weight_capacity: Weight::from(weight_capacity),
        starting_stop,
        door_open_ticks: 5,
        door_transition_ticks: 3,
        restricted_stops: Vec::new(),
        #[cfg(feature = "energy")]
        energy_profile: None,
        service_mode: None,
        inspection_speed_factor: 0.25,
    }
}
