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

## Quick start

```sh
cargo add elevator-core
```

```rust
use elevator_core::prelude::*;
use elevator_core::config::ElevatorConfig;

let mut sim = SimulationBuilder::new()
    .stop(StopId(0), "Ground", 0.0)
    .stop(StopId(1), "Floor 2", 4.0)
    .stop(StopId(2), "Floor 3", 8.0)
    .elevator(ElevatorConfig { starting_stop: StopId(0), ..Default::default() })
    .build()
    .unwrap();

sim.spawn_rider(StopId(0), StopId(2), 75.0).unwrap();

for _ in 0..1000 {
    sim.step();
}

println!("{}", sim.metrics()); // "1 delivered, avg wait 87.3t, 100% util"
```

## What's in the box

- **8-phase tick loop** -- advance transient, dispatch, reposition, advance queue, movement, doors, loading, metrics
- **5 dispatch strategies** -- SCAN, LOOK, Nearest Car, ETD, Destination (or write your own via the `DispatchStrategy` trait)
- **4 reposition strategies** -- SpreadEvenly, ReturnToLobby, DemandWeighted, NearestIdle
- **Typed event bus** -- ~25 event variants covering elevator, rider, door, topology, and dispatch activity
- **Extension storage** -- attach arbitrary game-specific data to any entity
- **Lifecycle hooks** -- inject logic before or after any tick phase
- **O(1) population queries** -- `waiting_at`, `residents_at`, `abandoned_at` per stop
- **Trapezoidal motion** -- realistic accel/cruise/decel profiles with per-elevator physics
- **Snapshot save/load** -- deterministic serialization via serde (RON, JSON, postcard, etc.)
- **Manual and inspection modes** -- player-controlled elevators, maintenance scenarios
- **Traffic generation** -- Poisson arrivals with time-varying patterns (feature-gated)

## Configuration

Build in code or load from RON files:

```rust
use elevator_core::prelude::*;

let config: SimConfig = ron::from_str(&std::fs::read_to_string("config.ron")?)?;
let sim = SimulationBuilder::from_config(config).build()?;
```

Example configs ship in `assets/config/` (including a space elevator).

## Bevy integration

The [`elevator-bevy`](crates/elevator-bevy) crate wraps the simulation as a
Bevy 0.18 plugin with 2D rendering, a HUD, and keyboard controls:

```sh
cargo run                                       # default config
cargo run -- assets/config/space_elevator.ron    # custom config
```

The core library has no Bevy dependency -- use it with any engine, a TUI, WASM,
or headless. See the [guide](https://andymai.github.io/elevator-core/headless-non-bevy.html)
for macroquad, eframe, and CLI integration patterns.

## Feature flags

| Flag | Default | Description |
|------|---------|-------------|
| `traffic` | yes | Traffic pattern generation (`PoissonSource`, `TrafficSchedule`). Pulls in `rand`. |
| `energy` | no | Per-elevator energy modeling (`EnergyProfile`, `EnergyMetrics`). |

## Testing

```sh
cargo test -p elevator-core --all-features    # unit + integration + doc tests
cargo bench -p elevator-core                  # criterion benchmarks
scripts/lint-docs.sh                          # documentation linter
```

## License

Licensed under either of [Apache License, Version 2.0](LICENSE-APACHE) or
[MIT license](LICENSE-MIT) at your option.
