# Elevator Simulator

## Project Structure

Cargo workspace with two crates:
- `crates/elevator-sim-core` — Engine-agnostic simulation library (pure Rust, no Bevy deps)
- `crates/elevator-sim-bevy` — Bevy 0.18 game binary wrapping the core sim

## Build

```bash
# Core crate only
cargo test -p elevator-sim-core
cargo clippy -p elevator-sim-core

# Full workspace (needs system deps)
PKG_CONFIG_PATH="/var/home/linuxbrew/.linuxbrew/Cellar/systemd/260.1/lib/pkgconfig:$PKG_CONFIG_PATH" cargo build

# Run the game
PKG_CONFIG_PATH="/var/home/linuxbrew/.linuxbrew/Cellar/systemd/260.1/lib/pkgconfig:$PKG_CONFIG_PATH" cargo run -p elevator-sim-bevy
```

System deps (Ubuntu): `libudev-dev libasound2-dev`

## Architecture

- Simulation uses "stops" at arbitrary distances (not uniform floors) — supports buildings and space elevators
- Tick-based simulation with 5-phase tick loop: dispatch → movement → doors → loading → bookkeeping
- Pluggable dispatch via `DispatchStrategy` trait (MVP: SCAN algorithm)
- Trapezoidal velocity profile for elevator movement
- Weight capacity system for passengers and cargo
- Typed event bus (`SimEvent` enum) for UI/metrics/replay consumers

## Bevy API Notes (0.18)

- Events renamed to Messages: `Message`, `MessageWriter`, `MessageReader`, `add_message()`
- Window resolution takes `(u32, u32)` not `(f32, f32)`
- 2D rendering: `Mesh2d` + `MeshMaterial2d` + `Transform`
- HUD: `Text` + `Node` + `TextFont` + `TextColor`

## Config

Building layout and sim params in `assets/config/default.ron` (RON format).

## Testing

23 tests covering: config deserialization, door FSM, movement physics, SCAN dispatch, and end-to-end scenario replay.
