# Performance

This chapter covers complexity, memory, and practical scaling guidance. The core is designed to handle tens of thousands of riders per tick on a single thread, with per-tick cost dominated by the dispatch strategy you choose.

## Complexity overview

Let `E` = elevators, `R` = riders, `S` = stops. Per `sim.step()`:

| Phase | Cost | Notes |
|---|---|---|
| Advance transient | O(R) worst-case, O(transitioning riders) typical | Only touches riders in `Boarding`/`Exiting`. |
| Dispatch (SCAN/LOOK) | O(E · S) | Constant work per elevator per stop in the group. |
| Dispatch (NearestCar) | O(E · S) | Uses `decide_all` to coordinate. |
| Dispatch (ETD) | O(E · S · R_waiting) | Estimates per-rider delays; heaviest built-in. |
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

The event buffer grows until `drain_events()` is called — see [Metrics and Events → Buffer size and memory](metrics-and-events.md#buffer-size-and-memory).

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

Results go to `target/criterion/` with HTML reports. Use these as a baseline when writing custom dispatch strategies — if your strategy's `dispatch_bench` time is 10× the ETD baseline, expect a 10× slowdown in loaded simulations.

## Scaling checklist

For simulations above ~10k concurrent riders or above ~50 elevators:

1. **Pick the cheapest dispatch strategy that meets your needs.** `NearestCarDispatch` is usually a better default than ETD at scale.
2. **Split into groups.** Each group dispatches independently; two groups of 20 elevators each is cheaper than one group of 40.
3. **Drain events every tick** (or redirect into a bounded ring buffer) to keep memory flat.
4. **Avoid heavy work in hooks.** A hook that iterates all riders every tick is O(R) on top of the dispatch cost — prefer extension-attached flags you can toggle on-event.
5. **Profile before optimizing.** The Criterion benches make it straightforward to identify the hot phase — dispatch dominates far more often than movement or doors.

## What we do not provide

- **Parallelism.** The tick loop is single-threaded by design (determinism > throughput). Run multiple sims in parallel across threads if you need more aggregate work.
- **GPU acceleration.** Movement and dispatch are scalar — no SIMD or GPU backends.
- **Persistent indexes beyond per-stop population.** If you need "all riders with extension X", iterate and filter.

## Next steps

Head to [Bevy Integration](bevy-integration.md) for a visual wrapper, or [API Reference](api-reference.md) for the full API surface.
