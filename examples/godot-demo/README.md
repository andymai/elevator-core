# Godot Elevator Demo

A 2D elevator simulation demo using the `elevator-core` library via a GDExtension binding (`elevator-gdext`).

## Prerequisites

- **Rust toolchain** (stable, 1.88+)
- **Godot 4.3+** (standard build, not .NET)

## Build

```bash
# From the repo root or this directory:
bash examples/godot-demo/build.sh
```

This compiles `elevator-gdext` in release mode and copies the native library to `bin/`.

## Run

1. Open `examples/godot-demo/` as a Godot project
2. Press **Play** (F5)

## Controls

| Key | Action |
|-----|--------|
| Space | Toggle pause |
| 1 | 1x speed |
| 2 | 2x speed |
| 3 | 10x speed |
| Spawn button | Add a random rider |

## Project Structure

```
examples/godot-demo/
  project.godot              Godot project file
  elevator_gdext.gdextension GDExtension registration
  bin/                       Native library (built by build.sh)
  scenes/
    main.tscn                Main scene
  scripts/
    main.gd                  Root script — creates ElevatorSim, wires controls
    elevator_view.gd         2D rendering — shaft, stops, car, riders
    hud.gd                   Stats overlay — tick, speed, metrics
```

## Architecture

The `ElevatorSim` node (`crates/elevator-gdext/`) wraps `elevator-core::Simulation` directly as a Godot Node subclass via gdext. GDScript calls methods like `spawn_rider()`, `get_elevator()`, `get_metrics()`, and `drain_events()` — all data is marshaled as Godot Dictionaries and Arrays.

Rider spawning uses a Poisson timer (matching the Bevy demo's `passenger_ai.rs`) with parameters read from the RON config's `passenger_spawning` section.
