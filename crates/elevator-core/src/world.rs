//! Central entity/component storage (struct-of-arrays ECS).

use std::any::{Any, TypeId};
use std::collections::HashMap;

use slotmap::{SecondaryMap, SlotMap};

use crate::components::{
    AccessControl, Elevator, Line, Patience, Position, Preferences, Rider, Route, Stop, Velocity,
};
#[cfg(feature = "energy")]
use crate::energy::{EnergyMetrics, EnergyProfile};
use crate::entity::EntityId;
use crate::query::storage::AnyExtMap;

/// Central storage for all simulation entities and their components.
///
/// Uses separate `SecondaryMap` per component type (struct-of-arrays pattern)
/// to enable independent mutable borrows of different component storages
/// within the same system function.
///
/// Built-in components are accessed via typed methods. Games can attach
/// custom data via the extension storage (`insert_ext` / `get_ext`).
/// The query builder (`world.query::<...>()`) provides ECS-style iteration.
pub struct World {
    /// Primary key storage. An entity exists iff its key is here.
    pub(crate) alive: SlotMap<EntityId, ()>,

    // -- Built-in component storages (crate-internal) --
    /// Shaft-axis positions.
    pub(crate) positions: SecondaryMap<EntityId, Position>,
    /// Shaft-axis velocities.
    pub(crate) velocities: SecondaryMap<EntityId, Velocity>,
    /// Elevator components.
    pub(crate) elevators: SecondaryMap<EntityId, Elevator>,
    /// Stop (floor/station) data.
    pub(crate) stops: SecondaryMap<EntityId, Stop>,
    /// Rider core data.
    pub(crate) riders: SecondaryMap<EntityId, Rider>,
    /// Multi-leg routes.
    pub(crate) routes: SecondaryMap<EntityId, Route>,
    /// Line (physical path) components.
    pub(crate) lines: SecondaryMap<EntityId, Line>,
    /// Patience tracking.
    pub(crate) patience: SecondaryMap<EntityId, Patience>,
    /// Boarding preferences.
    pub(crate) preferences: SecondaryMap<EntityId, Preferences>,
    /// Per-rider access control (allowed stops).
    pub(crate) access_controls: SecondaryMap<EntityId, AccessControl>,

    /// Per-elevator energy cost profiles.
    #[cfg(feature = "energy")]
    pub(crate) energy_profiles: SecondaryMap<EntityId, EnergyProfile>,
    /// Per-elevator accumulated energy metrics.
    #[cfg(feature = "energy")]
    pub(crate) energy_metrics: SecondaryMap<EntityId, EnergyMetrics>,

    /// Disabled marker (entities skipped by all systems).
    pub(crate) disabled: SecondaryMap<EntityId, ()>,

    // -- Extension storage for game-specific components --
    /// Type-erased per-entity maps for custom components.
    extensions: HashMap<TypeId, Box<dyn AnyExtMap>>,
    /// `TypeId` → name mapping for extension serialization.
    ext_names: HashMap<TypeId, String>,

    // -- Global resources (singletons not attached to any entity) --
    /// Type-erased global resources for game-specific state.
    resources: HashMap<TypeId, Box<dyn Any + Send + Sync>>,
}

impl World {
    /// Create an empty world with no entities.
    #[must_use]
    pub fn new() -> Self {
        Self {
            alive: SlotMap::with_key(),
            positions: SecondaryMap::new(),
            velocities: SecondaryMap::new(),
            elevators: SecondaryMap::new(),
            stops: SecondaryMap::new(),
            riders: SecondaryMap::new(),
            routes: SecondaryMap::new(),
            lines: SecondaryMap::new(),
            patience: SecondaryMap::new(),
            preferences: SecondaryMap::new(),
            access_controls: SecondaryMap::new(),
            #[cfg(feature = "energy")]
            energy_profiles: SecondaryMap::new(),
            #[cfg(feature = "energy")]
            energy_metrics: SecondaryMap::new(),
            disabled: SecondaryMap::new(),
            extensions: HashMap::new(),
            ext_names: HashMap::new(),
            resources: HashMap::new(),
        }
    }

    /// Allocate a new entity. Returns its id. No components attached yet.
    pub fn spawn(&mut self) -> EntityId {
        self.alive.insert(())
    }

    /// Remove an entity and all its components (built-in and extensions).
    ///
    /// Cross-references are cleaned up automatically:
    /// - If the entity is a rider aboard an elevator, it is removed from the
    ///   elevator's rider list and `current_load` is adjusted.
    /// - If the entity is an elevator, its riders' phases are reset to `Waiting`.
    pub fn despawn(&mut self, id: EntityId) {
        // Clean up rider → elevator cross-references.
        if let Some(rider) = self.riders.get(id) {
            let weight = rider.weight;
            // If this rider is aboard an elevator, remove from its riders list.
            match rider.phase {
                crate::components::RiderPhase::Boarding(elev)
                | crate::components::RiderPhase::Riding(elev)
                | crate::components::RiderPhase::Exiting(elev) => {
                    if let Some(car) = self.elevators.get_mut(elev) {
                        car.riders.retain(|r| *r != id);
                        car.current_load = (car.current_load - weight).max(0.0);
                    }
                }
                _ => {}
            }
        }

        // Clean up elevator → rider cross-references.
        if let Some(car) = self.elevators.get(id) {
            let rider_ids: Vec<EntityId> = car.riders.clone();
            let elev_pos = self.positions.get(id).map(|p| p.value);
            let nearest_stop = elev_pos.and_then(|p| self.find_nearest_stop(p));
            for rid in rider_ids {
                if let Some(rider) = self.riders.get_mut(rid) {
                    rider.phase = crate::components::RiderPhase::Waiting;
                    rider.current_stop = nearest_stop;
                }
            }
        }

        self.alive.remove(id);
        self.positions.remove(id);
        self.velocities.remove(id);
        self.elevators.remove(id);
        self.stops.remove(id);
        self.riders.remove(id);
        self.routes.remove(id);
        self.lines.remove(id);
        self.patience.remove(id);
        self.preferences.remove(id);
        self.access_controls.remove(id);
        #[cfg(feature = "energy")]
        self.energy_profiles.remove(id);
        #[cfg(feature = "energy")]
        self.energy_metrics.remove(id);
        self.disabled.remove(id);

        for ext in self.extensions.values_mut() {
            ext.remove(id);
        }
    }

    /// Check if an entity is alive.
    #[must_use]
    pub fn is_alive(&self, id: EntityId) -> bool {
        self.alive.contains_key(id)
    }

    /// Number of live entities.
    #[must_use]
    pub fn entity_count(&self) -> usize {
        self.alive.len()
    }

    /// Iterate all alive entity keys (used by the query builder).
    pub(crate) fn alive_keys(&self) -> slotmap::basic::Keys<'_, EntityId, ()> {
        self.alive.keys()
    }

    // ── Position accessors ───────────────────────────────────────────

    /// Get an entity's position.
    #[must_use]
    pub fn position(&self, id: EntityId) -> Option<&Position> {
        self.positions.get(id)
    }

    /// Get an entity's position mutably.
    pub fn position_mut(&mut self, id: EntityId) -> Option<&mut Position> {
        self.positions.get_mut(id)
    }

    /// Set an entity's position.
    pub fn set_position(&mut self, id: EntityId, pos: Position) {
        self.positions.insert(id, pos);
    }

    // ── Velocity accessors ───────────────────────────────────────────

    /// Get an entity's velocity.
    #[must_use]
    pub fn velocity(&self, id: EntityId) -> Option<&Velocity> {
        self.velocities.get(id)
    }

    /// Get an entity's velocity mutably.
    pub fn velocity_mut(&mut self, id: EntityId) -> Option<&mut Velocity> {
        self.velocities.get_mut(id)
    }

    /// Set an entity's velocity.
    pub fn set_velocity(&mut self, id: EntityId, vel: Velocity) {
        self.velocities.insert(id, vel);
    }

    // ── Elevator accessors ───────────────────────────────────────────

    /// Get an entity's elevator component.
    #[must_use]
    pub fn elevator(&self, id: EntityId) -> Option<&Elevator> {
        self.elevators.get(id)
    }

    /// Get an entity's elevator component mutably.
    pub fn elevator_mut(&mut self, id: EntityId) -> Option<&mut Elevator> {
        self.elevators.get_mut(id)
    }

    /// Set an entity's elevator component.
    pub fn set_elevator(&mut self, id: EntityId, elev: Elevator) {
        self.elevators.insert(id, elev);
    }

    // ── Rider accessors ──────────────────────────────────────────────

    /// Get an entity's rider component.
    #[must_use]
    pub fn rider(&self, id: EntityId) -> Option<&Rider> {
        self.riders.get(id)
    }

    /// Get an entity's rider component mutably.
    pub fn rider_mut(&mut self, id: EntityId) -> Option<&mut Rider> {
        self.riders.get_mut(id)
    }

    /// Set an entity's rider component.
    pub fn set_rider(&mut self, id: EntityId, rider: Rider) {
        self.riders.insert(id, rider);
    }

    // ── Stop accessors ───────────────────────────────────────────────

    /// Get an entity's stop component.
    #[must_use]
    pub fn stop(&self, id: EntityId) -> Option<&Stop> {
        self.stops.get(id)
    }

    /// Get an entity's stop component mutably.
    pub fn stop_mut(&mut self, id: EntityId) -> Option<&mut Stop> {
        self.stops.get_mut(id)
    }

    /// Set an entity's stop component.
    pub fn set_stop(&mut self, id: EntityId, stop: Stop) {
        self.stops.insert(id, stop);
    }

    // ── Route accessors ──────────────────────────────────────────────

    /// Get an entity's route.
    #[must_use]
    pub fn route(&self, id: EntityId) -> Option<&Route> {
        self.routes.get(id)
    }

    /// Get an entity's route mutably.
    pub fn route_mut(&mut self, id: EntityId) -> Option<&mut Route> {
        self.routes.get_mut(id)
    }

    /// Set an entity's route.
    pub fn set_route(&mut self, id: EntityId, route: Route) {
        self.routes.insert(id, route);
    }

    // ── Line accessors ─────────────────────────────────────────────��──

    /// Get an entity's line component.
    #[must_use]
    pub fn line(&self, id: EntityId) -> Option<&Line> {
        self.lines.get(id)
    }

    /// Get an entity's line component mutably.
    pub fn line_mut(&mut self, id: EntityId) -> Option<&mut Line> {
        self.lines.get_mut(id)
    }

    /// Set an entity's line component.
    pub fn set_line(&mut self, id: EntityId, line: Line) {
        self.lines.insert(id, line);
    }

    /// Remove an entity's line component.
    pub fn remove_line(&mut self, id: EntityId) -> Option<Line> {
        self.lines.remove(id)
    }

    /// Iterate all line entities.
    pub fn iter_lines(&self) -> impl Iterator<Item = (EntityId, &Line)> {
        self.lines.iter()
    }

    // ── Patience accessors ───────────────────────────────────────────

    /// Get an entity's patience.
    #[must_use]
    pub fn patience(&self, id: EntityId) -> Option<&Patience> {
        self.patience.get(id)
    }

    /// Get an entity's patience mutably.
    pub fn patience_mut(&mut self, id: EntityId) -> Option<&mut Patience> {
        self.patience.get_mut(id)
    }

    /// Set an entity's patience.
    pub fn set_patience(&mut self, id: EntityId, patience: Patience) {
        self.patience.insert(id, patience);
    }

    // ── Preferences accessors ────────────────────────────────────────

    /// Get an entity's preferences.
    #[must_use]
    pub fn preferences(&self, id: EntityId) -> Option<&Preferences> {
        self.preferences.get(id)
    }

    /// Set an entity's preferences.
    pub fn set_preferences(&mut self, id: EntityId, prefs: Preferences) {
        self.preferences.insert(id, prefs);
    }

    // ── Access control accessors ────────────────────────────────────

    /// Get an entity's access control.
    #[must_use]
    pub fn access_control(&self, id: EntityId) -> Option<&AccessControl> {
        self.access_controls.get(id)
    }

    /// Get an entity's access control mutably.
    pub fn access_control_mut(&mut self, id: EntityId) -> Option<&mut AccessControl> {
        self.access_controls.get_mut(id)
    }

    /// Set an entity's access control.
    pub fn set_access_control(&mut self, id: EntityId, ac: AccessControl) {
        self.access_controls.insert(id, ac);
    }

    // ── Energy accessors (feature-gated) ────────────────────────────

    #[cfg(feature = "energy")]
    /// Get an entity's energy profile.
    #[must_use]
    pub fn energy_profile(&self, id: EntityId) -> Option<&EnergyProfile> {
        self.energy_profiles.get(id)
    }

    #[cfg(feature = "energy")]
    /// Get an entity's energy metrics.
    #[must_use]
    pub fn energy_metrics(&self, id: EntityId) -> Option<&EnergyMetrics> {
        self.energy_metrics.get(id)
    }

    #[cfg(feature = "energy")]
    /// Get an entity's energy metrics mutably.
    pub fn energy_metrics_mut(&mut self, id: EntityId) -> Option<&mut EnergyMetrics> {
        self.energy_metrics.get_mut(id)
    }

    #[cfg(feature = "energy")]
    /// Set an entity's energy profile.
    pub fn set_energy_profile(&mut self, id: EntityId, profile: EnergyProfile) {
        self.energy_profiles.insert(id, profile);
    }

    #[cfg(feature = "energy")]
    /// Set an entity's energy metrics.
    pub fn set_energy_metrics(&mut self, id: EntityId, metrics: EnergyMetrics) {
        self.energy_metrics.insert(id, metrics);
    }

    // ── Typed query helpers ──────────────────────────────────────────

    /// Iterate all elevator entities (have `Elevator` + `Position`).
    pub fn iter_elevators(&self) -> impl Iterator<Item = (EntityId, &Position, &Elevator)> {
        self.elevators
            .iter()
            .filter_map(|(id, car)| self.positions.get(id).map(|pos| (id, pos, car)))
    }

    /// Iterate all elevator entity IDs (allocates).
    #[must_use]
    pub fn elevator_ids(&self) -> Vec<EntityId> {
        self.elevators.keys().collect()
    }

    /// Fill the buffer with all elevator entity IDs, clearing it first.
    pub fn elevator_ids_into(&self, buf: &mut Vec<EntityId>) {
        buf.clear();
        buf.extend(self.elevators.keys());
    }

    /// Iterate all rider entities.
    pub fn iter_riders(&self) -> impl Iterator<Item = (EntityId, &Rider)> {
        self.riders.iter()
    }

    /// Iterate all rider entities mutably.
    pub fn iter_riders_mut(&mut self) -> impl Iterator<Item = (EntityId, &mut Rider)> {
        self.riders.iter_mut()
    }

    /// Iterate all rider entity IDs (allocates).
    #[must_use]
    pub fn rider_ids(&self) -> Vec<EntityId> {
        self.riders.keys().collect()
    }

    /// Iterate all stop entities.
    pub fn iter_stops(&self) -> impl Iterator<Item = (EntityId, &Stop)> {
        self.stops.iter()
    }

    /// Iterate all stop entity IDs (allocates).
    #[must_use]
    pub fn stop_ids(&self) -> Vec<EntityId> {
        self.stops.keys().collect()
    }

    /// Iterate elevators in `Idle` phase (not disabled).
    pub fn iter_idle_elevators(&self) -> impl Iterator<Item = (EntityId, &Position, &Elevator)> {
        use crate::components::ElevatorPhase;
        self.iter_elevators()
            .filter(|(id, _, car)| car.phase == ElevatorPhase::Idle && !self.is_disabled(*id))
    }

    /// Iterate elevators in `MovingToStop` phase (not disabled).
    pub fn iter_moving_elevators(&self) -> impl Iterator<Item = (EntityId, &Position, &Elevator)> {
        self.iter_elevators().filter(|(id, _, car)| {
            matches!(car.phase, crate::components::ElevatorPhase::MovingToStop(_))
                && !self.is_disabled(*id)
        })
    }

    /// Iterate riders in `Waiting` phase (not disabled).
    pub fn iter_waiting_riders(&self) -> impl Iterator<Item = (EntityId, &Rider)> {
        use crate::components::RiderPhase;
        self.iter_riders()
            .filter(|(id, r)| r.phase == RiderPhase::Waiting && !self.is_disabled(*id))
    }

    /// Find the stop entity at a given position (within epsilon).
    #[must_use]
    pub fn find_stop_at_position(&self, position: f64) -> Option<EntityId> {
        const EPSILON: f64 = 1e-6;
        self.stops.iter().find_map(|(id, stop)| {
            if (stop.position - position).abs() < EPSILON {
                Some(id)
            } else {
                None
            }
        })
    }

    /// Find the stop entity nearest to a given position.
    ///
    /// Unlike [`find_stop_at_position`](Self::find_stop_at_position), this finds
    /// the closest stop by minimum distance rather than requiring an exact match.
    /// Used when ejecting riders from a disabled/despawned elevator mid-transit.
    #[must_use]
    pub fn find_nearest_stop(&self, position: f64) -> Option<EntityId> {
        self.stops
            .iter()
            .min_by(|(_, a), (_, b)| {
                (a.position - position)
                    .abs()
                    .total_cmp(&(b.position - position).abs())
            })
            .map(|(id, _)| id)
    }

    /// Get a stop's position by entity id.
    #[must_use]
    pub fn stop_position(&self, id: EntityId) -> Option<f64> {
        self.stops.get(id).map(|s| s.position)
    }

    // ── Extension (custom component) storage ─────────────────────────

    /// Insert a custom component for an entity.
    ///
    /// Games use this to attach their own typed data to simulation entities.
    /// Extension components must be `Serialize + DeserializeOwned` to support
    /// snapshot save/load. A `name` string is required for serialization roundtrips.
    /// Extension components are automatically cleaned up on `despawn()`.
    ///
    /// ```
    /// use elevator_core::world::World;
    /// use serde::{Serialize, Deserialize};
    ///
    /// #[derive(Debug, Clone, Serialize, Deserialize)]
    /// struct VipTag { level: u32 }
    ///
    /// let mut world = World::new();
    /// let entity = world.spawn();
    /// world.insert_ext(entity, VipTag { level: 3 }, "vip_tag");
    /// ```
    pub fn insert_ext<T: 'static + Send + Sync + serde::Serialize + serde::de::DeserializeOwned>(
        &mut self,
        id: EntityId,
        value: T,
        name: &str,
    ) {
        let type_id = TypeId::of::<T>();
        let map = self
            .extensions
            .entry(type_id)
            .or_insert_with(|| Box::new(SecondaryMap::<EntityId, T>::new()));
        if let Some(m) = map.as_any_mut().downcast_mut::<SecondaryMap<EntityId, T>>() {
            m.insert(id, value);
        }
        self.ext_names.insert(type_id, name.to_owned());
    }

    /// Get a clone of a custom component for an entity.
    #[must_use]
    pub fn get_ext<T: 'static + Send + Sync + Clone>(&self, id: EntityId) -> Option<T> {
        self.ext_map::<T>()?.get(id).cloned()
    }

    /// Get a mutable reference to a custom component for an entity.
    pub fn get_ext_mut<T: 'static + Send + Sync>(&mut self, id: EntityId) -> Option<&mut T> {
        self.ext_map_mut::<T>()?.get_mut(id)
    }

    /// Remove a custom component for an entity.
    pub fn remove_ext<T: 'static + Send + Sync>(&mut self, id: EntityId) -> Option<T> {
        self.ext_map_mut::<T>()?.remove(id)
    }

    /// Downcast extension storage to a typed `SecondaryMap` (shared).
    pub(crate) fn ext_map<T: 'static + Send + Sync>(&self) -> Option<&SecondaryMap<EntityId, T>> {
        self.extensions
            .get(&TypeId::of::<T>())?
            .as_any()
            .downcast_ref::<SecondaryMap<EntityId, T>>()
    }

    /// Downcast extension storage to a typed `SecondaryMap` (mutable).
    fn ext_map_mut<T: 'static + Send + Sync>(&mut self) -> Option<&mut SecondaryMap<EntityId, T>> {
        self.extensions
            .get_mut(&TypeId::of::<T>())?
            .as_any_mut()
            .downcast_mut::<SecondaryMap<EntityId, T>>()
    }

    /// Serialize all extension component data for snapshot.
    /// Returns name → (`EntityId` → RON string) mapping.
    pub(crate) fn serialize_extensions(&self) -> HashMap<String, HashMap<EntityId, String>> {
        let mut result = HashMap::new();
        for (type_id, map) in &self.extensions {
            if let Some(name) = self.ext_names.get(type_id) {
                result.insert(name.clone(), map.serialize_entries());
            }
        }
        result
    }

    /// Deserialize extension data from snapshot. Requires that extension types
    /// have been registered (via `register_ext_deserializer`) before calling.
    pub(crate) fn deserialize_extensions(
        &mut self,
        data: &HashMap<String, HashMap<EntityId, String>>,
    ) {
        for (name, entries) in data {
            // Find the TypeId by name.
            if let Some((&type_id, _)) = self.ext_names.iter().find(|(_, n)| *n == name) {
                if let Some(map) = self.extensions.get_mut(&type_id) {
                    map.deserialize_entries(entries);
                }
            }
        }
    }

    /// Register an extension type for deserialization (creates empty storage).
    ///
    /// Must be called before `restore()` for each extension type that was
    /// present in the original simulation.
    pub fn register_ext<
        T: 'static + Send + Sync + serde::Serialize + serde::de::DeserializeOwned,
    >(
        &mut self,
        name: &str,
    ) {
        let type_id = TypeId::of::<T>();
        self.extensions
            .entry(type_id)
            .or_insert_with(|| Box::new(SecondaryMap::<EntityId, T>::new()));
        self.ext_names.insert(type_id, name.to_owned());
    }

    // ── Disabled entity management ──────────────────────────────────

    /// Mark an entity as disabled. Disabled entities are skipped by all systems.
    pub fn disable(&mut self, id: EntityId) {
        self.disabled.insert(id, ());
    }

    /// Re-enable a disabled entity.
    pub fn enable(&mut self, id: EntityId) {
        self.disabled.remove(id);
    }

    /// Check if an entity is disabled.
    #[must_use]
    pub fn is_disabled(&self, id: EntityId) -> bool {
        self.disabled.contains_key(id)
    }

    // ── Global resources (singletons) ───────────────────────────────

    /// Insert a global resource. Replaces any existing resource of the same type.
    ///
    /// Resources are singletons not attached to any entity. Games use them
    /// for event channels, score trackers, or any global state.
    ///
    /// ```
    /// use elevator_core::world::World;
    /// use elevator_core::events::EventChannel;
    ///
    /// #[derive(Debug)]
    /// enum MyEvent { Score(u32) }
    ///
    /// let mut world = World::new();
    /// world.insert_resource(EventChannel::<MyEvent>::new());
    /// ```
    pub fn insert_resource<T: 'static + Send + Sync>(&mut self, value: T) {
        self.resources.insert(TypeId::of::<T>(), Box::new(value));
    }

    /// Get a shared reference to a global resource.
    #[must_use]
    pub fn resource<T: 'static + Send + Sync>(&self) -> Option<&T> {
        self.resources.get(&TypeId::of::<T>())?.downcast_ref()
    }

    /// Get a mutable reference to a global resource.
    pub fn resource_mut<T: 'static + Send + Sync>(&mut self) -> Option<&mut T> {
        self.resources.get_mut(&TypeId::of::<T>())?.downcast_mut()
    }

    /// Remove a global resource, returning it if it existed.
    pub fn remove_resource<T: 'static + Send + Sync>(&mut self) -> Option<T> {
        self.resources
            .remove(&TypeId::of::<T>())
            .and_then(|b| b.downcast().ok())
            .map(|b| *b)
    }

    // ── Query builder ───────────────────────────────────────────────

    /// Create a query builder for iterating entities by component composition.
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::new().build().unwrap();
    /// sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 75.0).unwrap();
    ///
    /// let world = sim.world();
    /// for (id, rider, pos) in world.query::<(EntityId, &Rider, &Position)>().iter() {
    ///     println!("{id:?}: {:?} at {}", rider.phase(), pos.value());
    /// }
    /// ```
    #[must_use]
    pub const fn query<Q: crate::query::WorldQuery>(&self) -> crate::query::QueryBuilder<'_, Q> {
        crate::query::QueryBuilder::new(self)
    }

    /// Create a mutable extension query builder.
    ///
    /// Uses the keys-snapshot pattern: collects matching entity IDs upfront
    /// into an owned `Vec`, then iterates with mutable access via
    /// [`for_each_mut`](crate::query::ExtQueryMut::for_each_mut).
    ///
    /// # Example
    ///
    /// ```ignore
    /// world.query_ext_mut::<VipTag>().for_each_mut(|id, tag| {
    ///     tag.level += 1;
    /// });
    /// ```
    pub fn query_ext_mut<T: 'static + Send + Sync>(&mut self) -> crate::query::ExtQueryMut<'_, T> {
        crate::query::ExtQueryMut::new(self)
    }
}

impl Default for World {
    fn default() -> Self {
        Self::new()
    }
}

/// Stops sorted by position for efficient range queries (binary search).
///
/// Used by the movement system to detect `PassingFloor` events in O(log n)
/// instead of O(n) per moving elevator per tick.
pub(crate) struct SortedStops(pub(crate) Vec<(f64, EntityId)>);
