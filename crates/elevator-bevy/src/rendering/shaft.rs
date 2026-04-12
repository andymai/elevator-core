//! Translucent shaft spine and floor line rendering.

use bevy::prelude::*;

use super::{PPU, VisualScale};
use crate::palette;
use elevator_core::entity::EntityId;

/// Marker component for the shaft background visual.
#[derive(Component)]
pub struct ShaftVisual;

/// Marker component for floor indicator lines. Used by glow systems.
#[derive(Component)]
#[allow(dead_code)]
pub struct FloorLine {
    /// The simulation stop entity this floor line represents.
    pub stop_id: EntityId,
}

/// Marker component for floor name labels. Used by glow systems.
#[derive(Component)]
#[allow(dead_code)]
pub struct FloorLabel {
    /// The simulation stop entity this label represents.
    pub stop_id: EntityId,
}

/// Spawn the translucent shaft spine.
pub fn spawn_shaft(
    commands: &mut Commands,
    meshes: &mut ResMut<Assets<Mesh>>,
    materials: &mut ResMut<Assets<ColorMaterial>>,
    vs: &VisualScale,
    min_pos: f32,
    max_pos: f32,
) {
    let shaft_height = (max_pos - min_pos).mul_add(PPU, vs.car_height * 4.0);
    let shaft_center_y = f32::midpoint(min_pos, max_pos) * PPU;

    // Shaft fill — barely visible translucent rectangle.
    commands.spawn((
        Mesh2d(meshes.add(Rectangle::new(vs.shaft_width, shaft_height))),
        MeshMaterial2d(materials.add(ColorMaterial::from_color(palette::SHAFT_FILL))),
        Transform::from_xyz(0.0, shaft_center_y, 0.0),
        ShaftVisual,
    ));

    // Shaft border — thin outline rectangles (left and right edges).
    let border_width = 1.0;
    let border_material = materials.add(ColorMaterial::from_color(palette::SHAFT_BORDER));
    let half_shaft = vs.shaft_width / 2.0;

    for x_sign in [-1.0f32, 1.0] {
        commands.spawn((
            Mesh2d(meshes.add(Rectangle::new(border_width, shaft_height))),
            MeshMaterial2d(border_material.clone()),
            Transform::from_xyz(x_sign * half_shaft, shaft_center_y, 0.05),
        ));
    }
}

/// Spawn floor indicator lines and labels at each stop position.
pub fn spawn_floor_lines(
    commands: &mut Commands,
    meshes: &mut ResMut<Assets<Mesh>>,
    materials: &mut ResMut<Assets<ColorMaterial>>,
    vs: &VisualScale,
    stop_data: &[(EntityId, f32, String)],
) {
    let line_material = materials.add(ColorMaterial::from_color(palette::FLOOR_DIM));

    for (eid, pos, name) in stop_data {
        let y = *pos * PPU;

        // Floor indicator line.
        commands.spawn((
            Mesh2d(meshes.add(Rectangle::new(vs.floor_line_width, vs.floor_line_thickness))),
            MeshMaterial2d(line_material.clone()),
            Transform::from_xyz(0.0, y, 0.1),
            FloorLine { stop_id: *eid },
        ));

        // Floor label — starts dim.
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
