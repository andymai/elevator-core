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
- `world.rs` — `World` with encapsulated `SecondaryMap` per component type (struct-of-arrays), typed accessors, and extension storage for custom game components
- `components/` — `Rider`, `Elevator`, `Stop`, `Position`, `Velocity`, `Route`, `Patience`, `Preferences`, `Zone`
- `systems/` — Free functions: `advance_transient`, `dispatch`, `movement`, `doors`, `loading`, `metrics`, `reposition`
- `sim.rs` — `Simulation` with encapsulated fields accessed via methods, per-phase sub-stepping
- `query/` — ECS-style query builder: `world.query::<(EntityId, &Rider, &Position)>().with::<Elevator>().iter()`
- `error.rs` — `SimError` enum for config validation and runtime errors; `RejectionReason` enum
- `time.rs` — `TimeAdapter` for tick↔wall-clock conversion
- `prelude` module re-exports common types

Key design:
- **Encapsulated World**: Component maps are `pub(crate)`, accessed via typed methods (`world.rider(id)`, `world.elevator_mut(id)`). Extension storage (`world.insert_ext::<T>()`) for game-specific custom components, auto-cleaned on `despawn()`. Global resources (`world.insert_resource::<T>()`) for singletons.
- **Query builder**: `world.query::<(EntityId, &Rider, &Position)>().with::<Elevator>().iter()`. Supports built-in and extension (`&Ext<T>`) components, `With`/`Without`/`ExtWith`/`ExtWithout` filters, `Option<&T>` optional reads, single-entity `.get(id)`, tuples up to arity 8. Zero unsafe.
- **Dynamic topology**: `sim.add_stop()`, `sim.add_elevator()` at runtime. `sim.disable(id)`/`sim.enable(id)` with lifecycle events. All systems skip disabled entities.
- **Sub-stepping**: Per-phase methods (`sim.run_dispatch()`, `sim.run_movement()`, etc.) plus `sim.advance_tick()`. `step()` composes them.
- **Error handling**: `Simulation::new()` returns `Result<Self, SimError>` with config validation. `spawn_rider_by_stop_id()` returns `Result<EntityId, SimError>`.
- **Game-agnostic riders**: `Rider` = anything that rides (passengers, cargo, VIPs). Games add custom components via extension storage.
- **Route-based loading**: Riders with a `Route` component are auto-boarded/alighted. No Route = game manages manually.
- **Stop-level dispatch**: `DispatchManifest` uses `BTreeMap` for deterministic iteration order.
- **Per-group dispatch**: Each `ElevatorGroup` can have its own `DispatchStrategy` via `sim.set_dispatch(group, strategy)`.
- **Composable tick**: Games call `sim.step()` or per-phase methods for full control.
- **Event system**: Typed `Event` enum for sim events, `EventChannel<T>` as a world resource for game events.
- Simulation uses "stops" at arbitrary distances (not uniform floors) — supports buildings and space elevators
- Tick-based simulation with 6-phase tick loop: advance_transient → dispatch → movement → doors → loading → metrics
- Pluggable dispatch via `DispatchStrategy` trait (SCAN, LOOK, NearestCar, ETD algorithms)
- Trapezoidal velocity profile for elevator movement
- Weight capacity system with `RejectionReason` enum (not String)

## Type Naming

Domain-first naming convention:
- `Rider` (not `RiderData`), `Elevator` (not `ElevatorCar`), `Stop` (not `StopData`), `Zone` (not `ZoneData`)
- `RiderPhase` (not `RiderState`), `ElevatorPhase` (not `ElevatorState`)
- `Event` (not `SimEvent`), `RejectionReason` (not `String`)
- Component fields: `.phase` (not `.state`)

## Bevy API Notes (0.18)

- Events renamed to Messages: `Message`, `MessageWriter`, `MessageReader`, `add_message()`
- Window resolution takes `(u32, u32)` not `(f32, f32)`
- 2D rendering: `Mesh2d` + `MeshMaterial2d` + `Transform`
- HUD: `Text` + `Node` + `TextFont` + `TextColor`

## Config

Building layout and sim params in `assets/config/default.ron` (RON format).
Space elevator config in `assets/config/space_elevator.ron`.
Config uses `StopId`/`ElevatorConfig` — mapped to `EntityId` at init via `sim.stop_entity(StopId)`.
Config validated at construction time (zero stops, duplicate IDs, negative speeds, invalid starting_stop).

## Testing

91 tests covering: config deserialization, door FSM, movement physics, SCAN/LOOK/NearestCar/ETD dispatch, World CRUD, extension components, event serialization, traffic patterns, metrics, end-to-end scenario replay, dynamic topology, query builder, sub-stepping, resources, and disabled entities.
