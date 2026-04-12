use bevy::prelude::*;
use elevator_sim_core::components::RiderState;
use elevator_sim_core::entity::EntityId;
use std::hash::{Hash, Hasher};

use crate::sim_bridge::SimulationRes;

/// Pixels per simulation distance unit.
pub const PPU: f32 = 40.0;

/// Holds computed visual sizes that scale with the shaft height.
#[derive(Resource)]
pub struct VisualScale {
    pub shaft_width: f32,
    pub car_width: f32,
    pub car_height: f32,
    pub rider_radius: f32,
    pub waiting_x_offset: f32,
    pub stop_line_width: f32,
    pub stop_line_thickness: f32,
    pub label_offset_x: f32,
    pub font_size: f32,
    pub rider_spacing: f32,
}

impl VisualScale {
    fn from_shaft_span(span: f32) -> Self {
        let base_height = 15.0 * PPU;
        let actual_height = span * PPU;
        let s = (actual_height / base_height).max(1.0);

        VisualScale {
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

#[derive(Component)]
pub struct ShaftVisual;

#[derive(Component)]
pub struct ElevatorVisual {
    pub entity_id: EntityId,
}

#[derive(Component)]
pub struct StopVisual;

#[derive(Component)]
pub struct StopLabel;

#[derive(Component)]
pub struct RiderVisual {
    pub entity_id: EntityId,
}

/// Pre-allocated material handles per rider state.
#[derive(Resource)]
pub struct RiderMaterials {
    pub waiting: Handle<ColorMaterial>,
    pub boarding: Handle<ColorMaterial>,
    pub riding: Handle<ColorMaterial>,
    pub alighting: Handle<ColorMaterial>,
}

/// Spawn building visuals.
pub fn spawn_building_visuals(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<ColorMaterial>>,
    sim: Res<SimulationRes>,
) {
    let w = &sim.sim.world;
    let stop_positions: Vec<(EntityId, f64, String)> = w
        .stops()
        .map(|(eid, s)| (eid, s.position, s.name.clone()))
        .collect();

    if stop_positions.is_empty() {
        return;
    }

    let min_pos = stop_positions.iter().map(|s| s.1).fold(f64::INFINITY, f64::min);
    let max_pos = stop_positions.iter().map(|s| s.1).fold(f64::NEG_INFINITY, f64::max);
    let span = (max_pos - min_pos) as f32;
    let vs = VisualScale::from_shaft_span(span);

    let shaft_height = (span * PPU) + vs.car_height * 2.0;
    let shaft_center_y = ((min_pos + max_pos) / 2.0) as f32 * PPU;

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
    for (eid, pos, _car) in w.elevators() {
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
pub fn sync_elevator_visuals(
    sim: Res<SimulationRes>,
    mut query: Query<(&ElevatorVisual, &mut Transform)>,
) {
    for (vis, mut transform) in &mut query {
        if let Some(pos) = sim.sim.world.positions.get(vis.entity_id) {
            transform.translation.y = pos.value as f32 * PPU;
        }
    }
}

/// Spawn, update, and despawn rider visuals.
pub fn sync_rider_visuals(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    sim: Res<SimulationRes>,
    existing: Query<(Entity, &RiderVisual)>,
    vs: Res<VisualScale>,
    rider_mats: Res<RiderMaterials>,
) {
    let w = &sim.sim.world;

    // Active rider entity IDs (not arrived/abandoned).
    let active_ids: std::collections::HashSet<EntityId> = w
        .riders()
        .filter(|(_, r)| !matches!(r.state, RiderState::Arrived | RiderState::Abandoned))
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

    for (rider_eid, rider) in w.riders() {
        if matches!(rider.state, RiderState::Arrived | RiderState::Abandoned) {
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
pub fn update_rider_positions(
    sim: Res<SimulationRes>,
    mut query: Query<(&RiderVisual, &mut Transform, &mut MeshMaterial2d<ColorMaterial>)>,
    rider_mats: Res<RiderMaterials>,
    vs: Res<VisualScale>,
) {
    let w = &sim.sim.world;

    for (vis, mut transform, mut mat_handle) in &mut query {
        let Some(rider) = w.rider_data.get(vis.entity_id) else {
            continue;
        };
        if matches!(rider.state, RiderState::Arrived | RiderState::Abandoned) {
            continue;
        }

        let (x, y, handle) = rider_visual_params(vis.entity_id, rider, w, &vs, &rider_mats);
        transform.translation.x = x;
        transform.translation.y = y;
        *mat_handle = MeshMaterial2d(handle);
    }
}

/// Compute (x, y, material) for a rider visual based on its state.
fn rider_visual_params(
    rider_eid: EntityId,
    rider: &elevator_sim_core::components::RiderData,
    w: &elevator_sim_core::world::World,
    vs: &VisualScale,
    mats: &RiderMaterials,
) -> (f32, f32, Handle<ColorMaterial>) {
    match rider.state {
        RiderState::Waiting => {
            let stop_y = rider
                .current_stop
                .and_then(|s| w.stop_position(s))
                .unwrap_or(0.0);
            let mut hasher = std::collections::hash_map::DefaultHasher::new();
            rider_eid.hash(&mut hasher);
            let hash = hasher.finish();
            let offset = vs.waiting_x_offset - (hash % 5) as f32 * vs.rider_spacing;
            (offset, stop_y as f32 * PPU, mats.waiting.clone())
        }
        RiderState::Boarding(elev_eid) => {
            let elev_y = w
                .positions
                .get(elev_eid)
                .map(|p| p.value)
                .unwrap_or(0.0);
            (
                vs.waiting_x_offset * 0.5,
                elev_y as f32 * PPU,
                mats.boarding.clone(),
            )
        }
        RiderState::Riding(elev_eid) => {
            let elev_y = w
                .positions
                .get(elev_eid)
                .map(|p| p.value)
                .unwrap_or(0.0);
            let idx = w
                .elevator_cars
                .get(elev_eid)
                .and_then(|car| car.riders.iter().position(|r| *r == rider_eid))
                .unwrap_or(0);
            let x_offset = -vs.rider_spacing + (idx as f32 % 3.0) * vs.rider_spacing;
            (x_offset, elev_y as f32 * PPU, mats.riding.clone())
        }
        RiderState::Alighting(elev_eid) => {
            let elev_y = w
                .positions
                .get(elev_eid)
                .map(|p| p.value)
                .unwrap_or(0.0);
            (
                vs.waiting_x_offset * 0.5,
                elev_y as f32 * PPU,
                mats.alighting.clone(),
            )
        }
        _ => (0.0, 0.0, mats.waiting.clone()),
    }
}
