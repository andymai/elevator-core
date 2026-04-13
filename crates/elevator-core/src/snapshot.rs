//! World snapshot for save/load functionality.
//!
//! Provides [`WorldSnapshot`] which captures the full simulation state
//! (all entities, components, groups, metrics, tick counter) in a
//! serializable form. Games choose the serialization format via serde.
//!
//! Extension components are NOT included — games must serialize their
//! own extensions separately and re-attach them after restoring.

use crate::components::{
    Elevator, Line, Patience, Position, Preferences, Rider, Route, Stop, Velocity,
};
use crate::entity::EntityId;
use crate::ids::GroupId;
use crate::metrics::Metrics;
use crate::stop::StopId;
use crate::tagged_metrics::MetricTags;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

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
    /// Whether this entity is disabled.
    pub disabled: bool,
}

/// Serializable snapshot of the entire simulation state.
///
/// Capture via [`Simulation::snapshot()`] and restore via
/// [`WorldSnapshot::restore()`]. The game chooses the serde format
/// (RON, JSON, bincode, etc.).
///
/// Extension components and resources are NOT included. Games must
/// handle their own custom data separately.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorldSnapshot {
    /// Current simulation tick.
    pub tick: u64,
    /// Time delta per tick.
    pub dt: f64,
    /// All entities indexed by position in this vec.
    /// `EntityId`s are regenerated on restore.
    pub entities: Vec<EntitySnapshot>,
    /// Elevator groups (references into entities by index).
    pub groups: Vec<GroupSnapshot>,
    /// Stop ID → entity index mapping.
    pub stop_lookup: HashMap<StopId, usize>,
    /// Global metrics at snapshot time.
    pub metrics: Metrics,
    /// Per-tag metric accumulators and entity-tag associations.
    pub metric_tags: MetricTags,
    /// Serialized extension component data: name → (`EntityId` → RON string).
    pub extensions: HashMap<String, HashMap<EntityId, String>>,
    /// Ticks per second (for `TimeAdapter` reconstruction).
    pub ticks_per_second: f64,
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
}

/// Pending extension data from a snapshot, awaiting type registration.
///
/// Stored as a world resource after `restore()`. Call
/// `sim.load_extensions()` after registering extension types to
/// deserialize the data.
pub(crate) struct PendingExtensions(pub(crate) HashMap<String, HashMap<EntityId, String>>);

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
    /// To restore extension components, call `world.register_ext::<T>(name)`
    /// on the returned simulation's world for each extension type, then call
    /// [`Simulation::load_extensions()`] with this snapshot's `extensions` data.
    #[must_use]
    pub fn restore(
        self,
        custom_strategy_factory: CustomStrategyFactory<'_>,
    ) -> crate::sim::Simulation {
        use crate::world::{SortedStops, World};

        let mut world = World::new();

        // Phase 1: spawn all entities and build old→new EntityId mapping.
        let (index_to_id, id_remap) = Self::spawn_entities(&mut world, &self.entities);

        // Phase 2: attach components with remapped EntityIds.
        Self::attach_components(&mut world, &self.entities, &index_to_id, &id_remap);

        // Rebuild sorted stops index.
        let mut sorted: Vec<(f64, EntityId)> = world
            .iter_stops()
            .map(|(eid, stop)| (stop.position, eid))
            .collect();
        sorted.sort_by(|a, b| a.0.total_cmp(&b.0));
        world.insert_resource(SortedStops(sorted));

        // Rebuild groups, stop lookup, dispatchers, and extensions (borrows self).
        let (mut groups, stop_lookup, dispatchers, strategy_ids) =
            self.rebuild_groups_and_dispatchers(&index_to_id, custom_strategy_factory);

        // Fix legacy snapshots: synthetic LineInfo entries with EntityId::default()
        // need real line entities spawned in the world.
        for group in &mut groups {
            let group_id = group.id();
            let lines = group.lines_mut();
            for line_info in lines.iter_mut() {
                if line_info.entity() != EntityId::default() {
                    continue;
                }
                // Compute min/max position from the line's served stops.
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
                // Update all elevators on this line to reference the new entity.
                for &elev_eid in line_info.elevators() {
                    if let Some(car) = world.elevator_mut(elev_eid) {
                        car.line = line_eid;
                    }
                }
                line_info.set_entity(line_eid);
            }
        }

        // Remap EntityIds in extension data for later deserialization.
        let remapped_exts = Self::remap_extensions(&self.extensions, &id_remap);
        world.insert_resource(PendingExtensions(remapped_exts));

        // Restore MetricTags with remapped entity IDs (moves out of self).
        let mut tags = self.metric_tags;
        tags.remap_entity_ids(&id_remap);
        world.insert_resource(tags);

        crate::sim::Simulation::from_parts(
            world,
            self.tick,
            self.dt,
            groups,
            stop_lookup,
            dispatchers,
            strategy_ids,
            self.metrics,
            self.ticks_per_second,
        )
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
                e.phase = match e.phase {
                    crate::components::ElevatorPhase::MovingToStop(s) => {
                        crate::components::ElevatorPhase::MovingToStop(remap(s))
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
            if snap.disabled {
                world.disable(eid);
            }
        }
    }

    /// Rebuild groups, stop lookup, and dispatchers from snapshot data.
    #[allow(clippy::type_complexity)]
    fn rebuild_groups_and_dispatchers(
        &self,
        index_to_id: &[EntityId],
        custom_strategy_factory: CustomStrategyFactory<'_>,
    ) -> (
        Vec<crate::dispatch::ElevatorGroup>,
        HashMap<StopId, EntityId>,
        std::collections::BTreeMap<GroupId, Box<dyn crate::dispatch::DispatchStrategy>>,
        std::collections::BTreeMap<GroupId, crate::dispatch::BuiltinStrategy>,
    ) {
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
            let strategy: Box<dyn crate::dispatch::DispatchStrategy> = gs
                .strategy
                .instantiate()
                .or_else(|| {
                    if let crate::dispatch::BuiltinStrategy::Custom(ref name) = gs.strategy {
                        custom_strategy_factory.and_then(|f| f(name))
                    } else {
                        None
                    }
                })
                .unwrap_or_else(|| Box::new(crate::dispatch::scan::ScanDispatch::new()));
            dispatchers.insert(group.id(), strategy);
            strategy_ids.insert(group.id(), gs.strategy.clone());
        }

        (groups, stop_lookup, dispatchers, strategy_ids)
    }

    /// Remap `EntityId`s in extension data using the old→new mapping.
    fn remap_extensions(
        extensions: &HashMap<String, HashMap<EntityId, String>>,
        id_remap: &HashMap<EntityId, EntityId>,
    ) -> HashMap<String, HashMap<EntityId, String>> {
        extensions
            .iter()
            .map(|(name, entries)| {
                let remapped: HashMap<EntityId, String> = entries
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
}

impl crate::sim::Simulation {
    /// Create a serializable snapshot of the current simulation state.
    ///
    /// The snapshot captures all entities, components, groups, metrics,
    /// and the tick counter. Extension components and custom resources
    /// are NOT included — games must serialize those separately.
    #[must_use]
    pub fn snapshot(&self) -> WorldSnapshot {
        let world = self.world();

        // Build entity index: map EntityId → position in vec.
        let all_ids: Vec<EntityId> = world.alive.keys().collect();
        let mut id_to_index: HashMap<EntityId, usize> = HashMap::new();
        for (i, &eid) in all_ids.iter().enumerate() {
            id_to_index.insert(eid, i);
        }

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
                disabled: world.is_disabled(eid),
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
                }
            })
            .collect();

        // Snapshot stop lookup (convert EntityIds to indices).
        let stop_lookup: HashMap<StopId, usize> = self
            .stop_lookup_iter()
            .filter_map(|(sid, eid)| id_to_index.get(eid).map(|&idx| (*sid, idx)))
            .collect();

        WorldSnapshot {
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
        }
    }
}
