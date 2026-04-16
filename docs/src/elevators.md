# Elevators

An elevator in elevator-core is an entity with physics, a door state machine, direction indicators, and a phase that tracks what it is currently doing. This chapter covers how to read elevator state, understand its lifecycle, and configure its behavior.

## Elevator phases

Every elevator is in exactly one phase at any time. The `ElevatorPhase` enum drives what the simulation does with the car each tick:

| Phase | Meaning |
|---|---|
| `Idle` | No target. Waiting for dispatch to assign a stop. |
| `MovingToStop(EntityId)` | Traveling toward a target stop. |
| `Repositioning(EntityId)` | Moving to a stop for coverage, not to serve a call. |
| `DoorOpening` | Doors are currently opening at a stop. |
| `Loading` | Doors fully open. Riders may board or exit. |
| `DoorClosing` | Doors are currently closing. |
| `Stopped` | At a stop, doors closed, awaiting next dispatch decision. |

The typical cycle when an elevator is dispatched to a stop:

```text
Idle -> MovingToStop -> DoorOpening -> Loading -> DoorClosing -> Stopped
```

From `Stopped`, dispatch can assign a new target (back to `MovingToStop`) or leave the car idle. Repositioned elevators skip the door cycle entirely -- they go from `Repositioning` directly to `Idle` on arrival.

## Reading elevator state

Access elevator data through the simulation or the world directly:

```rust,ignore
// Via convenience methods
let pos = sim.world().position(elevator_id);
let vel = sim.world().velocity(elevator_id);

// Via the Elevator component
let elev = sim.world().elevator(elevator_id).unwrap();
let phase = elev.phase();
let load = elev.current_load();
let capacity = elev.weight_capacity();
```

## Direction indicators

Every elevator carries two indicator lamps: `going_up` and `going_down`. Together they tell waiting riders -- and the loading system -- which direction the car will serve next.

| `going_up` | `going_down` | Meaning |
|---|---|---|
| `true` | `true` | Idle -- will accept riders in either direction |
| `true` | `false` | Committed to an upward trip |
| `false` | `true` | Committed to a downward trip |

The dispatch phase auto-manages these lamps:
- On `DispatchDecision::GoToStop(target)`, indicators are set based on target position vs. current position.
- On `DispatchDecision::Idle`, the pair resets to `(true, true)`.
- A `DirectionIndicatorChanged` event fires only when the pair actually changes.

The loading phase uses these lamps as a boarding filter. A rider heading up will not board a car with `going_up = false`, and vice versa. The rider is silently left waiting -- no rejection event -- so a later car heading in their direction picks them up. Idle cars (both lamps lit) accept riders in either direction.

Read the lamps through the simulation API:

```rust,ignore
let going_up = sim.elevator_going_up(elevator_id);
let going_down = sim.elevator_going_down(elevator_id);
```

Or directly from the component:

```rust,ignore
let elev = sim.world().elevator(elevator_id).unwrap();
let going_up = elev.going_up();
let going_down = elev.going_down();
```

## Physics

Each elevator has its own physics parameters, stored on the `Elevator` component. The movement phase applies a **trapezoidal velocity profile**: accelerate up to max speed, cruise, then decelerate to stop precisely at the target position. This produces smooth, realistic motion without requiring a full physics engine.

The profile is computed per-tick from three values:
- `max_speed` -- top travel speed
- `acceleration` -- rate of speed increase
- `deceleration` -- rate of speed decrease (braking)

All three use your simulation's distance and time units. If you are working in meters and ticks at 60 ticks/second, a `max_speed` of 2.0 means 2 meters per second.

## ElevatorConfig fields

When constructing elevators, use `ElevatorConfig` to set initial parameters:

| Field | Type | Description | Default |
|---|---|---|---|
| `id` | `u32` | Unique numeric ID within the config (mapped to `EntityId` at runtime) | -- |
| `name` | `String` | Human-readable name for UIs and logs | -- |
| `max_speed` | `Speed` | Maximum travel speed (distance units/second) | `2.0` |
| `acceleration` | `Accel` | Acceleration rate (distance units/second^2) | `1.5` |
| `deceleration` | `Accel` | Deceleration rate (distance units/second^2) | `2.0` |
| `weight_capacity` | `Weight` | Maximum total rider weight | `800.0` |
| `starting_stop` | `StopId` | Where this elevator starts | -- |
| `door_open_ticks` | `u32` | Ticks doors stay fully open | `10` |
| `door_transition_ticks` | `u32` | Ticks for a door open/close transition | `5` |

```rust,no_run
# use elevator_core::prelude::*;
# use elevator_core::config::ElevatorConfig;
# use elevator_core::stop::StopId;
# fn main() -> Result<(), SimError> {
# let sim = SimulationBuilder::new()
#     .stop(StopId(0), "Ground", 0.0)
#     .stop(StopId(1), "Top", 10.0)
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
#     .build()?;
# Ok(())
# }
```

All physics parameters must be positive. Invalid values are rejected at build time with `SimError::InvalidConfig`.

## Door state machine

Doors cycle through four states with configurable timing:

```text
Closed -> Opening (transition_ticks) -> Open (open_ticks) -> Closing (transition_ticks) -> Closed
```

- `door_transition_ticks` controls how long the opening and closing animations take.
- `door_open_ticks` controls how long doors stay fully open before closing.
- Riders can only board or exit during the `Loading` phase, which runs while doors are fully open.
- `DoorOpened` and `DoorClosed` events fire at the appropriate transitions.

## Next steps

- [Riders](riders.md) -- spawning riders and tracking populations
- [The Simulation Loop](simulation-loop.md) -- how elevator phases advance each tick
- [Movement and Physics](movement-physics.md) -- deep dive into the trapezoidal velocity profile
