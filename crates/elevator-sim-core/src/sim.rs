//! Top-level simulation runner and tick loop.

use crate::components::{
    Elevator, ElevatorPhase, Position, Rider, RiderPhase, Route, Stop, Velocity,
};
use crate::config::SimConfig;
use crate::dispatch::{DispatchStrategy, ElevatorGroup};
use crate::door::DoorState;
use crate::entity::EntityId;
use crate::error::SimError;
use crate::events::{Event, EventBus};
use crate::hooks::{Phase, PhaseHooks};
use crate::ids::GroupId;
use crate::metrics::Metrics;
use crate::stop::StopId;
use crate::systems::PhaseContext;
use crate::time::TimeAdapter;
use crate::world::World;
use std::collections::{BTreeMap, HashMap, HashSet};
use std::fmt;

/// Parameters for creating a new elevator at runtime.
#[derive(Debug, Clone)]
pub struct ElevatorParams {
    /// Maximum travel speed (distance/tick).
    pub max_speed: f64,
    /// Acceleration rate (distance/tick^2).
    pub acceleration: f64,
    /// Deceleration rate (distance/tick^2).
    pub deceleration: f64,
    /// Maximum weight the car can carry.
    pub weight_capacity: f64,
    /// Ticks for a door open/close transition.
    pub door_transition_ticks: u32,
    /// Ticks the door stays fully open.
    pub door_open_ticks: u32,
}

/// The core simulation state, advanced by calling `step()`.
pub struct Simulation {
    /// The ECS world containing all entity data.
    world: World,
    /// Internal event bus — only holds events from the current tick.
    events: EventBus,
    /// Events from completed ticks, available to consumers via `drain_events()`.
    pending_output: Vec<Event>,
    /// Current simulation tick.
    tick: u64,
    /// Time delta per tick (seconds).
    dt: f64,
    /// Elevator groups in this simulation.
    groups: Vec<ElevatorGroup>,
    /// Config `StopId` to `EntityId` mapping for spawn helpers.
    stop_lookup: HashMap<StopId, EntityId>,
    /// Dispatch strategies keyed by group.
    dispatchers: BTreeMap<GroupId, Box<dyn DispatchStrategy>>,
    /// Aggregated metrics.
    metrics: Metrics,
    /// Time conversion utility.
    time: TimeAdapter,
    /// Lifecycle hooks (before/after each phase).
    hooks: PhaseHooks,
}

impl Simulation {
    /// Create a new simulation from config and a dispatch strategy.
    ///
    /// Returns `Err` if the config is invalid (zero stops, duplicate IDs,
    /// negative speeds, etc.).
    pub fn new(
        config: &SimConfig,
        dispatch: Box<dyn DispatchStrategy>,
    ) -> Result<Self, SimError> {
        Self::new_with_hooks(config, dispatch, PhaseHooks::default())
    }

    /// Create a simulation with pre-configured lifecycle hooks.
    ///
    /// Used by [`SimulationBuilder`](crate::builder::SimulationBuilder).
    pub(crate) fn new_with_hooks(
        config: &SimConfig,
        dispatch: Box<dyn DispatchStrategy>,
        hooks: PhaseHooks,
    ) -> Result<Self, SimError> {
        Self::validate_config(config)?;

        let mut world = World::new();

        // Create stop entities.
        let mut stop_lookup: HashMap<StopId, EntityId> = HashMap::new();
        for sc in &config.building.stops {
            let eid = world.spawn();
            world.set_stop(
                eid,
                Stop {
                    name: sc.name.clone(),
                    position: sc.position,
                },
            );
            world.set_position(eid, Position { value: sc.position });
            stop_lookup.insert(sc.id, eid);
        }

        // Build sorted-stops index for O(log n) PassingFloor detection.
        let mut sorted: Vec<(f64, EntityId)> = world
            .iter_stops()
            .map(|(eid, stop)| (stop.position, eid))
            .collect();
        sorted.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));
        world.insert_resource(crate::world::SortedStops(sorted));

        // Create elevator entities.
        let mut elevator_entities = Vec::new();
        for ec in &config.elevators {
            let eid = world.spawn();
            let start_pos = config
                .building
                .stops
                .iter()
                .find(|s| s.id == ec.starting_stop)
                .map_or(0.0, |s| s.position);
            world.set_position(eid, Position { value: start_pos });
            world.set_velocity(eid, Velocity { value: 0.0 });
            world.set_elevator(
                eid,
                Elevator {
                    phase: ElevatorPhase::Idle,
                    door: DoorState::Closed,
                    max_speed: ec.max_speed,
                    acceleration: ec.acceleration,
                    deceleration: ec.deceleration,
                    weight_capacity: ec.weight_capacity,
                    current_load: 0.0,
                    riders: Vec::new(),
                    target_stop: None,
                    door_transition_ticks: ec.door_transition_ticks,
                    door_open_ticks: ec.door_open_ticks,
                    group: GroupId(0),
                },
            );
            elevator_entities.push(eid);
        }

        let group = ElevatorGroup {
            id: GroupId(0),
            name: "Default".into(),
            elevator_entities,
            stop_entities: stop_lookup.values().copied().collect(),
        };

        let mut dispatchers = BTreeMap::new();
        dispatchers.insert(GroupId(0), dispatch);

        let dt = 1.0 / config.simulation.ticks_per_second;

        Ok(Self {
            world,
            events: EventBus::default(),
            pending_output: Vec::new(),
            tick: 0,
            dt,
            groups: vec![group],
            stop_lookup,
            dispatchers,
            metrics: Metrics::new(),
            time: TimeAdapter::new(config.simulation.ticks_per_second),
            hooks,
        })
    }

    /// Validate configuration before constructing the simulation.
    fn validate_config(config: &SimConfig) -> Result<(), SimError> {
        if config.building.stops.is_empty() {
            return Err(SimError::InvalidConfig {
                field: "building.stops",
                reason: "at least one stop is required".into(),
            });
        }

        // Check for duplicate stop IDs.
        let mut seen_ids = HashSet::new();
        for stop in &config.building.stops {
            if !seen_ids.insert(stop.id) {
                return Err(SimError::InvalidConfig {
                    field: "building.stops",
                    reason: format!("duplicate StopId({:?})", stop.id),
                });
            }
        }

        if config.elevators.is_empty() {
            return Err(SimError::InvalidConfig {
                field: "elevators",
                reason: "at least one elevator is required".into(),
            });
        }

        for elev in &config.elevators {
            if elev.max_speed <= 0.0 {
                return Err(SimError::InvalidConfig {
                    field: "elevators.max_speed",
                    reason: format!("must be positive, got {}", elev.max_speed),
                });
            }
            if elev.acceleration <= 0.0 {
                return Err(SimError::InvalidConfig {
                    field: "elevators.acceleration",
                    reason: format!("must be positive, got {}", elev.acceleration),
                });
            }
            if elev.deceleration <= 0.0 {
                return Err(SimError::InvalidConfig {
                    field: "elevators.deceleration",
                    reason: format!("must be positive, got {}", elev.deceleration),
                });
            }
            if elev.weight_capacity <= 0.0 {
                return Err(SimError::InvalidConfig {
                    field: "elevators.weight_capacity",
                    reason: format!("must be positive, got {}", elev.weight_capacity),
                });
            }
            if !config.building.stops.iter().any(|s| s.id == elev.starting_stop) {
                return Err(SimError::InvalidConfig {
                    field: "elevators.starting_stop",
                    reason: format!(
                        "references non-existent StopId({:?})",
                        elev.starting_stop
                    ),
                });
            }
        }

        if config.simulation.ticks_per_second <= 0.0 {
            return Err(SimError::InvalidConfig {
                field: "simulation.ticks_per_second",
                reason: format!(
                    "must be positive, got {}",
                    config.simulation.ticks_per_second
                ),
            });
        }

        Ok(())
    }

    // ── Accessors ────────────────────────────────────────────────────

    /// Get a shared reference to the world.
    #[must_use] 
    pub const fn world(&self) -> &World {
        &self.world
    }

    /// Get a mutable reference to the world.
    ///
    /// Exposed for advanced use cases (manual rider management, custom
    /// component attachment). Prefer `spawn_rider` / `spawn_rider_by_stop_id`
    /// for standard operations.
    pub const fn world_mut(&mut self) -> &mut World {
        &mut self.world
    }

    /// Current simulation tick.
    #[must_use] 
    pub const fn current_tick(&self) -> u64 {
        self.tick
    }

    /// Time delta per tick (seconds).
    #[must_use] 
    pub const fn dt(&self) -> f64 {
        self.dt
    }

    /// Get current simulation metrics.
    #[must_use] 
    pub const fn metrics(&self) -> &Metrics {
        &self.metrics
    }

    /// The time adapter for tick↔wall-clock conversion.
    #[must_use] 
    pub const fn time(&self) -> &TimeAdapter {
        &self.time
    }

    /// Get the elevator groups.
    #[must_use] 
    pub fn groups(&self) -> &[ElevatorGroup] {
        &self.groups
    }

    /// Resolve a config `StopId` to its runtime `EntityId`.
    #[must_use] 
    pub fn stop_entity(&self, id: StopId) -> Option<EntityId> {
        self.stop_lookup.get(&id).copied()
    }

    /// Peek at events pending for consumer retrieval.
    #[must_use] 
    pub fn pending_events(&self) -> &[Event] {
        &self.pending_output
    }

    // ── Dispatch management ──────────────────────────────────────────

    /// Replace the dispatch strategy for a group.
    pub fn set_dispatch(&mut self, group: GroupId, strategy: Box<dyn DispatchStrategy>) {
        self.dispatchers.insert(group, strategy);
    }

    // ── Rider spawning ───────────────────────────────────────────────

    /// Spawn a rider at the given origin stop entity, headed to destination stop entity.
    pub fn spawn_rider(
        &mut self,
        origin: EntityId,
        destination: EntityId,
        weight: f64,
    ) -> EntityId {
        let eid = self.world.spawn();
        self.world.set_rider(
            eid,
            Rider {
                weight,
                phase: RiderPhase::Waiting,
                current_stop: Some(origin),
                spawn_tick: self.tick,
                board_tick: None,
            },
        );
        self.world
            .set_route(eid, Route::direct(origin, destination, GroupId(0)));
        self.events.emit(Event::RiderSpawned {
            rider: eid,
            origin,
            destination,
            tick: self.tick,
        });
        eid
    }

    /// Convenience: spawn a rider by config `StopId`.
    ///
    /// Returns `Err` if either stop ID is not found.
    pub fn spawn_rider_by_stop_id(
        &mut self,
        origin: StopId,
        destination: StopId,
        weight: f64,
    ) -> Result<EntityId, SimError> {
        let origin_eid = self
            .stop_lookup
            .get(&origin)
            .copied()
            .ok_or(SimError::StopNotFound(origin))?;
        let dest_eid = self
            .stop_lookup
            .get(&destination)
            .copied()
            .ok_or(SimError::StopNotFound(destination))?;
        Ok(self.spawn_rider(origin_eid, dest_eid, weight))
    }

    /// Drain all pending events from completed ticks.
    ///
    /// Events emitted during `step()` (or per-phase methods) are buffered
    /// and made available here after `advance_tick()` is called.
    /// Events emitted outside the tick loop (e.g., `spawn_rider`, `disable`)
    /// are also included.
    pub fn drain_events(&mut self) -> Vec<Event> {
        // Flush any events still in the bus (from spawn_rider, disable, etc.)
        self.pending_output.extend(self.events.drain());
        std::mem::take(&mut self.pending_output)
    }

    // ── Dynamic topology ────────────────────────────────────────────

    /// Add a new stop to a group at runtime. Returns its `EntityId`.
    ///
    /// Runtime-added stops have no `StopId` — they are identified purely
    /// by `EntityId`. The `stop_lookup` (config `StopId` → `EntityId`)
    /// is not updated.
    pub fn add_stop(
        &mut self,
        name: String,
        position: f64,
        group_id: GroupId,
    ) -> Result<EntityId, SimError> {
        let group = self
            .groups
            .iter_mut()
            .find(|g| g.id == group_id)
            .ok_or(SimError::GroupNotFound(group_id))?;

        let eid = self.world.spawn();
        self.world
            .set_stop(eid, Stop { name, position });
        self.world
            .set_position(eid, Position { value: position });
        group.stop_entities.push(eid);

        // Maintain sorted-stops index for O(log n) PassingFloor detection.
        if let Some(sorted) = self.world.resource_mut::<crate::world::SortedStops>() {
            let idx = sorted.0.partition_point(|&(p, _)| p < position);
            sorted.0.insert(idx, (position, eid));
        }

        self.events.emit(Event::StopAdded {
            stop: eid,
            group: group_id,
            tick: self.tick,
        });
        Ok(eid)
    }

    /// Add a new elevator to a group at runtime. Returns its `EntityId`.
    pub fn add_elevator(
        &mut self,
        params: &ElevatorParams,
        group_id: GroupId,
        starting_position: f64,
    ) -> Result<EntityId, SimError> {
        let group = self
            .groups
            .iter_mut()
            .find(|g| g.id == group_id)
            .ok_or(SimError::GroupNotFound(group_id))?;

        let eid = self.world.spawn();
        self.world
            .set_position(eid, Position { value: starting_position });
        self.world
            .set_velocity(eid, Velocity { value: 0.0 });
        self.world.set_elevator(
            eid,
            Elevator {
                phase: ElevatorPhase::Idle,
                door: DoorState::Closed,
                max_speed: params.max_speed,
                acceleration: params.acceleration,
                deceleration: params.deceleration,
                weight_capacity: params.weight_capacity,
                current_load: 0.0,
                riders: Vec::new(),
                target_stop: None,
                door_transition_ticks: params.door_transition_ticks,
                door_open_ticks: params.door_open_ticks,
                group: group_id,
            },
        );
        group.elevator_entities.push(eid);

        self.events.emit(Event::ElevatorAdded {
            elevator: eid,
            group: group_id,
            tick: self.tick,
        });
        Ok(eid)
    }

    /// Disable an entity. Disabled entities are skipped by all systems.
    ///
    /// If the entity is an elevator in motion, it is reset to `Idle` with
    /// zero velocity to prevent stale target references on re-enable.
    ///
    /// Emits `EntityDisabled`. Returns `Err` if the entity does not exist.
    pub fn disable(&mut self, id: EntityId) -> Result<(), SimError> {
        if !self.world.is_alive(id) {
            return Err(SimError::EntityNotFound(id));
        }
        // If this is an elevator, eject all riders and reset state.
        if let Some(car) = self.world.elevator(id) {
            let rider_ids = car.riders.clone();
            let pos = self.world.position(id).map_or(0.0, |p| p.value);
            let nearest_stop = self.world.find_nearest_stop(pos);

            for rid in &rider_ids {
                if let Some(r) = self.world.rider_mut(*rid) {
                    r.phase = RiderPhase::Waiting;
                    r.current_stop = nearest_stop;
                    r.board_tick = None;
                }
                if let Some(stop) = nearest_stop {
                    self.events.emit(Event::RiderEjected {
                        rider: *rid,
                        elevator: id,
                        stop,
                        tick: self.tick,
                    });
                }
            }

            if let Some(car) = self.world.elevator_mut(id) {
                car.riders.clear();
                car.current_load = 0.0;
                car.phase = ElevatorPhase::Idle;
                car.target_stop = None;
            }
        }
        if let Some(vel) = self.world.velocity_mut(id) {
            vel.value = 0.0;
        }
        self.world.disable(id);
        self.events.emit(Event::EntityDisabled {
            entity: id,
            tick: self.tick,
        });
        Ok(())
    }

    /// Re-enable a disabled entity.
    ///
    /// Emits `EntityEnabled`. Returns `Err` if the entity does not exist.
    pub fn enable(&mut self, id: EntityId) -> Result<(), SimError> {
        if !self.world.is_alive(id) {
            return Err(SimError::EntityNotFound(id));
        }
        self.world.enable(id);
        self.events.emit(Event::EntityEnabled {
            entity: id,
            tick: self.tick,
        });
        Ok(())
    }

    /// Check if an entity is disabled.
    #[must_use] 
    pub fn is_disabled(&self, id: EntityId) -> bool {
        self.world.is_disabled(id)
    }

    // ── Sub-stepping ────────────────────────────────────────────────

    /// Get the dispatch strategies map (for advanced sub-stepping).
    #[must_use] 
    pub fn dispatchers(&self) -> &BTreeMap<GroupId, Box<dyn DispatchStrategy>> {
        &self.dispatchers
    }

    /// Get the dispatch strategies map mutably (for advanced sub-stepping).
    pub fn dispatchers_mut(&mut self) -> &mut BTreeMap<GroupId, Box<dyn DispatchStrategy>> {
        &mut self.dispatchers
    }

    /// Get a mutable reference to the event bus.
    pub const fn events_mut(&mut self) -> &mut EventBus {
        &mut self.events
    }

    /// Get a mutable reference to the metrics.
    pub const fn metrics_mut(&mut self) -> &mut Metrics {
        &mut self.metrics
    }

    /// Build the `PhaseContext` for the current tick.
    #[must_use] 
    pub const fn phase_context(&self) -> PhaseContext {
        PhaseContext {
            tick: self.tick,
            dt: self.dt,
        }
    }

    /// Run only the `advance_transient` phase (with hooks).
    pub fn run_advance_transient(&mut self) {
        self.hooks.run_before(Phase::AdvanceTransient, &mut self.world);
        let ctx = self.phase_context();
        crate::systems::advance_transient::run(&mut self.world, &mut self.events, &ctx);
        self.hooks.run_after(Phase::AdvanceTransient, &mut self.world);
    }

    /// Run only the dispatch phase (with hooks).
    pub fn run_dispatch(&mut self) {
        self.hooks.run_before(Phase::Dispatch, &mut self.world);
        let ctx = self.phase_context();
        crate::systems::dispatch::run(
            &mut self.world,
            &mut self.events,
            &ctx,
            &self.groups,
            &mut self.dispatchers,
        );
        self.hooks.run_after(Phase::Dispatch, &mut self.world);
    }

    /// Run only the movement phase (with hooks).
    pub fn run_movement(&mut self) {
        self.hooks.run_before(Phase::Movement, &mut self.world);
        let ctx = self.phase_context();
        crate::systems::movement::run(&mut self.world, &mut self.events, &ctx);
        self.hooks.run_after(Phase::Movement, &mut self.world);
    }

    /// Run only the doors phase (with hooks).
    pub fn run_doors(&mut self) {
        self.hooks.run_before(Phase::Doors, &mut self.world);
        let ctx = self.phase_context();
        crate::systems::doors::run(&mut self.world, &mut self.events, &ctx);
        self.hooks.run_after(Phase::Doors, &mut self.world);
    }

    /// Run only the loading phase (with hooks).
    pub fn run_loading(&mut self) {
        self.hooks.run_before(Phase::Loading, &mut self.world);
        let ctx = self.phase_context();
        crate::systems::loading::run(&mut self.world, &mut self.events, &ctx);
        self.hooks.run_after(Phase::Loading, &mut self.world);
    }

    /// Run only the metrics phase (with hooks).
    pub fn run_metrics(&mut self) {
        self.hooks.run_before(Phase::Metrics, &mut self.world);
        let ctx = self.phase_context();
        crate::systems::metrics::run(&self.world, &self.events, &mut self.metrics, &ctx);
        self.hooks.run_after(Phase::Metrics, &mut self.world);
    }

    /// Register a hook to run before a simulation phase.
    ///
    /// Hooks are called in registration order. The hook receives mutable
    /// access to the world, allowing entity inspection or modification.
    pub fn add_before_hook(
        &mut self,
        phase: Phase,
        hook: impl Fn(&mut World) + Send + Sync + 'static,
    ) {
        self.hooks.add_before(phase, Box::new(hook));
    }

    /// Register a hook to run after a simulation phase.
    ///
    /// Hooks are called in registration order. The hook receives mutable
    /// access to the world, allowing entity inspection or modification.
    pub fn add_after_hook(
        &mut self,
        phase: Phase,
        hook: impl Fn(&mut World) + Send + Sync + 'static,
    ) {
        self.hooks.add_after(phase, Box::new(hook));
    }

    /// Increment the tick counter and flush events to the output buffer.
    ///
    /// Call after running all desired phases. Events emitted during this tick
    /// are moved to the output buffer and available via `drain_events()`.
    pub fn advance_tick(&mut self) {
        self.pending_output.extend(self.events.drain());
        self.tick += 1;
    }

    /// Advance the simulation by one tick.
    ///
    /// Events from this tick are buffered internally and available via
    /// `drain_events()`. The metrics system only processes events from
    /// the current tick, regardless of whether the consumer drains them.
    pub fn step(&mut self) {
        self.run_advance_transient();
        self.run_dispatch();
        self.run_movement();
        self.run_doors();
        self.run_loading();
        self.run_metrics();
        self.advance_tick();
    }
}

impl fmt::Debug for Simulation {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("Simulation")
            .field("tick", &self.tick)
            .field("dt", &self.dt)
            .field("groups", &self.groups.len())
            .field("entities", &self.world.entity_count())
            .finish_non_exhaustive()
    }
}
