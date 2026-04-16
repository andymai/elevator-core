//! HUD overlay displaying simulation statistics and elevator status.

use bevy::prelude::*;
use elevator_core::components::{ElevatorPhase, RiderPhase};

use crate::sim_bridge::{HallCallEventCounters, SimSpeed, SimulationRes};

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
#[allow(clippy::needless_pass_by_value, clippy::too_many_lines)]
pub fn update_hud(
    sim: Res<SimulationRes>,
    speed: Res<SimSpeed>,
    events: Res<HallCallEventCounters>,
    mut query: Query<&mut Text, With<HudText>>,
) {
    let w = sim.sim.world();

    let speed_str = if speed.multiplier == 0 {
        "PAUSED".to_string()
    } else {
        format!("{}x", speed.multiplier)
    };

    // First elevator stats.
    let Some((elev_eid, elev_pos, car)) = w.iter_elevators().next() else {
        return;
    };

    let state_str = match car.phase() {
        ElevatorPhase::Idle => "Idle".to_string(),
        ElevatorPhase::MovingToStop(stop_eid) => {
            let name = w.stop(stop_eid).map_or("?", |s| s.name());
            format!("Moving -> {name}")
        }
        ElevatorPhase::Repositioning(stop_eid) => {
            let name = w.stop(stop_eid).map_or("?", |s| s.name());
            format!("Repositioning -> {name}")
        }
        ElevatorPhase::DoorOpening => "Doors opening".to_string(),
        ElevatorPhase::Loading => "Loading".to_string(),
        ElevatorPhase::DoorClosing => "Doors closing".to_string(),
        ElevatorPhase::Stopped => "Stopped".to_string(),
        _ => "Unknown".to_string(),
    };

    let velocity = w.velocity(elev_eid).map_or(0.0, |v| v.value().abs());
    let speed_display = format!("{velocity:.1}");

    #[allow(clippy::option_if_let_else)]
    let eta_str = if let Some(stop_eid) = car.phase().moving_target() {
        if let Some(target_pos) = w.stop_position(stop_eid) {
            let dist = (target_pos - elev_pos.value()).abs();
            if velocity > 0.001 {
                let eta_secs = dist / velocity;
                if eta_secs > 60.0 {
                    format!("{:.0}m {:.0}s", (eta_secs / 60.0).floor(), eta_secs % 60.0)
                } else {
                    format!("{eta_secs:.1}s")
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

    // Rider counts — single pass.
    let (mut on_board, mut boarding, mut exiting, mut waiting, mut delivered) = (0, 0, 0, 0, 0);
    for (_, r) in w.iter_riders() {
        match r.phase() {
            RiderPhase::Boarding(_) => {
                boarding += 1;
                on_board += 1;
            }
            RiderPhase::Riding(_) => {
                on_board += 1;
            }
            RiderPhase::Exiting(_) => {
                exiting += 1;
            }
            RiderPhase::Waiting => {
                waiting += 1;
            }
            RiderPhase::Arrived => {
                delivered += 1;
            }
            _ => {}
        }
    }

    let load_kg = car.current_load().value();
    let capacity_kg = car.weight_capacity().value();
    let load_pct = if capacity_kg > 0.0 {
        (load_kg / capacity_kg) * 100.0
    } else {
        0.0
    };

    let positions: Vec<f64> = w.iter_stops().map(|(_, s)| s.position()).collect();
    let min_pos = positions.iter().copied().fold(f64::INFINITY, f64::min);
    let max_pos = positions.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    let span = max_pos - min_pos;
    let pos_pct = if span > 0.0 {
        ((elev_pos.value() - min_pos) / span) * 100.0
    } else {
        0.0
    };

    let transfer_str = if boarding > 0 && exiting > 0 {
        format!("  [{boarding} boarding, {exiting} exiting]")
    } else if boarding > 0 {
        format!("  [{boarding} boarding]")
    } else if exiting > 0 {
        format!("  [{exiting} exiting]")
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
Delivered: {delivered}
---
Hall press: {hp}  Ack: {ack}  Cleared: {cl}
Car press: {cp}  Balked: {balk}",
        sim.sim.current_tick(),
        hp = events.button_pressed,
        ack = events.acknowledged,
        cl = events.cleared,
        cp = events.car_button_pressed,
        balk = events.balked,
    );

    for mut t in &mut query {
        (**t).clone_from(&text);
    }
}
