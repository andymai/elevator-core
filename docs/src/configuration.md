# Configuration

The simulation can be configured entirely in code or loaded from a **RON config file**. Both paths produce the same `SimConfig` under the hood, so everything the builder can do, a config file can express, and vice versa.

## Programmatic configuration

The `SimulationBuilder` provides a fluent API. Here is a more complete example that customizes everything:

```rust,no_run
use elevator_core::prelude::*;
use elevator_core::config::ElevatorConfig;
use elevator_core::stop::StopId;
use elevator_core::dispatch::etd::EtdDispatch;

fn main() -> Result<(), SimError> {
    let sim = SimulationBuilder::new()
        .stop(StopId(0), "Ground", 0.0)
        .stop(StopId(1), "Sky Lobby", 50.0)
        .stop(StopId(2), "Observation Deck", 100.0)
        .elevator(ElevatorConfig {
            id: 0,
            name: "Express A".into(),
            max_speed: 5.0.into(),
            acceleration: 2.0.into(),
            deceleration: 3.0.into(),
            weight_capacity: 1200.0.into(),
            starting_stop: StopId(0),
            door_open_ticks: 60,
            door_transition_ticks: 15,
            ..Default::default()
        })
        .building_name("Skyline Tower")
        .ticks_per_second(60.0)
        .dispatch(EtdDispatch::new())
        .build()?;

    Ok(())
}
```

Override any `ElevatorConfig` field with struct-update syntax -- `ElevatorConfig { max_speed: 4.0, ..Default::default() }`.

### ElevatorConfig fields

| Field | Type | Description | Default |
|---|---|---|---|
| `id` | `u32` | Unique numeric ID within the config (mapped to `EntityId` at runtime) | -- |
| `name` | `String` | Human-readable name for UIs and logs | -- |
| `max_speed` | `Speed` | Maximum travel speed (distance units/second) | `2.0` |
| `acceleration` | `Accel` | Acceleration rate | `1.5` |
| `deceleration` | `Accel` | Deceleration rate | `2.0` |
| `weight_capacity` | `Weight` | Maximum total rider weight | `800.0` |
| `starting_stop` | `StopId` | Where this elevator starts | -- |
| `door_open_ticks` | `u32` | Ticks doors stay fully open | `10` |
| `door_transition_ticks` | `u32` | Ticks for a door open/close transition | `5` |
| `restricted_stops` | `Vec<StopId>` | Stops this elevator cannot serve | `[]` |
| `service_mode` | `Option<ServiceMode>` | Initial service mode | `None` (Normal) |
| `inspection_speed_factor` | `f64` | Speed multiplier in Inspection mode | `0.25` |

## RON config files

For data-driven workflows, define your building in a RON file and load it at runtime. RON (Rusty Object Notation) is a human-readable format that maps directly to Rust structs.

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

`SimulationBuilder::from_config` accepts a deserialized `SimConfig` and still lets you chain builder methods on top -- for example, to override the dispatch strategy or register extensions.

## Config sections

### BuildingConfig

Defines the building layout. The `stops` list must have at least one entry, and each `StopId` must be unique. Stop positions are arbitrary `f64` values along the shaft axis -- they do not need to be uniformly spaced.

### SimulationParams

Controls simulation timing. The tick rate determines `dt` (time delta per tick): `dt = 1.0 / ticks_per_second`. Higher values produce smoother motion but require more computation. 60 is a good default.

### PassengerSpawnConfig

Advisory parameters for traffic generators. The core library does **not** spawn passengers automatically -- these values are consumed by game code or the optional `traffic` feature:

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

The stops are 1,000 distance units apart, the elevator has a max speed of 50, and the doors take twice as long to cycle. The same simulation engine handles both a 5-story office and an orbital tether.

## Validation

Config is validated at construction time (in `SimulationBuilder::build()`). Invalid configs produce a `SimError::InvalidConfig` with a descriptive message. Validation checks include:

- At least one stop
- No duplicate `StopId` values
- At least one elevator
- All physics parameters positive
- Each elevator's `starting_stop` references an existing stop
- Tick rate is positive

## Next steps

- [Stops, Lines, and Groups](stops-lines-groups.md) -- understand multi-line and multi-group topology
- [Dispatch Strategies](dispatch-strategies.md) -- choose a dispatch algorithm for your building
- [Traffic Generation](traffic-generation.md) -- use `PassengerSpawnConfig` with the traffic module
