//! Translucent shaft spine and floor line rendering.

use bevy::prelude::*;

use super::{PPU, VisualScale};
use crate::palette;
use elevator_core::entity::EntityId;

/// Marker component for the shaft background visual.
#[derive(Component)]
pub struct ShaftVisual;

/// Marker component for floor indicator lines. Used by glow and breathing systems.
#[derive(Component)]
pub struct FloorLine {
    /// The simulation stop entity this floor line represents.
    pub stop_id: EntityId,
    /// Whether this is the transfer floor (Mid-Depths, index 9).
    pub is_transfer: bool,
}

/// Marker component for floor name labels. Used by glow systems.
#[derive(Component)]
#[allow(dead_code)]
pub struct FloorLabel {
    /// The simulation stop entity this label represents.
    pub stop_id: EntityId,
}

/// Spawn a translucent shaft spine at the given x-offset.
#[allow(clippy::too_many_arguments)]
pub fn spawn_shaft(
    commands: &mut Commands,
    meshes: &mut ResMut<Assets<Mesh>>,
    materials: &mut ResMut<Assets<ColorMaterial>>,
    vs: &VisualScale,
    min_pos: f32,
    max_pos: f32,
    x: f32,
    width_mult: f32,
) {
    let shaft_width = vs.shaft_width * width_mult;
    let shaft_height = (max_pos - min_pos).mul_add(PPU, vs.car_height * 4.0);
    let shaft_center_y = f32::midpoint(min_pos, max_pos) * PPU;

    // Shaft fill — barely visible translucent rectangle.
    commands.spawn((
        Mesh2d(meshes.add(Rectangle::new(shaft_width, shaft_height))),
        MeshMaterial2d(materials.add(ColorMaterial::from_color(palette::SHAFT_FILL))),
        Transform::from_xyz(x, shaft_center_y, 0.0),
        ShaftVisual,
    ));

    // Shaft border — thin outline rectangles (left and right edges).
    let border_width = 1.0;
    let border_material = materials.add(ColorMaterial::from_color(palette::SHAFT_BORDER));
    let half_shaft = shaft_width / 2.0;

    for x_sign in [-1.0f32, 1.0] {
        commands.spawn((
            Mesh2d(meshes.add(Rectangle::new(border_width, shaft_height))),
            MeshMaterial2d(border_material.clone()),
            Transform::from_xyz(x_sign.mul_add(half_shaft, x), shaft_center_y, 0.05),
        ));
    }
}

/// Spawn floor indicator lines and labels at each stop position.
///
/// Floor lines use a vertical depth gradient (cool blue at bottom, warm amber at top).
/// The transfer floor (stop index 9, "Mid-Depths") gets a brighter baseline.
pub fn spawn_floor_lines(
    commands: &mut Commands,
    meshes: &mut ResMut<Assets<Mesh>>,
    materials: &mut ResMut<Assets<ColorMaterial>>,
    vs: &VisualScale,
    stop_data: &[(EntityId, f32, String)],
) {
    // Compute position range for gradient interpolation.
    let min_pos = stop_data.iter().map(|s| s.1).fold(f32::INFINITY, f32::min);
    let max_pos = stop_data
        .iter()
        .map(|s| s.1)
        .fold(f32::NEG_INFINITY, f32::max);
    let range = (max_pos - min_pos).max(1.0);

    for (i, (eid, pos, name)) in stop_data.iter().enumerate() {
        let y = *pos * PPU;

        // Vertical gradient: interpolate between FLOOR_BOTTOM (cool) and FLOOR_TOP (warm).
        let t = (*pos - min_pos) / range; // 0.0 at bottom, 1.0 at top
        let bottom = palette::FLOOR_BOTTOM.to_linear();
        let top = palette::FLOOR_TOP.to_linear();
        let gradient_color = Color::linear_rgba(
            bottom.red.mul_add(1.0 - t, top.red * t),
            bottom.green.mul_add(1.0 - t, top.green * t),
            bottom.blue.mul_add(1.0 - t, top.blue * t),
            bottom.alpha.mul_add(1.0 - t, top.alpha * t),
        );

        // Transfer floor (index 9, "Mid-Depths") uses a brighter baseline.
        let floor_color = if i == 9 {
            palette::FLOOR_TRANSFER
        } else {
            gradient_color
        };

        let line_material = materials.add(ColorMaterial::from_color(floor_color));

        // Floor indicator line — spans all shafts.
        commands.spawn((
            Mesh2d(meshes.add(Rectangle::new(vs.floor_line_width, vs.floor_line_thickness))),
            MeshMaterial2d(line_material),
            Transform::from_xyz(0.0, y, 0.1),
            FloorLine {
                stop_id: *eid,
                is_transfer: i == 9,
            },
        ));

        // Floor label — starts dim, positioned to the right of all shafts.
        commands.spawn((
            Text2d::new(name),
            TextFont {
                font_size: vs.font_size,
                ..default()
            },
            TextColor(palette::LABEL_DIM),
            Transform::from_xyz(vs.label_offset_x, y, 0.1),
            FloorLabel { stop_id: *eid },
        ));
    }
}
