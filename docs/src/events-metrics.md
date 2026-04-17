# Events and Metrics

Every significant moment in the simulation -- a rider boarding, an elevator arriving, a door opening -- produces a typed event. The metrics system aggregates these events into summary statistics. Together, events and metrics give you full observability into your simulation.

## Event system

### Elevator events

| Event | When it fires |
|---|---|
| `ElevatorDeparted { elevator, from_stop, tick }` | An elevator leaves a stop |
| `ElevatorArrived { elevator, at_stop, tick }` | An elevator arrives at a stop |
| `ElevatorAssigned { elevator, stop, tick }` | Dispatch assigns an elevator to a stop |
| `ElevatorIdle { elevator, at_stop: Option, tick }` | An elevator became idle (`at_stop` is `None` if not at a stop) |
| `ElevatorRepositioning { elevator, to_stop, tick }` | An idle elevator begins repositioning |
| `ElevatorRepositioned { elevator, at_stop, tick }` | An elevator completed repositioning |
| `DoorOpened { elevator, tick }` | Doors finish opening |
| `DoorClosed { elevator, tick }` | Doors finish closing |
| `DoorCommandQueued { elevator, command, tick }` | A manual door command was accepted |
| `DoorCommandApplied { elevator, command, tick }` | A queued door command took effect |
| `PassingFloor { elevator, stop, moving_up, tick }` | An elevator passes a stop without stopping |
| `MovementAborted { elevator, brake_target, tick }` | `abort_movement` was called mid-flight; the car will brake to `brake_target` without opening doors |
| `CapacityChanged { elevator, current_load, capacity, tick }` | An elevator's load changed |
| `DirectionIndicatorChanged { elevator, going_up, going_down, tick }` | Direction lamps changed |
| `DestinationQueued { elevator, stop, tick }` | A stop was pushed onto the destination queue |
| `ServiceModeChanged { elevator, from, to, tick }` | Elevator service mode changed |
| `ElevatorUpgraded { elevator, field, old, new, tick }` | A runtime upgrade was applied (e.g., `set_max_speed`) |
| `ManualVelocityCommanded { elevator, target_velocity, tick }` | A manual velocity command was issued |

### Rider events

| Event | When it fires |
|---|---|
| `RiderSpawned { rider, origin, destination, tick }` | A new rider appears at a stop |
| `RiderBoarded { rider, elevator, tick }` | A rider enters an elevator |
| `RiderExited { rider, elevator, stop, tick }` | A rider exits at their destination |
| `RiderRejected { rider, elevator, reason, context, tick }` | A rider was refused boarding |
| `RiderAbandoned { rider, stop, tick }` | A rider gave up waiting |
| `RiderSkipped { rider, elevator, at_stop, tick }` | A rider skipped a crowded car (may still board the next) |
| `RiderEjected { rider, elevator, stop, tick }` | A rider was ejected (elevator disabled) |
| `RiderSettled { rider, stop, tick }` | A rider settled as a resident |
| `RiderDespawned { rider, tick }` | A rider was removed from the simulation |
| `RiderRerouted { rider, new_destination, tick }` | A rider was rerouted to a new destination |

### Topology events

| Event | When it fires |
|---|---|
| `StopAdded { stop, line, group, tick }` | A stop was added at runtime |
| `ElevatorAdded { elevator, line, group, tick }` | An elevator was added at runtime |
| `EntityDisabled { entity, tick }` | An entity was disabled |
| `EntityEnabled { entity, tick }` | An entity was re-enabled |
| `RouteInvalidated { rider, affected_stop, reason, tick }` | A rider's route was broken by a topology change |
| `LineAdded { line, group, tick }` | A line was added |
| `LineRemoved { line, group, tick }` | A line was removed |
| `LineReassigned { line, old_group, new_group, tick }` | A line moved between groups |
| `ElevatorReassigned { elevator, old_line, new_line, tick }` | An elevator moved between lines |
| `StopRemoved { stop, tick }` | A stop was removed |
| `ElevatorRemoved { elevator, line, group, tick }` | An elevator was removed |

### Dispatch events

| Event | When it fires |
|---|---|
| `HallButtonPressed { stop, direction, tick }` | First press per (stop, direction) |
| `HallCallAcknowledged { stop, direction, tick }` | Ack-latency window elapsed |
| `HallCallCleared { stop, direction, car, tick }` | Assigned car opened doors at stop |
| `CarButtonPressed { car, floor, rider: Option, tick }` | Floor button pressed inside a car |

## Draining events

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
        Event::ElevatorArrived { elevator, at_stop, tick } => {
            println!("[{tick}] {elevator:?} arrived at {at_stop:?}");
        }
        _ => {}
    }
}
# }
```

You can drain after every tick, every N ticks, or only when you need to -- events accumulate until drained. The metrics system processes events independently, so draining does not affect metric calculations.

If you never drain, the buffer grows unbounded. In long-running simulations, drain at least periodically.

## Event ordering guarantees

- **Within a tick:** events fire in phase order (AdvanceTransient, Dispatch, Reposition, Movement, Doors, Loading, Metrics). Events from a later phase always appear later in the drained vec.
- **Across ticks:** events from tick N precede events from tick N+1. Every event carries its `tick` field for timeline reconstruction.
- **Within a phase:** ordering is stable but not part of the public contract. Do not rely on which elevator's events come first within the same phase.
- **Pair invariants:** `RiderBoarded` always precedes the matching `RiderExited` for the same rider. `DoorOpened` always precedes `DoorClosed` for the same elevator at a given stop.

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
println!("Total abandoned:   {}", m.total_abandoned());
println!("Abandonment rate:  {:.1}%", m.abandonment_rate() * 100.0);
println!("Total distance:    {:.1} units", m.total_distance());
# }
```

### Metric reference

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
| `total_moves()` | Total rounded-floor transitions across all elevators |
| `utilization_by_group()` | Per-group fraction of elevators currently moving |
| `avg_utilization()` | Average utilization across all groups |
| `reposition_distance()` | Total elevator distance traveled while repositioning |

Metrics are updated during the Metrics phase each tick. They are always available and always reflect the latest tick, regardless of whether you drain events.

### Compact Display output

`Metrics` implements `Display` for a one-line summary suitable for HUDs and logs:

```rust,no_run
# use elevator_core::prelude::*;
# fn run(sim: &Simulation) {
println!("{}", sim.metrics());
// Output: "42 delivered, avg wait 87.3t, 65% util"
# }
```

## Inspection queries

The `Simulation` exposes read-only query helpers for game UIs and dispatch logic:

| Method | Returns |
|---|---|
| `sim.idle_elevator_count()` | Count of elevators currently idle (excludes disabled) |
| `sim.elevators_in_phase(phase)` | Count of elevators in a given phase (excludes disabled) |
| `sim.elevator_load(id)` | Current total weight aboard an elevator |
| `sim.elevator_move_count(id)` | Per-elevator count of rounded-floor transitions |

```rust,no_run
# use elevator_core::prelude::*;
# fn run(sim: &Simulation) {
let idle = sim.idle_elevator_count();
let loading = sim.elevators_in_phase(ElevatorPhase::Loading);
println!("{idle} idle, {loading} loading");
# }
```

Disabled elevators are excluded from phase counts -- their phase resets to `Idle` on disable, but they should not appear as "available" in game UIs.

## Tagged metrics

For per-zone or per-label breakdowns, tag entities with string labels and query metrics scoped to those tags.

### Tagging entities

```rust,no_run
# use elevator_core::prelude::*;
# fn main() -> Result<(), SimError> {
# let mut sim = SimulationBuilder::new()
#     .stop(StopId(0), "Ground", 0.0)
#     .stop(StopId(1), "Top", 10.0)
#     .elevator(ElevatorConfig::default())
#     .build()?;
let lobby = sim.stop_entity(StopId(0)).unwrap();
sim.tag_entity(lobby, "zone:lobby")?;

// Riders auto-inherit tags from their origin stop when spawned.
let rider = sim.spawn_rider(StopId(0), StopId(1), 75.0)?;
// rider automatically has "zone:lobby"

// Manual tagging is also supported.
sim.tag_entity(rider.entity(), "priority:vip")?;
# Ok(())
# }
```

### Querying tagged metrics

```rust,no_run
# use elevator_core::prelude::*;
# fn run(sim: &Simulation) {
if let Some(m) = sim.metrics_for_tag("zone:lobby") {
    println!("Lobby avg wait:  {:.1} ticks", m.avg_wait_time());
    println!("Lobby delivered: {}", m.total_delivered());
    println!("Lobby abandoned: {}", m.total_abandoned());
}
# }
```

Tagged metrics track `avg_wait_time`, `total_delivered`, `total_abandoned`, `total_spawned`, and `max_wait_time` per tag. They are updated automatically during the Metrics phase.

## Converting ticks to seconds

Metrics are reported in ticks. Convert to wall-clock seconds via the `TimeAdapter`:

```rust,no_run
# use elevator_core::prelude::*;
# fn run(sim: &Simulation) {
let time = sim.time();
let avg_wait_seconds = time.ticks_to_seconds(sim.metrics().avg_wait_time() as u64);
println!("Avg wait: {avg_wait_seconds:.1}s");
# }
```

The default tick rate is 60 ticks per second. Configure it via `ticks_per_second` in the simulation config.

## Next steps

- [Error Handling](error-handling.md) -- understand `RiderRejected` reasons and other error types
- [Rider Lifecycle](rider-lifecycle.md) -- the phases behind rider events
- [Extensions](extensions.md) -- custom event channels for game-specific events
