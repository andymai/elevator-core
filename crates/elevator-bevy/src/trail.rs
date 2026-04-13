//! Elevator light trail system — fading wake behind moving capsules.

use bevy::prelude::*;

use crate::palette;
use crate::rendering::LineLayout;
use crate::rendering::PPU;
use crate::rendering::elevator::ElevatorVisual;
use crate::sim_bridge::SimulationRes;
use elevator_core::components::ElevatorPhase;
use elevator_core::entity::EntityId;

/// How many seconds a trail segment lives before fully fading.
const TRAIL_LIFETIME: f32 = 2.5;

/// Minimum speed (sim units/tick) before trail segments are emitted.
const MIN_SPEED_FOR_TRAIL: f64 = 0.01;

/// Frames between trail segment spawns per elevator.
const SPAWN_INTERVAL_FRAMES: u32 = 3;

/// Component for a fading trail segment.
#[derive(Component)]
pub struct TrailSegment {
    /// Remaining lifetime in seconds.
    remaining: f32,
    /// Total lifetime (for alpha interpolation).
    total: f32,
    /// Whether this trail belongs to an express elevator.
    is_express: bool,
}

/// Per-elevator trail spawn cooldown, stored as a Bevy resource.
#[derive(Resource, Default)]
pub struct TrailCooldowns {
    /// Frame counter per elevator entity.
    counters: std::collections::HashMap<EntityId, u32>,
}

/// Spawn trail segments behind moving elevators.
#[allow(clippy::needless_pass_by_value)]
pub fn spawn_trail_segments(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<ColorMaterial>>,
    sim: Res<SimulationRes>,
    elevators: Query<&ElevatorVisual>,
    mut cooldowns: ResMut<TrailCooldowns>,
    layout: Res<LineLayout>,
) {
    let w = sim.sim.world();

    for vis in &elevators {
        let Some(elev) = w.elevator(vis.entity_id) else {
            continue;
        };
        let Some(vel) = w.velocity(vis.entity_id) else {
            continue;
        };

        // Only emit trail when moving.
        if !matches!(elev.phase(), ElevatorPhase::MovingToStop(_)) {
            continue;
        }
        if vel.value().abs() < MIN_SPEED_FOR_TRAIL {
            continue;
        }

        // Cooldown to avoid too many segments.
        let counter = cooldowns.counters.entry(vis.entity_id).or_insert(0);
        *counter += 1;
        if !(*counter).is_multiple_of(SPAWN_INTERVAL_FRAMES) {
            continue;
        }

        let Some(pos) = w.position(vis.entity_id) else {
            continue;
        };
        let y = pos.value() as f32 * PPU;

        // Position trail at the elevator's line x-position.
        let line_eid = sim.sim.line_for_elevator(vis.entity_id);
        let x = line_eid.map_or(0.0, |l| layout.x_for_line(l));

        let trail_color = if vis.is_express {
            palette::TRAIL_NEAR_EXPRESS
        } else {
            palette::TRAIL_NEAR
        };

        // Express trail segments are larger.
        let size = if vis.is_express { 6.0 } else { 4.0 };

        commands.spawn((
            Mesh2d(meshes.add(Circle::new(size))),
            MeshMaterial2d(materials.add(ColorMaterial::from_color(trail_color))),
            Transform::from_xyz(x, y, 0.3),
            TrailSegment {
                remaining: TRAIL_LIFETIME,
                total: TRAIL_LIFETIME,
                is_express: vis.is_express,
            },
        ));
    }
}

/// Fade and despawn trail segments over time.
#[allow(clippy::needless_pass_by_value)]
pub fn fade_trail_segments(
    mut commands: Commands,
    time: Res<Time>,
    mut query: Query<(
        Entity,
        &mut TrailSegment,
        &mut MeshMaterial2d<ColorMaterial>,
    )>,
    mut materials: ResMut<Assets<ColorMaterial>>,
) {
    let dt = time.delta_secs();

    for (entity, mut trail, mat_handle) in &mut query {
        trail.remaining -= dt;

        if trail.remaining <= 0.0 {
            commands.entity(entity).despawn();
            continue;
        }

        // Interpolate color from near to far.
        let t = 1.0 - (trail.remaining / trail.total);
        let (near_color, far_color) = if trail.is_express {
            (palette::TRAIL_NEAR_EXPRESS, palette::TRAIL_FAR_EXPRESS)
        } else {
            (palette::TRAIL_NEAR, palette::TRAIL_FAR)
        };

        if let Some(mat) = materials.get_mut(mat_handle.id()) {
            let near = near_color.to_linear();
            let far = far_color.to_linear();
            mat.color = Color::linear_rgba(
                near.red.mul_add(1.0 - t, far.red * t),
                near.green.mul_add(1.0 - t, far.green * t),
                near.blue.mul_add(1.0 - t, far.blue * t),
                near.alpha.mul_add(1.0 - t, far.alpha * t),
            );
        }
    }
}
