//! Glowing capsule elevator car rendering.

use bevy::prelude::*;

use super::{PPU, VisualScale};
use crate::palette;
use crate::sim_bridge::SimulationRes;
use elevator_core::components::ElevatorPhase;
use elevator_core::entity::EntityId;

/// Marker component linking a Bevy entity to a simulation elevator.
#[derive(Component)]
pub struct ElevatorVisual {
    /// The simulation entity ID of this elevator.
    pub entity_id: EntityId,
}

/// The outer halo mesh for an elevator capsule.
#[derive(Component)]
pub struct ElevatorHalo {
    /// The simulation entity ID of this elevator.
    pub entity_id: EntityId,
}

/// Spawn glowing capsule meshes for each elevator.
pub fn spawn_elevators(
    commands: &mut Commands,
    meshes: &mut ResMut<Assets<Mesh>>,
    materials: &mut ResMut<Assets<ColorMaterial>>,
    vs: &VisualScale,
    w: &elevator_core::world::World,
) {
    let car_material = materials.add(ColorMaterial::from_color(palette::CAR_CORE));
    let halo_material = materials.add(ColorMaterial::from_color(palette::CAR_HALO));

    for (eid, pos, _car) in w.iter_elevators() {
        let y = pos.value() as f32 * PPU;

        // Outer halo — larger, translucent.
        commands.spawn((
            Mesh2d(meshes.add(Circle::new(vs.car_width * 1.5))),
            MeshMaterial2d(halo_material.clone()),
            Transform::from_xyz(0.0, y, 0.4),
            ElevatorHalo { entity_id: eid },
        ));

        // Inner capsule — bright core.
        commands.spawn((
            Mesh2d(meshes.add(Rectangle::new(vs.car_width, vs.car_height))),
            MeshMaterial2d(car_material.clone()),
            Transform::from_xyz(0.0, y, 0.5),
            ElevatorVisual { entity_id: eid },
        ));
    }
}

/// Update elevator capsule positions and brightness based on door state.
#[allow(clippy::needless_pass_by_value)]
pub fn sync_elevator_visuals(
    sim: Res<SimulationRes>,
    mut cars: Query<(
        &ElevatorVisual,
        &mut Transform,
        &mut MeshMaterial2d<ColorMaterial>,
    )>,
    mut halos: Query<(&ElevatorHalo, &mut Transform), Without<ElevatorVisual>>,
    mut materials: ResMut<Assets<ColorMaterial>>,
) {
    let w = sim.sim.world();

    for (vis, mut transform, mat_handle) in &mut cars {
        let Some(pos) = w.position(vis.entity_id) else {
            continue;
        };
        transform.translation.y = pos.value() as f32 * PPU;

        // Brighten when doors are open.
        let Some(elev) = w.elevator(vis.entity_id) else {
            continue;
        };
        let color = match elev.phase() {
            ElevatorPhase::Loading | ElevatorPhase::DoorOpening => palette::CAR_DOORS_OPEN,
            _ => palette::CAR_CORE,
        };
        if let Some(mat) = materials.get_mut(mat_handle.id()) {
            mat.color = color;
        }
    }

    // Sync halo positions to match.
    for (halo, mut transform) in &mut halos {
        if let Some(pos) = w.position(halo.entity_id) {
            transform.translation.y = pos.value() as f32 * PPU;
        }
    }
}
