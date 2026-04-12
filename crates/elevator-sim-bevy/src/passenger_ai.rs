use bevy::prelude::*;
use rand::Rng;

use crate::sim_bridge::{SimSpeed, SimulationRes};

/// Tracks time until next passenger spawn.
#[derive(Resource)]
pub struct PassengerSpawnTimer {
    pub ticks_until_spawn: u32,
    pub mean_interval: u32,
    pub weight_min: f64,
    pub weight_max: f64,
}

/// System to periodically spawn passengers with random origin/destination.
pub fn spawn_ai_passengers(mut sim: ResMut<SimulationRes>, mut timer: ResMut<PassengerSpawnTimer>, speed: Res<SimSpeed>) {
    if speed.multiplier == 0 {
        return;
    }

    let ticks_this_frame = speed.multiplier;

    if timer.ticks_until_spawn <= ticks_this_frame {
        let num_stops = sim.sim.stops.len();
        if num_stops < 2 {
            return;
        }

        let mut rng = rand::rng();
        let origin_idx = rng.random_range(0..num_stops);
        let mut dest_idx = rng.random_range(0..num_stops);
        while dest_idx == origin_idx {
            dest_idx = rng.random_range(0..num_stops);
        }

        let origin = sim.sim.stops[origin_idx].id;
        let destination = sim.sim.stops[dest_idx].id;
        let weight = rng.random_range(timer.weight_min..timer.weight_max);

        sim.sim.spawn_passenger(origin, destination, weight);

        // Reset timer with some randomness.
        let jitter = rng.random_range(0.5f64..1.5);
        timer.ticks_until_spawn = (timer.mean_interval as f64 * jitter) as u32;
    } else {
        timer.ticks_until_spawn -= ticks_this_frame;
    }
}
