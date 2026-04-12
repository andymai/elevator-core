//! Bridge between the core simulation and Bevy: resources, tick system, and event forwarding.

use bevy::prelude::*;
use elevator_sim_core::events::Event;
use elevator_sim_core::sim::Simulation;

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

/// Bevy message wrapper for core simulation events.
#[derive(Message, Debug, Clone)]
#[allow(dead_code)]
pub struct EventWrapper(pub Event);

/// System that ticks the simulation and emits events into Bevy.
#[allow(clippy::needless_pass_by_value)]
pub fn tick_simulation(
    mut sim: ResMut<SimulationRes>,
    speed: Res<SimSpeed>,
    mut events: MessageWriter<EventWrapper>,
) {
    for _ in 0..speed.multiplier {
        sim.sim.step();
    }
    for event in sim.sim.drain_events() {
        events.write(EventWrapper(event));
    }
}
