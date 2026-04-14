# Metrics and Events

Once your simulation is configured and running, you need to know what it is doing. Every significant moment -- a rider boarding, an elevator arriving, a door opening -- produces a typed event. The metrics system aggregates these events into summary statistics. Together, events and metrics give you full observability into what your simulation is doing and how well it is performing.

## The event system

### What events fire

Events are emitted during the tick phases. Here are the main categories:

**Elevator events:**

| Event | When it fires |
|---|---|
| `ElevatorDeparted { elevator, from_stop, tick }` | An elevator leaves a stop |
| `ElevatorArrived { elevator, at_stop, tick }` | An elevator arrives at a stop |
| `DoorOpened { elevator, tick }` | Doors finish opening |
| `DoorClosed { elevator, tick }` | Doors finish closing |
| `PassingFloor { elevator, stop, moving_up, tick }` | An elevator passes a stop without stopping |
| `ElevatorAssigned { elevator, stop, tick }` | Dispatch assigns an elevator to a stop |
| `ElevatorRepositioning { elevator, to_stop, tick }` | An idle elevator begins repositioning |
| `ElevatorRepositioned { elevator, at_stop, tick }` | An elevator completed repositioning |
| `ElevatorIdle { elevator, at_stop, tick }` | An elevator became idle |
| `CapacityChanged { elevator, current_load, capacity, tick }` | An elevator's load changed (after board or exit) |
| `DirectionIndicatorChanged { elevator, going_up, going_down, tick }` | An elevator's direction indicator lamps changed (set by dispatch) |

**Rider events:**

| Event | When it fires |
|---|---|
| `RiderSpawned { rider, origin, destination, tick }` | A new rider appears at a stop |
| `RiderBoarded { rider, elevator, tick }` | A rider enters an elevator |
| `RiderExited { rider, elevator, stop, tick }` | A rider exits at their destination |
| `RiderRejected { rider, elevator, reason, context, tick }` | A rider was refused boarding (over capacity) |
| `RiderAbandoned { rider, stop, tick }` | A rider gave up waiting |
| `RiderEjected { rider, elevator, stop, tick }` | A rider was ejected (elevator disabled) |
| `RiderSettled { rider, stop, tick }` | A rider settled at a stop as a resident |
| `RiderDespawned { rider, tick }` | A rider was removed from the simulation |
| `RiderRerouted { rider, new_destination, tick }` | A rider was manually rerouted via `sim.reroute()` or `sim.reroute_rider()` |

**Topology events:**

| Event | When it fires |
|---|---|
| `StopAdded { stop, group, tick }` | A stop was added at runtime |
| `ElevatorAdded { elevator, group, tick }` | An elevator was added at runtime |
| `EntityDisabled { entity, tick }` | An entity was disabled |
| `EntityEnabled { entity, tick }` | An entity was re-enabled |
| `RouteInvalidated { rider, affected_stop, reason, tick }` | A rider's route was broken by a topology change |
| `LineAdded { line, group, tick }` | A line was added |
| `LineRemoved { line, group, tick }` | A line was removed |
| `LineReassigned { line, old_group, new_group, tick }` | A line was moved between groups |
| `ElevatorReassigned { elevator, old_line, new_line, tick }` | An elevator was moved between lines |

### Draining events

Events are buffered during each tick and made available via `sim.drain_events()`. This returns a `Vec<Event>` and clears the buffer:

```rust,no_run
# use elevator_core::prelude::*;
# fn run(sim: &mut Simulation) {
sim.step();

for event in sim.drain_events() {
    match event {
        Event::RiderBoarded { rider, elevator, tick } => {
            println!("[{tick}] {rider:?} boarded {elevator:?}");
        }
        Event::RiderExited { rider, stop, tick, .. } => {
            println!("[{tick}] {rider:?} arrived at {stop:?}");
        }
        Event::ElevatorArrived { elevator, at_stop, tick } => {
            println!("[{tick}] {elevator:?} arrived at {at_stop:?}");
        }
        _ => {}
    }
}
# }
```

You can call `drain_events()` after every tick, every N ticks, or only when you need to -- events accumulate until drained. The metrics system processes events independently each tick, so draining does not affect metric calculations.

### Event ordering guarantees

- **Within a tick:** events fire in tick-phase order (Advance Transient → Dispatch → Reposition → Movement → Doors → Loading → Metrics). Events from a later phase are always later in the drained vec than events from an earlier phase of the same tick.
- **Across ticks:** events from tick N are drained before events from tick N+1. Every event carries its `tick` field, so you can reconstruct a strict timeline even if you drain in batches.
- **Within a phase:** ordering between events of the same phase is stable but not part of the public contract — do not rely on, e.g., "elevator 0's `RiderBoarded` always precedes elevator 1's" across library versions.
- **Pair invariants:** `RiderBoarded` always precedes the matching `RiderExited` for the same rider; `DoorOpened` always precedes `DoorClosed` for the same elevator at a given stop.

### Buffer size and memory

`drain_events()` empties the internal buffer. If you never drain, the buffer grows unbounded — in long-running sims, drain at least periodically (every tick in most games, every N ticks in headless analyses). Each event is a small enum (tens of bytes); a 1M-rider simulation at 60 TPS produces on the order of a few million events over its run.

### Building an event log

Here is a pattern for collecting a complete event log across a simulation run:

```rust,no_run
use elevator_core::prelude::*;
use elevator_core::stop::StopId;

fn main() -> Result<(), SimError> {
    let mut sim = SimulationBuilder::new()
        .stops(vec![])
        .stop(StopId(0), "Lobby", 0.0)
        .stop(StopId(1), "Floor 2", 4.0)
        .stop(StopId(2), "Floor 3", 8.0)
        .build()?;

    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 75.0)?;
    sim.spawn_rider_by_stop_id(StopId(2), StopId(0), 80.0)?;

    let mut event_log: Vec<Event> = Vec::new();

    for _ in 0..1000 {
        sim.step();
        event_log.extend(sim.drain_events());
    }

    // Analyze the log.
    let boardings = event_log.iter()
        .filter(|e| matches!(e, Event::RiderBoarded { .. }))
        .count();
    let arrivals = event_log.iter()
        .filter(|e| matches!(e, Event::RiderExited { .. }))
        .count();

    println!("Total boardings: {boardings}");
    println!("Total arrivals: {arrivals}");
    println!("Total events: {}", event_log.len());

    Ok(())
}
```

## Metrics

The `Metrics` struct aggregates key performance indicators across the entire simulation run. Access it via `sim.metrics()`:

```rust,no_run
# use elevator_core::prelude::*;
# fn run(sim: &Simulation) {
let m = sim.metrics();

println!("Avg wait time:     {:.1} ticks", m.avg_wait_time());
println!("Avg ride time:     {:.1} ticks", m.avg_ride_time());
println!("Max wait time:     {} ticks", m.max_wait_time());
println!("Throughput:        {} riders/window", m.throughput());
println!("Total delivered:   {}", m.total_delivered());
println!("Total spawned:     {}", m.total_spawned());
println!("Total abandoned:   {}", m.total_abandoned());
println!("Total settled:     {}", m.total_settled());
println!("Total rerouted:    {}", m.total_rerouted());
println!("Abandonment rate:  {:.1}%", m.abandonment_rate() * 100.0);
println!("Total distance:    {:.1} units", m.total_distance());
println!("Total moves:       {}", m.total_moves());
# }
```

### What each metric means

| Metric | Description |
|---|---|
| `avg_wait_time()` | Average ticks from spawn to board, across all riders that boarded |
| `avg_ride_time()` | Average ticks from board to exit, across all delivered riders |
| `max_wait_time()` | Longest wait observed (ticks) |
| `throughput()` | Riders delivered in the current throughput window (default: 3600 ticks) |
| `total_delivered()` | Cumulative riders successfully delivered |
| `total_spawned()` | Cumulative riders spawned |
| `total_abandoned()` | Cumulative riders who gave up waiting |
| `abandonment_rate()` | `total_abandoned / total_spawned` (0.0 to 1.0) |
| `total_settled()` | Cumulative riders settled as residents |
| `total_rerouted()` | Cumulative riders rerouted from resident phase |
| `total_distance()` | Sum of all elevator travel distance |
| `total_moves()` | Total rounded-floor transitions across all elevators (passing-floor crossings + arrivals; analogous to elevator-saga's `moveCount`) |
| `utilization_by_group()` | Per-group fraction of elevators currently moving |
| `avg_utilization()` | Average utilization across all groups |
| `reposition_distance()` | Total elevator distance traveled while repositioning |

Metrics are updated during the Metrics phase of each tick. They are always available and always reflect the latest tick, regardless of whether you drain events.

### Compact summary

`Metrics` implements `Display` for a one-line KPI summary suitable for HUDs and logs:

```rust,no_run
# use elevator_core::prelude::*;
# fn run(sim: &Simulation) {
println!("{}", sim.metrics());
// Output: "42 delivered, avg wait 87.3t, 65% util"
# }
```

## Inspection queries

The `Simulation` exposes several read-only query helpers for game UIs and dispatch logic.

### Entity type checks

```rust,no_run
# use elevator_core::prelude::*;
# fn run(sim: &Simulation, id: EntityId) {
if sim.is_elevator(id) {
    // ...
} else if sim.is_rider(id) {
    // ...
} else if sim.is_stop(id) {
    // ...
}
# }
```

### Aggregate queries

Common KPIs that games typically display in HUDs:

| Method | Returns |
|---|---|
| `sim.idle_elevator_count()` | Count of elevators currently idle (excludes disabled) |
| `sim.elevators_in_phase(phase)` | Count of elevators in a given phase (excludes disabled) |
| `sim.elevator_load(id)` | Current total weight aboard an elevator, `None` if not an elevator |
| `sim.elevator_move_count(id)` | Per-elevator count of rounded-floor transitions, `None` if not an elevator |

```rust,no_run
# use elevator_core::prelude::*;
# fn run(sim: &Simulation) {
let idle = sim.idle_elevator_count();
let loading = sim.elevators_in_phase(ElevatorPhase::Loading);
println!("{idle} idle, {loading} loading");
# }
```

Disabled elevators are excluded from phase counts — their phase is reset to `Idle` on disable, but they should not appear as "available" in game UIs.

### Converting ticks to seconds

Metrics are reported in ticks. To convert to wall-clock seconds, use the `TimeAdapter`:

```rust,no_run
# use elevator_core::prelude::*;
# fn run(sim: &Simulation) {
let time = sim.time();
let avg_wait_seconds = time.ticks_to_seconds(sim.metrics().avg_wait_time() as u64);
println!("Avg wait: {avg_wait_seconds:.1}s");
# }
```

## Tagged metrics

For per-zone or per-label breakdowns, you can tag entities with string labels and query metrics scoped to those tags.

### Tagging entities

```rust,no_run
# use elevator_core::prelude::*;
# use elevator_core::stop::StopId;
# fn main() -> Result<(), SimError> {
# let mut sim = SimulationBuilder::new().build()?;
// Tag a stop.
let lobby = sim.stop_entity(StopId(0)).unwrap();
sim.tag_entity(lobby, "zone:lobby");

// Tag a rider (riders auto-inherit tags from their origin stop when spawned).
let rider = sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 75.0)?;
// rider automatically has "zone:lobby" because it was spawned at StopId(0).

// You can also tag manually.
sim.tag_entity(rider, "priority:vip");
# Ok(())
# }
```

### Querying tagged metrics

```rust,no_run
# use elevator_core::prelude::*;
# fn run(sim: &Simulation) {
if let Some(lobby_metrics) = sim.metrics_for_tag("zone:lobby") {
    println!("Lobby avg wait:  {:.1} ticks", lobby_metrics.avg_wait_time());
    println!("Lobby delivered: {}", lobby_metrics.total_delivered());
    println!("Lobby abandoned: {}", lobby_metrics.total_abandoned());
    println!("Lobby max wait:  {} ticks", lobby_metrics.max_wait_time());
}
# }
```

Tagged metrics track `avg_wait_time`, `total_delivered`, `total_abandoned`, `total_spawned`, and `max_wait_time` per tag. They are updated automatically during the Metrics phase.

### Practical example: comparing zones

```rust,no_run
use elevator_core::prelude::*;
use elevator_core::stop::StopId;

fn main() -> Result<(), SimError> {
    let mut sim = SimulationBuilder::new()
        .stops(vec![])
        .stop(StopId(0), "Lobby", 0.0)
        .stop(StopId(1), "Low Zone", 4.0)
        .stop(StopId(2), "Mid Zone", 8.0)
        .stop(StopId(3), "High Zone", 12.0)
        .build()?;

    // Tag stops by zone.
    for (id, tag) in [(0, "zone:low"), (1, "zone:low"), (2, "zone:high"), (3, "zone:high")] {
        if let Some(eid) = sim.stop_entity(StopId(id)) {
            sim.tag_entity(eid, tag);
        }
    }

    // Spawn riders from different zones.
    sim.spawn_rider_by_stop_id(StopId(0), StopId(3), 75.0)?;
    sim.spawn_rider_by_stop_id(StopId(3), StopId(0), 80.0)?;

    // Run the simulation.
    for _ in 0..2000 {
        sim.step();
        sim.drain_events(); // clear the buffer
    }

    // Compare zone performance.
    for zone in ["zone:low", "zone:high"] {
        if let Some(m) = sim.metrics_for_tag(zone) {
            println!("{zone}: avg_wait={:.0} delivered={} abandoned={}",
                     m.avg_wait_time(), m.total_delivered(), m.total_abandoned());
        }
    }

    Ok(())
}
```

## Next steps

Head to [Bevy Integration](bevy-integration.md) to see how the companion crate wraps all of this into a visual Bevy application.
