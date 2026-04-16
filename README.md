# elevator-core

[![Crates.io](https://img.shields.io/crates/v/elevator-core.svg)](https://crates.io/crates/elevator-core)
[![docs.rs](https://img.shields.io/docsrs/elevator-core)](https://docs.rs/elevator-core)
[![License](https://img.shields.io/crates/l/elevator-core.svg)](LICENSE-MIT)

Drop-in elevator simulation for Rust games. Five stops or five thousand --
the same engine handles a hotel lobby and a space elevator.

[Guide](https://andymai.github.io/elevator-core/) | [API Reference](https://docs.rs/elevator-core)

## 30-second demo

```sh
cargo add elevator-core
```

```rust
use elevator_core::prelude::*;
use elevator_core::config::ElevatorConfig;

fn main() -> Result<(), SimError> {
    let mut sim = SimulationBuilder::new()
        .stop(StopId(0), "Lobby", 0.0)
        .stop(StopId(1), "Floor 2", 4.0)
        .stop(StopId(2), "Floor 3", 8.0)
        .elevator(ElevatorConfig { starting_stop: StopId(0), ..Default::default() })
        .build()?;

    sim.spawn_rider(StopId(0), StopId(2), 75.0)?;

    loop {
        sim.step();
        for event in sim.drain_events() {
            if let Event::RiderExited { rider, tick, .. } = event {
                println!("Tick {tick}: rider {rider:?} delivered!");
                println!("{}", sim.metrics());
                return Ok(());
            }
        }
    }
}
```

Build a simulation. Spawn a rider. Step the loop. That's it -- dispatch,
physics, doors, and boarding happen automatically.

## Why this exists

Most elevator simulators hard-code uniform floors, couple to a specific
renderer, and leave you fighting the engine when your game needs something
different. elevator-core gives you **stops at arbitrary positions** along a
1D axis, **no rendering dependency**, and a trait-based dispatch system you
can swap or replace in one line.

| You want | elevator-core gives you |
|---|---|
| Office building with 5 floors | Stops at 0, 4, 8, 12, 16 |
| Skyscraper with sky lobbies | Multi-group dispatch, express zones |
| Space elevator | Stops at 0 and 1,000,000 -- same engine |
| Player-controlled car | `ServiceMode::Manual` + velocity commands |
| Custom AI dispatch | Implement `DispatchStrategy::rank()` |
| VIP passengers, cargo, robots | Extension storage -- attach any data |

## Highlights

**Simulation** -- 8-phase tick loop (dispatch, movement, doors, loading, metrics, ...) with deterministic replay. Trapezoidal velocity profiles. Per-elevator physics.

**Dispatch** -- 5 built-in strategies (SCAN, LOOK, Nearest Car, ETD, Destination) plus a `DispatchStrategy` trait for your own. Automatic coordination via optimal matching -- no two cars sent to the same hall call.

**Game integration** -- typed event bus (~25 variants), lifecycle hooks, O(1) population queries, snapshot save/load, manual/inspection modes. Engine-agnostic: works with Bevy, macroquad, egui, WASM, or headless.

## Running the visual demo

The [`elevator-bevy`](crates/elevator-bevy) crate renders the simulation in 2D:

```sh
cargo run                                       # default 5-stop building
cargo run -- assets/config/space_elevator.ron    # 1,000 km orbital tether
```

## Feature flags

| Flag | Default | Adds |
|------|---------|------|
| `traffic` | yes | Poisson arrivals, daily traffic patterns. Pulls in `rand`. |
| `energy` | no | Per-elevator energy/regen modeling. |

## License

[MIT](LICENSE-MIT) or [Apache 2.0](LICENSE-APACHE), at your option.
