# Core Concepts

This chapter covers the mental model behind elevator-core: how entities and components fit together, what happens during each tick, and how riders and elevators move through their lifecycles.

## The World

At the center of the simulation is the `World` -- a struct-of-arrays entity store inspired by ECS architecture. Every meaningful thing in the simulation (stops, elevators, riders) is an **entity**, identified by an `EntityId`. Entities have **components** attached to them -- typed data like `Position`, `Elevator`, `Rider`, or `Stop`.

```text
World
  +-- Entity 0 (Stop)     -> Stop { name: "Lobby", position: 0.0 }, Position { value: 0.0 }
  +-- Entity 1 (Stop)     -> Stop { name: "Floor 2", position: 4.0 }, Position { value: 4.0 }
  +-- Entity 2 (Elevator) -> Elevator { phase: Idle, ... }, Position { value: 0.0 }, Velocity { value: 0.0 }
  +-- Entity 3 (Rider)    -> Rider { phase: Waiting, weight: 75.0, ... }, Route { ... }
```

You access the world through `sim.world()` (shared) and `sim.world_mut()` (mutable). The simulation also provides convenience methods like `sim.spawn_rider_by_stop_id()` that handle world operations for you.

## Identity types

The library uses several identity types, and it is important to understand which one to use where:

| Type | What it identifies | When you use it |
|---|---|---|
| `EntityId` | Any entity at runtime (stop, elevator, rider) | Event payloads, world lookups, dispatch decisions |
| `StopId` | A stop in the *config* (e.g., `StopId(0)`) | Builder API, config files, `spawn_rider_by_stop_id` |
| `GroupId` | An elevator group (e.g., `GroupId(0)`) | Multi-group dispatch, group-specific hooks |

`StopId` is a config-level concept. When the simulation boots, each `StopId` is mapped to an `EntityId`. At runtime you work with `EntityId` everywhere -- events, world queries, dispatch. Use `sim.stop_entity(StopId(0))` if you need to convert.

## The tick loop

Each call to `sim.step()` runs one simulation tick. A tick consists of six phases, always executed in this order:

```text
+-------------------+   +------------+   +------------+
| Advance           |-->| Dispatch   |-->| Movement   |
| Transient         |   |            |   |            |
+-------------------+   +------------+   +------------+
                                              |
+-------------------+   +------------+   +------------+
| Metrics           |<--| Loading    |<--| Doors      |
|                   |   |            |   |            |
+-------------------+   +------------+   +------------+
```

### Phase 1: Advance Transient

Riders in transitional states are advanced to their next phase:
- `Boarding` -> `Riding` (the rider is now inside the elevator)
- `Exiting` -> `Arrived` (the rider has left the elevator and is done)

This ensures that boarding and exiting -- which are set during the Loading phase -- take effect at the start of the *next* tick, giving events a clean boundary.

### Phase 2: Dispatch

The dispatch strategy examines all idle elevators and waiting riders, then decides where each elevator should go. The strategy receives a `DispatchManifest` with full demand information (who is waiting where, who is riding to where) and returns a `DispatchDecision` for each elevator.

The default strategy is SCAN (sweep end-to-end). You can swap in LOOK, NearestCar, ETD, or your own custom strategy -- see [Dispatch Strategies](dispatch.md).

### Phase 3: Movement

Elevators with a target stop are moved along the shaft axis using a **trapezoidal velocity profile**: accelerate up to max speed, cruise, then decelerate to stop precisely at the target position. This produces realistic motion without requiring complex physics.

When an elevator arrives at its target stop, it emits an `ElevatorArrived` event and transitions to the door-opening state.

### Phase 4: Doors

The door finite-state machine ticks for each elevator. Doors transition through:

```text
Closed -> Opening (transition ticks) -> Open (hold ticks) -> Closing (transition ticks) -> Closed
```

`DoorOpened` and `DoorClosed` events fire at the appropriate moments. Riders can only board or exit when the doors are fully open.

### Phase 5: Loading

While an elevator's doors are open at a stop:
- **Exiting**: riders whose destination matches the current stop exit the elevator.
- **Boarding**: waiting riders at the current stop enter the elevator, subject to weight capacity.

Riders that exceed the elevator's remaining capacity are rejected with a `RiderRejected` event.

### Phase 6: Metrics

Events from the current tick are processed to update aggregate metrics -- average wait time, ride time, throughput, abandonment rate, and total distance. Tagged metrics (per-zone or per-label breakdowns) are also updated here.

## Rider lifecycle

A rider moves through these phases:

```text
Waiting --> Boarding --> Riding --> Exiting --> Arrived
                                                   |
Waiting ----> Abandoned (gave up waiting)    (despawned)
```

| Phase | Where is the rider? | What triggers the transition? |
|---|---|---|
| `Waiting` | At a stop, in the queue | Elevator arrives, doors open, loading phase boards them |
| `Boarding` | Being loaded into the elevator | Advance Transient phase (next tick) |
| `Riding` | Inside the elevator | Elevator arrives at destination, doors open, loading phase exits them |
| `Exiting` | Exiting the elevator | Advance Transient phase (next tick) |
| `Arrived` | Done | Game can despawn or ignore |
| `Abandoned` | Left the stop | Patience ran out (if configured) |

Each transition emits an event: `RiderSpawned`, `RiderBoarded`, `RiderExited`, `RiderAbandoned`.

## Elevator lifecycle

Elevators cycle through these phases:

| Phase | Meaning |
|---|---|
| `Idle` | No target, waiting for dispatch to assign a stop |
| `MovingToStop(EntityId)` | Traveling toward a target stop |
| `DoorOpening` | Doors are currently opening |
| `Loading` | Doors open; riders may board or exit |
| `DoorClosing` | Doors are currently closing |
| `Stopped` | At a floor, doors closed, awaiting dispatch |

An elevator arriving at a stop cycles through `DoorOpening` → `Loading` → `DoorClosing` → `Stopped`. If dispatch assigns a new target, the elevator departs from `Stopped`.

## Sub-stepping

For advanced use cases, you can run individual phases instead of calling `step()`:

```rust,no_run
# use elevator_core::prelude::*;
# fn main() -> Result<(), SimError> {
# let mut sim = SimulationBuilder::new().build()?;
sim.run_advance_transient();
sim.run_dispatch();
sim.run_movement();
sim.run_doors();
sim.run_loading();
sim.run_metrics();
sim.advance_tick(); // flush events and increment tick counter
# Ok(())
# }
```

This is equivalent to `sim.step()` but lets you inject logic between phases or skip phases entirely. Lifecycle hooks (covered in [Extensions and Hooks](extensions-and-hooks.md)) provide a less manual way to achieve this.

## Next steps

Now that you understand the architecture, head to [Dispatch Strategies](dispatch.md) to learn how elevators decide where to go.
