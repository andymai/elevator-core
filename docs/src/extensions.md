# Extensions

The core library is deliberately unopinionated -- it provides riders, elevators, and stops, but your game decides what a rider *means*. Maybe riders have a VIP status, a mood, a destination preference, or a cargo manifest. Extensions let you layer game-specific data on top of any entity without forking or wrapping the library.

## Extension components

Extension components attach arbitrary typed data to any entity. They work like the built-in components (`Rider`, `Elevator`, etc.) but are defined by your code.

### Define your type

Extension types must implement `Serialize` and `DeserializeOwned` (for snapshot support), plus `Send + Sync`:

```rust,no_run
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct VipTag {
    level: u32,
    lounge_access: bool,
}
```

### Register with the builder

Call `.with_ext::<T>()` on the builder to register the extension type. The type name is used automatically for snapshot serialization:

```rust,no_run
# use serde::{Serialize, Deserialize};
# #[derive(Debug, Clone, Serialize, Deserialize)]
# struct VipTag { level: u32, lounge_access: bool }
use elevator_core::prelude::*;
use elevator_core::config::ElevatorConfig;
use elevator_core::stop::StopId;

fn main() -> Result<(), SimError> {
    let mut sim = SimulationBuilder::new()
        .stop(StopId(0), "Ground", 0.0)
        .stop(StopId(1), "Top", 10.0)
        .elevator(ElevatorConfig::default())
        .with_ext::<VipTag>()
        .build()?;
    Ok(())
}
```

### Attach to entities

Use `world.insert_ext()` to attach your component to an entity:

```rust,no_run
# use serde::{Serialize, Deserialize};
# #[derive(Debug, Clone, Serialize, Deserialize)]
# struct VipTag { level: u32, lounge_access: bool }
# use elevator_core::prelude::*;
# use elevator_core::config::ElevatorConfig;
# use elevator_core::stop::StopId;
# fn main() -> Result<(), SimError> {
# let mut sim = SimulationBuilder::new()
#     .stop(StopId(0), "Ground", 0.0)
#     .stop(StopId(1), "Top", 10.0)
#     .elevator(ElevatorConfig::default())
#     .with_ext::<VipTag>()
#     .build()?;
let rider_id = sim.spawn_rider(StopId(0), StopId(1), 75.0)?;

sim.world_mut().insert_ext(
    rider_id,
    VipTag { level: 3, lounge_access: true },
    ExtKey::from_type_name(),
);
# Ok(())
# }
```

### Read it back

Use `world.get_ext()` for a cloned value, `world.get_ext_ref()` for a zero-copy borrow, or `world.get_ext_mut()` for a mutable reference:

```rust,no_run
# use serde::{Serialize, Deserialize};
# #[derive(Debug, Clone, Serialize, Deserialize)]
# struct VipTag { level: u32, lounge_access: bool }
# use elevator_core::prelude::*;
# fn run(sim: &mut Simulation, rider_id: EntityId) {
// Read (cloned)
if let Some(vip) = sim.world().get_ext::<VipTag>(rider_id) {
    println!("VIP level: {}", vip.level);
}

// Mutate
if let Some(vip) = sim.world_mut().get_ext_mut::<VipTag>(rider_id) {
    vip.level += 1;
}
# }
```

## Query with extensions

Extensions integrate with the query builder for ECS-style iteration:

```rust,ignore
// Read-only iteration (cloned via Ext<T>)
for (id, vip) in world.query::<(EntityId, &Ext<VipTag>)>().iter() {
    println!("{:?} is VIP level {}", id, vip.level);
}

// Mutable access (keys-snapshot pattern via query_ext_mut)
world.query_ext_mut::<VipTag>().for_each_mut(|id, tag| {
    tag.level += 1;
});
```

The mutable query uses a keys-snapshot pattern internally -- it collects entity IDs first, then iterates with mutable borrows -- so it is safe to use without aliasing issues.

## World resources

For global data that is not attached to a specific entity, use **resources**. Resources are typed singletons stored on the `World`:

```rust,no_run
# use elevator_core::prelude::*;
# fn run(sim: &mut Simulation) {
// Insert a resource
sim.world_mut().insert_resource(42u32);

// Read it
if let Some(value) = sim.world().resource::<u32>() {
    println!("The answer is {}", value);
}

// Mutate it
if let Some(value) = sim.world_mut().resource_mut::<u32>() {
    *value += 1;
}
# }
```

Resources are useful for game state that hooks need to read or write -- score counters, time-of-day multipliers, spawn rate controllers, and so on.

## Extension vs. resource: which do I want?

| Need | Use |
|---|---|
| Per-entity data that varies by rider/elevator (VIP status, mood, cargo) | **Extension** (`with_ext` + `insert_ext`) |
| One-of value for the whole sim (score, difficulty, tick clock mirror) | **Resource** (`insert_resource`) |
| Data that must survive snapshot save/load | **Extension** (registered by name; resources are not snapshotted) |
| Quick scratchpad you can wipe between ticks | **Resource** |
| Query "all entities that have X" | **Extension** (query or iterate + filter on `get_ext`) |

Extensions are auto-cleaned on `despawn_rider`; resources persist until you remove them.

## Snapshot integration

Extension components are serialized by their registered type name into the `WorldSnapshot`. To restore them correctly after loading a snapshot:

1. Register the extension types on the restored simulation's world.
2. Call `sim.load_extensions()` to deserialize and attach the pending data.

```rust,no_run
# use elevator_core::prelude::*;
# use elevator_core::snapshot::WorldSnapshot;
# use serde::{Serialize, Deserialize};
# #[derive(Clone, Serialize, Deserialize)] struct VipTag { level: u32 }
# fn run(snapshot: WorldSnapshot) {
let mut sim = snapshot.restore(None).unwrap();
sim.world_mut().register_ext::<VipTag>(ExtKey::from_type_name());
sim.load_extensions();
# }
```

Unregistered types remain in a `PendingExtensions` resource until you register them. If you have many extension types, use the `register_extensions!` macro to register them all in one call.

The key rule: **register with `with_ext` before building, or with `register_ext` before restoring.** If an extension type is missing at restore time, its data is silently held in pending storage rather than lost.

## Auto-cleanup on despawn

Extension components are automatically removed when an entity is despawned. You don't need to manually clean up extension data -- `despawn_rider`, `remove_elevator`, and other removal APIs handle it.

This means you can freely attach extensions to riders that will be delivered and despawned without worrying about leaked data in the extension storage maps.

## Next steps

- [Lifecycle Hooks](lifecycle-hooks.md) -- inject custom logic that reads and writes extension data each tick.
- [Writing a Custom Dispatch](custom-dispatch.md) -- strategies can consult extension data via `world.get_ext::<T>(id)` in their `rank` function.
- [Snapshots and Determinism](snapshots-determinism.md) -- full snapshot/restore cycle including extension registration.
