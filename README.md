# elevator-core

[![Crates.io](https://img.shields.io/crates/v/elevator-core.svg)](https://crates.io/crates/elevator-core)
[![docs.rs](https://img.shields.io/docsrs/elevator-core)](https://docs.rs/elevator-core)
[![License](https://img.shields.io/crates/l/elevator-core.svg)](LICENSE-MIT)

A tick-based elevator simulation engine for Rust. Model anything from a
3-story office building to an orbital space elevator. Pluggable dispatch
strategies, realistic trapezoidal motion profiles, O(1) population tracking
per stop, and an extension system let you build exactly the simulation you
need.

[Guide](https://andymai.github.io/elevator-core/) | [API Reference](https://docs.rs/elevator-core)

## Table of Contents

- [Getting Started](#getting-started)
- [Examples](#examples)
  - [Basic](#basic)
  - [Custom Dispatch](#custom-dispatch)
  - [Extensions and Hooks](#extensions-and-hooks)
- [Architecture](#architecture)
- [Dispatch Strategies](#dispatch-strategies)
- [Configuration](#configuration)
- [Bevy Integration](#bevy-integration)
- [Testing](#testing)
- [Feature Flags](#feature-flags)
- [License](#license)

## Getting Started

Add elevator-core to your project:

```sh
cargo add elevator-core
```

From there, the typical workflow is:

1. **Configure stops** -- define the building layout with named stops at arbitrary positions.
2. **Build the simulation** -- `SimulationBuilder` validates the config and returns a ready-to-run `Simulation`.
3. **Spawn riders** -- place riders at origin stops with a destination and weight.
4. **Step the loop** -- each call to `sim.step()` advances one tick through all eight phases.
5. **Read metrics** -- query aggregate wait times, ride times, and throughput at any point.

## Examples

### Basic

Create a simulation, spawn a rider, and run until delivery.

```rust
use elevator_core::prelude::*;
use elevator_core::config::ElevatorConfig;
use elevator_core::stop::StopConfig;

let mut sim = SimulationBuilder::new()
    .stops(vec![
        StopConfig { id: StopId(0), name: "Ground".into(), position: 0.0 },
        StopConfig { id: StopId(1), name: "Floor 2".into(), position: 4.0 },
        StopConfig { id: StopId(2), name: "Floor 3".into(), position: 8.0 },
    ])
    .elevator(ElevatorConfig {
        starting_stop: StopId(0),
        ..Default::default()
    })
    .build()
    .unwrap();

// Spawn a 75 kg rider going from Ground to Floor 3.
sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 75.0).unwrap();

// Run for 1000 ticks.
for _ in 0..1000 {
    sim.step();
}

println!("Delivered: {}", sim.metrics().total_delivered());
```

`ElevatorConfig` implements `Default` with sensible physics (max speed 2.0, acceleration 1.5, deceleration 2.0, 800 kg capacity), so `.elevator(ElevatorConfig { starting_stop: StopId(0), ..Default::default() })` is all you need when the physics aren't the point.

### Custom Dispatch

Swap in a different dispatch algorithm and react to simulation events.

```rust
use elevator_core::prelude::*;
use elevator_core::config::ElevatorConfig;
use elevator_core::dispatch::etd::EtdDispatch;
use elevator_core::stop::StopConfig;

let mut sim = SimulationBuilder::new()
    .stops(vec![
        StopConfig { id: StopId(0), name: "Lobby".into(), position: 0.0 },
        StopConfig { id: StopId(1), name: "Sky Lounge".into(), position: 50.0 },
        StopConfig { id: StopId(2), name: "Observatory".into(), position: 120.0 },
    ])
    .elevator(ElevatorConfig {
        name: "Sky Car".into(),
        max_speed: 6.0,                 // taller building → faster car
        acceleration: 2.0,
        deceleration: 2.5,
        weight_capacity: 1200.0,
        starting_stop: StopId(0),
        ..Default::default()
    })
    .dispatch(EtdDispatch::new())
    .build()
    .unwrap();

sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 80.0).unwrap();

for _ in 0..2000 {
    sim.step();

    for event in sim.drain_events() {
        match event {
            Event::RiderBoarded { rider, elevator, tick } => {
                println!("Tick {tick}: rider {rider:?} boarded elevator {elevator:?}");
            }
            Event::RiderExited { rider, tick, .. } => {
                println!("Tick {tick}: rider {rider:?} arrived");
            }
            _ => {}
        }
    }
}
```

### Extensions and Hooks

Attach custom data to entities and inject logic into the tick loop.

```rust
use elevator_core::prelude::*;
use elevator_core::config::ElevatorConfig;
use elevator_core::stop::StopConfig;
use serde::{Serialize, Deserialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
struct VipTag {
    level: u32,
}

let mut sim = SimulationBuilder::new()
    .stops(vec![
        StopConfig { id: StopId(0), name: "Ground".into(), position: 0.0 },
        StopConfig { id: StopId(1), name: "Penthouse".into(), position: 100.0 },
    ])
    .elevator(ElevatorConfig {
        max_speed: 4.0,                 // tall building → faster car
        starting_stop: StopId(0),
        ..Default::default()
    })
    .with_ext::<VipTag>("vip_tag")
    .after(Phase::Loading, |world| {
        // Custom logic runs after the loading phase every tick.
        // Access world state, extension data, etc.
    })
    .build()
    .unwrap();

// Spawn a rider and tag them as VIP.
let rider_id = sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 70.0).unwrap();
sim.world_mut().insert_ext(rider_id, VipTag { level: 3 }, "vip_tag");

// Later, read back the extension data.
if let Some(tag) = sim.world().get_ext::<VipTag>(rider_id) {
    println!("VIP level: {}", tag.level);
}
```

## Architecture

Each call to `sim.step()` executes eight phases:

```text
┌───────────────┐   ┌──────────┐   ┌──────────────┐   ┌──────────────┐
│ Advance       │──▶│ Dispatch │──▶│ Reposition   │──▶│ Advance      │
│ Transient     │   │          │   │              │   │ Queue        │
└───────────────┘   └──────────┘   └──────────────┘   └──────────────┘
                                                             │
          ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
          │ Metrics  │◀──│ Loading  │◀──│ Doors    │◀──│ Movement │
          │          │   │          │   │          │   │          │
          └──────────┘   └──────────┘   └──────────┘   └──────────┘
```

| Phase | Description |
|-------|-------------|
| **Advance Transient** | Promotes one-tick states forward (Boarding to Riding, Exiting to Resident/Arrived). |
| **Dispatch** | Assigns idle elevators to stops via the pluggable `DispatchStrategy`. |
| **Reposition** | Moves idle elevators toward strategic positions to reduce future wait times. |
| **Advance Queue** | Reconciles each elevator's phase/target with its `DestinationQueue` front (honors imperative `push_destination` / `push_destination_front` / `clear_destinations` calls). |
| **Movement** | Updates elevator position and velocity using trapezoidal acceleration profiles. |
| **Doors** | Ticks door open/close finite-state machines at each stop. |
| **Loading** | Boards waiting riders onto elevators with open doors and exits riders at their destination. |
| **Metrics** | Aggregates wait times, ride times, and throughput from the current tick's events. |

Internally, elevator-core uses an ECS-style struct-of-arrays `World` with typed
component accessors, per-entity extension storage for game-specific data, and a
query builder for filtering and iterating entities by component composition.
Lifecycle hooks let you inject custom logic before or after any phase.

For per-phase semantics (events emitted, edge cases, design rationale), see
[`ARCHITECTURE.md`](crates/elevator-core/ARCHITECTURE.md) — the single
canonical reference.

## Dispatch Strategies

Four built-in strategies ship with the crate. All implement the `DispatchStrategy` trait.

| Strategy | Type | Description |
|----------|------|-------------|
| **SCAN** | `ScanDispatch` | Classic elevator algorithm. Sweeps end-to-end before reversing direction. |
| **LOOK** | `LookDispatch` | Like SCAN, but reverses at the last pending request instead of the shaft end. |
| **Nearest Car** | `NearestCarDispatch` | Assigns each hall call to the closest idle elevator. Coordinates across multi-elevator groups to avoid duplicate responses. |
| **ETD** | `EtdDispatch` | Industry-standard Estimated Time to Destination. Evaluates every elevator for each call and minimizes total cost. |

To implement a custom strategy, implement the `DispatchStrategy` trait and pass
it to the builder:

```rust
use elevator_core::prelude::*;
use elevator_core::config::ElevatorConfig;
use elevator_core::stop::StopConfig;

let sim = SimulationBuilder::new()
    .stops(vec![
        StopConfig { id: StopId(0), name: "Ground".into(), position: 0.0 },
        StopConfig { id: StopId(1), name: "Top".into(), position: 10.0 },
    ])
    .elevator(ElevatorConfig { starting_stop: StopId(0), ..Default::default() })
    .dispatch_for_group(GroupId(0), my_custom_strategy)
    .build()
    .unwrap();
```

## Configuration

Simulations can be configured programmatically via `SimulationBuilder` or loaded
from RON files. The workspace includes example configs in `assets/config/`.

<details>
<summary>Example: <code>assets/config/default.ron</code></summary>

```ron
SimConfig(
    building: BuildingConfig(
        name: "Demo Tower",
        stops: [
            StopConfig(id: StopId(0), name: "Ground", position: 0.0),
            StopConfig(id: StopId(1), name: "Floor 2", position: 4.0),
            StopConfig(id: StopId(2), name: "Floor 3", position: 7.5),
            StopConfig(id: StopId(3), name: "Floor 4", position: 11.0),
            StopConfig(id: StopId(4), name: "Roof", position: 15.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0,
            name: "Main",
            max_speed: 2.0,
            acceleration: 1.5,
            deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 60,
            door_transition_ticks: 15,
        ),
    ],
    simulation: SimulationParams(
        ticks_per_second: 60.0,
    ),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 120,
        weight_range: (50.0, 100.0),
    ),
)
```

</details>

To load a RON config at runtime:

```rust
use elevator_core::prelude::*;

let config: SimConfig = ron::from_str(&std::fs::read_to_string("config.ron")?)?;
let sim = SimulationBuilder::from_config(config).build()?;
```

## Bevy Integration

The [`elevator-bevy`](crates/elevator-bevy) crate wraps the core simulation as a
Bevy 0.18 plugin. `ElevatorSimPlugin` reads a RON config file, constructs a
`Simulation`, and inserts it as a Bevy `Resource`. It bridges simulation events
into the Bevy message system, renders the building and riders with 2D meshes,
and supports configurable simulation speed via keyboard input.

```sh
cargo run                              # default config
cargo run -- assets/config/space_elevator.ron  # custom config
```

## Testing

- **442 tests** pass in `cargo test -p elevator-core` (409 unit,
  5 integration, 28 doc).
- **5 criterion benchmarks** cover dispatch, scaling, multi-line,
  query, and tick-loop throughput.
- **Deterministic replay** is guarded by an end-to-end diff test
  (`tests/deterministic_replay.rs`) that runs two identical scenarios
  and compares the full event stream byte-for-byte.
- **Mutation testing** via `cargo mutants` on the tick-loop hot path
  (`src/systems/`, `src/dispatch/`, `door.rs`, `movement.rs`,
  `rider_index.rs`): **299 caught / 168 missed / 31 unviable** →
  **64.0% mutation score** (467 viable mutants). Reproduce with:

```sh
cargo mutants --package elevator-core \
  --file 'crates/elevator-core/src/systems/*.rs' \
  --file 'crates/elevator-core/src/dispatch/*.rs' \
  --file 'crates/elevator-core/src/door.rs' \
  --file 'crates/elevator-core/src/movement.rs' \
  --file 'crates/elevator-core/src/rider_index.rs'
```

The headless example below is the shortest path to consuming the
simulation from a non-Bevy context:

```sh
cargo run --example headless_trace -- \
    --config assets/config/default.ron \
    --ticks 2000 \
    --output /tmp/trace.ndjson
```

## Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `traffic` | yes | Enables traffic pattern generation (adds `rand` dependency) |

## License

Licensed under either of [Apache License, Version 2.0](LICENSE-APACHE) or
[MIT license](LICENSE-MIT) at your option.
