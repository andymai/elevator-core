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

## Topology: groups, lines, elevators, stops

Multi-bank buildings are modeled with a three-level hierarchy:

```text
Group (GroupId)
  +-- Line (LineConfig)        <-- a physical shaft or column of stops
  |     +-- Elevator           <-- one car running on this line
  |     +-- Elevator
  +-- Line
        +-- Elevator
```

- A **Group** owns a dispatch strategy and a set of stops it serves. Typical use: "low-rise group" and "high-rise group" in a tall building.
- A **Line** represents a shaft (or columnar group of shafts sharing the same physical path). Elevators are assigned to a line; they only serve stops their line reaches.
- A **Stop** may be shared across lines (e.g., a sky lobby served by both low-rise and high-rise groups).
- An **Elevator** belongs to exactly one line within one group at a time. Use `ElevatorReassigned` / `LineReassigned` events to observe runtime moves.

The simplest buildings (single bank, single shaft) can ignore lines — the builder auto-creates one default line and one default group, and you can just call `.stop(...)` / `.elevator(...)` without touching `LineConfig` or `GroupConfig`.

## Coordinate system and units

- **Axis.** All positions are scalars along a single shaft axis. Higher values = higher up (or further along the axis for horizontal configs like the space elevator). There is no 2D/3D geometry in the core.
- **Units are unspecified.** The library does not enforce meters, feet, or any other unit — positions, velocities, accelerations, and weights are just `f64` values. Internally consistent is all that matters. Convention: meters + kg + ticks.
- **Origin.** There is no privileged zero. Stop 0 does not have to be at position `0.0`. Positions may be negative (useful for basements below a lobby at `0.0`, or for space elevators anchored at a non-zero reference frame).
- **Time.** The fundamental unit is the **tick**. Convert to seconds via `sim.time().ticks_to_seconds(t)` (uses `ticks_per_second` from config). The default is 60 ticks/second.

## The tick loop

Each call to `sim.step()` runs one simulation tick. A tick consists of seven phases, always executed in this order:

```text
+-------------------+   +------------+   +--------------+   +------------+
| Advance           |-->| Dispatch   |-->| Reposition   |-->| Movement   |
| Transient         |   |            |   |              |   |            |
+-------------------+   +------------+   +--------------+   +------------+
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

### Phase 3: Reposition

Optional phase; idle elevators are repositioned for better coverage via the `RepositionStrategy`. Only runs if at least one group has a strategy configured.

### Phase 4: Movement

Elevators with a target stop are moved along the shaft axis using a **trapezoidal velocity profile**: accelerate up to max speed, cruise, then decelerate to stop precisely at the target position. This produces realistic motion without requiring complex physics.

When an elevator arrives at its target stop, it emits an `ElevatorArrived` event and transitions to the door-opening state.

### Phase 5: Doors

The door finite-state machine ticks for each elevator. Doors transition through:

```text
Closed -> Opening (transition ticks) -> Open (hold ticks) -> Closing (transition ticks) -> Closed
```

`DoorOpened` and `DoorClosed` events fire at the appropriate moments. Riders can only board or exit when the doors are fully open.

### Phase 6: Loading

While an elevator's doors are open at a stop:
- **Exiting**: riders whose destination matches the current stop exit the elevator.
- **Boarding**: waiting riders at the current stop enter the elevator, subject to weight capacity.

Riders that exceed the elevator's remaining capacity are rejected with a `RiderRejected` event.

### Phase 7: Metrics

Events from the current tick are processed to update aggregate metrics -- average wait time, ride time, throughput, abandonment rate, and total distance. Tagged metrics (per-zone or per-label breakdowns) are also updated here.

## Rider lifecycle

A rider moves through these phases:

```text
Waiting --> Boarding --> Riding --> Exiting --> Arrived
   ^                                              |
   |                          settle_rider() --> Resident
   |                                              |
   +------------- reroute_rider() ----------------+

Waiting ----> Abandoned (patience expired)
                  |
                  +--> settle_rider() --> Resident
```

| Phase | Where is the rider? | What triggers the transition? |
|---|---|---|
| `Waiting` | At a stop, in the queue | Elevator arrives, doors open, loading phase boards them |
| `Boarding` | Being loaded into the elevator | Advance Transient phase (next tick) |
| `Riding` | Inside the elevator | Elevator arrives at destination, doors open, loading phase exits them |
| `Exiting` | Exiting the elevator | Advance Transient phase (next tick) |
| `Arrived` | Reached final destination | Consumer decides: settle (-> Resident), despawn, or leave |
| `Abandoned` | Left the stop | Patience ran out; consumer can settle or despawn |
| `Resident` | Parked at a stop, not seeking an elevator | Consumer calls `settle_rider()` on an Arrived or Abandoned rider |

Each transition emits an event: `RiderSpawned`, `RiderBoarded`, `RiderExited`, `RiderAbandoned`, `RiderSettled`, `RiderRerouted`, `RiderDespawned`.

### Population tracking

Riders at each stop are tracked by a reverse index, enabling O(1) queries without scanning the full entity list.

Three query methods provide population lookups:

- `sim.residents_at(stop)` -- riders settled at a stop
- `sim.waiting_at(stop)` -- riders waiting for an elevator at a stop
- `sim.abandoned_at(stop)` -- riders who gave up waiting at a stop

Each method has a corresponding count variant (e.g., `sim.residents_at(stop).len()`).

### Entity type checks

To identify what an `EntityId` refers to, use the type-check helpers:

- `sim.is_elevator(id)` — the entity has an `Elevator` component
- `sim.is_rider(id)` — the entity has a `Rider` component
- `sim.is_stop(id)` — the entity has a `Stop` component

These are preferable to querying `world.elevator(id).is_some()` etc., and make game code more readable.

Three lifecycle methods manage rider state transitions:

- `sim.settle_rider(id)` -- transitions an Arrived or Abandoned rider to Resident
- `sim.reroute_rider(id, route)` -- sends a Resident rider back to Waiting with a new route
- `sim.despawn_rider(id)` -- removes the rider and updates all indexes

Use `sim.despawn_rider(id)` instead of calling `world.despawn()` directly -- it keeps the stop index consistent.

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
sim.run_reposition();
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
