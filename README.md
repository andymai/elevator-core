<div align="center">

# elevator-core

**From a 5-story office to a space elevator — same engine, same API.**

An engine-agnostic, tick-based elevator simulation library for Rust.\
Plug it into Bevy, Unity, your own renderer, or run headless.

[![Crates.io](https://img.shields.io/crates/v/elevator-core.svg)](https://crates.io/crates/elevator-core)
[![docs.rs](https://img.shields.io/docsrs/elevator-core)](https://docs.rs/elevator-core)
[![CI](https://img.shields.io/github/actions/workflow/status/andymai/elevator-core/ci.yml?label=CI)](https://github.com/andymai/elevator-core/actions)
[![License](https://img.shields.io/crates/l/elevator-core.svg)](LICENSE-MIT)

[Guide](https://andymai.github.io/elevator-core/) · [API Reference](https://docs.rs/elevator-core) · [Examples](crates/elevator-core/examples/) · [Changelog](CHANGELOG.md)

**[▶ Try the live playground](https://andymai.github.io/elevator-core/playground/)** — swap dispatch strategies, tune traffic, and share seeds right in your browser.

</div>

<!-- Drop a GIF of the Bevy demo here when you have one -->

## What it does

You define stops at arbitrary positions on a 1-D axis, spawn riders, and call `step()`. The engine handles dispatch, trapezoidal motion, doors, boarding, and metrics — your code just reacts to events.

```rust,no_run
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
                return Ok(());
            }
        }
    }
}
```

```sh
cargo run --example basic -p elevator-core   # try it now
```

## Use cases

| Scenario | How |
|---|---|
| Office building with 5 floors | Stops at 0, 4, 8, 12, 16 |
| Skyscraper with sky lobbies | Multi-group dispatch, express zones |
| Space elevator | Stops at 0 and 1,000,000 — same engine |
| Player-controlled car | `ServiceMode::Manual` + velocity commands |
| Custom AI dispatch | Implement `DispatchStrategy::rank()` |
| VIP passengers, cargo, robots | Extension storage — attach any data |

## Features

- **Arbitrary stop positions:** not limited to uniform floors; model buildings, towers, orbital tethers
- **Pluggable dispatch:** built-in SCAN, LOOK, Nearest Car, ETD, Destination; or bring your own via the `DispatchStrategy` trait
- **Rider lifecycle:** Waiting → Boarding → Riding → Exiting → Arrived/Abandoned, with hooks at each transition
- **Extension storage:** attach arbitrary typed data to riders, elevators, and stops
- **O(1) population queries:** who's waiting, riding, or resident at any stop, instantly
- **Deterministic replay:** same inputs produce the same simulation every time
- **Snapshot save/load:** serialize full simulation state for replays or networking
- **Metrics:** wait times, ride times, throughput, delivered counts, all built-in

## Non-goals

This is a simulation library, not a game. It deliberately does **not** include:

- Rendering or UI — wrap it with [Bevy](crates/elevator-bevy), Unity ([FFI](crates/elevator-ffi)), or anything else
- AI passengers or traffic generation — use the optional `traffic` feature flag, or drive arrivals yourself
- Building layout or 2-D floor plans — the sim is 1-D by design

## Visual demo

The workspace includes a [Bevy frontend](crates/elevator-bevy) that renders the simulation in 2-D:

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
