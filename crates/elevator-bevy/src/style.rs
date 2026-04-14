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
    /// Optional building-exterior backdrop drawn behind the shafts.
    /// `None` = no backdrop (current default).
    pub building_backdrop: Option<Color>,
    /// Optional alternating-floor band colors `(odd, even)` painted as
    /// horizontal stripes inside the backdrop.
    pub floor_band: Option<(Color, Color)>,
    /// Per-car body colors. If shorter than the elevator count, the last
    /// color repeats. If empty, `car` is used for every car.
    pub car_palette: Vec<Color>,
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
            building_backdrop: None,
            floor_band: None,
            car_palette: Vec::new(),
        }
    }
}

impl VisualStyle {
    /// SimTower-inspired palette: pale-blue sky background, cream
    /// building exterior with subtle floor banding, dark elevator
    /// shafts, three differently-colored cars so they read as distinct
    /// vehicles even when stacked vertically.
    #[must_use]
    #[allow(clippy::missing_const_for_fn)] // Color::srgba and vec! are not const.
    pub fn simtower() -> Self {
        Self {
            background: Color::srgba(0.65, 0.78, 0.90, 1.0), // sky blue
            shaft: Color::srgba(0.18, 0.18, 0.22, 1.0),      // dark slate
            stop_line: Color::srgba(0.30, 0.27, 0.22, 1.0),  // brown
            text: Color::srgba(0.14, 0.14, 0.16, 1.0),
            car: Color::srgba(0.78, 0.18, 0.18, 1.0), // unused when car_palette set
            door_panel: Color::srgba(0.95, 0.93, 0.86, 1.0),
            rider_up: Color::srgba(0.10, 0.38, 0.66, 1.0),
            rider_down: Color::srgba(0.78, 0.30, 0.20, 1.0),
            rider_boarding: Color::srgba(0.95, 0.78, 0.20, 1.0),
            rider_exiting: Color::srgba(0.40, 0.40, 0.45, 1.0),
            shaft_spacing_units: 3.5,
            stop_lines_span_all_shafts: true,
            humanoid_riders: true,
            sliding_doors: true,
            dashed_stop_lines: false,
            shaft_cables: false,
            building_backdrop: Some(Color::srgba(0.95, 0.92, 0.83, 1.0)),
            floor_band: Some((
                Color::srgba(0.97, 0.95, 0.88, 1.0),
                Color::srgba(0.92, 0.88, 0.78, 1.0),
            )),
            car_palette: vec![
                Color::srgba(0.78, 0.18, 0.18, 1.0), // red
                Color::srgba(0.95, 0.65, 0.10, 1.0), // amber
                Color::srgba(0.10, 0.42, 0.20, 1.0), // green
            ],
        }
    }
}
