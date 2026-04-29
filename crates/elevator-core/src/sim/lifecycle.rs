//! Rider lifecycle, population queries, and entity state control.
//!
//! Covers reroute/settle/despawn/disable/enable, population queries,
//! per-entity metrics, service mode, and route invalidation. Split out
//! from `sim.rs` to keep each concern readable.

use std::collections::HashSet;

use crate::components::{
    CallDirection, Elevator, ElevatorPhase, RiderPhase, RiderPhaseKind, Route, TransportMode,
};
use crate::dispatch::ElevatorGroup;
use crate::entity::{ElevatorId, EntityId, RiderId};
use crate::error::SimError;
use crate::events::Event;
use crate::ids::GroupId;

use super::Simulation;

impl Simulation {
    // ── Extension restore ────────────────────────────────────────────

    /// Deserialize extension components from a snapshot.
    ///
    /// Call this after restoring from a snapshot and registering all
    /// extension types via `world.register_ext::<T>(key)`.
    ///
    /// Returns the names of any extension types present in the snapshot
    /// that were not registered. An empty vec means all extensions were
    /// deserialized successfully.
    ///
    /// Prefer [`load_extensions_with`](Self::load_extensions_with) which
    /// combines registration and loading in one call.
    #[must_use]
    pub fn load_extensions(&mut self) -> Vec<String> {
        let Some(pending) = self
            .world
            .remove_resource::<crate::snapshot::PendingExtensions>()
        else {
            return Vec::new();
        };
        let unregistered = self.world.unregistered_ext_names(pending.0.keys());
        self.world.deserialize_extensions(&pending.0);
        unregistered
    }

    /// Register extension types and load their data from a snapshot
    /// in one step.
    ///
    /// This is the recommended way to restore extensions. It replaces the
    /// manual 3-step ceremony of `register_ext` → `load_extensions`:
    ///
    /// ```no_run
    /// # use elevator_core::prelude::*;
    /// # use elevator_core::register_extensions;
    /// # use elevator_core::snapshot::WorldSnapshot;
    /// # use serde::{Serialize, Deserialize};
    /// # #[derive(Clone, Serialize, Deserialize)] struct VipTag;
    /// # #[derive(Clone, Serialize, Deserialize)] struct TeamId;
    /// # fn before(snapshot: WorldSnapshot) -> Result<(), SimError> {
    /// // Before (3-step ceremony):
    /// let mut sim = snapshot.restore(None)?;
    /// sim.world_mut().register_ext::<VipTag>(ExtKey::from_type_name());
    /// sim.world_mut().register_ext::<TeamId>(ExtKey::from_type_name());
    /// sim.load_extensions();
    /// # Ok(()) }
    /// # fn after(snapshot: WorldSnapshot) -> Result<(), SimError> {
    ///
    /// // After:
    /// let mut sim = snapshot.restore(None)?;
    /// let unregistered = sim.load_extensions_with(|world| {
    ///     register_extensions!(world, VipTag, TeamId);
    /// });
    /// assert!(unregistered.is_empty(), "missing: {unregistered:?}");
    /// # Ok(()) }
    /// ```
    ///
    /// Returns the names of any extension types in the snapshot that were
    /// not registered. This catches "forgot to register" bugs at load time.
    #[must_use]
    pub fn load_extensions_with<F>(&mut self, register: F) -> Vec<String>
    where
        F: FnOnce(&mut crate::world::World),
    {
        register(&mut self.world);
        self.load_extensions()
    }

    // ── Helpers ──────────────────────────────────────────────────────

    /// Extract the `GroupId` from the current leg of a route.
    ///
    /// For Walk legs, looks ahead to the next leg to find the group.
    /// Falls back to `GroupId(0)` when no route exists or no group leg is found.
    pub(super) fn group_from_route(&self, route: Option<&Route>) -> GroupId {
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
    /// Returns [`SimError::WrongRiderPhase`] if the rider is not in
    /// [`RiderPhase::Waiting`], or [`SimError::RiderHasNoStop`] if the
    /// rider has no current stop.
    pub fn reroute(&mut self, rider: RiderId, new_destination: EntityId) -> Result<(), SimError> {
        let rider = rider.entity();
        let r = self
            .world
            .rider(rider)
            .ok_or(SimError::EntityNotFound(rider))?;

        if r.phase != RiderPhase::Waiting {
            return Err(SimError::WrongRiderPhase {
                rider,
                expected: RiderPhaseKind::Waiting,
                actual: r.phase.kind(),
            });
        }

        let origin = r.current_stop.ok_or(SimError::RiderHasNoStop(rider))?;

        let group = self.group_from_route(self.world.route(rider));
        self.world
            .set_route(rider, Route::direct(origin, new_destination, group));

        let tag = self
            .world
            .rider(rider)
            .map_or(0, crate::components::Rider::tag);
        self.events.emit(Event::RiderRerouted {
            rider,
            new_destination,
            tag,
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
    /// Returns [`SimError::WrongRiderPhase`] if the rider is not in
    /// `Arrived` or `Abandoned` phase, or [`SimError::RiderHasNoStop`]
    /// if the rider has no current stop.
    pub fn settle_rider(&mut self, id: RiderId) -> Result<(), SimError> {
        let id = id.entity();
        let rider = self.world.rider(id).ok_or(SimError::EntityNotFound(id))?;

        let old_phase = rider.phase;
        match old_phase {
            RiderPhase::Arrived | RiderPhase::Abandoned => {}
            _ => {
                return Err(SimError::WrongRiderPhase {
                    rider: id,
                    expected: RiderPhaseKind::Arrived,
                    actual: old_phase.kind(),
                });
            }
        }

        let stop = rider.current_stop.ok_or(SimError::RiderHasNoStop(id))?;

        // Update index: remove from old partition (only Abandoned is indexed).
        if old_phase == RiderPhase::Abandoned {
            self.rider_index.remove_abandoned(stop, id);
        }
        self.rider_index.insert_resident(stop, id);

        if let Some(r) = self.world.rider_mut(id) {
            r.phase = RiderPhase::Resident;
        }

        self.metrics.record_settle();
        let tag = self
            .world
            .rider(id)
            .map_or(0, crate::components::Rider::tag);
        self.events.emit(Event::RiderSettled {
            rider: id,
            stop,
            tag,
            tick: self.tick,
        });
        Ok(())
    }

    /// Give a `Resident` rider a new route, transitioning them to `Waiting`.
    ///
    /// The rider begins waiting at their current stop for an elevator
    /// matching the route's transport mode. If the rider has a
    /// [`Patience`](crate::components::Patience) component, its
    /// `waited_ticks` is reset to zero.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::EntityNotFound`] if `id` does not exist.
    /// Returns [`SimError::WrongRiderPhase`] if the rider is not in `Resident`
    /// phase, [`SimError::EmptyRoute`] if the route has no legs, or
    /// [`SimError::RouteOriginMismatch`] if the route's first leg origin does
    /// not match the rider's current stop.
    pub fn reroute_rider(&mut self, id: EntityId, route: Route) -> Result<(), SimError> {
        let rider = self.world.rider(id).ok_or(SimError::EntityNotFound(id))?;

        if rider.phase != RiderPhase::Resident {
            return Err(SimError::WrongRiderPhase {
                rider: id,
                expected: RiderPhaseKind::Resident,
                actual: rider.phase.kind(),
            });
        }

        let stop = rider.current_stop.ok_or(SimError::RiderHasNoStop(id))?;

        let new_destination = route.final_destination().ok_or(SimError::EmptyRoute)?;

        // Validate that the route departs from the rider's current stop.
        if let Some(leg) = route.current()
            && leg.from != stop
        {
            return Err(SimError::RouteOriginMismatch {
                expected_origin: stop,
                route_origin: leg.from,
            });
        }

        self.rider_index.remove_resident(stop, id);
        self.rider_index.insert_waiting(stop, id);

        if let Some(r) = self.world.rider_mut(id) {
            r.phase = RiderPhase::Waiting;
            // Reset spawn_tick so manifest wait_ticks measures time since
            // reroute, not time since the original spawn as a Resident.
            r.spawn_tick = self.tick;
        }
        self.world.set_route(id, route);

        // Reset patience if present.
        if let Some(p) = self.world.patience_mut(id) {
            p.waited_ticks = 0;
        }

        // A rerouted resident is indistinguishable from a fresh arrival —
        // record it so predictive parking and `arrivals_at` see the demand.
        // Mirror into the destination log so down-peak classification stays
        // coherent for multi-leg riders.
        if let Some(log) = self.world.resource_mut::<crate::arrival_log::ArrivalLog>() {
            log.record(self.tick, stop);
        }
        if let Some(log) = self
            .world
            .resource_mut::<crate::arrival_log::DestinationLog>()
        {
            log.record(self.tick, new_destination);
        }

        self.metrics.record_reroute();
        let tag = self
            .world
            .rider(id)
            .map_or(0, crate::components::Rider::tag);
        self.events.emit(Event::RiderRerouted {
            rider: id,
            new_destination,
            tag,
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
    pub fn despawn_rider(&mut self, id: RiderId) -> Result<(), SimError> {
        let id = id.entity();
        let rider = self.world.rider(id).ok_or(SimError::EntityNotFound(id))?;
        let tag = rider.tag();

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

        // Purge stale `pending_riders` entries before the entity slot
        // is reused. `world.despawn` cleans ext storage keyed on this
        // rider (e.g. `AssignedCar`) but not back-references living on
        // stop/car entities.
        self.world.scrub_rider_from_pending_calls(id);

        self.world.despawn(id);

        self.events.emit(Event::RiderDespawned {
            rider: id,
            tag,
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

    /// Partition waiting riders at `stop` by their route direction.
    ///
    /// Returns `(up, down)` where `up` counts riders whose current route
    /// destination lies above `stop` (they want to go up) and `down` counts
    /// riders whose destination lies below. Riders without a [`Route`] or
    /// whose current leg has no destination are excluded from both counts —
    /// they have no intrinsic direction. The sum `up + down` may therefore
    /// be less than [`waiting_count_at`](Self::waiting_count_at).
    ///
    /// Runs in `O(waiting riders at stop)`. Designed for per-frame rendering
    /// code that wants to show up/down queues separately; dispatch strategies
    /// should read [`HallCall`](crate::components::HallCall)s instead.
    #[must_use]
    pub fn waiting_direction_counts_at(&self, stop: EntityId) -> (usize, usize) {
        let Some(origin_pos) = self.world.stop(stop).map(crate::components::Stop::position) else {
            return (0, 0);
        };
        let mut up = 0usize;
        let mut down = 0usize;
        for rider in self.rider_index.waiting_at(stop) {
            let Some(route) = self.world.route(*rider) else {
                continue;
            };
            let Some(dest_entity) = route.current_destination() else {
                continue;
            };
            let Some(dest_pos) = self
                .world
                .stop(dest_entity)
                .map(crate::components::Stop::position)
            else {
                continue;
            };
            match CallDirection::between(origin_pos, dest_pos) {
                Some(CallDirection::Up) => up += 1,
                Some(CallDirection::Down) => down += 1,
                None => {}
            }
        }
        (up, down)
    }

    /// Partition waiting riders at `stop` by the line that will serve
    /// their current route leg. Each entry is `(line_entity, count)`.
    ///
    /// Attribution rules:
    /// - `TransportMode::Line(l)` riders are attributed to `l` exactly.
    /// - `TransportMode::Group(g)` riders are attributed to the first
    ///   line in group `g` whose `serves` list contains `stop`. Groups
    ///   with a single line (the common case) attribute unambiguously.
    /// - `TransportMode::Walk` riders and route-less / same-position
    ///   riders are excluded — they have no intrinsic line to summon.
    ///
    /// Runs in `O(waiting riders at stop · lines in their group)`.
    /// Intended for per-frame rendering code that needs to split the
    /// waiting queue across multi-line stops (e.g. a sky-lobby shared
    /// by low-bank, express, and service lines).
    #[must_use]
    pub fn waiting_counts_by_line_at(&self, stop: EntityId) -> Vec<(EntityId, u32)> {
        use std::collections::BTreeMap;
        let mut by_line: BTreeMap<EntityId, u32> = BTreeMap::new();
        for &rider in self.rider_index.waiting_at(stop) {
            let Some(line) = self.resolve_line_for_waiting(rider, stop) else {
                continue;
            };
            *by_line.entry(line).or_insert(0) += 1;
        }
        by_line.into_iter().collect()
    }

    /// Resolve the line entity that should "claim" `rider` for their
    /// current leg starting at `stop`. Used by
    /// [`waiting_counts_by_line_at`](Self::waiting_counts_by_line_at).
    fn resolve_line_for_waiting(&self, rider: EntityId, stop: EntityId) -> Option<EntityId> {
        let leg = self.world.route(rider).and_then(Route::current)?;
        match leg.via {
            TransportMode::Line(l) => Some(l),
            TransportMode::Group(g) => self.groups.iter().find(|gr| gr.id() == g).and_then(|gr| {
                gr.lines()
                    .iter()
                    .find(|li| li.serves().contains(&stop))
                    .map(crate::dispatch::LineInfo::entity)
            }),
            TransportMode::Walk => None,
        }
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
    /// If the entity is a stop, any `Resident` riders parked there are
    /// transitioned to `Abandoned` and appropriate events are emitted.
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

            // Drop any sticky DCS assignments pointing at this car so
            // routed riders are not stranded behind a dead reference.
            crate::dispatch::destination::clear_assignments_to(&mut self.world, id);
            // Same for hall-call assignments — pre-fix, a pinned hall
            // call to the disabled car was permanently stranded because
            // dispatch kept committing the disabled car as the assignee
            // and other cars couldn't take the call. (#292) Now that
            // assignments are per-line, drop only the line entries that
            // reference the disabled car; other lines at the same stop
            // keep their cars. The pin is lifted only when *every*
            // remaining entry has been cleared, since a pin protects the
            // whole call, not a single line's assignment.
            for hc in self.world.iter_hall_calls_mut() {
                hc.assigned_cars_by_line.retain(|_, car| *car != id);
                if hc.assigned_cars_by_line.is_empty() {
                    hc.pinned = false;
                }
            }

            for rid in &rider_ids {
                let tag = self
                    .world
                    .rider(*rid)
                    .map_or(0, crate::components::Rider::tag);
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
                        tag,
                        tick: self.tick,
                    });
                }
            }

            let had_load = self
                .world
                .elevator(id)
                .is_some_and(|c| c.current_load.value() > 0.0);
            let capacity = self.world.elevator(id).map(|c| c.weight_capacity.value());
            if let Some(car) = self.world.elevator_mut(id) {
                car.riders.clear();
                car.current_load = crate::components::Weight::ZERO;
                car.phase = ElevatorPhase::Idle;
                car.target_stop = None;
            }
            // Wipe any pressed floor buttons. On re-enable they'd
            // otherwise resurface as active demand with stale press
            // ticks, and dispatch would plan against a rider set that
            // no longer exists.
            if let Some(calls) = self.world.car_calls_mut(id) {
                calls.clear();
            }
            // Tell the group's dispatcher the car left. SCAN/LOOK
            // keep per-car direction state across ticks; without this
            // a disabled-then-enabled car would re-enter service with
            // whatever sweep direction it had before, potentially
            // colliding with the new sweep state. Mirrors the
            // `remove_elevator` / `reassign_elevator_to_line` paths in
            // `topology.rs`, which already do this.
            let group_id = self
                .groups
                .iter()
                .find(|g| g.elevator_entities().contains(&id))
                .map(ElevatorGroup::id);
            if let Some(gid) = group_id
                && let Some(dispatcher) = self.dispatchers.get_mut(&gid)
            {
                dispatcher.notify_removed(id);
            }
            if had_load && let Some(cap) = capacity {
                self.events.emit(Event::CapacityChanged {
                    elevator: id,
                    current_load: ordered_float::OrderedFloat(0.0),
                    capacity: ordered_float::OrderedFloat(cap),
                    tick: self.tick,
                });
            }
        }
        if let Some(vel) = self.world.velocity_mut(id) {
            vel.value = 0.0;
        }

        // If this is a stop, scrub it from elevator targets/queues,
        // abandon resident riders, and invalidate routes.
        if self.world.stop(id).is_some() {
            self.disable_stop_inner(id, false);
        }

        self.world.disable(id);
        self.events.emit(Event::EntityDisabled {
            entity: id,
            tick: self.tick,
        });
        Ok(())
    }

    /// Stop-specific disable work shared by [`Self::disable`] and
    /// [`Self::remove_stop`]. `removed` flips the route-invalidation
    /// reason to [`RouteInvalidReason::StopRemoved`](crate::events::RouteInvalidReason::StopRemoved).
    pub(super) fn disable_stop_inner(&mut self, id: EntityId, removed: bool) {
        self.scrub_stop_from_elevators(id);
        let resident_ids: Vec<EntityId> =
            self.rider_index.residents_at(id).iter().copied().collect();
        for rid in resident_ids {
            self.rider_index.remove_resident(id, rid);
            self.rider_index.insert_abandoned(id, rid);
            let tag = self
                .world
                .rider(rid)
                .map_or(0, crate::components::Rider::tag);
            if let Some(r) = self.world.rider_mut(rid) {
                r.phase = RiderPhase::Abandoned;
            }
            self.events.emit(Event::RiderAbandoned {
                rider: rid,
                stop: id,
                tag,
                tick: self.tick,
            });
        }
        self.invalidate_routes_for_stop(id, removed);
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
    /// Reroutes Waiting and in-car riders to the nearest enabled
    /// alternative stop in the same group. If no alternative exists, a
    /// Waiting rider is abandoned in place; an in-car rider is ejected at
    /// the car's nearest enabled stop (mirrors elevator-disable behavior
    /// at `lifecycle.rs:583-598`).
    ///
    /// `removed` distinguishes a permanent removal (`StopRemoved`) from a
    /// transient disable (`StopDisabled`) for emitted events.
    fn invalidate_routes_for_stop(&mut self, disabled_stop: EntityId, removed: bool) {
        use crate::events::RouteInvalidReason;

        let reroute_reason = if removed {
            RouteInvalidReason::StopRemoved
        } else {
            RouteInvalidReason::StopDisabled
        };

        let group_stops: Vec<EntityId> = self
            .groups
            .iter()
            .filter(|g| g.stop_entities().contains(&disabled_stop))
            .flat_map(|g| g.stop_entities().iter().copied())
            .filter(|&s| s != disabled_stop && !self.world.is_disabled(s))
            .collect();

        for rid in self.world.rider_ids() {
            self.invalidate_route_for_rider(rid, disabled_stop, &group_stops, reroute_reason);
        }
    }

    /// Per-rider invalidation: reroute, eject, or abandon depending on
    /// the rider's phase and the availability of alternatives.
    fn invalidate_route_for_rider(
        &mut self,
        rid: EntityId,
        disabled_stop: EntityId,
        group_stops: &[EntityId],
        reroute_reason: crate::events::RouteInvalidReason,
    ) {
        let Some(phase) = self.world.rider(rid).map(|r| r.phase) else {
            return;
        };
        let is_waiting = phase == RiderPhase::Waiting;
        let aboard_car = match phase {
            RiderPhase::Boarding(c) | RiderPhase::Riding(c) | RiderPhase::Exiting(c) => Some(c),
            _ => None,
        };
        if !is_waiting && aboard_car.is_none() {
            return;
        }

        let references_stop = self.world.route(rid).is_some_and(|route| {
            route
                .legs
                .iter()
                .skip(route.current_leg)
                .any(|leg| leg.to == disabled_stop || leg.from == disabled_stop)
        });
        if !references_stop {
            return;
        }

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
            .min_by(|a, b| a.1.total_cmp(&b.1).then_with(|| a.0.cmp(&b.0)))
            .map(|(s, _)| s);

        if let Some(alt_stop) = alternative {
            self.reroute_to_alternative(rid, disabled_stop, alt_stop, aboard_car, reroute_reason);
        } else if let Some(car_eid) = aboard_car {
            self.eject_or_abandon_in_car_rider(rid, car_eid, disabled_stop, reroute_reason);
        } else {
            self.abandon_waiting_rider(rid, disabled_stop, rider_current_stop, reroute_reason);
        }
    }

    /// Rewrite the rider's route to point at `alt_stop` and (if aboard a
    /// car) re-prime the car's `target_stop` so it resumes movement.
    fn reroute_to_alternative(
        &mut self,
        rid: EntityId,
        disabled_stop: EntityId,
        alt_stop: EntityId,
        aboard_car: Option<EntityId>,
        reroute_reason: crate::events::RouteInvalidReason,
    ) {
        let rider_current_stop = self.world.rider(rid).and_then(|r| r.current_stop);
        let origin = rider_current_stop.unwrap_or(alt_stop);
        let group = self.group_from_route(self.world.route(rid));
        self.world
            .set_route(rid, Route::direct(origin, alt_stop, group));
        let tag = self
            .world
            .rider(rid)
            .map_or(0, crate::components::Rider::tag);
        self.events.emit(Event::RouteInvalidated {
            rider: rid,
            affected_stop: disabled_stop,
            reason: reroute_reason,
            tag,
            tick: self.tick,
        });
        // For in-car riders, the car's target_stop was just nulled by
        // `scrub_stop_from_elevators`. Re-point it at the new destination
        // so the car resumes movement on the next tick; dispatch picks
        // it up via `riding_to_stop` regardless, but setting target_stop
        // avoids one tick of idle drift. Phase is left untouched — a
        // car mid-travel keeps `MovingToStop` and decelerates naturally.
        if let Some(car_eid) = aboard_car
            && let Some(car) = self.world.elevator_mut(car_eid)
            && car.target_stop.is_none()
        {
            car.target_stop = Some(alt_stop);
        }
    }

    /// Handle an in-car rider when no alternative destination exists:
    /// eject at the car's nearest enabled stop, or abandon if no stops
    /// remain anywhere. The reroute reason is forwarded so consumers
    /// can distinguish a permanent removal from a transient disable.
    fn eject_or_abandon_in_car_rider(
        &mut self,
        rid: EntityId,
        car_eid: EntityId,
        disabled_stop: EntityId,
        reroute_reason: crate::events::RouteInvalidReason,
    ) {
        let car_pos = self.world.position(car_eid).map_or(0.0, |p| p.value);
        let eject_stop = self
            .world
            .iter_stops()
            .filter(|(eid, _)| *eid != disabled_stop && !self.world.is_disabled(*eid))
            .map(|(eid, stop)| (eid, (stop.position - car_pos).abs()))
            .min_by(|a, b| a.1.total_cmp(&b.1).then_with(|| a.0.cmp(&b.0)))
            .map(|(eid, _)| eid);

        let tag = self
            .world
            .rider(rid)
            .map_or(0, crate::components::Rider::tag);
        self.events.emit(Event::RouteInvalidated {
            rider: rid,
            affected_stop: disabled_stop,
            reason: reroute_reason,
            tag,
            tick: self.tick,
        });

        let rider_weight = self
            .world
            .rider(rid)
            .map_or(crate::components::Weight::ZERO, |r| r.weight);

        if let Some(stop) = eject_stop {
            if let Some(r) = self.world.rider_mut(rid) {
                r.phase = RiderPhase::Waiting;
                r.current_stop = Some(stop);
                r.board_tick = None;
            }
            if let Some(car) = self.world.elevator_mut(car_eid) {
                car.riders.retain(|r| *r != rid);
                car.current_load -= rider_weight;
            }
            // Replace the now-stale Route (still references the removed
            // stop) with a self-loop at the eject stop. Dispatch sees a
            // rider whose destination is its current location and
            // ignores them; consumers observe `RiderEjected` and
            // decide what to do next (game-side respawn, refund, etc.).
            let group = self.group_from_route(self.world.route(rid));
            self.world.set_route(rid, Route::direct(stop, stop, group));
            self.rider_index.insert_waiting(stop, rid);
            self.emit_capacity_changed(car_eid);
            self.events.emit(Event::RiderEjected {
                rider: rid,
                elevator: car_eid,
                stop,
                tag,
                tick: self.tick,
            });
        } else {
            if let Some(r) = self.world.rider_mut(rid) {
                r.phase = RiderPhase::Abandoned;
            }
            if let Some(car) = self.world.elevator_mut(car_eid) {
                car.riders.retain(|r| *r != rid);
                car.current_load -= rider_weight;
            }
            self.world.scrub_rider_from_pending_calls(rid);
            self.emit_capacity_changed(car_eid);
            self.events.emit(Event::RiderAbandoned {
                rider: rid,
                stop: disabled_stop,
                tag,
                tick: self.tick,
            });
        }
    }

    /// Emit a `CapacityChanged` event reflecting the car's current load
    /// after a passenger removal. Mirrors the pattern at
    /// `loading.rs:364-371`.
    fn emit_capacity_changed(&mut self, car_eid: EntityId) {
        use ordered_float::OrderedFloat;
        if let Some(car) = self.world.elevator(car_eid) {
            self.events.emit(Event::CapacityChanged {
                elevator: car_eid,
                current_load: OrderedFloat(car.current_load.value()),
                capacity: OrderedFloat(car.weight_capacity.value()),
                tick: self.tick,
            });
        }
    }

    /// Abandon a Waiting rider in place when no alternative stop exists
    /// in their group. The reroute reason is forwarded so consumers can
    /// distinguish a permanent removal (`StopRemoved`) from a transient
    /// disable (`StopDisabled`); the supplementary "no alternative was
    /// found" signal is implicit in the `RiderAbandoned` event that
    /// fires alongside this one.
    fn abandon_waiting_rider(
        &mut self,
        rid: EntityId,
        disabled_stop: EntityId,
        rider_current_stop: Option<EntityId>,
        reroute_reason: crate::events::RouteInvalidReason,
    ) {
        let abandon_stop = rider_current_stop.unwrap_or(disabled_stop);
        let tag = self
            .world
            .rider(rid)
            .map_or(0, crate::components::Rider::tag);
        self.events.emit(Event::RouteInvalidated {
            rider: rid,
            affected_stop: disabled_stop,
            reason: reroute_reason,
            tag,
            tick: self.tick,
        });
        if let Some(r) = self.world.rider_mut(rid) {
            r.phase = RiderPhase::Abandoned;
        }
        // Fourth abandonment site (alongside the two in
        // `advance_transient`); same stale-ID hazard. Scrub the rider
        // from every hall/car-call pending list.
        self.world.scrub_rider_from_pending_calls(rid);
        if let Some(stop) = rider_current_stop {
            self.rider_index.remove_waiting(stop, rid);
            self.rider_index.insert_abandoned(stop, rid);
        }
        self.events.emit(Event::RiderAbandoned {
            rider: rid,
            stop: abandon_stop,
            tag,
            tick: self.tick,
        });
    }

    /// Remove a disabled stop from all elevator targets and queues.
    fn scrub_stop_from_elevators(&mut self, stop: EntityId) {
        let elevator_ids: Vec<EntityId> =
            self.world.iter_elevators().map(|(eid, _, _)| eid).collect();
        for eid in elevator_ids {
            if let Some(car) = self.world.elevator_mut(eid)
                && car.target_stop == Some(stop)
            {
                car.target_stop = None;
                car.phase = ElevatorPhase::Idle;
            }
            if let Some(q) = self.world.destination_queue_mut(eid) {
                q.retain(|s| s != stop);
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
    /// let sim = SimulationBuilder::demo().build().unwrap();
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
    /// let sim = SimulationBuilder::demo().build().unwrap();
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
    /// let sim = SimulationBuilder::demo().build().unwrap();
    /// let stop = sim.stop_entity(StopId(0)).unwrap();
    /// assert_eq!(sim.elevator_load(ElevatorId::from(stop)), None); // not an elevator
    /// ```
    #[must_use]
    pub fn elevator_load(&self, id: ElevatorId) -> Option<f64> {
        let id = id.entity();
        self.world.elevator(id).map(|e| e.current_load.value())
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

    /// Direction the elevator is currently signalling, derived from the
    /// indicator-lamp pair. Returns `None` if the entity is not an elevator.
    #[must_use]
    pub fn elevator_direction(&self, id: EntityId) -> Option<crate::components::Direction> {
        self.world.elevator(id).map(Elevator::direction)
    }

    /// Count of rounded-floor transitions for an elevator (passing-floor
    /// crossings plus arrivals). Returns `None` if the entity is not an
    /// elevator.
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
        Some(crate::movement::braking_distance(
            vel,
            car.deceleration.value(),
        ))
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
        let dist = crate::movement::braking_distance(vel, car.deceleration.value());
        Some(crate::fp::fma(vel.signum(), dist, pos))
    }

    /// Count of elevators currently in the given phase.
    ///
    /// Excludes disabled elevators (whose phase is reset to `Idle` on disable).
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let sim = SimulationBuilder::demo().build().unwrap();
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
        // Leaving Manual: clear the pending velocity command and zero
        // the velocity component. Otherwise a car moving at transition
        // time is stranded — the Normal movement system only runs for
        // MovingToStop/Repositioning phases, so velocity would linger
        // forever without producing any position change.
        if old == crate::components::ServiceMode::Manual {
            if let Some(car) = self.world.elevator_mut(elevator) {
                car.manual_target_velocity = None;
                car.door_command_queue.clear();
            }
            if let Some(v) = self.world.velocity_mut(elevator) {
                v.value = 0.0;
            }
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
}
