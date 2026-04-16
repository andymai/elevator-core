# Error Handling

The simulation uses a single error enum, `SimError`, for all fallible operations. This chapter covers the error variants, rider rejection reasons, and practical patterns for handling failures in game code.

## SimError

`SimError` covers both configuration validation and runtime failures. It implements `Display` and `std::error::Error`, so it works with `?`, `anyhow`, `eyre`, and other error-handling crates.

### Configuration errors

| Variant | When it occurs |
|---|---|
| `InvalidConfig { field, reason }` | A config field fails validation during `SimulationBuilder::build()` |

The `field` string identifies which config parameter is invalid, and `reason` explains why. All config validation happens at construction time -- if `build()` succeeds, the simulation is in a valid state.

### Entity lookup errors

| Variant | When it occurs |
|---|---|
| `EntityNotFound(EntityId)` | A referenced entity does not exist in the world |
| `StopNotFound(StopId)` | A `StopId` from config does not map to any entity |
| `GroupNotFound(GroupId)` | A referenced group does not exist |
| `LineNotFound(EntityId)` | A line entity was not found |
| `NotAnElevator(EntityId)` | An operation expected an elevator but got a different entity |
| `NotAStop(EntityId)` | An operation expected a stop but got a different entity |

These are the most common runtime errors. They typically indicate a stale `EntityId` (the entity was despawned) or a config mismatch (using a `StopId` that was never registered).

### Rider state errors

| Variant | When it occurs |
|---|---|
| `WrongRiderPhase { rider, expected, actual }` | A lifecycle operation was called on a rider in the wrong phase |
| `RiderHasNoStop(EntityId)` | A rider has no `current_stop` when one is required |
| `EmptyRoute` | A route with no legs was provided |

For example, calling `sim.settle_rider(id)` on a rider in `Waiting` phase returns `WrongRiderPhase` -- settle requires `Arrived` or `Abandoned`.

### Routing errors

| Variant | When it occurs |
|---|---|
| `NoRoute { origin, destination, .. }` | No group serves both origin and destination stops |
| `AmbiguousRoute { origin, destination, groups }` | Multiple groups serve both stops -- caller must specify which |
| `RouteOriginMismatch { expected_origin, route_origin }` | A route's origin does not match the rider's current position |

`NoRoute` and `AmbiguousRoute` are returned by `spawn_rider()` and `build_rider()`. In multi-group buildings, use `build_rider()` with an explicit group to resolve ambiguity.

### Topology errors

| Variant | When it occurs |
|---|---|
| `LineDoesNotServeStop { line_or_car, stop }` | An elevator's line cannot reach the target stop |
| `ElevatorDisabled(EntityId)` | An operation was attempted on a disabled elevator |
| `WrongServiceMode { entity, expected, actual }` | An elevator is in an incompatible service mode |
| `HallCallNotFound { stop, direction }` | No hall call exists at the given stop and direction |

### Snapshot errors

| Variant | When it occurs |
|---|---|
| `SnapshotVersion { saved, current }` | Snapshot was produced by a different library version |
| `SnapshotFormat(String)` | Snapshot bytes are malformed |
| `UnresolvedCustomStrategy { name, group }` | A custom dispatch strategy in the snapshot could not be resolved |

## RejectionReason

When a rider cannot board an elevator, a `RiderRejected` event fires with a typed `RejectionReason`:

| Reason | Description |
|---|---|
| `OverCapacity` | The rider's weight would exceed the elevator's remaining capacity |
| `PreferenceBased` | The rider's boarding preferences prevented boarding (crowding threshold) |
| `AccessDenied` | The rider lacks access to the destination stop, or the elevator cannot serve it |

## RejectionContext

Every `RiderRejected` event includes a `RejectionContext` with the numeric details behind the decision:

```rust,ignore
RejectionContext {
    attempted_weight: OrderedFloat<f64>,  // weight the rider tried to add
    current_load: OrderedFloat<f64>,      // elevator's load at rejection time
    capacity: OrderedFloat<f64>,          // elevator's maximum weight capacity
}
```

`RejectionContext` implements `Display` for game-friendly feedback:

```rust,ignore
// "over capacity by 30.0kg (750.0/800.0 + 80.0)"
println!("{}", context);
```

## EtaError

ETA queries (`sim.eta()`, `sim.best_eta()`) use a separate error type because they fail for different reasons than general simulation operations:

| Variant | When it occurs |
|---|---|
| `NotAnElevator(EntityId)` | The queried entity is not an elevator |
| `NotAStop(EntityId)` | The queried entity is not a stop |
| `StopNotQueued { elevator, stop }` | The stop is not in the elevator's destination queue |
| `ServiceModeExcluded(EntityId)` | The elevator's service mode excludes it from dispatch queries |
| `StopVanished(EntityId)` | A stop in the route disappeared during calculation |
| `NoCarAssigned(EntityId)` | No car has been assigned to serve the hall call at this stop |

## Handling spawn failures

The most common error path in game code is spawning riders. Here are the key failures and how to handle them:

```rust,no_run
# use elevator_core::prelude::*;
# let mut sim: Simulation = todo!();
match sim.spawn_rider(StopId(0), StopId(5), 75.0) {
    Ok(rider) => {
        // Rider spawned successfully.
    }
    Err(SimError::StopNotFound(id)) => {
        // StopId doesn't exist in config. Check your stop setup.
        eprintln!("Unknown stop: {id}");
    }
    Err(SimError::NoRoute { origin, destination, .. }) => {
        // No group connects these two stops.
        eprintln!("No route from {origin:?} to {destination:?}");
    }
    Err(SimError::AmbiguousRoute { groups, .. }) => {
        // Multiple groups serve both stops. Use build_rider()
        // with an explicit group instead.
        eprintln!("Ambiguous: served by {groups:?}");
    }
    Err(e) => {
        eprintln!("Spawn failed: {e}");
    }
}
```

## Reacting to rejections

Rider rejections are not Rust errors -- they are events. The simulation continues normally; the rejected rider stays in their current phase (usually `Waiting`). React to rejections by draining events:

```rust,no_run
# use elevator_core::prelude::*;
# fn run(sim: &mut Simulation) {
sim.step();

for event in sim.drain_events() {
    if let Event::RiderRejected { rider, elevator, reason, context, tick } = event {
        match reason {
            RejectionReason::OverCapacity => {
                // Show "elevator full" indicator in game UI.
                if let Some(ctx) = &context {
                    println!("[{tick}] {rider:?} rejected from {elevator:?}: {ctx}");
                }
            }
            RejectionReason::AccessDenied => {
                // Flash "access denied" on the panel.
            }
            RejectionReason::PreferenceBased => {
                // Rider chose to skip -- animate them stepping back.
            }
            _ => {}
        }
    }
}
# }
```

## Best practices

- **Always handle `Result`s from `spawn_rider` and `build_rider`.** These are the most likely to fail in dynamic scenarios where stops or groups change at runtime.
- **Use `build_rider()` in multi-group buildings** to avoid `AmbiguousRoute` by specifying the group explicitly.
- **Check `is_elevator()` / `is_stop()` before calling entity-specific methods** if you are working with mixed `EntityId` collections.
- **Treat `RiderRejected` as a normal game event**, not an error. The simulation handles it gracefully; your game just needs to decide how to present it.
- **Log `SimError` in debug builds.** The `Display` impl produces clear, actionable messages that point directly at the problem.

## Next steps

- [Rider Lifecycle](rider-lifecycle.md) -- understand the phases that trigger rejection and abandonment
- [Events and Metrics](events-metrics.md) -- the full event system including rejection events
- [Configuration](configuration.md) -- avoid `InvalidConfig` errors by understanding validation rules
