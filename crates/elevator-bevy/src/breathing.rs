//! Global breathing rhythm — a slow sinusoidal pulse that modulates the building's ambient light.
//!
//! Creates the impression of a living organism with a resting respiration cycle.

use bevy::prelude::*;
use std::f32::consts::TAU;

use crate::palette;
use crate::rendering::shaft::FloorLine;

/// Tracks the continuous breath phase for ambient modulation.
#[derive(Resource, Default)]
pub struct BreathPhase {
    /// Elapsed time in seconds, used to compute the sinusoidal breath factor.
    pub elapsed: f32,
}

impl BreathPhase {
    /// Compute the current breath factor in [-1.0, 1.0].
    ///
    /// Frequency: 0.07 Hz (one full cycle every ~14 seconds).
    #[must_use]
    pub fn factor(&self) -> f32 {
        (self.elapsed * 0.07 * TAU).sin()
    }
}

/// Update the breath phase from wall-clock time and modulate ambient visuals.
#[allow(clippy::needless_pass_by_value)]
pub fn update_breathing(
    time: Res<Time>,
    mut phase: ResMut<BreathPhase>,
    mut clear_color: ResMut<ClearColor>,
    floor_lines: Query<(&FloorLine, &MeshMaterial2d<ColorMaterial>)>,
    mut materials: ResMut<Assets<ColorMaterial>>,
) {
    phase.elapsed = time.elapsed_secs();
    let breath = phase.factor();

    // Modulate background clear color brightness by +/-5%.
    let bg = palette::BG.to_srgba();
    let scale = breath.mul_add(0.05, 1.0);
    clear_color.0 = Color::srgb(bg.red * scale, bg.green * scale, bg.blue * scale);

    // Modulate floor line alpha by +/-15% of the stable base alpha set by the glow system.
    for (floor_line, mat_handle) in &floor_lines {
        if let Some(mat) = materials.get_mut(mat_handle.id()) {
            let base = mat.color.to_srgba();
            let new_alpha = (floor_line.base_alpha * breath.mul_add(0.15, 1.0)).clamp(0.0, 1.0);
            mat.color = Color::srgba(base.red, base.green, base.blue, new_alpha);
        }
    }
}
