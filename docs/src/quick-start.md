# Quick Start

Build a minimal elevator simulation from scratch: a 3-stop building with one elevator, a single rider, and a loop that runs until the rider arrives.

## Add the dependency

```bash
cargo add elevator-core
```

## Import the prelude

The prelude re-exports the 22 names that cover most usage — building a simulation, stepping it, querying world state, writing custom dispatch, and reading aggregate metrics:

```rust
use elevator_core::prelude::*;
```

This brings in `Simulation`, `SimulationBuilder`, `RiderBuilder`, `SimConfig`, `ElevatorConfig`, `StopConfig`, the typed IDs (`StopId`, `ElevatorId`, `RiderId`, `EntityId`, `GroupId`), `Event`, `SimError`, `RejectionReason`, the phase + direction enums (`ElevatorPhase`, `RiderPhase`, `Direction`), the dispatch trait + presets (`DispatchStrategy`, `BuiltinStrategy`, `BuiltinReposition`), and `World` + `Metrics`. Fine-grained component types (`Position`, `Speed`, `Route`, `Patience`, …), per-strategy structs (`ScanDispatch`, `EtdDispatch`, …), extension keys (`ExtKey`), and traffic types are imported explicitly from their sub-modules when needed.

### Feature flags

| Flag | Default? | Enables |
|---|---|---|
| `traffic` | yes | `PoissonSource`, `TrafficPattern`, `TrafficSchedule`. Pulls in `rand`. |
| `energy` | no | Per-elevator `EnergyProfile`/`EnergyMetrics` components. |

Turn off defaults with `default-features = false` for a leaner build.

## Build a simulation

Use `SimulationBuilder` to set up a 3-stop building with one elevator. `ElevatorConfig` has sensible defaults (max speed 2.0, acceleration 1.5, deceleration 2.0, 800 kg capacity), so you only need to specify stop positions and a starting stop:

```rust,no_run
use elevator_core::prelude::*;
use elevator_core::config::ElevatorConfig;
use elevator_core::stop::StopId;

fn main() -> Result<(), SimError> {
    let mut sim = SimulationBuilder::new()
        .stop(StopId(0), "Lobby", 0.0)
        .stop(StopId(1), "Floor 2", 4.0)
        .stop(StopId(2), "Floor 3", 8.0)
        .elevator(ElevatorConfig { starting_stop: StopId(0), ..Default::default() })
        .building_name("Tutorial Tower")
        .build()?;

    Ok(())
}
```

## Spawn a rider

A rider is anything that rides an elevator. Provide an origin stop, a destination stop, and a weight:

```rust,no_run
# use elevator_core::prelude::*;
# use elevator_core::__doctest_prelude::*;
# fn main() -> Result<(), SimError> {
# let mut sim = SimulationBuilder::new()
#     .stop(StopId(0), "Lobby", 0.0)
#     .stop(StopId(1), "Floor 2", 4.0)
#     .stop(StopId(2), "Floor 3", 8.0)
#     .elevator(ElevatorConfig { starting_stop: StopId(0), ..Default::default() })
#     .build()?;
let rider_id = sim.spawn_rider(
    StopId(0),  // origin: Lobby
    StopId(2),  // destination: Floor 3
    75.0,       // weight in kg
)?;
# Ok(())
# }
```

`spawn_rider` maps config-level `StopId` values to runtime `EntityId` values internally. It returns `Result<RiderId, SimError>` -- it fails if you pass a `StopId` that doesn't exist in your building. `RiderId` is a typed wrapper around `EntityId`; use `.entity()` to get the inner `EntityId` when needed.

## Run the simulation loop

Each call to `sim.step()` advances the simulation by one tick, running all [eight phases](simulation-loop.md) of the tick loop. After stepping, drain events to see what happened:

```rust,no_run
# use elevator_core::prelude::*;
# use elevator_core::__doctest_prelude::*;
# fn main() -> Result<(), SimError> {
# let mut sim = SimulationBuilder::new()
#     .stop(StopId(0), "Lobby", 0.0)
#     .stop(StopId(1), "Floor 2", 4.0)
#     .stop(StopId(2), "Floor 3", 8.0)
#     .elevator(ElevatorConfig { starting_stop: StopId(0), ..Default::default() })
#     .build()?;
# let rider_id = sim.spawn_rider(StopId(0), StopId(2), 75.0)?;
let mut arrived = false;

while !arrived {
    sim.step();

    for event in sim.drain_events() {
        match event {
            Event::RiderBoarded { rider, elevator, tick, .. } => {
                println!("Tick {tick}: rider {rider:?} boarded elevator {elevator:?}");
            }
            Event::ElevatorArrived { elevator, at_stop, tick } => {
                println!("Tick {tick}: elevator {elevator:?} arrived at {at_stop:?}");
            }
            Event::RiderExited { rider, stop, tick, .. } => {
                println!("Tick {tick}: rider {rider:?} exited at {stop:?}");
                if rider == rider_id.entity() {
                    arrived = true;
                }
            }
            _ => {}
        }
    }
}

println!("\n--- Summary ---");
println!("Total ticks: {}", sim.current_tick());
println!("{}", sim.metrics());
# Ok(())
# }
```

## The complete program

Everything together as a single runnable file:

```rust,no_run
use elevator_core::prelude::*;
use elevator_core::config::ElevatorConfig;
use elevator_core::stop::StopId;

fn main() -> Result<(), SimError> {
    let mut sim = SimulationBuilder::new()
        .stop(StopId(0), "Lobby", 0.0)
        .stop(StopId(1), "Floor 2", 4.0)
        .stop(StopId(2), "Floor 3", 8.0)
        .elevator(ElevatorConfig { starting_stop: StopId(0), ..Default::default() })
        .building_name("Tutorial Tower")
        .build()?;

    let rider_id = sim.spawn_rider(StopId(0), StopId(2), 75.0)?;

    let mut arrived = false;
    while !arrived {
        sim.step();

        for event in sim.drain_events() {
            match event {
                Event::RiderBoarded { rider, elevator, tick, .. } => {
                    println!("Tick {tick}: rider {rider:?} boarded elevator {elevator:?}");
                }
                Event::ElevatorArrived { elevator, at_stop, tick } => {
                    println!("Tick {tick}: elevator {elevator:?} arrived at {at_stop:?}");
                }
                Event::RiderExited { rider, stop, tick, .. } => {
                    println!("Tick {tick}: rider {rider:?} exited at {stop:?}");
                    if rider == rider_id.entity() {
                        arrived = true;
                    }
                }
                _ => {}
            }
        }
    }

    println!("\n--- Summary ---");
    println!("Total ticks: {}", sim.current_tick());
    println!("{}", sim.metrics());

    Ok(())
}
```

## What just happened?

1. The **builder** created a `Simulation` containing a `World` with three stop entities and one elevator entity, plus a SCAN dispatch strategy (the default).
2. `spawn_rider` created a rider entity at the Lobby with a route to Floor 3.
3. Each `step()` ran the [eight-phase tick loop](simulation-loop.md). **Dispatch** noticed a waiting rider and sent the elevator to the Lobby. **Movement** moved the elevator using a trapezoidal velocity profile. **Doors** opened and closed. **Loading** boarded and exited the rider. **Metrics** updated aggregate stats.
4. Events fired at each significant moment, and we pattern-matched on them to detect arrival.

## Next steps

- [Configuration](configuration.md) -- load buildings from RON files instead of building in code
- [Stops, Lines, and Groups](stops-lines-groups.md) -- understand the building topology model
- [Dispatch Strategies](dispatch-strategies.md) -- choose or write dispatch algorithms
