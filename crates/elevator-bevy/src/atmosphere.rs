//! Deep ocean atmosphere — background marine snow particle system.

use bevy::prelude::*;
use rand::Rng;

use crate::palette;
use crate::sim_bridge::SimulationRes;

/// Number of marine snow particles.
const PARTICLE_COUNT: usize = 60;

/// Component for a drifting marine snow particle.
#[derive(Component)]
pub struct MarineSnow {
    /// Vertical drift speed in pixels per second (negative = downward).
    drift_speed: f32,
    /// Horizontal sway amplitude in pixels.
    sway_amplitude: f32,
    /// Sway phase offset (radians).
    sway_phase: f32,
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
    let positions: Vec<f64> = w.iter_stops().map(|(_, s)| s.position).collect();
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

    let snow_material = materials.add(ColorMaterial::from_color(palette::MARINE_SNOW));
    let mut rng = rand::rng();

    for _ in 0..PARTICLE_COUNT {
        let size = rng.random_range(1.0f32..3.0);
        let x = rng.random_range(x_min..x_max);
        let y = rng.random_range(y_min..y_max);
        let drift = rng.random_range(-8.0f32..-2.0);
        let sway_amp = rng.random_range(3.0f32..12.0);
        let sway_phase = rng.random_range(0.0f32..std::f32::consts::TAU);

        commands.spawn((
            Mesh2d(meshes.add(Rectangle::new(size, size))),
            MeshMaterial2d(snow_material.clone()),
            Transform::from_xyz(x, y, -0.5),
            MarineSnow {
                drift_speed: drift,
                sway_amplitude: sway_amp,
                sway_phase,
            },
        ));
    }
}

/// Drift marine snow particles downward with gentle horizontal sway.
#[allow(clippy::needless_pass_by_value)]
pub fn drift_marine_snow(
    time: Res<Time>,
    bounds: Res<AtmosphereBounds>,
    mut query: Query<(&MarineSnow, &mut Transform)>,
) {
    let dt = time.delta_secs();
    let t = time.elapsed_secs();

    for (snow, mut transform) in &mut query {
        // Vertical drift.
        transform.translation.y += snow.drift_speed * dt;

        // Horizontal sway.
        let sway = t.mul_add(0.3, snow.sway_phase).sin() * snow.sway_amplitude * dt;
        transform.translation.x += sway;

        // Wrap around when below visible area.
        if transform.translation.y < bounds.y_min {
            transform.translation.y = bounds.y_max;
        }
        // Wrap horizontally too.
        if transform.translation.x < bounds.x_min {
            transform.translation.x = bounds.x_max;
        } else if transform.translation.x > bounds.x_max {
            transform.translation.x = bounds.x_min;
        }
    }
}
