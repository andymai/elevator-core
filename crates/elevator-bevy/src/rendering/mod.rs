//! Visual rendering of the bioluminescent building — shaft, elevators, riders.

/// Glowing capsule elevator car rendering.
pub mod elevator;
/// Behavioral glowing speck rider rendering.
pub mod rider;
/// Translucent shaft spine rendering.
pub mod shaft;

use bevy::prelude::*;
use elevator_core::entity::EntityId;
use elevator_core::ids::GroupId;
use std::collections::HashMap;

use crate::sim_bridge::SimulationRes;

/// Pre-allocated mesh handles shared across particle/trail systems.
#[derive(Resource)]
pub struct SharedMeshes {
    /// Circle(4.0) — local elevator trail segments.
    pub trail_local: Handle<Mesh>,
    /// Circle(6.0) — express elevator trail segments.
    pub trail_express: Handle<Mesh>,
    /// Circle(9.0) — express elevator trail segments at high speed.
    pub trail_express_fast: Handle<Mesh>,
    /// Circle(2.0) — sparkle particles.
    pub sparkle: Handle<Mesh>,
    /// Circle(1.0) — arrival rings (scaled at runtime).
    pub arrival_ring: Handle<Mesh>,
    /// Circle(2.5) — transfer arc particles.
    pub transfer_arc: Handle<Mesh>,
}

/// Pixels per simulation distance unit.
pub const PPU: f32 = 40.0;

/// Index of the transfer floor in the stop list (Mid-Depths).
pub const TRANSFER_STOP_INDEX: usize = 9;

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
    /// Horizontal spacing between adjacent shaft centers.
    pub shaft_spacing: f32,
    /// Extra gap between local and express shaft groups.
    pub group_gap: f32,
}

impl VisualScale {
    /// Compute visual scale factors from the total shaft span (in sim units).
    #[must_use]
    pub fn from_shaft_span(span: f32, min_pos: f32, max_pos: f32, line_count: usize) -> Self {
        let base_height = 15.0 * PPU;
        let actual_height = span * PPU;
        let s = (actual_height / base_height).max(1.0);

        // Scale spacing based on number of lines to keep things readable.
        let shaft_spacing = 30.0 * s;
        let group_gap = 50.0 * s;

        // Floor line width spans all shafts plus some margin.
        let total_shaft_span = if line_count > 1 {
            shaft_spacing * (line_count as f32 - 1.0) + group_gap
        } else {
            0.0
        };
        let floor_line_width = 60.0f32.mul_add(s, total_shaft_span);

        Self {
            shaft_width: 12.0 * s,
            car_width: 20.0 * s,
            car_height: 8.0 * s,
            rider_radius: 3.5 * s,
            waiting_x_offset: -30.0 * s,
            floor_line_width,
            floor_line_thickness: 1.0 * s,
            label_offset_x: 40.0f32.mul_add(s, total_shaft_span / 2.0),
            font_size: 8.0 * s,
            rider_spacing: 6.0 * s,
            y_min: min_pos * PPU,
            y_max: max_pos * PPU,
            shaft_spacing,
            group_gap,
        }
    }
}

/// Stop metadata cached at spawn time for glow and label systems.
#[derive(Resource)]
pub struct StopRegistry {
    /// (`EntityId`, world Y position, name) for each stop.
    pub stops: Vec<(EntityId, f32, String)>,
}

/// Maps line entity IDs to their horizontal x-position in world space.
#[derive(Resource)]
pub struct LineLayout {
    /// Line entity ID to x-position mapping.
    pub positions: HashMap<EntityId, f32>,
    /// Line entity ID to group ID mapping.
    pub line_groups: HashMap<EntityId, GroupId>,
}

impl LineLayout {
    /// Get the x-position for a line, defaulting to 0.0.
    pub fn x_for_line(&self, line: EntityId) -> f32 {
        self.positions.get(&line).copied().unwrap_or(0.0)
    }

    /// Check if a line belongs to the express group (GroupId(1)).
    pub fn is_express(&self, line: EntityId) -> bool {
        self.line_groups.get(&line).is_some_and(|g| g.0 == 1)
    }
}

/// Spawn all building visuals: shafts, floor lines, floor labels, elevator capsules.
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

    // Build line layout: compute x-positions for each line.
    let groups = sim.sim.groups();
    let all_lines = sim.sim.all_lines();
    let line_count = all_lines.len();
    let vs = VisualScale::from_shaft_span(span, min_pos, max_pos, line_count);

    let mut line_positions: HashMap<EntityId, f32> = HashMap::new();
    let mut line_groups: HashMap<EntityId, GroupId> = HashMap::new();

    // Assign x-positions: local lines clustered on the left, express on the right with a gap.
    let mut x_cursor = 0.0f32;
    for (gi, group) in groups.iter().enumerate() {
        if gi > 0 {
            // Gap between groups.
            x_cursor += vs.group_gap;
        }
        for (li, line_info) in group.lines().iter().enumerate() {
            if li > 0 {
                x_cursor += vs.shaft_spacing;
            }
            line_positions.insert(line_info.entity(), x_cursor);
            line_groups.insert(line_info.entity(), group.id());
        }
    }

    // Center the layout so the midpoint is at x=0.
    let x_min = line_positions
        .values()
        .copied()
        .fold(f32::INFINITY, f32::min);
    let x_max = line_positions
        .values()
        .copied()
        .fold(f32::NEG_INFINITY, f32::max);
    let center_x = f32::midpoint(x_min, x_max);
    for x in line_positions.values_mut() {
        *x -= center_x;
    }

    let layout = LineLayout {
        positions: line_positions,
        line_groups,
    };

    // Spawn one shaft per line.
    for (line_eid, &x) in &layout.positions {
        let is_express = layout.is_express(*line_eid);
        let width_mult = if is_express { 1.5 } else { 1.0 };
        shaft::spawn_shaft(
            &mut commands,
            &mut meshes,
            &mut materials,
            &vs,
            min_pos,
            max_pos,
            x,
            width_mult,
        );
    }

    // Spawn floor lines spanning all shafts, and labels on the right.
    shaft::spawn_floor_lines(&mut commands, &mut meshes, &mut materials, &vs, &stop_data);

    // Spawn elevator capsules with line-aware positioning.
    elevator::spawn_elevators(
        &mut commands,
        &mut meshes,
        &mut materials,
        &vs,
        w,
        &sim.sim,
        &layout,
    );

    // Spawn rider material resources.
    rider::init_rider_materials(&mut commands, &mut materials);

    // Pre-allocate shared mesh handles for particle/trail systems.
    let shared_meshes = SharedMeshes {
        trail_local: meshes.add(Circle::new(4.0)),
        trail_express: meshes.add(Circle::new(6.0)),
        trail_express_fast: meshes.add(Circle::new(9.0)),
        sparkle: meshes.add(Circle::new(2.0)),
        arrival_ring: meshes.add(Circle::new(1.0)),
        transfer_arc: meshes.add(Circle::new(2.5)),
    };

    commands.insert_resource(shared_meshes);
    commands.insert_resource(StopRegistry { stops: stop_data });
    commands.insert_resource(layout);
    commands.insert_resource(vs);
}
