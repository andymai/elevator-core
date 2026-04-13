//! Bevy plugin that wires up the elevator simulation into the app.

use bevy::prelude::*;

use crate::atmosphere::{drift_edge_glow, drift_marine_snow, spawn_atmosphere};
use crate::breathing::{BreathPhase, update_breathing};
use crate::camera::setup_camera;
use crate::glow::{update_floor_glow, update_floor_labels};
use crate::input::handle_speed_input;
use crate::passenger_ai::{PassengerSpawnTimer, spawn_ai_passengers};
use crate::rendering::{
    elevator::sync_elevator_visuals,
    rider::{sync_rider_visuals, update_rider_positions},
    spawn_building_visuals,
};
use crate::sim_bridge::{EventWrapper, SimSpeed, SimulationRes, tick_simulation};
use crate::sparkle::{
    PreviousArrivals, PreviousPhases, PreviousTransferWaiters, spawn_arrival_rings, spawn_sparkles,
    spawn_transfer_arcs, update_arrival_rings, update_sparkles, update_transfer_arcs,
};
use crate::trail::{TrailCooldowns, fade_trail_segments, spawn_trail_segments};
use crate::ui::{spawn_hud, update_hud};
use crate::vascular::{spawn_vascular, update_vascular};
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
            .unwrap_or_else(|| "assets/config/living_building.ron".to_string());

        let ron_str = std::fs::read_to_string(&config_path)
            .unwrap_or_else(|_| panic!("Failed to read config: {config_path}"));
        let config: SimConfig = ron::from_str(&ron_str)
            .unwrap_or_else(|e| panic!("Failed to parse {config_path}: {e}"));

        let spawn_config = config.passenger_spawning.clone();
        let sim = Simulation::new(&config, ScanDispatch::new())
            .unwrap_or_else(|e| panic!("Invalid simulation config: {e}"));

        app.insert_resource(SimulationRes { sim })
            .insert_resource(SimSpeed { multiplier: 1 })
            .insert_resource(TrailCooldowns::default())
            .insert_resource(BreathPhase::default())
            .insert_resource(PreviousArrivals::default())
            .insert_resource(PreviousTransferWaiters::default())
            .insert_resource(PreviousPhases::default())
            .insert_resource(PassengerSpawnTimer {
                ticks_until_spawn: spawn_config.mean_interval_ticks,
                mean_interval: spawn_config.mean_interval_ticks,
                weight_min: spawn_config.weight_range.0,
                weight_max: spawn_config.weight_range.1,
            })
            .add_message::<EventWrapper>()
            .add_systems(
                Startup,
                (
                    setup_camera,
                    spawn_atmosphere,
                    spawn_building_visuals,
                    spawn_hud,
                )
                    .chain(),
            )
            .add_systems(Startup, spawn_vascular.after(spawn_building_visuals))
            .add_systems(
                Update,
                (
                    handle_speed_input,
                    spawn_ai_passengers,
                    tick_simulation,
                    sync_elevator_visuals,
                    spawn_trail_segments,
                    sync_rider_visuals,
                    update_rider_positions,
                    spawn_sparkles,
                    spawn_transfer_arcs,
                    spawn_arrival_rings,
                    update_hud,
                )
                    .chain(),
            )
            .add_systems(
                Update,
                (
                    drift_marine_snow,
                    drift_edge_glow,
                    fade_trail_segments,
                    update_floor_glow,
                    update_floor_labels,
                    update_breathing,
                    update_sparkles,
                    update_transfer_arcs,
                    update_arrival_rings,
                    update_vascular,
                ),
            );
    }
}
