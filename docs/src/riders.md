# Riders

A rider is anything that rides an elevator. The core library is deliberately generic -- a rider could be a person, a cargo crate, a robot, or a game character. Your game adds meaning through [extensions](extensions.md) and game logic; the simulation handles movement, queuing, and capacity.

## Spawning riders

The simplest way to create a rider is `spawn_rider`, which takes an origin stop, a destination stop, and a weight:

```rust,ignore
let rider_id = sim.spawn_rider(StopId(0), StopId(3), 75.0)?;
```

This creates a rider at stop 0, heading to stop 3, weighing 75 units. The rider starts in the `Waiting` phase and a `RiderSpawned` event is emitted.

For more control, use the `RiderBuilder` fluent API:

```rust,ignore
let rider_id = sim.build_rider(StopId(0), StopId(3))?
    .weight(80.0)
    .patience(600)                 // abandon after 10 seconds at 60 tps
    .preferences(
        Preferences::default()
            .with_skip_full_elevator(true)
    )
    .spawn()?;
```

The builder lets you set patience, boarding preferences, access control, and other per-rider options in a single chain.

## Rider phases

Each rider is in one phase at a time. The phases and their transitions are covered in detail in [Rider Lifecycle](rider-lifecycle.md). Here is the overview:

| Phase | Where is the rider? |
|---|---|
| `Waiting` | At a stop, in the queue |
| `Boarding` | Being loaded into an elevator (transient, one tick) |
| `Riding` | Inside an elevator |
| `Exiting` | Leaving an elevator (transient, one tick) |
| `Walking` | Transferring between stops on a multi-leg route |
| `Arrived` | Reached destination -- your game decides next step |
| `Abandoned` | Gave up waiting -- your game can settle or despawn |
| `Resident` | Parked at a stop, not seeking an elevator |

Each transition emits an event: `RiderSpawned`, `RiderBoarded`, `RiderExited`, `RiderAbandoned`, `RiderSettled`, `RiderRerouted`, `RiderDespawned`.

## Rider data

Key accessors on the `Rider` component (all are getter methods):

- `weight` -- how much this rider contributes to elevator load
- `spawn_tick` -- when the rider was created
- `board_tick` -- when the rider boarded (if applicable)
- `current_stop` -- `Option<EntityId>`, the stop the rider is currently at (or `None` if aboard an elevator)
- `phase` -- the current `RiderPhase`

## Population tracking

The simulation maintains a reverse index (`RiderIndex`) that tracks riders at each stop, enabling O(1) population queries without scanning every entity:

```rust,ignore
// Who is waiting at the lobby?
let waiting: Vec<EntityId> = sim.waiting_at(lobby_entity).collect();

// How many residents live on floor 10?
let count = sim.residents_at(floor_10).count();

// Did anyone abandon at this stop?
let abandoned: Vec<EntityId> = sim.abandoned_at(stop_entity).collect();
```

These three methods cover the main population categories:

| Method | Returns riders in phase... |
|---|---|
| `sim.waiting_at(stop)` | `Waiting` |
| `sim.residents_at(stop)` | `Resident` |
| `sim.abandoned_at(stop)` | `Abandoned` |

## Entity type checks

When you have an `EntityId` and need to know what it refers to, use the type-check helpers:

```rust,ignore
if sim.is_rider(id) {
    // handle rider
} else if sim.is_elevator(id) {
    // handle elevator
} else if sim.is_stop(id) {
    // handle stop
}
```

These are more readable than querying `sim.world().elevator(id).is_some()` and are the preferred pattern in game code.

## Lifecycle methods

Three methods manage rider state transitions after arrival or abandonment:

| Method | Effect |
|---|---|
| `sim.settle_rider(id)` | Transitions an `Arrived` or `Abandoned` rider to `Resident` at their current stop |
| `sim.reroute_rider(id, route)` | Sends a `Resident` rider back to `Waiting` with a new route |
| `sim.despawn_rider(id)` | Removes the rider entity and updates all indexes |

Always use `sim.despawn_rider(id)` instead of calling `world.despawn()` directly -- it keeps the population index consistent and emits a `RiderDespawned` event.

```rust,ignore
// A rider arrives at their destination. Settle them as a resident.
sim.settle_rider(rider_id)?;

// Later, they want to go back down. Reroute them.
sim.reroute_rider(rider_id, new_route)?;

// Or remove them entirely.
sim.despawn_rider(rider_id)?;
```

## Next steps

- [Rider Lifecycle](rider-lifecycle.md) -- detailed phase transitions, patience, and abandonment
- [Hall Calls and Car Calls](hall-calls.md) -- how rider demand becomes dispatch input
- [Extensions](extensions.md) -- attaching game-specific data to riders
