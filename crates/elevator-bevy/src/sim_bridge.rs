//! Bridge between the core simulation and Bevy: resources, tick system, and event forwarding.

use bevy::prelude::*;
use elevator_core::events::Event;
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

/// Running counters for the five hall-call / car-call / skip events.
/// Rendered in the HUD so observers can confirm the events are firing
/// and games can base UI cues on the same counts.
#[derive(Resource, Default, Debug, Clone, Copy)]
pub struct HallCallEventCounters {
    /// `HallButtonPressed` count since sim start.
    pub button_pressed: u64,
    /// `HallCallAcknowledged` count.
    pub acknowledged: u64,
    /// `HallCallCleared` count.
    pub cleared: u64,
    /// `CarButtonPressed` count.
    pub car_button_pressed: u64,
    /// `RiderSkipped` count.
    pub skipped: u64,
}

/// Tally the five hall-call / skip events into [`HallCallEventCounters`].
/// Runs every frame; reads every `EventWrapper` message this frame.
#[allow(clippy::needless_pass_by_value)]
pub fn tally_hall_call_events(
    mut reader: MessageReader<EventWrapper>,
    mut counters: ResMut<HallCallEventCounters>,
) {
    use elevator_core::events::Event;
    for wrapper in reader.read() {
        match wrapper.0 {
            Event::HallButtonPressed { .. } => counters.button_pressed += 1,
            Event::HallCallAcknowledged { .. } => counters.acknowledged += 1,
            Event::HallCallCleared { .. } => counters.cleared += 1,
            Event::CarButtonPressed { .. } => counters.car_button_pressed += 1,
            Event::RiderSkipped { .. } => counters.skipped += 1,
            _ => {}
        }
    }
}
