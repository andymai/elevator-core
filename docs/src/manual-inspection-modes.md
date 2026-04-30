# Manual and Inspection Modes

Every elevator has a `ServiceMode` that controls how the simulation treats it. The default is `Normal` -- dispatch assigns stops, doors auto-cycle, and the elevator moves autonomously. The other modes hand varying degrees of control to your game code, enabling player-controlled elevators, maintenance scenarios, and direct API-driven movement.

## ServiceMode overview

| Mode | Dispatch | Movement | Doors | Use case |
|---|---|---|---|---|
| `Normal` | Automatic | Automatic (trapezoidal profile) | Auto-cycle | Standard operation |
| `Independent` | Excluded | Direct API calls only | Auto-cycle | Responds to car calls, not hall calls |
| `Inspection` | Automatic | Reduced speed | Hold open | Maintenance / inspection |
| `Manual` | Excluded | Velocity commands | Manual door API | Player-controlled elevator |

## Setting the mode

Use `sim.set_service_mode()` to change an elevator's mode at any time. The method emits a `ServiceModeChanged` event if the mode actually changes:

```rust,no_run
# use elevator_core::prelude::*;
# use elevator_core::__doctest_prelude::*;
# fn run(sim: &mut Simulation, elev: EntityId) -> Result<(), SimError> {
sim.set_service_mode(elev, ServiceMode::Manual)?;
# Ok(())
# }
```

When transitioning out of `Manual` mode, the library automatically clears the pending velocity command and zeros the velocity component. This prevents a car that was moving at transition time from being stranded -- the normal movement system only runs for `MovingToStop` / `Repositioning` phases.

## Manual mode: player-controlled elevators

Manual mode is designed for games where the player directly drives an elevator. The elevator is excluded from dispatch and repositioning; movement is controlled entirely through velocity commands.

### Velocity control

Set the target velocity with `sim.set_target_velocity()`. The elevator accelerates toward this velocity using its configured kinematic caps (max speed, acceleration, deceleration):

```rust,no_run
# use elevator_core::prelude::*;
# use elevator_core::__doctest_prelude::*;
# fn run(sim: &mut Simulation, elev: ElevatorId) -> Result<(), SimError> {
// Command the elevator upward.
sim.set_target_velocity(elev, 2.0)?;

// Command it downward.
sim.set_target_velocity(elev, -1.5)?;

// Slow to a stop (velocity ramps down via deceleration).
sim.set_target_velocity(elev, 0.0)?;
# Ok(())
# }
```

The elevator respects its physics parameters -- it won't instantly jump to the target velocity but will accelerate and decelerate smoothly. The car can stop at any position; it is not required to align with a configured stop.

### Emergency stop

Trigger an immediate deceleration to zero:

```rust,no_run
# use elevator_core::prelude::*;
# use elevator_core::__doctest_prelude::*;
# fn run(sim: &mut Simulation, elev: ElevatorId) -> Result<(), SimError> {
sim.emergency_stop(elev)?;
# Ok(())
# }
```

Both `set_target_velocity` and `emergency_stop` require the elevator to be in `ServiceMode::Manual` and not disabled. They return `SimError::WrongServiceMode` if called on a non-manual elevator.

### Complete example

This example puts an elevator into manual mode, commands it upward, then triggers an emergency stop halfway through:

```rust,no_run
use elevator_core::prelude::*;
use elevator_core::components::ServiceMode;

fn main() {
    let mut sim = SimulationBuilder::demo().build().unwrap();
    let elev = ElevatorId::from(sim.world().iter_elevators().next().unwrap().0);

    sim.set_service_mode(elev.entity(), ServiceMode::Manual).unwrap();

    // Command full ascent.
    sim.set_target_velocity(elev, 2.0).unwrap();

    for t in 0..180 {
        // Halfway through, slam the emergency brake.
        if t == 90 {
            sim.emergency_stop(elev).unwrap();
        }
        sim.step();

        let pos = sim.world().position(elev.entity()).unwrap().value();
        let vel = sim.velocity(elev.entity()).unwrap();

        if t > 90 && vel.abs() < 1e-6 {
            println!("Car stopped at {pos:.2}m after {t} ticks.");
            break;
        }
    }
}
```

Run it with `cargo run -p elevator-core --example manual_driver`.

## Inspection mode

Inspection mode reduces the elevator's speed by its `inspection_speed_factor` (default: 0.25, configurable per elevator). Doors hold open indefinitely rather than auto-cycling. The elevator still participates in dispatch -- it just moves slowly.

This mode is useful for maintenance walk-throughs and operator-driven inspection runs -- the cab moves slowly enough for a technician to listen for anomalies along the shaft, and the doors stay open at each stop until the operator dismisses them.

```rust,no_run
# use elevator_core::prelude::*;
# use elevator_core::__doctest_prelude::*;
# fn run(sim: &mut Simulation, elev: EntityId) -> Result<(), SimError> {
sim.set_service_mode(elev, ServiceMode::Inspection)?;
// The elevator now moves at 25% of its normal max speed.
# Ok(())
# }
```

The speed factor is configured per elevator via `ElevatorConfig::inspection_speed_factor` and can be read at runtime with `elevator.inspection_speed_factor()`.

## Independent mode

Independent mode removes the elevator from automatic dispatch and repositioning. You control movement via direct API calls (e.g., `push_destination`). The elevator responds only to car calls -- explicit stop requests -- not to hall calls from waiting riders.

This is useful for freight elevators, service lifts, or any elevator that should only move when explicitly commanded:

```rust,no_run
# use elevator_core::prelude::*;
# use elevator_core::__doctest_prelude::*;
# fn run(sim: &mut Simulation, elev: ElevatorId) -> Result<(), SimError> {
sim.set_service_mode(elev.entity(), ServiceMode::Independent)?;
// Now manually send it somewhere.
sim.push_destination(elev, StopId(2))?;
// Changed your mind mid-trip? Brake the car to the nearest stop.
sim.abort_movement(elev)?;
# Ok(())
# }
```

## Disabling an elevator

Separate from `ServiceMode`, elevators can be taken out of service entirely using `sim.disable()`. A disabled elevator:

- Is excluded from all simulation phases (dispatch, movement, doors, loading)
- Ejects all current riders
- Emits an `EntityDisabled` event

Re-enable with `sim.enable()`, which emits `EntityEnabled`. Most `Simulation` methods return `SimError::ElevatorDisabled` when called on a disabled elevator.

```rust,no_run
# use elevator_core::prelude::*;
# use elevator_core::__doctest_prelude::*;
# fn run(sim: &mut Simulation, elev: EntityId) -> Result<(), SimError> {
// Take out of service.
sim.disable(elev)?;

// Later, bring back online.
sim.enable(elev)?;
# Ok(())
# }
```

## Events on mode changes

The `Event::ServiceModeChanged` event fires whenever `set_service_mode` changes an elevator's mode. It carries the `from` and `to` modes along with the elevator entity and tick:

```rust,no_run
# use elevator_core::prelude::*;
# use elevator_core::__doctest_prelude::*;
# fn handle(event: Event) {
if let Event::ServiceModeChanged { elevator, from, to, tick } = event {
    let _ = (elevator, from, to, tick); // use the fields in your game
}
# }
```

If you set the mode to its current value, no event is emitted and the call returns `Ok(())`.

## Next steps

- [Movement and Physics](movement-physics.md) -- how the trapezoidal velocity profile works under the hood.
- [Events and Metrics](events-metrics.md) -- consuming `ServiceModeChanged` and other events.
- [Lifecycle Hooks](lifecycle-hooks.md) -- inject logic that reacts to mode changes within the tick loop.
