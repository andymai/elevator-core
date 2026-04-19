//! Simulation construction, validation, and topology assembly.
//!
//! Split out from `sim.rs` to keep each concern readable. Holds:
//!
//! - [`Simulation::new`] and [`Simulation::new_with_hooks`]
//! - Config validation ([`Simulation::validate_config`] and helpers)
//! - Legacy and explicit topology builders
//! - [`Simulation::from_parts`] for snapshot restore
//! - Dispatch, reposition, and hook registration helpers
//!
//! Since this is a child module of `crate::sim`, it can access `Simulation`'s
//! private fields directly — no visibility relaxation required.

use std::collections::{BTreeMap, HashMap, HashSet};
use std::sync::Mutex;

use crate::components::{Elevator, ElevatorPhase, Line, Orientation, Position, Stop, Velocity};
use crate::config::SimConfig;
use crate::dispatch::{
    BuiltinReposition, BuiltinStrategy, DispatchStrategy, ElevatorGroup, LineInfo,
    RepositionStrategy,
};
use crate::door::DoorState;
use crate::entity::EntityId;
use crate::error::SimError;
use crate::events::EventBus;
use crate::hooks::{Phase, PhaseHooks};
use crate::ids::GroupId;
use crate::metrics::Metrics;
use crate::rider_index::RiderIndex;
use crate::stop::StopId;
use crate::time::TimeAdapter;
use crate::topology::TopologyGraph;
use crate::world::World;

use super::Simulation;

/// Bundled topology result: groups, dispatchers, and strategy IDs.
type TopologyResult = (
    Vec<ElevatorGroup>,
    BTreeMap<GroupId, Box<dyn DispatchStrategy>>,
    BTreeMap<GroupId, BuiltinStrategy>,
);

/// Validate the physics fields shared by [`crate::config::ElevatorConfig`]
/// and [`super::ElevatorParams`]. Both construction-time validation and
/// the runtime `add_elevator` path call this so an invalid set of params
/// can never reach the world (zeroes blow up movement; zero door ticks
/// stall the door FSM).
#[allow(clippy::too_many_arguments)]
pub(super) fn validate_elevator_physics(
    max_speed: f64,
    acceleration: f64,
    deceleration: f64,
    weight_capacity: f64,
    inspection_speed_factor: f64,
    door_transition_ticks: u32,
    door_open_ticks: u32,
    bypass_load_up_pct: Option<f64>,
    bypass_load_down_pct: Option<f64>,
) -> Result<(), SimError> {
    if !max_speed.is_finite() || max_speed <= 0.0 {
        return Err(SimError::InvalidConfig {
            field: "elevators.max_speed",
            reason: format!("must be finite and positive, got {max_speed}"),
        });
    }
    if !acceleration.is_finite() || acceleration <= 0.0 {
        return Err(SimError::InvalidConfig {
            field: "elevators.acceleration",
            reason: format!("must be finite and positive, got {acceleration}"),
        });
    }
    if !deceleration.is_finite() || deceleration <= 0.0 {
        return Err(SimError::InvalidConfig {
            field: "elevators.deceleration",
            reason: format!("must be finite and positive, got {deceleration}"),
        });
    }
    if !weight_capacity.is_finite() || weight_capacity <= 0.0 {
        return Err(SimError::InvalidConfig {
            field: "elevators.weight_capacity",
            reason: format!("must be finite and positive, got {weight_capacity}"),
        });
    }
    if !inspection_speed_factor.is_finite() || inspection_speed_factor <= 0.0 {
        return Err(SimError::InvalidConfig {
            field: "elevators.inspection_speed_factor",
            reason: format!("must be finite and positive, got {inspection_speed_factor}"),
        });
    }
    if door_transition_ticks == 0 {
        return Err(SimError::InvalidConfig {
            field: "elevators.door_transition_ticks",
            reason: "must be > 0".into(),
        });
    }
    if door_open_ticks == 0 {
        return Err(SimError::InvalidConfig {
            field: "elevators.door_open_ticks",
            reason: "must be > 0".into(),
        });
    }
    validate_bypass_pct("elevators.bypass_load_up_pct", bypass_load_up_pct)?;
    validate_bypass_pct("elevators.bypass_load_down_pct", bypass_load_down_pct)?;
    Ok(())
}

/// `bypass_load_{up,down}_pct` must be a finite fraction in `(0.0, 1.0]`
/// when set. `pct = 0.0` would bypass at an empty car (nonsense); `NaN`
/// and infinities silently disable the bypass under the dispatch guard,
/// which is a silent foot-gun. Reject at config time instead.
fn validate_bypass_pct(field: &'static str, pct: Option<f64>) -> Result<(), SimError> {
    let Some(pct) = pct else {
        return Ok(());
    };
    if !pct.is_finite() || pct <= 0.0 || pct > 1.0 {
        return Err(SimError::InvalidConfig {
            field,
            reason: format!("must be finite in (0.0, 1.0] when set, got {pct}"),
        });
    }
    Ok(())
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

        // Per-stop arrival signal, appended on rider spawn and queried
        // by dispatch/reposition strategies to drive traffic-mode
        // switches and predictive parking.
        world.insert_resource(crate::arrival_log::ArrivalLog::default());
        world.insert_resource(crate::arrival_log::CurrentTick::default());
        world.insert_resource(crate::arrival_log::ArrivalLogRetention::default());
        // Traffic-mode classifier. Auto-refreshed in the metrics phase
        // from the same rolling window; strategies read the current
        // mode via `World::resource::<TrafficDetector>()`.
        world.insert_resource(crate::traffic_detector::TrafficDetector::default());
        // Expose tick rate to strategies that need to unit-convert
        // tick-denominated elevator fields (door cycle, ack latency)
        // into the second-denominated terms of their cost functions.
        // Without this, ETD's door-overhead term was summing ticks
        // into a seconds expression and getting ~60× over-weighted.
        world.insert_resource(crate::time::TickRate(config.simulation.ticks_per_second));

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
                if let Some(ref repo_id) = gc.reposition
                    && let Some(strategy) = repo_id.instantiate()
                {
                    let gid = GroupId(gc.id);
                    repositioners.insert(gid, strategy);
                    reposition_ids.insert(gid, repo_id.clone());
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
            reposition_buf: Vec::new(),
            topo_graph: Mutex::new(TopologyGraph::new()),
            rider_index: RiderIndex::default(),
            tick_in_progress: false,
        })
    }

    /// Spawn a single elevator entity from an `ElevatorConfig` onto `line`.
    ///
    /// Sets position, velocity, all `Elevator` fields, optional energy profile,
    /// optional service mode, and an empty `DestinationQueue`.
    /// Returns the new entity ID.
    fn spawn_elevator_entity(
        world: &mut World,
        ec: &crate::config::ElevatorConfig,
        line: EntityId,
        stop_lookup: &HashMap<StopId, EntityId>,
        start_pos_lookup: &[crate::stop::StopConfig],
    ) -> EntityId {
        let eid = world.spawn();
        let start_pos = start_pos_lookup
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
                current_load: crate::components::Weight::ZERO,
                riders: Vec::new(),
                target_stop: None,
                door_transition_ticks: ec.door_transition_ticks,
                door_open_ticks: ec.door_open_ticks,
                line,
                repositioning: false,
                restricted_stops: restricted,
                inspection_speed_factor: ec.inspection_speed_factor,
                going_up: true,
                going_down: true,
                move_count: 0,
                door_command_queue: Vec::new(),
                manual_target_velocity: None,
                bypass_load_up_pct: ec.bypass_load_up_pct,
                bypass_load_down_pct: ec.bypass_load_down_pct,
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
        world.set_destination_queue(eid, crate::components::DestinationQueue::new());
        eid
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
            let eid = Self::spawn_elevator_entity(
                world,
                ec,
                default_line_eid,
                stop_lookup,
                &config.building.stops,
            );
            elevator_entities.push(eid);
        }

        let default_line_info =
            LineInfo::new(default_line_eid, elevator_entities, all_stop_entities);

        let group = ElevatorGroup::new(GroupId(0), "Default".into(), vec![default_line_info]);

        // Legacy topology has exactly one group: GroupId(0). Honour a
        // builder-provided dispatcher for that group; ignore any builder
        // entry keyed on a different GroupId (it would have nothing to
        // attach to). Pre-fix this used `into_iter().next()` which
        // discarded the GroupId entirely and could attach a dispatcher
        // intended for a different group to GroupId(0). (#288)
        let mut dispatchers = BTreeMap::new();
        let mut strategy_ids = BTreeMap::new();
        let user_dispatcher = builder_dispatchers
            .into_iter()
            .find_map(|(gid, d)| if gid == GroupId(0) { Some(d) } else { None });
        if let Some(d) = user_dispatcher {
            dispatchers.insert(GroupId(0), d);
        } else {
            dispatchers.insert(
                GroupId(0),
                Box::new(crate::dispatch::scan::ScanDispatch::new()) as Box<dyn DispatchStrategy>,
            );
        }
        // strategy_ids defaults to Scan (the legacy-topology default and
        // the type passed by every Simulation::new caller in practice).
        // Builder users who install a non-Scan dispatcher should also
        // call `.with_strategy_id(...)` if they need snapshot fidelity —
        // we can't infer the BuiltinStrategy class from `Box<dyn>`.
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
                let eid = Self::spawn_elevator_entity(
                    world,
                    ec,
                    line_eid,
                    stop_lookup,
                    &config.building.stops,
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

                let mut group = ElevatorGroup::new(group_id, gc.name.clone(), group_lines);
                if let Some(mode) = gc.hall_call_mode {
                    group.set_hall_call_mode(mode);
                }
                if let Some(ticks) = gc.ack_latency_ticks {
                    group.set_ack_latency_ticks(ticks);
                }
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
        // Pre-fix this could mismatch `strategy_ids` against `dispatchers`
        // when both config and builder specified a strategy for the same
        // group (#287). The new precedence: builder wins for the dispatcher
        // and we keep the config's strategy_id only when no builder
        // override touched the group.
        for (gid, d) in builder_dispatchers {
            dispatchers.insert(gid, d);
            // Builder dispatchers don't carry a `BuiltinStrategy` discriminant.
            // If there's no config strategy_id for this group, leave it absent
            // (snapshot will fail to instantiate; caller must register a
            // factory). If there IS one, keep it: in practice, the
            // `Simulation::new(cfg, X)` direct path always passes an X that
            // matches the config's declared strategy.
            strategy_ids
                .entry(gid)
                .or_insert_with(|| BuiltinStrategy::Custom("user-supplied".into()));
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
        // Ensure the dispatch-visible tick rate matches the simulation
        // tick rate after a snapshot restore; a snapshot that predates
        // the `TickRate` resource leaves it absent and dispatch would
        // otherwise fall back to the 60 Hz default even for a 30 Hz
        // sim, silently halving ETD's door-cost scale.
        let mut world = world;
        world.insert_resource(crate::time::TickRate(ticks_per_second));
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
            reposition_buf: Vec::new(),
            topo_graph: Mutex::new(TopologyGraph::new()),
            rider_index,
            tick_in_progress: false,
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

        // Check for duplicate stop IDs and validate positions.
        let mut seen_ids = HashSet::new();
        for stop in &config.building.stops {
            if !seen_ids.insert(stop.id) {
                return Err(SimError::InvalidConfig {
                    field: "building.stops",
                    reason: format!("duplicate {}", stop.id),
                });
            }
            if !stop.position.is_finite() {
                return Err(SimError::InvalidConfig {
                    field: "building.stops.position",
                    reason: format!("{} has non-finite position {}", stop.id, stop.position),
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

        if !config.simulation.ticks_per_second.is_finite()
            || config.simulation.ticks_per_second <= 0.0
        {
            return Err(SimError::InvalidConfig {
                field: "simulation.ticks_per_second",
                reason: format!(
                    "must be finite and positive, got {}",
                    config.simulation.ticks_per_second
                ),
            });
        }

        Self::validate_passenger_spawning(&config.passenger_spawning)?;

        Ok(())
    }

    /// Validate `PassengerSpawnConfig`. Without this, bad inputs reach
    /// `PoissonSource::from_config` and panic later (NaN/negative weights
    /// crash `random_range`/`Weight::from`; zero `mean_interval_ticks`
    /// burst-fires every catch-up tick). (#272)
    fn validate_passenger_spawning(
        spawn: &crate::config::PassengerSpawnConfig,
    ) -> Result<(), SimError> {
        let (lo, hi) = spawn.weight_range;
        if !lo.is_finite() || !hi.is_finite() {
            return Err(SimError::InvalidConfig {
                field: "passenger_spawning.weight_range",
                reason: format!("both endpoints must be finite, got ({lo}, {hi})"),
            });
        }
        if lo < 0.0 || hi < 0.0 {
            return Err(SimError::InvalidConfig {
                field: "passenger_spawning.weight_range",
                reason: format!("both endpoints must be non-negative, got ({lo}, {hi})"),
            });
        }
        if lo > hi {
            return Err(SimError::InvalidConfig {
                field: "passenger_spawning.weight_range",
                reason: format!("min must be <= max, got ({lo}, {hi})"),
            });
        }
        if spawn.mean_interval_ticks == 0 {
            return Err(SimError::InvalidConfig {
                field: "passenger_spawning.mean_interval_ticks",
                reason: "must be > 0; mean_interval_ticks=0 burst-fires \
                         every catch-up tick"
                    .into(),
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
        validate_elevator_physics(
            elev.max_speed.value(),
            elev.acceleration.value(),
            elev.deceleration.value(),
            elev.weight_capacity.value(),
            elev.inspection_speed_factor,
            elev.door_transition_ticks,
            elev.door_open_ticks,
            elev.bypass_load_up_pct,
            elev.bypass_load_down_pct,
        )?;
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

        // Every line's serves must reference existing stops and be non-empty.
        for lc in line_configs {
            if lc.serves.is_empty() {
                return Err(SimError::InvalidConfig {
                    field: "building.lines.serves",
                    reason: format!("line {} has no stops", lc.id),
                });
            }
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
            if let Some(max) = lc.max_cars
                && lc.elevators.len() > max
            {
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

    // ── Hooks ────────────────────────────────────────────────────────

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
}
