//! Top-level simulation runner and tick loop.

use crate::components::{
    AccessControl, Elevator, ElevatorPhase, FloorPosition, Line, Orientation, Patience, Position,
    Preferences, Rider, RiderPhase, Route, Stop, Velocity,
};
use crate::config::SimConfig;
use crate::dispatch::{
    BuiltinReposition, BuiltinStrategy, DispatchStrategy, ElevatorGroup, LineInfo,
    RepositionStrategy,
};
use crate::door::DoorState;
use crate::entity::EntityId;
use crate::error::SimError;
use crate::events::{Event, EventBus};
use crate::hooks::{Phase, PhaseHooks};
use crate::ids::GroupId;
use crate::metrics::Metrics;
use crate::rider_index::RiderIndex;
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
    /// Stop entity IDs this elevator cannot serve (access restriction).
    pub restricted_stops: HashSet<EntityId>,
    /// Speed multiplier for Inspection mode (0.0..1.0).
    pub inspection_speed_factor: f64,
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
            restricted_stops: HashSet::new(),
            inspection_speed_factor: 0.25,
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

/// Fluent builder for spawning riders with optional configuration.
///
/// Created via [`Simulation::build_rider`] or [`Simulation::build_rider_by_stop_id`].
///
/// ```
/// use elevator_core::prelude::*;
///
/// let mut sim = SimulationBuilder::new().build().unwrap();
/// let rider = sim.build_rider_by_stop_id(StopId(0), StopId(1))
///     .unwrap()
///     .weight(80.0)
///     .spawn()
///     .unwrap();
/// ```
pub struct RiderBuilder<'a> {
    /// Mutable reference to the simulation (consumed on spawn).
    sim: &'a mut Simulation,
    /// Origin stop entity.
    origin: EntityId,
    /// Destination stop entity.
    destination: EntityId,
    /// Rider weight (default: 75.0).
    weight: f64,
    /// Explicit dispatch group (skips auto-detection).
    group: Option<GroupId>,
    /// Explicit multi-leg route.
    route: Option<Route>,
    /// Maximum wait ticks before abandoning.
    patience: Option<u64>,
    /// Boarding preferences.
    preferences: Option<Preferences>,
    /// Per-rider access control.
    access_control: Option<AccessControl>,
}

impl RiderBuilder<'_> {
    /// Set the rider's weight (default: 75.0).
    #[must_use]
    pub const fn weight(mut self, weight: f64) -> Self {
        self.weight = weight;
        self
    }

    /// Set the dispatch group explicitly, skipping auto-detection.
    #[must_use]
    pub const fn group(mut self, group: GroupId) -> Self {
        self.group = Some(group);
        self
    }

    /// Provide an explicit multi-leg route.
    #[must_use]
    pub fn route(mut self, route: Route) -> Self {
        self.route = Some(route);
        self
    }

    /// Set maximum wait ticks before the rider abandons.
    #[must_use]
    pub const fn patience(mut self, max_wait_ticks: u64) -> Self {
        self.patience = Some(max_wait_ticks);
        self
    }

    /// Set boarding preferences.
    #[must_use]
    pub const fn preferences(mut self, prefs: Preferences) -> Self {
        self.preferences = Some(prefs);
        self
    }

    /// Set per-rider access control (allowed stops).
    #[must_use]
    pub fn access_control(mut self, ac: AccessControl) -> Self {
        self.access_control = Some(ac);
        self
    }

    /// Spawn the rider with the configured options.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::NoRoute`] if no group serves both stops (when auto-detecting).
    /// Returns [`SimError::AmbiguousRoute`] if multiple groups serve both stops (when auto-detecting).
    /// Returns [`SimError::GroupNotFound`] if an explicit group does not exist.
    pub fn spawn(self) -> Result<EntityId, SimError> {
        let route = if let Some(route) = self.route {
            route
        } else if let Some(group) = self.group {
            if !self.sim.groups.iter().any(|g| g.id() == group) {
                return Err(SimError::GroupNotFound(group));
            }
            Route::direct(self.origin, self.destination, group)
        } else {
            // Auto-detect group (same logic as spawn_rider).
            let matching: Vec<GroupId> = self
                .sim
                .groups
                .iter()
                .filter(|g| {
                    g.stop_entities().contains(&self.origin)
                        && g.stop_entities().contains(&self.destination)
                })
                .map(ElevatorGroup::id)
                .collect();

            match matching.len() {
                0 => {
                    let origin_groups: Vec<GroupId> = self
                        .sim
                        .groups
                        .iter()
                        .filter(|g| g.stop_entities().contains(&self.origin))
                        .map(ElevatorGroup::id)
                        .collect();
                    let destination_groups: Vec<GroupId> = self
                        .sim
                        .groups
                        .iter()
                        .filter(|g| g.stop_entities().contains(&self.destination))
                        .map(ElevatorGroup::id)
                        .collect();
                    return Err(SimError::NoRoute {
                        origin: self.origin,
                        destination: self.destination,
                        origin_groups,
                        destination_groups,
                    });
                }
                1 => Route::direct(self.origin, self.destination, matching[0]),
                _ => {
                    return Err(SimError::AmbiguousRoute {
                        origin: self.origin,
                        destination: self.destination,
                        groups: matching,
                    });
                }
            }
        };

        let eid = self
            .sim
            .spawn_rider_inner(self.origin, self.destination, self.weight, route);

        // Apply optional components.
        if let Some(max_wait) = self.patience {
            self.sim.world.set_patience(
                eid,
                Patience {
                    max_wait_ticks: max_wait,
                    waited_ticks: 0,
                },
            );
        }
        if let Some(prefs) = self.preferences {
            self.sim.world.set_preferences(eid, prefs);
        }
        if let Some(ac) = self.access_control {
            self.sim.world.set_access_control(eid, ac);
        }

        Ok(eid)
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
    /// Reposition strategies keyed by group (optional per group).
    repositioners: BTreeMap<GroupId, Box<dyn RepositionStrategy>>,
    /// Serializable reposition strategy identifiers (for snapshot).
    reposition_ids: BTreeMap<GroupId, BuiltinReposition>,
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
    /// Phase-partitioned reverse index for O(1) population queries.
    rider_index: RiderIndex,
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

        // Wire reposition strategies from group configs.
        let mut repositioners: BTreeMap<GroupId, Box<dyn RepositionStrategy>> = BTreeMap::new();
        let mut reposition_ids: BTreeMap<GroupId, BuiltinReposition> = BTreeMap::new();
        if let Some(group_configs) = &config.building.groups {
            for gc in group_configs {
                if let Some(ref repo_id) = gc.reposition {
                    if let Some(strategy) = repo_id.instantiate() {
                        let gid = GroupId(gc.id);
                        repositioners.insert(gid, strategy);
                        reposition_ids.insert(gid, repo_id.clone());
                    }
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
            repositioners,
            reposition_ids,
            metrics: Metrics::new(),
            time: TimeAdapter::new(config.simulation.ticks_per_second),
            hooks,
            elevator_ids_buf: Vec::new(),
            topo_graph: Mutex::new(TopologyGraph::new()),
            rider_index: RiderIndex::default(),
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
            let restricted: HashSet<EntityId> = ec
                .restricted_stops
                .iter()
                .filter_map(|sid| stop_lookup.get(sid).copied())
                .collect();
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
                    repositioning: false,
                    restricted_stops: restricted,
                    inspection_speed_factor: ec.inspection_speed_factor,
                    going_up: true,
                    going_down: true,
                    move_count: 0,
                },
            );
            #[cfg(feature = "energy")]
            if let Some(ref profile) = ec.energy_profile {
                world.set_energy_profile(eid, profile.clone());
                world.set_energy_metrics(eid, crate::energy::EnergyMetrics::default());
            }
            if let Some(mode) = ec.service_mode {
                world.set_service_mode(eid, mode);
            }
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
                let restricted: HashSet<EntityId> = ec
                    .restricted_stops
                    .iter()
                    .filter_map(|sid| stop_lookup.get(sid).copied())
                    .collect();
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
                        repositioning: false,
                        restricted_stops: restricted,
                        inspection_speed_factor: ec.inspection_speed_factor,
                        going_up: true,
                        going_down: true,
                        move_count: 0,
                    },
                );
                #[cfg(feature = "energy")]
                if let Some(ref profile) = ec.energy_profile {
                    world.set_energy_profile(eid, profile.clone());
                    world.set_energy_metrics(eid, crate::energy::EnergyMetrics::default());
                }
                if let Some(mode) = ec.service_mode {
                    world.set_service_mode(eid, mode);
                }
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
        let mut rider_index = RiderIndex::default();
        rider_index.rebuild(&world);
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
            repositioners: BTreeMap::new(),
            reposition_ids: BTreeMap::new(),
            metrics,
            time: TimeAdapter::new(ticks_per_second),
            hooks: PhaseHooks::default(),
            elevator_ids_buf: Vec::new(),
            topo_graph: Mutex::new(TopologyGraph::new()),
            rider_index,
        }
    }

    /// Validate configuration before constructing the simulation.
    pub(crate) fn validate_config(config: &SimConfig) -> Result<(), SimError> {
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
                    reason: format!("duplicate {}", stop.id),
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
        if elev.inspection_speed_factor <= 0.0 {
            return Err(SimError::InvalidConfig {
                field: "elevators.inspection_speed_factor",
                reason: format!("must be positive, got {}", elev.inspection_speed_factor),
            });
        }
        if !building.stops.iter().any(|s| s.id == elev.starting_stop) {
            return Err(SimError::InvalidConfig {
                field: "elevators.starting_stop",
                reason: format!("references non-existent {}", elev.starting_stop),
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

    // ── Reposition management ─────────────────────────────────────────

    /// Set the reposition strategy for a group.
    ///
    /// Enables the reposition phase for this group. Idle elevators will
    /// be repositioned according to the strategy after each dispatch phase.
    pub fn set_reposition(
        &mut self,
        group: GroupId,
        strategy: Box<dyn RepositionStrategy>,
        id: BuiltinReposition,
    ) {
        self.repositioners.insert(group, strategy);
        self.reposition_ids.insert(group, id);
    }

    /// Remove the reposition strategy for a group, disabling repositioning.
    pub fn remove_reposition(&mut self, group: GroupId) {
        self.repositioners.remove(&group);
        self.reposition_ids.remove(&group);
    }

    /// Get the reposition strategy identifier for a group.
    #[must_use]
    pub fn reposition_id(&self, group: GroupId) -> Option<&BuiltinReposition> {
        self.reposition_ids.get(&group)
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

    /// Create a rider builder for fluent rider spawning.
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::new().build().unwrap();
    /// let s0 = sim.stop_entity(StopId(0)).unwrap();
    /// let s1 = sim.stop_entity(StopId(1)).unwrap();
    /// let rider = sim.build_rider(s0, s1)
    ///     .weight(80.0)
    ///     .spawn()
    ///     .unwrap();
    /// ```
    pub const fn build_rider(
        &mut self,
        origin: EntityId,
        destination: EntityId,
    ) -> RiderBuilder<'_> {
        RiderBuilder {
            sim: self,
            origin,
            destination,
            weight: 75.0,
            group: None,
            route: None,
            patience: None,
            preferences: None,
            access_control: None,
        }
    }

    /// Create a rider builder using config `StopId`s.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::StopNotFound`] if either stop ID is unknown.
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::new().build().unwrap();
    /// let rider = sim.build_rider_by_stop_id(StopId(0), StopId(1))
    ///     .unwrap()
    ///     .weight(80.0)
    ///     .spawn()
    ///     .unwrap();
    /// ```
    pub fn build_rider_by_stop_id(
        &mut self,
        origin: StopId,
        destination: StopId,
    ) -> Result<RiderBuilder<'_>, SimError> {
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
        Ok(RiderBuilder {
            sim: self,
            origin: origin_eid,
            destination: dest_eid,
            weight: 75.0,
            group: None,
            route: None,
            patience: None,
            preferences: None,
            access_control: None,
        })
    }

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
                let origin_groups: Vec<GroupId> = self
                    .groups
                    .iter()
                    .filter(|g| g.stop_entities().contains(&origin))
                    .map(ElevatorGroup::id)
                    .collect();
                let destination_groups: Vec<GroupId> = self
                    .groups
                    .iter()
                    .filter(|g| g.stop_entities().contains(&destination))
                    .map(ElevatorGroup::id)
                    .collect();
                return Err(SimError::NoRoute {
                    origin,
                    destination,
                    origin_groups,
                    destination_groups,
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
        self.rider_index.insert_waiting(origin, eid);
        self.events.emit(Event::RiderSpawned {
            rider: eid,
            origin,
            destination,
            tick: self.tick,
        });

        // Auto-tag the rider with "stop:{name}" for per-stop wait time tracking.
        let stop_tag = self
            .world
            .stop(origin)
            .map(|s| format!("stop:{}", s.name()));

        // Inherit metric tags from the origin stop.
        if let Some(tags_res) = self
            .world
            .resource_mut::<crate::tagged_metrics::MetricTags>()
        {
            let origin_tags: Vec<String> = tags_res.tags_for(origin).to_vec();
            for tag in origin_tags {
                tags_res.tag(eid, tag);
            }
            // Apply the origin stop tag.
            if let Some(tag) = stop_tag {
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

    /// Drain only events matching a predicate.
    ///
    /// Events that don't match the predicate remain in the buffer
    /// and will be returned by future `drain_events` or
    /// `drain_events_where` calls.
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::new().build().unwrap();
    /// sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 70.0).unwrap();
    /// sim.step();
    ///
    /// let spawns: Vec<Event> = sim.drain_events_where(|e| {
    ///     matches!(e, Event::RiderSpawned { .. })
    /// });
    /// ```
    pub fn drain_events_where(&mut self, predicate: impl Fn(&Event) -> bool) -> Vec<Event> {
        // Flush bus into pending_output first.
        self.pending_output.extend(self.events.drain());

        let mut matched = Vec::new();
        let mut remaining = Vec::new();
        for event in std::mem::take(&mut self.pending_output) {
            if predicate(&event) {
                matched.push(event);
            } else {
                remaining.push(event);
            }
        }
        self.pending_output = remaining;
        matched
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
                repositioning: false,
                restricted_stops: params.restricted_stops.clone(),
                inspection_speed_factor: params.inspection_speed_factor,
                going_up: true,
                going_down: true,
                move_count: 0,
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

    /// Remove an elevator from the simulation.
    ///
    /// The elevator is disabled first (ejecting any riders), then removed
    /// from its line and despawned from the world.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::EntityNotFound`] if the elevator does not exist.
    pub fn remove_elevator(&mut self, elevator: EntityId) -> Result<(), SimError> {
        let line = self
            .world
            .elevator(elevator)
            .ok_or(SimError::EntityNotFound(elevator))?
            .line();

        // Disable first to eject riders and reset state.
        let _ = self.disable(elevator);

        // Find and remove from group/line topology.
        let mut group_id = GroupId(0);
        if let Ok((group_idx, line_idx)) = self.find_line(line) {
            self.groups[group_idx].lines_mut()[line_idx]
                .elevators_mut()
                .retain(|&e| e != elevator);
            self.groups[group_idx].rebuild_caches();

            // Notify dispatch strategy.
            group_id = self.groups[group_idx].id();
            if let Some(dispatcher) = self.dispatchers.get_mut(&group_id) {
                dispatcher.notify_removed(elevator);
            }
        }

        self.events.emit(Event::ElevatorRemoved {
            elevator,
            line,
            group: group_id,
            tick: self.tick,
        });

        // Despawn from world.
        self.world.despawn(elevator);

        if let Ok(mut g) = self.topo_graph.lock() {
            g.mark_dirty();
        }
        Ok(())
    }

    /// Remove a stop from the simulation.
    ///
    /// The stop is disabled first (invalidating routes that reference it),
    /// then removed from all lines and despawned from the world.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::EntityNotFound`] if the stop does not exist.
    pub fn remove_stop(&mut self, stop: EntityId) -> Result<(), SimError> {
        if self.world.stop(stop).is_none() {
            return Err(SimError::EntityNotFound(stop));
        }

        // Disable first to invalidate routes referencing this stop.
        let _ = self.disable(stop);

        // Remove from all lines and groups.
        for group in &mut self.groups {
            for line_info in group.lines_mut() {
                line_info.serves_mut().retain(|&s| s != stop);
            }
            group.rebuild_caches();
        }

        // Remove from SortedStops resource.
        if let Some(sorted) = self.world.resource_mut::<crate::world::SortedStops>() {
            sorted.0.retain(|&(_, s)| s != stop);
        }

        // Remove from stop_lookup.
        self.stop_lookup.retain(|_, &mut eid| eid != stop);

        self.events.emit(Event::StopRemoved {
            stop,
            tick: self.tick,
        });

        // Despawn from world.
        self.world.despawn(stop);

        if let Ok(mut g) = self.topo_graph.lock() {
            g.mark_dirty();
        }
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

    /// Iterate over elevators currently repositioning.
    pub fn iter_repositioning_elevators(&self) -> impl Iterator<Item = EntityId> + '_ {
        self.world
            .iter_elevators()
            .filter_map(|(id, _pos, car)| if car.repositioning() { Some(id) } else { None })
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
    fn group_from_route(&self, route: Option<&Route>) -> GroupId {
        if let Some(route) = route {
            // Scan forward from current_leg looking for a Group or Line transport mode.
            for leg in route.legs.iter().skip(route.current_leg) {
                match leg.via {
                    crate::components::TransportMode::Group(g) => return g,
                    crate::components::TransportMode::Line(l) => {
                        if let Some(line) = self.world.line(l) {
                            return line.group();
                        }
                    }
                    crate::components::TransportMode::Walk => {}
                }
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

        let group = self.group_from_route(self.world.route(rider));
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

    // ── Rider settlement & population ─────────────────────────────

    /// Transition an `Arrived` or `Abandoned` rider to `Resident` at their
    /// current stop.
    ///
    /// Resident riders are parked — invisible to dispatch and loading, but
    /// queryable via [`residents_at()`](Self::residents_at). They can later
    /// be given a new route via [`reroute_rider()`](Self::reroute_rider).
    ///
    /// # Errors
    ///
    /// Returns [`SimError::EntityNotFound`] if `id` does not exist.
    /// Returns [`SimError::InvalidState`] if the rider is not in
    /// `Arrived` or `Abandoned` phase, or has no current stop.
    pub fn settle_rider(&mut self, id: EntityId) -> Result<(), SimError> {
        let rider = self.world.rider(id).ok_or(SimError::EntityNotFound(id))?;

        let old_phase = rider.phase;
        match old_phase {
            RiderPhase::Arrived | RiderPhase::Abandoned => {}
            _ => {
                return Err(SimError::InvalidState {
                    entity: id,
                    reason: format!(
                        "cannot settle rider in {old_phase} phase, expected Arrived or Abandoned"
                    ),
                });
            }
        }

        let stop = rider.current_stop.ok_or_else(|| SimError::InvalidState {
            entity: id,
            reason: "rider has no current_stop".into(),
        })?;

        // Update index: remove from old partition (only Abandoned is indexed).
        if old_phase == RiderPhase::Abandoned {
            self.rider_index.remove_abandoned(stop, id);
        }
        self.rider_index.insert_resident(stop, id);

        if let Some(r) = self.world.rider_mut(id) {
            r.phase = RiderPhase::Resident;
        }

        self.metrics.record_settle();
        self.events.emit(Event::RiderSettled {
            rider: id,
            stop,
            tick: self.tick,
        });
        Ok(())
    }

    /// Give a `Resident` rider a new route, transitioning them to `Waiting`.
    ///
    /// The rider begins waiting at their current stop for an elevator
    /// matching the route's transport mode. If the rider has a [`Patience`]
    /// component, its `waited_ticks` is reset to zero.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::EntityNotFound`] if `id` does not exist.
    /// Returns [`SimError::InvalidState`] if the rider is not in `Resident` phase,
    /// the route has no legs, or the route's first leg origin does not match the
    /// rider's current stop.
    pub fn reroute_rider(&mut self, id: EntityId, route: Route) -> Result<(), SimError> {
        let rider = self.world.rider(id).ok_or(SimError::EntityNotFound(id))?;

        if rider.phase != RiderPhase::Resident {
            return Err(SimError::InvalidState {
                entity: id,
                reason: format!(
                    "cannot reroute rider in {} phase, expected Resident",
                    rider.phase
                ),
            });
        }

        let stop = rider.current_stop.ok_or_else(|| SimError::InvalidState {
            entity: id,
            reason: "resident rider has no current_stop".into(),
        })?;

        let new_destination = route
            .final_destination()
            .ok_or_else(|| SimError::InvalidState {
                entity: id,
                reason: "route has no legs".into(),
            })?;

        // Validate that the route departs from the rider's current stop.
        if let Some(leg) = route.current() {
            if leg.from != stop {
                return Err(SimError::InvalidState {
                    entity: id,
                    reason: format!(
                        "route origin {:?} does not match rider current_stop {:?}",
                        leg.from, stop
                    ),
                });
            }
        }

        self.rider_index.remove_resident(stop, id);
        self.rider_index.insert_waiting(stop, id);

        if let Some(r) = self.world.rider_mut(id) {
            r.phase = RiderPhase::Waiting;
        }
        self.world.set_route(id, route);

        // Reset patience if present.
        if let Some(p) = self.world.patience_mut(id) {
            p.waited_ticks = 0;
        }

        self.metrics.record_reroute();
        self.events.emit(Event::RiderRerouted {
            rider: id,
            new_destination,
            tick: self.tick,
        });
        Ok(())
    }

    /// Remove a rider from the simulation entirely.
    ///
    /// Cleans up the population index, metric tags, and elevator cross-references
    /// (if the rider is currently aboard). Emits [`Event::RiderDespawned`].
    ///
    /// All rider removal should go through this method rather than calling
    /// `world.despawn()` directly, to keep the population index consistent.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::EntityNotFound`] if `id` does not exist or is
    /// not a rider.
    pub fn despawn_rider(&mut self, id: EntityId) -> Result<(), SimError> {
        let rider = self.world.rider(id).ok_or(SimError::EntityNotFound(id))?;

        // Targeted index removal based on current phase (O(1) vs O(n) scan).
        if let Some(stop) = rider.current_stop {
            match rider.phase {
                RiderPhase::Waiting => self.rider_index.remove_waiting(stop, id),
                RiderPhase::Resident => self.rider_index.remove_resident(stop, id),
                RiderPhase::Abandoned => self.rider_index.remove_abandoned(stop, id),
                _ => {} // Boarding/Riding/Exiting/Walking/Arrived — not indexed
            }
        }

        if let Some(tags) = self
            .world
            .resource_mut::<crate::tagged_metrics::MetricTags>()
        {
            tags.remove_entity(id);
        }

        self.world.despawn(id);

        self.events.emit(Event::RiderDespawned {
            rider: id,
            tick: self.tick,
        });
        Ok(())
    }

    // ── Access control ──────────────────────────────────────────────

    /// Set the allowed stops for a rider.
    ///
    /// When set, the rider will only be allowed to board elevators that
    /// can take them to a stop in the allowed set. See
    /// [`AccessControl`](crate::components::AccessControl) for details.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::EntityNotFound`] if the rider does not exist.
    pub fn set_rider_access(
        &mut self,
        rider: EntityId,
        allowed_stops: HashSet<EntityId>,
    ) -> Result<(), SimError> {
        if self.world.rider(rider).is_none() {
            return Err(SimError::EntityNotFound(rider));
        }
        self.world
            .set_access_control(rider, crate::components::AccessControl::new(allowed_stops));
        Ok(())
    }

    /// Set the restricted stops for an elevator.
    ///
    /// Riders whose current destination is in this set will be rejected
    /// with [`RejectionReason::AccessDenied`](crate::error::RejectionReason::AccessDenied)
    /// during the loading phase.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::EntityNotFound`] if the elevator does not exist.
    pub fn set_elevator_restricted_stops(
        &mut self,
        elevator: EntityId,
        restricted_stops: HashSet<EntityId>,
    ) -> Result<(), SimError> {
        let car = self
            .world
            .elevator_mut(elevator)
            .ok_or(SimError::EntityNotFound(elevator))?;
        car.restricted_stops = restricted_stops;
        Ok(())
    }

    // ── Population queries ──────────────────────────────────────────

    /// Iterate over resident rider IDs at a stop (O(1) lookup).
    pub fn residents_at(&self, stop: EntityId) -> impl Iterator<Item = EntityId> + '_ {
        self.rider_index.residents_at(stop).iter().copied()
    }

    /// Count of residents at a stop (O(1)).
    #[must_use]
    pub fn resident_count_at(&self, stop: EntityId) -> usize {
        self.rider_index.resident_count_at(stop)
    }

    /// Iterate over waiting rider IDs at a stop (O(1) lookup).
    pub fn waiting_at(&self, stop: EntityId) -> impl Iterator<Item = EntityId> + '_ {
        self.rider_index.waiting_at(stop).iter().copied()
    }

    /// Count of waiting riders at a stop (O(1)).
    #[must_use]
    pub fn waiting_count_at(&self, stop: EntityId) -> usize {
        self.rider_index.waiting_count_at(stop)
    }

    /// Iterate over abandoned rider IDs at a stop (O(1) lookup).
    pub fn abandoned_at(&self, stop: EntityId) -> impl Iterator<Item = EntityId> + '_ {
        self.rider_index.abandoned_at(stop).iter().copied()
    }

    /// Count of abandoned riders at a stop (O(1)).
    #[must_use]
    pub fn abandoned_count_at(&self, stop: EntityId) -> usize {
        self.rider_index.abandoned_count_at(stop)
    }

    /// Get the rider entities currently aboard an elevator.
    ///
    /// Returns an empty slice if the elevator does not exist.
    #[must_use]
    pub fn riders_on(&self, elevator: EntityId) -> &[EntityId] {
        self.world
            .elevator(elevator)
            .map_or(&[], |car| car.riders())
    }

    /// Get the number of riders aboard an elevator.
    ///
    /// Returns 0 if the elevator does not exist.
    #[must_use]
    pub fn occupancy(&self, elevator: EntityId) -> usize {
        self.world
            .elevator(elevator)
            .map_or(0, |car| car.riders().len())
    }

    // ── Entity lifecycle ────────────────────────────────────────────

    /// Disable an entity. Disabled entities are skipped by all systems.
    ///
    /// If the entity is an elevator in motion, it is reset to `Idle` with
    /// zero velocity to prevent stale target references on re-enable.
    ///
    /// **Note on residents:** disabling a stop does not automatically handle
    /// `Resident` riders parked there. Callers should listen for
    /// [`Event::EntityDisabled`] and manually reroute or despawn any
    /// residents at the affected stop.
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
                    self.rider_index.insert_waiting(stop, *rid);
                    self.events.emit(Event::RiderEjected {
                        rider: *rid,
                        elevator: id,
                        stop,
                        tick: self.tick,
                    });
                }
            }

            let had_load = self
                .world
                .elevator(id)
                .is_some_and(|c| c.current_load > 0.0);
            let capacity = self.world.elevator(id).map(|c| c.weight_capacity);
            if let Some(car) = self.world.elevator_mut(id) {
                car.riders.clear();
                car.current_load = 0.0;
                car.phase = ElevatorPhase::Idle;
                car.target_stop = None;
            }
            if had_load {
                if let Some(cap) = capacity {
                    self.events.emit(Event::CapacityChanged {
                        elevator: id,
                        current_load: ordered_float::OrderedFloat(0.0),
                        capacity: ordered_float::OrderedFloat(cap),
                        tick: self.tick,
                    });
                }
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
                let group = self.group_from_route(self.world.route(rid));
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
                if let Some(stop) = rider_current_stop {
                    self.rider_index.remove_waiting(stop, rid);
                    self.rider_index.insert_abandoned(stop, rid);
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

    // ── Entity type queries ─────────────────────────────────────────

    /// Check if an entity is an elevator.
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let sim = SimulationBuilder::new().build().unwrap();
    /// let stop = sim.stop_entity(StopId(0)).unwrap();
    /// assert!(!sim.is_elevator(stop));
    /// assert!(sim.is_stop(stop));
    /// ```
    #[must_use]
    pub fn is_elevator(&self, id: EntityId) -> bool {
        self.world.elevator(id).is_some()
    }

    /// Check if an entity is a rider.
    #[must_use]
    pub fn is_rider(&self, id: EntityId) -> bool {
        self.world.rider(id).is_some()
    }

    /// Check if an entity is a stop.
    #[must_use]
    pub fn is_stop(&self, id: EntityId) -> bool {
        self.world.stop(id).is_some()
    }

    // ── Aggregate queries ───────────────────────────────────────────

    /// Count of elevators currently in the [`Idle`](ElevatorPhase::Idle) phase.
    ///
    /// Excludes disabled elevators (whose phase is reset to `Idle` on disable).
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let sim = SimulationBuilder::new().build().unwrap();
    /// assert_eq!(sim.idle_elevator_count(), 1);
    /// ```
    #[must_use]
    pub fn idle_elevator_count(&self) -> usize {
        self.world.iter_idle_elevators().count()
    }

    /// Current total weight aboard an elevator, or `None` if the entity is
    /// not an elevator.
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let sim = SimulationBuilder::new().build().unwrap();
    /// let stop = sim.stop_entity(StopId(0)).unwrap();
    /// assert_eq!(sim.elevator_load(stop), None); // not an elevator
    /// ```
    #[must_use]
    pub fn elevator_load(&self, id: EntityId) -> Option<f64> {
        self.world.elevator(id).map(|e| e.current_load)
    }

    /// Whether the elevator's up-direction indicator lamp is lit.
    ///
    /// Returns `None` if the entity is not an elevator. See
    /// [`Elevator::going_up`] for semantics.
    #[must_use]
    pub fn elevator_going_up(&self, id: EntityId) -> Option<bool> {
        self.world.elevator(id).map(Elevator::going_up)
    }

    /// Whether the elevator's down-direction indicator lamp is lit.
    ///
    /// Returns `None` if the entity is not an elevator. See
    /// [`Elevator::going_down`] for semantics.
    #[must_use]
    pub fn elevator_going_down(&self, id: EntityId) -> Option<bool> {
        self.world.elevator(id).map(Elevator::going_down)
    }

    /// Count of rounded-floor transitions for an elevator (passing-floor
    /// crossings plus arrivals). Returns `None` if the entity is not an
    /// elevator. Analogous to elevator-saga's `moveCount`.
    #[must_use]
    pub fn elevator_move_count(&self, id: EntityId) -> Option<u64> {
        self.world.elevator(id).map(Elevator::move_count)
    }

    /// Distance the elevator would travel while braking to a stop from its
    /// current velocity, at its configured deceleration rate.
    ///
    /// Uses the standard `v² / (2·a)` kinematic formula. A stationary
    /// elevator returns `Some(0.0)`. Returns `None` if the entity is not
    /// an elevator or lacks a velocity component.
    ///
    /// Useful for writing opportunistic dispatch strategies (e.g. "stop at
    /// this floor if we can brake in time") without duplicating the physics
    /// computation.
    #[must_use]
    pub fn braking_distance(&self, id: EntityId) -> Option<f64> {
        let car = self.world.elevator(id)?;
        let vel = self.world.velocity(id)?.value;
        Some(crate::movement::braking_distance(vel, car.deceleration))
    }

    /// The position where the elevator would come to rest if it began braking
    /// this instant. Current position plus a signed braking distance in the
    /// direction of travel.
    ///
    /// Returns `None` if the entity is not an elevator or lacks the required
    /// components.
    #[must_use]
    pub fn future_stop_position(&self, id: EntityId) -> Option<f64> {
        let pos = self.world.position(id)?.value;
        let vel = self.world.velocity(id)?.value;
        let car = self.world.elevator(id)?;
        let dist = crate::movement::braking_distance(vel, car.deceleration);
        Some(vel.signum().mul_add(dist, pos))
    }

    /// Count of elevators currently in the given phase.
    ///
    /// Excludes disabled elevators (whose phase is reset to `Idle` on disable).
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let sim = SimulationBuilder::new().build().unwrap();
    /// assert_eq!(sim.elevators_in_phase(ElevatorPhase::Idle), 1);
    /// assert_eq!(sim.elevators_in_phase(ElevatorPhase::Loading), 0);
    /// ```
    #[must_use]
    pub fn elevators_in_phase(&self, phase: ElevatorPhase) -> usize {
        self.world
            .iter_elevators()
            .filter(|(id, _, e)| e.phase() == phase && !self.world.is_disabled(*id))
            .count()
    }

    // ── Service mode ────────────────────────────────────────────────

    /// Set the service mode for an elevator.
    ///
    /// Emits [`Event::ServiceModeChanged`] if the mode actually changes.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::EntityNotFound`] if the elevator does not exist.
    pub fn set_service_mode(
        &mut self,
        elevator: EntityId,
        mode: crate::components::ServiceMode,
    ) -> Result<(), SimError> {
        if self.world.elevator(elevator).is_none() {
            return Err(SimError::EntityNotFound(elevator));
        }
        let old = self
            .world
            .service_mode(elevator)
            .copied()
            .unwrap_or_default();
        if old == mode {
            return Ok(());
        }
        self.world.set_service_mode(elevator, mode);
        self.events.emit(Event::ServiceModeChanged {
            elevator,
            from: old,
            to: mode,
            tick: self.tick,
        });
        Ok(())
    }

    /// Get the current service mode for an elevator.
    #[must_use]
    pub fn service_mode(&self, elevator: EntityId) -> crate::components::ServiceMode {
        self.world
            .service_mode(elevator)
            .copied()
            .unwrap_or_default()
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
        crate::systems::advance_transient::run(
            &mut self.world,
            &mut self.events,
            &ctx,
            &mut self.rider_index,
        );
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
            &self.rider_index,
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
            &mut self.metrics,
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
            &mut self.rider_index,
        );
        for group in &self.groups {
            self.hooks
                .run_after_group(Phase::Loading, group.id(), &mut self.world);
        }
        self.hooks.run_after(Phase::Loading, &mut self.world);
    }

    /// Run only the reposition phase (with hooks).
    ///
    /// Only runs if at least one group has a [`RepositionStrategy`] configured.
    /// Idle elevators with no pending dispatch assignment are repositioned
    /// according to their group's strategy.
    pub fn run_reposition(&mut self) {
        if self.repositioners.is_empty() {
            return;
        }
        self.hooks.run_before(Phase::Reposition, &mut self.world);
        // Only run per-group hooks for groups that have a repositioner.
        for group in &self.groups {
            if self.repositioners.contains_key(&group.id()) {
                self.hooks
                    .run_before_group(Phase::Reposition, group.id(), &mut self.world);
            }
        }
        let ctx = self.phase_context();
        crate::systems::reposition::run(
            &mut self.world,
            &mut self.events,
            &ctx,
            &self.groups,
            &mut self.repositioners,
        );
        for group in &self.groups {
            if self.repositioners.contains_key(&group.id()) {
                self.hooks
                    .run_after_group(Phase::Reposition, group.id(), &mut self.world);
            }
        }
        self.hooks.run_after(Phase::Reposition, &mut self.world);
    }

    /// Run the energy system (no hooks — inline phase).
    #[cfg(feature = "energy")]
    fn run_energy(&mut self) {
        let ctx = self.phase_context();
        self.world.elevator_ids_into(&mut self.elevator_ids_buf);
        crate::systems::energy::run(
            &mut self.world,
            &mut self.events,
            &ctx,
            &self.elevator_ids_buf,
        );
    }

    /// Run only the metrics phase (with hooks).
    pub fn run_metrics(&mut self) {
        self.hooks.run_before(Phase::Metrics, &mut self.world);
        for group in &self.groups {
            self.hooks
                .run_before_group(Phase::Metrics, group.id(), &mut self.world);
        }
        let ctx = self.phase_context();
        crate::systems::metrics::run(
            &mut self.world,
            &self.events,
            &mut self.metrics,
            &ctx,
            &self.groups,
        );
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
        self.run_reposition();
        self.run_movement();
        self.run_doors();
        self.run_loading();
        #[cfg(feature = "energy")]
        self.run_energy();
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
