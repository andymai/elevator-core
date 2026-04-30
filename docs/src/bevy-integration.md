# Bevy Integration

The `elevator-bevy` crate is a Bevy 0.18 binary that wraps the core simulation with 2D rendering, a HUD, AI passengers, and keyboard controls. It serves as both a visual debugger for testing dispatch strategies and a reference implementation for integrating elevator-core into a game engine.

## Running the Bevy app

With the default config:

```bash
cargo run
```

With a custom config:

```bash
cargo run -- assets/config/space_elevator.ron
```

The app reads a RON config file, creates a `Simulation`, and renders the building in a 2D view with elevator cars, rider dots, and a metrics HUD.

## Plugin architecture

The integration is built around a single Bevy plugin:

```rust,no_run
# use bevy::prelude::*;
pub struct ElevatorSimPlugin;

impl Plugin for ElevatorSimPlugin {
    fn build(&self, _app: &mut App) { /* wire resources, systems, messages */ }
}
```

When you add this plugin to a Bevy app, it:

1. **Loads config** from a RON file (CLI argument or `assets/config/default.ron`)
2. **Creates a `Simulation`** and inserts it as the `SimulationRes` resource
3. **Inserts `SimSpeed`** resource for controlling simulation speed
4. **Registers the `EventWrapper` message** for bridging sim events to Bevy
5. **Adds systems** for ticking the sim, rendering, AI passengers, input, and HUD

## Key resources

### SimulationRes

The core simulation is wrapped in a Bevy resource:

```rust,no_run
# use bevy::prelude::*;
# use elevator_core::prelude::*;
# use elevator_core::__doctest_prelude::*;
#[derive(Resource)]
pub struct SimulationRes {
    pub sim: Simulation,
}
```

Any Bevy system can access the simulation through `Res<SimulationRes>` (read) or `ResMut<SimulationRes>` (write).

### SimSpeed

Controls how many simulation ticks run per Bevy frame:

```rust,no_run
# use bevy::prelude::*;
#[derive(Resource)]
pub struct SimSpeed {
    pub multiplier: u32,
}
```

- `multiplier: 0` -- simulation is paused
- `multiplier: 1` -- one tick per frame (normal speed)
- `multiplier: 10` -- ten ticks per frame (fast forward)

The built-in input system maps keyboard keys to speed changes.

### EventWrapper

Core simulation events are bridged into Bevy's message system:

```rust,no_run
# use bevy::prelude::*;
# use elevator_core::events::Event;
#[derive(Message)]
pub struct EventWrapper(pub Event);
```

Bevy systems can read simulation events using `MessageReader<EventWrapper>`:

```rust,no_run
# use bevy::prelude::*;
# use elevator_core::events::Event;
# #[derive(Message, Clone)]
# pub struct EventWrapper(pub Event);
fn my_system(mut events: MessageReader<EventWrapper>) {
    for EventWrapper(event) in events.read() {
        match event {
            Event::RiderExited { rider, stop, tick, .. } => {
                // React to rider arrival in Bevy-land.
            }
            _ => {}
        }
    }
}
```

## The tick system

The bridge between elevator-core and Bevy is a single system that runs each frame:

```rust,no_run
# use bevy::prelude::*;
# use elevator_core::events::Event;
# use elevator_core::sim::Simulation;
# #[derive(Resource)]
# pub struct SimulationRes { pub sim: Simulation }
# #[derive(Resource)]
# pub struct SimSpeed { pub multiplier: u32 }
# #[derive(Message, Clone)]
# pub struct EventWrapper(pub Event);
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
```

It steps the simulation `multiplier` times, then drains all events and re-emits them as Bevy messages. This is the only point where the core simulation and Bevy synchronize.

## Writing custom Bevy systems

To add your own gameplay systems that interact with the simulation, access `SimulationRes`:

```rust,no_run
use bevy::prelude::*;
use elevator_bevy::sim_bridge::SimulationRes;
use elevator_core::prelude::*;

fn print_metrics(sim: Res<SimulationRes>) {
    let m = sim.sim.metrics();
    if sim.sim.current_tick() % 3600 == 0 {
        println!(
            "Minute {}: delivered={} avg_wait={:.0}",
            sim.sim.current_tick() / 3600,
            m.total_delivered(),
            m.avg_wait_time(),
        );
    }
}
```

Register your system in the Bevy app after the plugin:

```rust,no_run
# use bevy::prelude::*;
# use elevator_bevy::sim_bridge::SimulationRes;
# pub struct ElevatorSimPlugin;
# impl Plugin for ElevatorSimPlugin { fn build(&self, _: &mut App) {} }
# fn print_metrics(_sim: Res<SimulationRes>) {}
# let mut app = App::new();
app.add_plugins(ElevatorSimPlugin)
    .add_systems(Update, print_metrics);
```

## Module layout

The `elevator-bevy` crate is organized into focused modules:

| Module | Responsibility |
|---|---|
| `plugin.rs` | `ElevatorSimPlugin` -- loads config, creates sim, registers everything |
| `sim_bridge.rs` | `SimulationRes`, `SimSpeed`, `EventWrapper`, tick system |
| `rendering.rs` | 2D visualization of the building, elevators, and riders |
| `ui.rs` | HUD overlay showing metrics and simulation state |
| `camera.rs` | Camera setup sized to the building |
| `input.rs` | Keyboard controls for speed adjustment |
| `passenger_ai.rs` | Timer-based passenger spawning |

## When to use elevator-bevy vs. building your own

**Use elevator-bevy** if you want a quick visual test of your dispatch strategy or config. Run it, watch the elevators move, tweak parameters.

**Build your own** if you are making a game. The Bevy crate is intentionally simple -- it is a reference, not a framework. Copy the patterns you need (the `SimulationRes` resource, the tick system, the event bridge) into your own Bevy app and build your game systems around them.

The core library does not depend on Bevy at all. You can use it with any Rust game engine, a TUI, a web frontend via WASM, or pure headless batch simulation. See [Headless and Non-Bevy Usage](headless-non-bevy.md) for engine-agnostic integration patterns.

## Next steps

- [Headless and Non-Bevy Usage](headless-non-bevy.md) -- integrating elevator-core without Bevy, including macroquad and eframe patterns.
- [Events and Metrics](events-metrics.md) -- the `Event` enum and metric accumulators that power the HUD and your custom systems.
- [Performance](performance.md) -- throughput baselines and scaling guidance for choosing a tick rate.
