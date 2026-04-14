//! Elevator Simulator — Bevy 0.18 game binary wrapping the core simulation.

use bevy::prelude::*;

use elevator_bevy::plugin::ElevatorSimPlugin;

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
