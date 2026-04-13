//! Deep ocean atmosphere — background marine snow particle system.

use bevy::prelude::*;
use rand::Rng;
use std::hash::{Hash, Hasher};

use crate::palette;
use crate::rendering::elevator::ElevatorVisual;
use crate::sim_bridge::SimulationRes;

/// Number of marine snow particles.
const PARTICLE_COUNT: usize = 180;

/// Component for a drifting marine snow particle.
#[derive(Component)]
pub struct MarineSnow {
    /// Vertical drift speed in pixels per second (negative = downward, positive = upward).
    drift_speed: f32,
    /// Horizontal sway amplitude in pixels.
    sway_amplitude: f32,
    /// Sway phase offset (radians).
    sway_phase: f32,
    /// Base alpha for this particle (varies per particle).
    base_alpha: f32,
}

/// Edge glow particle that drifts toward the top or bottom of the viewport.
#[derive(Component)]
pub struct EdgeGlow {
    /// True = top (drifts upward), false = bottom (drifts downward).
    is_top: bool,
    /// Drift speed in pixels per second.
    drift_speed: f32,
}

/// Visible vertical bounds for particle wrapping.
#[derive(Resource)]
pub struct AtmosphereBounds {
    /// Top of the visible area in world Y.
    pub y_max: f32,
    /// Bottom of the visible area in world Y.
    pub y_min: f32,
    /// Left edge in world X.
    pub x_min: f32,
    /// Right edge in world X.
    pub x_max: f32,
}

/// Spawn marine snow particles scattered across the visible area.
#[allow(clippy::needless_pass_by_value)]
pub fn spawn_atmosphere(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<ColorMaterial>>,
    sim: Res<SimulationRes>,
) {
    let w = sim.sim.world();
    let positions: Vec<f64> = w.iter_stops().map(|(_, s)| s.position()).collect();
    let min_pos = positions.iter().copied().fold(f64::INFINITY, f64::min) as f32;
    let max_pos = positions.iter().copied().fold(f64::NEG_INFINITY, f64::max) as f32;

    let ppu = crate::rendering::PPU;
    let padding = 200.0;
    let y_min = min_pos.mul_add(ppu, -padding);
    let y_max = max_pos.mul_add(ppu, padding);
    let x_min = -400.0;
    let x_max = 400.0;

    commands.insert_resource(AtmosphereBounds {
        y_max,
        y_min,
        x_min,
        x_max,
    });

    let mut rng = rand::rng();

    for i in 0..PARTICLE_COUNT {
        // Hash-based per-particle randomness for deterministic size variance.
        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        i.hash(&mut hasher);
        let hash = hasher.finish();

        // Size varies from 1.0 to 4.0 px based on hash.
        let size = 1.0 + (hash % 301) as f32 / 100.0; // 1.0..4.0

        let x = rng.random_range(x_min..x_max);
        let y = rng.random_range(y_min..y_max);

        // 20% of particles drift upward (thermal convection).
        let drift = if hash.is_multiple_of(5) {
            rng.random_range(1.0f32..4.0) // slow upward
        } else {
            rng.random_range(-8.0f32..-2.0) // downward
        };

        let sway_amp = rng.random_range(3.0f32..12.0);
        let sway_phase = rng.random_range(0.0f32..std::f32::consts::TAU);
        let base_alpha = 0.12; // increased from 0.08

        let snow_color = Color::srgba(0.5, 0.6, 0.7, base_alpha);
        let snow_material = materials.add(ColorMaterial::from_color(snow_color));

        commands.spawn((
            Mesh2d(meshes.add(Rectangle::new(size, size))),
            MeshMaterial2d(snow_material),
            Transform::from_xyz(x, y, -0.5),
            MarineSnow {
                drift_speed: drift,
                sway_amplitude: sway_amp,
                sway_phase,
                base_alpha,
            },
        ));
    }

    // ── Edge glow particles ──

    // Bottom (Deep Root): 4 large dim blue particles drifting slowly downward.
    let bottom_color = palette::FLOOR_BOTTOM.to_linear();
    let bottom_glow = Color::linear_rgba(
        bottom_color.red,
        bottom_color.green,
        bottom_color.blue,
        0.06,
    );
    for i in 0..4 {
        let size = rng.random_range(6.0f32..8.0);
        let x = rng.random_range(x_min..x_max);
        let y = y_min + rng.random_range(0.0f32..40.0);
        let drift = rng.random_range(2.0f32..5.0);
        // Slightly vary position based on index for spread.
        let _ = i;

        commands.spawn((
            Mesh2d(meshes.add(Circle::new(size))),
            MeshMaterial2d(materials.add(ColorMaterial::from_color(bottom_glow))),
            Transform::from_xyz(x, y, -0.6),
            EdgeGlow {
                is_top: false,
                drift_speed: drift,
            },
        ));
    }

    // Top (Spire): 4 large dim amber particles drifting slowly upward.
    let top_color = palette::FLOOR_TOP.to_linear();
    let top_glow = Color::linear_rgba(top_color.red, top_color.green, top_color.blue, 0.06);
    for _i in 0..4 {
        let size = rng.random_range(6.0f32..8.0);
        let x = rng.random_range(x_min..x_max);
        let y = y_max - rng.random_range(0.0f32..40.0);
        let drift = rng.random_range(2.0f32..5.0);

        commands.spawn((
            Mesh2d(meshes.add(Circle::new(size))),
            MeshMaterial2d(materials.add(ColorMaterial::from_color(top_glow))),
            Transform::from_xyz(x, y, -0.6),
            EdgeGlow {
                is_top: true,
                drift_speed: drift,
            },
        ));
    }
}

/// Drift edge glow particles toward their respective edges, resetting when they leave bounds.
#[allow(clippy::needless_pass_by_value)]
pub fn drift_edge_glow(
    time: Res<Time>,
    bounds: Res<AtmosphereBounds>,
    mut query: Query<(&EdgeGlow, &mut Transform)>,
) {
    let dt = time.delta_secs();
    let mut rng = rand::rng();

    for (edge, mut transform) in &mut query {
        if edge.is_top {
            // Drift upward.
            transform.translation.y += edge.drift_speed * dt;
            if transform.translation.y > bounds.y_max {
                // Reset to top edge with randomized x.
                transform.translation.y = bounds.y_max - rng.random_range(0.0f32..40.0);
                transform.translation.x = rng.random_range(bounds.x_min..bounds.x_max);
            }
        } else {
            // Drift downward.
            transform.translation.y -= edge.drift_speed * dt;
            if transform.translation.y < bounds.y_min {
                // Reset to bottom edge with randomized x.
                transform.translation.y = bounds.y_min + rng.random_range(0.0f32..40.0);
                transform.translation.x = rng.random_range(bounds.x_min..bounds.x_max);
            }
        }
    }
}

/// Drift marine snow particles downward (or upward for thermals) with gentle horizontal sway.
/// Particles near active elevators brighten slightly.
#[allow(clippy::needless_pass_by_value)]
pub fn drift_marine_snow(
    time: Res<Time>,
    bounds: Res<AtmosphereBounds>,
    mut snow_query: Query<(&MarineSnow, &mut Transform, &MeshMaterial2d<ColorMaterial>)>,
    elevator_query: Query<&Transform, (With<ElevatorVisual>, Without<MarineSnow>)>,
    mut materials: ResMut<Assets<ColorMaterial>>,
) {
    let dt = time.delta_secs();
    let t = time.elapsed_secs();

    // Collect elevator positions for proximity brightening.
    let elevator_positions: Vec<Vec2> = elevator_query
        .iter()
        .map(|tr| Vec2::new(tr.translation.x, tr.translation.y))
        .collect();

    for (snow, mut transform, mat_handle) in &mut snow_query {
        // Vertical drift.
        transform.translation.y += snow.drift_speed * dt;

        // Horizontal sway.
        let sway = t.mul_add(0.3, snow.sway_phase).sin() * snow.sway_amplitude * dt;
        transform.translation.x += sway;

        // Wrap around vertically.
        if transform.translation.y < bounds.y_min {
            transform.translation.y = bounds.y_max;
        } else if transform.translation.y > bounds.y_max {
            transform.translation.y = bounds.y_min;
        }

        // Wrap horizontally.
        if transform.translation.x < bounds.x_min {
            transform.translation.x = bounds.x_max;
        } else if transform.translation.x > bounds.x_max {
            transform.translation.x = bounds.x_min;
        }

        // Brighten near active elevators (within 80px).
        let pos = Vec2::new(transform.translation.x, transform.translation.y);
        let near_elevator = elevator_positions.iter().any(|ep| ep.distance(pos) < 80.0);

        let target_alpha = if near_elevator {
            snow.base_alpha + 0.05
        } else {
            snow.base_alpha
        };

        if let Some(mat) = materials.get_mut(mat_handle.id()) {
            let c = mat.color.to_srgba();
            // Gently lerp alpha toward target for smooth transitions.
            let new_alpha = (target_alpha - c.alpha).mul_add((dt * 3.0).min(1.0), c.alpha);
            mat.color = Color::srgba(c.red, c.green, c.blue, new_alpha);
        }
    }
}
