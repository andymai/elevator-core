use bevy::prelude::*;
use elevator_sim_core::elevator::ElevatorState;
use elevator_sim_core::passenger::PassengerState;

use crate::sim_bridge::{SimSpeed, SimulationRes};

/// Marker for the stats HUD text.
#[derive(Component)]
pub struct HudText;

/// Spawn the HUD overlay.
pub fn spawn_hud(mut commands: Commands) {
    // Main stats panel — top left.
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

    // Instructions — bottom left.
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
    let s = &sim.sim;

    // Speed display.
    let speed_str = if speed.multiplier == 0 {
        "PAUSED".to_string()
    } else {
        format!("{}x", speed.multiplier)
    };

    // Elevator stats (first elevator for now).
    let elev = &s.elevators[0];

    // State string.
    let state_str = match elev.state {
        ElevatorState::Idle => "Idle".to_string(),
        ElevatorState::MovingToStop(sid) => {
            let name = s.stops.iter().find(|st| st.id == sid)
                .map(|st| st.name.as_str())
                .unwrap_or("?");
            format!("Moving -> {name}")
        }
        ElevatorState::DoorOpening => "Doors opening".to_string(),
        ElevatorState::Loading => "Loading".to_string(),
        ElevatorState::DoorClosing => "Doors closing".to_string(),
        ElevatorState::Stopped => "Stopped".to_string(),
    };

    // Speed in distance units per second.
    let velocity = elev.velocity.abs();
    let speed_val = velocity; // units/tick * ticks/sec = units/sec ... velocity is already in units/tick*dt
    // velocity is updated by: v + accel * dt, position by: v * dt
    // so velocity is in units/sec (since position += velocity * dt).
    let speed_display = format!("{:.1}", speed_val);

    // ETA to target stop.
    let eta_str = if let ElevatorState::MovingToStop(sid) = elev.state {
        if let Some(target) = s.stops.iter().find(|st| st.id == sid) {
            let dist = (target.position - elev.position).abs();
            if velocity > 0.001 {
                let eta_secs = dist / velocity;
                if eta_secs > 60.0 {
                    format!("{:.0}m {:.0}s", (eta_secs / 60.0).floor(), eta_secs % 60.0)
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

    // Passenger counts.
    let on_board = s.passengers.iter()
        .filter(|p| matches!(p.state, PassengerState::Riding(_) | PassengerState::Boarding(_)))
        .count();
    let boarding = s.passengers.iter()
        .filter(|p| matches!(p.state, PassengerState::Boarding(_)))
        .count();
    let alighting = s.passengers.iter()
        .filter(|p| matches!(p.state, PassengerState::Alighting(_)))
        .count();
    let waiting = s.passengers.iter()
        .filter(|p| p.state == PassengerState::Waiting)
        .count();
    let delivered = s.passengers.iter()
        .filter(|p| p.state == PassengerState::Arrived)
        .count();

    // Mass.
    let load_kg = elev.current_load;
    let capacity_kg = elev.weight_capacity;
    let load_pct = if capacity_kg > 0.0 { (load_kg / capacity_kg) * 100.0 } else { 0.0 };

    // Position as percentage of shaft.
    let min_pos = s.stops.iter().map(|st| st.position).fold(f64::INFINITY, f64::min);
    let max_pos = s.stops.iter().map(|st| st.position).fold(f64::NEG_INFINITY, f64::max);
    let span = max_pos - min_pos;
    let pos_pct = if span > 0.0 { ((elev.position - min_pos) / span) * 100.0 } else { 0.0 };

    // Build boarding/alighting indicator.
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
        s.tick
    );

    for mut t in &mut query {
        **t = text.clone();
    }
}
