# API Reference

This chapter is a quick-reference for the public API of the `elevator-core` crate. It covers every public type, method, and enum variant you are likely to reach for when building on the simulation. For full rustdoc with source links, inline examples, and trait impls, see [docs.rs/elevator-core](https://docs.rs/elevator-core).

---

## Prelude

`use elevator_core::prelude::*;` re-exports these items. Anything else must be imported from its module explicitly.

| Category | Items |
|---|---|
| Builder & sim | `SimulationBuilder`, `Simulation`, `RiderBuilder` |
| Components | `Rider`, `RiderPhase`, `Elevator`, `ElevatorPhase`, `Stop`, `Line`, `Position`, `Velocity`, `SpatialPosition`, `Route`, `Patience`, `Preferences`, `AccessControl`, `Orientation`, `ServiceMode` |
| Config | `SimConfig`, `GroupConfig`, `LineConfig` |
| Dispatch traits | `DispatchStrategy`, `RepositionStrategy` |
| Reposition strategies | `NearestIdle`, `ReturnToLobby`, `SpreadEvenly`, `DemandWeighted` |
| Identity | `EntityId`, `StopId`, `GroupId` |
| Errors & events | `SimError`, `RejectionReason`, `RejectionContext`, `Event`, `EventBus` |
| Misc | `Metrics`, `TimeAdapter` |

Not in the prelude (import explicitly):

- `elevator_core::dispatch::scan::ScanDispatch`, `dispatch::look::LookDispatch`, `dispatch::nearest_car::NearestCarDispatch`, `dispatch::etd::EtdDispatch`
- `elevator_core::config::{ElevatorConfig, StopConfig}`
- `elevator_core::traffic::*` (feature-gated behind `traffic`)
- `elevator_core::snapshot::WorldSnapshot`
- `elevator_core::world::World` (parameter type for custom dispatch)

---

## SimulationBuilder

Fluent builder for constructing a `Simulation`. Starts with a minimal valid config (2 stops, 1 elevator, SCAN dispatch, 60 TPS). Override any part before calling `build()`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `new` | `() -> Self` | Create a builder with minimal defaults |
| `from_config` | `(SimConfig) -> Self` | Create a builder from an existing config |
| `stops` | `(Vec<StopConfig>) -> Self` | Replace all stops |
| `stop` | `(StopId, impl Into<String>, f64) -> Self` | Add a single stop |
| `elevators` | `(Vec<ElevatorConfig>) -> Self` | Replace all elevators |
| `elevator` | `(ElevatorConfig) -> Self` | Add a single elevator |
| `ticks_per_second` | `(f64) -> Self` | Set the tick rate |
| `building_name` | `(impl Into<String>) -> Self` | Set the building name |
| `dispatch` | `(impl DispatchStrategy) -> Self` | Set dispatch for the default group |
| `dispatch_for_group` | `(GroupId, impl DispatchStrategy) -> Self` | Set dispatch for a specific group |
| `before` | `(Phase, impl Fn(&mut World)) -> Self` | Register a before-phase hook |
| `after` | `(Phase, impl Fn(&mut World)) -> Self` | Register an after-phase hook |
| `before_group` | `(Phase, GroupId, impl Fn(&mut World)) -> Self` | Before-phase hook for a specific group |
| `after_group` | `(Phase, GroupId, impl Fn(&mut World)) -> Self` | After-phase hook for a specific group |
| `line` | `(LineConfig) -> Self` | Add a single line configuration (switches to explicit topology mode) |
| `lines` | `(Vec<LineConfig>) -> Self` | Replace all lines |
| `group` | `(GroupConfig) -> Self` | Add a single group configuration |
| `groups` | `(Vec<GroupConfig>) -> Self` | Replace all groups |
| `with_ext::<T>` | `() -> Self` | Pre-register an extension type for snapshot deserialization |
| `build` | `() -> Result<Simulation, SimError>` | Validate config and build the simulation |

---

## Simulation

The core simulation state. Advance it by calling `step()`, or run individual phases for fine-grained control.

### Stepping

| Method | Signature | Description |
|--------|-----------|-------------|
| `step` | `(&mut self)` | Run all 8 phases and advance the tick counter |
| `advance_tick` | `(&mut self)` | Increment tick counter and flush events to output buffer |
| `run_advance_transient` | `(&mut self)` | Run the advance-transient phase (with hooks) |
| `run_dispatch` | `(&mut self)` | Run the dispatch phase (with hooks) |
| `run_reposition` | `(&mut self)` | Run the reposition phase (with hooks) |
| `run_advance_queue` | `(&mut self)` | Run the advance-queue phase — reconcile `DestinationQueue` (with hooks) |
| `run_movement` | `(&mut self)` | Run the movement phase (with hooks) |
| `run_doors` | `(&mut self)` | Run the doors phase (with hooks) |
| `run_loading` | `(&mut self)` | Run the loading phase (with hooks) |
| `run_metrics` | `(&mut self)` | Run the metrics phase (with hooks) |
| `phase_context` | `(&self) -> PhaseContext` | Build the tick/dt context for the current tick |

### Rider Management

| Method | Signature | Description |
|--------|-----------|-------------|
| `spawn_rider` | `(&mut self, impl Into<StopRef>, impl Into<StopRef>, f64) -> Result<EntityId, SimError>` | Spawn a rider at origin heading to destination; auto-detects group (accepts `EntityId` or `StopId`) |
| `build_rider` | `(&mut self, impl Into<StopRef>, impl Into<StopRef>) -> Result<RiderBuilder, SimError>` | Fluent builder for riders with route, group, patience, preferences, or access control |
| `reroute` | `(&mut self, EntityId, EntityId) -> Result<(), SimError>` | Change a waiting rider's destination |
| `set_rider_route` | `(&mut self, EntityId, Route) -> Result<(), SimError>` | Replace a rider's entire remaining route |

### Events

| Method | Signature | Description |
|--------|-----------|-------------|
| `drain_events` | `(&mut self) -> Vec<Event>` | Drain all pending events from completed ticks |
| `pending_events` | `(&self) -> &[Event]` | Peek at pending events without draining |
| `events_mut` | `(&mut self) -> &mut EventBus` | Get a mutable reference to the internal event bus |

### Metrics and Tagging

| Method | Signature | Description |
|--------|-----------|-------------|
| `metrics` | `(&self) -> &Metrics` | Get current aggregate metrics |
| `metrics_mut` | `(&mut self) -> &mut Metrics` | Get mutable access to metrics |
| `metrics_for_tag` | `(&self, &str) -> Option<&TaggedMetric>` | Query per-tag metric accumulator |
| `tag_entity` | `(&mut self, EntityId, impl Into<String>)` | Attach a metric tag to an entity |
| `untag_entity` | `(&mut self, EntityId, &str)` | Remove a metric tag from an entity |
| `all_tags` | `(&self) -> Vec<&str>` | List all registered metric tags |

### Dynamic Topology

| Method | Signature | Description |
|--------|-----------|-------------|
| `add_stop` | `(&mut self, String, f64, EntityId) -> Result<EntityId, SimError>` | Add a new stop to a line at runtime |
| `add_elevator` | `(&mut self, &ElevatorParams, EntityId, f64) -> Result<EntityId, SimError>` | Add a new elevator to a line at runtime |
| `add_line` | `(&mut self, &LineParams) -> Result<EntityId, SimError>` | Add a new line to a group at runtime |
| `remove_line` | `(&mut self, EntityId) -> Result<(), SimError>` | Remove a line and disable its elevators |
| `add_group` | `(&mut self, impl Into<String>, impl DispatchStrategy) -> GroupId` | Create a new dispatch group |
| `assign_line_to_group` | `(&mut self, EntityId, GroupId) -> Result<GroupId, SimError>` | Reassign a line to a different group; returns old `GroupId` |
| `add_stop_to_line` | `(&mut self, EntityId, EntityId) -> Result<(), SimError>` | Add an existing stop to a line's served-stop list |
| `remove_stop_from_line` | `(&mut self, EntityId, EntityId) -> Result<(), SimError>` | Remove a stop from a line's served-stop list |
| `disable` | `(&mut self, EntityId) -> Result<(), SimError>` | Disable an entity (skipped by all systems; ejects riders from elevators) |
| `enable` | `(&mut self, EntityId) -> Result<(), SimError>` | Re-enable a disabled entity |
| `is_disabled` | `(&self, EntityId) -> bool` | Check if an entity is disabled |

### Topology Queries

| Method | Signature | Description |
|--------|-----------|-------------|
| `all_lines` | `(&self) -> Vec<EntityId>` | All line entities in the simulation |
| `line_count` | `(&self) -> usize` | Number of lines in the simulation |
| `lines_in_group` | `(&self, GroupId) -> Vec<EntityId>` | Line entities belonging to a group |
| `elevators_on_line` | `(&self, EntityId) -> Vec<EntityId>` | Elevator entities on a line |
| `stops_served_by_line` | `(&self, EntityId) -> Vec<EntityId>` | Stop entities served by a line |
| `line_for_elevator` | `(&self, EntityId) -> Option<EntityId>` | Find the line an elevator belongs to |
| `lines_serving_stop` | `(&self, EntityId) -> Vec<EntityId>` | Lines that serve a given stop |
| `groups_serving_stop` | `(&self, EntityId) -> Vec<GroupId>` | Groups that serve a given stop |
| `reachable_stops_from` | `(&self, EntityId) -> Vec<EntityId>` | All stops reachable from a stop (via any line/transfer) |
| `transfer_points` | `(&self) -> Vec<EntityId>` | Stops served by more than one group |
| `shortest_route` | `(&self, EntityId, EntityId) -> Option<Route>` | Compute the shortest route between two stops |

### Accessors

| Method | Signature | Description |
|--------|-----------|-------------|
| `world` | `(&self) -> &World` | Shared reference to the ECS world |
| `world_mut` | `(&mut self) -> &mut World` | Mutable reference to the ECS world |
| `current_tick` | `(&self) -> u64` | Current simulation tick |
| `dt` | `(&self) -> f64` | Time delta per tick in seconds |
| `groups` | `(&self) -> &[ElevatorGroup]` | Get the elevator groups |
| `stop_entity` | `(&self, StopId) -> Option<EntityId>` | Resolve a config `StopId` to its runtime `EntityId` |
| `stop_lookup_iter` | `(&self) -> impl Iterator<Item = (&StopId, &EntityId)>` | Iterate the stop ID to entity ID mapping |
| `time` | `(&self) -> &TimeAdapter` | Tick-to-wall-clock time converter |
| `strategy_id` | `(&self, GroupId) -> Option<&BuiltinStrategy>` | Get the dispatch strategy identifier for a group |
| `dispatchers` | `(&self) -> &BTreeMap<GroupId, Box<dyn DispatchStrategy>>` | Get the dispatch strategies map |
| `dispatchers_mut` | `(&mut self) -> &mut BTreeMap<GroupId, Box<dyn DispatchStrategy>>` | Get the dispatch strategies map mutably |

### Inspection Queries

| Method | Signature | Description |
|--------|-----------|-------------|
| `is_elevator` | `(&self, EntityId) -> bool` | Check if an entity has an `Elevator` component |
| `is_rider` | `(&self, EntityId) -> bool` | Check if an entity has a `Rider` component |
| `is_stop` | `(&self, EntityId) -> bool` | Check if an entity has a `Stop` component |
| `is_disabled` | `(&self, EntityId) -> bool` | Check if an entity is disabled |
| `idle_elevator_count` | `(&self) -> usize` | Count of elevators in `Idle` phase (excludes disabled) |
| `elevators_in_phase` | `(&self, ElevatorPhase) -> usize` | Count of elevators in a given phase (excludes disabled) |
| `elevator_load` | `(&self, EntityId) -> Option<f64>` | Current weight aboard an elevator |
| `elevator_going_up` | `(&self, EntityId) -> Option<bool>` | Up-direction indicator lamp state (`None` if not an elevator) |
| `elevator_going_down` | `(&self, EntityId) -> Option<bool>` | Down-direction indicator lamp state (`None` if not an elevator) |
| `elevator_move_count` | `(&self, EntityId) -> Option<u64>` | Per-elevator count of rounded-floor transitions (`None` if not an elevator) |
| `braking_distance` | `(&self, EntityId) -> Option<f64>` | Distance required to brake to a stop from the current velocity at the elevator's deceleration (`v² / 2a`). `Some(0.0)` when stationary; `None` if not an elevator |
| `future_stop_position` | `(&self, EntityId) -> Option<f64>` | Current position plus signed braking distance in the direction of travel — where the elevator would come to rest if braking began now |

### Dispatch

| Method | Signature | Description |
|--------|-----------|-------------|
| `set_dispatch` | `(&mut self, GroupId, Box<dyn DispatchStrategy>, BuiltinStrategy)` | Replace the dispatch strategy for a group |

### Hooks (Post-Build)

| Method | Signature | Description |
|--------|-----------|-------------|
| `add_before_hook` | `(&mut self, Phase, impl Fn(&mut World))` | Register a hook to run before a phase |
| `add_after_hook` | `(&mut self, Phase, impl Fn(&mut World))` | Register a hook to run after a phase |
| `add_before_group_hook` | `(&mut self, Phase, GroupId, impl Fn(&mut World))` | Before-phase hook for a specific group |
| `add_after_group_hook` | `(&mut self, Phase, GroupId, impl Fn(&mut World))` | After-phase hook for a specific group |

### Snapshots

| Method | Signature | Description |
|--------|-----------|-------------|
| `snapshot` | `(&self) -> WorldSnapshot` | Create a serializable snapshot of the current state |
| `load_extensions` | `(&mut self)` | Deserialize extension components from a pending snapshot |

### ElevatorParams

Parameters for `add_elevator` at runtime. All fields are public.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `max_speed` | `f64` | `2.0` | Maximum travel speed |
| `acceleration` | `f64` | `1.5` | Acceleration rate |
| `deceleration` | `f64` | `2.0` | Deceleration rate |
| `weight_capacity` | `f64` | `800.0` | Maximum weight the car can carry |
| `door_transition_ticks` | `u32` | `5` | Ticks for a door open/close transition |
| `door_open_ticks` | `u32` | `10` | Ticks the door stays fully open |

### LineParams

Parameters for `add_line` at runtime. All fields are public.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `String` | Human-readable name |
| `group` | `GroupId` | Dispatch group to add this line to |
| `orientation` | `Orientation` | Physical orientation (defaults to `Vertical`) |
| `min_position` | `f64` | Lowest reachable position on the line axis |
| `max_position` | `f64` | Highest reachable position on the line axis |
| `position` | `Option<SpatialPosition>` | Optional floor-plan position |
| `max_cars` | `Option<usize>` | Maximum cars on this line (`None` = unlimited) |

Constructor: `LineParams::new(name, group)` — defaults orientation to `Vertical`, positions to `0.0`, no floor-plan position, unlimited cars.

---

## World

Central entity/component storage using the struct-of-arrays pattern. Built-in components are accessed via typed methods; custom data goes through extension storage.

### Entity Lifecycle

| Method | Signature | Description |
|--------|-----------|-------------|
| `new` | `() -> Self` | Create an empty world |
| `spawn` | `(&mut self) -> EntityId` | Allocate a new entity (no components attached) |
| `despawn` | `(&mut self, EntityId)` | Remove an entity and all its components |
| `is_alive` | `(&self, EntityId) -> bool` | Check if an entity is alive |
| `entity_count` | `(&self) -> usize` | Number of live entities |

### Component Accessors

Each built-in component has a getter, mutable getter, and setter. The pattern is the same for all:

| Component | Get | Get Mut | Set |
|-----------|-----|---------|-----|
| `Position` | `position(EntityId) -> Option<&Position>` | `position_mut(EntityId)` | `set_position(EntityId, Position)` |
| `Velocity` | `velocity(EntityId) -> Option<&Velocity>` | `velocity_mut(EntityId)` | `set_velocity(EntityId, Velocity)` |
| `Elevator` | `elevator(EntityId) -> Option<&Elevator>` | `elevator_mut(EntityId)` | `set_elevator(EntityId, Elevator)` |
| `Rider` | `rider(EntityId) -> Option<&Rider>` | `rider_mut(EntityId)` | `set_rider(EntityId, Rider)` |
| `Stop` | `stop(EntityId) -> Option<&Stop>` | `stop_mut(EntityId)` | `set_stop(EntityId, Stop)` |
| `Route` | `route(EntityId) -> Option<&Route>` | `route_mut(EntityId)` | `set_route(EntityId, Route)` |
| `Line` | `line(EntityId) -> Option<&Line>` | `line_mut(EntityId)` | `set_line(EntityId, Line)` |
| `Patience` | `patience(EntityId) -> Option<&Patience>` | `patience_mut(EntityId)` | `set_patience(EntityId, Patience)` |
| `Preferences` | `preferences(EntityId) -> Option<&Preferences>` | -- | `set_preferences(EntityId, Preferences)` |

### Iteration Helpers

| Method | Signature | Description |
|--------|-----------|-------------|
| `iter_elevators` | `(&self) -> impl Iterator<Item = (EntityId, &Position, &Elevator)>` | Iterate all elevator entities |
| `iter_riders` | `(&self) -> impl Iterator<Item = (EntityId, &Rider)>` | Iterate all rider entities |
| `iter_riders_mut` | `(&mut self) -> impl Iterator<Item = (EntityId, &mut Rider)>` | Iterate all rider entities mutably |
| `iter_stops` | `(&self) -> impl Iterator<Item = (EntityId, &Stop)>` | Iterate all stop entities |
| `elevator_ids` | `(&self) -> Vec<EntityId>` | All elevator entity IDs |
| `rider_ids` | `(&self) -> Vec<EntityId>` | All rider entity IDs |
| `stop_ids` | `(&self) -> Vec<EntityId>` | All stop entity IDs |
| `elevator_ids_into` | `(&self, &mut Vec<EntityId>)` | Fill a buffer with elevator IDs (no allocation) |

### Stop Lookup

| Method | Signature | Description |
|--------|-----------|-------------|
| `find_stop_at_position` | `(&self, f64) -> Option<EntityId>` | Find the stop at an exact position (within epsilon) |
| `find_nearest_stop` | `(&self, f64) -> Option<EntityId>` | Find the stop nearest to a position |
| `stop_position` | `(&self, EntityId) -> Option<f64>` | Get a stop's position by entity ID |

### Extension Storage

Extensions let games attach custom typed data to simulation entities. Extension types must implement `Serialize + DeserializeOwned` for snapshot support.

| Method | Signature | Description |
|--------|-----------|-------------|
| `insert_ext` | `<T>(&mut self, EntityId, T, ExtKey<T>)` | Insert a custom component for an entity |
| `get_ext` | `<T: Clone>(&self, EntityId) -> Option<T>` | Get a clone of a custom component |
| `get_ext_ref` | `<T>(&self, EntityId) -> Option<&T>` | Get a shared reference (zero-copy) to a custom component |
| `get_ext_mut` | `<T>(&mut self, EntityId) -> Option<&mut T>` | Get a mutable reference to a custom component |
| `remove_ext` | `<T>(&mut self, EntityId) -> Option<T>` | Remove a custom component |
| `register_ext` | `<T>(&mut self, ExtKey<T>) -> ExtKey<T>` | Register an extension type for snapshot deserialization |
| `query_ext_mut` | `<T>(&mut self) -> ExtQueryMut<T>` | Create a mutable extension query builder |

### Global Resources

Resources are type-keyed singletons not attached to any entity. Useful for event channels, score trackers, or any shared state.

| Method | Signature | Description |
|--------|-----------|-------------|
| `insert_resource` | `<T>(&mut self, T)` | Insert a global resource (replaces existing) |
| `resource` | `<T>(&self) -> Option<&T>` | Get a shared reference to a resource |
| `resource_mut` | `<T>(&mut self) -> Option<&mut T>` | Get a mutable reference to a resource |
| `remove_resource` | `<T>(&mut self) -> Option<T>` | Remove a resource, returning it |

### Query Builder

The query builder provides ECS-style iteration over entities by component composition.

```rust
// All riders with a position
for (id, rider, pos) in world.query::<(EntityId, &Rider, &Position)>().iter() {
    // ...
}

// Entities with Position but without Route
for (id, pos) in world.query::<(EntityId, &Position)>()
    .without::<Route>()
    .iter()
{
    // ...
}

// Extension components (cloned)
for (id, vip) in world.query::<(EntityId, &Ext<VipTag>)>().iter() {
    // ...
}
```

| Type | Description |
|------|-------------|
| `QueryBuilder<Q>` | Returned by `world.query::<Q>()`. Chain `.with::<C>()` / `.without::<C>()` filters, then `.iter()` |
| `ExtQueryMut<T>` | Returned by `world.query_ext_mut::<T>()`. Call `.for_each_mut(\|id, val\| ...)` for mutable iteration |
| `Ext<T>` | Query fetch marker for extension components (cloned) |
| `ExtMut<T>` | Query fetch marker for mutable extension access |
| `With<C>` | Filter: entity must have component `C` |
| `Without<C>` | Filter: entity must not have component `C` |
| `ExtWith<T>` | Filter: entity must have extension `T` |
| `ExtWithout<T>` | Filter: entity must not have extension `T` |

### Disabled Entities

| Method | Signature | Description |
|--------|-----------|-------------|
| `disable` | `(&mut self, EntityId)` | Mark an entity as disabled (skipped by systems) |
| `enable` | `(&mut self, EntityId)` | Re-enable a disabled entity |
| `is_disabled` | `(&self, EntityId) -> bool` | Check if an entity is disabled |

---

## Dispatch

### DispatchStrategy Trait

```rust
pub trait DispatchStrategy: Send + Sync {
    // Required: cost of sending `car` to `stop`. None excludes the pair.
    fn rank(
        &mut self,
        car: EntityId,
        car_position: f64,
        stop: EntityId,
        stop_position: f64,
        group: &ElevatorGroup,
        manifest: &DispatchManifest,
        world: &World,
    ) -> Option<f64>;

    // Optional: per-group pre-pass with mutable world access.
    fn pre_dispatch(&mut self, group: &ElevatorGroup, manifest: &DispatchManifest, world: &mut World);

    // Optional: per-car setup called before the car's rank loop.
    fn prepare_car(&mut self, car: EntityId, car_position: f64, group: &ElevatorGroup, manifest: &DispatchManifest, world: &World);

    // Optional: policy for cars left unassigned after the Hungarian match.
    fn fallback(&mut self, car: EntityId, car_position: f64, group: &ElevatorGroup, manifest: &DispatchManifest, world: &World) -> DispatchDecision;

    // Optional: cleanup when an elevator is removed (default no-op).
    fn notify_removed(&mut self, elevator: EntityId);
}
```

### DispatchDecision

| Variant | Description |
|---------|-------------|
| `GoToStop(EntityId)` | Send the elevator to the specified stop |
| `Idle` | Remain idle |

### DispatchManifest

Contains per-rider metadata grouped by stop. Passed to dispatch strategies each tick.

| Field / Method | Type | Description |
|----------------|------|-------------|
| `waiting_at_stop` | `BTreeMap<EntityId, Vec<RiderInfo>>` | Riders waiting at each stop |
| `riding_to_stop` | `BTreeMap<EntityId, Vec<RiderInfo>>` | Riders aboard elevators, grouped by destination |
| `waiting_count_at` | `(EntityId) -> usize` | Number of riders waiting at a stop |
| `total_weight_at` | `(EntityId) -> f64` | Total weight of riders waiting at a stop |
| `riding_count_to` | `(EntityId) -> usize` | Number of riders heading to a stop |
| `has_demand` | `(EntityId) -> bool` | Whether a stop has any demand |

### RiderInfo

Metadata about a single rider, available to dispatch strategies.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `EntityId` | Rider entity ID |
| `destination` | `Option<EntityId>` | Rider's destination stop entity |
| `weight` | `f64` | Rider weight |
| `wait_ticks` | `u64` | Ticks this rider has been waiting |

### ElevatorGroup

Runtime representation of a dispatch group containing one or more lines. The flat `elevator_entities()` and `stop_entities()` accessors are derived caches (union of all lines' elevators/stops), rebuilt automatically via `rebuild_caches()`.

| Getter | Return Type | Description |
|--------|-------------|-------------|
| `id()` | `GroupId` | Unique group identifier |
| `name()` | `&str` | Human-readable group name |
| `lines()` | `&[LineInfo]` | Lines belonging to this group |
| `elevator_entities()` | `&[EntityId]` | Derived cache: all elevator entities across lines |
| `stop_entities()` | `&[EntityId]` | Derived cache: all stop entities across lines |

### LineInfo

Per-line relationship data within an `ElevatorGroup`. Denormalized cache maintained by `Simulation`; the source of truth for intrinsic line properties is the `Line` component in `World`.

| Getter | Return Type | Description |
|--------|-------------|-------------|
| `entity()` | `EntityId` | Line entity ID |
| `elevators()` | `&[EntityId]` | Elevator entities on this line |
| `serves()` | `&[EntityId]` | Stop entities served by this line |

### Built-in Strategies

| Strategy | Constructor | Description |
|----------|-------------|-------------|
| `ScanDispatch` | `ScanDispatch::new()` | SCAN algorithm -- sweeps end-to-end before reversing |
| `LookDispatch` | `LookDispatch::new()` | LOOK algorithm -- reverses at last request, not shaft end |
| `NearestCarDispatch` | `NearestCarDispatch::new()` | Assigns each call to the closest idle elevator |
| `EtdDispatch` | `EtdDispatch::new()` | Estimated Time to Destination -- minimizes total cost |

### BuiltinStrategy Enum

Serializable identifier for dispatch strategies (used in snapshots and configs).

| Variant | Description |
|---------|-------------|
| `Scan` | SCAN algorithm |
| `Look` | LOOK algorithm |
| `NearestCar` | Nearest-car algorithm |
| `Etd` | Estimated Time to Destination |
| `Custom(String)` | Custom strategy identified by name |

The `instantiate()` method creates a boxed `DispatchStrategy` from a variant (returns `None` for `Custom`).

---

## Events

Events are emitted during tick execution and buffered for consumers. Drain them with `sim.drain_events()`.

### Elevator Events

| Variant | Fields | Description |
|---------|--------|-------------|
| `ElevatorDeparted` | `elevator: EntityId`, `from_stop: EntityId`, `tick: u64` | An elevator departed from a stop |
| `ElevatorArrived` | `elevator: EntityId`, `at_stop: EntityId`, `tick: u64` | An elevator arrived at a stop |
| `DoorOpened` | `elevator: EntityId`, `tick: u64` | Doors finished opening |
| `DoorClosed` | `elevator: EntityId`, `tick: u64` | Doors finished closing |
| `PassingFloor` | `elevator: EntityId`, `stop: EntityId`, `moving_up: bool`, `tick: u64` | Elevator passed a stop without stopping |
| `ElevatorIdle` | `elevator: EntityId`, `at_stop: Option<EntityId>`, `tick: u64` | Elevator became idle |
| `CapacityChanged` | `elevator: EntityId`, `current_load: OrderedFloat<f64>`, `capacity: OrderedFloat<f64>`, `tick: u64` | Elevator load changed after board or exit |
| `DirectionIndicatorChanged` | `elevator: EntityId`, `going_up: bool`, `going_down: bool`, `tick: u64` | Direction indicator lamps changed (dispatch-driven) |

### Rider Events

| Variant | Fields | Description |
|---------|--------|-------------|
| `RiderSpawned` | `rider: EntityId`, `origin: EntityId`, `destination: EntityId`, `tick: u64` | A rider appeared at a stop |
| `RiderBoarded` | `rider: EntityId`, `elevator: EntityId`, `tick: u64` | A rider boarded an elevator |
| `RiderExited` | `rider: EntityId`, `elevator: EntityId`, `stop: EntityId`, `tick: u64` | A rider exited an elevator |
| `RiderRejected` | `rider: EntityId`, `elevator: EntityId`, `reason: RejectionReason`, `context: Option<RejectionContext>`, `tick: u64` | A rider was rejected from boarding |
| `RiderAbandoned` | `rider: EntityId`, `stop: EntityId`, `tick: u64` | A rider gave up waiting |
| `RiderEjected` | `rider: EntityId`, `elevator: EntityId`, `stop: EntityId`, `tick: u64` | A rider was ejected from a disabled/despawned elevator |
| `RiderRerouted` | `rider: EntityId`, `new_destination: EntityId`, `tick: u64` | A rider was manually rerouted |

### Dispatch Events

| Variant | Fields | Description |
|---------|--------|-------------|
| `ElevatorAssigned` | `elevator: EntityId`, `stop: EntityId`, `tick: u64` | An elevator was assigned to serve a stop |

### Topology Events

| Variant | Fields | Description |
|---------|--------|-------------|
| `StopAdded` | `stop: EntityId`, `line: EntityId`, `group: GroupId`, `tick: u64` | A new stop was added at runtime |
| `ElevatorAdded` | `elevator: EntityId`, `line: EntityId`, `group: GroupId`, `tick: u64` | A new elevator was added at runtime |
| `LineAdded` | `line: EntityId`, `group: GroupId`, `tick: u64` | A new line was added to the simulation |
| `LineRemoved` | `line: EntityId`, `group: GroupId`, `tick: u64` | A line was removed from the simulation |
| `LineReassigned` | `line: EntityId`, `old_group: GroupId`, `new_group: GroupId`, `tick: u64` | A line was reassigned to a different group |
| `ElevatorReassigned` | `elevator: EntityId`, `old_line: EntityId`, `new_line: EntityId`, `tick: u64` | An elevator was reassigned to a different line |
| `EntityDisabled` | `entity: EntityId`, `tick: u64` | An entity was disabled |
| `EntityEnabled` | `entity: EntityId`, `tick: u64` | An entity was re-enabled |
| `RouteInvalidated` | `rider: EntityId`, `affected_stop: EntityId`, `reason: RouteInvalidReason`, `tick: u64` | A rider's route was invalidated by topology change |

### RouteInvalidReason

| Variant | Description |
|---------|-------------|
| `StopDisabled` | A stop on the route was disabled |
| `NoAlternative` | No alternative stop is available in the same group |

### EventBus

Internal event bus used by the simulation. Games typically interact through `sim.drain_events()` instead.

| Method | Signature | Description |
|--------|-----------|-------------|
| `emit` | `(&mut self, Event)` | Push an event |
| `drain` | `(&mut self) -> Vec<Event>` | Return and clear all pending events |
| `peek` | `(&self) -> &[Event]` | View pending events without clearing |

### EventChannel\<T\>

Typed event channel for game-specific events. Insert as a world resource.

| Method | Signature | Description |
|--------|-----------|-------------|
| `new` | `() -> Self` | Create an empty channel |
| `emit` | `(&mut self, T)` | Emit an event |
| `drain` | `(&mut self) -> Vec<T>` | Drain all pending events |
| `peek` | `(&self) -> &[T]` | Peek at pending events |
| `is_empty` | `(&self) -> bool` | Check if channel is empty |
| `len` | `(&self) -> usize` | Number of pending events |

---

## Metrics

### Metrics (Global)

Aggregated simulation metrics, updated each tick. Query via `sim.metrics()`.

| Getter | Return Type | Description |
|--------|-------------|-------------|
| `avg_wait_time()` | `f64` | Average wait time in ticks (spawn to board) |
| `avg_ride_time()` | `f64` | Average ride time in ticks (board to exit) |
| `max_wait_time()` | `u64` | Maximum wait time observed (ticks) |
| `throughput()` | `u64` | Riders delivered in the current throughput window |
| `total_delivered()` | `u64` | Total riders delivered |
| `total_abandoned()` | `u64` | Total riders who abandoned |
| `total_spawned()` | `u64` | Total riders spawned |
| `abandonment_rate()` | `f64` | Abandonment rate (0.0 - 1.0) |
| `total_distance()` | `f64` | Total distance traveled by all elevators |
| `total_moves()` | `u64` | Total rounded-floor transitions across all elevators |
| `throughput_window_ticks()` | `u64` | Window size for throughput calculation (default: 3600) |

Builder method: `Metrics::new().with_throughput_window(window_ticks)`.

### TaggedMetric

Per-tag metric accumulator. Same core metrics as `Metrics` but scoped to entities sharing a tag. Query via `sim.metrics_for_tag("zone:lobby")`.

| Getter | Return Type | Description |
|--------|-------------|-------------|
| `avg_wait_time()` | `f64` | Average wait time for tagged riders |
| `total_delivered()` | `u64` | Total delivered with this tag |
| `total_abandoned()` | `u64` | Total abandoned with this tag |
| `total_spawned()` | `u64` | Total spawned with this tag |
| `max_wait_time()` | `u64` | Maximum wait time for tagged riders |

### MetricTags

Tag storage and per-tag accumulators. Stored as a world resource.

| Method | Signature | Description |
|--------|-----------|-------------|
| `tag` | `(&mut self, EntityId, impl Into<String>)` | Attach a tag to an entity |
| `untag` | `(&mut self, EntityId, &str)` | Remove a tag from an entity |
| `tags_for` | `(&self, EntityId) -> &[String]` | Get all tags for an entity |
| `metric` | `(&self, &str) -> Option<&TaggedMetric>` | Get the metric accumulator for a tag |
| `all_tags` | `(&self) -> impl Iterator<Item = &str>` | Iterate all registered tags |

---

## Configuration

All config types derive `Serialize + Deserialize` and are loadable from RON files.

### SimConfig

| Field | Type | Description |
|-------|------|-------------|
| `building` | `BuildingConfig` | Building layout (stops) |
| `elevators` | `Vec<ElevatorConfig>` | Elevator cars to install |
| `simulation` | `SimulationParams` | Global timing parameters |
| `passenger_spawning` | `PassengerSpawnConfig` | Spawning parameters (advisory, for game layer) |

### BuildingConfig

| Field | Type | Description |
|-------|------|-------------|
| `name` | `String` | Human-readable building name |
| `stops` | `Vec<StopConfig>` | Ordered list of stops (at least one required) |

### StopConfig

| Field | Type | Description |
|-------|------|-------------|
| `id` | `StopId` | Unique stop identifier |
| `name` | `String` | Human-readable stop name |
| `position` | `f64` | Absolute position along the shaft axis |

### ElevatorConfig

| Field | Type | Description |
|-------|------|-------------|
| `id` | `u32` | Numeric identifier (mapped to `EntityId` at init) |
| `name` | `String` | Human-readable elevator name |
| `max_speed` | `f64` | Maximum travel speed (distance units/second) |
| `acceleration` | `f64` | Acceleration rate (distance units/second^2) |
| `deceleration` | `f64` | Deceleration rate (distance units/second^2) |
| `weight_capacity` | `f64` | Maximum weight the car can carry |
| `starting_stop` | `StopId` | Stop where the elevator starts |
| `door_open_ticks` | `u32` | Ticks doors remain fully open |
| `door_transition_ticks` | `u32` | Ticks for a door open/close transition |

### SimulationParams

| Field | Type | Description |
|-------|------|-------------|
| `ticks_per_second` | `f64` | Simulation ticks per real-time second |

### PassengerSpawnConfig

| Field | Type | Description |
|-------|------|-------------|
| `mean_interval_ticks` | `u32` | Mean interval between spawns (for Poisson traffic generators) |
| `weight_range` | `(f64, f64)` | (min, max) weight range for randomly spawned passengers |

### LineConfig

| Field | Type | Description |
|-------|------|-------------|
| `id` | `u32` | Unique line identifier (within the config) |
| `name` | `String` | Human-readable name |
| `serves` | `Vec<StopId>` | Stops served by this line |
| `elevators` | `Vec<ElevatorConfig>` | Elevators on this line |
| `orientation` | `Orientation` | Physical orientation (defaults to `Vertical`) |
| `position` | `Option<SpatialPosition>` | Optional floor-plan position |
| `min_position` | `Option<f64>` | Lowest reachable position (auto-computed from stops if `None`) |
| `max_position` | `Option<f64>` | Highest reachable position (auto-computed from stops if `None`) |
| `max_cars` | `Option<usize>` | Max cars on this line (`None` = unlimited) |

### GroupConfig

| Field | Type | Description |
|-------|------|-------------|
| `id` | `u32` | Unique group identifier |
| `name` | `String` | Human-readable name |
| `lines` | `Vec<u32>` | Line IDs belonging to this group (references `LineConfig::id`) |
| `dispatch` | `BuiltinStrategy` | Dispatch strategy for this group |

---

## Components

Entity components are the data attached to simulation entities. Built-in components are managed by the simulation; games add custom data via extensions.

### Component Types

| Component | Description |
|-----------|-------------|
| `Position` | Position along the shaft axis (accessed via `value()` getter) |
| `Velocity` | Velocity along the shaft axis, signed (accessed via `value()` getter) |
| `Elevator` | Elevator car state and physics parameters |
| `Rider` | Rider core data (weight, phase, origin, timing) |
| `Stop` | Stop data (accessed via `name()` and `position()` getters) |
| `Route` | Multi-leg route with `legs: Vec<RouteLeg>` and `current_leg: usize` |
| `Line` | Physical path component (shaft, tether, track) |
| `Patience` | Wait-limit tracking (`max_wait_ticks: u64`, `waited_ticks: u64`) |
| `Preferences` | Boarding preferences (`skip_full_elevator: bool`, `max_crowding_factor: f64`) |

### ElevatorPhase

| Variant | Description |
|---------|-------------|
| `Idle` | Parked with no pending requests |
| `MovingToStop(EntityId)` | Travelling toward a specific stop |
| `DoorOpening` | Doors are currently opening |
| `Loading` | Doors open; riders may board or exit |
| `DoorClosing` | Doors are currently closing |
| `Stopped` | Stopped at a floor (doors closed, awaiting dispatch) |

### Elevator Getters

| Getter | Return Type | Description |
|--------|-------------|-------------|
| `phase()` | `ElevatorPhase` | Current operational phase |
| `door()` | `&DoorState` | Door finite-state machine |
| `max_speed()` | `f64` | Maximum travel speed |
| `acceleration()` | `f64` | Acceleration rate |
| `deceleration()` | `f64` | Deceleration rate |
| `weight_capacity()` | `f64` | Maximum weight capacity |
| `current_load()` | `f64` | Total weight currently aboard |
| `riders()` | `&[EntityId]` | Entity IDs of riders aboard |
| `target_stop()` | `Option<EntityId>` | Stop the car is heading toward |
| `door_transition_ticks()` | `u32` | Ticks for a door transition |
| `door_open_ticks()` | `u32` | Ticks the door stays open |
| `line()` | `EntityId` | Line entity this car belongs to |
| `going_up()` | `bool` | Up-direction indicator lamp (set by dispatch; both lamps lit when idle) |
| `going_down()` | `bool` | Down-direction indicator lamp (set by dispatch; both lamps lit when idle) |
| `move_count()` | `u64` | Count of rounded-floor transitions (passing-floor crossings + arrivals) |

### Line Getters

| Getter | Return Type | Description |
|--------|-------------|-------------|
| `name()` | `&str` | Human-readable name |
| `group()` | `GroupId` | Dispatch group this line belongs to |
| `orientation()` | `Orientation` | Physical orientation |
| `position()` | `Option<&SpatialPosition>` | Optional floor-plan position |
| `min_position()` | `f64` | Lowest reachable position along the line axis |
| `max_position()` | `f64` | Highest reachable position along the line axis |
| `max_cars()` | `Option<usize>` | Maximum number of cars allowed on this line |

### Direction

Direction of movement along a line axis.

| Variant | Description |
|---------|-------------|
| `Up` | Moving toward higher positions |
| `Down` | Moving toward lower positions |

Method: `reversed()` returns the opposite direction.

### RiderPhase

| Variant | Description |
|---------|-------------|
| `Waiting` | Waiting at a stop |
| `Boarding(EntityId)` | Boarding an elevator (transient, one tick) |
| `Riding(EntityId)` | Riding in an elevator |
| `Exiting(EntityId)` | Exiting an elevator (transient, one tick) |
| `Walking` | Walking between transfer stops |
| `Arrived` | Reached final destination |
| `Abandoned` | Gave up waiting |

### Rider Getters

| Getter | Return Type | Description |
|--------|-------------|-------------|
| `weight()` | `f64` | Weight contributed to elevator load |
| `phase()` | `RiderPhase` | Current lifecycle phase |
| `current_stop()` | `Option<EntityId>` | Stop the rider is at (while Waiting/Arrived/Abandoned) |
| `spawn_tick()` | `u64` | Tick when this rider was spawned |
| `board_tick()` | `Option<u64>` | Tick when this rider boarded (for ride-time metrics) |

### Route and RouteLeg

| Field / Method | Type | Description |
|----------------|------|-------------|
| `legs` | `Vec<RouteLeg>` | Ordered legs of the route |
| `current_leg` | `usize` | Index of the leg currently being traversed |
| `direct(from, to, GroupId)` | `-> Route` | Create a single-leg route |
| `current()` | `-> Option<&RouteLeg>` | Get the current leg |
| `advance()` | `-> bool` | Advance to the next leg |
| `is_complete()` | `-> bool` | Whether all legs have been completed |
| `current_destination()` | `-> Option<EntityId>` | Destination of the current leg |

### RouteLeg Fields

| Field | Type | Description |
|-------|------|-------------|
| `from` | `EntityId` | Origin stop entity |
| `to` | `EntityId` | Destination stop entity |
| `via` | `TransportMode` | How to travel this leg |

### TransportMode

| Variant | Description |
|---------|-------------|
| `Group(GroupId)` | Use any elevator in the given dispatch group |
| `Line(EntityId)` | Use a specific line (pinned routing) |
| `Walk` | Walk between adjacent stops |

---

## Identifiers

| Type | Wraps | Description |
|------|-------|-------------|
| `EntityId` | Generational `SlotMap` key | Universal entity identifier, used across all component storages. Allocated by `world.spawn()` |
| `StopId` | `StopId(u32)` | Config-level stop identifier. Mapped to an `EntityId` at construction time via `sim.stop_entity(StopId)` |
| `GroupId` | `GroupId(u32)` | Elevator group identifier. `GroupId(0)` is the default group |

---

## Error Types

### SimError

| Variant | Fields | Description |
|---------|--------|-------------|
| `InvalidConfig` | `field: &'static str`, `reason: String` | Configuration is invalid |
| `EntityNotFound` | `EntityId` | A referenced entity does not exist |
| `StopNotFound` | `StopId` | A referenced stop ID does not exist |
| `GroupNotFound` | `GroupId` | A referenced group does not exist |
| `RouteOriginMismatch` | `expected_origin: EntityId`, `route_origin: EntityId` | Route origin does not match expected origin |
| `LineDoesNotServeStop` | `line_or_car: EntityId`, `stop: EntityId` | Elevator's line does not serve the target stop |
| `HallCallNotFound` | `stop: EntityId`, `direction: CallDirection` | No hall call at that stop and direction |
| `WrongRiderPhase` | `rider: EntityId`, `expected: RiderPhaseKind`, `actual: RiderPhaseKind` | Rider in wrong lifecycle phase for operation |
| `RiderHasNoStop` | `EntityId` | Rider has no current stop when one is required |
| `EmptyRoute` | — | Route has no legs |
| `LineNotFound` | `EntityId` | A referenced line entity does not exist |
| `NoRoute` | `origin: EntityId`, `destination: EntityId` | No route exists between origin and destination across any group |
| `AmbiguousRoute` | `origin: EntityId`, `destination: EntityId` | Multiple groups serve both origin and destination — caller must specify |

`SimError` implements `std::error::Error` and `Display`. It also has `From<EntityId>`, `From<StopId>`, and `From<GroupId>` conversions.

### RejectionReason

| Variant | Description |
|---------|-------------|
| `OverCapacity` | Rider's weight exceeds remaining elevator capacity |
| `PreferenceBased` | Rider's boarding preferences prevented boarding |

### RejectionContext

Numeric details of a rejection. Fields use `OrderedFloat<f64>` (for `Eq` on the event).

| Field | Type | Description |
|-------|------|-------------|
| `attempted_weight` | `OrderedFloat<f64>` | Weight the rider attempted to add |
| `current_load` | `OrderedFloat<f64>` | Current load on the elevator |
| `capacity` | `OrderedFloat<f64>` | Maximum weight capacity |

---

## Snapshots

### WorldSnapshot

Serializable snapshot of the entire simulation state. Capture with `sim.snapshot()`, restore with `snapshot.restore(custom_factory)`.

| Field | Type | Description |
|-------|------|-------------|
| `tick` | `u64` | Simulation tick at capture time |
| `dt` | `f64` | Time delta per tick |
| `entities` | `Vec<EntitySnapshot>` | All entity data |
| `groups` | `Vec<GroupSnapshot>` | Elevator group data |
| `stop_lookup` | `HashMap<StopId, usize>` | Stop ID to entity index mapping |
| `metrics` | `Metrics` | Global metrics at capture time |
| `metric_tags` | `MetricTags` | Per-tag metrics and entity-tag associations |
| `extensions` | `HashMap<String, HashMap<EntityId, String>>` | Serialized extension data |
| `ticks_per_second` | `f64` | Tick rate for `TimeAdapter` reconstruction |

| Method | Signature | Description |
|--------|-----------|-------------|
| `restore` | `(self, Option<&dyn Fn(&str) -> Option<Box<dyn DispatchStrategy>>>) -> Simulation` | Restore a simulation from this snapshot |

Built-in strategies are auto-restored. For custom strategies, provide a factory function.

---

## TimeAdapter

Converts between simulation ticks and wall-clock time. Access via `sim.time()`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `new` | `(f64) -> Self` | Create with the given tick rate |
| `ticks_to_seconds` | `(u64) -> f64` | Convert ticks to seconds |
| `seconds_to_ticks` | `(f64) -> u64` | Convert seconds to ticks (rounded) |
| `duration_to_ticks` | `(Duration) -> u64` | Convert a `Duration` to ticks (rounded) |
| `ticks_to_duration` | `(u64) -> Duration` | Convert ticks to a `Duration` |
| `ticks_per_second` | `() -> f64` | The configured tick rate |

---

## Phase

Simulation phase identifiers for hook registration.

| Variant | Description |
|---------|-------------|
| `AdvanceTransient` | Advance transient rider states (Boarding to Riding, Exiting to Arrived) |
| `Dispatch` | Assign idle elevators to stops via dispatch strategy |
| `Movement` | Update elevator position and velocity |
| `Doors` | Tick door finite-state machines |
| `Loading` | Board and exit riders |
| `Metrics` | Aggregate metrics from tick events |

---

## Traffic Generation

Available when the `traffic` feature is enabled (on by default). See the [Traffic Generation](traffic-generation.md) chapter for a guided walkthrough.

### TrafficPattern

Preset origin/destination distributions.

| Variant | Description |
|---------|-------------|
| `Uniform` | Equal probability for all pairs |
| `UpPeak` | 80% from lobby, 20% inter-floor |
| `DownPeak` | 80% to lobby, 20% inter-floor |
| `Lunchtime` | 40% upper→mid, 40% mid→upper, 20% random |
| `Mixed` | 30% up-peak, 30% down-peak, 40% inter-floor |

| Method | Signature | Description |
|--------|-----------|-------------|
| `sample` | `(&self, &[EntityId], &mut impl Rng) -> Option<(EntityId, EntityId)>` | Sample a pair from entity IDs |
| `sample_stop_ids` | `(&self, &[StopId], &mut impl Rng) -> Option<(StopId, StopId)>` | Sample a pair from config stop IDs |

### TrafficSchedule

Time-varying pattern selection.

| Method | Signature | Description |
|--------|-----------|-------------|
| `new` | `(Vec<(Range<u64>, TrafficPattern)>) -> Self` | Build from segment list |
| `with_fallback` | `(self, TrafficPattern) -> Self` | Set the out-of-range fallback |
| `constant` | `(TrafficPattern) -> Self` | Schedule with a single pattern for all ticks |
| `office_day` | `(ticks_per_hour: u64) -> Self` | 9-hour office day preset |
| `pattern_at` | `(&self, u64) -> &TrafficPattern` | Get the active pattern at a tick |
| `sample` | `(&self, u64, &[EntityId], &mut impl Rng) -> Option<(EntityId, EntityId)>` | Sample using the active pattern |
| `sample_stop_ids` | `(&self, u64, &[StopId], &mut impl Rng) -> Option<(StopId, StopId)>` | Same, by stop ID |

### TrafficSource

Trait for external traffic generators.

```rust,ignore
pub trait TrafficSource {
    fn generate(&mut self, tick: u64) -> Vec<SpawnRequest>;
}
```

### SpawnRequest

```rust,ignore
pub struct SpawnRequest {
    pub origin: StopId,
    pub destination: StopId,
    pub weight: f64,
}
```

### PoissonSource

Poisson-arrival traffic generator.

| Method | Signature | Description |
|--------|-----------|-------------|
| `new` | `(Vec<StopId>, TrafficSchedule, u32, (f64, f64)) -> Self` | Build with stops, schedule, mean interval, weight range |
| `from_config` | `(&SimConfig) -> Self` | Build from simulation config |
| `with_schedule` | `(self, TrafficSchedule) -> Self` | Replace the schedule |
| `with_mean_interval` | `(self, u32) -> Self` | Replace the mean arrival interval |
| `with_weight_range` | `(self, (f64, f64)) -> Self` | Replace the weight range (min/max auto-swapped) |
| `generate` | `(&mut self, u64) -> Vec<SpawnRequest>` | Generate spawn requests for a tick (from `TrafficSource`) |
