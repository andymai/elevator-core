use bevy::prelude::*;

use crate::sim_bridge::SimulationRes;

/// Set up camera centered on the shaft, zoomed to fit all stops.
pub fn setup_camera(mut commands: Commands, sim: Res<SimulationRes>, windows: Query<&Window>) {
    let stops = &sim.sim.stops;
    let min_pos = stops.iter().map(|s| s.position).fold(f64::INFINITY, f64::min);
    let max_pos = stops.iter().map(|s| s.position).fold(f64::NEG_INFINITY, f64::max);

    let ppu = super::rendering::PPU;
    let shaft_height_world = (max_pos - min_pos) as f32 * ppu;
    let center_y = ((min_pos + max_pos) / 2.0) as f32 * ppu;

    // Add padding so stops aren't at the very edge.
    let padded_height = shaft_height_world + 120.0;

    let window_height = windows
        .iter()
        .next()
        .map(|w| w.resolution.height())
        .unwrap_or(600.0);

    let scale = (padded_height / window_height).max(1.0);

    commands.spawn((
        Camera2d,
        Transform::from_xyz(0.0, center_y, 0.0),
        Projection::Orthographic(OrthographicProjection {
            scale,
            ..OrthographicProjection::default_2d()
        }),
    ));
}
