# Elevator Simulator

## Project Structure

Cargo workspace with three crates:
- `crates/elevator-core` — Engine-agnostic simulation library (pure Rust, no Bevy deps)
- `crates/elevator-bevy` — Bevy 0.18 game binary wrapping the core sim
- `crates/elevator-ffi` — C ABI wrapper for Unity/.NET interop (not published to crates.io)

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

Shared hook at `.githooks/pre-commit` — runs fmt, clippy (all features on core), core tests, doc tests, `cargo check --workspace` (catches FFI/bevy drift), a Cargo.lock drift guard, and doc lint (when `docs/` files are staged). Rust checks are skipped when only `playground/` files are staged. When `playground/` files are staged, runs lint-staged, typecheck, and vitest (bypass with `SKIP_PLAYGROUND_HOOKS=1`). Conventional-commit check at `.githooks/commit-msg` via commitlint. After cloning:

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

Commits: conventional commits (`feat:`, `fix:`, `refactor:`, `chore:`, etc.). `#[non_exhaustive]` enum additions are NOT breaking — use `feat:` not `feat!:`.

PR workflow: every change lands via PR. Wait for the greptile review bot before merging; no auto-merge. After a PR merges, `git checkout main && git pull` before starting new work.

Parallel work: use git worktrees under `.worktrees/<branch>` (gitignored). Sibling-directory worktrees and `.claude/worktrees/` are not the convention.

Type naming — domain-first, no redundant suffixes:
- `Rider`, `Elevator`, `Stop`, `Line` (not `RiderData`, `ElevatorCar`)
- `RiderPhase`, `ElevatorPhase` (not `*State`); fields use `.phase`
- `Event`, `RejectionReason` (not `SimEvent`, `String`)

ID types: `ElevatorId`, `RiderId`, `StopId` are phantom-typed newtypes over `EntityId`. Prefer them on public API surfaces for type safety; `EntityId` is the untyped form used internally by `World`.

## Bevy API Notes (0.18)

- Events renamed to Messages: `Message`, `MessageWriter`, `MessageReader`, `add_message()`
- Window resolution takes `(u32, u32)` not `(f32, f32)`
- 2D rendering: `Mesh2d` + `MeshMaterial2d` + `Transform`
- HUD: `Text` + `Node` + `TextFont` + `TextColor`

## Docs

mdBook guide in `docs/` — deployed to GitHub Pages. Lint with `scripts/lint-docs.sh`.

## Config

RON format in `assets/config/`. Config uses `StopId`/`ElevatorConfig` — mapped to `EntityId` at init.
