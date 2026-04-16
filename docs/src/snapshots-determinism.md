# Snapshots and Determinism

elevator-core is designed for reproducible simulations. This chapter covers the determinism guarantees, the snapshot save/load API, and the patterns for replay, regression testing, and research comparisons.

## Determinism guarantee

The simulation is deterministic given:

1. The same initial `SimConfig` (same stops, elevators, groups, lines, dispatch strategy).
2. The same sequence of API calls (`spawn_rider`, `despawn_rider`, `tag_entity`, hook mutations, etc.).
3. A deterministic dispatch strategy (the four built-ins -- `ScanDispatch`, `LookDispatch`, `NearestCarDispatch`, `EtdDispatch` -- are deterministic).

Under those conditions two runs produce byte-identical snapshots and event streams.

Sources of *non*-determinism to watch for:

- **`PoissonSource` and similar traffic generators** use a thread-local RNG. See [Traffic Generation -- Determinism and seeding](traffic-generation.md#determinism-and-seeding).
- **Custom dispatch strategies or hooks** that read wall-clock time, thread IDs, or unseeded RNGs.
- **HashMap iteration order** in your own hook code (the sim itself uses stable iteration via `BTreeMap`).

## Snapshots

A `WorldSnapshot` captures the full simulation state -- all entities, components, groups, lines, metrics, tagged metrics, tick counter -- in a serializable struct. Extension components are captured by type name and need a matching registration on restore. Resources and hooks are **not** captured.

### Saving

```rust,no_run
# use elevator_core::prelude::*;
# use elevator_core::config::ElevatorConfig;
# use elevator_core::stop::StopId;
# fn main() -> Result<(), SimError> {
# let mut sim = SimulationBuilder::new()
#     .stop(StopId(0), "Ground", 0.0)
#     .stop(StopId(1), "Top", 10.0)
#     .elevator(ElevatorConfig::default())
#     .build()?;
for _ in 0..1000 { sim.step(); }

let snapshot = sim.snapshot();
let bytes = ron::to_string(&snapshot).unwrap();
std::fs::write("save.ron", bytes).unwrap();
# Ok(())
# }
```

The snapshot struct is `Serialize + Deserialize` -- choose any serde format (RON, JSON, bincode, postcard).

### Loading

```rust,no_run
# use elevator_core::prelude::*;
# use elevator_core::snapshot::WorldSnapshot;
# fn main() -> Result<(), SimError> {
let bytes = std::fs::read_to_string("save.ron").unwrap();
let snapshot: WorldSnapshot = ron::from_str(&bytes).unwrap();

// `None` means "only built-in dispatch strategies"; pass a closure to
// resurrect custom strategies registered by name.
let sim = snapshot.restore(None);
# Ok(())
# }
```

### Entity ID remapping

On restore, fresh `EntityId` values are generated (SlotMap keys are not stable across sessions). The snapshot stores entity data by index; `restore()` builds an `old_id -> new_id` mapping and remaps all cross-references (elevator riders, rider phases, route legs, group caches). This is transparent to callers.

### Custom dispatch across restore

Built-in strategies (`Scan`, `Look`, `NearestCar`, `Etd`) are auto-restored by name. Custom strategies need a factory:

```rust,no_run
# use elevator_core::prelude::*;
# use elevator_core::snapshot::WorldSnapshot;
# use elevator_core::world::World;
# struct HighestFirstDispatch;
# impl DispatchStrategy for HighestFirstDispatch {
#   fn rank(&mut self, _: EntityId, _: f64, _: EntityId, _: f64, _: &elevator_core::dispatch::ElevatorGroup, _: &DispatchManifest, _: &World) -> Option<f64> { Some(0.0) }
# }
# fn run(snapshot: WorldSnapshot) {
let sim = snapshot.restore(Some(&|name: &str| match name {
    "HighestFirst" => Some(Box::new(HighestFirstDispatch)),
    _ => None,
}));
# }
```

Custom strategies are registered with `BuiltinStrategy::Custom("name")` via `sim.set_dispatch()`. That registered name is what the snapshot stores and what the factory closure receives on restore -- make sure the two match. See [Writing a Custom Dispatch -- Step 4](custom-dispatch.md#step-4----snapshot-support) for the full pattern.

### Extensions across restore

Extensions are serialized by their registered name. To restore them, re-register on the restored simulation's world and then call `load_extensions`:

```rust,no_run
# use elevator_core::prelude::*;
# use elevator_core::snapshot::WorldSnapshot;
# use serde::{Serialize, Deserialize};
# #[derive(Clone, Serialize, Deserialize)] struct VipTag;
# fn run(snapshot: WorldSnapshot) {
let mut sim = snapshot.restore(None).unwrap();
sim.world_mut().register_ext::<VipTag>(ExtKey::from_type_name());
sim.load_extensions();
# }
```

Use the `register_extensions!` macro to register many types in one line. See [Extensions -- Snapshot integration](extensions.md#snapshot-integration) for details.

## Patterns

### Replay

1. Serialize the initial config.
2. Log every external mutation (`spawn_rider`, `despawn_rider`, tag changes) with its tick.
3. To replay: rebuild the sim from config, then step while replaying logged mutations at the right ticks.

Snapshots are a stronger alternative -- you can start replay from any tick by restoring a snapshot taken at that tick.

### Regression testing

Run a seeded scenario for N ticks, snapshot, and diff against a golden snapshot:

```rust,ignore
let snap = sim.snapshot();
let actual = ron::to_string(&snap).unwrap();
let expected = include_str!("../golden/scenario_a.ron");
assert_eq!(actual, expected);
```

This catches unintended behavior changes anywhere in the tick pipeline. See [Testing Your Simulation](testing.md) for more patterns.

### Research comparisons

To compare dispatch strategies fairly, use identical seeded traffic across runs:

```rust,no_run
# use elevator_core::prelude::*;
# use elevator_core::config::ElevatorConfig;
# use elevator_core::stop::StopId;
# use elevator_core::dispatch::scan::ScanDispatch;
# use elevator_core::dispatch::etd::EtdDispatch;
# fn build_sim(dispatch: impl DispatchStrategy + 'static) -> Simulation {
#   SimulationBuilder::new()
#       .stop(StopId(0), "Ground", 0.0)
#       .stop(StopId(1), "Top", 10.0)
#       .elevator(ElevatorConfig::default())
#       .dispatch(dispatch)
#       .build()
#       .unwrap()
# }
# fn run_with(sim: &mut Simulation) {}
let mut scan_sim = build_sim(ScanDispatch::new());
let mut etd_sim  = build_sim(EtdDispatch::new());
run_with(&mut scan_sim);  // same seed, same traffic source construction
run_with(&mut etd_sim);
// Compare metrics side-by-side.
```

Build both simulations from the same config and feed them the same seeded `TrafficSource`. After running for the same number of ticks, compare `sim.metrics()` to see which strategy performs better on wait time, throughput, or any other metric.

## Next steps

- [Testing Your Simulation](testing.md) -- snapshot round-trips, deterministic replay tests, and scenario scripting.
- [Performance](performance.md) -- scaling guidance and benchmark interpretation.
- [Traffic Generation](traffic-generation.md) -- seeded traffic sources for reproducible experiments.
