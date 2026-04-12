//! Keyboard input handling for simulation speed controls.

use bevy::prelude::*;

use crate::sim_bridge::SimSpeed;

/// Handle speed-control key presses (Space to toggle pause, 1/2/3 for speed).
#[allow(clippy::needless_pass_by_value)]
pub fn handle_speed_input(keys: Res<ButtonInput<KeyCode>>, mut speed: ResMut<SimSpeed>) {
    if keys.just_pressed(KeyCode::Space) {
        speed.multiplier = u32::from(speed.multiplier == 0);
    }
    if keys.just_pressed(KeyCode::Digit1) {
        speed.multiplier = 1;
    }
    if keys.just_pressed(KeyCode::Digit2) {
        speed.multiplier = 2;
    }
    if keys.just_pressed(KeyCode::Digit3) {
        speed.multiplier = 10;
    }
}
