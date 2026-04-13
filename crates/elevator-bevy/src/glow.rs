//! Floor activity glow — floor lines brighten when riders wait or elevators arrive.
//! Labels fade in when active, fade out when idle.

use bevy::prelude::*;

use std::f32::consts::TAU;

use crate::breathing::BreathPhase;
use crate::palette;
use crate::rendering::StopRegistry;
use crate::rendering::shaft::{FloorLabel, FloorLine};
use crate::sim_bridge::SimulationRes;
use elevator_core::components::RiderPhase;
use elevator_core::entity::EntityId;

/// Proximity threshold in sim units for considering an elevator "at" a stop.
const ELEVATOR_PROXIMITY: f32 = 0.1;

/// Update floor line colors based on nearby activity.
/// Transfer floor pulses at 2x the global breathing rate.
#[allow(clippy::needless_pass_by_value)]
pub fn update_floor_glow(
    sim: Res<SimulationRes>,
    registry: Res<StopRegistry>,
    breath: Res<BreathPhase>,
    mut floor_lines: Query<(&FloorLine, &mut MeshMaterial2d<ColorMaterial>)>,
    mut materials: ResMut<Assets<ColorMaterial>>,
) {
    let w = sim.sim.world();

    // Count waiting riders per stop.
    let mut waiting_stops: std::collections::HashSet<EntityId> = std::collections::HashSet::new();
    for (_, rider) in w.iter_riders() {
        if rider.phase() == RiderPhase::Waiting
            && let Some(stop_id) = rider.current_stop()
        {
            waiting_stops.insert(stop_id);
        }
    }

    // Check which stops have an elevator nearby (comparison in sim units).
    let mut elevator_stops: std::collections::HashSet<EntityId> = std::collections::HashSet::new();
    for (_eid, pos, _elev) in w.iter_elevators() {
        for (stop_eid, stop_y, _) in &registry.stops {
            let dist = (pos.value() as f32 - *stop_y).abs();
            if dist < ELEVATOR_PROXIMITY {
                elevator_stops.insert(*stop_eid);
            }
        }
    }

    for (floor_line, mat_handle) in &mut floor_lines {
        let has_elevator = elevator_stops.contains(&floor_line.stop_id);
        let has_riders = waiting_stops.contains(&floor_line.stop_id);

        let mut color = if has_elevator {
            palette::FLOOR_ELEVATOR
        } else if has_riders {
            palette::FLOOR_ACTIVE
        } else if floor_line.is_transfer {
            palette::FLOOR_TRANSFER
        } else {
            palette::FLOOR_DIM
        };

        // Transfer floor pulses at 2x the global breathing rate.
        if floor_line.is_transfer {
            let transfer_pulse = (breath.elapsed * 0.14 * TAU).sin(); // 2x frequency
            let lin = color.to_linear();
            let alpha_mod = 1.0 + transfer_pulse * 0.2;
            color = Color::linear_rgba(
                lin.red,
                lin.green,
                lin.blue,
                (lin.alpha * alpha_mod).clamp(0.0, 1.0),
            );
        }

        if let Some(mat) = materials.get_mut(mat_handle.id()) {
            mat.color = color;
        }
    }
}

/// Fade floor labels in when active, out when idle.
#[allow(clippy::needless_pass_by_value)]
pub fn update_floor_labels(
    sim: Res<SimulationRes>,
    registry: Res<StopRegistry>,
    mut labels: Query<(&FloorLabel, &mut TextColor)>,
) {
    let w = sim.sim.world();

    // Same activity detection — any waiting riders or nearby elevator.
    let mut active_stops: std::collections::HashSet<EntityId> = std::collections::HashSet::new();
    for (_, rider) in w.iter_riders() {
        if rider.phase() == RiderPhase::Waiting
            && let Some(stop_id) = rider.current_stop()
        {
            active_stops.insert(stop_id);
        }
    }
    for (_eid, pos, _elev) in w.iter_elevators() {
        for (stop_eid, stop_y, _) in &registry.stops {
            let dist = (pos.value() as f32 - *stop_y).abs();
            if dist < ELEVATOR_PROXIMITY {
                active_stops.insert(*stop_eid);
            }
        }
    }

    for (label, mut text_color) in &mut labels {
        let is_active = active_stops.contains(&label.stop_id);
        text_color.0 = if is_active {
            palette::LABEL_ACTIVE
        } else {
            palette::LABEL_DIM
        };
    }
}
