# Dispatch Strategies

Dispatch is the brain of an elevator system -- it decides which elevator goes where. This chapter covers imperative dispatch, the five built-in strategies, and how to choose between them.

## How dispatch works

Each tick, the Dispatch phase runs four steps:

1. **Build manifest.** The simulation collects per-stop demand (waiting riders, weights, wait times) and per-destination riding riders into a `DispatchManifest`.
2. **Collect idle elevators.** Each group gathers its idle/stopped elevators and their current positions.
3. **Rank and match.** The group's `DispatchStrategy` scores every `(car, stop)` pair via `rank()`. The dispatch system feeds all scores into a Hungarian (Kuhn-Munkres) solver to produce the globally optimal assignment -- one car per hall call, automatically.
4. **Apply decisions.** Each elevator receives a `DispatchDecision`: either `GoToStop(entity_id)` to begin moving, or `Idle` to stay put.

Direction indicators (`going_up`/`going_down`) are set automatically from dispatch decisions, so downstream boarding gets direction-awareness with no extra work from the strategy. See [Elevators](elevators.md) for details.

## Imperative dispatch with DestinationQueue

If you want to tell an elevator exactly where to go -- bypassing strategy logic entirely -- push directly to its `DestinationQueue`:

```rust,no_run
# use elevator_core::prelude::*;
# let mut sim: Simulation = todo!();
# let elev: ElevatorId = todo!();
# let stop_a: EntityId = todo!();
# let stop_b: EntityId = todo!();
sim.push_destination(elev, stop_a).unwrap();        // enqueue at back
sim.push_destination_front(elev, stop_b).unwrap();  // jump to front of queue
sim.clear_destinations(elev).unwrap();              // cancel all pending stops
let queue: &[EntityId] = sim.destination_queue(elev).unwrap();
```

Adjacent duplicates are suppressed: pushing the same stop twice in a row is a no-op and emits a single `DestinationQueued` event.

Between the Dispatch and Movement phases, the **AdvanceQueue** phase reconciles each elevator's phase/target with the front of its queue. Idle elevators with a non-empty queue begin moving; elevators mid-flight whose queue front changed (because you called `push_destination_front`) are redirected. Movement pops the front on arrival.

You can mix imperative and strategy-driven dispatch freely. Dispatch keeps the queue in sync with its own decisions, so games can observe the queue for visualization and intervene only when needed.

## Built-in strategies

| Strategy | Algorithm | Best for | Trade-off |
|---|---|---|---|
| `ScanDispatch` | Sweep end-to-end, reversing at shaft extremes | Single elevator, uniform traffic | Simple and fair; wastes time past the last request |
| `LookDispatch` | Like SCAN, but reverses at the last request in the current direction | Single elevator, sparse traffic | More efficient than SCAN when requests cluster; slightly less predictable |
| `NearestCarDispatch` | Assign each call to the closest idle elevator | Multi-elevator groups | Low average wait; can cause bunching when elevators cluster |
| `EtdDispatch` | Minimize estimated time to destination across all riders | Multi-elevator groups with mixed traffic | Best average performance; higher per-tick computation |
| `DestinationDispatch` | Sticky rider-to-car assignment via lobby kiosk input | Destination-dispatch systems (DCS) | Requires `HallCallMode::Destination`; best with lobby kiosks |

### Choosing a strategy

```text
                        +-- 1 elevator? -----------------> ScanDispatch
                        |                                   (or LookDispatch for bursty demand)
Does the group have  ---+-- 2+ elevators, simple ---------> NearestCarDispatch
                        |
                        +-- 2+ elevators, mixed traffic --> EtdDispatch
                        |   with SLA-sensitive riders
                        +-- DCS / lobby kiosks -----------> DestinationDispatch
```

Concrete guidance:

- **ScanDispatch** -- Start here. Deterministic, fair, easy to reason about. Good baseline for benchmarking custom strategies.
- **LookDispatch** -- Swap in when SCAN wastes obvious time at the extremes (sparse or clustered requests).
- **NearestCarDispatch** -- The default multi-car policy. Watch for bunching under heavy load.
- **EtdDispatch** -- Best average wait/ride time in most realistic mixes, at a higher per-tick cost. Use `delay_weight` to balance existing riders vs. new calls.

For priority, weight, fairness, or accessibility-aware dispatch, write a custom strategy -- see [Writing a Custom Dispatch Strategy](custom-dispatch.md).

## Swapping strategies on the builder

The builder defaults to `ScanDispatch`. Call `.dispatch()` to use a different strategy:

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

All five strategies live in their respective modules:

```rust,no_run
use elevator_core::dispatch::scan::ScanDispatch;
use elevator_core::dispatch::look::LookDispatch;
use elevator_core::dispatch::nearest_car::NearestCarDispatch;
use elevator_core::dispatch::etd::EtdDispatch;
use elevator_core::dispatch::destination::DestinationDispatch;
```

The ETD strategy accepts a delay weight that controls how much it penalizes delays to existing riders when assigning a new call:

```rust,no_run
use elevator_core::dispatch::etd::EtdDispatch;

let etd = EtdDispatch::new();                         // default delay_weight = 1.0
let etd_conservative = EtdDispatch::with_delay_weight(1.5);  // favor existing riders
```

## Multi-group dispatch

Large buildings often have separate elevator banks -- a low-rise group serving floors 1-20 and a high-rise group serving floors 20-40. Each group can use its own dispatch strategy.

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

## Reposition strategies

After dispatch, idle elevators with no pending demand can be repositioned for better coverage. Configure a `RepositionStrategy` on the builder:

```rust,ignore
use elevator_core::prelude::*;
use elevator_core::dispatch::BuiltinReposition;

let sim = SimulationBuilder::new()
    // ... stops and elevators ...
    .reposition(SpreadEvenly, BuiltinReposition::SpreadEvenly)
    .build()?;
```

The second argument is a `BuiltinReposition` identifier used for snapshot serialization. Pass the variant that matches your strategy so snapshots can restore it correctly.

Four built-in strategies are available:

| Strategy | Behavior |
|---|---|
| `SpreadEvenly` | Distribute idle cars evenly across stops |
| `ReturnToLobby` | Send idle cars to a configured home stop |
| `DemandWeighted` | Position near stops with historically high demand |
| `NearestIdle` | Keep idle cars where they are (no-op) |

Repositioning is optional. Groups without a registered strategy skip the reposition phase entirely.

## DispatchManifest

Your strategy (or game code observing dispatch) receives a `DispatchManifest` with these convenience methods:

| Method | Returns | Description |
|---|---|---|
| `waiting_count_at(stop)` | `usize` | Number of riders waiting at a stop |
| `total_weight_at(stop)` | `f64` | Total weight of riders waiting at a stop |
| `has_demand(stop)` | `bool` | Whether a stop has any demand (waiting or riding-to) |
| `riding_count_to(stop)` | `usize` | Number of riders aboard elevators heading to a stop |

For advanced dispatch (priority-aware, weight-aware, VIP-first), use `manifest.waiting_riders_at(stop)` to access per-stop rider lists, or `manifest.iter_waiting_stops()` to iterate all stops with waiting demand. Each entry provides a `&[RiderInfo]` with the rider's `id`, `destination`, `weight`, and `wait_ticks`.

## Next steps

- [Writing a Custom Dispatch Strategy](custom-dispatch.md) -- full tutorial on the `DispatchStrategy` trait
- [Rider Lifecycle](rider-lifecycle.md) -- understand the riders that dispatch is serving
- [Events and Metrics](events-metrics.md) -- observe dispatch decisions via `ElevatorAssigned` events
