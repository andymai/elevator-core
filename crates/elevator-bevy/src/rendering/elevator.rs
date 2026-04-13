//! Glowing capsule elevator car rendering.

use bevy::prelude::*;

use super::{LineLayout, PPU, VisualScale};
use crate::palette;
use crate::sim_bridge::SimulationRes;
use elevator_core::components::ElevatorPhase;
use elevator_core::entity::EntityId;
use elevator_core::sim::Simulation;

/// Marker component linking a Bevy entity to a simulation elevator.
#[derive(Component)]
pub struct ElevatorVisual {
    /// The simulation entity ID of this elevator.
    pub entity_id: EntityId,
    /// Whether this elevator belongs to the express group.
    pub is_express: bool,
}

/// The outer halo mesh for an elevator capsule.
#[derive(Component)]
pub struct ElevatorHalo {
    /// The simulation entity ID of this elevator.
    pub entity_id: EntityId,
}

/// Spawn glowing capsule meshes for each elevator, positioned by line.
pub fn spawn_elevators(
    commands: &mut Commands,
    meshes: &mut ResMut<Assets<Mesh>>,
    materials: &mut ResMut<Assets<ColorMaterial>>,
    vs: &VisualScale,
    w: &elevator_core::world::World,
    sim: &Simulation,
    layout: &LineLayout,
) {
    for (eid, pos, _car) in w.iter_elevators() {
        let line_eid = sim.line_for_elevator(eid);
        let x = line_eid.map_or(0.0, |l| layout.x_for_line(l));
        let is_express = line_eid.is_some_and(|l| layout.is_express(l));

        let y = pos.value() as f32 * PPU;

        // Express elevators are 1.5x larger with different colors.
        let size_mult = if is_express { 1.5 } else { 1.0 };
        let car_w = vs.car_width * size_mult;
        let car_h = vs.car_height * size_mult;

        let (core_color, halo_color) = if is_express {
            (palette::CAR_CORE_EXPRESS, palette::CAR_HALO_EXPRESS)
        } else {
            (palette::CAR_CORE_LOCAL, palette::CAR_HALO_LOCAL)
        };

        let car_material = materials.add(ColorMaterial::from_color(core_color));
        let halo_material = materials.add(ColorMaterial::from_color(halo_color));

        // Outer halo — larger, translucent.
        commands.spawn((
            Mesh2d(meshes.add(Circle::new(car_w * 1.5))),
            MeshMaterial2d(halo_material),
            Transform::from_xyz(x, y, 0.4),
            ElevatorHalo { entity_id: eid },
        ));

        // Inner capsule — bright core.
        commands.spawn((
            Mesh2d(meshes.add(Rectangle::new(car_w, car_h))),
            MeshMaterial2d(car_material),
            Transform::from_xyz(x, y, 0.5),
            ElevatorVisual {
                entity_id: eid,
                is_express,
            },
        ));
    }
}

/// Update elevator capsule positions and brightness based on door state.
#[allow(clippy::needless_pass_by_value)]
pub fn sync_elevator_visuals(
    sim: Res<SimulationRes>,
    layout: Res<LineLayout>,
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
        let line_eid = sim.sim.line_for_elevator(vis.entity_id);
        let x = line_eid.map_or(0.0, |l| layout.x_for_line(l));

        transform.translation.x = x;
        transform.translation.y = pos.value() as f32 * PPU;

        // Brighten when doors are open — use group-appropriate color.
        let Some(elev) = w.elevator(vis.entity_id) else {
            continue;
        };
        let color = match elev.phase() {
            ElevatorPhase::Loading | ElevatorPhase::DoorOpening => {
                if vis.is_express {
                    palette::CAR_DOORS_OPEN_EXPRESS
                } else {
                    palette::CAR_DOORS_OPEN_LOCAL
                }
            }
            _ => {
                if vis.is_express {
                    palette::CAR_CORE_EXPRESS
                } else {
                    palette::CAR_CORE_LOCAL
                }
            }
        };
        if let Some(mat) = materials.get_mut(mat_handle.id()) {
            mat.color = color;
        }
    }

    // Sync halo positions to match.
    for (halo, mut transform) in &mut halos {
        if let Some(pos) = w.position(halo.entity_id) {
            let line_eid = sim.sim.line_for_elevator(halo.entity_id);
            let x = line_eid.map_or(0.0, |l| layout.x_for_line(l));
            transform.translation.x = x;
            transform.translation.y = pos.value() as f32 * PPU;
        }
    }
}
