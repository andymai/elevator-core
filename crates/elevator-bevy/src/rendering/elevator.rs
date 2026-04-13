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
    /// Smooth blend factor for door open/close color transitions (0.0 = closed, 1.0 = open).
    pub door_blend: f32,
}

/// The outer halo mesh for an elevator capsule.
#[derive(Component)]
pub struct ElevatorHalo {
    /// The simulation entity ID of this elevator.
    pub entity_id: EntityId,
}

/// Ghost trail copy behind an express elevator at high speed.
#[derive(Component)]
pub struct CometGhost {
    /// The simulation entity ID of the parent elevator.
    pub elevator_id: EntityId,
    /// Trail index: 0, 1, or 2 (determines offset and alpha).
    pub trail_index: u8,
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
                door_blend: 0.0,
            },
        ));

        // Spawn comet ghost trails for express elevators (invisible until high speed).
        if is_express {
            for trail_index in 0..3u8 {
                let ghost_color = Color::linear_rgba(
                    palette::CAR_CORE_EXPRESS.to_linear().red,
                    palette::CAR_CORE_EXPRESS.to_linear().green,
                    palette::CAR_CORE_EXPRESS.to_linear().blue,
                    0.0, // invisible initially
                );
                commands.spawn((
                    Mesh2d(meshes.add(Rectangle::new(car_w, car_h))),
                    MeshMaterial2d(materials.add(ColorMaterial::from_color(ghost_color))),
                    Transform::from_xyz(x, y, (trail_index as f32).mul_add(-0.01, 0.48)),
                    CometGhost {
                        elevator_id: eid,
                        trail_index,
                    },
                ));
            }
        }
    }
}

/// Lerp between two `Color` values in linear space.
fn lerp_color(a: Color, b: Color, t: f32) -> Color {
    let a = a.to_linear();
    let b = b.to_linear();
    Color::linear_rgba(
        a.red.mul_add(1.0 - t, b.red * t),
        a.green.mul_add(1.0 - t, b.green * t),
        a.blue.mul_add(1.0 - t, b.blue * t),
        a.alpha.mul_add(1.0 - t, b.alpha * t),
    )
}

/// Update elevator capsule positions, smooth door color transitions, and velocity-based stretching.
#[allow(
    clippy::needless_pass_by_value,
    clippy::type_complexity,
    clippy::too_many_lines
)]
pub fn sync_elevator_visuals(
    sim: Res<SimulationRes>,
    time: Res<Time>,
    layout: Res<LineLayout>,
    mut cars: Query<(
        &mut ElevatorVisual,
        &mut Transform,
        &mut MeshMaterial2d<ColorMaterial>,
    )>,
    mut halos: Query<
        (&ElevatorHalo, &mut Transform),
        (Without<ElevatorVisual>, Without<CometGhost>),
    >,
    mut ghosts: Query<
        (&CometGhost, &mut Transform, &MeshMaterial2d<ColorMaterial>),
        (Without<ElevatorVisual>, Without<ElevatorHalo>),
    >,
    mut materials: ResMut<Assets<ColorMaterial>>,
) {
    let w = sim.sim.world();
    let dt = time.delta_secs();

    for (mut vis, mut transform, mat_handle) in &mut cars {
        let Some(pos) = w.position(vis.entity_id) else {
            continue;
        };
        let line_eid = sim.sim.line_for_elevator(vis.entity_id);
        let x = line_eid.map_or(0.0, |l| layout.x_for_line(l));

        transform.translation.x = x;
        transform.translation.y = pos.value() as f32 * PPU;

        let Some(elev) = w.elevator(vis.entity_id) else {
            continue;
        };

        // Smooth door blend: approach 1.0 when doors opening/open, 0.0 when closing/closed.
        let target_blend = match elev.phase() {
            ElevatorPhase::Loading | ElevatorPhase::DoorOpening => 1.0f32,
            _ => 0.0f32,
        };
        // Lerp door_blend toward target over ~0.3 seconds.
        let blend_speed = 1.0 / 0.3;
        vis.door_blend += (target_blend - vis.door_blend) * (blend_speed * dt).min(1.0);

        let (closed_color, open_color) = if vis.is_express {
            (palette::CAR_CORE_EXPRESS, palette::CAR_DOORS_OPEN_EXPRESS)
        } else {
            (palette::CAR_CORE_LOCAL, palette::CAR_DOORS_OPEN_LOCAL)
        };

        let color = lerp_color(closed_color, open_color, vis.door_blend);
        if let Some(mat) = materials.get_mut(mat_handle.id()) {
            mat.color = color;
        }

        // Express whoosh: velocity-based vertical stretch.
        if vis.is_express {
            if let Some(vel) = w.velocity(vis.entity_id) {
                let speed = vel.value().abs();
                let max_speed = elev.max_speed();
                let speed_ratio = if max_speed > 0.0 {
                    (speed / max_speed) as f32
                } else {
                    0.0
                };
                // Stretch Y by 1.0-1.2x when at high speed (>75% of max).
                let stretch = if speed_ratio > 0.75 {
                    let t = (speed_ratio - 0.75) / 0.25; // 0..1 in the 75%-100% range
                    1.0 + t * 0.2 // 1.0..1.2
                } else {
                    1.0
                };
                transform.scale.y = stretch;
                // Squash X slightly to conserve visual volume.
                transform.scale.x = 1.0 / stretch.sqrt();
            }
        } else {
            transform.scale = Vec3::ONE;
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

    // Update comet ghost trails for express elevators.
    // Ghost alpha and offset depend on velocity: visible only at > 80% max speed.
    let ghost_alphas: [f32; 3] = [0.4, 0.2, 0.1];
    let ghost_offsets: [f32; 3] = [8.0, 16.0, 24.0];

    for (ghost, mut transform, mat_handle) in &mut ghosts {
        let Some(pos) = w.position(ghost.elevator_id) else {
            continue;
        };
        let Some(vel) = w.velocity(ghost.elevator_id) else {
            continue;
        };
        let Some(elev) = w.elevator(ghost.elevator_id) else {
            continue;
        };

        let line_eid = sim.sim.line_for_elevator(ghost.elevator_id);
        let x = line_eid.map_or(0.0, |l| layout.x_for_line(l));
        let y = pos.value() as f32 * PPU;
        let speed = vel.value().abs();
        let max_speed = elev.max_speed();
        let speed_ratio = if max_speed > 0.0 {
            speed / max_speed
        } else {
            0.0
        };

        let idx = ghost.trail_index as usize;
        let offset = ghost_offsets.get(idx).copied().unwrap_or(8.0);
        let target_alpha = ghost_alphas.get(idx).copied().unwrap_or(0.1);

        // "Behind" means opposite to movement direction.
        let trail_y = if vel.value() > 0.0 {
            y - offset // moving up, ghosts below
        } else {
            y + offset // moving down, ghosts above
        };

        transform.translation.x = x;
        transform.translation.y = trail_y;

        // Only visible at > 80% max speed (speed_ratio > 0.8).
        let alpha = if speed_ratio > 0.8 {
            let t = ((speed_ratio - 0.8) / 0.2).min(1.0) as f32;
            target_alpha * t
        } else {
            0.0
        };

        if let Some(mat) = materials.get_mut(mat_handle.id()) {
            let lin = palette::CAR_CORE_EXPRESS.to_linear();
            mat.color = Color::linear_rgba(lin.red, lin.green, lin.blue, alpha);
        }
    }
}
