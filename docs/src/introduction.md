# Introduction

> **Try it live:** the [in-browser playground](./playground/index.html) runs the full simulation — race two dispatch strategies on the same traffic, side-by-side, without installing anything.

**elevator-core** is an engine-agnostic elevator simulation library written in pure Rust. It gives you a tick-based simulation with realistic trapezoidal motion profiles, pluggable dispatch algorithms, and a typed event bus -- everything you need to build elevator games, building management tools, or algorithm testbeds without coupling to any particular game engine or rendering framework.

## Who is this for?

- **Game developers** who want a ready-made elevator simulation they can drop into Bevy, macroquad, or any Rust game engine.
- **Algorithm researchers** exploring dispatch strategies (SCAN, LOOK, ETD, or your own) on realistic elevator physics.
- **Educators** looking for a visual, interactive way to teach scheduling and real-time systems concepts.
- **Hobbyists** who just think elevators are neat.

## What can you build?

The library models **stops at arbitrary distances** along a shaft axis, not uniform floors. That means you can simulate a 5-story office where each floor is 4 metres apart, a 160-story skyscraper with sky lobbies and express zones, or a 2.4 km mine shaft where a single hoist serves the surface, a mid-level, and the working face. The engine doesn't enforce any particular unit -- positions are plain `f64` values, and the bundled `assets/config/space_elevator.ron` stretches that to 1,000 distance units between two stops as an upper-bound stress test.

The core crate provides primitives, not opinions. Riders are generic entities that ride elevators. Caller code decides whether they are office tenants, hotel guests, hospital patients, miners, or freight pallets. You attach semantics through the [extension storage system](extensions.md), and the simulation handles the physics and logistics.

## What elevator-core is *not*

- **Not a renderer.** No graphics, no windowing, no audio. The core crate is headless; see [Bevy Integration](bevy-integration.md) for a 2D visual wrapper.
- **Not real-time.** The tick loop runs as fast as you drive it. There is no wall-clock coupling -- a tick is whatever `ticks_per_second` says it is. Games layer real-time scheduling on top.
- **Not an ECS framework.** It uses an ECS-inspired internal layout but exposes a focused simulation API, not a general-purpose ECS.
- **Not networked or multi-building.** One simulation per process. Federation, multiplayer, and cross-building routing are out of scope.
- **Not an optimizer.** Built-in dispatch strategies (SCAN, LOOK, NearestCar, ETD, Destination) are reference implementations -- not tuned for any specific building. Bring your own algorithm if you need optimal performance.

## Determinism

Given the same initial config and the same sequence of inputs (`spawn_rider`, hook mutations, etc.), the simulation is fully deterministic. The core loop contains no internal randomness -- every tick phase is pure over the world state.

The built-in `PoissonSource` traffic generator uses an OS-seeded RNG and is **not** deterministic across runs. For reproducible traffic, implement a custom [`TrafficSource`](traffic-generation.md) over a seeded RNG. See [Snapshots and Determinism](snapshots-determinism.md) for save/load, replay, and seeded traffic patterns.

## Stability and MSRV

- **MSRV:** Rust 1.88 (uses let-chains, which stabilized in 1.88; a CI job pinned to the exact MSRV keeps this honest).
- **Versioning:** Semver. Breaking API changes bump the major version. Adding variants to `#[non_exhaustive]` enums (events, errors) is **not** considered breaking.
- **Release cadence:** Managed via release-please; see `CHANGELOG.md` in the repo.

## Project structure

The repository is a Cargo workspace with three crates:

| Crate | Purpose |
|---|---|
| `elevator-core` | The simulation library. Pure Rust, no engine dependencies. This is what you add to your project. |
| `elevator-bevy` | A Bevy 0.18 binary that wraps the core sim with 2D rendering, a HUD, and keyboard controls. Useful as a reference implementation and visual debugger. |
| `elevator-ffi` | C ABI wrapper for Unity, .NET, and other native consumers. Not published to crates.io. |

## Links

- [API Reference (docs.rs)](https://docs.rs/elevator-core)
- [crates.io](https://crates.io/crates/elevator-core)
- [GitHub](https://github.com/andymai/elevator-core)

## Next steps

Head to [Quick Start](quick-start.md) to build your first simulation in under 30 lines of Rust.
