//! Vascular network — continuous vertical vein segments between adjacent floors per shaft line.
//!
//! Each shaft gets thin glowing line segments that illuminate as elevators pass through them,
//! creating a circulatory-system effect.

use bevy::prelude::*;

use crate::breathing::BreathPhase;
use crate::palette;
use crate::rendering::{LineLayout, PPU, StopRegistry, VisualScale};
use crate::sim_bridge::SimulationRes;
use elevator_core::entity::EntityId;

/// A single vein segment between two adjacent floor positions within a shaft line.
#[derive(Component)]
pub struct VascularSegment {
    /// Which shaft line this segment belongs to.
    line_entity: EntityId,
    /// Bottom floor y (pixels).
    from_y: f32,
    /// Top floor y (pixels).
    to_y: f32,
    /// Current brightness: 0.0 = dim baseline, 1.0 = fully lit.
    brightness: f32,
    /// Whether this line belongs to the express group.
    is_express: bool,
}

/// Spawn vascular vein segments for each line between consecutive floor positions.
#[allow(clippy::needless_pass_by_value)]
pub fn spawn_vascular(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<ColorMaterial>>,
    sim: Res<SimulationRes>,
    registry: Res<StopRegistry>,
    layout: Res<LineLayout>,
    vs: Res<VisualScale>,
) {
    // Collect sorted floor y-positions for each line based on stops it serves.
    let groups = sim.sim.groups();

    for group in groups {
        for line_info in group.lines() {
            let line_eid = line_info.entity();
            let x = layout.x_for_line(line_eid);
            let is_express = layout.is_express(line_eid);

            // Gather floor positions served by this line, sorted.
            let served_stops = line_info.serves();
            let mut floor_ys: Vec<f32> = served_stops
                .iter()
                .filter_map(|stop_eid| {
                    registry
                        .stops
                        .iter()
                        .find(|(eid, _, _)| *eid == *stop_eid)
                        .map(|(_, pos, _)| *pos * PPU)
                })
                .collect();
            floor_ys.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
            floor_ys.dedup();

            // Dim baseline color for this group.
            let base_color = if is_express {
                palette::CAR_CORE_EXPRESS
            } else {
                palette::CAR_CORE_LOCAL
            };
            let lin = base_color.to_linear();
            let dim_color = Color::linear_rgba(lin.red, lin.green, lin.blue, 0.08);

            // Spawn a thin rectangle between each pair of consecutive floors.
            let segment_width = 1.5 * vs.shaft_width / 12.0; // scale with visual scale
            for pair in floor_ys.windows(2) {
                let from_y = pair[0];
                let to_y = pair[1];
                let height = to_y - from_y;
                let center_y = f32::midpoint(from_y, to_y);

                let mat = materials.add(ColorMaterial::from_color(dim_color));

                commands.spawn((
                    Mesh2d(meshes.add(Rectangle::new(segment_width, height))),
                    MeshMaterial2d(mat),
                    Transform::from_xyz(x, center_y, 0.02),
                    VascularSegment {
                        line_entity: line_eid,
                        from_y,
                        to_y,
                        brightness: 0.0,
                        is_express,
                    },
                ));
            }
        }
    }
}

/// Update vascular segment brightness based on elevator proximity and global breathing.
#[allow(clippy::needless_pass_by_value)]
pub fn update_vascular(
    time: Res<Time>,
    sim: Res<SimulationRes>,
    breath: Res<BreathPhase>,
    mut segments: Query<(&mut VascularSegment, &MeshMaterial2d<ColorMaterial>)>,
    mut materials: ResMut<Assets<ColorMaterial>>,
) {
    let w = sim.sim.world();
    let dt = time.delta_secs();

    // Collect elevator positions per line.
    let mut elevator_ys_per_line: std::collections::HashMap<EntityId, Vec<f32>> =
        std::collections::HashMap::new();
    for (eid, pos, _elev) in w.iter_elevators() {
        let y = pos.value() as f32 * PPU;
        if let Some(line_eid) = sim.sim.line_for_elevator(eid) {
            elevator_ys_per_line.entry(line_eid).or_default().push(y);
        }
    }

    // Global breathing modulation for the baseline.
    let breath_mod = breath.factor().mul_add(0.3, 1.0); // 0.7..1.3

    for (mut seg, mat_handle) in &mut segments {
        // Check if any elevator on this line is within this segment's range.
        let elevator_in_range = elevator_ys_per_line
            .get(&seg.line_entity)
            .is_some_and(|ys| ys.iter().any(|&ey| ey >= seg.from_y && ey <= seg.to_y));

        if elevator_in_range {
            seg.brightness = 1.0;
        } else {
            // Decay toward 0.0.
            seg.brightness = dt.mul_add(-2.0, seg.brightness).max(0.0);
        }

        // Compute color: lerp between dim baseline and group color based on brightness.
        let base_color = if seg.is_express {
            palette::CAR_CORE_EXPRESS
        } else {
            palette::CAR_CORE_LOCAL
        };
        let lin = base_color.to_linear();

        // Dim baseline alpha modulated by breathing.
        let dim_alpha = 0.08 * breath_mod;
        let bright_alpha = lin.alpha.max(0.6);
        let alpha = (bright_alpha - dim_alpha).mul_add(seg.brightness, dim_alpha);

        // Color intensity also increases with brightness.
        let intensity = 0.7f32.mul_add(seg.brightness, 0.3);

        if let Some(mat) = materials.get_mut(mat_handle.id()) {
            mat.color = Color::linear_rgba(
                lin.red * intensity,
                lin.green * intensity,
                lin.blue * intensity,
                alpha,
            );
        }
    }
}
