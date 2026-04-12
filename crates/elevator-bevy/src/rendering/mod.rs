//! Visual rendering of the bioluminescent building — shaft, elevators, riders.

/// Glowing capsule elevator car rendering.
pub mod elevator;
/// Behavioral glowing speck rider rendering.
pub mod rider;
/// Translucent shaft spine rendering.
pub mod shaft;

use bevy::prelude::*;
use elevator_core::entity::EntityId;

use crate::sim_bridge::SimulationRes;

/// Pixels per simulation distance unit.
pub const PPU: f32 = 40.0;

/// Holds computed visual sizes that scale with the shaft height.
#[derive(Resource)]
pub struct VisualScale {
    /// Width of the shaft background rectangle.
    pub shaft_width: f32,
    /// Width of each elevator capsule.
    pub car_width: f32,
    /// Height of each elevator capsule.
    pub car_height: f32,
    /// Radius of rider speck circles.
    pub rider_radius: f32,
    /// Horizontal offset for waiting riders from the shaft center.
    pub waiting_x_offset: f32,
    /// Width of the horizontal floor indicator lines.
    pub floor_line_width: f32,
    /// Thickness of the horizontal floor indicator lines.
    pub floor_line_thickness: f32,
    /// Horizontal offset for floor name labels.
    pub label_offset_x: f32,
    /// Font size for floor labels.
    pub font_size: f32,
    /// Spacing between rider specks.
    pub rider_spacing: f32,
    /// Minimum Y in world coords (bottom of building). Used by glow systems.
    #[allow(dead_code)]
    pub y_min: f32,
    /// Maximum Y in world coords (top of building). Used by glow systems.
    #[allow(dead_code)]
    pub y_max: f32,
}

impl VisualScale {
    /// Compute visual scale factors from the total shaft span (in sim units).
    #[must_use]
    pub fn from_shaft_span(span: f32, min_pos: f32, max_pos: f32) -> Self {
        let base_height = 15.0 * PPU;
        let actual_height = span * PPU;
        let s = (actual_height / base_height).max(1.0);

        Self {
            shaft_width: 12.0 * s,
            car_width: 20.0 * s,
            car_height: 8.0 * s,
            rider_radius: 2.5 * s,
            waiting_x_offset: -30.0 * s,
            floor_line_width: 60.0 * s,
            floor_line_thickness: 1.0 * s,
            label_offset_x: 40.0 * s,
            font_size: 8.0 * s,
            rider_spacing: 6.0 * s,
            y_min: min_pos * PPU,
            y_max: max_pos * PPU,
        }
    }
}

/// Stop metadata cached at spawn time for glow and label systems.
#[derive(Resource)]
#[allow(dead_code)]
pub struct StopRegistry {
    /// (`EntityId`, world Y position, name) for each stop.
    pub stops: Vec<(EntityId, f32, String)>,
}

/// Spawn all building visuals: shaft, floor lines, floor labels, elevator capsules.
#[allow(clippy::needless_pass_by_value)]
pub fn spawn_building_visuals(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<ColorMaterial>>,
    sim: Res<SimulationRes>,
) {
    let w = sim.sim.world();
    let stop_data: Vec<(EntityId, f32, String)> = w
        .iter_stops()
        .map(|(eid, s)| (eid, s.position() as f32, s.name().to_owned()))
        .collect();

    if stop_data.is_empty() {
        return;
    }

    let min_pos = stop_data.iter().map(|s| s.1).fold(f32::INFINITY, f32::min);
    let max_pos = stop_data
        .iter()
        .map(|s| s.1)
        .fold(f32::NEG_INFINITY, f32::max);
    let span = max_pos - min_pos;
    let vs = VisualScale::from_shaft_span(span, min_pos, max_pos);

    // Spawn shaft.
    shaft::spawn_shaft(
        &mut commands,
        &mut meshes,
        &mut materials,
        &vs,
        min_pos,
        max_pos,
    );

    // Spawn floor lines and labels.
    shaft::spawn_floor_lines(&mut commands, &mut meshes, &mut materials, &vs, &stop_data);

    // Spawn elevator capsules.
    elevator::spawn_elevators(&mut commands, &mut meshes, &mut materials, &vs, w);

    // Spawn rider material resources.
    rider::init_rider_materials(&mut commands, &mut materials);

    commands.insert_resource(StopRegistry { stops: stop_data });
    commands.insert_resource(vs);
}
