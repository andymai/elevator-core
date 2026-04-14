//! Camera setup: centers the view on the shaft bank and zooms to fit.

use bevy::prelude::*;

use crate::sim_bridge::SimulationRes;
use crate::style::VisualStyle;

/// Set up camera centered on the shaft bank, zoomed to fit.
#[allow(clippy::needless_pass_by_value)]
pub fn setup_camera(
    mut commands: Commands,
    sim: Res<SimulationRes>,
    windows: Query<&Window>,
    style: Res<VisualStyle>,
) {
    let world = sim.sim.world();
    let positions: Vec<f64> = world.iter_stops().map(|(_, s)| s.position()).collect();
    let min_pos = positions.iter().copied().fold(f64::INFINITY, f64::min);
    let max_pos = positions.iter().copied().fold(f64::NEG_INFINITY, f64::max);

    let ppu = super::rendering::PPU;
    let shaft_height_world = (max_pos - min_pos) as f32 * ppu;
    let center_y = f64::midpoint(min_pos, max_pos) as f32 * ppu;

    let shaft_count = world.iter_elevators().count().max(1) as f32;
    let bank_width = (shaft_count - 1.0).mul_add(style.shaft_spacing_units * ppu, 80.0);

    let padded_height = shaft_height_world + 140.0;
    let padded_width = bank_width + 260.0;

    let (win_w, win_h) = windows.iter().next().map_or((800.0, 600.0), |w| {
        (w.resolution.width(), w.resolution.height())
    });

    let scale = ((padded_height / win_h).max(padded_width / win_w)).max(1.0);

    commands.spawn((
        Camera2d,
        // Disable MSAA so the rendered output stays crisp pixel-art.
        bevy::render::view::Msaa::Off,
        Transform::from_xyz(0.0, center_y, 0.0),
        Projection::Orthographic(OrthographicProjection {
            scale,
            ..OrthographicProjection::default_2d()
        }),
    ));
}
