use bevy::prelude::*;

use crate::camera::setup_camera;
use crate::input::handle_speed_input;
use crate::passenger_ai::{spawn_ai_passengers, PassengerSpawnTimer};
use crate::rendering::{
    spawn_building_visuals, sync_elevator_visuals, sync_passenger_visuals,
    update_passenger_positions,
};
use crate::sim_bridge::{SimEventWrapper, SimSpeed, SimulationRes};
use crate::ui::{spawn_hud, update_hud};
use elevator_sim_core::config::SimConfig;
use elevator_sim_core::dispatch::ScanDispatch;
use elevator_sim_core::sim::Simulation;

pub struct ElevatorSimPlugin;

impl Plugin for ElevatorSimPlugin {
    fn build(&self, app: &mut App) {
        // Load config.
        let ron_str = std::fs::read_to_string("assets/config/default.ron")
            .expect("Failed to read assets/config/default.ron");
        let config: SimConfig =
            ron::from_str(&ron_str).expect("Failed to parse default.ron");

        let spawn_config = config.passenger_spawning.clone();
        let sim = Simulation::new(config, Box::new(ScanDispatch::new()));

        app.insert_resource(SimulationRes { sim })
            .insert_resource(SimSpeed { multiplier: 1 })
            .insert_resource(PassengerSpawnTimer {
                ticks_until_spawn: spawn_config.mean_interval_ticks,
                mean_interval: spawn_config.mean_interval_ticks,
                weight_min: spawn_config.weight_range.0,
                weight_max: spawn_config.weight_range.1,
            })
            .add_message::<SimEventWrapper>()
            .add_systems(Startup, (setup_camera, spawn_building_visuals, spawn_hud))
            .add_systems(
                Update,
                (
                    handle_speed_input,
                    spawn_ai_passengers,
                    tick_simulation,
                    sync_elevator_visuals,
                    sync_passenger_visuals,
                    update_passenger_positions,
                    update_hud,
                )
                    .chain(),
            );
    }
}

// Re-export the tick function.
use crate::sim_bridge::tick_simulation;
