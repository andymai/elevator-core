//! Elevator Simulator — Bevy 0.18 game binary wrapping the core simulation.

use bevy::prelude::*;

/// Camera setup and centering.
mod camera;
/// Keyboard input handling for simulation speed.
mod input;
/// AI-driven rider spawning.
mod passenger_ai;
/// Bevy plugin wiring up the simulation.
mod plugin;
/// Visual rendering of shafts, elevators, stops, and riders.
mod rendering;
/// Simulation bridge resources and tick system.
mod sim_bridge;
/// HUD overlay for simulation stats.
mod ui;

use plugin::ElevatorSimPlugin;

/// Entry point — launches the Bevy app with the elevator simulation plugin.
fn main() {
    App::new()
        .add_plugins(DefaultPlugins.set(WindowPlugin {
            primary_window: Some(Window {
                title: "Elevator Simulator".into(),
                resolution: (800u32, 600u32).into(),
                ..default()
            }),
            ..default()
        }))
        .add_plugins(ElevatorSimPlugin)
        .run();
}
