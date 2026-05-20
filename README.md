<div align="center">

# elevator-core

[![CI](https://img.shields.io/github/actions/workflow/status/andymai/elevator-core/ci.yml?label=CI)](https://github.com/andymai/elevator-core/actions)
[![Crates.io](https://img.shields.io/crates/v/elevator-core.svg)](https://crates.io/crates/elevator-core)
[![docs.rs](https://img.shields.io/docsrs/elevator-core)](https://docs.rs/elevator-core)
[![Last release](https://img.shields.io/github/release-date/andymai/elevator-core?label=last%20release)](https://github.com/andymai/elevator-core/releases)
[![Commit activity](https://img.shields.io/github/commit-activity/m/andymai/elevator-core?label=commits%2Fmonth)](https://github.com/andymai/elevator-core/commits/main)
[![License](https://img.shields.io/crates/l/elevator-core.svg)](LICENSE-MIT)

An engine-agnostic, tick-based elevator simulation library for Rust.\
Plug it into Bevy, Unity, your own renderer, or run headless.

From a 5-story office to a space elevator — same engine, same API.

[Guide](https://andymai.github.io/elevator-core/) · [API Reference](https://docs.rs/elevator-core) · [Examples](crates/elevator-core/examples/)

**[▶ Try the live playground](https://andymai.github.io/elevator-core/playground/)** — race two dispatch strategies on the same traffic, side-by-side in your browser.

</div>

<p align="center">
  <img src="https://raw.githubusercontent.com/andymai/elevator-core/main/media/demo.webp" alt="elevator-core web playground: two dispatch strategies racing on identical traffic" width="720" />
</p>

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

    for _ in 0..1000 {
        sim.step();
        for event in sim.drain_events() {
            match event {
                Event::RiderExited { rider, tick, .. } => {
                    println!("Tick {tick}: rider {rider:?} delivered!");
                    return Ok(());
                }
                Event::RiderAbandoned { rider, stop, tick, .. } => {
                    eprintln!("Tick {tick}: rider {rider:?} abandoned at {stop:?}");
                    return Ok(());
                }
                _ => {}
            }
        }
    }
    eprintln!("timed out after 1000 ticks");
    Ok(())
}
```

The snippet above prints `Tick N: rider … delivered!` once the rider arrives. To run a more elaborate example with three riders and aggregate metrics:

```sh
cargo run --example basic -p elevator-core
# All riders arrived at tick 335!
# Delivered: 3
# Avg wait: 5.0 ticks
# Avg ride: 328.0 ticks
```

## Use cases

| Scenario                      | How                                       |
| ----------------------------- | ----------------------------------------- |
| Office building with 5 floors | Stops at 0, 4, 8, 12, 16                  |
| Skyscraper with sky lobbies   | Multi-group dispatch, express zones       |
| Space elevator                | Stops at 0 and 1,000 — same engine        |
| Player-controlled car         | `ServiceMode::Manual` + velocity commands |
| Custom AI dispatch            | Implement `DispatchStrategy::rank()`      |
| VIP passengers, cargo, robots | Extension storage — attach any data       |

## Features

- **Arbitrary stop positions** — not limited to uniform floors; model buildings, towers, orbital tethers
- **Pluggable dispatch** — built-in SCAN, LOOK, Nearest Car, ETD, Destination; or bring your own via the `DispatchStrategy` trait
- **Rider lifecycle** — Waiting → Boarding → Riding → Exiting → Arrived/Abandoned, with hooks at each transition
- **Extension storage** — attach arbitrary typed data to riders, elevators, and stops
- **O(1) population queries** — who's waiting, riding, or resident at any stop, instantly
- **Deterministic replay** — same inputs produce the same simulation every time
- **Snapshot save/load** — serialize full simulation state for replays or networking
- **Metrics** — wait times, ride times, throughput, delivered counts, all built-in

## Scope

To set expectations, this library deliberately does not:

- **Render or draw elevators** — the core is headless; see the host crates (`elevator-bevy`, `elevator-tui`, `elevator-wasm`) or wire up your own renderer
- **Model 2-D or n-D space** — motion is strictly 1-D; the sim has no concept of floor plans, room geometry, or lateral movement
- **Simulate building systems** — HVAC, power, occupancy modelling, and other building-automation concerns are out of scope
- **Generate or manage traffic autonomously** — rider arrivals are caller-driven; the optional `traffic` feature adds Poisson helpers, but the sim never spawns riders on its own
- **Handle real-time networking or multiplayer** — snapshot serialization is provided for replays and save/load; authoritative multiplayer sync is the caller's responsibility

## Hosts

`elevator-core` itself is headless. Pick the host that matches your engine:

| Host                     | Crate                                     | Use it for                                          |
| ------------------------ | ----------------------------------------- | --------------------------------------------------- |
| Bevy                     | [`elevator-bevy`](crates/elevator-bevy)   | 2-D Rust game with HUD, mesh, and keyboard controls |
| Browser                  | [`elevator-wasm`](crates/elevator-wasm)   | wasm-bindgen surface; powers the live playground    |
| Unity / .NET / GameMaker | [`elevator-ffi`](crates/elevator-ffi)     | C ABI wrapper for native consumers                  |
| Godot                    | [`elevator-gdext`](crates/elevator-gdext) | gdext extension                                     |
| Terminal                 | [`elevator-tui`](crates/elevator-tui)     | tick-by-tick debugger and headless smoke runner     |

Anything not on the list? Drive `Simulation::step()` yourself — the API is engine-agnostic.

## Install

```toml
[dependencies]
elevator-core = "1"
```

Feature flags:

| Flag      | Default | Adds                                                       |
| --------- | ------- | ---------------------------------------------------------- |
| `traffic` | yes     | Poisson arrivals, daily traffic patterns. Pulls in `rand`. |
| `energy`  | no      | Per-elevator energy/regen modeling.                        |

## Development

```sh
cargo run                                                            # default 5-stop building (Bevy)
cargo run -- assets/config/space_elevator.ron                        # 1,000 km orbital tether
cargo run -p elevator-tui -- assets/config/default.ron               # TUI debugger, interactive
cargo run -p elevator-tui -- assets/config/default.ron --headless --until 5000  # headless CI smoke
```

The workspace includes a [Bevy frontend](crates/elevator-bevy) (2-D renderer) and [`elevator-tui`](crates/elevator-tui) (tick-by-tick debugger with pause/step controls, event log, dispatch summary, and snapshot save/load). See the [TUI Debugger guide](https://andymai.github.io/elevator-core/tui-debugger.html).

Supporting crates (`elevator-contract`, `elevator-layout-derive`, `elevator-layout-runtime`, `elevator-layout-codegen`) are build-time / test-only and keep host bindings in sync. See [CLAUDE.md](CLAUDE.md#project-structure) for the full workspace layout.

## See also

- [Stability and Versioning](STABILITY.md) — what counts as a breaking change and what doesn't
- [`elevator-core` changelog](crates/elevator-core/CHANGELOG.md) — release-please-managed
- [AI disclosure](AI-DISCLOSURE.md) — how AI tools are used in this repo

## License

[MIT](LICENSE-MIT) or [Apache 2.0](LICENSE-APACHE), at your option.
