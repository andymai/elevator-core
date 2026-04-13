//! Camera setup: HDR-enabled 2D camera with Bloom for bioluminescent glow.

use bevy::post_process::bloom::Bloom;
use bevy::prelude::*;

use crate::rendering::PPU;
use crate::sim_bridge::SimulationRes;

/// Set up an HDR camera centered on the building, zoomed to fit all stops and shafts, with Bloom.
#[allow(clippy::needless_pass_by_value)]
pub fn setup_camera(mut commands: Commands, sim: Res<SimulationRes>, windows: Query<&Window>) {
    let world = sim.sim.world();
    let positions: Vec<f64> = world.iter_stops().map(|(_, s)| s.position()).collect();
    let min_pos = positions.iter().copied().fold(f64::INFINITY, f64::min);
    let max_pos = positions.iter().copied().fold(f64::NEG_INFINITY, f64::max);

    let shaft_height_world = (max_pos - min_pos) as f32 * PPU;
    let center_y = f64::midpoint(min_pos, max_pos) as f32 * PPU;

    // Estimate horizontal span from number of lines.
    let line_count = sim.sim.line_count();
    let estimated_width = if line_count > 1 {
        // Rough estimate: spacing * lines + group gap + label margin.
        let span = shaft_height_world / 15.0; // scale factor
        let shaft_spacing = 30.0 * span.max(1.0);
        let group_gap = 50.0 * span.max(1.0);
        shaft_spacing * (line_count as f32 - 1.0) + group_gap + 200.0
    } else {
        200.0
    };

    let padded_height = shaft_height_world + 120.0;

    let window = windows.iter().next();
    let window_height = window.map_or(540.0, |w| w.resolution.height());
    let window_width = window.map_or(960.0, |w| w.resolution.width());

    // Scale to fit both height and width.
    let scale_y = padded_height / window_height;
    let scale_x = estimated_width / window_width;
    let scale = scale_y.max(scale_x).max(1.0);

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
