# elevator-core

Engine-agnostic elevator simulation library with pluggable dispatch strategies.

## Features

- **Tick-based simulation** with a 6-phase loop: advance transient states, dispatch, movement, doors, loading, metrics
- **Pluggable dispatch** via the `DispatchStrategy` trait -- built-in SCAN, LOOK, nearest-car, and ETD algorithms
- **Arbitrary stop positions** -- supports buildings, skyscrapers, and space elevators
- **Trapezoidal velocity profiles** for realistic acceleration/deceleration
- **Extension components** -- attach game-specific data to entities without modifying the library
- **Snapshot save/load** with full state preservation
- **Scenario replay** for deterministic testing
- **ECS-style query builder** for iterating entities by component composition
- **Lifecycle hooks** for injecting custom logic before/after each phase
- **Zero unsafe code** -- `#![forbid(unsafe_code)]`

## Quick Start

```rust
use elevator_core::prelude::*;

let mut sim = SimulationBuilder::new()
    .stop(StopId(0), "Ground", 0.0)
    .stop(StopId(1), "Floor 2", 4.0)
    .stop(StopId(2), "Floor 3", 8.0)
    .build()
    .unwrap();

// Spawn a rider going from ground to floor 3.
sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 75.0).unwrap();

// Run the simulation.
for _ in 0..1000 {
    sim.step();
}

println!("Delivered: {}", sim.metrics().total_delivered());
```

## Tick Loop

Each call to `sim.step()` executes six phases in order:

1. **Advance Transient** -- promote one-tick states (Boarding -> Riding, Alighting -> Arrived)
2. **Dispatch** -- assign idle elevators to stops via the pluggable strategy
3. **Movement** -- update positions using trapezoidal velocity profiles
4. **Doors** -- tick door open/close FSMs
5. **Loading** -- board and alight riders at stops with open doors
6. **Metrics** -- aggregate wait times, ride times, throughput

## Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `traffic` | yes | Enables traffic pattern generation (adds `rand` dependency) |

## License

Licensed under either of [Apache License, Version 2.0](LICENSE-APACHE) or [MIT license](LICENSE-MIT) at your option.
