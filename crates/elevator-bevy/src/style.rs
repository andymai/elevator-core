//! Palette and layout knobs for the rendering layer.
//!
//! The default matches the dark look used by the binary. Examples or games
//! can insert a replacement `VisualStyle` resource before the rendering
//! startup systems run to override the whole look — see
//! [`examples/showcase.rs`](../../examples/showcase.rs) for the "blueprint"
//! palette used in the repo's demo GIF.

use bevy::prelude::*;

/// Palette + layout knobs consulted by the rendering module.
#[derive(Resource, Clone)]
#[allow(clippy::struct_excessive_bools)] // Flat flags are clearer than a nested enum here.
pub struct VisualStyle {
    /// Clear color / background.
    pub background: Color,
    /// Shaft fill color.
    pub shaft: Color,
    /// Horizontal stop-line color.
    pub stop_line: Color,
    /// Stop label / text color.
    pub text: Color,
    /// Elevator car body color.
    pub car: Color,
    /// Elevator door panel color (slightly darker than the car body).
    pub door_panel: Color,
    /// Rider color when destination is above current stop.
    pub rider_up: Color,
    /// Rider color when destination is below current stop.
    pub rider_down: Color,
    /// Rider color used in the Boarding phase.
    pub rider_boarding: Color,
    /// Rider color used in the Exiting phase.
    pub rider_exiting: Color,
    /// Horizontal spacing between elevator shafts, in sim units.
    pub shaft_spacing_units: f32,
    /// Draw stop lines as one continuous bar spanning every shaft.
    pub stop_lines_span_all_shafts: bool,
    /// Render humanoid (pill + head) rider shapes instead of plain circles.
    pub humanoid_riders: bool,
    /// Render two-panel sliding doors on the elevator car.
    pub sliding_doors: bool,
    /// Draw stop lines as short dashes instead of one continuous bar.
    pub dashed_stop_lines: bool,
    /// Draw a thin vertical dashed cable inside each shaft.
    pub shaft_cables: bool,
}

impl Default for VisualStyle {
    fn default() -> Self {
        // The original dark palette used by the binary.
        Self {
            background: Color::srgba(0.08, 0.08, 0.1, 1.0),
            shaft: Color::srgba(0.2, 0.2, 0.25, 1.0),
            stop_line: Color::srgba(0.5, 0.5, 0.5, 1.0),
            text: Color::WHITE,
            car: Color::srgba(0.2, 0.5, 0.9, 1.0),
            door_panel: Color::srgba(0.12, 0.32, 0.6, 1.0),
            rider_up: Color::srgba(0.2, 0.8, 0.3, 1.0),
            rider_down: Color::srgba(0.9, 0.4, 0.4, 1.0),
            rider_boarding: Color::srgba(0.3, 0.9, 0.9, 1.0),
            rider_exiting: Color::srgba(0.9, 0.8, 0.2, 1.0),
            shaft_spacing_units: 3.0,
            stop_lines_span_all_shafts: false,
            humanoid_riders: false,
            sliding_doors: false,
            dashed_stop_lines: false,
            shaft_cables: false,
        }
    }
}

impl VisualStyle {
    /// Minimal "blueprint" palette: paper background, dark line art, indigo
    /// car, mint/red riders by direction. Designed for the demo GIF.
    #[must_use]
    #[allow(clippy::missing_const_for_fn)] // Color::srgba is not const.
    pub fn blueprint() -> Self {
        Self {
            background: Color::srgba(0.968, 0.960, 0.933, 1.0), // #f7f5ee
            shaft: Color::srgba(0.88, 0.87, 0.84, 1.0),
            stop_line: Color::srgba(0.16, 0.16, 0.16, 1.0),
            text: Color::srgba(0.10, 0.10, 0.10, 1.0),
            car: Color::srgba(0.117, 0.251, 0.686, 1.0), // #1e40af
            door_panel: Color::srgba(0.85, 0.87, 0.92, 1.0),
            rider_up: Color::srgba(0.019, 0.588, 0.412, 1.0), // #059669
            rider_down: Color::srgba(0.862, 0.149, 0.149, 1.0), // #dc2626
            rider_boarding: Color::srgba(0.117, 0.251, 0.686, 1.0),
            rider_exiting: Color::srgba(0.39, 0.39, 0.39, 1.0),
            shaft_spacing_units: 3.5,
            stop_lines_span_all_shafts: true,
            humanoid_riders: true,
            sliding_doors: true,
            dashed_stop_lines: true,
            shaft_cables: true,
        }
    }
}
