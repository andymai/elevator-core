//! Camera setup: centers the view on the shaft and zooms to fit all stops.

use bevy::prelude::*;

use crate::sim_bridge::SimulationRes;

/// Set up camera centered on the shaft, zoomed to fit all stops.
#[allow(clippy::needless_pass_by_value)]
pub fn setup_camera(mut commands: Commands, sim: Res<SimulationRes>, windows: Query<&Window>) {
    let world = sim.sim.world();
    let positions: Vec<f64> = world.iter_stops().map(|(_, s)| s.position).collect();
    let min_pos = positions.iter().copied().fold(f64::INFINITY, f64::min);
    let max_pos = positions.iter().copied().fold(f64::NEG_INFINITY, f64::max);

    let ppu = super::rendering::PPU;
    let shaft_height_world = (max_pos - min_pos) as f32 * ppu;
    let center_y = f64::midpoint(min_pos, max_pos) as f32 * ppu;

    let padded_height = shaft_height_world + 120.0;

    let window_height = windows
        .iter()
        .next()
        .map_or(600.0, |w| w.resolution.height());

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
