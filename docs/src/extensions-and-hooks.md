# Extensions and Hooks

The core library is deliberately unopinionated -- it provides riders, elevators, and stops, but your game decides what a rider *means*. Maybe riders have a VIP status, a mood, a destination preference, or a cargo manifest. Extensions and hooks are how you layer game-specific logic on top of the simulation without forking or wrapping.

## Extension components

Extension components let you attach arbitrary typed data to any entity. They work like the built-in components (`Rider`, `Elevator`, etc.) but are defined by your code.

### Step 1: Define your type

Extension types must implement `Serialize` and `DeserializeOwned` (for snapshot support), plus `Send + Sync`:

```rust,no_run
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct VipTag {
    level: u32,
    lounge_access: bool,
}
```

### Step 2: Register with the builder

Call `.with_ext::<T>("name")` on the builder to register the extension type. The name string is used for snapshot serialization:

```rust,no_run
# use serde::{Serialize, Deserialize};
# #[derive(Debug, Clone, Serialize, Deserialize)]
# struct VipTag { level: u32, lounge_access: bool }
use elevator_core::prelude::*;

fn main() -> Result<(), SimError> {
    let mut sim = SimulationBuilder::new()
        .with_ext::<VipTag>("vip_tag")
        .build()?;
    Ok(())
}
```

### Step 3: Attach to entities

Use `world.insert_ext()` to attach your component to an entity:

```rust,no_run
# use serde::{Serialize, Deserialize};
# #[derive(Debug, Clone, Serialize, Deserialize)]
# struct VipTag { level: u32, lounge_access: bool }
# use elevator_core::prelude::*;
# use elevator_core::stop::StopId;
# fn main() -> Result<(), SimError> {
# let mut sim = SimulationBuilder::new().with_ext::<VipTag>("vip_tag").build()?;
let rider_id = sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 75.0)?;

sim.world_mut().insert_ext(
    rider_id,
    VipTag { level: 3, lounge_access: true },
    "vip_tag",
);
# Ok(())
# }
```

### Step 4: Read it back

Use `world.get_ext()` for a cloned value, or `world.get_ext_mut()` for a mutable reference:

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

Extensions are automatically cleaned up when an entity is despawned, and they participate in snapshot save/load as long as you register them with `.with_ext()` or `world.register_ext()`.

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

### Extension vs. resource: which do I want?

| Need | Use |
|---|---|
| Per-entity data that varies by rider/elevator (VIP status, mood, cargo manifest) | **Extension** (`with_ext` + `insert_ext`) |
| One-of value for the whole sim (score, difficulty, tick clock mirror) | **Resource** (`insert_resource`) |
| Data that must survive snapshot save/load | **Extension** (register by name; resources are not snapshotted) |
| Quick scratchpad you can wipe between ticks | **Resource** |
| Query "all entities that have X" | **Extension** (iterate `world.rider_ids()` and filter on `get_ext::<T>`) |

Extensions are auto-cleaned on `despawn_rider`; resources persist until you remove them.

## Lifecycle hooks

Hooks let you inject custom logic before or after any of the six tick phases. They receive `&mut World`, so they can read and modify any entity or resource.

### Registering hooks on the builder

```rust,no_run
use elevator_core::prelude::*;

fn main() -> Result<(), SimError> {
    let sim = SimulationBuilder::new()
        .after(Phase::Loading, |world| {
            // This runs after every Loading phase.
            // Check for newly arrived riders, update scores, etc.
        })
        .before(Phase::Dispatch, |world| {
            // This runs before every Dispatch phase.
            // Adjust demand, spawn dynamic riders, etc.
        })
        .build()?;
    Ok(())
}
```

### Registering hooks after build

You can also add hooks to a running simulation:

```rust,no_run
# use elevator_core::prelude::*;
# fn main() -> Result<(), SimError> {
# let mut sim = SimulationBuilder::new().build()?;
sim.add_after_hook(Phase::Loading, |world| {
    // Post-loading logic
});
# Ok(())
# }
```

### Group-specific hooks

For multi-group buildings, you can register hooks that only fire for a specific elevator group:

```rust,no_run
# use elevator_core::prelude::*;
# fn main() -> Result<(), SimError> {
let sim = SimulationBuilder::new()
    .after_group(Phase::Loading, GroupId(0), |world| {
        // Only runs after loading for group 0
    })
    .build()?;
# Ok(())
# }
```

### What hooks can (and can't) do

Hooks receive `&mut World` — not `&mut Simulation`. This means:

- **You can:** read/mutate any component, insert/remove extensions, add/remove resources, read tick state via a resource mirror (see example below).
- **You cannot:** call `sim.step()`, `sim.spawn_rider_by_stop_id()`, `sim.snapshot()` or other `Simulation`-level methods while a tick is in flight — the simulation is borrowed.
- **Spawning during a hook:** use `world.spawn()` + direct component inserts, or queue `SpawnRequest`s into a resource and drain them after `sim.step()` returns. The `before(Phase::Dispatch, ...)` slot is a convenient place to inject riders because the next phase will see them.
- **Events:** hooks do not emit events directly. Use an extension/resource to record side effects and translate to events in game code.

Hook execution order within a tick:

```text
before(AdvanceTransient) -> [phase] -> after(AdvanceTransient)
before(Dispatch)         -> [phase] -> after(Dispatch)
  ... and so on for each phase
```

Group-specific hooks run alongside global hooks for the same phase; all `before` hooks fire before the phase body, all `after` hooks fire after.

### Available phases

| Phase | When hooks run |
|---|---|
| `Phase::AdvanceTransient` | Before/after transitional states advance |
| `Phase::Dispatch` | Before/after elevator assignment |
| `Phase::Movement` | Before/after position updates |
| `Phase::Doors` | Before/after door state machine ticks |
| `Phase::Loading` | Before/after boarding and exiting |
| `Phase::Metrics` | Before/after metric aggregation |

## Combining extensions and hooks

The real power comes from using extensions and hooks together. Here is a walkthrough: we will track how long each rider has been waiting and print a warning if they wait too long.

The hook closure cannot call `sim.current_tick()` directly (the simulation is borrowed during the tick), so we store the tick in a `World` resource and update it each iteration. The `CurrentTick` helper struct is defined at the bottom of the listing.

```rust,no_run
use elevator_core::prelude::*;
use elevator_core::stop::StopId;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct WaitWarning {
    warned: bool,
}

fn main() -> Result<(), SimError> {
    let mut sim = SimulationBuilder::new()
        .stops(vec![])
        .stop(StopId(0), "Lobby", 0.0)
        .stop(StopId(1), "Floor 2", 4.0)
        .stop(StopId(2), "Floor 3", 8.0)
        .with_ext::<WaitWarning>("wait_warning")
        .after(Phase::Metrics, |world| {
            // Check all waiting riders for long waits.
            let rider_ids: Vec<EntityId> = world.rider_ids();
            for rid in rider_ids {
                let Some(rider) = world.rider(rid) else { continue };
                if rider.phase() != RiderPhase::Waiting { continue; }

                let current_tick = world.resource::<CurrentTick>()
                    .map_or(0, |t| t.0);
                let wait = current_tick.saturating_sub(rider.spawn_tick());

                if wait > 300 {
                    if let Some(warning) = world.get_ext_mut::<WaitWarning>(rid) {
                        if !warning.warned {
                            warning.warned = true;
                            println!("WARNING: rider {:?} has been waiting {} ticks!", rid, wait);
                        }
                    }
                }
            }
        })
        .build()?;

    // Seed the resource the hook reads.
    sim.world_mut().insert_resource(CurrentTick(0));

    // Spawn some riders and attach extensions.
    let r1 = sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 75.0)?;
    sim.world_mut().insert_ext(r1, WaitWarning { warned: false }, "wait_warning");

    for _ in 0..600 {
        // Update the current tick resource before stepping.
        if let Some(t) = sim.world_mut().resource_mut::<CurrentTick>() {
            t.0 = sim.current_tick();
        }
        sim.step();
    }

    Ok(())
}

struct CurrentTick(u64);
```

This pattern -- define a component, register it, attach it on spawn, read/write it in a hook -- is the standard way to add game-specific behavior to the simulation.

## Next steps

Head to [Configuration](configuration.md) to learn about RON config files and the programmatic configuration API.
