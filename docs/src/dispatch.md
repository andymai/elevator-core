# Dispatch Strategies

Dispatch is the brain of an elevator system. Each tick, the dispatch strategy looks at which stops have waiting riders and which elevators are idle, then decides where to send each elevator. This chapter covers the four built-in strategies, how to swap between them, and how to write your own.

## How dispatch works

During the Dispatch phase of each tick, the simulation:

1. Builds a `DispatchManifest` containing per-stop demand (waiting riders, their weights, their wait times) and per-destination riding riders.
2. Collects all idle elevators in each group along with their current positions.
3. Calls the group's `DispatchStrategy` with this information.
4. Applies the returned `DispatchDecision` for each elevator -- either `GoToStop(entity_id)` to assign a target, or `Idle` to do nothing.

Direction indicators (`going_up`/`going_down`) are derived automatically from each dispatch decision: `GoToStop` sets them from target vs. current position, `Idle` resets them to both-lit. This means SCAN, LOOK, NearestCar, and ETD -- along with any custom strategy you write -- drive the indicators for free, and downstream boarding gets direction-awareness with no extra work from the strategy. See [Direction indicators](core-concepts.md#direction-indicators) for details.

## Imperative dispatch (destination queue)

If you just want to tell an elevator where to go — no decision-making strategy required — every elevator carries a `DestinationQueue` (a FIFO of stop `EntityId`s) that you can push to directly:

```rust,no_run
# use elevator_core::prelude::*;
# let mut sim: Simulation = todo!();
# let elev: EntityId = todo!();
# let stop_a: EntityId = todo!();
# let stop_b: EntityId = todo!();
sim.push_destination(elev, stop_a).unwrap();        // enqueue at back
sim.push_destination_front(elev, stop_b).unwrap();  // jump ahead of the queue
sim.clear_destinations(elev).unwrap();              // cancel pending work
let queue: &[EntityId] = sim.destination_queue(elev).unwrap();
```

Adjacent duplicates are suppressed: pushing the same stop twice in a row is a no-op (and emits a single `DestinationQueued` event, not two).

Between the Dispatch and Movement phases, an `AdvanceQueue` phase reconciles each elevator's phase/target with the front of its queue. Idle elevators with a non-empty queue begin moving toward the front entry; elevators mid-flight whose queue front has changed (because you called `push_destination_front`) are redirected. Movement pops the front on arrival.

You can mix the two modes freely: dispatch keeps the queue in sync with its own decisions, so games can observe the queue for visualization and intervene only when needed.

## Built-in strategies

| Strategy | Algorithm | Best for | Trade-off |
|---|---|---|---|
| `ScanDispatch` | Sweep end-to-end, reversing at shaft extremes | Single elevator, uniform traffic | Simple and fair, but wastes time traveling past the last request |
| `LookDispatch` | Like SCAN, but reverses at the last request in the current direction | Single elevator, sparse traffic | More efficient than SCAN when requests cluster, slightly less predictable |
| `NearestCarDispatch` | Assign each call to the closest idle elevator | Multi-elevator groups | Low average wait, but can cause bunching when elevators cluster |
| `EtdDispatch` | Minimize estimated time to destination across all riders | Multi-elevator groups with mixed traffic | Best average performance, higher per-tick computation |

### Choosing a strategy

Use this rough decision guide:

```text
                            +-- 1 elevator? ------------------> ScanDispatch (or LookDispatch for bursty demand)
                            |
Does the group have ...  ---+-- 2+ elevators, simple ---------> NearestCarDispatch
                            |
                            +-- 2+ elevators, mixed traffic --> EtdDispatch
                                with SLA-sensitive riders
```

Concrete guidance:

- **ScanDispatch** — Start here. Deterministic, fair, easy to reason about. Good baseline for benchmarking custom strategies.
- **LookDispatch** — Swap in when SCAN wastes obvious time at the extremes (sparse/clustered requests).
- **NearestCarDispatch** — The default "obvious" multi-car policy. Watch for bunching under heavy load.
- **EtdDispatch** — Best average wait/ride time in most realistic mixes, at a higher per-tick cost. Use the `delay_weight` to favor existing riders vs. new calls.

For everything else (priority, weight, fairness, accessibility) write a custom strategy.

## Swapping strategies on the builder

The builder defaults to `ScanDispatch`. To use a different strategy, call `.dispatch()`:

```rust,no_run
use elevator_core::prelude::*;
use elevator_core::config::ElevatorConfig;
use elevator_core::stop::StopId;
use elevator_core::dispatch::look::LookDispatch;

fn main() -> Result<(), SimError> {
    let sim = SimulationBuilder::new()
        .stop(StopId(0), "Ground", 0.0)
        .stop(StopId(1), "Top", 10.0)
        .elevator(ElevatorConfig::default())
        .dispatch(LookDispatch::new())
        .build()?;
    Ok(())
}
```

All four built-in strategies are available in their respective modules:

```rust,no_run
use elevator_core::dispatch::scan::ScanDispatch;
use elevator_core::dispatch::look::LookDispatch;
use elevator_core::dispatch::nearest_car::NearestCarDispatch;
use elevator_core::dispatch::etd::EtdDispatch;
```

The ETD strategy accepts an optional delay weight that controls how much it penalizes delays to existing riders when assigning a new call:

```rust,no_run
use elevator_core::dispatch::etd::EtdDispatch;

// Default: delay_weight = 1.0
let etd = EtdDispatch::new();

// Prioritize existing riders more heavily
let etd_conservative = EtdDispatch::with_delay_weight(1.5);
```

## Multi-group dispatch

Large buildings often have separate elevator banks -- a low-rise group serving floors 1-20 and a high-rise group serving floors 20-40, for example. Each group can have its own dispatch strategy.

Use `.dispatch_for_group()` on the builder:

```rust,no_run
use elevator_core::prelude::*;
use elevator_core::config::ElevatorConfig;
use elevator_core::stop::StopId;
use elevator_core::dispatch::scan::ScanDispatch;
use elevator_core::dispatch::etd::EtdDispatch;

fn main() -> Result<(), SimError> {
    let sim = SimulationBuilder::new()
        .stop(StopId(0), "Ground", 0.0)
        .stop(StopId(1), "Top", 10.0)
        .elevator(ElevatorConfig::default())
        .dispatch_for_group(GroupId(0), ScanDispatch::new())
        .dispatch_for_group(GroupId(1), EtdDispatch::new())
        .build()?;
    Ok(())
}
```

## Writing a custom strategy

Strategies express preferences as costs on `(car, stop)` pairs; the dispatch system runs an optimal bipartite matching across the whole group, so no two cars can be sent to the same hall call. See [Writing a Custom Dispatch Strategy](custom-dispatch.md) for the full tutorial.

```rust,no_run
use elevator_core::prelude::*;
use elevator_core::world::World;

/// Prefer the highest demanded stop — cost decreases with position.
struct HighestFirstDispatch;

impl DispatchStrategy for HighestFirstDispatch {
    fn rank(
        &mut self,
        _car: EntityId,
        _car_position: f64,
        _stop: EntityId,
        stop_position: f64,
        _group: &ElevatorGroup,
        _manifest: &DispatchManifest,
        _world: &World,
    ) -> Option<f64> {
        // Use position as a negative score: higher stops are cheaper.
        // Clamp to keep costs non-negative for the Hungarian solver.
        Some((1000.0 - stop_position).max(0.0))
    }
}
```

Then plug it into the builder:

```rust,no_run
# use elevator_core::prelude::*;
# use elevator_core::config::ElevatorConfig;
# use elevator_core::stop::StopId;
# use elevator_core::world::World;
# struct HighestFirstDispatch;
# impl DispatchStrategy for HighestFirstDispatch {
#     fn rank(&mut self, _: EntityId, _: f64, _: EntityId, _: f64, _: &elevator_core::dispatch::ElevatorGroup, _: &DispatchManifest, _: &World) -> Option<f64> { Some(0.0) }
# }
fn main() -> Result<(), SimError> {
    let sim = SimulationBuilder::new()
        .stop(StopId(0), "Ground", 0.0)
        .stop(StopId(1), "Top", 10.0)
        .elevator(ElevatorConfig::default())
        .dispatch(HighestFirstDispatch)
        .build()?;
    Ok(())
}
```

### The `DispatchManifest`

Your strategy receives a `DispatchManifest` with these convenience methods:

| Method | Returns | Description |
|---|---|---|
| `waiting_count_at(stop)` | `usize` | Number of riders waiting at a stop |
| `total_weight_at(stop)` | `f64` | Total weight of riders waiting at a stop |
| `has_demand(stop)` | `bool` | Whether a stop has any demand (waiting or riding-to) |
| `riding_count_to(stop)` | `usize` | Number of riders aboard elevators heading to a stop |

For more advanced dispatch (priority-aware, weight-aware, VIP-first), you can iterate `manifest.waiting_at_stop` directly. Each entry contains a `Vec<RiderInfo>` with the rider's `id`, `destination`, `weight`, and `wait_ticks`.

### Opportunistic stops: braking helpers

For strategies that want to consider stopping at a passing floor only if the elevator can brake in time, `sim.braking_distance(elev)` and `sim.future_stop_position(elev)` expose the kinematic answer directly — no need to reimplement the trapezoidal physics. The free function `elevator_core::movement::braking_distance(velocity, deceleration)` is also available for pure computation off a `Simulation`.

### Group-aware coordination is automatic

Coordination across cars is a library invariant: the dispatch system collects every strategy's `(car, stop)` scores into a cost matrix and solves it with the Hungarian / Kuhn–Munkres algorithm. As long as your strategy's `rank` reflects the cost you want to minimize, you can't accidentally send two cars to the same hall call.

Strategies with per-car state that depends on whole-group demand (for example the sweep direction used by SCAN/LOOK) set that state in `prepare_car`, which runs once per car before any `rank` calls for that car.

## Next steps

Now that you know how dispatch works, head to [Extensions and Hooks](extensions-and-hooks.md) to learn how to attach custom data to entities and inject logic into the tick loop.
