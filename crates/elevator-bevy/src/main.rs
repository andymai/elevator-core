//! Elevator Simulator — Bevy 0.18 game binary wrapping the core simulation.

use bevy::prelude::*;

/// Deep ocean atmosphere particles.
mod atmosphere;
/// Global breathing rhythm — ambient light modulation.
mod breathing;
/// Camera setup and centering.
mod camera;
/// Floor activity glow and label fade system.
mod glow;
/// Keyboard input handling for simulation speed.
mod input;
/// Bioluminescent color palette.
mod palette;
/// AI-driven rider spawning.
mod passenger_ai;
/// Bevy plugin wiring up the simulation.
mod plugin;
/// Visual rendering of shafts, elevators, stops, and riders.
mod rendering;
/// Simulation bridge resources and tick system.
mod sim_bridge;
/// Arrival sparkle particles.
mod sparkle;
/// Elevator light trail system.
mod trail;
/// HUD overlay for simulation stats.
mod ui;

use plugin::ElevatorSimPlugin;

/// Entry point — launches the Bevy app with the elevator simulation plugin.
fn main() {
    App::new()
        .add_plugins(DefaultPlugins.set(WindowPlugin {
            primary_window: Some(Window {
                title: "Living Building".into(),
                resolution: (1600u32, 900u32).into(),
                ..default()
            }),
            ..default()
        }))
        .insert_resource(ClearColor(palette::BG))
        .add_plugins(ElevatorSimPlugin)
        .run();
}
