//! Minimal HUD overlay — dim, translucent, unobtrusive.

use bevy::prelude::*;
use elevator_core::components::RiderPhase;

use crate::sim_bridge::{SimSpeed, SimulationRes};

/// Marker for the stats HUD text.
#[derive(Component)]
pub struct HudText;

/// Spawn the HUD overlay — minimal, bottom-right, low alpha.
pub fn spawn_hud(mut commands: Commands) {
    // Stats text — bottom-right, very dim.
    commands.spawn((
        Text::new(""),
        TextFont {
            font_size: 10.0,
            ..default()
        },
        TextColor(Color::srgba(0.5, 0.6, 0.7, 0.3)),
        Node {
            position_type: PositionType::Absolute,
            bottom: Val::Px(12.0),
            right: Val::Px(12.0),
            ..default()
        },
        HudText,
    ));
}

/// Update the HUD with minimal stats.
#[allow(clippy::needless_pass_by_value)]
pub fn update_hud(
    sim: Res<SimulationRes>,
    speed: Res<SimSpeed>,
    mut query: Query<&mut Text, With<HudText>>,
) {
    let w = sim.sim.world();

    let speed_str = if speed.multiplier == 0 {
        "PAUSED".to_string()
    } else {
        format!("{}x", speed.multiplier)
    };

    let mut waiting = 0u32;
    let mut riding = 0u32;
    let mut delivered = 0u32;

    for (_, r) in w.iter_riders() {
        match r.phase() {
            RiderPhase::Waiting => waiting += 1,
            RiderPhase::Riding(_) | RiderPhase::Boarding(_) => riding += 1,
            RiderPhase::Arrived => delivered += 1,
            _ => {}
        }
    }

    let elevators = w.elevator_ids().len();

    let text = format!(
        "{speed_str}  |  {elevators} elevators\n\
         waiting: {waiting}  riding: {riding}  delivered: {delivered}"
    );

    for mut t in &mut query {
        (**t).clone_from(&text);
    }
}
