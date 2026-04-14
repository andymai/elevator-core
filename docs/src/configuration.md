# Configuration

So far we have been wiring up the simulation entirely in code. This chapter covers both that programmatic path and an alternative: **RON config files** loaded from disk. Both produce the same `SimConfig` under the hood, so everything the builder can do, a config file can express, and vice versa.

## Programmatic configuration

The `SimulationBuilder` provides a fluent API for assembling a simulation in code. We have seen the basics already -- here is a more complete example that customizes everything:

```rust,no_run
use elevator_core::prelude::*;
use elevator_core::config::ElevatorConfig;
use elevator_core::stop::StopId;
use elevator_core::dispatch::etd::EtdDispatch;

fn main() -> Result<(), SimError> {
    let sim = SimulationBuilder::demo()
        // Clear defaults and define our own building.
        .stops(vec![])
        .stop(StopId(0), "Ground", 0.0)
        .stop(StopId(1), "Sky Lobby", 50.0)
        .stop(StopId(2), "Observation Deck", 100.0)

        // Clear the default elevator and add two custom ones.
        .elevators(vec![])
        .elevator(ElevatorConfig {
            id: 0,
            name: "Express A".into(),
            max_speed: 5.0,
            acceleration: 2.0,
            deceleration: 3.0,
            weight_capacity: 1200.0,
            starting_stop: StopId(0),
            door_open_ticks: 60,
            door_transition_ticks: 15,
        })
        .elevator(ElevatorConfig {
            id: 1,
            name: "Express B".into(),
            max_speed: 5.0,
            acceleration: 2.0,
            deceleration: 3.0,
            weight_capacity: 1200.0,
            starting_stop: StopId(2),
            door_open_ticks: 60,
            door_transition_ticks: 15,
        })

        .building_name("Skyline Tower")
        .ticks_per_second(60.0)
        .dispatch(EtdDispatch::new())
        .build()?;

    Ok(())
}
```

### ElevatorConfig fields

| Field | Type | Description | Default |
|---|---|---|---|
| `id` | `u32` | Unique numeric ID within the config (mapped to `EntityId` at runtime) | -- |
| `name` | `String` | Human-readable name for UIs and logs | -- |
| `max_speed` | `f64` | Maximum travel speed (distance units/second) | `2.0` |
| `acceleration` | `f64` | Acceleration rate (distance units/second^2) | `1.5` |
| `deceleration` | `f64` | Deceleration rate (distance units/second^2) | `2.0` |
| `weight_capacity` | `f64` | Maximum total rider weight | `800.0` |
| `starting_stop` | `StopId` | Where this elevator starts | -- |
| `door_open_ticks` | `u32` | Ticks doors stay fully open | `10` |
| `door_transition_ticks` | `u32` | Ticks for a door open/close transition | `5` |

## RON config files

For data-driven workflows, you can define your building in a RON file and load it at runtime. RON (Rusty Object Notation) is a human-readable format that maps directly to Rust structs.

Here is the `default.ron` included in the repository:

```ron
SimConfig(
    building: BuildingConfig(
        name: "Demo Tower",
        stops: [
            StopConfig(id: StopId(0), name: "Ground", position: 0.0),
            StopConfig(id: StopId(1), name: "Floor 2", position: 4.0),
            StopConfig(id: StopId(2), name: "Floor 3", position: 7.5),
            StopConfig(id: StopId(3), name: "Floor 4", position: 11.0),
            StopConfig(id: StopId(4), name: "Roof", position: 15.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0,
            name: "Main",
            max_speed: 2.0,
            acceleration: 1.5,
            deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 60,
            door_transition_ticks: 15,
        ),
    ],
    simulation: SimulationParams(
        ticks_per_second: 60.0,
    ),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 120,
        weight_range: (50.0, 100.0),
    ),
)
```

### Loading a RON file

Add `ron` to your dependencies (`cargo add ron`) since elevator-core re-uses it for config parsing but doesn't re-export the deserializer:

```rust,no_run
use elevator_core::prelude::*;
use elevator_core::config::SimConfig;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let ron_str = std::fs::read_to_string("assets/config/default.ron")?;
    let config: SimConfig = ron::from_str(&ron_str)?;

    let sim = SimulationBuilder::from_config(config).build()?;

    println!("Loaded simulation with {} tick rate",
             sim.dt().recip() as u32);
    Ok(())
}
```

`SimulationBuilder::from_config(config)` accepts a deserialized `SimConfig` and still lets you chain builder methods on top -- for example, to override the dispatch strategy or register extensions.

## Config sections

### BuildingConfig

Defines the building layout. The `stops` list must have at least one entry, and each `StopId` must be unique. Stop positions are arbitrary `f64` values along the shaft axis -- they do not need to be uniformly spaced.

```ron
building: BuildingConfig(
    name: "My Building",
    stops: [
        StopConfig(id: StopId(0), name: "Lobby", position: 0.0),
        StopConfig(id: StopId(1), name: "Mezzanine", position: 2.5),
        StopConfig(id: StopId(2), name: "Floor 2", position: 6.0),
    ],
),
```

### ElevatorConfig (list)

One or more elevator cars. Each must reference a valid `starting_stop` from the building config. All numeric physics parameters must be positive.

### SimulationParams

Controls simulation timing:

```ron
simulation: SimulationParams(
    ticks_per_second: 60.0,
),
```

The tick rate determines `dt` (time delta per tick): `dt = 1.0 / ticks_per_second`. Higher values produce smoother motion but require more computation. 60 is a good default.

### PassengerSpawnConfig

Advisory parameters for traffic generators. The core library does **not** spawn passengers automatically -- these values are consumed by game code or the optional `traffic` feature:

```ron
passenger_spawning: PassengerSpawnConfig(
    mean_interval_ticks: 120,
    weight_range: (50.0, 100.0),
),
```

| Field | Meaning |
|---|---|
| `mean_interval_ticks` | Average ticks between passenger spawns (Poisson distribution) |
| `weight_range` | `(min, max)` for uniformly distributed rider weight |

## The space elevator

To demonstrate that stops are truly arbitrary, the repository includes `space_elevator.ron`:

```ron
SimConfig(
    building: BuildingConfig(
        name: "Orbital Tether",
        stops: [
            StopConfig(id: StopId(0), name: "Ground Station", position: 0.0),
            StopConfig(id: StopId(1), name: "Orbital Platform", position: 1000.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0,
            name: "Climber Alpha",
            max_speed: 50.0,
            acceleration: 10.0,
            deceleration: 15.0,
            weight_capacity: 10000.0,
            starting_stop: StopId(0),
            door_open_ticks: 120,
            door_transition_ticks: 30,
        ),
    ],
    // ...
)
```

The stops are 1,000 distance units apart, the elevator has a max speed of 50, and the doors take twice as long to cycle. The same simulation engine handles both a 5-story office and an orbital tether -- the physics just scale.

## Validation

Config is validated at construction time (in `SimulationBuilder::build()` or `Simulation::new()`). Invalid configs produce a `SimError::InvalidConfig` with a descriptive message. Validation checks include:

- At least one stop
- No duplicate `StopId` values
- At least one elevator
- All physics parameters positive
- Each elevator's `starting_stop` references an existing stop
- Tick rate is positive

## Next steps

Head to [Metrics and Events](metrics-and-events.md) to learn how to observe what is happening inside your simulation.
