use bevy::prelude::*;
use elevator_sim_core::events::SimEvent;
use elevator_sim_core::sim::Simulation;

/// Wraps the core simulation as a Bevy resource.
#[derive(Resource)]
pub struct SimulationRes {
    pub sim: Simulation,
}

/// Controls simulation speed: 0 = paused, 1 = normal, 2 = 2x, 10 = 10x.
#[derive(Resource)]
pub struct SimSpeed {
    pub multiplier: u32,
}

/// Bevy message wrapper for core simulation events.
#[derive(Message, Debug, Clone)]
pub struct SimEventWrapper(pub SimEvent);

/// System that ticks the simulation and emits events into Bevy.
pub fn tick_simulation(
    mut sim: ResMut<SimulationRes>,
    speed: Res<SimSpeed>,
    mut events: MessageWriter<SimEventWrapper>,
) {
    for _ in 0..speed.multiplier {
        sim.sim.tick();
    }
    for event in sim.sim.drain_events() {
        events.write(SimEventWrapper(event));
    }
}
