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

# Full workspace (PKG_CONFIG_PATH set by .cargo/config.toml)
cargo build
cargo run                                          # default config
cargo run -- assets/config/space_elevator.ron       # space elevator
```

System deps (Ubuntu): `libudev-dev libasound2-dev`

## Architecture

ECS-like internal architecture (no ECS crate dependency):
- `entity.rs` — `EntityId` via slotmap generational keys
- `world.rs` — `World` with `SecondaryMap` per component type (struct-of-arrays)
- `components/` — `RiderData`, `ElevatorCar`, `StopData`, `Position`, `Velocity`, `Route`, `Patience`, `Preferences`
- `systems/` — Free functions: `advance_transient`, `dispatch`, `movement`, `doors`, `loading`
- `sim.rs` — Thin `Simulation` wrapper with `pub world`, `pub events`, phase registration

Key design:
- **Game-agnostic riders**: `RiderData` = anything that rides (passengers, cargo, VIPs). Games add custom components.
- **Route-based loading**: Riders with a `Route` component are auto-boarded/alighted. No Route = game manages manually.
- **Stop-level dispatch**: `DispatchManifest` has aggregate demand per stop, not individual rider details.
- **Composable tick**: Games call `sim.tick()` or invoke system functions directly on `&mut World`.
- Simulation uses "stops" at arbitrary distances (not uniform floors) — supports buildings and space elevators
- Tick-based simulation with 5-phase tick loop: advance_transient → dispatch → movement → doors → loading
- Pluggable dispatch via `DispatchStrategy` trait (MVP: SCAN algorithm)
- Trapezoidal velocity profile for elevator movement
- Weight capacity system for riders
- Typed event bus (`SimEvent` enum) with unified rider events

## Bevy API Notes (0.18)

- Events renamed to Messages: `Message`, `MessageWriter`, `MessageReader`, `add_message()`
- Window resolution takes `(u32, u32)` not `(f32, f32)`
- 2D rendering: `Mesh2d` + `MeshMaterial2d` + `Transform`
- HUD: `Text` + `Node` + `TextFont` + `TextColor`

## Config

Building layout and sim params in `assets/config/default.ron` (RON format).
Space elevator config in `assets/config/space_elevator.ron`.
Config uses `StopId`/`ElevatorConfig` — mapped to `EntityId` at init via `sim.stop_lookup`.

## Testing

32 tests covering: config deserialization, door FSM, movement physics, SCAN dispatch, World CRUD, event serialization, and end-to-end scenario replay.
