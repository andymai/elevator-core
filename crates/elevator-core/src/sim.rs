//! Top-level simulation runner and tick loop.

use crate::components::{
    Elevator, ElevatorPhase, FloorPosition, Line, Orientation, Position, Rider, RiderPhase, Route,
    Stop, Velocity,
};
use crate::config::SimConfig;
use crate::dispatch::{BuiltinStrategy, DispatchStrategy, ElevatorGroup, LineInfo};
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
use crate::topology::TopologyGraph;
use crate::world::World;
use std::collections::{BTreeMap, HashMap, HashSet};
use std::fmt;
use std::sync::Mutex;

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

impl Default for ElevatorParams {
    fn default() -> Self {
        Self {
            max_speed: 2.0,
            acceleration: 1.5,
            deceleration: 2.0,
            weight_capacity: 800.0,
            door_transition_ticks: 5,
            door_open_ticks: 10,
        }
    }
}

/// Parameters for creating a new line at runtime.
#[derive(Debug, Clone)]
pub struct LineParams {
    /// Human-readable name.
    pub name: String,
    /// Dispatch group to add this line to.
    pub group: GroupId,
    /// Physical orientation.
    pub orientation: Orientation,
    /// Lowest reachable position on the line axis.
    pub min_position: f64,
    /// Highest reachable position on the line axis.
    pub max_position: f64,
    /// Optional floor-plan position.
    pub position: Option<FloorPosition>,
    /// Maximum cars on this line (None = unlimited).
    pub max_cars: Option<usize>,
}

impl LineParams {
    /// Create line parameters with the given name and group, defaulting
    /// everything else.
    pub fn new(name: impl Into<String>, group: GroupId) -> Self {
        Self {
            name: name.into(),
            group,
            orientation: Orientation::default(),
            min_position: 0.0,
            max_position: 0.0,
            position: None,
            max_cars: None,
        }
    }
}

/// Bundled topology result: groups, dispatchers, and strategy IDs.
type TopologyResult = (
    Vec<ElevatorGroup>,
    BTreeMap<GroupId, Box<dyn DispatchStrategy>>,
    BTreeMap<GroupId, BuiltinStrategy>,
);

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
    /// Serializable strategy identifiers (for snapshot).
    strategy_ids: BTreeMap<GroupId, crate::dispatch::BuiltinStrategy>,
    /// Aggregated metrics.
    metrics: Metrics,
    /// Time conversion utility.
    time: TimeAdapter,
    /// Lifecycle hooks (before/after each phase).
    hooks: PhaseHooks,
    /// Reusable buffer for elevator IDs (avoids per-tick allocation).
    elevator_ids_buf: Vec<EntityId>,
    /// Lazy-rebuilt connectivity graph for cross-line topology queries.
    topo_graph: Mutex<TopologyGraph>,
}

impl Simulation {
    /// Create a new simulation from config and a dispatch strategy.
    ///
    /// Returns `Err` if the config is invalid (zero stops, duplicate IDs,
    /// negative speeds, etc.).
    ///
    /// # Errors
    ///
    /// Returns [`SimError::InvalidConfig`] if the configuration has zero stops,
    /// duplicate stop IDs, zero elevators, non-positive physics parameters,
    /// invalid starting stops, or non-positive tick rate.
    pub fn new(
        config: &SimConfig,
        dispatch: impl DispatchStrategy + 'static,
    ) -> Result<Self, SimError> {
        let mut dispatchers = BTreeMap::new();
        dispatchers.insert(GroupId(0), Box::new(dispatch) as Box<dyn DispatchStrategy>);
        Self::new_with_hooks(config, dispatchers, PhaseHooks::default())
    }

    /// Create a simulation with pre-configured lifecycle hooks.
    ///
    /// Used by [`SimulationBuilder`](crate::builder::SimulationBuilder).
    #[allow(clippy::too_many_lines)]
    pub(crate) fn new_with_hooks(
        config: &SimConfig,
        builder_dispatchers: BTreeMap<GroupId, Box<dyn DispatchStrategy>>,
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
        sorted.sort_by(|a, b| a.0.total_cmp(&b.0));
        world.insert_resource(crate::world::SortedStops(sorted));

        let (groups, dispatchers, strategy_ids) = if let Some(line_configs) = &config.building.lines
        {
            Self::build_explicit_topology(
                &mut world,
                config,
                line_configs,
                &stop_lookup,
                builder_dispatchers,
            )
        } else {
            Self::build_legacy_topology(&mut world, config, &stop_lookup, builder_dispatchers)
        };

        let dt = 1.0 / config.simulation.ticks_per_second;

        world.insert_resource(crate::tagged_metrics::MetricTags::default());

        // Collect line tag info (entity + name + elevator entities) before
        // borrowing world mutably for MetricTags.
        let line_tag_info: Vec<(EntityId, String, Vec<EntityId>)> = groups
            .iter()
            .flat_map(|group| {
                group.lines().iter().filter_map(|li| {
                    let line_comp = world.line(li.entity())?;
                    Some((li.entity(), line_comp.name.clone(), li.elevators().to_vec()))
                })
            })
            .collect();

        // Tag line entities and their elevators with "line:{name}".
        if let Some(tags) = world.resource_mut::<crate::tagged_metrics::MetricTags>() {
            for (line_eid, name, elevators) in &line_tag_info {
                let tag = format!("line:{name}");
                tags.tag(*line_eid, tag.clone());
                for elev_eid in elevators {
                    tags.tag(*elev_eid, tag.clone());
                }
            }
        }

        Ok(Self {
            world,
            events: EventBus::default(),
            pending_output: Vec::new(),
            tick: 0,
            dt,
            groups,
            stop_lookup,
            dispatchers,
            strategy_ids,
            metrics: Metrics::new(),
            time: TimeAdapter::new(config.simulation.ticks_per_second),
            hooks,
            elevator_ids_buf: Vec::new(),
            topo_graph: Mutex::new(TopologyGraph::new()),
        })
    }

    /// Build topology from the legacy flat elevator list (single default line + group).
    fn build_legacy_topology(
        world: &mut World,
        config: &SimConfig,
        stop_lookup: &HashMap<StopId, EntityId>,
        builder_dispatchers: BTreeMap<GroupId, Box<dyn DispatchStrategy>>,
    ) -> TopologyResult {
        let all_stop_entities: Vec<EntityId> = stop_lookup.values().copied().collect();
        let stop_positions: Vec<f64> = config.building.stops.iter().map(|s| s.position).collect();
        let min_pos = stop_positions.iter().copied().fold(f64::INFINITY, f64::min);
        let max_pos = stop_positions
            .iter()
            .copied()
            .fold(f64::NEG_INFINITY, f64::max);

        let default_line_eid = world.spawn();
        world.set_line(
            default_line_eid,
            Line {
                name: "Default".into(),
                group: GroupId(0),
                orientation: Orientation::Vertical,
                position: None,
                min_position: min_pos,
                max_position: max_pos,
                max_cars: None,
            },
        );

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
                    line: default_line_eid,
                },
            );
            elevator_entities.push(eid);
        }

        let default_line_info =
            LineInfo::new(default_line_eid, elevator_entities, all_stop_entities);

        let group = ElevatorGroup::new(GroupId(0), "Default".into(), vec![default_line_info]);

        // Use builder-provided dispatcher or default Scan.
        let mut dispatchers = BTreeMap::new();
        let dispatch = builder_dispatchers.into_iter().next().map_or_else(
            || Box::new(crate::dispatch::scan::ScanDispatch::new()) as Box<dyn DispatchStrategy>,
            |(_, d)| d,
        );
        dispatchers.insert(GroupId(0), dispatch);

        let mut strategy_ids = BTreeMap::new();
        strategy_ids.insert(GroupId(0), BuiltinStrategy::Scan);

        (vec![group], dispatchers, strategy_ids)
    }

    /// Build topology from explicit `LineConfig`/`GroupConfig` definitions.
    #[allow(clippy::too_many_lines)]
    fn build_explicit_topology(
        world: &mut World,
        config: &SimConfig,
        line_configs: &[crate::config::LineConfig],
        stop_lookup: &HashMap<StopId, EntityId>,
        builder_dispatchers: BTreeMap<GroupId, Box<dyn DispatchStrategy>>,
    ) -> TopologyResult {
        // Map line config id → (line EntityId, LineInfo).
        let mut line_map: HashMap<u32, (EntityId, LineInfo)> = HashMap::new();

        for lc in line_configs {
            // Resolve served stop entities.
            let served_entities: Vec<EntityId> = lc
                .serves
                .iter()
                .filter_map(|sid| stop_lookup.get(sid).copied())
                .collect();

            // Compute min/max from stops if not explicitly set.
            let stop_positions: Vec<f64> = lc
                .serves
                .iter()
                .filter_map(|sid| {
                    config
                        .building
                        .stops
                        .iter()
                        .find(|s| s.id == *sid)
                        .map(|s| s.position)
                })
                .collect();
            let auto_min = stop_positions.iter().copied().fold(f64::INFINITY, f64::min);
            let auto_max = stop_positions
                .iter()
                .copied()
                .fold(f64::NEG_INFINITY, f64::max);

            let min_pos = lc.min_position.unwrap_or(auto_min);
            let max_pos = lc.max_position.unwrap_or(auto_max);

            let line_eid = world.spawn();
            // The group assignment will be set when we process GroupConfigs.
            // Default to GroupId(0) initially.
            world.set_line(
                line_eid,
                Line {
                    name: lc.name.clone(),
                    group: GroupId(0),
                    orientation: lc.orientation,
                    position: lc.position,
                    min_position: min_pos,
                    max_position: max_pos,
                    max_cars: lc.max_cars,
                },
            );

            // Spawn elevators for this line.
            let mut elevator_entities = Vec::new();
            for ec in &lc.elevators {
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
                        line: line_eid,
                    },
                );
                elevator_entities.push(eid);
            }

            let line_info = LineInfo::new(line_eid, elevator_entities, served_entities);
            line_map.insert(lc.id, (line_eid, line_info));
        }

        // Build groups from GroupConfigs, or auto-infer a single group.
        let group_configs = config.building.groups.as_deref();
        let mut groups = Vec::new();
        let mut dispatchers = BTreeMap::new();
        let mut strategy_ids = BTreeMap::new();

        if let Some(gcs) = group_configs {
            for gc in gcs {
                let group_id = GroupId(gc.id);

                let mut group_lines = Vec::new();

                for &lid in &gc.lines {
                    if let Some((line_eid, li)) = line_map.get(&lid) {
                        // Update the line's group assignment.
                        if let Some(line_comp) = world.line_mut(*line_eid) {
                            line_comp.group = group_id;
                        }
                        group_lines.push(li.clone());
                    }
                }

                let group = ElevatorGroup::new(group_id, gc.name.clone(), group_lines);
                groups.push(group);

                // GroupConfig strategy; builder overrides applied after this loop.
                let dispatch: Box<dyn DispatchStrategy> = gc
                    .dispatch
                    .instantiate()
                    .unwrap_or_else(|| Box::new(crate::dispatch::scan::ScanDispatch::new()));
                dispatchers.insert(group_id, dispatch);
                strategy_ids.insert(group_id, gc.dispatch.clone());
            }
        } else {
            // No explicit groups — create a single default group with all lines.
            let group_id = GroupId(0);
            let mut group_lines = Vec::new();

            for (line_eid, li) in line_map.values() {
                if let Some(line_comp) = world.line_mut(*line_eid) {
                    line_comp.group = group_id;
                }
                group_lines.push(li.clone());
            }

            let group = ElevatorGroup::new(group_id, "Default".into(), group_lines);
            groups.push(group);

            let dispatch: Box<dyn DispatchStrategy> =
                Box::new(crate::dispatch::scan::ScanDispatch::new());
            dispatchers.insert(group_id, dispatch);
            strategy_ids.insert(group_id, BuiltinStrategy::Scan);
        }

        // Override with builder-provided dispatchers (they take precedence).
        for (gid, d) in builder_dispatchers {
            dispatchers.insert(gid, d);
        }

        (groups, dispatchers, strategy_ids)
    }

    /// Restore a simulation from pre-built parts (used by snapshot restore).
    #[allow(clippy::too_many_arguments)]
    pub(crate) fn from_parts(
        world: World,
        tick: u64,
        dt: f64,
        groups: Vec<ElevatorGroup>,
        stop_lookup: HashMap<StopId, EntityId>,
        dispatchers: BTreeMap<GroupId, Box<dyn DispatchStrategy>>,
        strategy_ids: BTreeMap<GroupId, crate::dispatch::BuiltinStrategy>,
        metrics: Metrics,
        ticks_per_second: f64,
    ) -> Self {
        Self {
            world,
            events: EventBus::default(),
            pending_output: Vec::new(),
            tick,
            dt,
            groups,
            stop_lookup,
            dispatchers,
            strategy_ids,
            metrics,
            time: TimeAdapter::new(ticks_per_second),
            hooks: PhaseHooks::default(),
            elevator_ids_buf: Vec::new(),
            topo_graph: Mutex::new(TopologyGraph::new()),
        }
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

        let stop_ids: HashSet<StopId> = config.building.stops.iter().map(|s| s.id).collect();

        if let Some(line_configs) = &config.building.lines {
            // ── Explicit topology validation ──
            Self::validate_explicit_topology(line_configs, &stop_ids, &config.building)?;
        } else {
            // ── Legacy flat elevator list validation ──
            Self::validate_legacy_elevators(&config.elevators, &config.building)?;
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

    /// Validate the legacy flat elevator list.
    fn validate_legacy_elevators(
        elevators: &[crate::config::ElevatorConfig],
        building: &crate::config::BuildingConfig,
    ) -> Result<(), SimError> {
        if elevators.is_empty() {
            return Err(SimError::InvalidConfig {
                field: "elevators",
                reason: "at least one elevator is required".into(),
            });
        }

        for elev in elevators {
            Self::validate_elevator_config(elev, building)?;
        }

        Ok(())
    }

    /// Validate a single elevator config's physics and starting stop.
    fn validate_elevator_config(
        elev: &crate::config::ElevatorConfig,
        building: &crate::config::BuildingConfig,
    ) -> Result<(), SimError> {
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
        if !building.stops.iter().any(|s| s.id == elev.starting_stop) {
            return Err(SimError::InvalidConfig {
                field: "elevators.starting_stop",
                reason: format!("references non-existent StopId({:?})", elev.starting_stop),
            });
        }
        Ok(())
    }

    /// Validate explicit line/group topology.
    fn validate_explicit_topology(
        line_configs: &[crate::config::LineConfig],
        stop_ids: &HashSet<StopId>,
        building: &crate::config::BuildingConfig,
    ) -> Result<(), SimError> {
        // No duplicate line IDs.
        let mut seen_line_ids = HashSet::new();
        for lc in line_configs {
            if !seen_line_ids.insert(lc.id) {
                return Err(SimError::InvalidConfig {
                    field: "building.lines",
                    reason: format!("duplicate line id {}", lc.id),
                });
            }
        }

        // Every line's serves must reference existing stops.
        for lc in line_configs {
            for sid in &lc.serves {
                if !stop_ids.contains(sid) {
                    return Err(SimError::InvalidConfig {
                        field: "building.lines.serves",
                        reason: format!("line {} references non-existent {}", lc.id, sid),
                    });
                }
            }
            // Validate elevators within each line.
            for ec in &lc.elevators {
                Self::validate_elevator_config(ec, building)?;
            }

            // Validate max_cars is not exceeded.
            if let Some(max) = lc.max_cars {
                if lc.elevators.len() > max {
                    return Err(SimError::InvalidConfig {
                        field: "building.lines.max_cars",
                        reason: format!(
                            "line {} has {} elevators but max_cars is {max}",
                            lc.id,
                            lc.elevators.len()
                        ),
                    });
                }
            }
        }

        // At least one line with at least one elevator.
        let has_elevator = line_configs.iter().any(|lc| !lc.elevators.is_empty());
        if !has_elevator {
            return Err(SimError::InvalidConfig {
                field: "building.lines",
                reason: "at least one line must have at least one elevator".into(),
            });
        }

        // No orphaned stops: every stop must be served by at least one line.
        let served: HashSet<StopId> = line_configs
            .iter()
            .flat_map(|lc| lc.serves.iter().copied())
            .collect();
        for sid in stop_ids {
            if !served.contains(sid) {
                return Err(SimError::InvalidConfig {
                    field: "building.lines",
                    reason: format!("orphaned stop {sid} not served by any line"),
                });
            }
        }

        // Validate groups if present.
        if let Some(group_configs) = &building.groups {
            let line_id_set: HashSet<u32> = line_configs.iter().map(|lc| lc.id).collect();

            let mut seen_group_ids = HashSet::new();
            for gc in group_configs {
                if !seen_group_ids.insert(gc.id) {
                    return Err(SimError::InvalidConfig {
                        field: "building.groups",
                        reason: format!("duplicate group id {}", gc.id),
                    });
                }
                for &lid in &gc.lines {
                    if !line_id_set.contains(&lid) {
                        return Err(SimError::InvalidConfig {
                            field: "building.groups.lines",
                            reason: format!(
                                "group {} references non-existent line id {}",
                                gc.id, lid
                            ),
                        });
                    }
                }
            }

            // Check for orphaned lines (not referenced by any group).
            let referenced_line_ids: HashSet<u32> = group_configs
                .iter()
                .flat_map(|g| g.lines.iter().copied())
                .collect();
            for lc in line_configs {
                if !referenced_line_ids.contains(&lc.id) {
                    return Err(SimError::InvalidConfig {
                        field: "building.lines",
                        reason: format!("line {} is not assigned to any group", lc.id),
                    });
                }
            }
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

    /// Get the strategy identifier for a group.
    #[must_use]
    pub fn strategy_id(&self, group: GroupId) -> Option<&crate::dispatch::BuiltinStrategy> {
        self.strategy_ids.get(&group)
    }

    /// Iterate over the stop ID → entity ID mapping.
    pub fn stop_lookup_iter(&self) -> impl Iterator<Item = (&StopId, &EntityId)> {
        self.stop_lookup.iter()
    }

    /// Peek at events pending for consumer retrieval.
    #[must_use]
    pub fn pending_events(&self) -> &[Event] {
        &self.pending_output
    }

    // ── Dispatch management ──────────────────────────────────────────

    /// Replace the dispatch strategy for a group.
    ///
    /// The `id` parameter identifies the strategy for snapshot serialization.
    /// Use `BuiltinStrategy::Custom("name")` for custom strategies.
    pub fn set_dispatch(
        &mut self,
        group: GroupId,
        strategy: Box<dyn DispatchStrategy>,
        id: crate::dispatch::BuiltinStrategy,
    ) {
        self.dispatchers.insert(group, strategy);
        self.strategy_ids.insert(group, id);
    }

    // ── Tagging ──────────────────────────────────────────────────────

    /// Attach a metric tag to an entity (rider, stop, elevator, etc.).
    ///
    /// Tags enable per-tag metric breakdowns. An entity can have multiple tags.
    /// Riders automatically inherit tags from their origin stop when spawned.
    pub fn tag_entity(&mut self, id: EntityId, tag: impl Into<String>) {
        if let Some(tags) = self
            .world
            .resource_mut::<crate::tagged_metrics::MetricTags>()
        {
            tags.tag(id, tag);
        }
    }

    /// Remove a metric tag from an entity.
    pub fn untag_entity(&mut self, id: EntityId, tag: &str) {
        if let Some(tags) = self
            .world
            .resource_mut::<crate::tagged_metrics::MetricTags>()
        {
            tags.untag(id, tag);
        }
    }

    /// Query the metric accumulator for a specific tag.
    #[must_use]
    pub fn metrics_for_tag(&self, tag: &str) -> Option<&crate::tagged_metrics::TaggedMetric> {
        self.world
            .resource::<crate::tagged_metrics::MetricTags>()
            .and_then(|tags| tags.metric(tag))
    }

    /// List all registered metric tags.
    pub fn all_tags(&self) -> Vec<&str> {
        self.world
            .resource::<crate::tagged_metrics::MetricTags>()
            .map_or_else(Vec::new, |tags| tags.all_tags().collect())
    }

    // ── Rider spawning ───────────────────────────────────────────────

    /// Spawn a rider at the given origin stop entity, headed to destination stop entity.
    ///
    /// Auto-detects the elevator group by finding groups that serve both origin
    /// and destination stops.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::NoRoute`] if no group serves both stops.
    /// Returns [`SimError::AmbiguousRoute`] if multiple groups serve both stops.
    pub fn spawn_rider(
        &mut self,
        origin: EntityId,
        destination: EntityId,
        weight: f64,
    ) -> Result<EntityId, SimError> {
        let matching: Vec<GroupId> = self
            .groups
            .iter()
            .filter(|g| {
                g.stop_entities().contains(&origin) && g.stop_entities().contains(&destination)
            })
            .map(ElevatorGroup::id)
            .collect();

        let group = match matching.len() {
            0 => {
                return Err(SimError::NoRoute {
                    origin,
                    destination,
                });
            }
            1 => matching[0],
            _ => {
                return Err(SimError::AmbiguousRoute {
                    origin,
                    destination,
                    groups: matching,
                });
            }
        };

        let route = Route::direct(origin, destination, group);
        Ok(self.spawn_rider_inner(origin, destination, weight, route))
    }

    /// Spawn a rider with an explicit route.
    ///
    /// Same as [`spawn_rider`](Self::spawn_rider) but uses the provided route
    /// instead of auto-detecting the group.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::EntityNotFound`] if origin does not exist.
    /// Returns [`SimError::InvalidState`] if origin doesn't match the route's
    /// first leg `from`.
    pub fn spawn_rider_with_route(
        &mut self,
        origin: EntityId,
        destination: EntityId,
        weight: f64,
        route: Route,
    ) -> Result<EntityId, SimError> {
        if self.world.stop(origin).is_none() {
            return Err(SimError::EntityNotFound(origin));
        }
        if let Some(leg) = route.current() {
            if leg.from != origin {
                return Err(SimError::InvalidState {
                    entity: origin,
                    reason: format!(
                        "origin {origin:?} does not match route first leg from {:?}",
                        leg.from
                    ),
                });
            }
        }
        Ok(self.spawn_rider_inner(origin, destination, weight, route))
    }

    /// Internal helper: spawn a rider entity with the given route.
    fn spawn_rider_inner(
        &mut self,
        origin: EntityId,
        destination: EntityId,
        weight: f64,
        route: Route,
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
        self.world.set_route(eid, route);
        self.events.emit(Event::RiderSpawned {
            rider: eid,
            origin,
            destination,
            tick: self.tick,
        });

        // Inherit metric tags from the origin stop.
        if let Some(tags_res) = self
            .world
            .resource_mut::<crate::tagged_metrics::MetricTags>()
        {
            let origin_tags: Vec<String> = tags_res.tags_for(origin).to_vec();
            for tag in origin_tags {
                tags_res.tag(eid, tag);
            }
        }

        eid
    }

    /// Convenience: spawn a rider by config `StopId`.
    ///
    /// Returns `Err` if either stop ID is not found.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::StopNotFound`] if the origin or destination stop ID
    /// is not in the building configuration.
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// // Default builder has StopId(0) and StopId(1).
    /// let mut sim = SimulationBuilder::new().build().unwrap();
    ///
    /// let rider = sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 80.0).unwrap();
    /// sim.step(); // metrics are updated during the tick
    /// assert_eq!(sim.metrics().total_spawned(), 1);
    /// ```
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
        self.spawn_rider(origin_eid, dest_eid, weight)
    }

    /// Spawn a rider using a specific group for routing.
    ///
    /// Like [`spawn_rider`](Self::spawn_rider) but skips auto-detection —
    /// uses the given group directly. Useful when the caller already knows
    /// the group, or to resolve an [`AmbiguousRoute`](crate::error::SimError::AmbiguousRoute).
    ///
    /// # Errors
    ///
    /// Returns [`SimError::GroupNotFound`] if the group does not exist.
    pub fn spawn_rider_in_group(
        &mut self,
        origin: EntityId,
        destination: EntityId,
        weight: f64,
        group: GroupId,
    ) -> Result<EntityId, SimError> {
        if !self.groups.iter().any(|g| g.id() == group) {
            return Err(SimError::GroupNotFound(group));
        }
        let route = Route::direct(origin, destination, group);
        Ok(self.spawn_rider_inner(origin, destination, weight, route))
    }

    /// Convenience: spawn a rider by config `StopId` in a specific group.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::StopNotFound`] if a stop ID is unknown, or
    /// [`SimError::GroupNotFound`] if the group does not exist.
    pub fn spawn_rider_in_group_by_stop_id(
        &mut self,
        origin: StopId,
        destination: StopId,
        weight: f64,
        group: GroupId,
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
        self.spawn_rider_in_group(origin_eid, dest_eid, weight, group)
    }

    /// Drain all pending events from completed ticks.
    ///
    /// Events emitted during `step()` (or per-phase methods) are buffered
    /// and made available here after `advance_tick()` is called.
    /// Events emitted outside the tick loop (e.g., `spawn_rider`, `disable`)
    /// are also included.
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::new().build().unwrap();
    ///
    /// sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 70.0).unwrap();
    /// sim.step();
    ///
    /// let events = sim.drain_events();
    /// assert!(!events.is_empty());
    /// ```
    pub fn drain_events(&mut self) -> Vec<Event> {
        // Flush any events still in the bus (from spawn_rider, disable, etc.)
        self.pending_output.extend(self.events.drain());
        std::mem::take(&mut self.pending_output)
    }

    // ── Dynamic topology ────────────────────────────────────────────

    /// Find the (`group_index`, `line_index`) for a line entity.
    fn find_line(&self, line: EntityId) -> Result<(usize, usize), SimError> {
        self.groups
            .iter()
            .enumerate()
            .find_map(|(gi, g)| {
                g.lines()
                    .iter()
                    .position(|li| li.entity() == line)
                    .map(|li_idx| (gi, li_idx))
            })
            .ok_or(SimError::LineNotFound(line))
    }

    /// Add a new stop to a group at runtime. Returns its `EntityId`.
    ///
    /// Runtime-added stops have no `StopId` — they are identified purely
    /// by `EntityId`. The `stop_lookup` (config `StopId` → `EntityId`)
    /// is not updated.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::LineNotFound`] if the line entity does not exist.
    pub fn add_stop(
        &mut self,
        name: String,
        position: f64,
        line: EntityId,
    ) -> Result<EntityId, SimError> {
        let group_id = self
            .world
            .line(line)
            .map(|l| l.group)
            .ok_or(SimError::LineNotFound(line))?;

        let (group_idx, line_idx) = self.find_line(line)?;

        let eid = self.world.spawn();
        self.world.set_stop(eid, Stop { name, position });
        self.world.set_position(eid, Position { value: position });

        // Add to the line's serves list.
        self.groups[group_idx].lines_mut()[line_idx]
            .serves_mut()
            .push(eid);

        // Add to the group's flat cache.
        self.groups[group_idx].push_stop(eid);

        // Maintain sorted-stops index for O(log n) PassingFloor detection.
        if let Some(sorted) = self.world.resource_mut::<crate::world::SortedStops>() {
            let idx = sorted.0.partition_point(|&(p, _)| p < position);
            sorted.0.insert(idx, (position, eid));
        }

        if let Ok(mut g) = self.topo_graph.lock() {
            g.mark_dirty();
        }
        self.events.emit(Event::StopAdded {
            stop: eid,
            line,
            group: group_id,
            tick: self.tick,
        });
        Ok(eid)
    }

    /// Add a new elevator to a line at runtime. Returns its `EntityId`.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::LineNotFound`] if the line entity does not exist.
    pub fn add_elevator(
        &mut self,
        params: &ElevatorParams,
        line: EntityId,
        starting_position: f64,
    ) -> Result<EntityId, SimError> {
        let group_id = self
            .world
            .line(line)
            .map(|l| l.group)
            .ok_or(SimError::LineNotFound(line))?;

        let (group_idx, line_idx) = self.find_line(line)?;

        // Enforce max_cars limit.
        if let Some(max) = self.world.line(line).and_then(Line::max_cars) {
            let current_count = self.groups[group_idx].lines()[line_idx].elevators().len();
            if current_count >= max {
                return Err(SimError::InvalidConfig {
                    field: "line.max_cars",
                    reason: format!("line already has {current_count} cars (max {max})"),
                });
            }
        }

        let eid = self.world.spawn();
        self.world.set_position(
            eid,
            Position {
                value: starting_position,
            },
        );
        self.world.set_velocity(eid, Velocity { value: 0.0 });
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
                line,
            },
        );
        self.groups[group_idx].lines_mut()[line_idx]
            .elevators_mut()
            .push(eid);
        self.groups[group_idx].push_elevator(eid);

        // Tag the elevator with its line's "line:{name}" tag.
        let line_name = self.world.line(line).map(|l| l.name.clone());
        if let Some(name) = line_name {
            if let Some(tags) = self
                .world
                .resource_mut::<crate::tagged_metrics::MetricTags>()
            {
                tags.tag(eid, format!("line:{name}"));
            }
        }

        if let Ok(mut g) = self.topo_graph.lock() {
            g.mark_dirty();
        }
        self.events.emit(Event::ElevatorAdded {
            elevator: eid,
            line,
            group: group_id,
            tick: self.tick,
        });
        Ok(eid)
    }

    // ── Line / group topology ───────────────────────────────────────

    /// Add a new line to a group. Returns the line entity.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::GroupNotFound`] if the specified group does not exist.
    pub fn add_line(&mut self, params: &LineParams) -> Result<EntityId, SimError> {
        let group_id = params.group;
        let group = self
            .groups
            .iter_mut()
            .find(|g| g.id() == group_id)
            .ok_or(SimError::GroupNotFound(group_id))?;

        let line_tag = format!("line:{}", params.name);

        let eid = self.world.spawn();
        self.world.set_line(
            eid,
            Line {
                name: params.name.clone(),
                group: group_id,
                orientation: params.orientation,
                position: params.position,
                min_position: params.min_position,
                max_position: params.max_position,
                max_cars: params.max_cars,
            },
        );

        group
            .lines_mut()
            .push(LineInfo::new(eid, Vec::new(), Vec::new()));

        // Tag the line entity with "line:{name}" for per-line metrics.
        if let Some(tags) = self
            .world
            .resource_mut::<crate::tagged_metrics::MetricTags>()
        {
            tags.tag(eid, line_tag);
        }

        if let Ok(mut g) = self.topo_graph.lock() {
            g.mark_dirty();
        }
        self.events.emit(Event::LineAdded {
            line: eid,
            group: group_id,
            tick: self.tick,
        });
        Ok(eid)
    }

    /// Remove a line and all its elevators from the simulation.
    ///
    /// Elevators on the line are disabled (not despawned) so riders are
    /// properly ejected to the nearest stop.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::LineNotFound`] if the line entity is not found
    /// in any group.
    pub fn remove_line(&mut self, line: EntityId) -> Result<(), SimError> {
        let (group_idx, line_idx) = self.find_line(line)?;

        let group_id = self.groups[group_idx].id();

        // Collect elevator entities to disable.
        let elevator_ids: Vec<EntityId> = self.groups[group_idx].lines()[line_idx]
            .elevators()
            .to_vec();

        // Disable each elevator (ejects riders properly).
        for eid in &elevator_ids {
            // Ignore errors from already-disabled elevators.
            let _ = self.disable(*eid);
        }

        // Remove the LineInfo from the group.
        self.groups[group_idx].lines_mut().remove(line_idx);

        // Rebuild flat caches.
        self.groups[group_idx].rebuild_caches();

        // Remove Line component from world.
        self.world.remove_line(line);

        if let Ok(mut g) = self.topo_graph.lock() {
            g.mark_dirty();
        }
        self.events.emit(Event::LineRemoved {
            line,
            group: group_id,
            tick: self.tick,
        });
        Ok(())
    }

    /// Create a new dispatch group. Returns the group ID.
    pub fn add_group(
        &mut self,
        name: impl Into<String>,
        dispatch: impl DispatchStrategy + 'static,
    ) -> GroupId {
        let next_id = self
            .groups
            .iter()
            .map(|g| g.id().0)
            .max()
            .map_or(0, |m| m + 1);
        let group_id = GroupId(next_id);

        self.groups
            .push(ElevatorGroup::new(group_id, name.into(), Vec::new()));

        self.dispatchers.insert(group_id, Box::new(dispatch));
        self.strategy_ids.insert(group_id, BuiltinStrategy::Scan);
        if let Ok(mut g) = self.topo_graph.lock() {
            g.mark_dirty();
        }
        group_id
    }

    /// Reassign a line to a different group. Returns the old `GroupId`.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::LineNotFound`] if the line is not found in any group.
    /// Returns [`SimError::GroupNotFound`] if `new_group` does not exist.
    pub fn assign_line_to_group(
        &mut self,
        line: EntityId,
        new_group: GroupId,
    ) -> Result<GroupId, SimError> {
        let (old_group_idx, line_idx) = self.find_line(line)?;

        // Verify new group exists.
        if !self.groups.iter().any(|g| g.id() == new_group) {
            return Err(SimError::GroupNotFound(new_group));
        }

        let old_group_id = self.groups[old_group_idx].id();

        // Remove LineInfo from old group.
        let line_info = self.groups[old_group_idx].lines_mut().remove(line_idx);
        self.groups[old_group_idx].rebuild_caches();

        // Add LineInfo to new group.
        // Re-lookup new_group_idx since removal may have shifted indices
        // (only possible if old and new are different groups; if same group
        // the line_info was already removed above).
        let new_group_idx = self
            .groups
            .iter()
            .position(|g| g.id() == new_group)
            .ok_or(SimError::GroupNotFound(new_group))?;
        self.groups[new_group_idx].lines_mut().push(line_info);
        self.groups[new_group_idx].rebuild_caches();

        // Update Line component's group field.
        if let Some(line_comp) = self.world.line_mut(line) {
            line_comp.group = new_group;
        }

        if let Ok(mut g) = self.topo_graph.lock() {
            g.mark_dirty();
        }
        self.events.emit(Event::LineReassigned {
            line,
            old_group: old_group_id,
            new_group,
            tick: self.tick,
        });

        Ok(old_group_id)
    }

    /// Reassign an elevator to a different line (swing-car pattern).
    ///
    /// The elevator is moved from its current line to the target line.
    /// Both lines must be in the same group, or you must reassign the
    /// line first via [`assign_line_to_group`](Self::assign_line_to_group).
    ///
    /// # Errors
    ///
    /// Returns [`SimError::EntityNotFound`] if the elevator does not exist.
    /// Returns [`SimError::LineNotFound`] if the target line is not found in any group.
    pub fn reassign_elevator_to_line(
        &mut self,
        elevator: EntityId,
        new_line: EntityId,
    ) -> Result<(), SimError> {
        let old_line = self
            .world
            .elevator(elevator)
            .ok_or(SimError::EntityNotFound(elevator))?
            .line();

        if old_line == new_line {
            return Ok(());
        }

        // Validate both lines exist BEFORE mutating anything.
        let (old_group_idx, old_line_idx) = self.find_line(old_line)?;
        let (new_group_idx, new_line_idx) = self.find_line(new_line)?;

        // Enforce max_cars on target line.
        if let Some(max) = self.world.line(new_line).and_then(Line::max_cars) {
            let current_count = self.groups[new_group_idx].lines()[new_line_idx]
                .elevators()
                .len();
            if current_count >= max {
                return Err(SimError::InvalidConfig {
                    field: "line.max_cars",
                    reason: format!("target line already has {current_count} cars (max {max})"),
                });
            }
        }

        self.groups[old_group_idx].lines_mut()[old_line_idx]
            .elevators_mut()
            .retain(|&e| e != elevator);
        self.groups[new_group_idx].lines_mut()[new_line_idx]
            .elevators_mut()
            .push(elevator);

        if let Some(car) = self.world.elevator_mut(elevator) {
            car.line = new_line;
        }

        self.groups[old_group_idx].rebuild_caches();
        if new_group_idx != old_group_idx {
            self.groups[new_group_idx].rebuild_caches();
        }

        if let Ok(mut g) = self.topo_graph.lock() {
            g.mark_dirty();
        }

        self.events.emit(Event::ElevatorReassigned {
            elevator,
            old_line,
            new_line,
            tick: self.tick,
        });

        Ok(())
    }

    /// Add a stop to a line's served stops.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::EntityNotFound`] if the stop does not exist.
    /// Returns [`SimError::LineNotFound`] if the line is not found in any group.
    pub fn add_stop_to_line(&mut self, stop: EntityId, line: EntityId) -> Result<(), SimError> {
        // Verify stop exists.
        if self.world.stop(stop).is_none() {
            return Err(SimError::EntityNotFound(stop));
        }

        let (group_idx, line_idx) = self.find_line(line)?;

        let li = &mut self.groups[group_idx].lines_mut()[line_idx];
        if !li.serves().contains(&stop) {
            li.serves_mut().push(stop);
        }

        self.groups[group_idx].push_stop(stop);

        if let Ok(mut g) = self.topo_graph.lock() {
            g.mark_dirty();
        }
        Ok(())
    }

    /// Remove a stop from a line's served stops.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::LineNotFound`] if the line is not found in any group.
    pub fn remove_stop_from_line(
        &mut self,
        stop: EntityId,
        line: EntityId,
    ) -> Result<(), SimError> {
        let (group_idx, line_idx) = self.find_line(line)?;

        self.groups[group_idx].lines_mut()[line_idx]
            .serves_mut()
            .retain(|&s| s != stop);

        // Rebuild group's stop_entities from all lines.
        self.groups[group_idx].rebuild_caches();

        if let Ok(mut g) = self.topo_graph.lock() {
            g.mark_dirty();
        }
        Ok(())
    }

    // ── Line / group queries ────────────────────────────────────────

    /// Get all line entities across all groups.
    #[must_use]
    pub fn all_lines(&self) -> Vec<EntityId> {
        self.groups
            .iter()
            .flat_map(|g| g.lines().iter().map(LineInfo::entity))
            .collect()
    }

    /// Number of lines in the simulation.
    #[must_use]
    pub fn line_count(&self) -> usize {
        self.groups.iter().map(|g| g.lines().len()).sum()
    }

    /// Get all line entities in a group.
    #[must_use]
    pub fn lines_in_group(&self, group: GroupId) -> Vec<EntityId> {
        self.groups
            .iter()
            .find(|g| g.id() == group)
            .map_or_else(Vec::new, |g| {
                g.lines().iter().map(LineInfo::entity).collect()
            })
    }

    /// Get elevator entities on a specific line.
    #[must_use]
    pub fn elevators_on_line(&self, line: EntityId) -> Vec<EntityId> {
        self.groups
            .iter()
            .flat_map(ElevatorGroup::lines)
            .find(|li| li.entity() == line)
            .map_or_else(Vec::new, |li| li.elevators().to_vec())
    }

    /// Get stop entities served by a specific line.
    #[must_use]
    pub fn stops_served_by_line(&self, line: EntityId) -> Vec<EntityId> {
        self.groups
            .iter()
            .flat_map(ElevatorGroup::lines)
            .find(|li| li.entity() == line)
            .map_or_else(Vec::new, |li| li.serves().to_vec())
    }

    /// Get the line entity for an elevator.
    #[must_use]
    pub fn line_for_elevator(&self, elevator: EntityId) -> Option<EntityId> {
        self.groups
            .iter()
            .flat_map(ElevatorGroup::lines)
            .find(|li| li.elevators().contains(&elevator))
            .map(LineInfo::entity)
    }

    /// Get all line entities that serve a given stop.
    #[must_use]
    pub fn lines_serving_stop(&self, stop: EntityId) -> Vec<EntityId> {
        self.groups
            .iter()
            .flat_map(ElevatorGroup::lines)
            .filter(|li| li.serves().contains(&stop))
            .map(LineInfo::entity)
            .collect()
    }

    /// Get all group IDs that serve a given stop.
    #[must_use]
    pub fn groups_serving_stop(&self, stop: EntityId) -> Vec<GroupId> {
        self.groups
            .iter()
            .filter(|g| g.stop_entities().contains(&stop))
            .map(ElevatorGroup::id)
            .collect()
    }

    // ── Topology queries ─────────────────────────────────────────────

    /// Rebuild the topology graph if any mutation has invalidated it.
    fn ensure_graph_built(&self) {
        if let Ok(mut graph) = self.topo_graph.lock() {
            if graph.is_dirty() {
                graph.rebuild(&self.groups);
            }
        }
    }

    /// All stops reachable from a given stop through the line/group topology.
    pub fn reachable_stops_from(&self, stop: EntityId) -> Vec<EntityId> {
        self.ensure_graph_built();
        self.topo_graph
            .lock()
            .map_or_else(|_| Vec::new(), |g| g.reachable_stops_from(stop))
    }

    /// Stops that serve as transfer points between groups.
    pub fn transfer_points(&self) -> Vec<EntityId> {
        self.ensure_graph_built();
        TopologyGraph::transfer_points(&self.groups)
    }

    /// Find the shortest route between two stops, possibly spanning multiple groups.
    pub fn shortest_route(&self, from: EntityId, to: EntityId) -> Option<Route> {
        self.ensure_graph_built();
        self.topo_graph
            .lock()
            .ok()
            .and_then(|g| g.shortest_route(from, to))
    }

    // ── Extension restore ────────────────────────────────────────────

    /// Deserialize extension components from a snapshot.
    ///
    /// Call this after restoring from a snapshot and registering all
    /// extension types via `world.register_ext::<T>(name)`.
    ///
    /// ```ignore
    /// let mut sim = snapshot.restore(None);
    /// sim.world_mut().register_ext::<VipTag>("vip_tag");
    /// sim.load_extensions();
    /// ```
    pub fn load_extensions(&mut self) {
        if let Some(pending) = self
            .world
            .remove_resource::<crate::snapshot::PendingExtensions>()
        {
            self.world.deserialize_extensions(&pending.0);
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────

    /// Extract the `GroupId` from the current leg of a route.
    ///
    /// For Walk legs, looks ahead to the next leg to find the group.
    /// Falls back to `GroupId(0)` when no route exists or no group leg is found.
    fn group_from_route(route: Option<&Route>) -> GroupId {
        let Some(route) = route else {
            return GroupId(0);
        };
        // Start from the current leg and scan forward for a Group transport mode.
        for leg in route.legs.get(route.current_leg..).unwrap_or_default() {
            if let crate::components::TransportMode::Group(g) = leg.via {
                return g;
            }
        }
        GroupId(0)
    }

    // ── Re-routing ───────────────────────────────────────────────────

    /// Change a rider's destination mid-route.
    ///
    /// Replaces remaining route legs with a single direct leg to `new_destination`,
    /// keeping the rider's current stop as origin.
    ///
    /// Returns `Err` if the rider does not exist or is not in `Waiting` phase
    /// (riding/boarding riders cannot be rerouted until they exit).
    ///
    /// # Errors
    ///
    /// Returns [`SimError::EntityNotFound`] if `rider` does not exist.
    /// Returns [`SimError::InvalidState`] if the rider is not in
    /// [`RiderPhase::Waiting`] or has no current stop.
    pub fn reroute(&mut self, rider: EntityId, new_destination: EntityId) -> Result<(), SimError> {
        let r = self
            .world
            .rider(rider)
            .ok_or(SimError::EntityNotFound(rider))?;

        if r.phase != RiderPhase::Waiting {
            return Err(SimError::InvalidState {
                entity: rider,
                reason: "can only reroute riders in Waiting phase".into(),
            });
        }

        let origin = r.current_stop.ok_or_else(|| SimError::InvalidState {
            entity: rider,
            reason: "rider has no current stop for reroute".into(),
        })?;

        let group = Self::group_from_route(self.world.route(rider));
        self.world
            .set_route(rider, Route::direct(origin, new_destination, group));

        self.events.emit(Event::RiderRerouted {
            rider,
            new_destination,
            tick: self.tick,
        });

        Ok(())
    }

    /// Replace a rider's entire remaining route.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::EntityNotFound`] if `rider` does not exist.
    pub fn set_rider_route(&mut self, rider: EntityId, route: Route) -> Result<(), SimError> {
        if self.world.rider(rider).is_none() {
            return Err(SimError::EntityNotFound(rider));
        }
        self.world.set_route(rider, route);
        Ok(())
    }

    // ── Entity lifecycle ────────────────────────────────────────────

    /// Disable an entity. Disabled entities are skipped by all systems.
    ///
    /// If the entity is an elevator in motion, it is reset to `Idle` with
    /// zero velocity to prevent stale target references on re-enable.
    ///
    /// Emits `EntityDisabled`. Returns `Err` if the entity does not exist.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::EntityNotFound`] if `id` does not refer to a
    /// living entity.
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

        // If this is a stop, invalidate routes that reference it.
        if self.world.stop(id).is_some() {
            self.invalidate_routes_for_stop(id);
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
    ///
    /// # Errors
    ///
    /// Returns [`SimError::EntityNotFound`] if `id` does not refer to a
    /// living entity.
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

    /// Invalidate routes for all riders referencing a disabled stop.
    ///
    /// Attempts to reroute riders to the nearest enabled alternative stop.
    /// If no alternative exists, emits `RouteInvalidated` with `NoAlternative`.
    fn invalidate_routes_for_stop(&mut self, disabled_stop: EntityId) {
        use crate::events::RouteInvalidReason;

        // Find the group this stop belongs to.
        let group_stops: Vec<EntityId> = self
            .groups
            .iter()
            .filter(|g| g.stop_entities().contains(&disabled_stop))
            .flat_map(|g| g.stop_entities().iter().copied())
            .filter(|&s| s != disabled_stop && !self.world.is_disabled(s))
            .collect();

        // Find all Waiting riders whose route references this stop.
        // Riding riders are skipped — they'll be rerouted when they exit.
        let rider_ids: Vec<EntityId> = self.world.rider_ids();
        for rid in rider_ids {
            let is_waiting = self
                .world
                .rider(rid)
                .is_some_and(|r| r.phase == RiderPhase::Waiting);

            if !is_waiting {
                continue;
            }

            let references_stop = self.world.route(rid).is_some_and(|route| {
                route
                    .legs
                    .iter()
                    .skip(route.current_leg)
                    .any(|leg| leg.to == disabled_stop || leg.from == disabled_stop)
            });

            if !references_stop {
                continue;
            }

            // Try to find nearest alternative (excluding rider's current stop).
            let rider_current_stop = self.world.rider(rid).and_then(|r| r.current_stop);

            let disabled_stop_pos = self.world.stop(disabled_stop).map_or(0.0, |s| s.position);

            let alternative = group_stops
                .iter()
                .filter(|&&s| Some(s) != rider_current_stop)
                .filter_map(|&s| {
                    self.world
                        .stop(s)
                        .map(|stop| (s, (stop.position - disabled_stop_pos).abs()))
                })
                .min_by(|a, b| a.1.total_cmp(&b.1))
                .map(|(s, _)| s);

            if let Some(alt_stop) = alternative {
                // Reroute to nearest alternative.
                let origin = rider_current_stop.unwrap_or(alt_stop);
                let group = Self::group_from_route(self.world.route(rid));
                self.world
                    .set_route(rid, Route::direct(origin, alt_stop, group));
                self.events.emit(Event::RouteInvalidated {
                    rider: rid,
                    affected_stop: disabled_stop,
                    reason: RouteInvalidReason::StopDisabled,
                    tick: self.tick,
                });
            } else {
                // No alternative — rider abandons immediately.
                let abandon_stop = rider_current_stop.unwrap_or(disabled_stop);
                self.events.emit(Event::RouteInvalidated {
                    rider: rid,
                    affected_stop: disabled_stop,
                    reason: RouteInvalidReason::NoAlternative,
                    tick: self.tick,
                });
                if let Some(r) = self.world.rider_mut(rid) {
                    r.phase = RiderPhase::Abandoned;
                }
                self.events.emit(Event::RiderAbandoned {
                    rider: rid,
                    stop: abandon_stop,
                    tick: self.tick,
                });
            }
        }
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
        self.hooks
            .run_before(Phase::AdvanceTransient, &mut self.world);
        for group in &self.groups {
            self.hooks
                .run_before_group(Phase::AdvanceTransient, group.id(), &mut self.world);
        }
        let ctx = self.phase_context();
        crate::systems::advance_transient::run(&mut self.world, &mut self.events, &ctx);
        for group in &self.groups {
            self.hooks
                .run_after_group(Phase::AdvanceTransient, group.id(), &mut self.world);
        }
        self.hooks
            .run_after(Phase::AdvanceTransient, &mut self.world);
    }

    /// Run only the dispatch phase (with hooks).
    pub fn run_dispatch(&mut self) {
        self.hooks.run_before(Phase::Dispatch, &mut self.world);
        for group in &self.groups {
            self.hooks
                .run_before_group(Phase::Dispatch, group.id(), &mut self.world);
        }
        let ctx = self.phase_context();
        crate::systems::dispatch::run(
            &mut self.world,
            &mut self.events,
            &ctx,
            &self.groups,
            &mut self.dispatchers,
        );
        for group in &self.groups {
            self.hooks
                .run_after_group(Phase::Dispatch, group.id(), &mut self.world);
        }
        self.hooks.run_after(Phase::Dispatch, &mut self.world);
    }

    /// Run only the movement phase (with hooks).
    pub fn run_movement(&mut self) {
        self.hooks.run_before(Phase::Movement, &mut self.world);
        for group in &self.groups {
            self.hooks
                .run_before_group(Phase::Movement, group.id(), &mut self.world);
        }
        let ctx = self.phase_context();
        self.world.elevator_ids_into(&mut self.elevator_ids_buf);
        crate::systems::movement::run(
            &mut self.world,
            &mut self.events,
            &ctx,
            &self.elevator_ids_buf,
        );
        for group in &self.groups {
            self.hooks
                .run_after_group(Phase::Movement, group.id(), &mut self.world);
        }
        self.hooks.run_after(Phase::Movement, &mut self.world);
    }

    /// Run only the doors phase (with hooks).
    pub fn run_doors(&mut self) {
        self.hooks.run_before(Phase::Doors, &mut self.world);
        for group in &self.groups {
            self.hooks
                .run_before_group(Phase::Doors, group.id(), &mut self.world);
        }
        let ctx = self.phase_context();
        self.world.elevator_ids_into(&mut self.elevator_ids_buf);
        crate::systems::doors::run(
            &mut self.world,
            &mut self.events,
            &ctx,
            &self.elevator_ids_buf,
        );
        for group in &self.groups {
            self.hooks
                .run_after_group(Phase::Doors, group.id(), &mut self.world);
        }
        self.hooks.run_after(Phase::Doors, &mut self.world);
    }

    /// Run only the loading phase (with hooks).
    pub fn run_loading(&mut self) {
        self.hooks.run_before(Phase::Loading, &mut self.world);
        for group in &self.groups {
            self.hooks
                .run_before_group(Phase::Loading, group.id(), &mut self.world);
        }
        let ctx = self.phase_context();
        self.world.elevator_ids_into(&mut self.elevator_ids_buf);
        crate::systems::loading::run(
            &mut self.world,
            &mut self.events,
            &ctx,
            &self.elevator_ids_buf,
        );
        for group in &self.groups {
            self.hooks
                .run_after_group(Phase::Loading, group.id(), &mut self.world);
        }
        self.hooks.run_after(Phase::Loading, &mut self.world);
    }

    /// Run only the metrics phase (with hooks).
    pub fn run_metrics(&mut self) {
        self.hooks.run_before(Phase::Metrics, &mut self.world);
        for group in &self.groups {
            self.hooks
                .run_before_group(Phase::Metrics, group.id(), &mut self.world);
        }
        let ctx = self.phase_context();
        crate::systems::metrics::run(&mut self.world, &self.events, &mut self.metrics, &ctx);
        for group in &self.groups {
            self.hooks
                .run_after_group(Phase::Metrics, group.id(), &mut self.world);
        }
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

    /// Register a hook to run before a phase for a specific group.
    pub fn add_before_group_hook(
        &mut self,
        phase: Phase,
        group: GroupId,
        hook: impl Fn(&mut World) + Send + Sync + 'static,
    ) {
        self.hooks.add_before_group(phase, group, Box::new(hook));
    }

    /// Register a hook to run after a phase for a specific group.
    pub fn add_after_group_hook(
        &mut self,
        phase: Phase,
        group: GroupId,
        hook: impl Fn(&mut World) + Send + Sync + 'static,
    ) {
        self.hooks.add_after_group(phase, group, Box::new(hook));
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
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::new().build().unwrap();
    /// sim.step();
    /// assert_eq!(sim.current_tick(), 1);
    /// ```
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
