# Testing Your Simulation

elevator-core's deterministic tick loop makes it straightforward to write reliable, reproducible tests. This chapter covers the testing patterns used in the library itself and shows how to apply them to your own game code.

## Deterministic replay

The simulation is deterministic: two identical scenarios with the same API call sequence produce byte-identical snapshots and event streams. This means you can test behavior by running a scenario twice and asserting the outputs match.

The key ingredients for a replay test:

1. Build the simulation from a fixed config (no randomness in setup).
2. Spawn riders at hard-coded ticks (avoid `PoissonSource` -- it uses a thread-local RNG).
3. Step for a fixed number of ticks and collect events.
4. Run the same scenario again and compare.

```rust,no_run
use elevator_core::prelude::*;
use elevator_core::config::ElevatorConfig;
use elevator_core::dispatch::etd::EtdDispatch;

/// A rider spawn scheduled at a specific tick.
struct ScheduledSpawn {
    tick: u64,
    origin: StopId,
    destination: StopId,
    weight: f64,
}

fn car_config(id: u32, name: &str) -> ElevatorConfig {
    ElevatorConfig {
        id,
        name: name.into(),
        starting_stop: StopId(0),
        ..Default::default()
    }
}

fn run_scenario(spawns: &[ScheduledSpawn], total_ticks: u64) -> (Vec<Event>, Metrics) {
    let mut sim = SimulationBuilder::new()
        .stop(StopId(0), "Ground", 0.0)
        .stop(StopId(1), "Mid", 6.0)
        .stop(StopId(2), "Top", 18.0)
        .elevators(vec![car_config(0, "East"), car_config(1, "West")])
        .dispatch(EtdDispatch::new())
        .build()
        .unwrap();

    let mut events = Vec::new();
    for tick in 0..total_ticks {
        for spawn in spawns.iter().filter(|s| s.tick == tick) {
            sim.spawn_rider(spawn.origin, spawn.destination, spawn.weight).unwrap();
        }
        sim.step();
        events.extend(sim.drain_events());
    }
    (events, sim.metrics().clone())
}

#[test]
fn replay_is_deterministic() {
    let spawns: Vec<ScheduledSpawn> = vec![/* fixed schedule */];
    let (events_a, metrics_a) = run_scenario(&spawns, 5_000);
    let (events_b, metrics_b) = run_scenario(&spawns, 5_000);

    assert_eq!(events_a.len(), events_b.len());
    for (a, b) in events_a.iter().zip(events_b.iter()) {
        assert_eq!(a, b);
    }
    assert_eq!(metrics_a.total_delivered(), metrics_b.total_delivered());
}
```

A regression that introduces `HashMap` iteration into a code path, or any other nondeterministic ordering, will cause this test to fail.

## Snapshot roundtrip testing

Save a snapshot, serialize it, deserialize it, restore, and verify the state matches:

```rust,no_run
# use elevator_core::prelude::*;
# use elevator_core::snapshot::WorldSnapshot;
#[test]
fn snapshot_roundtrip_preserves_state() {
    let mut sim = SimulationBuilder::demo().build().unwrap();

    for _ in 0..3 {
        sim.spawn_rider(StopId(0), StopId(1), 70.0).unwrap();
    }
    for _ in 0..100 {
        sim.step();
    }

    let original_tick = sim.current_tick();
    let original_delivered = sim.metrics().total_delivered();

    // Snapshot, serialize, deserialize, restore.
    let snap = sim.snapshot();
    let ron_str = ron::to_string(&snap).unwrap();
    let snap2: WorldSnapshot = ron::from_str(&ron_str).unwrap();
    let restored = snap2.restore(None).unwrap();

    assert_eq!(restored.current_tick(), original_tick);
    assert_eq!(restored.metrics().total_delivered(), original_delivered);

    let orig_riders = sim.world().iter_riders().count();
    let rest_riders = restored.world().iter_riders().count();
    assert_eq!(orig_riders, rest_riders);
}
```

This catches serialization bugs, entity ID remapping errors, and missing component roundtrips. If you use custom extensions, register them before restoring and call `sim.load_extensions()`.

For elevators in non-trivial phases (e.g., `Repositioning`), verify that the phase variant and its inner entity reference survived the remap:

```rust,no_run
# use elevator_core::prelude::*;
# fn run(restored: &Simulation, elev_id: EntityId) {
let restored_phase = restored.world().elevator(elev_id).unwrap().phase();
match restored_phase {
    ElevatorPhase::Repositioning(target) => {
        assert!(restored.world().stop(target).is_some());
    }
    other => panic!("expected Repositioning, got {other:?}"),
}
# }
```

## Scenario scripting

The `scenario` module provides a structured way to define timed rider spawns with pass/fail conditions. A `Scenario` bundles a `SimConfig`, a list of `TimedSpawn` events, evaluation conditions, and a tick limit:

```rust,no_run
use elevator_core::prelude::*;
use elevator_core::dispatch::scan::ScanDispatch;
use elevator_core::scenario::{Scenario, TimedSpawn, Condition, ScenarioRunner};

fn run(my_sim_config: SimConfig) {
    let scenario = Scenario {
        name: "Morning rush".into(),
        config: my_sim_config,
        spawns: vec![
            TimedSpawn { tick: 0, origin: StopId(0), destination: StopId(2), weight: 72.0 },
            TimedSpawn { tick: 15, origin: StopId(0), destination: StopId(1), weight: 85.0 },
            TimedSpawn { tick: 60, origin: StopId(2), destination: StopId(0), weight: 68.0 },
        ],
        conditions: vec![
            Condition::AvgWaitBelow(100.0),
            Condition::MaxWaitBelow(300),
            Condition::AbandonmentRateBelow(0.05),
            Condition::AllDeliveredByTick(5000),
        ],
        max_ticks: 10_000,
    };

    let mut runner = ScenarioRunner::new(scenario, ScanDispatch::new()).unwrap();
    let result = runner.run_to_completion();

    assert!(result.passed, "scenario failed: {:?}", result.conditions);
}
```

Available conditions:

| Condition | Passes when |
|---|---|
| `AvgWaitBelow(f64)` | Average wait time is below the threshold (ticks) |
| `MaxWaitBelow(u64)` | Maximum wait time is below the threshold (ticks) |
| `ThroughputAbove(u64)` | Throughput exceeds the threshold (riders per window) |
| `AllDeliveredByTick(u64)` | All spawned riders reach a terminal state by this tick |
| `AbandonmentRateBelow(f64)` | Abandonment rate is below the threshold (0.0 - 1.0) |

`ScenarioRunner::run_to_completion()` steps until all riders are delivered/abandoned or `max_ticks` is reached. You can also call `runner.tick()` manually for finer control. Check `runner.skipped_spawns()` if replay fidelity matters -- spawn attempts that fail (e.g., referencing removed stops) are counted separately.

Scenarios are `Serialize + Deserialize`, so you can store them as RON files and load them in CI.

## Property-based testing with proptest

The `proptest` crate (a dev dependency of elevator-core) is used for fuzz-testing simulation invariants. The library's own tests use it to verify physics and convergence properties:

```rust,no_run
use elevator_core::movement::tick_movement;
use proptest::prelude::*;

proptest! {
    #[test]
    fn tick_movement_never_overshoots(
        position in -1000.0..1000.0_f64,
        target in -1000.0..1000.0_f64,
        max_speed in 0.1..100.0_f64,
        acceleration in 0.01..50.0_f64,
        deceleration in 0.01..50.0_f64,
        dt in 0.001..1.0_f64,
        initial_velocity in 0.0..100.0_f64,
    ) {
        prop_assume!((target - position).abs() > 1e-6);

        let sign = (target - position).signum();
        let vel = initial_velocity.min(max_speed) * sign;
        let result = tick_movement(position, vel, target, max_speed, acceleration, deceleration, dt);

        // Velocity must never exceed max_speed.
        prop_assert!(result.velocity.abs() <= max_speed + 1e-6);

        // If not arrived, position must be between start and target.
        if !result.arrived {
            let min = position.min(target);
            let max = position.max(target);
            prop_assert!(result.position >= min - 1e-9 && result.position <= max + 1e-9);
        }
    }
}
```

Good candidates for property-based tests in game code:

- **No rider is ever lost:** total spawned = delivered + abandoned + still-in-sim.
- **Capacity is never exceeded:** no elevator's `current_load` exceeds its `weight_capacity`.
- **Convergence:** for any (position, target) pair with valid physics params, the elevator arrives within a bounded number of ticks.

## The benchmark suite

The library ships five criterion benchmarks that measure hot-path performance:

| Benchmark | What it measures |
|---|---|
| `sim_bench` | Full simulation tick throughput at various scales |
| `dispatch_bench` | Dispatch strategy comparison (Scan, Look, NearestCar, ETD, Destination) |
| `scaling_bench` | How throughput degrades as stop/elevator count grows |
| `query_bench` | Query iteration performance with filters and extensions |
| `multi_line_bench` | Multi-line/multi-group dispatch overhead |

Run them with:

```bash
cargo bench -p elevator-core
```

Or run a specific benchmark:

```bash
cargo bench -p elevator-core --bench sim_bench
```

Criterion generates HTML reports in `target/criterion/` with statistical analysis and comparison against previous runs. These are useful for catching performance regressions when changing dispatch strategies or adding new phases.

## Best practices

**Seed your RNG for reproducible traffic.** The built-in `PoissonSource` uses an OS-seeded RNG, so it produces different output each run. For tests, write a custom `TrafficSource` that owns a `StdRng::seed_from_u64(seed)`. See [Traffic Generation -- Determinism and seeding](traffic-generation.md#determinism-and-seeding).

**Assert that your fixture actually exercises the sim.** A deterministic replay test is vacuously correct if no riders ever board. Add sanity checks:

```rust,no_run
# use elevator_core::prelude::*;
# fn run(events: Vec<Event>, metrics: &Metrics, expected_minimum: u64) {
assert!(events.iter().any(|e| matches!(e, Event::RiderBoarded { .. })));
assert!(metrics.total_delivered() >= expected_minimum);
# }
```

**Use `SimulationBuilder::demo()` for quick integration tests.** It creates a minimal two-stop, one-elevator setup that is enough to test most game logic without a full config.

**Compare f64 accumulators with `.to_bits()` for determinism checks.** Exact bit equality is the right check because both runs execute the same additions in the same order. Using approximate comparison would mask subtle ordering bugs.

## Next steps

- [Snapshots and Determinism](snapshots-determinism.md) -- the determinism guarantees that make these testing patterns possible.
- [Traffic Generation](traffic-generation.md) -- seeded traffic sources for reproducible test scenarios.
- [Performance](performance.md) -- interpreting benchmark results and scaling guidance.
