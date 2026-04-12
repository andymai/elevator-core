# Getting Started

In this chapter we will build a minimal elevator simulation from scratch: a 3-stop building with one elevator, a single rider, and a loop that runs until the rider arrives at their destination.

## Add the dependency

```bash
cargo add elevator-core
```

Or add it to your `Cargo.toml` manually:

```toml
[dependencies]
elevator-core = "0.1"
```

## Import the prelude

The prelude re-exports everything you need for typical usage:

```rust
use elevator_core::prelude::*;
```

## Build a simulation

We will use `SimulationBuilder` to set up a 3-stop building. The builder starts with sensible defaults (2 stops, 1 elevator, SCAN dispatch, 60 ticks per second), but we will override the stops to create our own layout.

```rust,no_run
use elevator_core::prelude::*;
use elevator_core::config::ElevatorConfig;
use elevator_core::stop::StopId;

fn main() -> Result<(), SimError> {
    let mut sim = SimulationBuilder::new()
        // Clear the default stops and define our own.
        .stops(vec![])
        .stop(StopId(0), "Lobby", 0.0)
        .stop(StopId(1), "Floor 2", 4.0)
        .stop(StopId(2), "Floor 3", 8.0)
        .building_name("Tutorial Tower")
        .build()?;

    Ok(())
}
```

`SimulationBuilder::new()` gives us one elevator with reasonable physics defaults (max speed 2.0, acceleration 1.5, deceleration 2.0, 800 kg capacity). That is plenty for our tutorial. If you want to customize the elevator, chain `.elevators(vec![])` followed by `.elevator(ElevatorConfig { ... })` -- we will cover that in the [Configuration](configuration.md) chapter.

## Spawn a rider

A rider is anything that rides an elevator. To spawn one, you provide an origin stop, a destination stop, and a weight:

```rust,no_run
# use elevator_core::prelude::*;
# use elevator_core::stop::StopId;
# fn main() -> Result<(), SimError> {
# let mut sim = SimulationBuilder::new()
#     .stops(vec![])
#     .stop(StopId(0), "Lobby", 0.0)
#     .stop(StopId(1), "Floor 2", 4.0)
#     .stop(StopId(2), "Floor 3", 8.0)
#     .build()?;
let rider_id = sim.spawn_rider_by_stop_id(
    StopId(0),  // origin: Lobby
    StopId(2),  // destination: Floor 3
    75.0,       // weight in kg
)?;
println!("Spawned rider: {:?}", rider_id);
# Ok(())
# }
```

`spawn_rider_by_stop_id` maps config-level `StopId` values to runtime `EntityId` values internally. It returns `Result<EntityId, SimError>` -- it will fail if you pass a `StopId` that does not exist in your building.

## Run the simulation loop

Each call to `sim.step()` advances the simulation by one tick, running all six phases of the tick loop (advance transient, dispatch, movement, doors, loading, metrics). After stepping, you can drain events to see what happened:

```rust,no_run
# use elevator_core::prelude::*;
# use elevator_core::stop::StopId;
# fn main() -> Result<(), SimError> {
# let mut sim = SimulationBuilder::new()
#     .stops(vec![])
#     .stop(StopId(0), "Lobby", 0.0)
#     .stop(StopId(1), "Floor 2", 4.0)
#     .stop(StopId(2), "Floor 3", 8.0)
#     .build()?;
# let rider_id = sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 75.0)?;
let mut arrived = false;

while !arrived {
    sim.step();

    for event in sim.drain_events() {
        match event {
            Event::RiderBoarded { rider, elevator, tick } => {
                println!("Tick {}: rider {:?} boarded elevator {:?}", tick, rider, elevator);
            }
            Event::ElevatorArrived { elevator, at_stop, tick } => {
                println!("Tick {}: elevator {:?} arrived at stop {:?}", tick, elevator, at_stop);
            }
            Event::RiderAlighted { rider, stop, tick, .. } => {
                println!("Tick {}: rider {:?} arrived at stop {:?}", tick, rider, stop);
                if rider == rider_id {
                    arrived = true;
                }
            }
            _ => {}
        }
    }
}

println!("Rider delivered!");
println!("Total ticks: {}", sim.current_tick());
println!("Avg wait time: {:.1} ticks", sim.metrics().avg_wait_time());
# Ok(())
# }
```

## The complete program

Here is everything together as a single runnable file:

```rust,no_run
use elevator_core::prelude::*;
use elevator_core::stop::StopId;

fn main() -> Result<(), SimError> {
    // 1. Build a 3-stop building.
    let mut sim = SimulationBuilder::new()
        .stops(vec![])
        .stop(StopId(0), "Lobby", 0.0)
        .stop(StopId(1), "Floor 2", 4.0)
        .stop(StopId(2), "Floor 3", 8.0)
        .building_name("Tutorial Tower")
        .build()?;

    // 2. Spawn a rider going from the Lobby to Floor 3.
    let rider_id = sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 75.0)?;

    // 3. Run until the rider arrives.
    let mut arrived = false;
    while !arrived {
        sim.step();

        for event in sim.drain_events() {
            match event {
                Event::RiderBoarded { rider, elevator, tick } => {
                    println!("Tick {tick}: rider {rider:?} boarded elevator {elevator:?}");
                }
                Event::ElevatorArrived { elevator, at_stop, tick } => {
                    println!("Tick {tick}: elevator {elevator:?} arrived at {at_stop:?}");
                }
                Event::RiderAlighted { rider, stop, tick, .. } => {
                    println!("Tick {tick}: rider {rider:?} alighted at {stop:?}");
                    if rider == rider_id {
                        arrived = true;
                    }
                }
                _ => {}
            }
        }
    }

    // 4. Print summary metrics.
    let m = sim.metrics();
    println!("\n--- Summary ---");
    println!("Total ticks:    {}", sim.current_tick());
    println!("Avg wait time:  {:.1} ticks", m.avg_wait_time());
    println!("Avg ride time:  {:.1} ticks", m.avg_ride_time());
    println!("Delivered:      {}", m.total_delivered());

    Ok(())
}
```

Run it with `cargo run` and you should see the rider move from the Lobby to Floor 3, with events printed along the way.

## What just happened?

1. The **builder** created a `Simulation` containing a `World` with three stop entities and one elevator entity, plus a SCAN dispatch strategy.
2. `spawn_rider_by_stop_id` created a rider entity at the Lobby with a route to Floor 3.
3. Each `step()` ran the six-phase tick loop. The **dispatch** phase noticed a waiting rider and sent the elevator to the Lobby. The **movement** phase moved the elevator using a trapezoidal velocity profile. The **doors** phase opened and closed doors. The **loading** phase boarded and alighted the rider. The **metrics** phase updated aggregate stats.
4. Events fired at each significant moment, and we pattern-matched on them to detect arrival.

Next up: [Core Concepts](core-concepts.md) dives deeper into the entity model, the tick loop phases, and the lifecycle of riders and elevators.
