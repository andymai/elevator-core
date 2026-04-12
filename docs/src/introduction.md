# Introduction

**elevator-core** is an engine-agnostic elevator simulation library written in pure Rust. It gives you a tick-based simulation with realistic trapezoidal motion profiles, pluggable dispatch algorithms, and a typed event bus -- everything you need to build elevator games, building management tools, or algorithm testbeds without coupling to any particular game engine or rendering framework.

## Who is this for?

- **Game developers** who want a ready-made elevator simulation they can drop into Bevy, macroquad, or any Rust game engine.
- **Algorithm researchers** exploring dispatch strategies (SCAN, LOOK, ETD, or your own) on realistic elevator physics.
- **Educators** looking for a visual, interactive way to teach scheduling and real-time systems concepts.
- **Hobbyists** who just think elevators are neat.

## What can you build?

The library models **stops at arbitrary distances** along a shaft axis, not uniform floors. That means you can simulate a 5-story office building where each floor is 4 meters apart, a 160-story skyscraper with sky lobbies and express zones, or -- why not -- a **space elevator** climbing 1,000 km from a ground station to an orbital platform. The `space_elevator.ron` config included in the repo does exactly that.

The core crate provides primitives, not opinions. Riders are generic entities that ride elevators. Your game decides whether they are office workers, hotel guests, cargo pallets, or astronauts. You attach semantics through the extension storage system, and the simulation handles the physics and logistics.

## Project structure

The repository is a Cargo workspace with two crates:

| Crate | Purpose |
|---|---|
| `elevator-core` | The simulation library. Pure Rust, no engine dependencies. This is what you add to your project. |
| `elevator-bevy` | A Bevy 0.18 binary that wraps the core sim with 2D rendering, a HUD, and keyboard controls. Useful as a reference implementation and visual debugger. |

## Links

- [crates.io](https://crates.io/crates/elevator-core)
- [docs.rs](https://docs.rs/elevator-core)
- [GitHub](https://github.com/andymai/elevator-core)

## Next steps

Head to [Getting Started](getting-started.md) to build your first simulation in under 30 lines of Rust.
