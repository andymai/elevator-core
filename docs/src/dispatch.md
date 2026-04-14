# Dispatch Strategies

Dispatch is the brain of an elevator system. Each tick, the dispatch strategy looks at which stops have waiting riders and which elevators are idle, then decides where to send each elevator. This chapter covers the four built-in strategies, how to swap between them, and how to write your own.

## How dispatch works

During the Dispatch phase of each tick, the simulation:

1. Builds a `DispatchManifest` containing per-stop demand (waiting riders, their weights, their wait times) and per-destination riding riders.
2. Collects all idle elevators in each group along with their current positions.
3. Calls the group's `DispatchStrategy` with this information.
4. Applies the returned `DispatchDecision` for each elevator -- either `GoToStop(entity_id)` to assign a target, or `Idle` to do nothing.

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
use elevator_core::dispatch::look::LookDispatch;

fn main() -> Result<(), SimError> {
    let sim = SimulationBuilder::new()
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
use elevator_core::dispatch::scan::ScanDispatch;
use elevator_core::dispatch::etd::EtdDispatch;

fn main() -> Result<(), SimError> {
    let sim = SimulationBuilder::new()
        .dispatch_for_group(GroupId(0), ScanDispatch::new())
        .dispatch_for_group(GroupId(1), EtdDispatch::new())
        .build()?;
    Ok(())
}
```

## Writing a custom strategy

To implement your own dispatch algorithm, implement the `DispatchStrategy` trait:

```rust,no_run
use elevator_core::prelude::*;
use elevator_core::world::World;

/// Always sends the elevator to the highest stop that has waiting riders.
struct HighestFirstDispatch;

impl DispatchStrategy for HighestFirstDispatch {
    fn decide(
        &mut self,
        elevator: EntityId,
        elevator_position: f64,
        group: &ElevatorGroup,
        manifest: &DispatchManifest,
        world: &World,
    ) -> DispatchDecision {
        // Find the highest stop (by position) with waiting riders.
        let mut best: Option<(EntityId, f64)> = None;

        for &stop_eid in group.stop_entities() {
            if manifest.waiting_count_at(stop_eid) == 0 {
                continue;
            }

            if let Some(stop) = world.stop(stop_eid) {
                match best {
                    Some((_, best_pos)) if stop.position() > best_pos => {
                        best = Some((stop_eid, stop.position()));
                    }
                    None => {
                        best = Some((stop_eid, stop.position()));
                    }
                    _ => {}
                }
            }
        }

        match best {
            Some((stop_eid, _)) => DispatchDecision::GoToStop(stop_eid),
            None => DispatchDecision::Idle,
        }
    }
}
```

Then plug it into the builder:

```rust,no_run
# use elevator_core::prelude::*;
# struct HighestFirstDispatch;
# impl DispatchStrategy for HighestFirstDispatch {
#     fn decide(&mut self, _: EntityId, _: f64, _: &elevator_core::dispatch::ElevatorGroup, _: &DispatchManifest, _: &elevator_core::world::World) -> DispatchDecision { DispatchDecision::Idle }
# }
fn main() -> Result<(), SimError> {
    let sim = SimulationBuilder::new()
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

### Group-aware dispatch with `decide_all`

The default `DispatchStrategy` trait calls `decide()` once per idle elevator. If your strategy needs to coordinate across all elevators in a group (to avoid sending two elevators to the same stop), override `decide_all()` instead:

```rust,no_run
# use elevator_core::prelude::*;
# use elevator_core::world::World;
# struct MyStrategy;
impl DispatchStrategy for MyStrategy {
    fn decide(
        &mut self,
        _elevator: EntityId,
        _pos: f64,
        _group: &ElevatorGroup,
        _manifest: &DispatchManifest,
        _world: &World,
    ) -> DispatchDecision {
        // Required by the trait. When decide_all is overridden, the
        // default trait impl calls decide_all instead of this method.
        DispatchDecision::Idle
    }

    fn decide_all(
        &mut self,
        elevators: &[(EntityId, f64)],
        group: &ElevatorGroup,
        manifest: &DispatchManifest,
        world: &World,
    ) -> Vec<(EntityId, DispatchDecision)> {
        // Your group-level coordination logic here.
        elevators
            .iter()
            .map(|(eid, _)| (*eid, DispatchDecision::Idle))
            .collect()
    }
}
```

Both `NearestCarDispatch` and `EtdDispatch` use this pattern internally to prevent duplicate assignments.

## Next steps

Now that you know how dispatch works, head to [Extensions and Hooks](extensions-and-hooks.md) to learn how to attach custom data to entities and inject logic into the tick loop.
