//! Visual rendering of elevator shafts, cars, stops, and riders.

use bevy::prelude::*;
use elevator_core::components::RiderPhase;
use elevator_core::entity::EntityId;
use std::hash::{Hash, Hasher};

use crate::sim_bridge::SimulationRes;

/// Pixels per simulation distance unit.
pub const PPU: f32 = 40.0;

/// Holds computed visual sizes that scale with the shaft height.
#[derive(Resource)]
pub struct VisualScale {
    /// Width of the shaft background rectangle.
    pub shaft_width: f32,
    /// Width of each elevator car rectangle.
    pub car_width: f32,
    /// Height of each elevator car rectangle.
    pub car_height: f32,
    /// Radius of rider circles.
    pub rider_radius: f32,
    /// Horizontal offset for waiting riders from the shaft center.
    pub waiting_x_offset: f32,
    /// Width of the horizontal stop indicator lines.
    pub stop_line_width: f32,
    /// Thickness of the horizontal stop indicator lines.
    pub stop_line_thickness: f32,
    /// Horizontal offset for stop name labels.
    pub label_offset_x: f32,
    /// Font size for stop labels and text.
    pub font_size: f32,
    /// Spacing between rider circles.
    pub rider_spacing: f32,
}

impl VisualScale {
    /// Compute visual scale factors from the total shaft span (in sim units).
    fn from_shaft_span(span: f32) -> Self {
        let base_height = 15.0 * PPU;
        let actual_height = span * PPU;
        let s = (actual_height / base_height).max(1.0);

        Self {
            shaft_width: 10.0 * s,
            car_width: 80.0 * s,
            car_height: 30.0 * s,
            rider_radius: 6.0 * s,
            waiting_x_offset: -60.0 * s,
            stop_line_width: 100.0 * s,
            stop_line_thickness: 2.0 * s,
            label_offset_x: 70.0 * s,
            font_size: 14.0 * s,
            rider_spacing: 14.0 * s,
        }
    }
}

/// Marker component for the shaft background visual.
#[derive(Component)]
pub struct ShaftVisual;

/// Marker component linking a Bevy entity to a simulation elevator.
#[derive(Component)]
pub struct ElevatorVisual {
    /// The simulation entity ID of this elevator.
    pub entity_id: EntityId,
}

/// Marker component for stop indicator lines.
#[derive(Component)]
pub struct StopVisual;

/// Marker component for stop name labels.
#[derive(Component)]
pub struct StopLabel;

/// Marker component linking a Bevy entity to a simulation rider.
#[derive(Component)]
pub struct RiderVisual {
    /// The simulation entity ID of this rider.
    pub entity_id: EntityId,
}

/// Pre-allocated material handles per rider phase.
#[derive(Resource)]
pub struct RiderMaterials {
    /// Material for riders in the Waiting phase.
    pub waiting: Handle<ColorMaterial>,
    /// Material for riders in the Boarding phase.
    pub boarding: Handle<ColorMaterial>,
    /// Material for riders in the Riding phase.
    pub riding: Handle<ColorMaterial>,
    /// Material for riders in the Alighting phase.
    pub alighting: Handle<ColorMaterial>,
}

/// Spawn building visuals.
#[allow(clippy::needless_pass_by_value)]
pub fn spawn_building_visuals(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<ColorMaterial>>,
    sim: Res<SimulationRes>,
) {
    let w = sim.sim.world();
    let stop_positions: Vec<(EntityId, f64, String)> = w
        .iter_stops()
        .map(|(eid, s)| (eid, s.position, s.name.clone()))
        .collect();

    if stop_positions.is_empty() {
        return;
    }

    let min_pos = stop_positions
        .iter()
        .map(|s| s.1)
        .fold(f64::INFINITY, f64::min);
    let max_pos = stop_positions
        .iter()
        .map(|s| s.1)
        .fold(f64::NEG_INFINITY, f64::max);
    let span = (max_pos - min_pos) as f32;
    let vs = VisualScale::from_shaft_span(span);

    let shaft_height = span.mul_add(PPU, vs.car_height * 2.0);
    let shaft_center_y = f64::midpoint(min_pos, max_pos) as f32 * PPU;

    // Shaft background.
    commands.spawn((
        Mesh2d(meshes.add(Rectangle::new(vs.shaft_width, shaft_height))),
        MeshMaterial2d(materials.add(Color::srgba(0.2, 0.2, 0.25, 1.0))),
        Transform::from_xyz(0.0, shaft_center_y, 0.0),
        ShaftVisual,
    ));

    // Stop indicators and labels.
    let stop_line_material = materials.add(Color::srgba(0.5, 0.5, 0.5, 1.0));
    for (_eid, pos, name) in &stop_positions {
        let y = *pos as f32 * PPU;

        commands.spawn((
            Mesh2d(meshes.add(Rectangle::new(vs.stop_line_width, vs.stop_line_thickness))),
            MeshMaterial2d(stop_line_material.clone()),
            Transform::from_xyz(0.0, y, 0.1),
            StopVisual,
        ));

        commands.spawn((
            Text2d::new(name),
            TextFont {
                font_size: vs.font_size,
                ..default()
            },
            Transform::from_xyz(vs.label_offset_x, y, 0.1),
            StopLabel,
        ));
    }

    // Elevator car(s).
    let car_material = materials.add(Color::srgba(0.2, 0.5, 0.9, 1.0));
    for (eid, pos, _car) in w.iter_elevators() {
        let y = pos.value as f32 * PPU;
        commands.spawn((
            Mesh2d(meshes.add(Rectangle::new(vs.car_width, vs.car_height))),
            MeshMaterial2d(car_material.clone()),
            Transform::from_xyz(0.0, y, 0.5),
            ElevatorVisual { entity_id: eid },
        ));
    }

    let rider_mats = RiderMaterials {
        waiting: materials.add(Color::srgba(0.2, 0.8, 0.3, 1.0)),
        boarding: materials.add(Color::srgba(0.3, 0.9, 0.9, 1.0)),
        riding: materials.add(Color::srgba(0.9, 0.8, 0.2, 1.0)),
        alighting: materials.add(Color::srgba(0.9, 0.4, 0.2, 1.0)),
    };
    commands.insert_resource(rider_mats);
    commands.insert_resource(vs);
}

/// Update elevator car positions.
#[allow(clippy::needless_pass_by_value)]
pub fn sync_elevator_visuals(
    sim: Res<SimulationRes>,
    mut query: Query<(&ElevatorVisual, &mut Transform)>,
) {
    for (vis, mut transform) in &mut query {
        if let Some(pos) = sim.sim.world().position(vis.entity_id) {
            transform.translation.y = pos.value as f32 * PPU;
        }
    }
}

/// Spawn, update, and despawn rider visuals.
#[allow(clippy::needless_pass_by_value)]
pub fn sync_rider_visuals(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    sim: Res<SimulationRes>,
    existing: Query<(Entity, &RiderVisual)>,
    vs: Res<VisualScale>,
    rider_mats: Res<RiderMaterials>,
) {
    let w = sim.sim.world();

    // Active rider entity IDs (not arrived/abandoned).
    let active_ids: std::collections::HashSet<EntityId> = w
        .iter_riders()
        .filter(|(_, r)| !matches!(r.phase, RiderPhase::Arrived | RiderPhase::Abandoned))
        .map(|(eid, _)| eid)
        .collect();

    // Despawn visuals for gone riders.
    for (entity, vis) in &existing {
        if !active_ids.contains(&vis.entity_id) {
            commands.entity(entity).despawn();
        }
    }

    let existing_ids: std::collections::HashSet<EntityId> =
        existing.iter().map(|(_, v)| v.entity_id).collect();

    for (rider_eid, rider) in w.iter_riders() {
        if matches!(rider.phase, RiderPhase::Arrived | RiderPhase::Abandoned) {
            continue;
        }
        if existing_ids.contains(&rider_eid) {
            continue;
        }

        let (x, y, mat_handle) = rider_visual_params(rider_eid, rider, w, &vs, &rider_mats);

        commands.spawn((
            Mesh2d(meshes.add(Circle::new(vs.rider_radius))),
            MeshMaterial2d(mat_handle),
            Transform::from_xyz(x, y, 1.0),
            RiderVisual {
                entity_id: rider_eid,
            },
        ));
    }
}

/// Update positions of existing rider visuals.
#[allow(clippy::needless_pass_by_value)]
pub fn update_rider_positions(
    sim: Res<SimulationRes>,
    mut query: Query<(
        &RiderVisual,
        &mut Transform,
        &mut MeshMaterial2d<ColorMaterial>,
    )>,
    rider_mats: Res<RiderMaterials>,
    vs: Res<VisualScale>,
) {
    let w = sim.sim.world();

    for (vis, mut transform, mut mat_handle) in &mut query {
        let Some(rider) = w.rider(vis.entity_id) else {
            continue;
        };
        if matches!(rider.phase, RiderPhase::Arrived | RiderPhase::Abandoned) {
            continue;
        }

        let (x, y, handle) = rider_visual_params(vis.entity_id, rider, w, &vs, &rider_mats);
        transform.translation.x = x;
        transform.translation.y = y;
        *mat_handle = MeshMaterial2d(handle);
    }
}

/// Compute (x, y, material) for a rider visual based on its phase.
fn rider_visual_params(
    rider_eid: EntityId,
    rider: &elevator_core::components::Rider,
    w: &elevator_core::world::World,
    vs: &VisualScale,
    mats: &RiderMaterials,
) -> (f32, f32, Handle<ColorMaterial>) {
    match rider.phase {
        RiderPhase::Waiting => {
            let stop_y = rider
                .current_stop
                .and_then(|s| w.stop_position(s))
                .unwrap_or(0.0);
            let mut hasher = std::collections::hash_map::DefaultHasher::new();
            rider_eid.hash(&mut hasher);
            let hash = hasher.finish();
            let offset = ((hash % 5) as f32).mul_add(-vs.rider_spacing, vs.waiting_x_offset);
            (offset, stop_y as f32 * PPU, mats.waiting.clone())
        }
        RiderPhase::Boarding(elev_eid) => {
            let elev_y = w.position(elev_eid).map_or(0.0, |p| p.value);
            (
                vs.waiting_x_offset * 0.5,
                elev_y as f32 * PPU,
                mats.boarding.clone(),
            )
        }
        RiderPhase::Riding(elev_eid) => {
            let elev_y = w.position(elev_eid).map_or(0.0, |p| p.value);
            let idx = w
                .elevator(elev_eid)
                .and_then(|car| car.riders().iter().position(|r| *r == rider_eid))
                .unwrap_or(0);
            let x_offset = (idx as f32 % 3.0).mul_add(vs.rider_spacing, -vs.rider_spacing);
            (x_offset, elev_y as f32 * PPU, mats.riding.clone())
        }
        RiderPhase::Alighting(elev_eid) => {
            let elev_y = w.position(elev_eid).map_or(0.0, |p| p.value);
            (
                vs.waiting_x_offset * 0.5,
                elev_y as f32 * PPU,
                mats.alighting.clone(),
            )
        }
        _ => (0.0, 0.0, mats.waiting.clone()),
    }
}
