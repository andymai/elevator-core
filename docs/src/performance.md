# Performance

This chapter covers complexity, memory, and practical scaling guidance. The core is designed to handle tens of thousands of riders per tick on a single thread, with per-tick cost dominated by the dispatch strategy you choose.

## Complexity overview

Let `E` = elevators, `R` = riders, `S` = stops. Per `sim.step()`:

| Phase | Cost | Notes |
|---|---|---|
| Advance transient | O(R) worst-case, O(transitioning riders) typical | Only touches riders in `Boarding`/`Exiting`. |
| Dispatch (scoring) | O(E · S) per strategy | Cost-matrix build: one `rank` call per `(car, stop)` pair. ETD scales further with aboard riders. |
| Dispatch (assignment) | O(max(E, S)³) | Hungarian / Kuhn-Munkres matching over the cost matrix. |
| Reposition | O(E · S) | Only runs if configured. |
| Movement | O(E) | Pure arithmetic per elevator. |
| Doors | O(E) | Door FSM per elevator. |
| Loading | O(boarding + exiting at each open door) | Uses the rider index for per-stop queues. |
| Metrics | O(events this tick) | Linear in the event count. |

Population queries (`residents_at`, `waiting_at`, `abandoned_at`) are **O(1)** via the rider index, so UIs and hooks can poll them every tick without penalty.

## Memory

Rough per-entity memory (native `x86_64`, with default components):

| Entity | Bytes (approx.) |
|---|---|
| Stop | ~120 |
| Elevator | ~200 |
| Rider (with `Route` and `Patience`) | ~160 |

Add your own extension components on top. A 10k-rider simulation with a dozen stops and a handful of elevators fits comfortably under 5 MB of live state.

The event buffer grows until `drain_events()` is called -- see [Events and Metrics -- Draining events](events-metrics.md#draining-events).

## Benchmarks

The crate ships a benchmark suite (Criterion) in `crates/elevator-core/benches/`:

| Bench | Measures |
|---|---|
| `sim_bench` | End-to-end `step()` across representative scenarios |
| `scaling_bench` | Throughput vs. rider count |
| `dispatch_bench` | Per-strategy cost at a fixed rider load |
| `multi_line_bench` | Multi-group, multi-line buildings |
| `query_bench` | Population and lookup queries |

Run with:

```bash
cargo bench -p elevator-core
```

Results go to `target/criterion/` with HTML reports. A nightly GitHub
Actions job (`.github/workflows/bench-nightly.yml`) reruns the full
suite daily, caches a baseline, and opens an issue when Criterion
flags a significant regression. There is no PR gate -- bench noise on
shared runners tends to swamp a strict per-PR check.

### Current baselines

Measured on a 32-core Linux x86_64 workstation (Rust stable, release
profile, Criterion defaults: 3 s warmup, 5 s measurement). Numbers are
the Criterion median unless noted. Shared-runner numbers will be
noisier; treat these as orders of magnitude, not tight SLAs.

#### Primitives

| Item | Time |
|---|---|
| `tick_movement` (single call) | ~1.3 ns |
| `sim_bench / dispatch / 3e_10s` | ~4.0 us |
| `sim_bench / dispatch / 10e_50s` | ~12 us |

#### Full tick throughput (`scaling_bench`)

| Scenario | Time per run | Per tick |
|---|---|---|
| 50 elevators, 200 stops, 2 000 riders, 100 ticks | ~14 ms | **~143 us/tick** |
| 500 elevators, 5 000 stops, 50 000 riders, 10 ticks | ~520 ms | ~52 ms/tick |
| 10 000-rider spawn pressure test | ~4.9 ms | -- |

The realistic row is the one most consumers should care about: a
medium office tower with 2 000 concurrent riders runs the full 8-phase
tick in well under a millisecond on a single core.

#### Dispatch strategy comparison (`dispatch_bench`)

Per `step()` cost at three scales, holding everything else constant:

| Scale | SCAN | LOOK | NearestCar | ETD |
|---|---:|---:|---:|---:|
| 5e, 10s | 61 us | 67 us | 63 us | 66 us |
| 20e, 50s | 436 us | 395 us | 423 us | 413 us |
| 50e, 200s | 2.18 ms | 2.00 ms | 2.04 ms | 1.96 ms |

The four built-in strategies land within ~15 % of each other at every
scale. ETD is competitive despite its richer cost model because the
other phases dominate wall-clock time. Pick the strategy that fits
your dispatch *behavior* needs; they're all fast enough.

#### Query surface (`query_bench`)

O(n) over entity population, as the API docs promise:

| Query | 100 | 1 000 | 10 000 |
|---|---:|---:|---:|
| `query<Rider>` | 13 us | 60 us | 744 us |
| `query_tuple<&Rider, &Patience>` | 12 us | 52 us | 859 us |
| `query_elevators` (10/50/200) | 4 us | 5 us | 13 us |

Population queries on `RiderIndex` (`residents_at` / `waiting_at` /
`abandoned_at`) are O(1) and don't appear here -- they run in tens of
nanoseconds.

#### Multi-group topology (`multi_line_bench`)

| Scenario | Time |
|---|---|
| `multi_3g_2l_5e_20s / step()` | ~920 us |
| `cross_group_routing / 10 groups` | ~330 us |
| `topology_queries / reachable_stops_from` | ~177 us |
| `topology_queries / shortest_route` | ~161 us |
| `dynamic_topology / add_line` | ~2.5 us |
| `dynamic_topology / topology_rebuild` | ~21 us |

Runtime topology mutations (`add_line`, `remove_line`, `add_stop_to_line`)
are single-digit microseconds because the graph is rebuilt lazily on
next query, not eagerly on every mutation.

Use these as a baseline when writing custom dispatch strategies -- if
your strategy's `dispatch_bench` time is 10x the ETD baseline, expect
a 10x slowdown in loaded simulations.

## Scaling checklist

For simulations above ~10k concurrent riders or above ~50 elevators:

1. **Pick the cheapest dispatch strategy that meets your needs.** `NearestCarDispatch` is usually a better default than ETD at scale.
2. **Split into groups.** Each group dispatches independently; two groups of 20 elevators each is cheaper than one group of 40.
3. **Drain events every tick** (or redirect into a bounded ring buffer) to keep memory flat.
4. **Avoid heavy work in hooks.** A hook that iterates all riders every tick is O(R) on top of the dispatch cost -- prefer extension-attached flags you can toggle on-event.
5. **Profile before optimizing.** The Criterion benches make it straightforward to identify the hot phase -- dispatch dominates far more often than movement or doors.

## What we do not provide

- **Parallelism.** The tick loop is single-threaded by design (determinism > throughput). Run multiple sims in parallel across threads if you need more aggregate work.
- **GPU acceleration.** Movement and dispatch are scalar -- no SIMD or GPU backends.
- **Persistent indexes beyond per-stop population.** If you need "all riders with extension X", iterate and filter.

## Next steps

- [Bevy Integration](bevy-integration.md) -- a visual wrapper for rapid prototyping and debugging.
- [Snapshots and Determinism](snapshots-determinism.md) -- save and restore simulation state for replay and testing.
- [Writing a Custom Dispatch](custom-dispatch.md) -- build your own strategy and benchmark it against the baselines above.
