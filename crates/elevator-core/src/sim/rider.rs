//! Rider spawning, routing, and lifecycle management.
//!
//! Part of the [`super::Simulation`] API surface; extracted from the
//! monolithic `sim.rs` for readability. See the parent module for the
//! overarching essential-API summary.

use crate::components::{CallDirection, Rider, RiderPhase, Route, Weight};
use crate::dispatch::{ElevatorGroup, HallCallMode};
use crate::entity::{EntityId, RiderId};
use crate::error::SimError;
use crate::events::Event;
use crate::ids::GroupId;
use crate::stop::StopRef;

impl super::Simulation {
    // ── Rider spawning ───────────────────────────────────────────────

    /// Create a rider builder for fluent rider spawning.
    ///
    /// Accepts [`EntityId`] or [`StopId`](crate::stop::StopId) for origin and destination
    /// (anything that implements `Into<StopRef>`).
    ///
    /// # Errors
    ///
    /// Returns [`SimError::StopNotFound`] if a [`StopId`](crate::stop::StopId) does not exist
    /// in the building configuration.
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
    /// let rider = sim.build_rider(StopId(0), StopId(1))
    ///     .unwrap()
    ///     .weight(80.0)
    ///     .spawn()
    ///     .unwrap();
    /// ```
    pub fn build_rider(
        &mut self,
        origin: impl Into<StopRef>,
        destination: impl Into<StopRef>,
    ) -> Result<super::RiderBuilder<'_>, SimError> {
        let origin = self.resolve_stop(origin.into())?;
        let destination = self.resolve_stop(destination.into())?;
        Ok(super::RiderBuilder {
            sim: self,
            origin,
            destination,
            weight: Weight::from(75.0),
            group: None,
            route: None,
            patience: None,
            preferences: None,
            access_control: None,
        })
    }

    /// Spawn a rider with default preferences (convenience shorthand).
    ///
    /// Equivalent to `build_rider(origin, destination)?.weight(weight).spawn()`.
    /// Use [`build_rider`](Self::build_rider) instead when you need to set
    /// patience, preferences, access control, or an explicit route.
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
        origin: impl Into<StopRef>,
        destination: impl Into<StopRef>,
        weight: impl Into<Weight>,
    ) -> Result<RiderId, SimError> {
        let origin = self.resolve_stop(origin.into())?;
        let destination = self.resolve_stop(destination.into())?;
        // Same origin & destination = no hall call gets registered (the
        // direction is undefined), so the rider would sit Waiting forever
        // while inflating `total_spawned`. Reject up front. (#273)
        if origin == destination {
            return Err(SimError::InvalidConfig {
                field: "destination",
                reason: "origin and destination must differ; same-stop \
                         spawns deadlock with no hall call to summon a car"
                    .into(),
            });
        }
        let weight: Weight = weight.into();
        let group = self.auto_detect_group(origin, destination)?;

        let route = Route::direct(origin, destination, group);
        Ok(RiderId::from(self.spawn_rider_inner(
            origin,
            destination,
            weight,
            route,
        )))
    }

    /// Find the single group that serves both `origin` and `destination`.
    ///
    /// Returns `Ok(group)` when exactly one group serves both stops.
    /// Returns [`SimError::NoRoute`] when no group does.
    /// Returns [`SimError::AmbiguousRoute`] when more than one does.
    pub(super) fn auto_detect_group(
        &self,
        origin: EntityId,
        destination: EntityId,
    ) -> Result<GroupId, SimError> {
        let matching: Vec<GroupId> = self
            .groups
            .iter()
            .filter(|g| {
                g.stop_entities().contains(&origin) && g.stop_entities().contains(&destination)
            })
            .map(ElevatorGroup::id)
            .collect();

        match matching.len() {
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
                Err(SimError::NoRoute {
                    origin,
                    destination,
                    origin_groups,
                    destination_groups,
                })
            }
            1 => Ok(matching[0]),
            _ => Err(SimError::AmbiguousRoute {
                origin,
                destination,
                groups: matching,
            }),
        }
    }

    /// Internal helper: spawn a rider entity with the given route.
    pub(super) fn spawn_rider_inner(
        &mut self,
        origin: EntityId,
        destination: EntityId,
        weight: Weight,
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
                tag: 0,
            },
        );
        self.world.set_route(eid, route);
        self.rider_index.insert_waiting(origin, eid);
        if let Some(log) = self.world.resource_mut::<crate::arrival_log::ArrivalLog>() {
            log.record(self.tick, origin);
        }
        if let Some(log) = self
            .world
            .resource_mut::<crate::arrival_log::DestinationLog>()
        {
            log.record(self.tick, destination);
        }
        self.events.emit(Event::RiderSpawned {
            rider: eid,
            origin,
            destination,
            tag: 0,
            tick: self.tick,
        });

        // Auto-press the hall button for this rider. Direction is the
        // sign of `dest_pos - origin_pos`; if the two coincide (walk
        // leg, identity trip) no call is registered.
        if let (Some(op), Some(dp)) = (
            self.world.stop_position(origin),
            self.world.stop_position(destination),
        ) && let Some(direction) = CallDirection::between(op, dp)
        {
            self.register_hall_call_for_rider(origin, direction, eid, destination);
        }

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
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
    ///
    /// sim.spawn_rider(StopId(0), StopId(1), 70.0).unwrap();
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

    /// Push an event into the pending output buffer (crate-internal).
    pub(crate) fn push_event(&mut self, event: Event) {
        self.pending_output.push(event);
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
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
    /// sim.spawn_rider(StopId(0), StopId(1), 70.0).unwrap();
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

    // ── Rider tag (opaque consumer-attached id) ──────────────────────

    /// Read the opaque tag attached to a rider.
    ///
    /// Consumers use [`set_rider_tag`](Self::set_rider_tag) to stash an
    /// external identifier on the rider (a game-side sim id, a player
    /// id, a freight shipment id) and read it back here without keeping
    /// a parallel `RiderId → u64` map. The engine never interprets the
    /// value; it survives snapshot round-trip.
    ///
    /// Returns `0` for the default "untagged" state.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::EntityNotFound`] if `id` does not correspond
    /// to a live rider.
    pub fn rider_tag(&self, id: RiderId) -> Result<u64, SimError> {
        let eid = id.entity();
        self.world
            .rider(eid)
            .map(Rider::tag)
            .ok_or(SimError::EntityNotFound(eid))
    }

    /// Attach an opaque tag to a rider. The engine doesn't interpret the
    /// value — pick whatever encoding your consumer needs (e.g. a 32-bit
    /// external id zero-extended to `u64`, or two 32-bit half-words).
    /// Pass `0` to clear the tag (the reserved "untagged" sentinel).
    ///
    /// # Errors
    ///
    /// Returns [`SimError::EntityNotFound`] if `id` does not correspond
    /// to a live rider.
    pub fn set_rider_tag(&mut self, id: RiderId, tag: u64) -> Result<(), SimError> {
        let eid = id.entity();
        let rider = self
            .world
            .rider_mut(eid)
            .ok_or(SimError::EntityNotFound(eid))?;
        rider.tag = tag;
        Ok(())
    }

    /// Register (or aggregate) a hall call on behalf of a specific
    /// rider, including their destination in DCS mode.
    fn register_hall_call_for_rider(
        &mut self,
        stop: EntityId,
        direction: CallDirection,
        rider: EntityId,
        destination: EntityId,
    ) {
        let mode = self
            .groups
            .iter()
            .find(|g| g.stop_entities().contains(&stop))
            .map(ElevatorGroup::hall_call_mode);
        let dest = match mode {
            Some(HallCallMode::Destination) => Some(destination),
            _ => None,
        };
        self.ensure_hall_call(stop, direction, Some(rider), dest);
    }
}
