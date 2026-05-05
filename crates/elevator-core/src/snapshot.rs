//! World snapshot for save/load functionality.
//!
//! Provides [`WorldSnapshot`](crate::snapshot::WorldSnapshot) which captures the full simulation state
//! (all entities, components, groups, metrics, tick counter) in a
//! serializable form. Games choose the serialization format via serde.
//!
//! Extension component *data* is included in the snapshot. After restoring,
//! call [`Simulation::load_extensions_with`](crate::sim::Simulation::load_extensions_with)
//! to register types and materialize the data.

use crate::components::{
    AccessControl, CarCall, DestinationQueue, Elevator, HallCall, Line, Patience, Position,
    Preferences, Rider, Route, Stop, Velocity,
};
use crate::entity::EntityId;
use crate::ids::GroupId;
use crate::metrics::Metrics;
use crate::stop::StopId;
use crate::tagged_metrics::MetricTags;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap, HashSet};

/// Serializable snapshot of a single entity's components.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntitySnapshot {
    /// The original `EntityId` (used for remapping cross-references on restore).
    pub original_id: EntityId,
    /// Position component (if present).
    pub position: Option<Position>,
    /// Velocity component (if present).
    pub velocity: Option<Velocity>,
    /// Elevator component (if present).
    pub elevator: Option<Elevator>,
    /// Stop component (if present).
    pub stop: Option<Stop>,
    /// Rider component (if present).
    pub rider: Option<Rider>,
    /// Route component (if present).
    pub route: Option<Route>,
    /// Line component (if present).
    #[serde(default)]
    pub line: Option<Line>,
    /// Patience component (if present).
    pub patience: Option<Patience>,
    /// Preferences component (if present).
    pub preferences: Option<Preferences>,
    /// Access control component (if present).
    #[serde(default)]
    pub access_control: Option<AccessControl>,
    /// Whether this entity is disabled.
    pub disabled: bool,
    /// Energy profile (if present, requires `energy` feature).
    #[cfg(feature = "energy")]
    #[serde(default)]
    pub energy_profile: Option<crate::energy::EnergyProfile>,
    /// Energy metrics (if present, requires `energy` feature).
    #[cfg(feature = "energy")]
    #[serde(default)]
    pub energy_metrics: Option<crate::energy::EnergyMetrics>,
    /// Service mode (if present).
    #[serde(default)]
    pub service_mode: Option<crate::components::ServiceMode>,
    /// Destination queue (per-elevator; absent in legacy snapshots).
    #[serde(default)]
    pub destination_queue: Option<DestinationQueue>,
    /// Car calls pressed inside this elevator (per-car; absent in legacy snapshots).
    #[serde(default)]
    pub car_calls: Vec<CarCall>,
}

/// Serializable snapshot of the entire simulation state.
///
/// Capture via [`Simulation::snapshot()`](crate::sim::Simulation::snapshot)
/// and restore via [`WorldSnapshot::restore()`]. The game chooses the serde format
/// (RON, JSON, bincode, etc.).
///
/// **Determinism:** the map fields below all use `BTreeMap` instead of
/// `HashMap` so postcard/RON/JSON serialize entries in a deterministic
/// (key-sorted) order. With `HashMap`, two snapshots of the same sim
/// taken in different processes produced different bytes, defeating
/// content-addressed caching and bit-equality replay (#254).
///
/// **Extension components are included** (via `extensions`); games must
/// register types via `register_ext` before `restore()` to materialize them.
/// **Custom resources** inserted via `world.insert_resource` are NOT
/// snapshotted — only the built-in `MetricTags` resource is captured
/// in `metric_tags`. Games using custom resources must save and restore
/// them out-of-band (#296).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorldSnapshot {
    /// Schema version of this snapshot. Bumped on incompatible changes
    /// to the snapshot layout. Loading a snapshot whose version differs
    /// from the current crate's expected version returns
    /// [`SimError::SnapshotVersion`](crate::error::SimError::SnapshotVersion).
    /// Legacy snapshots default to `0` (#295).
    #[serde(default)]
    pub version: u32,
    /// Current simulation tick.
    pub tick: u64,
    /// Time delta per tick.
    pub dt: f64,
    /// All entities indexed by position in this vec.
    /// `EntityId`s are regenerated on restore.
    pub entities: Vec<EntitySnapshot>,
    /// Elevator groups (references into entities by index).
    pub groups: Vec<GroupSnapshot>,
    /// Stop ID → entity index mapping. `BTreeMap` for deterministic
    /// snapshot bytes across processes (#254).
    pub stop_lookup: BTreeMap<StopId, usize>,
    /// Global metrics at snapshot time.
    pub metrics: Metrics,
    /// Per-tag metric accumulators and entity-tag associations.
    pub metric_tags: MetricTags,
    /// Serialized extension component data: name → (`EntityId` → RON string).
    /// Both maps are `BTreeMap` for deterministic snapshot bytes (#254).
    pub extensions: BTreeMap<String, BTreeMap<EntityId, String>>,
    /// Ticks per second (for `TimeAdapter` reconstruction).
    pub ticks_per_second: f64,
    /// All pending hall calls across every stop. Absent in legacy snapshots.
    #[serde(default)]
    pub hall_calls: Vec<HallCall>,
    /// Rolling per-stop arrival log. Empty in legacy snapshots; on
    /// restore the log's `(tick, stop)` entries have their stop IDs
    /// remapped through `id_remap` so they line up with the newly
    /// allocated entity IDs.
    #[serde(default)]
    pub arrival_log: crate::arrival_log::ArrivalLog,
    /// Retention window for the arrival log (ticks). Captured so a
    /// host-configured value (e.g. via
    /// `Simulation::set_arrival_log_retention_ticks`) survives
    /// snapshot round-trip; legacy snapshots default to
    /// [`DEFAULT_ARRIVAL_WINDOW_TICKS`](crate::arrival_log::DEFAULT_ARRIVAL_WINDOW_TICKS).
    #[serde(default)]
    pub arrival_log_retention: crate::arrival_log::ArrivalLogRetention,
    /// Mirror of `arrival_log` keyed on rider *destination* — what
    /// powers the `DownPeak` classifier branch. Same remap semantics
    /// as `arrival_log` on restore. Empty in legacy snapshots; the
    /// detector silently under-classifies `DownPeak` until the post-
    /// restore log refills.
    #[serde(default)]
    pub destination_log: crate::arrival_log::DestinationLog,
    /// Traffic-mode classifier state. Carries the current mode,
    /// thresholds, and last-update tick across snapshot round-trip
    /// so a restored sim doesn't momentarily reset to `Idle` when
    /// the metrics phase hasn't run yet.
    #[serde(default)]
    pub traffic_detector: crate::traffic_detector::TrafficDetector,
    /// Per-car reposition cooldown eligibility. Entries map to the
    /// tick when each car next becomes eligible for reposition. Empty
    /// in legacy snapshots; on restore the map is remapped through
    /// `id_remap` to match newly-allocated entity IDs.
    #[serde(default)]
    pub reposition_cooldowns: crate::dispatch::reposition::RepositionCooldowns,
    /// Per-group serialized dispatcher configuration produced by
    /// [`crate::dispatch::DispatchStrategy::snapshot_config`] and
    /// replayed via
    /// [`crate::dispatch::DispatchStrategy::restore_config`] on
    /// restore. Round-trips the tunable weights configured via
    /// `with_*` builder methods (e.g. `EtdDispatch::with_delay_weight`)
    /// that [`BuiltinStrategy::instantiate`](crate::dispatch::BuiltinStrategy::instantiate)
    /// can't reconstruct because it always calls `::new()`. Absent /
    /// empty in legacy snapshots — they restore to default weights,
    /// matching pre-fix behaviour.
    #[serde(default)]
    pub dispatch_config: BTreeMap<GroupId, String>,
}

/// Per-line snapshot info within a group.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineSnapshotInfo {
    /// Index into the `entities` vec for the line entity.
    pub entity_index: usize,
    /// Indices into the `entities` vec for elevators on this line.
    pub elevator_indices: Vec<usize>,
    /// Indices into the `entities` vec for stops served by this line.
    pub stop_indices: Vec<usize>,
}

/// Serializable representation of an elevator group.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupSnapshot {
    /// Group identifier.
    pub id: GroupId,
    /// Group name.
    pub name: String,
    /// Indices into the `entities` vec for elevators in this group.
    pub elevator_indices: Vec<usize>,
    /// Indices into the `entities` vec for stops in this group.
    pub stop_indices: Vec<usize>,
    /// The dispatch strategy used by this group.
    pub strategy: crate::dispatch::BuiltinStrategy,
    /// Per-line snapshot data. Empty in legacy snapshots.
    #[serde(default)]
    pub lines: Vec<LineSnapshotInfo>,
    /// Optional repositioning strategy for idle elevators.
    #[serde(default)]
    pub reposition: Option<crate::dispatch::BuiltinReposition>,
    /// Hall call mode for this group. Legacy snapshots default to `Classic`.
    #[serde(default)]
    pub hall_call_mode: crate::dispatch::HallCallMode,
    /// Controller ack latency in ticks. Legacy snapshots default to `0`.
    #[serde(default)]
    pub ack_latency_ticks: u32,
}

/// Pending extension data from a snapshot, awaiting type registration.
///
/// Stored as a world resource after `restore()`. Call
/// `sim.load_extensions()` after registering extension types to
/// deserialize the data.
pub(crate) struct PendingExtensions(pub(crate) BTreeMap<String, BTreeMap<EntityId, String>>);

/// Factory function type for instantiating custom dispatch strategies by name.
type CustomStrategyFactory<'a> =
    Option<&'a dyn Fn(&str) -> Option<Box<dyn crate::dispatch::DispatchStrategy>>>;

impl WorldSnapshot {
    /// Restore a simulation from this snapshot.
    ///
    /// Built-in strategies (Scan, Look, `NearestCar`, ETD) are auto-restored.
    /// For `Custom` strategies, provide a factory function that maps strategy
    /// names to instances. Pass `None` if only using built-in strategies.
    ///
    /// # Errors
    /// Returns [`SimError::UnresolvedCustomStrategy`](crate::error::SimError::UnresolvedCustomStrategy)
    /// if a snapshot group uses a `Custom` strategy and the factory returns `None`.
    ///
    /// To restore extension components, call
    /// [`Simulation::load_extensions_with`](crate::sim::Simulation::load_extensions_with)
    /// on the returned simulation.
    pub fn restore(
        self,
        custom_strategy_factory: CustomStrategyFactory<'_>,
    ) -> Result<crate::sim::Simulation, crate::error::SimError> {
        use crate::world::{SortedStops, World};

        // Reject snapshots from incompatible schema versions. The bytes
        // envelope path also checks the crate semver string, but the RON/
        // JSON path was previously unguarded — older snapshots silently
        // deserialized with `#[serde(default)]` filling new fields, masking
        // schema mismatches. (#295)
        if self.version != SNAPSHOT_SCHEMA_VERSION {
            return Err(crate::error::SimError::SnapshotVersion {
                saved: format!("schema {}", self.version),
                current: format!("schema {SNAPSHOT_SCHEMA_VERSION}"),
            });
        }

        let mut world = World::new();

        // Phase 1: spawn all entities and build old→new EntityId mapping.
        let (index_to_id, id_remap) = Self::spawn_entities(&mut world, &self.entities);

        // Phase 2: attach components with remapped EntityIds.
        Self::attach_components(&mut world, &self.entities, &index_to_id, &id_remap);

        // Phase 2b: re-register hall calls (cross-reference stops/cars/riders).
        self.attach_hall_calls(&mut world, &id_remap);

        // Rebuild sorted stops index.
        let mut sorted: Vec<(f64, EntityId)> = world
            .iter_stops()
            .map(|(eid, stop)| (stop.position, eid))
            .collect();
        sorted.sort_by(|a, b| a.0.total_cmp(&b.0));
        world.insert_resource(SortedStops(sorted));

        // Rebuild groups, stop lookup, dispatchers, and extensions (borrows self).
        let (mut groups, stop_lookup, dispatchers, strategy_ids) =
            self.rebuild_groups_and_dispatchers(&index_to_id, custom_strategy_factory)?;

        Self::fix_legacy_line_entities(&mut groups, &mut world);

        // Resource installation moves several fields out of self via partial
        // moves; remaining fields (dispatch_config, groups, entities, hall_calls,
        // metrics, etc.) stay accessible for the construction steps below.
        Self::install_runtime_resources(
            &mut world,
            &id_remap,
            self.tick,
            &self.extensions,
            self.metric_tags,
            self.arrival_log,
            self.arrival_log_retention,
            self.destination_log,
            self.traffic_detector,
            self.reposition_cooldowns,
        );

        let mut sim = crate::sim::Simulation::from_parts(
            world,
            self.tick,
            self.dt,
            groups,
            stop_lookup,
            dispatchers,
            strategy_ids,
            self.metrics,
            self.ticks_per_second,
        );

        Self::replay_dispatcher_tuning(&mut sim, &self.dispatch_config);
        Self::restore_reposition_strategies(&mut sim, &self.groups);

        Self::emit_dangling_warnings(
            &self.entities,
            &self.hall_calls,
            &id_remap,
            self.tick,
            &mut sim,
        );

        Ok(sim)
    }

    /// Replace synthetic legacy `LineInfo` entries (entity = `EntityId::default()`)
    /// with real line entities spawned in the world. Pre-line snapshots stored
    /// only group-level elevator/stop indices; the legacy single-line `LineInfo`
    /// is materialised here so dispatch and rendering see a real entity.
    fn fix_legacy_line_entities(
        groups: &mut [crate::dispatch::ElevatorGroup],
        world: &mut crate::world::World,
    ) {
        for group in groups.iter_mut() {
            let group_id = group.id();
            for line_info in group.lines_mut().iter_mut() {
                if line_info.entity() != EntityId::default() {
                    continue;
                }
                let (min_pos, max_pos) = line_info
                    .serves()
                    .iter()
                    .filter_map(|&sid| world.stop(sid).map(|s| s.position))
                    .fold((f64::INFINITY, f64::NEG_INFINITY), |(lo, hi), p| {
                        (lo.min(p), hi.max(p))
                    });
                let line_eid = world.spawn();
                world.set_line(
                    line_eid,
                    Line {
                        name: format!("Legacy-{group_id}"),
                        group: group_id,
                        orientation: crate::components::Orientation::Vertical,
                        position: None,
                        min_position: if min_pos.is_finite() { min_pos } else { 0.0 },
                        max_position: if max_pos.is_finite() { max_pos } else { 0.0 },
                        max_cars: None,
                    },
                );
                for &elev_eid in line_info.elevators() {
                    if let Some(car) = world.elevator_mut(elev_eid) {
                        car.line = line_eid;
                    }
                }
                line_info.set_entity(line_eid);
            }
        }
    }

    /// Insert all post-entity world resources, remapping `EntityId`s where
    /// they cross-reference. Without these `PredictiveParking`,
    /// `DispatchManifest::arrivals_at`, the down-peak classifier branch,
    /// host-configured retention, and reposition cooldowns silently no-op
    /// or fall back to defaults post-restore.
    #[allow(clippy::too_many_arguments)]
    fn install_runtime_resources(
        world: &mut crate::world::World,
        id_remap: &HashMap<EntityId, EntityId>,
        tick: u64,
        extensions: &BTreeMap<String, BTreeMap<EntityId, String>>,
        metric_tags: MetricTags,
        arrival_log: crate::arrival_log::ArrivalLog,
        arrival_log_retention: crate::arrival_log::ArrivalLogRetention,
        destination_log: crate::arrival_log::DestinationLog,
        traffic_detector: crate::traffic_detector::TrafficDetector,
        reposition_cooldowns: crate::dispatch::reposition::RepositionCooldowns,
    ) {
        let remapped_exts = Self::remap_extensions(extensions, id_remap);
        world.insert_resource(PendingExtensions(remapped_exts));

        let mut tags = metric_tags;
        tags.remap_entity_ids(id_remap);
        world.insert_resource(tags);

        let mut log = arrival_log;
        log.remap_entity_ids(id_remap);
        world.insert_resource(log);
        world.insert_resource(crate::arrival_log::CurrentTick(tick));
        world.insert_resource(arrival_log_retention);

        let mut dest_log = destination_log;
        dest_log.remap_entity_ids(id_remap);
        world.insert_resource(dest_log);

        // Detector is re-inserted last-writer-wins so the *classified* state
        // carries forward; refresh_traffic_detector updates on the next
        // metrics phase with fresh counts.
        world.insert_resource(traffic_detector);

        let mut cooldowns = reposition_cooldowns;
        cooldowns.remap_entity_ids(id_remap);
        world.insert_resource(cooldowns);
    }

    /// Replay per-group dispatcher tuning captured in the snapshot. Built-ins
    /// with `with_*` builders override `snapshot_config`/`restore_config` to
    /// round-trip their weights; strategies that don't override silently skip
    /// (default `restore_config` is `Ok(())`), preserving pre-fix behaviour. A
    /// deserialization failure surfaces as an event rather than a hard error
    /// — the restored sim runs with defaults, same as a legacy snapshot.
    fn replay_dispatcher_tuning(
        sim: &mut crate::sim::Simulation,
        dispatch_config: &std::collections::BTreeMap<GroupId, String>,
    ) {
        for (gid, serialized) in dispatch_config {
            if let Some(dispatcher) = sim.dispatchers_mut().get_mut(gid)
                && let Err(err) = dispatcher.restore_config(serialized)
            {
                sim.push_event(crate::events::Event::DispatchConfigNotRestored {
                    group: *gid,
                    reason: err,
                });
            }
        }
    }

    /// Restore reposition strategies from group snapshots, emitting
    /// [`Event::RepositionStrategyNotRestored`](crate::events::Event::RepositionStrategyNotRestored)
    /// when an id can't be re-instantiated.
    fn restore_reposition_strategies(sim: &mut crate::sim::Simulation, groups: &[GroupSnapshot]) {
        for gs in groups {
            let Some(ref repo_id) = gs.reposition else {
                continue;
            };
            if let Some(strategy) = repo_id.instantiate() {
                sim.set_reposition(gs.id, strategy, repo_id.clone());
            } else {
                sim.push_event(crate::events::Event::RepositionStrategyNotRestored {
                    group: gs.id,
                });
            }
        }
    }

    /// Spawn entities in the world and build the old→new `EntityId` mapping.
    fn spawn_entities(
        world: &mut crate::world::World,
        entities: &[EntitySnapshot],
    ) -> (Vec<EntityId>, HashMap<EntityId, EntityId>) {
        let mut index_to_id: Vec<EntityId> = Vec::with_capacity(entities.len());
        let mut id_remap: HashMap<EntityId, EntityId> = HashMap::new();
        for snap in entities {
            let new_id = world.spawn();
            index_to_id.push(new_id);
            id_remap.insert(snap.original_id, new_id);
        }
        (index_to_id, id_remap)
    }

    /// Attach components to spawned entities, remapping cross-references.
    fn attach_components(
        world: &mut crate::world::World,
        entities: &[EntitySnapshot],
        index_to_id: &[EntityId],
        id_remap: &HashMap<EntityId, EntityId>,
    ) {
        let remap = |old: EntityId| -> EntityId { id_remap.get(&old).copied().unwrap_or(old) };
        let remap_opt = |old: Option<EntityId>| -> Option<EntityId> { old.map(&remap) };

        for (i, snap) in entities.iter().enumerate() {
            let eid = index_to_id[i];

            if let Some(pos) = snap.position {
                world.set_position(eid, pos);
            }
            if let Some(vel) = snap.velocity {
                world.set_velocity(eid, vel);
            }
            if let Some(ref elev) = snap.elevator {
                let mut e = elev.clone();
                e.riders = e.riders.iter().map(|&r| remap(r)).collect();
                e.target_stop = remap_opt(e.target_stop);
                e.line = remap(e.line);
                e.restricted_stops = e.restricted_stops.iter().map(|&s| remap(s)).collect();
                e.phase = match e.phase {
                    crate::components::ElevatorPhase::MovingToStop(s) => {
                        crate::components::ElevatorPhase::MovingToStop(remap(s))
                    }
                    crate::components::ElevatorPhase::Repositioning(s) => {
                        crate::components::ElevatorPhase::Repositioning(remap(s))
                    }
                    other => other,
                };
                world.set_elevator(eid, e);
            }
            if let Some(ref stop) = snap.stop {
                world.set_stop(eid, stop.clone());
            }
            if let Some(ref rider) = snap.rider {
                use crate::components::RiderPhase;
                let mut r = rider.clone();
                r.current_stop = remap_opt(r.current_stop);
                r.phase = match r.phase {
                    RiderPhase::Boarding(e) => RiderPhase::Boarding(remap(e)),
                    RiderPhase::Riding(e) => RiderPhase::Riding(remap(e)),
                    RiderPhase::Exiting(e) => RiderPhase::Exiting(remap(e)),
                    other => other,
                };
                world.set_rider(eid, r);
            }
            if let Some(ref route) = snap.route {
                let mut rt = route.clone();
                for leg in &mut rt.legs {
                    leg.from = remap(leg.from);
                    leg.to = remap(leg.to);
                    if let crate::components::TransportMode::Line(ref mut l) = leg.via {
                        *l = remap(*l);
                    }
                }
                world.set_route(eid, rt);
            }
            if let Some(ref line) = snap.line {
                world.set_line(eid, line.clone());
            }
            if let Some(patience) = snap.patience {
                world.set_patience(eid, patience);
            }
            if let Some(prefs) = snap.preferences {
                world.set_preferences(eid, prefs);
            }
            if let Some(ref ac) = snap.access_control {
                let remapped =
                    AccessControl::new(ac.allowed_stops().iter().map(|&s| remap(s)).collect());
                world.set_access_control(eid, remapped);
            }
            if snap.disabled {
                world.disable(eid);
            }
            #[cfg(feature = "energy")]
            if let Some(ref profile) = snap.energy_profile {
                world.set_energy_profile(eid, profile.clone());
            }
            #[cfg(feature = "energy")]
            if let Some(ref em) = snap.energy_metrics {
                world.set_energy_metrics(eid, em.clone());
            }
            if let Some(mode) = snap.service_mode {
                world.set_service_mode(eid, mode);
            }
            if let Some(ref dq) = snap.destination_queue {
                use crate::components::DestinationQueue as DQ;
                let mut new_dq = DQ::new();
                for &e in dq.queue() {
                    new_dq.push_back(remap(e));
                }
                world.set_destination_queue(eid, new_dq);
            }
            Self::attach_car_calls(world, eid, &snap.car_calls, id_remap);
        }
    }

    /// Re-register per-car floor button presses after entities are spawned.
    fn attach_car_calls(
        world: &mut crate::world::World,
        car: EntityId,
        car_calls: &[CarCall],
        id_remap: &HashMap<EntityId, EntityId>,
    ) {
        if car_calls.is_empty() {
            return;
        }
        let remap = |old: EntityId| -> EntityId { id_remap.get(&old).copied().unwrap_or(old) };
        let Some(slot) = world.car_calls_mut(car) else {
            return;
        };
        for cc in car_calls {
            let mut c = cc.clone();
            c.car = car;
            c.floor = remap(c.floor);
            c.pending_riders = c.pending_riders.iter().map(|&r| remap(r)).collect();
            slot.push(c);
        }
    }

    /// Re-register hall calls in the world after entities are spawned.
    ///
    /// `HallCall` cross-references stops, cars, riders, and optional
    /// destinations — all `EntityId`s must be remapped through `id_remap`.
    /// Pre-15.23 snapshots stored a single `assigned_car` field, silently
    /// dropped by `#[serde(default)]` on `assigned_cars_by_line`; the
    /// next dispatch pass repopulates the empty map, so no explicit
    /// migration is attempted here.
    fn attach_hall_calls(
        &self,
        world: &mut crate::world::World,
        id_remap: &HashMap<EntityId, EntityId>,
    ) {
        let remap = |old: EntityId| -> EntityId { id_remap.get(&old).copied().unwrap_or(old) };
        let remap_opt = |old: Option<EntityId>| -> Option<EntityId> { old.map(&remap) };
        for hc in &self.hall_calls {
            let mut c = hc.clone();
            c.stop = remap(c.stop);
            c.destination = remap_opt(c.destination);
            c.assigned_cars_by_line = c
                .assigned_cars_by_line
                .iter()
                .map(|(&line, &car)| (remap(line), remap(car)))
                .collect();
            c.pending_riders = c.pending_riders.iter().map(|&r| remap(r)).collect();
            world.set_hall_call(c);
        }
    }

    /// Rebuild groups, stop lookup, and dispatchers from snapshot data.
    #[allow(clippy::type_complexity)]
    fn rebuild_groups_and_dispatchers(
        &self,
        index_to_id: &[EntityId],
        custom_strategy_factory: CustomStrategyFactory<'_>,
    ) -> Result<
        (
            Vec<crate::dispatch::ElevatorGroup>,
            HashMap<StopId, EntityId>,
            std::collections::BTreeMap<GroupId, Box<dyn crate::dispatch::DispatchStrategy>>,
            std::collections::BTreeMap<GroupId, crate::dispatch::BuiltinStrategy>,
        ),
        crate::error::SimError,
    > {
        use crate::dispatch::ElevatorGroup;

        let groups: Vec<ElevatorGroup> = self
            .groups
            .iter()
            .map(|gs| {
                let elevator_entities: Vec<EntityId> = gs
                    .elevator_indices
                    .iter()
                    .filter_map(|&i| index_to_id.get(i).copied())
                    .collect();
                let stop_entities: Vec<EntityId> = gs
                    .stop_indices
                    .iter()
                    .filter_map(|&i| index_to_id.get(i).copied())
                    .collect();

                let lines = if gs.lines.is_empty() {
                    // Legacy snapshots have no per-line data; create a single
                    // synthetic LineInfo containing all elevators and stops.
                    vec![crate::dispatch::LineInfo::new(
                        EntityId::default(),
                        elevator_entities,
                        stop_entities,
                    )]
                } else {
                    gs.lines
                        .iter()
                        .filter_map(|lsi| {
                            let entity = index_to_id.get(lsi.entity_index).copied()?;
                            Some(crate::dispatch::LineInfo::new(
                                entity,
                                lsi.elevator_indices
                                    .iter()
                                    .filter_map(|&i| index_to_id.get(i).copied())
                                    .collect(),
                                lsi.stop_indices
                                    .iter()
                                    .filter_map(|&i| index_to_id.get(i).copied())
                                    .collect(),
                            ))
                        })
                        .collect()
                };

                ElevatorGroup::new(gs.id, gs.name.clone(), lines)
                    .with_hall_call_mode(gs.hall_call_mode)
                    .with_ack_latency_ticks(gs.ack_latency_ticks)
            })
            .collect();

        let stop_lookup: HashMap<StopId, EntityId> = self
            .stop_lookup
            .iter()
            .filter_map(|(sid, &idx)| index_to_id.get(idx).map(|&eid| (*sid, eid)))
            .collect();

        let mut dispatchers = std::collections::BTreeMap::new();
        let mut strategy_ids = std::collections::BTreeMap::new();
        for (gs, group) in self.groups.iter().zip(groups.iter()) {
            let strategy: Box<dyn crate::dispatch::DispatchStrategy> =
                if let Some(builtin) = gs.strategy.instantiate() {
                    builtin
                } else if let crate::dispatch::BuiltinStrategy::Custom(ref name) = gs.strategy {
                    custom_strategy_factory
                        .and_then(|f| f(name))
                        .ok_or_else(|| crate::error::SimError::UnresolvedCustomStrategy {
                            name: name.clone(),
                            group: group.id(),
                        })?
                } else {
                    Box::new(crate::dispatch::scan::ScanDispatch::new())
                };
            dispatchers.insert(group.id(), strategy);
            strategy_ids.insert(group.id(), gs.strategy.clone());
        }

        Ok((groups, stop_lookup, dispatchers, strategy_ids))
    }

    /// Remap `EntityId`s in extension data using the old→new mapping.
    fn remap_extensions(
        extensions: &BTreeMap<String, BTreeMap<EntityId, String>>,
        id_remap: &HashMap<EntityId, EntityId>,
    ) -> BTreeMap<String, BTreeMap<EntityId, String>> {
        extensions
            .iter()
            .map(|(name, entries)| {
                let remapped: BTreeMap<EntityId, String> = entries
                    .iter()
                    .map(|(old_id, data)| {
                        let new_id = id_remap.get(old_id).copied().unwrap_or(*old_id);
                        (new_id, data.clone())
                    })
                    .collect();
                (name.clone(), remapped)
            })
            .collect()
    }

    /// Emit `SnapshotDanglingReference` events for entity IDs not in `id_remap`.
    fn emit_dangling_warnings(
        entities: &[EntitySnapshot],
        hall_calls: &[HallCall],
        id_remap: &HashMap<EntityId, EntityId>,
        tick: u64,
        sim: &mut crate::sim::Simulation,
    ) {
        let mut seen = HashSet::new();
        let mut check = |old: EntityId| {
            if !id_remap.contains_key(&old) && seen.insert(old) {
                sim.push_event(crate::events::Event::SnapshotDanglingReference {
                    stale_id: old,
                    tick,
                });
            }
        };
        for snap in entities {
            Self::collect_referenced_ids(snap, &mut check);
        }
        for hc in hall_calls {
            check(hc.stop);
            for (&line, &car) in &hc.assigned_cars_by_line {
                check(line);
                check(car);
            }
            if let Some(dest) = hc.destination {
                check(dest);
            }
            for &rider in &hc.pending_riders {
                check(rider);
            }
        }
    }

    /// Visit all cross-referenced `EntityId`s inside an entity snapshot.
    fn collect_referenced_ids(snap: &EntitySnapshot, mut visit: impl FnMut(EntityId)) {
        if let Some(ref elev) = snap.elevator {
            for &r in &elev.riders {
                visit(r);
            }
            if let Some(t) = elev.target_stop {
                visit(t);
            }
            visit(elev.line);
            match elev.phase {
                crate::components::ElevatorPhase::MovingToStop(s)
                | crate::components::ElevatorPhase::Repositioning(s) => visit(s),
                _ => {}
            }
            for &s in &elev.restricted_stops {
                visit(s);
            }
        }
        if let Some(ref rider) = snap.rider {
            if let Some(s) = rider.current_stop {
                visit(s);
            }
            match rider.phase {
                crate::components::RiderPhase::Boarding(e)
                | crate::components::RiderPhase::Riding(e)
                | crate::components::RiderPhase::Exiting(e) => visit(e),
                _ => {}
            }
        }
        if let Some(ref route) = snap.route {
            for leg in &route.legs {
                visit(leg.from);
                visit(leg.to);
                if let crate::components::TransportMode::Line(l) = leg.via {
                    visit(l);
                }
            }
        }
        if let Some(ref ac) = snap.access_control {
            for &s in ac.allowed_stops() {
                visit(s);
            }
        }
        if let Some(ref dq) = snap.destination_queue {
            for &e in dq.queue() {
                visit(e);
            }
        }
        for cc in &snap.car_calls {
            visit(cc.floor);
            for &r in &cc.pending_riders {
                visit(r);
            }
        }
    }
}

/// Magic bytes identifying a bincode snapshot blob.
const SNAPSHOT_MAGIC: [u8; 8] = *b"ELEVSNAP";

/// Schema version for [`WorldSnapshot`]. Bump on incompatible layout
/// changes so RON/JSON restore can reject older snapshots loudly
/// instead of silently filling new fields with `#[serde(default)]`.
const SNAPSHOT_SCHEMA_VERSION: u32 = 1;

/// Byte-level snapshot envelope: magic + crate version + payload.
///
/// Serialized via bincode. The magic and version fields are checked on
/// restore to reject blobs from other tools or from a different
/// `elevator-core` version.
#[derive(Debug, Serialize, Deserialize)]
struct SnapshotEnvelope {
    /// Magic bytes; must equal [`SNAPSHOT_MAGIC`] or the blob is rejected.
    magic: [u8; 8],
    /// `elevator-core` crate version that produced the blob.
    version: String,
    /// The captured simulation state.
    payload: WorldSnapshot,
}

impl crate::sim::Simulation {
    /// Create a serializable snapshot of the current simulation state.
    ///
    /// The snapshot captures all entities, components, groups, metrics,
    /// the tick counter, and extension component data (game must
    /// re-register types via `register_ext` before `restore`).
    /// Custom resources inserted via `world.insert_resource` are NOT
    /// captured — games using them must save/restore separately (#296).
    ///
    /// **Mid-tick safety:** `snapshot()` returns a snapshot regardless
    /// of whether you are mid-tick (between phase calls in the substep
    /// API). For substep callers that care about event-bus state, use
    /// [`try_snapshot`](Self::try_snapshot) which returns
    /// [`SimError::MidTickSnapshot`](crate::error::SimError::MidTickSnapshot)
    /// when invoked between `run_*` and `advance_tick`. (#297)
    #[must_use]
    #[allow(clippy::too_many_lines)]
    pub fn snapshot(&self) -> WorldSnapshot {
        self.snapshot_inner()
    }

    /// Like [`snapshot`](Self::snapshot) but returns
    /// [`SimError::MidTickSnapshot`](crate::error::SimError::MidTickSnapshot)
    /// when called between phases of an in-progress tick. (#297)
    ///
    /// # Errors
    ///
    /// Returns [`SimError::MidTickSnapshot`](crate::error::SimError::MidTickSnapshot)
    /// when invoked between a `run_*` phase call and the matching
    /// `advance_tick`.
    pub fn try_snapshot(&self) -> Result<WorldSnapshot, crate::error::SimError> {
        if self.tick_in_progress {
            return Err(crate::error::SimError::MidTickSnapshot);
        }
        Ok(self.snapshot())
    }

    /// Internal snapshot builder shared by [`snapshot`](Self::snapshot)
    /// and [`try_snapshot`](Self::try_snapshot). Holds the line-count
    /// allow so the public methods remain visible in nursery lints.
    #[allow(clippy::too_many_lines)]
    fn snapshot_inner(&self) -> WorldSnapshot {
        let world = self.world();

        // Build entity index: map EntityId → position in vec.
        let all_ids: Vec<EntityId> = world.alive.keys().collect();
        let id_to_index: HashMap<EntityId, usize> = all_ids
            .iter()
            .copied()
            .enumerate()
            .map(|(i, e)| (e, i))
            .collect();

        // Snapshot each entity.
        let entities: Vec<EntitySnapshot> = all_ids
            .iter()
            .map(|&eid| EntitySnapshot {
                original_id: eid,
                position: world.position(eid).copied(),
                velocity: world.velocity(eid).copied(),
                elevator: world.elevator(eid).cloned(),
                stop: world.stop(eid).cloned(),
                rider: world.rider(eid).cloned(),
                route: world.route(eid).cloned(),
                line: world.line(eid).cloned(),
                patience: world.patience(eid).copied(),
                preferences: world.preferences(eid).copied(),
                access_control: world.access_control(eid).cloned(),
                disabled: world.is_disabled(eid),
                #[cfg(feature = "energy")]
                energy_profile: world.energy_profile(eid).cloned(),
                #[cfg(feature = "energy")]
                energy_metrics: world.energy_metrics(eid).cloned(),
                service_mode: world.service_mode(eid).copied(),
                destination_queue: world.destination_queue(eid).cloned(),
                car_calls: world.car_calls(eid).to_vec(),
            })
            .collect();

        // Snapshot groups (convert EntityIds to indices).
        let groups: Vec<GroupSnapshot> = self
            .groups()
            .iter()
            .map(|g| {
                let lines: Vec<LineSnapshotInfo> = g
                    .lines()
                    .iter()
                    .filter_map(|li| {
                        let entity_index = id_to_index.get(&li.entity()).copied()?;
                        Some(LineSnapshotInfo {
                            entity_index,
                            elevator_indices: li
                                .elevators()
                                .iter()
                                .filter_map(|eid| id_to_index.get(eid).copied())
                                .collect(),
                            stop_indices: li
                                .serves()
                                .iter()
                                .filter_map(|eid| id_to_index.get(eid).copied())
                                .collect(),
                        })
                    })
                    .collect();
                GroupSnapshot {
                    id: g.id(),
                    name: g.name().to_owned(),
                    elevator_indices: g
                        .elevator_entities()
                        .iter()
                        .filter_map(|eid| id_to_index.get(eid).copied())
                        .collect(),
                    stop_indices: g
                        .stop_entities()
                        .iter()
                        .filter_map(|eid| id_to_index.get(eid).copied())
                        .collect(),
                    strategy: self
                        .strategy_id(g.id())
                        .cloned()
                        .unwrap_or(crate::dispatch::BuiltinStrategy::Scan),
                    lines,
                    reposition: self.reposition_id(g.id()).cloned(),
                    hall_call_mode: g.hall_call_mode(),
                    ack_latency_ticks: g.ack_latency_ticks(),
                }
            })
            .collect();

        // Snapshot stop lookup (convert EntityIds to indices).
        let stop_lookup: BTreeMap<StopId, usize> = self
            .stop_lookup_iter()
            .filter_map(|(sid, eid)| id_to_index.get(eid).map(|&idx| (*sid, idx)))
            .collect();

        WorldSnapshot {
            version: SNAPSHOT_SCHEMA_VERSION,
            tick: self.current_tick(),
            dt: self.dt(),
            entities,
            groups,
            stop_lookup,
            metrics: self.metrics().clone(),
            metric_tags: self
                .world()
                .resource::<MetricTags>()
                .cloned()
                .unwrap_or_default(),
            extensions: self.world().serialize_extensions(),
            ticks_per_second: 1.0 / self.dt(),
            hall_calls: world.iter_hall_calls().cloned().collect(),
            arrival_log: world
                .resource::<crate::arrival_log::ArrivalLog>()
                .cloned()
                .unwrap_or_default(),
            arrival_log_retention: world
                .resource::<crate::arrival_log::ArrivalLogRetention>()
                .copied()
                .unwrap_or_default(),
            destination_log: world
                .resource::<crate::arrival_log::DestinationLog>()
                .cloned()
                .unwrap_or_default(),
            traffic_detector: world
                .resource::<crate::traffic_detector::TrafficDetector>()
                .cloned()
                .unwrap_or_default(),
            reposition_cooldowns: world
                .resource::<crate::dispatch::reposition::RepositionCooldowns>()
                .cloned()
                .unwrap_or_default(),
            // Per-group dispatcher configuration. Only strategies that
            // override `snapshot_config` emit non-None here; the rest
            // default to empty and restore to built-in defaults,
            // preserving pre-fix behaviour for stateless strategies.
            dispatch_config: self
                .dispatchers()
                .iter()
                .filter_map(|(gid, d)| d.snapshot_config().map(|s| (*gid, s)))
                .collect(),
        }
    }

    /// Serialize the current state to a self-describing byte blob.
    ///
    /// The blob is postcard-encoded and carries a magic prefix plus the
    /// `elevator-core` crate version. Use [`Self::restore_bytes`]
    /// on the receiving end. Determinism is bit-exact across builds of
    /// the same crate version; cross-version restores return
    /// [`SimError::SnapshotVersion`](crate::error::SimError::SnapshotVersion).
    ///
    /// Extension component *data* is serialized (identical to
    /// [`Self::snapshot`]); after restore, use
    /// [`Simulation::load_extensions_with`](crate::sim::Simulation::load_extensions_with)
    /// to register and load them.
    /// Custom dispatch strategies and arbitrary `World` resources are
    /// not included.
    ///
    /// # Errors
    /// - [`SimError::SnapshotFormat`](crate::error::SimError::SnapshotFormat)
    ///   if postcard encoding fails. Unreachable for well-formed
    ///   `WorldSnapshot` values, so callers that don't care can `unwrap`.
    /// - [`SimError::MidTickSnapshot`](crate::error::SimError::MidTickSnapshot)
    ///   if invoked between phases of an in-progress tick (substep API
    ///   path) — the in-flight `EventBus` would otherwise be lost. (#297)
    pub fn snapshot_bytes(&self) -> Result<Vec<u8>, crate::error::SimError> {
        let envelope = SnapshotEnvelope {
            magic: SNAPSHOT_MAGIC,
            version: env!("CARGO_PKG_VERSION").to_owned(),
            payload: self.try_snapshot()?,
        };
        postcard::to_allocvec(&envelope)
            .map_err(|e| crate::error::SimError::SnapshotFormat(e.to_string()))
    }

    /// Cheap u64 checksum of the simulation's serializable state.
    /// FNV-1a over the postcard encoding of [`Self::snapshot`]'s
    /// `WorldSnapshot` payload — the envelope (magic + crate version
    /// string) is *not* hashed, so the value depends only on the
    /// logical sim state, not on the `elevator-core` version that
    /// produced it. The numeric value is FNV-1a-specific and not
    /// equivalent to other hash functions of the same bytes; consumers
    /// computing an independent hash for comparison must use this
    /// method (or run FNV-1a themselves with the same constants).
    ///
    /// Snapshot/restore is byte-symmetric: a fresh sim and a restored
    /// sim with the same logical state hash equal. (Earlier code had
    /// a first-restore asymmetry from the `AssignedCar` extension
    /// type registering on restore but not `new`; that was fixed.)
    ///
    /// Designed for divergence detection between runtimes that should
    /// be in lockstep (browser vs server, multi-client multiplayer)
    /// and for golden checksums that need to survive a
    /// release-please version bump. Two sims that have produced bit-
    /// identical inputs in bit-identical order must hash to the same
    /// value, regardless of `CARGO_PKG_VERSION`.
    ///
    /// # Errors
    /// - [`SimError::MidTickSnapshot`](crate::error::SimError::MidTickSnapshot)
    ///   when invoked between phases of an in-progress tick (substep
    ///   API path).
    /// - [`SimError::SnapshotFormat`](crate::error::SimError::SnapshotFormat)
    ///   if postcard encoding of the payload fails. Unreachable for
    ///   well-formed sims; callers that don't care can `unwrap`.
    pub fn snapshot_checksum(&self) -> Result<u64, crate::error::SimError> {
        // FNV-1a (64-bit). Small, allocation-free over the byte slice,
        // well-distributed for arbitrary input. Not cryptographic;
        // collision tolerance is fine for divergence detection.
        const FNV_OFFSET: u64 = 0xcbf2_9ce4_8422_2325;
        const FNV_PRIME: u64 = 0x0000_0100_0000_01b3;
        let snapshot = self.try_snapshot()?;
        let bytes = postcard::to_allocvec(&snapshot)
            .map_err(|e| crate::error::SimError::SnapshotFormat(e.to_string()))?;
        let mut h: u64 = FNV_OFFSET;
        for byte in &bytes {
            h ^= u64::from(*byte);
            h = h.wrapping_mul(FNV_PRIME);
        }
        Ok(h)
    }

    /// Restore a simulation from bytes produced by [`Self::snapshot_bytes`].
    ///
    /// Built-in dispatch strategies are auto-restored. For groups using
    /// [`BuiltinStrategy::Custom`](crate::dispatch::BuiltinStrategy::Custom),
    /// provide a factory; pass `None` otherwise.
    ///
    /// # Errors
    /// - [`SimError::SnapshotFormat`](crate::error::SimError::SnapshotFormat)
    ///   if the bytes are not a valid envelope or the magic prefix does
    ///   not match.
    /// - [`SimError::SnapshotVersion`](crate::error::SimError::SnapshotVersion)
    ///   if the blob was produced by a different crate version.
    /// - [`SimError::UnresolvedCustomStrategy`](crate::error::SimError::UnresolvedCustomStrategy)
    ///   if a group uses a custom strategy that the factory cannot resolve.
    pub fn restore_bytes(
        bytes: &[u8],
        custom_strategy_factory: CustomStrategyFactory<'_>,
    ) -> Result<Self, crate::error::SimError> {
        let (envelope, tail): (SnapshotEnvelope, &[u8]) = postcard::take_from_bytes(bytes)
            .map_err(|e| crate::error::SimError::SnapshotFormat(e.to_string()))?;
        if !tail.is_empty() {
            return Err(crate::error::SimError::SnapshotFormat(format!(
                "trailing bytes: {} unread of {}",
                tail.len(),
                bytes.len()
            )));
        }
        if envelope.magic != SNAPSHOT_MAGIC {
            return Err(crate::error::SimError::SnapshotFormat(
                "magic bytes do not match".to_string(),
            ));
        }
        let current = env!("CARGO_PKG_VERSION");
        if envelope.version != current {
            return Err(crate::error::SimError::SnapshotVersion {
                saved: envelope.version,
                current: current.to_owned(),
            });
        }
        envelope.payload.restore(custom_strategy_factory)
    }
}
