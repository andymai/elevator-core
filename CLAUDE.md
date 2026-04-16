# Elevator Simulator

## Project Structure

Cargo workspace with two crates:
- `crates/elevator-core` — Engine-agnostic simulation library (pure Rust, no Bevy deps)
- `crates/elevator-bevy` — Bevy 0.18 game binary wrapping the core sim

## Build

```bash
cargo test -p elevator-core --all-features
cargo clippy -p elevator-core --all-features
cargo build            # full workspace (PKG_CONFIG_PATH set by .cargo/config.toml)
cargo run              # default config
cargo run -- assets/config/space_elevator.ron
```

System deps (Ubuntu): `libudev-dev libasound2-dev`

## Pre-commit Hook

Shared hook at `.githooks/pre-commit` — runs fmt, clippy (all features), tests, and doc tests. After cloning:

```bash
git config core.hooksPath .githooks
```

## Architecture

ECS-like internal architecture (no ECS crate dependency). Struct-of-arrays `World` with typed accessors, extension storage for game components, and global resources. Query builder for iteration/filtering.

Key design decisions:
- Core crate is an unopinionated engine library — suggest primitives, not game mechanics
- "Stops" at arbitrary distances, not uniform floors — supports buildings and space elevators
- Tick-based with 8-phase loop: advance_transient → dispatch → reposition → advance_queue → movement → doors → loading → metrics
- Pluggable dispatch via `DispatchStrategy` trait, per elevator group
- Game-agnostic riders: `Rider` = anything that rides; games add semantics via extension storage
- Rider lifecycle: Waiting → Boarding → Riding → Exiting → Arrived/Abandoned; consumer can settle (→ Resident) or despawn
- Population tracking: `RiderIndex` maintains O(1) per-stop queries (residents_at, waiting_at, abandoned_at)
- Route-based loading: riders with `Route` are auto-boarded/exited; no Route = game manages manually
- Trapezoidal velocity profile for movement
- Config validated at construction time

## Conventions

Commits: conventional commits enforced by hook (`feat:`, `fix:`, `refactor:`, `chore:`, etc.)

Type naming — domain-first, no redundant suffixes:
- `Rider`, `Elevator`, `Stop`, `Line` (not `RiderData`, `ElevatorCar`)
- `RiderPhase`, `ElevatorPhase` (not `*State`); fields use `.phase`
- `Event`, `RejectionReason` (not `SimEvent`, `String`)

## Bevy API Notes (0.18)

- Events renamed to Messages: `Message`, `MessageWriter`, `MessageReader`, `add_message()`
- Window resolution takes `(u32, u32)` not `(f32, f32)`
- 2D rendering: `Mesh2d` + `MeshMaterial2d` + `Transform`
- HUD: `Text` + `Node` + `TextFont` + `TextColor`

## Config

RON format in `assets/config/`. Config uses `StopId`/`ElevatorConfig` — mapped to `EntityId` at init.
