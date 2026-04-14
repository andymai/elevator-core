//! Top-level simulation runner and tick loop.

mod construction;
mod lifecycle;
mod topology;

use crate::components::{
    AccessControl, FloorPosition, Orientation, Patience, Preferences, Rider, RiderPhase, Route,
};
use crate::dispatch::{BuiltinReposition, DispatchStrategy, ElevatorGroup, RepositionStrategy};
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
/// let mut sim = SimulationBuilder::demo().build().unwrap();
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

    // ── Destination queue (imperative dispatch) ────────────────────

    /// Read-only view of an elevator's destination queue (FIFO of target
    /// stop `EntityId`s).
    ///
    /// Returns `None` if `elev` is not an elevator entity. Returns
    /// `Some(&[])` for elevators with an empty queue.
    #[must_use]
    pub fn destination_queue(&self, elev: EntityId) -> Option<&[EntityId]> {
        self.world
            .destination_queue(elev)
            .map(crate::components::DestinationQueue::queue)
    }

    /// Push a stop onto the back of an elevator's destination queue.
    ///
    /// Adjacent duplicates are suppressed: if the last entry already equals
    /// `stop`, the queue is unchanged and no event is emitted.
    /// Otherwise emits [`Event::DestinationQueued`].
    ///
    /// # Errors
    ///
    /// - [`SimError::InvalidState`] if `elev` is not an elevator.
    /// - [`SimError::InvalidState`] if `stop` is not a stop.
    pub fn push_destination(&mut self, elev: EntityId, stop: EntityId) -> Result<(), SimError> {
        self.validate_push_targets(elev, stop)?;
        let appended = self
            .world
            .destination_queue_mut(elev)
            .is_some_and(|q| q.push_back(stop));
        if appended {
            self.events.emit(Event::DestinationQueued {
                elevator: elev,
                stop,
                tick: self.tick,
            });
        }
        Ok(())
    }

    /// Insert a stop at the front of an elevator's destination queue —
    /// "go here next, before anything else in the queue".
    ///
    /// On the next `AdvanceQueue` phase (between Dispatch and Movement),
    /// the elevator redirects to this new front if it differs from the
    /// current target.
    ///
    /// Adjacent duplicates are suppressed: if the first entry already equals
    /// `stop`, the queue is unchanged and no event is emitted.
    ///
    /// # Errors
    ///
    /// - [`SimError::InvalidState`] if `elev` is not an elevator.
    /// - [`SimError::InvalidState`] if `stop` is not a stop.
    pub fn push_destination_front(
        &mut self,
        elev: EntityId,
        stop: EntityId,
    ) -> Result<(), SimError> {
        self.validate_push_targets(elev, stop)?;
        let inserted = self
            .world
            .destination_queue_mut(elev)
            .is_some_and(|q| q.push_front(stop));
        if inserted {
            self.events.emit(Event::DestinationQueued {
                elevator: elev,
                stop,
                tick: self.tick,
            });
        }
        Ok(())
    }

    /// Clear an elevator's destination queue.
    ///
    /// TODO: clearing does not currently abort an in-flight movement — the
    /// elevator will finish its current leg and then go idle (since the
    /// queue is empty). A future change can add a phase transition to
    /// cancel mid-flight.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::InvalidState`] if `elev` is not an elevator.
    pub fn clear_destinations(&mut self, elev: EntityId) -> Result<(), SimError> {
        if self.world.elevator(elev).is_none() {
            return Err(SimError::InvalidState {
                entity: elev,
                reason: "not an elevator".into(),
            });
        }
        if let Some(q) = self.world.destination_queue_mut(elev) {
            q.clear();
        }
        Ok(())
    }

    /// Validate that `elev` is an elevator and `stop` is a stop.
    fn validate_push_targets(&self, elev: EntityId, stop: EntityId) -> Result<(), SimError> {
        if self.world.elevator(elev).is_none() {
            return Err(SimError::InvalidState {
                entity: elev,
                reason: "not an elevator".into(),
            });
        }
        if self.world.stop(stop).is_none() {
            return Err(SimError::InvalidState {
                entity: stop,
                reason: "not a stop".into(),
            });
        }
        Ok(())
    }

    // Dispatch & reposition management live in `sim/construction.rs`.

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
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
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
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
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
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
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
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
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
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
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

    /// Run only the advance-queue phase (with hooks).
    ///
    /// Reconciles each elevator's phase/target with the front of its
    /// [`DestinationQueue`](crate::components::DestinationQueue). Runs
    /// between Reposition and Movement.
    pub fn run_advance_queue(&mut self) {
        self.hooks.run_before(Phase::AdvanceQueue, &mut self.world);
        for group in &self.groups {
            self.hooks
                .run_before_group(Phase::AdvanceQueue, group.id(), &mut self.world);
        }
        let ctx = self.phase_context();
        self.world.elevator_ids_into(&mut self.elevator_ids_buf);
        crate::systems::advance_queue::run(
            &mut self.world,
            &mut self.events,
            &ctx,
            &self.elevator_ids_buf,
        );
        for group in &self.groups {
            self.hooks
                .run_after_group(Phase::AdvanceQueue, group.id(), &mut self.world);
        }
        self.hooks.run_after(Phase::AdvanceQueue, &mut self.world);
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

    // Phase-hook registration lives in `sim/construction.rs`.

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
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
    /// sim.step();
    /// assert_eq!(sim.current_tick(), 1);
    /// ```
    pub fn step(&mut self) {
        self.run_advance_transient();
        self.run_dispatch();
        self.run_reposition();
        self.run_advance_queue();
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
