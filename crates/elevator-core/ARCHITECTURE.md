# elevator-core Architecture

## 1. Overview

`elevator-core` is an engine-agnostic, tick-based elevator simulation library.
It is pure Rust with zero `unsafe`, no ECS framework dependency, and no
rendering or I/O. The library models elevators at "stops" positioned at
arbitrary distances along a 1D axis, making it suitable for both conventional
buildings and exotic configurations like space elevators.

Key properties:

- **Tick-based** -- deterministic fixed-timestep simulation (`dt = 1 / ticks_per_second`)
- **Struct-of-arrays ECS** -- custom implementation using `SlotMap` + `SecondaryMap`
- **Pluggable dispatch** -- swappable algorithms per elevator group
- **Game-agnostic riders** -- `Rider` is anything that rides; games add semantics via extensions
- **Config-validated** -- invalid configs rejected at construction time

## 2. Core Architecture: ECS-like World

### Entity storage

All entities share a single `SlotMap<EntityId, ()>` that acts as the existence
table. Each component type gets its own `SecondaryMap<EntityId, T>`, enabling
independent mutable borrows of different component storages within the same
system function.

```rust
pub struct World {
    alive:       SlotMap<EntityId, ()>,

    // Built-in component storages
    positions:   SecondaryMap<EntityId, Position>,
    velocities:  SecondaryMap<EntityId, Velocity>,
    elevators:   SecondaryMap<EntityId, Elevator>,
    riders:      SecondaryMap<EntityId, Rider>,
    stops:       SecondaryMap<EntityId, Stop>,
    routes:      SecondaryMap<EntityId, Route>,
    lines:       SecondaryMap<EntityId, Line>,
    patience:    SecondaryMap<EntityId, Patience>,
    preferences: SecondaryMap<EntityId, Preferences>,
    disabled:    SecondaryMap<EntityId, ()>,

    // Extension storage (game-specific components)
    extensions:  HashMap<TypeId, Box<dyn AnyExtMap>>,
    ext_names:   HashMap<TypeId, String>,

    // Global resources (singletons)
    resources:   HashMap<TypeId, Box<dyn Any + Send + Sync>>,
}
```

### Built-in components

| Component     | Attached to   | Purpose                                     |
|---------------|---------------|---------------------------------------------|
| `Position`    | Elevator       | Shaft-axis position (`f64`)                |
| `Velocity`    | Elevator       | Shaft-axis velocity (`f64`)                |
| `Elevator`    | Elevator       | Phase, door FSM, riders, capacity, physics |
| `Rider`       | Rider          | Phase, weight, spawn/board tick            |
| `Stop`        | Stop           | Name, position                             |
| `Route`       | Rider          | Multi-leg route (optional)                 |
| `Line`        | Line           | Group, orientation, axis bounds            |
| `Patience`    | Rider          | Patience threshold and tick tracking       |
| `Preferences` | Rider          | Boarding preferences                       |

### Query builder

The `world.query::<Q>()` API provides ECS-style iteration with compile-time
component selection, `With`/`Without` filters, and extension component access:

```rust
// All riders with a position
for (id, rider, pos) in world.query::<(EntityId, &Rider, &Position)>().iter() { ... }

// Extension components
for (id, vip) in world.query::<(EntityId, &Ext<VipTag>)>().iter() { ... }

// Mutable extension queries (keys-snapshot pattern)
world.query_ext_mut::<VipTag>().for_each_mut(|id, tag| { tag.level += 1; });
```

## 3. The 8-Phase Tick Loop

Each call to `sim.step()` runs all eight phases in order, then advances the
tick counter. Events emitted during a tick are buffered and available to
consumers via `drain_events()` after the tick completes.

```
┌───────────────────────┐
│ 1. AdvanceTransient   │  systems/advance_transient.rs
│                       │  Boarding→Riding, Exiting→Arrived, walk legs, patience
├───────────────────────┤
│ 2. Dispatch           │  systems/dispatch.rs
│                       │  Build manifest, call DispatchStrategy.decide_all()
├───────────────────────┤
│ 3. Reposition         │  systems/reposition.rs
│                       │  Move idle elevators via RepositionStrategy (optional)
├───────────────────────┤
│ 4. AdvanceQueue       │  systems/advance_queue.rs
│                       │  Reconcile phase/target with DestinationQueue front
├───────────────────────┤
│ 5. Movement           │  systems/movement.rs
│                       │  Trapezoidal velocity profile, PassingFloor detection
├───────────────────────┤
│ 6. Doors              │  systems/doors.rs
│                       │  DoorState FSM: Opening→Open→Closing→Closed
├───────────────────────┤
│ 7. Loading            │  systems/loading.rs
│                       │  Board/exit riders, capacity checks, rejections
├───────────────────────┤
│ 8. Metrics            │  systems/metrics.rs
│                       │  Aggregate wait/ride times, throughput, tagged metrics
└───────────┬───────────┘
            ▼
┌───────────────────────┐
│   advance_tick()      │  flush events to output, tick += 1
└───────────────────────┘
```

### Phase 1: AdvanceTransient (`systems/advance_transient.rs`)

Transitions riders through their one-tick transient states:

- `Boarding(elevator)` becomes `Riding(elevator)`
- `Exiting(elevator)` checks for more route legs; becomes `Waiting` (next leg)
  or `Arrived` (route complete)
- Walk legs are executed immediately (rider teleported to walk destination)
- Patience is ticked for waiting riders; expired patience emits `RiderAbandoned`

**Events:** `RiderAbandoned`

### Phase 2: Dispatch (`systems/dispatch.rs`)

Builds a `DispatchManifest` from current rider state, then calls each group's
`DispatchStrategy.decide_all()` for idle/stopped elevators.

The manifest contains per-rider metadata (`RiderInfo`) grouped into two maps:
- `waiting_at_stop`: riders at each stop wanting service
- `riding_to_stop`: riders aboard elevators heading to each destination

When a strategy returns `GoToStop`, the elevator transitions to
`MovingToStop(stop)` and an `ElevatorAssigned` event is emitted. If the
elevator is already at the target stop, doors open immediately.

**Events:** `ElevatorAssigned`, `ElevatorDeparted`

### Phase 3: Reposition (`systems/reposition.rs`)

Optional per-group phase. Only acts on elevators still in `Idle` phase after
dispatch (no pending assignment). Each group's `RepositionStrategy` decides
where to send idle cars for better coverage. Sets `Elevator.repositioning = true`
so the movement system can distinguish repositioning from dispatch arrivals.

Groups without a registered strategy skip this phase entirely.

**Events:** `ElevatorRepositioning`

### Phase 4: AdvanceQueue (`systems/advance_queue.rs`)

Reconciles each elevator's phase and target stop with the front of its
[`DestinationQueue`]. When imperative callers have pushed a stop via
`push_destination` or `push_destination_front`, this phase redirects the
car before movement is applied. If the front of the queue matches the
current target, the phase is a no-op.

Queue entries are consumed when a loading cycle completes at the target
stop, so imperative and dispatch-driven itineraries compose naturally.

**Events:** `ElevatorAssigned` (when a new target is adopted from the queue)

### Phase 5: Movement (`systems/movement.rs`)

Applies trapezoidal velocity profile physics (via `movement::tick_movement`)
to all elevators in `MovingToStop` phase. The profile has three regions:
acceleration, cruise at max speed, and deceleration to stop.

Uses the `SortedStops` resource for O(log n) detection of stops passed
during each tick. When an elevator passes a stop without stopping, a
`PassingFloor` event is emitted.

On arrival, dispatched elevators transition to `DoorOpening` and doors begin
opening. Repositioned elevators go directly to `Idle` (no door cycle) and
emit `ElevatorRepositioned` instead of `ElevatorArrived`.

**Events:** `ElevatorArrived`, `PassingFloor`, `ElevatorRepositioned`

**Key design:** Physics parameters (max_speed, acceleration, deceleration) are
per-elevator, stored on the `Elevator` component.

### Phase 6: Doors (`systems/doors.rs`)

Ticks the `DoorState` finite-state machine for each elevator:

```
Closed → Opening (transition_ticks) → Open (open_ticks) → Closing (transition_ticks) → Closed
```

Phase transitions on completion:
- Finished opening → `Loading` (riders can board/exit)
- Finished open hold → `DoorClosing`
- Finished closing → `Stopped` (available for next dispatch)

**Events:** `DoorOpened`, `DoorClosed`

### Phase 7: Loading (`systems/loading.rs`)

Boards and exits riders at elevators in `Loading` phase. Uses a **two-pass
read-then-write** approach to avoid aliasing issues:

1. **Read pass** (`collect_actions`): scans all loading elevators and their
   stops, collecting `LoadAction` values (Exit, Board, or Reject)
2. **Write pass** (`apply_actions`): mutates world state based on collected
   actions

One rider action per elevator per tick. Exit takes priority over boarding.
Boarding checks weight capacity and rider preferences; failures emit
`RiderRejected` with a typed `RejectionReason`.

**Events:** `RiderBoarded`, `RiderExited`, `RiderRejected`

### Phase 8: Metrics (`systems/metrics.rs`)

Reads events emitted during the current tick (via `EventBus::peek()`) and
updates aggregate `Metrics`:
- Spawn count, board count, delivery count, abandonment count
- Wait time distribution (per-rider ticks between spawn and board)
- Ride time distribution (per-rider ticks between board and exit)

Also updates per-tag metric accumulators via `MetricTags`, enabling
line-level and custom-tag breakdowns.

**Events:** none (read-only consumer)

## 4. Entity Relationships

```
 ElevatorGroup (runtime struct, not an entity)
 ├── id: GroupId
 ├── lines: Vec<LineInfo>
 │   ├── entity: EntityId ──────────► Line (component)
 │   │                                ├── group: GroupId ──► back to group
 │   │                                ├── orientation
 │   │                                └── min/max_position
 │   ├── elevators: Vec<EntityId> ──► Elevator (component)
 │   │                                ├── line: EntityId ──► Line entity
 │   │                                ├── riders: Vec<EntityId> ──► Rider entities
 │   │                                ├── phase: ElevatorPhase
 │   │                                ├── door: DoorState
 │   │                                └── weight_capacity, current_load, ...
 │   └── serves: Vec<EntityId> ─────► Stop (component)
 │                                    ├── name: String
 │                                    └── position: f64
 │
 └── stop_entities (derived, deduplicated union of all lines' stops)

 Rider (component, entity)
 ├── phase: RiderPhase (Waiting | Boarding(elev) | Riding(elev) | Exiting(elev) | ...)
 ├── current_stop: Option<EntityId> ──► Stop entity
 ├── weight: f64
 └── spawn_tick, board_tick

 Route (optional component on Rider entity)
 ├── legs: Vec<RouteLeg>
 │   └── RouteLeg { from: EntityId, to: EntityId, via: TransportMode }
 │       └── TransportMode::Group(GroupId) | Line(EntityId) | Walk
 └── current_leg: usize
```

Key relationship invariants:
- An `Elevator` always has a `Line` (`elevator.line → EntityId`)
- A `Line` always belongs to exactly one group (`line.group → GroupId`)
- Riders aboard an elevator appear in both `elevator.riders` and have
  `RiderPhase::Riding(elevator_id)`
- On `despawn()`, cross-references are cleaned up automatically

## 5. Dispatch System

### DispatchStrategy trait

```rust
pub trait DispatchStrategy: Send + Sync {
    fn decide(
        &mut self,
        elevator: EntityId,
        elevator_position: f64,
        group: &ElevatorGroup,
        manifest: &DispatchManifest,
        world: &World,
    ) -> DispatchDecision;

    fn decide_all(
        &mut self,
        elevators: &[(EntityId, f64)],
        group: &ElevatorGroup,
        manifest: &DispatchManifest,
        world: &World,
    ) -> Vec<(EntityId, DispatchDecision)>;

    fn notify_removed(&mut self, _elevator: EntityId) {}
}
```

`decide()` handles a single elevator; `decide_all()` enables group-wide
coordination (default: calls `decide()` per elevator). Strategies receive
full `&World` access for reading extension components or custom state.

### DispatchManifest

Built fresh each tick from current rider state:

```rust
pub struct DispatchManifest {
    pub waiting_at_stop: BTreeMap<EntityId, Vec<RiderInfo>>,
    pub riding_to_stop:  BTreeMap<EntityId, Vec<RiderInfo>>,
}

pub struct RiderInfo {
    pub id: EntityId,
    pub destination: Option<EntityId>,
    pub weight: f64,
    pub wait_ticks: u64,
}
```

`BTreeMap` ensures deterministic iteration order across platforms.

### Built-in strategies

| Strategy       | Algorithm                                          |
|----------------|----------------------------------------------------|
| `Scan`         | Sweeps end-to-end like a disk arm (SCAN/elevator)  |
| `Look`         | Like Scan but reverses at last request (LOOK)      |
| `NearestCar`   | Assigns closest idle elevator to each call         |
| `Etd`          | Estimated Time to Destination (see below)          |

### ETD cost model

```
cost = wait_weight  * travel_time_to_stop
     + delay_weight * existing_rider_delay
     + door_weight  * estimated_door_overhead
     + direction_bonus
```

For each pending call, ETD evaluates every elevator and picks the one
minimizing total cost. The `riding_to_stop` manifest data estimates how many
existing riders would be delayed by a detour. Weights are configurable via
`EtdDispatch::with_weights()`.

ETD emits `DispatchCostComputed` events for observability.

## 6. Repositioning System

### RepositionStrategy trait

```rust
pub trait RepositionStrategy: Send + Sync {
    fn reposition(
        &mut self,
        idle_elevators: &[(EntityId, f64)],    // (entity, position)
        stop_positions: &[(EntityId, f64)],    // (entity, position)
        group: &ElevatorGroup,
        world: &World,
    ) -> Vec<(EntityId, EntityId)>;  // (elevator, target_stop)
}
```

Repositioning runs as Phase 3, only on elevators still `Idle` after dispatch.
Elevators not in the returned vec remain where they are.

### Built-in strategies

| Strategy         | Behavior                                         |
|------------------|--------------------------------------------------|
| `SpreadEvenly`   | Distribute idle cars evenly across stops         |
| `ReturnToLobby`  | Send idle cars to a configured home stop         |
| `DemandWeighted` | Position near stops with historically high demand|
| `NearestIdle`    | Keep idle cars where they are (no-op)            |

Repositioning is optional per group. Groups without a registered strategy
skip the phase entirely.

## 7. Extension System

Extensions let games attach custom typed components to simulation entities
without modifying the core library.

### Attaching data

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
struct VipTag { level: u32 }

world.insert_ext(entity, VipTag { level: 3 }, "vip_tag");
world.get_ext::<VipTag>(entity);        // Option<VipTag> (cloned)
world.get_ext_mut::<VipTag>(entity);    // Option<&mut VipTag>
```

The `name` string is required for serialization roundtrips in snapshots.
Extension components must implement `Serialize + DeserializeOwned`.

### Querying extensions

Extensions integrate with the query builder:

```rust
// Read-only (cloned via Ext<T>)
for (id, vip) in world.query::<(EntityId, &Ext<VipTag>)>().iter() { ... }

// Mutable access (keys-snapshot pattern via ExtMut<T>)
world.query_ext_mut::<VipTag>().for_each_mut(|id, tag| { tag.level += 1; });
```

### Snapshot compatibility

Extension types must be registered before restoring a snapshot:

```rust
world.register_ext::<VipTag>("vip_tag");
sim.load_extensions(&snapshot.extensions);
```

Unregistered types are stored in a `PendingExtensions` resource until
registration. Extension data is serialized as RON strings in the snapshot.

### Cleanup

Extension components are automatically removed on `despawn()` -- no manual
cleanup required.

## 8. Event System

### EventBus

The internal `EventBus` is a per-tick buffer using a drain pattern:

```rust
pub struct EventBus {
    events: Vec<Event>,
}
```

Systems emit events during their phase via `events.emit(...)`. The metrics
phase reads events via `events.peek()`. After all phases complete,
`advance_tick()` drains the bus into `pending_output`, making events
available to consumers via `sim.drain_events()`.

### Event variants

The `Event` enum has ~25 variants organized by domain:

| Category       | Events                                                          |
|----------------|-----------------------------------------------------------------|
| Elevator       | `ElevatorDeparted`, `ElevatorArrived`, `DoorOpened`, `DoorClosed`, `PassingFloor` |
| Rider          | `RiderSpawned`, `RiderBoarded`, `RiderExited`, `RiderRejected`, `RiderAbandoned`, `RiderEjected` |
| Dispatch       | `ElevatorAssigned`, `DispatchCostComputed`                      |
| Topology       | `StopAdded`, `ElevatorAdded`, `EntityDisabled`, `EntityEnabled`, `RouteInvalidated`, `RiderRerouted` |
| Line lifecycle | `LineAdded`, `LineRemoved`, `LineReassigned`, `ElevatorReassigned` |
| Repositioning  | `ElevatorRepositioning`, `ElevatorRepositioned`                 |

All events carry the `tick` when they occurred and reference entities by
`EntityId`.

### EventChannel\<T\>

For game-specific typed events, insert an `EventChannel<T>` as a world
resource:

```rust
world.insert_resource(EventChannel::<MyGameEvent>::new());
world.resource_mut::<EventChannel<MyGameEvent>>().unwrap().emit(MyEvent::Score(100));
```

## 9. Snapshot Save/Load

### WorldSnapshot

`sim.snapshot()` captures the full simulation state in a serializable
`WorldSnapshot`:

- All entities and their components (built-in + extensions)
- Elevator groups with line topology
- Stop ID lookup table
- Metrics and tagged metrics
- Tick counter and time configuration
- Dispatch strategy identifiers

### Entity ID remapping

On restore, fresh `EntityId` values are generated (SlotMap keys are not
stable across sessions). The snapshot stores entity data by index;
`restore()` builds an `old_id → new_id` mapping and remaps all
cross-references (elevator riders, rider phases, route legs, group caches).

### Extension data handling

Extension components are serialized as `HashMap<String, HashMap<EntityId, String>>`
(name to entity-RON-string mapping). On restore, this data is stored in a
`PendingExtensions` resource. After the game registers its extension types
via `world.register_ext::<T>(name)`, calling `sim.load_extensions()` deserializes
and attaches the data.

### Custom dispatch strategies

Built-in strategies (`Scan`, `Look`, `NearestCar`, `Etd`) are restored
automatically via their `BuiltinStrategy` enum. Custom strategies require
a factory function:

```rust
let sim = snapshot.restore(Some(&|name: &str| match name {
    "my_strategy" => Some(Box::new(MyStrategy::new())),
    _ => None,
}));
```

## 10. Performance Characteristics

| Operation                   | Complexity      | Notes                                  |
|-----------------------------|-----------------|----------------------------------------|
| Entity iteration            | O(n)            | Linear scan over `SecondaryMap`        |
| Stop-passing detection      | O(log n)        | Binary search on `SortedStops` resource|
| Dispatch manifest build     | O(riders)       | Per group, per tick                    |
| Loading (board/exit)        | O(elevators)    | One rider action per elevator per tick |
| Topology queries            | O(V+E)          | Lazy graph rebuild, BFS via `TopologyGraph` |
| Tagged metrics              | O(tags/entity)  | Per event, lookups in `MetricTags`     |
| Query iteration             | O(alive)        | Filters applied during iteration       |
| Snapshot save               | O(entities)     | Single pass over all component maps    |
| Snapshot restore            | O(entities)     | Spawn + remap pass                     |
