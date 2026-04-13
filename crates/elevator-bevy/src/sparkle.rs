//! Arrival sparkle particles — tiny expanding/fading bursts when riders reach their destination.

use bevy::prelude::*;
use rand::Rng;
use std::collections::HashSet;
use std::hash::{Hash, Hasher};

use crate::palette;
use crate::rendering::{LineLayout, PPU, StopRegistry};
use crate::sim_bridge::SimulationRes;
use elevator_core::components::RiderPhase;
use elevator_core::entity::EntityId;

/// Expanding, fading sparkle particle spawned on rider arrival.
#[derive(Component)]
pub struct Sparkle {
    /// Remaining lifetime in seconds.
    remaining: f32,
    /// Outward velocity in world pixels per second.
    velocity: Vec2,
}

/// Tracks which riders were in `Arrived` phase on the previous frame,
/// so we can detect new arrivals.
#[derive(Resource, Default)]
pub struct PreviousArrivals {
    /// Set of rider entity IDs that were `Arrived` last frame.
    ids: HashSet<EntityId>,
}

/// Detect newly arrived riders and spawn sparkle particles at their last position.
#[allow(clippy::needless_pass_by_value)]
pub fn spawn_sparkles(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<ColorMaterial>>,
    sim: Res<SimulationRes>,
    mut prev: ResMut<PreviousArrivals>,
    _registry: Res<StopRegistry>,
    layout: Res<LineLayout>,
) {
    let w = sim.sim.world();

    let current_arrived: HashSet<EntityId> = w
        .iter_riders()
        .filter(|(_, r)| r.phase() == RiderPhase::Arrived)
        .map(|(eid, _)| eid)
        .collect();

    let mut rng = rand::rng();

    for &rider_eid in &current_arrived {
        if prev.ids.contains(&rider_eid) {
            continue;
        }

        // Determine position: use the rider's destination stop position.
        let Some(rider) = w.rider(rider_eid) else {
            continue;
        };

        let stop_y = rider
            .current_stop()
            .and_then(|s| w.stop_position(s))
            .unwrap_or(0.0) as f32
            * PPU;

        // Determine x position: use the first line serving this stop.
        let shaft_x = rider.current_stop().map_or(0.0, |stop| {
            let lines = sim.sim.lines_serving_stop(stop);
            lines
                .first()
                .map_or(0.0, |line_eid| layout.x_for_line(*line_eid))
        });

        // Determine color based on which group the rider arrived in.
        // Use a hash-based heuristic: check if the stop is served by express.
        let is_express = rider.current_stop().is_some_and(|stop| {
            let lines = sim.sim.lines_serving_stop(stop);
            lines.iter().any(|l| layout.is_express(*l))
        });

        // Use a deterministic hash to pick color — cyan for local-area stops, amber for express.
        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        rider_eid.hash(&mut hasher);
        let hash = hasher.finish();
        let use_express_color = is_express && hash.is_multiple_of(3);

        let sparkle_color = if use_express_color {
            palette::CAR_CORE_EXPRESS
        } else {
            palette::CAR_CORE_LOCAL
        };

        // Spawn 4-6 sparkle particles.
        let count = rng.random_range(4u32..=6);
        for _ in 0..count {
            let angle = rng.random_range(0.0f32..std::f32::consts::TAU);
            let speed = rng.random_range(20.0f32..60.0);
            let velocity = Vec2::new(angle.cos() * speed, angle.sin() * speed);

            // Slightly varied alpha.
            let alpha_var = rng.random_range(0.6f32..1.0);
            let lin = sparkle_color.to_linear();
            let color = Color::linear_rgba(lin.red, lin.green, lin.blue, lin.alpha * alpha_var);

            commands.spawn((
                Mesh2d(meshes.add(Circle::new(2.0))),
                MeshMaterial2d(materials.add(ColorMaterial::from_color(color))),
                Transform::from_xyz(shaft_x, stop_y, 1.5),
                Sparkle {
                    remaining: 0.5,
                    velocity,
                },
            ));
        }
    }

    prev.ids = current_arrived;
}

/// Update sparkle particles: expand, fade, and despawn.
#[allow(clippy::needless_pass_by_value)]
pub fn update_sparkles(
    mut commands: Commands,
    time: Res<Time>,
    mut query: Query<(
        Entity,
        &mut Sparkle,
        &mut Transform,
        &MeshMaterial2d<ColorMaterial>,
    )>,
    mut materials: ResMut<Assets<ColorMaterial>>,
) {
    let dt = time.delta_secs();

    for (entity, mut sparkle, mut transform, mat_handle) in &mut query {
        sparkle.remaining -= dt;

        if sparkle.remaining <= 0.0 {
            commands.entity(entity).despawn();
            continue;
        }

        // Move outward.
        transform.translation.x += sparkle.velocity.x * dt;
        transform.translation.y += sparkle.velocity.y * dt;

        // Expand scale over lifetime (1.0 -> 2.0).
        let life_frac = sparkle.remaining / 0.5;
        let scale = 2.0 - life_frac; // starts at 1.0, ends at 2.0
        transform.scale = Vec3::splat(scale);

        // Fade alpha.
        if let Some(mat) = materials.get_mut(mat_handle.id()) {
            let lin = mat.color.to_linear();
            mat.color = Color::linear_rgba(lin.red, lin.green, lin.blue, lin.alpha * life_frac);
        }
    }
}
