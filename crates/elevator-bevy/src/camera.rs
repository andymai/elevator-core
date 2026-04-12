//! Camera setup: HDR-enabled 2D camera with Bloom for bioluminescent glow.

use bevy::post_process::bloom::Bloom;
use bevy::prelude::*;

use crate::rendering::PPU;
use crate::sim_bridge::SimulationRes;

/// Set up an HDR camera centered on the shaft, zoomed to fit all stops, with Bloom.
#[allow(clippy::needless_pass_by_value)]
pub fn setup_camera(mut commands: Commands, sim: Res<SimulationRes>, windows: Query<&Window>) {
    let world = sim.sim.world();
    let positions: Vec<f64> = world.iter_stops().map(|(_, s)| s.position()).collect();
    let min_pos = positions.iter().copied().fold(f64::INFINITY, f64::min);
    let max_pos = positions.iter().copied().fold(f64::NEG_INFINITY, f64::max);

    let shaft_height_world = (max_pos - min_pos) as f32 * PPU;
    let center_y = f64::midpoint(min_pos, max_pos) as f32 * PPU;

    let padded_height = shaft_height_world + 120.0;

    let window_height = windows
        .iter()
        .next()
        .map_or(540.0, |w| w.resolution.height());

    let scale = (padded_height / window_height).max(1.0);

    commands.spawn((
        Camera2d,
        Transform::from_xyz(0.0, center_y, 0.0),
        Projection::Orthographic(OrthographicProjection {
            scale,
            ..OrthographicProjection::default_2d()
        }),
        Bloom {
            intensity: 0.3,
            low_frequency_boost: 0.6,
            low_frequency_boost_curvature: 0.4,
            high_pass_frequency: 0.9,
            ..default()
        },
    ));
}
