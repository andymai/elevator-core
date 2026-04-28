# Extensions

The core library is deliberately unopinionated -- it provides riders, elevators, and stops, but caller code decides what a rider *means*. A rider could be a hotel guest with a priority class, an office tenant with a tenant id, a hospital patient with a transport type, or a freight crate with a manifest. Extensions let you layer caller-defined data on top of any entity without forking or wrapping the library.

## Extension components

Extension components attach arbitrary typed data to any entity. They work like the built-in components (`Rider`, `Elevator`, etc.) but are defined by your code.

### Define your type

Extension types must implement `Serialize` and `DeserializeOwned` (for snapshot support), plus `Send + Sync`:

```rust,no_run
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct GuestPriority {
    /// 0 = standard guest, 1 = elite, 2 = top-tier suite.
    priority_class: u8,
    /// Floor where the guest's room lives. A custom dispatch
    /// strategy can consult this to favour the express bank that
    /// serves the high-floor suites.
    suite_floor: u32,
}
```

### Register with the builder

Call `.with_ext::<T>()` on the builder to register the extension type. The type name is used automatically for snapshot serialization:

```rust,no_run
# use serde::{Serialize, Deserialize};
# #[derive(Debug, Clone, Serialize, Deserialize)]
# struct GuestPriority { priority_class: u8, suite_floor: u32 }
use elevator_core::prelude::*;
use elevator_core::config::ElevatorConfig;
use elevator_core::stop::StopId;

fn main() -> Result<(), SimError> {
    let mut sim = SimulationBuilder::new()
        .stop(StopId(0), "Ground", 0.0)
        .stop(StopId(1), "Top", 10.0)
        .elevator(ElevatorConfig::default())
        .with_ext::<GuestPriority>()
        .build()?;
    Ok(())
}
```

### Attach to entities

Use `world.insert_ext()` to attach your component to an entity:

```rust,no_run
# use serde::{Serialize, Deserialize};
# #[derive(Debug, Clone, Serialize, Deserialize)]
# struct GuestPriority { priority_class: u8, suite_floor: u32 }
# use elevator_core::prelude::*;
# fn main() -> Result<(), SimError> {
# let mut sim = SimulationBuilder::new()
#     .stop(StopId(0), "Ground", 0.0)
#     .stop(StopId(1), "Top", 10.0)
#     .elevator(ElevatorConfig::default())
#     .with_ext::<GuestPriority>()
#     .build()?;
let rider_id = sim.spawn_rider(StopId(0), StopId(1), 75.0)?;

sim.world_mut().insert_ext(
    rider_id.entity(),
    GuestPriority { priority_class: 2, suite_floor: 47 },
    ExtKey::from_type_name(),
);
# Ok(())
# }
```

### Read it back

Use `world.ext()` for a cloned value, `world.ext_ref()` for a zero-copy borrow, or `world.ext_mut()` for a mutable reference:

```rust,no_run
# use serde::{Serialize, Deserialize};
# #[derive(Debug, Clone, Serialize, Deserialize)]
# struct GuestPriority { priority_class: u8, suite_floor: u32 }
# use elevator_core::prelude::*;
# fn run(sim: &mut Simulation, rider_id: EntityId) {
// Read (cloned)
if let Some(guest) = sim.world().ext::<GuestPriority>(rider_id) {
    println!("priority class: {}", guest.priority_class);
}

// Mutate -- promote the guest's class.
if let Some(guest) = sim.world_mut().ext_mut::<GuestPriority>(rider_id) {
    guest.priority_class = guest.priority_class.saturating_add(1);
}
# }
```

## Query with extensions

Extensions integrate with the query builder for ECS-style iteration:

```rust,no_run
# use serde::{Serialize, Deserialize};
# #[derive(Debug, Clone, Serialize, Deserialize)]
# struct GuestPriority { priority_class: u8, suite_floor: u32 }
# use elevator_core::prelude::*;
# use elevator_core::query::Ext;
# fn run(world: &mut World) {
// Read-only iteration (cloned via Ext<T>)
for (id, guest) in world.query::<(EntityId, &Ext<GuestPriority>)>().iter() {
    println!("{:?} is priority class {}", id, guest.priority_class);
}

// Mutable access -- promote everyone by one class (with saturation).
world.query_ext_mut::<GuestPriority>().for_each_mut(|_id, guest| {
    guest.priority_class = guest.priority_class.saturating_add(1);
});
# }
```

The mutable query collects entity IDs first, then iterates with mutable borrows, so it is safe to use without aliasing issues.

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

Resources are useful for caller-side state that hooks need to read or write -- a tick-of-day clock mirror, a peak-traffic multiplier, a spawn-rate controller, and so on.

## Extension vs. resource: which do I want?

| Need | Use |
|---|---|
| Per-entity data that varies by rider/elevator (priority class, transport type, cargo manifest) | **Extension** (`with_ext` + `insert_ext`) |
| One-of value for the whole sim (time-of-day, traffic profile, tick clock mirror) | **Resource** (`insert_resource`) |
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
# #[derive(Clone, Serialize, Deserialize)] struct GuestPriority { priority_class: u8, suite_floor: u32 }
# fn run(snapshot: WorldSnapshot) {
let mut sim = snapshot.restore(None).unwrap();
sim.world_mut().register_ext::<GuestPriority>(ExtKey::from_type_name());
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
- [Writing a Custom Dispatch](custom-dispatch.md) -- strategies can consult extension data via `world.ext::<T>(id)` in their `rank` function.
- [Snapshots and Determinism](snapshots-determinism.md) -- full snapshot/restore cycle including extension registration.
