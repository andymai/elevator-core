use bevy::prelude::*;

use crate::sim_bridge::SimSpeed;

pub fn handle_speed_input(keys: Res<ButtonInput<KeyCode>>, mut speed: ResMut<SimSpeed>) {
    if keys.just_pressed(KeyCode::Space) {
        speed.multiplier = if speed.multiplier == 0 { 1 } else { 0 };
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
