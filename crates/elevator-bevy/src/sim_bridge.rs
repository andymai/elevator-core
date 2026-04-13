//! Bridge between the core simulation and Bevy: resources, tick system, and event forwarding.

use bevy::prelude::*;
use elevator_core::sim::Simulation;

/// Wraps the core simulation as a Bevy resource.
#[derive(Resource)]
pub struct SimulationRes {
    /// The core simulation instance.
    pub sim: Simulation,
}

/// Controls simulation speed: 0 = paused, 1 = normal, 2 = 2x, 10 = 10x.
#[derive(Resource)]
pub struct SimSpeed {
    /// Speed multiplier (0 = paused).
    pub multiplier: u32,
}

/// System that ticks the simulation and drains events.
#[allow(clippy::needless_pass_by_value)]
pub fn tick_simulation(mut sim: ResMut<SimulationRes>, speed: Res<SimSpeed>) {
    for _ in 0..speed.multiplier {
        sim.sim.step();
    }
    // Events must be drained each frame to avoid unbounded growth.
    let _ = sim.sim.drain_events();
}
