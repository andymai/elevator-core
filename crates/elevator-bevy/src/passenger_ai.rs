//! AI-driven rider spawning at random stops with configurable intervals.

use bevy::prelude::*;
use rand::Rng;

use crate::sim_bridge::{SimSpeed, SimulationRes};

/// Tracks time until next rider spawn.
#[derive(Resource)]
pub struct PassengerSpawnTimer {
    /// Ticks remaining until the next rider is spawned.
    pub ticks_until_spawn: u32,
    /// Average interval (in ticks) between spawns.
    pub mean_interval: u32,
    /// Minimum rider weight (kg).
    pub weight_min: f64,
    /// Maximum rider weight (kg).
    pub weight_max: f64,
}

/// System to periodically spawn riders with random origin/destination.
#[allow(clippy::needless_pass_by_value)]
pub fn spawn_ai_passengers(
    mut sim: ResMut<SimulationRes>,
    mut timer: ResMut<PassengerSpawnTimer>,
    speed: Res<SimSpeed>,
) {
    if speed.multiplier == 0 {
        return;
    }

    let ticks_this_frame = speed.multiplier;

    if timer.ticks_until_spawn <= ticks_this_frame {
        let stop_ids: Vec<_> = sim.sim.world().stop_ids();
        if stop_ids.len() < 2 {
            return;
        }

        let mut rng = rand::rng();
        let origin_idx = rng.random_range(0..stop_ids.len());
        let mut dest_idx = rng.random_range(0..stop_ids.len());
        while dest_idx == origin_idx {
            dest_idx = rng.random_range(0..stop_ids.len());
        }

        let origin = stop_ids[origin_idx];
        let destination = stop_ids[dest_idx];
        let weight = rng.random_range(timer.weight_min..timer.weight_max);

        let _ = sim.sim.spawn_rider(origin, destination, weight);

        let jitter = rng.random_range(0.5f64..1.5);
        timer.ticks_until_spawn = (timer.mean_interval as f64 * jitter) as u32;
    } else {
        timer.ticks_until_spawn -= ticks_this_frame;
    }
}
