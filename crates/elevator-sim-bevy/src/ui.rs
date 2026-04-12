use bevy::prelude::*;
use elevator_sim_core::components::{ElevatorState, RiderState};

use crate::sim_bridge::{SimSpeed, SimulationRes};

/// Marker for the stats HUD text.
#[derive(Component)]
pub struct HudText;

/// Spawn the HUD overlay.
pub fn spawn_hud(mut commands: Commands) {
    commands.spawn((
        Text::new(""),
        TextFont {
            font_size: 16.0,
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

    commands.spawn((
        Text::new("Space: pause | 1: 1x | 2: 2x | 3: 10x"),
        TextFont {
            font_size: 13.0,
            ..default()
        },
        TextColor(Color::srgba(0.6, 0.6, 0.6, 1.0)),
        Node {
            position_type: PositionType::Absolute,
            bottom: Val::Px(10.0),
            left: Val::Px(10.0),
            ..default()
        },
    ));
}

/// Update the HUD each frame with detailed stats.
pub fn update_hud(
    sim: Res<SimulationRes>,
    speed: Res<SimSpeed>,
    mut query: Query<&mut Text, With<HudText>>,
) {
    let w = &sim.sim.world;

    let speed_str = if speed.multiplier == 0 {
        "PAUSED".to_string()
    } else {
        format!("{}x", speed.multiplier)
    };

    // First elevator stats.
    let Some((elev_eid, elev_pos, car)) = w.elevators().next() else {
        return;
    };

    let state_str = match car.state {
        ElevatorState::Idle => "Idle".to_string(),
        ElevatorState::MovingToStop(stop_eid) => {
            let name = w
                .stop_data
                .get(stop_eid)
                .map(|s| s.name.as_str())
                .unwrap_or("?");
            format!("Moving -> {name}")
        }
        ElevatorState::DoorOpening => "Doors opening".to_string(),
        ElevatorState::Loading => "Loading".to_string(),
        ElevatorState::DoorClosing => "Doors closing".to_string(),
        ElevatorState::Stopped => "Stopped".to_string(),
    };

    let velocity = w
        .velocities
        .get(elev_eid)
        .map(|v| v.value.abs())
        .unwrap_or(0.0);
    let speed_display = format!("{:.1}", velocity);

    let eta_str = if let ElevatorState::MovingToStop(stop_eid) = car.state {
        if let Some(target_pos) = w.stop_position(stop_eid) {
            let dist = (target_pos - elev_pos.value).abs();
            if velocity > 0.001 {
                let eta_secs = dist / velocity;
                if eta_secs > 60.0 {
                    format!(
                        "{:.0}m {:.0}s",
                        (eta_secs / 60.0).floor(),
                        eta_secs % 60.0
                    )
                } else {
                    format!("{:.1}s", eta_secs)
                }
            } else {
                "calculating...".to_string()
            }
        } else {
            "-".to_string()
        }
    } else {
        "-".to_string()
    };

    // Rider counts.
    let on_board = w
        .riders()
        .filter(|(_, r)| matches!(r.state, RiderState::Riding(_) | RiderState::Boarding(_)))
        .count();
    let boarding = w
        .riders()
        .filter(|(_, r)| matches!(r.state, RiderState::Boarding(_)))
        .count();
    let alighting = w
        .riders()
        .filter(|(_, r)| matches!(r.state, RiderState::Alighting(_)))
        .count();
    let waiting = w
        .riders()
        .filter(|(_, r)| r.state == RiderState::Waiting)
        .count();
    let delivered = w
        .riders()
        .filter(|(_, r)| r.state == RiderState::Arrived)
        .count();

    let load_kg = car.current_load;
    let capacity_kg = car.weight_capacity;
    let load_pct = if capacity_kg > 0.0 {
        (load_kg / capacity_kg) * 100.0
    } else {
        0.0
    };

    let positions: Vec<f64> = w.stops().map(|(_, s)| s.position).collect();
    let min_pos = positions.iter().copied().fold(f64::INFINITY, f64::min);
    let max_pos = positions.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    let span = max_pos - min_pos;
    let pos_pct = if span > 0.0 {
        ((elev_pos.value - min_pos) / span) * 100.0
    } else {
        0.0
    };

    let transfer_str = if boarding > 0 && alighting > 0 {
        format!("  [{boarding} boarding, {alighting} alighting]")
    } else if boarding > 0 {
        format!("  [{boarding} boarding]")
    } else if alighting > 0 {
        format!("  [{alighting} alighting]")
    } else {
        String::new()
    };

    let text = format!(
        "\
Tick: {}  |  {speed_str}
---
State: {state_str}
Position: {pos_pct:.1}%  |  Speed: {speed_display} u/s
Mass: {load_kg:.0} / {capacity_kg:.0} kg ({load_pct:.0}%)
ETA: {eta_str}
---
On board: {on_board}{transfer_str}
Waiting: {waiting}
Delivered: {delivered}",
        sim.sim.tick
    );

    for mut t in &mut query {
        **t = text.clone();
    }
}
