# Lifecycle Hooks

Hooks let you inject custom logic before or after any of the simulation's tick phases. They receive `&mut World`, so they can read and modify any entity, extension, or resource -- the primary integration point for game-specific behavior that should run every tick.

## Registering hooks on the builder

```rust,no_run
use elevator_core::prelude::*;
use elevator_core::config::ElevatorConfig;
use elevator_core::hooks::Phase;
use elevator_core::stop::StopId;

fn main() -> Result<(), SimError> {
    let sim = SimulationBuilder::new()
        .stop(StopId(0), "Ground", 0.0)
        .stop(StopId(1), "Top", 10.0)
        .elevator(ElevatorConfig::default())
        .after(Phase::Loading, |world| {
            // Runs after every Loading phase.
            // Check for newly arrived riders, update scores, etc.
        })
        .before(Phase::Dispatch, |world| {
            // Runs before every Dispatch phase.
            // Adjust demand, spawn dynamic riders, etc.
        })
        .build()?;
    Ok(())
}
```

## Registering hooks after build

You can add hooks to a running simulation. This is useful when hook logic depends on runtime state that isn't available at build time:

```rust,no_run
# use elevator_core::prelude::*;
# use elevator_core::__doctest_prelude::*;
# use elevator_core::hooks::Phase;
# fn main() -> Result<(), SimError> {
# let mut sim = SimulationBuilder::new()
#     .stop(StopId(0), "Ground", 0.0)
#     .stop(StopId(1), "Top", 10.0)
#     .elevator(ElevatorConfig::default())
#     .build()?;
sim.add_after_hook(Phase::Loading, |world| {
    // Post-loading logic
});
# Ok(())
# }
```

## Group-specific hooks

For multi-group buildings, you can register hooks that only fire for a specific elevator group:

```rust,no_run
# use elevator_core::prelude::*;
# use elevator_core::__doctest_prelude::*;
# use elevator_core::hooks::Phase;
# fn main() -> Result<(), SimError> {
let sim = SimulationBuilder::new()
    .stop(StopId(0), "Ground", 0.0)
    .stop(StopId(1), "Top", 10.0)
    .elevator(ElevatorConfig::default())
    .after_group(Phase::Loading, GroupId(0), |world| {
        // Only runs after loading for group 0
    })
    .build()?;
# Ok(())
# }
```

Group-specific hooks run alongside global hooks for the same phase; all `before` hooks fire before the phase body, all `after` hooks fire after.

## What hooks can and can't do

Hooks receive `&mut World` -- not `&mut Simulation`. This means:

**You can:**
- Read and mutate any component (`world.rider(id)`, `world.elevator_mut(id)`)
- Insert, read, and remove extensions (`world.insert_ext()`, `world.get_ext_mut()`)
- Add and remove resources (`world.insert_resource()`, `world.resource_mut()`)
- Read tick state via a resource mirror (see the worked example below)

**You cannot:**
- Call `sim.step()`, `sim.spawn_rider()`, `sim.snapshot()`, or other `Simulation`-level methods -- the simulation is borrowed while the tick is in flight.
- Emit events directly. Use an extension or resource to record side effects and translate them to events in your game code after `sim.step()` returns.

## Available phases

| Phase | When hooks run |
|---|---|
| `Phase::AdvanceTransient` | Before/after transitional states advance (Boarding to Riding, Exiting to Arrived, patience ticking) |
| `Phase::Dispatch` | Before/after elevator assignment |
| `Phase::Reposition` | Before/after idle-elevator repositioning (no-op if no reposition strategy configured) |
| `Phase::AdvanceQueue` | Before/after destination queue reconciliation with elevator phase/target |
| `Phase::Movement` | Before/after position updates |
| `Phase::Doors` | Before/after door state machine ticks |
| `Phase::Loading` | Before/after boarding and exiting |
| `Phase::Metrics` | Before/after metric aggregation |

## Hook execution order within a tick

Hooks run in strict phase order. Within each phase, all `before` hooks fire first, then the phase body executes, then all `after` hooks fire:

```text
before(AdvanceTransient) -> [AdvanceTransient] -> after(AdvanceTransient)
before(Dispatch)         -> [Dispatch]         -> after(Dispatch)
before(Reposition)       -> [Reposition]       -> after(Reposition)
before(AdvanceQueue)     -> [AdvanceQueue]     -> after(AdvanceQueue)
before(Movement)         -> [Movement]         -> after(Movement)
before(Doors)            -> [Doors]            -> after(Doors)
before(Loading)          -> [Loading]          -> after(Loading)
before(Metrics)          -> [Metrics]          -> after(Metrics)
```

Multiple hooks registered for the same slot run in registration order.

## Spawning during hooks

Hooks operate on `&mut World`, so you can use `world.spawn()` plus direct component inserts to create entities. However, the recommended pattern is to queue spawn requests into a resource and drain them after `sim.step()` returns.

The `before(Phase::Dispatch)` slot is a particularly convenient place to inject riders, because the dispatch phase runs immediately after and will see the newly added riders in the manifest.

## Combining extensions and hooks: worked example

A facilities team monitoring an office tower wants to know whenever a tenant has been waiting for an elevator for more than 90 seconds during peak traffic -- it is a service-level indicator and feeds an end-of-day report. This walkthrough flags each over-budget wait exactly once via a `SlaBreach` extension component plus an `after(Phase::Metrics)` hook.

The hook closure cannot call `sim.current_tick()` directly (the simulation is borrowed during the tick), so the tick is mirrored into a `World` resource that the hook reads.

```rust,no_run
use elevator_core::hooks::Phase;
use elevator_core::prelude::*;
use elevator_core::world::ExtKey;
use serde::{Serialize, Deserialize};

/// Per-rider flag that latches the first time a tenant breaches the
/// 90-second SLA so we report each wait at most once.
#[derive(Debug, Clone, Serialize, Deserialize)]
struct SlaBreach {
    reported: bool,
}

// 60 ticks/sec * 90 sec = 5_400 ticks.
const SLA_BUDGET_TICKS: u64 = 5_400;

fn main() -> Result<(), SimError> {
    let mut sim = SimulationBuilder::new()
        .stop(StopId(0), "Lobby", 0.0)
        .stop(StopId(1), "Floor 2", 4.0)
        .stop(StopId(2), "Floor 3", 8.0)
        .elevator(ElevatorConfig { starting_stop: StopId(0), ..Default::default() })
        .with_ext::<SlaBreach>()
        .after(Phase::Metrics, |world| {
            // Scan every rider; flag the first time they cross the SLA budget.
            let rider_ids: Vec<EntityId> = world.rider_ids();
            for rid in rider_ids {
                let Some(rider) = world.rider(rid) else { continue };
                if rider.phase() != RiderPhase::Waiting { continue; }

                let current_tick = world.resource::<CurrentTick>()
                    .map_or(0, |t| t.0);
                let wait = current_tick.saturating_sub(rider.spawn_tick());

                if wait > SLA_BUDGET_TICKS {
                    if let Some(breach) = world.ext_mut::<SlaBreach>(rid) {
                        if !breach.reported {
                            breach.reported = true;
                            println!(
                                "SLA breach: rider {:?} waited {} ticks (>{} budget)",
                                rid, wait, SLA_BUDGET_TICKS,
                            );
                        }
                    }
                }
            }
        })
        .build()?;

    // Seed the resource the hook reads.
    sim.world_mut().insert_resource(CurrentTick(0));

    // Spawn a tenant and attach the SLA tracker.
    let r1 = sim.spawn_rider(StopId(0), StopId(2), 75.0)?;
    sim.world_mut().insert_ext(r1.entity(), SlaBreach { reported: false }, ExtKey::from_type_name());

    for _ in 0..6_000 {
        // Mirror the current tick into the resource before stepping.
        let now = sim.current_tick();
        if let Some(t) = sim.world_mut().resource_mut::<CurrentTick>() {
            t.0 = now;
        }
        sim.step();
    }

    Ok(())
}

struct CurrentTick(u64);
```

This pattern -- define a component, register it, attach it on spawn, read/write it in a hook -- is the standard way to layer caller-defined behaviour on top of the simulation.

## Next steps

- [Extensions](extensions.md) -- the extension system that hooks read and write.
- [The Simulation Loop](simulation-loop.md) -- the 8-phase tick loop that hooks wrap around.
- [Writing a Custom Dispatch](custom-dispatch.md) -- for logic that should influence car assignment rather than react to it.
