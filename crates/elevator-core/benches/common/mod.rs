//! Shared bench configuration helpers — centralises `ElevatorConfig`
//! construction so a field-type change lands in one place.

#![allow(dead_code)]

use elevator_core::components::{Accel, Speed, Weight};
use elevator_core::config::ElevatorConfig;
use elevator_core::stop::StopId;

/// `(id, starting_stop, max_speed, acceleration, deceleration, weight_capacity)`
/// — benchmark-default door/service/inspection settings are applied.
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

        bypass_load_up_pct: None,

        bypass_load_down_pct: None,
    }
}
