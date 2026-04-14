# Writing a Custom Dispatch Strategy

The built-in strategies ([SCAN, LOOK, NearestCar, ETD](dispatch.md)) cover most general-purpose needs. Write a custom strategy when you need domain-specific behavior the built-ins don't capture — priority lanes, VIP handling, freight vs. passenger separation, fairness guarantees, energy-aware dispatch.

This chapter is a narrative tutorial that walks from a minimal strategy to a production-grade one with snapshot support. If you just need the API surface, the [Dispatch Strategies](dispatch.md#writing-a-custom-strategy) chapter has the reference sketch.

## The trait surface

```rust,ignore
pub trait DispatchStrategy: Send + Sync {
    /// Decide where one idle elevator should go.
    fn decide(
        &mut self,
        elevator: EntityId,
        elevator_position: f64,
        group: &ElevatorGroup,
        manifest: &DispatchManifest,
        world: &World,
    ) -> DispatchDecision;

    /// Decide for all idle elevators in one pass (optional).
    ///
    /// Default implementation calls `decide` once per elevator.
    /// Override when the strategy must coordinate across elevators —
    /// for example, to prevent two cars from being sent to the same
    /// hall call.
    fn decide_all(
        &mut self,
        elevators: &[(EntityId, f64)],
        group: &ElevatorGroup,
        manifest: &DispatchManifest,
        world: &World,
    ) -> Vec<(EntityId, DispatchDecision)> { /* default: per-elevator */ }

    /// Clean up per-elevator state when an elevator is removed.
    ///
    /// Strategies with internal `HashMap<EntityId, _>` state must
    /// remove the entry here — otherwise the map grows unbounded
    /// and cross-group reassignments leave stale entries.
    fn notify_removed(&mut self, _elevator: EntityId) { /* default: no-op */ }
}
```

Three methods, three clear responsibilities. Everything else you need comes from `DispatchManifest` and `ElevatorGroup`.

## Step 1 — The simplest possible strategy

"Always send idle elevators to the stop with the most waiting riders."

```rust,ignore
use elevator_core::dispatch::{
    DispatchDecision, DispatchManifest, DispatchStrategy, ElevatorGroup,
};
use elevator_core::entity::EntityId;
use elevator_core::world::World;

struct BusiestStopFirst;

impl DispatchStrategy for BusiestStopFirst {
    fn decide(
        &mut self,
        _elevator: EntityId,
        _position: f64,
        group: &ElevatorGroup,
        manifest: &DispatchManifest,
        _world: &World,
    ) -> DispatchDecision {
        group
            .stop_entities()
            .iter()
            .filter(|&&s| manifest.has_demand(s))
            .max_by_key(|&&s| manifest.waiting_count_at(s))
            .copied()
            .map_or(DispatchDecision::Idle, DispatchDecision::GoToStop)
    }
}
```

What this gets you:
- The simulation drives direction indicators automatically based on `GoToStop` vs. `Idle`.
- `DestinationQueue` management happens in the `AdvanceQueue` phase — you don't touch it.
- The dispatch phase events (`ElevatorAssigned`, `ElevatorIdle`, `DirectionIndicatorChanged`) emit automatically.

What this strategy *doesn't* handle: two idle elevators will both be sent to the same stop. For that, you need `decide_all`.

## Step 2 — Coordinating across elevators with `decide_all`

The problem: `decide` runs independently per elevator. If stops A and B both have demand and elevators E1 and E2 are both idle, calling `decide` twice may return `GoToStop(A)` both times — one elevator goes unused.

Override `decide_all` to pair elevators with stops exactly once:

```rust,ignore
impl DispatchStrategy for BusiestStopFirst {
    fn decide(
        &mut self,
        _elevator: EntityId,
        _position: f64,
        _group: &ElevatorGroup,
        _manifest: &DispatchManifest,
        _world: &World,
    ) -> DispatchDecision {
        // Required by the trait. When `decide_all` is overridden, this
        // is unreachable on the dispatch path.
        DispatchDecision::Idle
    }

    fn decide_all(
        &mut self,
        elevators: &[(EntityId, f64)],
        group: &ElevatorGroup,
        manifest: &DispatchManifest,
        _world: &World,
    ) -> Vec<(EntityId, DispatchDecision)> {
        let mut stops: Vec<EntityId> = group
            .stop_entities()
            .iter()
            .copied()
            .filter(|&s| manifest.has_demand(s))
            .collect();
        stops.sort_by_key(|&s| std::cmp::Reverse(manifest.waiting_count_at(s)));

        let mut results = Vec::with_capacity(elevators.len());
        let mut stops_iter = stops.into_iter();

        for &(eid, _) in elevators {
            match stops_iter.next() {
                Some(stop) => results.push((eid, DispatchDecision::GoToStop(stop))),
                None => results.push((eid, DispatchDecision::Idle)),
            }
        }
        results
    }
}
```

`NearestCarDispatch` and `EtdDispatch` both use this pattern internally.

## Step 3 — Carrying state, and the `notify_removed` contract

If your strategy tracks something per elevator (direction history, last-served stop, priority bookkeeping), it owns a `HashMap<EntityId, _>`. That map must be cleaned up when an elevator is removed or reassigned across groups, or it grows forever.

The framework calls `notify_removed(elevator)` on the group's dispatcher whenever:

1. `Simulation::remove_elevator(id)` is called, OR
2. `Simulation::reassign_elevator_to_line(id, new_line)` moves an elevator *across groups* (same-group moves don't fire `notify_removed` because the dispatcher still owns the elevator).

Forgetting to implement this is the most common correctness bug in custom strategies. `ScanDispatch` and `LookDispatch` both use it to evict direction entries.

```rust,ignore
use std::collections::HashMap;

#[derive(Default)]
struct PriorityDispatch {
    /// Per-elevator cooldown — once this elevator served a priority stop,
    /// suppress priority preference for N ticks so non-priority riders
    /// aren't starved.
    cooldown_ticks: HashMap<EntityId, u64>,
}

impl DispatchStrategy for PriorityDispatch {
    fn decide(/* ... */) -> DispatchDecision { /* ... */ }

    fn notify_removed(&mut self, elevator: EntityId) {
        // CRITICAL: keeps the map from growing unbounded under churn.
        self.cooldown_ticks.remove(&elevator);
    }
}
```

## Step 4 — Snapshot support

Simulations can be serialized via `Simulation::snapshot()` for save/load, replay, and deterministic testing. The snapshot records each group's dispatch strategy by name. Built-in strategies serialize to specific variants (`BuiltinStrategy::Scan`, `::Look`, `::NearestCar`, `::Etd`); custom strategies serialize to `BuiltinStrategy::Custom(String)`.

On restore, `WorldSnapshot::restore()` takes an optional factory function that maps the custom name back to a strategy instance. If you don't provide one, custom strategies silently become `ScanDispatch` on restore — your save/load round trip will be wrong.

The canonical pattern:

```rust,ignore
use elevator_core::dispatch::{BuiltinStrategy, DispatchStrategy};
use elevator_core::ids::GroupId;
use elevator_core::snapshot::WorldSnapshot;

const PRIORITY_NAME: &str = "priority";

// When building the sim, install the strategy via `Simulation::set_dispatch`,
// which takes both the strategy and the `BuiltinStrategy` id used for
// snapshot serialization. The builder's `.dispatch(...)` helper installs
// the strategy but defaults the id to `BuiltinStrategy::Scan` — fine for
// the built-in strategies, wrong for custom ones.
let mut sim = SimulationBuilder::demo().build()?;
sim.set_dispatch(
    GroupId(0),
    Box::new(PriorityDispatch::default()),
    BuiltinStrategy::Custom(PRIORITY_NAME.into()),
);

// When restoring:
let snapshot: WorldSnapshot = /* deserialized from RON/JSON/bincode */;
let sim = snapshot.restore(Some(&|name: &str| -> Option<Box<dyn DispatchStrategy>> {
    match name {
        PRIORITY_NAME => Some(Box::new(PriorityDispatch::default())),
        // Return `None` for unknown names — the restore falls back to
        // `ScanDispatch` rather than panicking.
        _ => None,
    }
}));
```

The name is opaque to the library. Keep it stable across releases — changing the name breaks old saved snapshots.

## Step 5 — Testing a custom strategy

Two levels of test coverage:

**Unit-test `decide` in isolation.** Construct a minimal `World`, an `ElevatorGroup`, and a `DispatchManifest`, then call your strategy's `decide` directly. This is how the built-in strategies are tested; see `crates/elevator-core/src/tests/dispatch_tests.rs` for the helper pattern (`test_world()`, `test_group()`, `spawn_elevator()`, `add_demand()`).

```rust,ignore
#[test]
fn busiest_stop_wins() {
    let (mut world, stops) = test_world();              // 4 stops at 0/4/8/12
    let elev = spawn_elevator(&mut world, 0.0);
    let group = test_group(&stops, vec![elev]);

    let mut manifest = DispatchManifest::default();
    add_demand(&mut manifest, &mut world, stops[1], 70.0);
    add_demand(&mut manifest, &mut world, stops[2], 70.0);
    add_demand(&mut manifest, &mut world, stops[2], 70.0);  // 2 riders at stops[2]

    let mut strategy = BusiestStopFirst;
    let decision = strategy.decide(elev, 0.0, &group, &manifest, &world);
    assert_eq!(decision, DispatchDecision::GoToStop(stops[2]));
}
```

**Integration-test via a full `Simulation`.** Spawn riders, step the loop, assert on events (`ElevatorAssigned`, `RiderBoarded`, etc.). This catches bugs that only surface through the 8-phase interaction — e.g., a strategy that pushes duplicate targets, or one that produces decisions that the `AdvanceQueue` phase later undoes.

## Performance considerations

- `decide` / `decide_all` run once per tick per group. At 60 ticks/second and a realistic group size (20 elevators, 50 stops), that's tens of thousands of calls per simulated minute. Keep the hot path allocation-free where possible.
- `SmallVec<[T; N]>` is already the storage choice in the built-in strategies for the "ahead" / "behind" partitions. If you partition elevators or stops, consider the same.
- The `DispatchManifest` is immutable — never try to mutate demand from inside `decide`. If you need to track per-rider state across ticks, store it in your strategy.
- Avoid `HashMap<EntityId, _>` iteration in the hot path — it's nondeterministic. Use `BTreeMap` or sort the keys.

## Putting it together: a runnable example

See [`examples/custom_dispatch.rs`](https://github.com/andymai/elevator-core/blob/main/crates/elevator-core/examples/custom_dispatch.rs) in the repository — a complete file implementing a round-robin strategy with all three trait methods, ready to `cargo run --example custom_dispatch`.

## Next steps

- [Extensions and Hooks](extensions-and-hooks.md) — attach per-rider / per-elevator data (VIP tags, priority, preferences) that your strategy can consult via `world.get_ext::<T>(id)`.
- [Snapshots and Determinism](snapshots-and-determinism.md) — full snapshot/restore cycle, with emphasis on the custom-strategy factory.
- [Metrics and Events](metrics-and-events.md) — what dispatch emits and how to consume it for debugging.
