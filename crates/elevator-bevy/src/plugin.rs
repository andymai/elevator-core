//! Bevy plugin that wires up the elevator simulation into the app.

use bevy::prelude::*;

use crate::camera::setup_camera;
use crate::input::handle_speed_input;
use crate::passenger_ai::{PassengerSpawnTimer, spawn_ai_passengers};
use crate::rendering::{
    spawn_building_visuals, sync_door_panels, sync_elevator_visuals, sync_rider_visuals,
    update_rider_positions,
};
use crate::sim_bridge::{EventWrapper, SimSpeed, SimulationRes, tick_simulation};
use crate::style::VisualStyle;
use crate::ui::{spawn_hud, update_hud};
use elevator_core::config::SimConfig;
use elevator_core::dispatch::scan::ScanDispatch;
use elevator_core::sim::Simulation;

/// Top-level plugin that loads config, creates the simulation, and registers all systems.
pub struct ElevatorSimPlugin;

impl Plugin for ElevatorSimPlugin {
    #[allow(clippy::panic)]
    fn build(&self, app: &mut App) {
        // Load config — check CLI arg first, fall back to default.
        let config_path = std::env::args()
            .nth(1)
            .unwrap_or_else(|| "assets/config/default.ron".to_string());

        let ron_str = std::fs::read_to_string(&config_path)
            .unwrap_or_else(|_| panic!("Failed to read config: {config_path}"));
        let config: SimConfig = ron::from_str(&ron_str)
            .unwrap_or_else(|e| panic!("Failed to parse {config_path}: {e}"));

        let spawn_config = config.passenger_spawning.clone();
        let sim = Simulation::new(&config, ScanDispatch::new())
            .unwrap_or_else(|e| panic!("Invalid simulation config: {e}"));

        // Default style unless an earlier plugin/example inserted one.
        if !app.world().contains_resource::<VisualStyle>() {
            app.insert_resource(VisualStyle::default());
        }

        app.insert_resource(SimulationRes { sim })
            .insert_resource(SimSpeed { multiplier: 1 })
            .insert_resource(ClearColor(Color::srgba(0.08, 0.08, 0.1, 1.0)))
            .insert_resource(PassengerSpawnTimer {
                ticks_until_spawn: spawn_config.mean_interval_ticks,
                mean_interval: spawn_config.mean_interval_ticks,
                weight_min: spawn_config.weight_range.0,
                weight_max: spawn_config.weight_range.1,
            })
            .add_message::<EventWrapper>()
            .add_systems(Startup, (setup_camera, spawn_building_visuals, spawn_hud))
            .add_systems(
                Update,
                (
                    handle_speed_input,
                    spawn_ai_passengers,
                    tick_simulation,
                    sync_elevator_visuals,
                    sync_door_panels,
                    sync_rider_visuals,
                    update_rider_positions,
                    update_hud,
                )
                    .chain(),
            );
    }
}
