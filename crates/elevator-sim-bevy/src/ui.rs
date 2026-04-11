use bevy::prelude::*;

use crate::sim_bridge::{SimSpeed, SimulationRes};

/// Marker for the HUD text entity.
#[derive(Component)]
pub struct HudText;

/// Spawn the HUD overlay.
pub fn spawn_hud(mut commands: Commands) {
    commands.spawn((
        Text::new("Tick: 0 | Speed: 1x"),
        TextFont {
            font_size: 20.0,
            ..default()
        },
        TextColor(Color::WHITE),
        Node {
            position_type: PositionType::Absolute,
            top: Val::Px(10.0),
            left: Val::Px(10.0),
            ..default()
        },
        HudText,
    ));

    // Instructions text.
    commands.spawn((
        Text::new("Space: pause | 1: 1x | 2: 2x | 3: 10x"),
        TextFont {
            font_size: 14.0,
            ..default()
        },
        TextColor(Color::srgba(0.7, 0.7, 0.7, 1.0)),
        Node {
            position_type: PositionType::Absolute,
            bottom: Val::Px(10.0),
            left: Val::Px(10.0),
            ..default()
        },
    ));
}

/// Update the HUD each frame.
pub fn update_hud(
    sim: Res<SimulationRes>,
    speed: Res<SimSpeed>,
    mut query: Query<&mut Text, With<HudText>>,
) {
    for mut text in &mut query {
        let speed_str = if speed.multiplier == 0 {
            "PAUSED".to_string()
        } else {
            format!("{}x", speed.multiplier)
        };
        **text = format!(
            "Tick: {} | Speed: {} | Passengers: {}",
            sim.sim.tick,
            speed_str,
            sim.sim
                .passengers
                .iter()
                .filter(|p| p.state != elevator_sim_core::passenger::PassengerState::Arrived)
                .count()
        );
    }
}
