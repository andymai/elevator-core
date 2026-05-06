//! Central entity/component storage (struct-of-arrays ECS).

use std::any::{Any, TypeId};
use std::collections::{BTreeMap, HashMap};
use std::marker::PhantomData;

use slotmap::{SecondaryMap, SlotMap};

use crate::components::{
    AccessControl, CallDirection, CarCall, DestinationQueue, Elevator, HallCall, Line, Patience,
    Position, Preferences, Rider, Route, ServiceMode, Stop, Velocity,
};
#[cfg(feature = "energy")]
use crate::energy::{EnergyMetrics, EnergyProfile};
use crate::entity::EntityId;
use crate::query::storage::AnyExtMap;

/// Typed handle for extension component storage.
///
/// Constructed via [`ExtKey::new`] with an explicit name, or
/// [`ExtKey::from_type_name`] which uses `std::any::type_name::<T>()`.
#[derive(Debug)]
pub struct ExtKey<T> {
    /// Human-readable storage name, used for serialization roundtrips.
    name: &'static str,
    /// Binds this key to the extension component type `T`.
    _marker: PhantomData<T>,
}

impl<T> Clone for ExtKey<T> {
    fn clone(&self) -> Self {
        *self
    }
}
impl<T> Copy for ExtKey<T> {}

impl<T> ExtKey<T> {
    /// Create a key with an explicit storage name.
    #[must_use]
    pub const fn new(name: &'static str) -> Self {
        Self {
            name,
            _marker: PhantomData,
        }
    }

    /// Create a key using `std::any::type_name::<T>()` as the storage name.
    #[must_use]
    pub fn from_type_name() -> Self {
        Self {
            name: std::any::type_name::<T>(),
            _marker: PhantomData,
        }
    }

    /// The storage name for this key.
    #[must_use]
    pub const fn name(&self) -> &'static str {
        self.name
    }
}

impl<T> Default for ExtKey<T> {
    fn default() -> Self {
        Self::from_type_name()
    }
}

/// Central storage for all simulation entities and their components.
///
/// Uses separate `SecondaryMap` per component type (struct-of-arrays pattern)
/// to enable independent mutable borrows of different component storages
/// within the same system function.
///
/// Built-in components are accessed via typed methods. Games can attach
/// custom data via the extension storage (`insert_ext` / `ext`).
/// The query builder (`world.query::<...>()`) provides ECS-style iteration.
///
/// # Component-accessor semantics
///
/// All `<component>(&self, id)` accessors return `Option`. They return `None`
/// when the entity is dead **or** when it is alive but lacks that component —
/// slotmap semantics make these two cases indistinguishable through this
/// surface. Use [`World::is_alive`] (or check the typed component you expect
/// to be present, e.g. `elevator()` for an elevator entity) when the
/// distinction matters.
pub struct World {
    /// Primary key storage. An entity exists iff its key is here.
    pub(crate) alive: SlotMap<EntityId, ()>,

    // -- Built-in component storages (crate-internal) --
    /// Shaft-axis positions.
    pub(crate) positions: SecondaryMap<EntityId, Position>,
    /// Snapshot of `positions` taken at the start of the current tick.
    /// Enables sub-tick interpolation for smooth rendering between steps.
    pub(crate) prev_positions: SecondaryMap<EntityId, Position>,
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
    /// Elevator service modes.
    pub(crate) service_modes: SecondaryMap<EntityId, ServiceMode>,
    /// Per-elevator destination queues.
    pub(crate) destination_queues: SecondaryMap<EntityId, DestinationQueue>,
    /// Up/down hall call buttons per stop. At most two per stop.
    pub(crate) hall_calls: SecondaryMap<EntityId, StopCalls>,
    /// Floor buttons pressed inside each car (Classic mode).
    pub(crate) car_calls: SecondaryMap<EntityId, Vec<CarCall>>,

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
            prev_positions: SecondaryMap::new(),
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
            service_modes: SecondaryMap::new(),
            destination_queues: SecondaryMap::new(),
            hall_calls: SecondaryMap::new(),
            car_calls: SecondaryMap::new(),
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
    /// `World::despawn` is a low-level operation: it removes the entity's
    /// arena entries and performs the cross-references that `World` can
    /// safely maintain on its own. It does **not** perform rider lifecycle
    /// transitions (which require `RiderIndex`, owned by `Simulation`).
    ///
    /// Cross-references handled here:
    /// - If the entity is a rider aboard an elevator, it is removed from
    ///   the elevator's rider list and `current_load` is adjusted.
    ///
    /// **Despawning an elevator with aboard riders is the caller's
    /// responsibility to clean up.** Use
    /// [`Simulation::remove_elevator`](crate::sim::Simulation::remove_elevator)
    /// (which calls [`Simulation::disable`](crate::sim::Simulation::disable)
    /// first to transition aboard riders to `Waiting` via the transition
    /// gateway). Calling this method directly on a populated elevator leaves
    /// aboard riders pointing at a now-dead `EntityId` in their `phase` —
    /// a footgun this method no longer attempts to paper over, since any
    /// reset it produced would silently desync `RiderIndex`.
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
                        car.current_load -= weight;
                    }
                }
                _ => {}
            }
        }

        self.alive.remove(id);
        self.positions.remove(id);
        self.prev_positions.remove(id);
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
        self.service_modes.remove(id);
        self.destination_queues.remove(id);
        self.disabled.remove(id);
        self.hall_calls.remove(id);
        self.car_calls.remove(id);

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
    pub(crate) fn set_position(&mut self, id: EntityId, pos: Position) {
        self.positions.insert(id, pos);
    }

    /// Snapshot of an entity's position at the start of the current tick.
    ///
    /// Pairs with [`position`](Self::position) to support sub-tick interpolation
    /// (see [`Simulation::position_at`](crate::sim::Simulation::position_at)).
    #[must_use]
    pub fn prev_position(&self, id: EntityId) -> Option<&Position> {
        self.prev_positions.get(id)
    }

    /// Snapshot all current positions into `prev_positions`.
    ///
    /// Called at the start of each tick by
    /// [`Simulation::step`](crate::sim::Simulation::step) before any phase
    /// mutates positions.
    pub(crate) fn snapshot_prev_positions(&mut self) {
        self.prev_positions.clear();
        for (id, pos) in &self.positions {
            self.prev_positions.insert(id, *pos);
        }
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
    pub(crate) fn set_velocity(&mut self, id: EntityId, vel: Velocity) {
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
    pub(crate) fn set_elevator(&mut self, id: EntityId, elev: Elevator) {
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
    ///
    /// # Warning
    ///
    /// This does **not** update the [`RiderIndex`](crate::rider_index::RiderIndex).
    /// Call [`RiderIndex::rebuild`](crate::rider_index::RiderIndex::rebuild) afterward
    /// if the phase or `current_stop` changed.
    pub(crate) fn set_rider(&mut self, id: EntityId, rider: Rider) {
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
    pub(crate) fn set_stop(&mut self, id: EntityId, stop: Stop) {
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
    pub(crate) fn set_route(&mut self, id: EntityId, route: Route) {
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
    pub(crate) fn set_line(&mut self, id: EntityId, line: Line) {
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
    pub(crate) fn set_patience(&mut self, id: EntityId, patience: Patience) {
        self.patience.insert(id, patience);
    }

    // ── Preferences accessors ────────────────────────────────────────

    /// Get an entity's preferences.
    #[must_use]
    pub fn preferences(&self, id: EntityId) -> Option<&Preferences> {
        self.preferences.get(id)
    }

    /// Set an entity's preferences.
    pub(crate) fn set_preferences(&mut self, id: EntityId, prefs: Preferences) {
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
    pub(crate) fn set_access_control(&mut self, id: EntityId, ac: AccessControl) {
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
    pub(crate) fn set_energy_profile(&mut self, id: EntityId, profile: EnergyProfile) {
        self.energy_profiles.insert(id, profile);
    }

    #[cfg(feature = "energy")]
    /// Set an entity's energy metrics.
    pub(crate) fn set_energy_metrics(&mut self, id: EntityId, metrics: EnergyMetrics) {
        self.energy_metrics.insert(id, metrics);
    }

    // ── Service mode accessors ──────────────────────────────────────

    /// Get an entity's service mode.
    #[must_use]
    pub fn service_mode(&self, id: EntityId) -> Option<&ServiceMode> {
        self.service_modes.get(id)
    }

    /// Set an entity's service mode.
    pub(crate) fn set_service_mode(&mut self, id: EntityId, mode: ServiceMode) {
        self.service_modes.insert(id, mode);
    }

    // ── Destination queue accessors ─────────────────────────────────

    /// Get an entity's destination queue.
    #[must_use]
    pub fn destination_queue(&self, id: EntityId) -> Option<&DestinationQueue> {
        self.destination_queues.get(id)
    }

    /// Get an entity's destination queue mutably (crate-internal — games
    /// mutate via the [`Simulation`](crate::sim::Simulation) helpers).
    pub(crate) fn destination_queue_mut(&mut self, id: EntityId) -> Option<&mut DestinationQueue> {
        self.destination_queues.get_mut(id)
    }

    /// Set an entity's destination queue.
    pub(crate) fn set_destination_queue(&mut self, id: EntityId, queue: DestinationQueue) {
        self.destination_queues.insert(id, queue);
    }

    // ── Hall call / car call accessors ──────────────────────────────

    /// Get the `(up, down)` hall call pair at a stop, if any exist.
    #[must_use]
    pub fn stop_calls(&self, stop: EntityId) -> Option<&StopCalls> {
        self.hall_calls.get(stop)
    }

    /// Get a specific directional hall call at a stop.
    #[must_use]
    pub fn hall_call(&self, stop: EntityId, direction: CallDirection) -> Option<&HallCall> {
        self.hall_calls.get(stop).and_then(|c| c.get(direction))
    }

    /// Mutable access to a directional hall call (crate-internal).
    pub(crate) fn hall_call_mut(
        &mut self,
        stop: EntityId,
        direction: CallDirection,
    ) -> Option<&mut HallCall> {
        self.hall_calls
            .get_mut(stop)
            .and_then(|c| c.get_mut(direction))
    }

    /// Insert (or replace) a hall call at `stop` in `direction`.
    /// Returns `false` if the stop entity no longer exists in the world.
    pub(crate) fn set_hall_call(&mut self, call: HallCall) -> bool {
        let Some(entry) = self.hall_calls.entry(call.stop) else {
            return false;
        };
        let slot = entry.or_default();
        match call.direction {
            CallDirection::Up => slot.up = Some(call),
            CallDirection::Down => slot.down = Some(call),
        }
        true
    }

    /// Remove and return the hall call at `(stop, direction)`, if any.
    pub(crate) fn remove_hall_call(
        &mut self,
        stop: EntityId,
        direction: CallDirection,
    ) -> Option<HallCall> {
        let entry = self.hall_calls.get_mut(stop)?;
        match direction {
            CallDirection::Up => entry.up.take(),
            CallDirection::Down => entry.down.take(),
        }
    }

    /// Iterate every active hall call across the world.
    pub fn iter_hall_calls(&self) -> impl Iterator<Item = &HallCall> {
        self.hall_calls.values().flat_map(StopCalls::iter)
    }

    /// Mutable iteration over every active hall call (crate-internal).
    pub(crate) fn iter_hall_calls_mut(&mut self) -> impl Iterator<Item = &mut HallCall> {
        self.hall_calls.values_mut().flat_map(StopCalls::iter_mut)
    }

    /// Car calls currently registered inside `car`.
    #[must_use]
    pub fn car_calls(&self, car: EntityId) -> &[CarCall] {
        self.car_calls.get(car).map_or(&[], Vec::as_slice)
    }

    /// Mutable access to the car-call list (crate-internal). Returns
    /// `None` if the car entity no longer exists.
    pub(crate) fn car_calls_mut(&mut self, car: EntityId) -> Option<&mut Vec<CarCall>> {
        Some(self.car_calls.entry(car)?.or_default())
    }

    /// Remove `rider` from every hall- and car-call's `pending_riders`
    /// list, and drop car calls whose list becomes empty as a result.
    ///
    /// Call on despawn or abandonment so stale rider IDs don't hold
    /// calls open past the rider's life. Mirrors the per-exit cleanup
    /// in `systems::loading` (for `Exit`-time car-call pruning). Hall
    /// calls stay alive after the list empties: they may still represent
    /// a script-driven press with no associated rider, and are cleared
    /// the usual way when an eligible car opens doors.
    pub(crate) fn scrub_rider_from_pending_calls(&mut self, rider: EntityId) {
        for call in self.iter_hall_calls_mut() {
            call.pending_riders.retain(|r| *r != rider);
        }
        for calls in self.car_calls.values_mut() {
            for c in calls.iter_mut() {
                c.pending_riders.retain(|r| *r != rider);
            }
            calls.retain(|c| !c.pending_riders.is_empty());
        }
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

    /// Iterate elevators that are currently moving — either on a dispatched
    /// trip (`MovingToStop`) or a repositioning trip (`Repositioning`).
    /// Excludes disabled elevators.
    pub fn iter_moving_elevators(&self) -> impl Iterator<Item = (EntityId, &Position, &Elevator)> {
        self.iter_elevators()
            .filter(|(id, _, car)| car.phase.is_moving() && !self.is_disabled(*id))
    }

    /// Iterate riders in `Waiting` phase (not disabled).
    pub fn iter_waiting_riders(&self) -> impl Iterator<Item = (EntityId, &Rider)> {
        use crate::components::RiderPhase;
        self.iter_riders()
            .filter(|(id, r)| r.phase == RiderPhase::Waiting && !self.is_disabled(*id))
    }

    /// Find the stop entity at a given position (within
    /// [`STOP_POSITION_EPSILON`](Self::STOP_POSITION_EPSILON)).
    ///
    /// Global lookup — does not filter by line. When two stops on
    /// different lines share the same physical position the result is
    /// whichever wins the linear scan, which is rarely what the
    /// caller actually wants. Prefer
    /// [`find_stop_at_position_in`](Self::find_stop_at_position_in)
    /// when the caller knows which line's stops to consider.
    #[must_use]
    pub fn find_stop_at_position(&self, position: f64) -> Option<EntityId> {
        self.stops.iter().find_map(|(id, stop)| {
            if (stop.position - position).abs() < Self::STOP_POSITION_EPSILON {
                Some(id)
            } else {
                None
            }
        })
    }

    /// Find the stop at a given position from within `candidates`.
    ///
    /// `candidates` is typically the `serves` list of a particular
    /// [`LineInfo`](crate::dispatch::LineInfo) — i.e. the stops a
    /// specific line can reach. Use this when a car arrives at a
    /// position and you need *its* line's stop entity, not whichever
    /// stop on any line happens to share the position. (Two parallel
    /// shafts at the same physical floor, or a sky-lobby served by
    /// both a low and high bank, both produce position collisions
    /// the global lookup can't disambiguate.)
    ///
    /// O(n) over `candidates`, which is typically small.
    #[must_use]
    pub fn find_stop_at_position_in(
        &self,
        position: f64,
        candidates: &[EntityId],
    ) -> Option<EntityId> {
        candidates.iter().copied().find(|&id| {
            self.stops
                .get(id)
                .is_some_and(|stop| (stop.position - position).abs() < Self::STOP_POSITION_EPSILON)
        })
    }

    /// Tolerance for [`find_stop_at_position`](Self::find_stop_at_position)
    /// and [`find_stop_at_position_in`](Self::find_stop_at_position_in).
    /// Sub-micrometre — small enough that no two distinct floors should
    /// land within it, large enough to absorb floating-point noise from
    /// trapezoidal-velocity arrival math.
    pub const STOP_POSITION_EPSILON: f64 = 1e-6;

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
    /// snapshot save/load. An [`ExtKey`] is required for serialization roundtrips.
    /// Extension components are automatically cleaned up on `despawn()`.
    ///
    /// ```
    /// use elevator_core::world::{ExtKey, World};
    /// use serde::{Serialize, Deserialize};
    ///
    /// #[derive(Debug, Clone, Serialize, Deserialize)]
    /// struct VipTag { level: u32 }
    ///
    /// let mut world = World::new();
    /// let entity = world.spawn();
    /// world.insert_ext(entity, VipTag { level: 3 }, ExtKey::from_type_name());
    /// ```
    pub fn insert_ext<T: 'static + Send + Sync + serde::Serialize + serde::de::DeserializeOwned>(
        &mut self,
        id: EntityId,
        value: T,
        key: ExtKey<T>,
    ) {
        let type_id = TypeId::of::<T>();
        Self::assert_ext_name_unique(&self.ext_names, type_id, key.name());
        let map = self
            .extensions
            .entry(type_id)
            .or_insert_with(|| Box::new(SecondaryMap::<EntityId, T>::new()));
        if let Some(m) = map.as_any_mut().downcast_mut::<SecondaryMap<EntityId, T>>() {
            m.insert(id, value);
        }
        self.ext_names.insert(type_id, key.name().to_owned());
    }

    /// Get a clone of a custom component for an entity.
    #[must_use]
    pub fn ext<T: 'static + Send + Sync + Clone>(&self, id: EntityId) -> Option<T> {
        self.ext_map::<T>()?.get(id).cloned()
    }

    /// Shared reference to a custom component for an entity.
    ///
    /// Zero-copy alternative to [`ext`](Self::ext): prefer this when
    /// `T` is large or expensive to clone, or when the caller only needs a
    /// borrow. Unlike `ext`, `T` does not need to implement `Clone`.
    #[must_use]
    pub fn ext_ref<T: 'static + Send + Sync>(&self, id: EntityId) -> Option<&T> {
        self.ext_map::<T>()?.get(id)
    }

    /// Mutable reference to a custom component for an entity.
    pub fn ext_mut<T: 'static + Send + Sync>(&mut self, id: EntityId) -> Option<&mut T> {
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
    /// Returns name → (`EntityId` → RON string) mapping. `BTreeMap` for
    /// deterministic snapshot bytes across processes (#254).
    pub(crate) fn serialize_extensions(&self) -> BTreeMap<String, BTreeMap<EntityId, String>> {
        let mut result = BTreeMap::new();
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
        data: &BTreeMap<String, BTreeMap<EntityId, String>>,
    ) {
        for (name, entries) in data {
            // Find the TypeId by name.
            if let Some((&type_id, _)) = self.ext_names.iter().find(|(_, n)| *n == name)
                && let Some(map) = self.extensions.get_mut(&type_id)
            {
                map.deserialize_entries(entries);
            }
        }
    }

    /// Return names from `snapshot_names` that have no registered extension type.
    pub(crate) fn unregistered_ext_names<'a>(
        &self,
        snapshot_names: impl Iterator<Item = &'a String>,
    ) -> Vec<String> {
        let registered: std::collections::HashSet<&str> =
            self.ext_names.values().map(String::as_str).collect();
        snapshot_names
            .filter(|name| !registered.contains(name.as_str()))
            .cloned()
            .collect()
    }

    /// Register an extension type for deserialization (creates empty storage).
    ///
    /// Must be called before `restore()` for each extension type that was
    /// present in the original simulation. Returns the key for convenience.
    pub fn register_ext<
        T: 'static + Send + Sync + serde::Serialize + serde::de::DeserializeOwned,
    >(
        &mut self,
        key: ExtKey<T>,
    ) -> ExtKey<T> {
        let type_id = TypeId::of::<T>();
        Self::assert_ext_name_unique(&self.ext_names, type_id, key.name());
        self.extensions
            .entry(type_id)
            .or_insert_with(|| Box::new(SecondaryMap::<EntityId, T>::new()));
        self.ext_names.insert(type_id, key.name().to_owned());
        key
    }

    /// Panic if `name` is already registered to a different `TypeId`.
    ///
    /// Two extension types sharing one `ExtKey` name silently corrupts
    /// snapshot serde: `serialize_extensions` collapses both types' data
    /// into one slot in the result map, and `deserialize_extensions`
    /// routes the data to whichever `TypeId` `HashMap::iter().find` returns
    /// first — a non-deterministic choice. Failing fast here prevents
    /// the corruption from ever being written.
    ///
    /// Panic chosen over `Result` because [`register_ext`](Self::register_ext)
    /// and [`insert_ext`](Self::insert_ext) are non-fallible by design and
    /// changing their signatures would break every consumer. Name collisions
    /// are programmer errors discoverable at startup, not runtime conditions
    /// to recover from.
    #[allow(clippy::panic)]
    fn assert_ext_name_unique(ext_names: &HashMap<TypeId, String>, type_id: TypeId, name: &str) {
        if let Some((existing_tid, _)) = ext_names
            .iter()
            .find(|(tid, n)| **tid != type_id && n.as_str() == name)
        {
            panic!(
                "ExtKey name {name:?} is already registered to a different type \
                 ({existing_tid:?}); each extension type needs a unique key name. \
                 If renaming is impractical, use ExtKey::from_type_name() so the \
                 name embeds the fully-qualified Rust type name."
            );
        }
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
    /// use elevator_core::components::{Position, Rider};
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
    /// sim.spawn_rider(StopId(0), StopId(1), 75.0).unwrap();
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
    /// ```no_run
    /// # use elevator_core::prelude::*;
    /// # use serde::{Serialize, Deserialize};
    /// # #[derive(Clone, Serialize, Deserialize)] struct VipTag { level: u32 }
    /// # fn run(world: &mut World) {
    /// world.query_ext_mut::<VipTag>().for_each_mut(|id, tag| {
    ///     tag.level += 1;
    /// });
    /// # }
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

/// The up/down hall call pair at a single stop.
///
/// At most two calls coexist at a stop (one per [`CallDirection`]);
/// this struct owns the slots. Stored in `World::hall_calls` keyed by
/// the stop's entity id.
#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct StopCalls {
    /// Pending upward call, if the up button is pressed.
    pub up: Option<HallCall>,
    /// Pending downward call, if the down button is pressed.
    pub down: Option<HallCall>,
}

impl StopCalls {
    /// Borrow the call for a specific direction.
    #[must_use]
    pub const fn get(&self, direction: CallDirection) -> Option<&HallCall> {
        match direction {
            CallDirection::Up => self.up.as_ref(),
            CallDirection::Down => self.down.as_ref(),
        }
    }

    /// Mutable borrow of the call for a direction.
    pub const fn get_mut(&mut self, direction: CallDirection) -> Option<&mut HallCall> {
        match direction {
            CallDirection::Up => self.up.as_mut(),
            CallDirection::Down => self.down.as_mut(),
        }
    }

    /// Iterate both calls in (Up, Down) order, skipping empty slots.
    pub fn iter(&self) -> impl Iterator<Item = &HallCall> {
        self.up.iter().chain(self.down.iter())
    }

    /// Mutable iteration over both calls.
    pub fn iter_mut(&mut self) -> impl Iterator<Item = &mut HallCall> {
        self.up.iter_mut().chain(self.down.iter_mut())
    }
}
