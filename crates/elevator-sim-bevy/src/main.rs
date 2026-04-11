use bevy::prelude::*;

mod camera;
mod input;
mod passenger_ai;
mod plugin;
mod rendering;
mod sim_bridge;
mod ui;

use plugin::ElevatorSimPlugin;

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
