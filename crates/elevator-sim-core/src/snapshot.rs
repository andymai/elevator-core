//! World snapshot for save/load functionality.
//!
//! Provides [`WorldSnapshot`] which captures the full simulation state
//! (all entities, components, groups, metrics, tick counter) in a
//! serializable form. Games choose the serialization format via serde.
//!
//! Extension components are NOT included — games must serialize their
//! own extensions separately and re-attach them after restoring.

use crate::components::{Elevator, Patience, Position, Preferences, Rider, Route, Stop, Velocity, Zone};
use crate::entity::EntityId;
use crate::ids::GroupId;
use crate::metrics::Metrics;
use crate::stop::StopId;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Serializable snapshot of a single entity's components.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntitySnapshot {
    /// The original EntityId (used for remapping cross-references on restore).
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
    /// Zone component (if present).
    pub zone: Option<Zone>,
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
    /// EntityIds are regenerated on restore.
    pub entities: Vec<EntitySnapshot>,
    /// Elevator groups (references into entities by index).
    pub groups: Vec<GroupSnapshot>,
    /// Stop ID → entity index mapping.
    pub stop_lookup: HashMap<StopId, usize>,
    /// Global metrics at snapshot time.
    pub metrics: Metrics,
    /// Ticks per second (for TimeAdapter reconstruction).
    pub ticks_per_second: f64,
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
}

impl WorldSnapshot {
    /// Restore a simulation from this snapshot.
    ///
    /// Requires a dispatch strategy (strategies are not serializable since
    /// they implement a trait with arbitrary state). Extension components
    /// and custom resources must be re-attached after restoration.
    #[must_use]
    pub fn restore(
        self,
        dispatch: Box<dyn crate::dispatch::DispatchStrategy>,
    ) -> crate::sim::Simulation {
        use crate::dispatch::ElevatorGroup;
        use crate::tagged_metrics::MetricTags;
        use crate::world::{SortedStops, World};

        let mut world = World::new();

        // Phase 1: spawn all entities and build old→new EntityId mapping.
        let mut index_to_id: Vec<EntityId> = Vec::with_capacity(self.entities.len());
        let mut id_remap: HashMap<EntityId, EntityId> = HashMap::new();
        for snap in &self.entities {
            let new_id = world.spawn();
            index_to_id.push(new_id);
            id_remap.insert(snap.original_id, new_id);
        }

        // Helper: remap an EntityId through the old→new map.
        let remap = |old: EntityId| -> EntityId {
            id_remap.get(&old).copied().unwrap_or(old)
        };
        let remap_opt = |old: Option<EntityId>| -> Option<EntityId> {
            old.map(&remap)
        };

        // Phase 2: attach components with remapped EntityIds.
        for (i, snap) in self.entities.iter().enumerate() {
            let eid = index_to_id[i];

            if let Some(pos) = snap.position {
                world.set_position(eid, pos);
            }
            if let Some(vel) = snap.velocity {
                world.set_velocity(eid, vel);
            }
            if let Some(ref elev) = snap.elevator {
                let mut e = elev.clone();
                // Remap EntityId fields inside Elevator.
                e.riders = e.riders.iter().map(|&r| remap(r)).collect();
                e.target_stop = remap_opt(e.target_stop);
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
                // Remap EntityId fields inside Rider.
                r.current_stop = remap_opt(r.current_stop);
                r.phase = match r.phase {
                    RiderPhase::Boarding(e) => RiderPhase::Boarding(remap(e)),
                    RiderPhase::Riding(e) => RiderPhase::Riding(remap(e)),
                    RiderPhase::Alighting(e) => RiderPhase::Alighting(remap(e)),
                    other => other,
                };
                world.set_rider(eid, r);
            }
            if let Some(ref route) = snap.route {
                let mut rt = route.clone();
                // Remap EntityId fields inside Route legs.
                for leg in &mut rt.legs {
                    leg.from = remap(leg.from);
                    leg.to = remap(leg.to);
                }
                world.set_route(eid, rt);
            }
            if let Some(ref zone) = snap.zone {
                world.set_zone(eid, zone.clone());
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

        // Rebuild sorted stops index.
        let mut sorted: Vec<(f64, EntityId)> = world
            .iter_stops()
            .map(|(eid, stop)| (stop.position, eid))
            .collect();
        sorted.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));
        world.insert_resource(SortedStops(sorted));
        world.insert_resource(MetricTags::default());

        // Rebuild groups.
        let groups: Vec<ElevatorGroup> = self
            .groups
            .iter()
            .map(|gs| ElevatorGroup {
                id: gs.id,
                name: gs.name.clone(),
                elevator_entities: gs
                    .elevator_indices
                    .iter()
                    .filter_map(|&i| index_to_id.get(i).copied())
                    .collect(),
                stop_entities: gs
                    .stop_indices
                    .iter()
                    .filter_map(|&i| index_to_id.get(i).copied())
                    .collect(),
            })
            .collect();

        // Rebuild stop lookup.
        let stop_lookup: HashMap<StopId, EntityId> = self
            .stop_lookup
            .iter()
            .filter_map(|(sid, &idx)| index_to_id.get(idx).map(|&eid| (*sid, eid)))
            .collect();

        // Rebuild dispatchers.
        let mut dispatchers = std::collections::BTreeMap::new();
        for group in &groups {
            dispatchers.entry(group.id).or_insert_with(|| {
                // Only the first group gets the provided dispatch; others get cloned default.
                // This is a limitation — games with per-group dispatch must re-register after restore.
                Box::new(crate::dispatch::scan::ScanDispatch::new()) as Box<dyn crate::dispatch::DispatchStrategy>
            });
        }
        // Override the first/default group with the provided strategy.
        if let Some(first_group) = groups.first() {
            dispatchers.insert(first_group.id, dispatch);
        }

        crate::sim::Simulation::from_parts(
            world,
            self.tick,
            self.dt,
            groups,
            stop_lookup,
            dispatchers,
            self.metrics,
            self.ticks_per_second,
        )
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
                zone: world.zone(eid).cloned(),
                patience: world.patience(eid).copied(),
                preferences: world.preferences(eid).copied(),
                disabled: world.is_disabled(eid),
            })
            .collect();

        // Snapshot groups (convert EntityIds to indices).
        let groups: Vec<GroupSnapshot> = self
            .groups()
            .iter()
            .map(|g| GroupSnapshot {
                id: g.id,
                name: g.name.clone(),
                elevator_indices: g
                    .elevator_entities
                    .iter()
                    .filter_map(|eid| id_to_index.get(eid).copied())
                    .collect(),
                stop_indices: g
                    .stop_entities
                    .iter()
                    .filter_map(|eid| id_to_index.get(eid).copied())
                    .collect(),
            })
            .collect();

        // Snapshot stop lookup (convert EntityIds to indices).
        let stop_lookup: HashMap<StopId, usize> = self
            .stop_lookup_iter()
            .filter_map(|(sid, eid)| id_to_index.get(&eid).map(|&idx| (*sid, idx)))
            .collect();

        WorldSnapshot {
            tick: self.current_tick(),
            dt: self.dt(),
            entities,
            groups,
            stop_lookup,
            metrics: self.metrics().clone(),
            ticks_per_second: 1.0 / self.dt(),
        }
    }
}
