//! Top-level simulation runner and tick loop.
//!
//! # Essential API
//!
//! `Simulation` exposes a large surface, but most users only need the
//! ~15 methods below, grouped by the order they appear in a typical
//! game loop.
//!
//! ### Construction
//!
//! - [`SimulationBuilder::demo()`](crate::builder::SimulationBuilder::demo)
//!   or [`SimulationBuilder::from_config()`](crate::builder::SimulationBuilder::from_config)
//!   — fluent entry point; call [`.build()`](crate::builder::SimulationBuilder::build)
//!   to get a `Simulation`.
//! - [`Simulation::new()`](crate::sim::Simulation::new) — direct construction from
//!   `&SimConfig` + a dispatch strategy.
//!
//! ### Per-tick driving
//!
//! - [`Simulation::step()`](crate::sim::Simulation::step) — run all 8 phases.
//! - [`Simulation::current_tick()`](crate::sim::Simulation::current_tick) — the
//!   current tick counter.
//!
//! ### Spawning and rerouting riders
//!
//! - [`Simulation::spawn_rider_by_stop_id()`](crate::sim::Simulation::spawn_rider_by_stop_id)
//!   — simple origin/destination/weight spawn.
//! - [`Simulation::build_rider_by_stop_id()`](crate::sim::Simulation::build_rider_by_stop_id)
//!   — fluent [`RiderBuilder`](crate::sim::RiderBuilder) for patience, preferences, access
//!   control, explicit groups, multi-leg routes.
//! - [`Simulation::reroute()`](crate::sim::Simulation::reroute) — change a waiting
//!   rider's destination mid-trip.
//! - [`Simulation::settle_rider()`](crate::sim::Simulation::settle_rider) /
//!   [`Simulation::despawn_rider()`](crate::sim::Simulation::despawn_rider) —
//!   terminal-state cleanup for `Arrived`/`Abandoned` riders.
//!
//! ### Observability
//!
//! - [`Simulation::drain_events()`](crate::sim::Simulation::drain_events) — consume
//!   the event stream emitted by the last tick.
//! - [`Simulation::metrics()`](crate::sim::Simulation::metrics) — aggregate
//!   wait/ride/throughput stats.
//! - [`Simulation::waiting_at()`](crate::sim::Simulation::waiting_at) /
//!   [`Simulation::residents_at()`](crate::sim::Simulation::residents_at) — O(1)
//!   population queries by stop.
//!
//! ### Imperative control
//!
//! - [`Simulation::push_destination()`](crate::sim::Simulation::push_destination) /
//!   [`Simulation::push_destination_front()`](crate::sim::Simulation::push_destination_front) /
//!   [`Simulation::clear_destinations()`](crate::sim::Simulation::clear_destinations)
//!   — override dispatch by pushing/clearing stops on an elevator's
//!   [`DestinationQueue`](crate::components::DestinationQueue).
//!
//! ### Persistence
//!
//! - [`Simulation::snapshot()`](crate::sim::Simulation::snapshot) — capture full
//!   state as a serializable [`WorldSnapshot`](crate::snapshot::WorldSnapshot).
//! - [`WorldSnapshot::restore()`](crate::snapshot::WorldSnapshot::restore)
//!   — rebuild a `Simulation` from a snapshot.
//!
//! Everything else (phase-runners, world-level accessors, energy, tag
//! metrics, topology queries) is available for advanced use but is not
//! required for the common case.

mod construction;
mod lifecycle;
mod topology;

use crate::components::{
    AccessControl, Orientation, Patience, Preferences, Rider, RiderPhase, Route, SpatialPosition,
    Velocity,
};
use crate::dispatch::{BuiltinReposition, DispatchStrategy, ElevatorGroup, RepositionStrategy};
use crate::entity::EntityId;
use crate::error::{EtaError, SimError};
use crate::events::{Event, EventBus};
use crate::hooks::{Phase, PhaseHooks};
use crate::ids::GroupId;
use crate::metrics::Metrics;
use crate::rider_index::RiderIndex;
use crate::stop::{StopId, StopRef};
use crate::systems::PhaseContext;
use crate::time::TimeAdapter;
use crate::topology::TopologyGraph;
use crate::world::World;
use std::collections::{BTreeMap, HashMap, HashSet};
use std::fmt;
use std::sync::Mutex;
use std::time::Duration;

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
    pub position: Option<SpatialPosition>,
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
    //
    // Intentionally non-`const`: a `const` qualifier on a runtime accessor
    // signals "usable in const context", which these methods are not in
    // practice (the `World` is heap-allocated and mutated). Marking them
    // `const` misleads readers without unlocking any call sites.
    #[must_use]
    #[allow(clippy::missing_const_for_fn)]
    pub fn world(&self) -> &World {
        &self.world
    }

    /// Get a mutable reference to the world.
    ///
    /// Exposed for advanced use cases (manual rider management, custom
    /// component attachment). Prefer `spawn_rider` / `spawn_rider_by_stop_id`
    /// for standard operations.
    #[allow(clippy::missing_const_for_fn)]
    pub fn world_mut(&mut self) -> &mut World {
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

    /// Interpolated position between the previous and current tick.
    ///
    /// `alpha` is clamped to `[0.0, 1.0]`, where `0.0` returns the entity's
    /// position at the start of the last completed tick and `1.0` returns
    /// the current position. Intended for smooth rendering when a render
    /// frame falls between simulation ticks.
    ///
    /// Returns `None` if the entity has no position component. Returns the
    /// current position unchanged if no previous snapshot exists (i.e. before
    /// the first [`step`](Self::step)).
    ///
    /// [`step`]: Self::step
    #[must_use]
    pub fn position_at(&self, id: EntityId, alpha: f64) -> Option<f64> {
        let current = self.world.position(id)?.value;
        let alpha = if alpha.is_nan() {
            0.0
        } else {
            alpha.clamp(0.0, 1.0)
        };
        let prev = self.world.prev_position(id).map_or(current, |p| p.value);
        Some((current - prev).mul_add(alpha, prev))
    }

    /// Current velocity of an entity along the shaft axis (signed: +up, -down).
    ///
    /// Convenience wrapper over [`World::velocity`] that returns the raw
    /// `f64` value. Returns `None` if the entity has no velocity component.
    #[must_use]
    pub fn velocity(&self, id: EntityId) -> Option<f64> {
        self.world.velocity(id).map(Velocity::value)
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

    /// Mutable access to the group collection. Use this to flip a group
    /// into [`HallCallMode::Destination`](crate::dispatch::HallCallMode)
    /// or tune its `ack_latency_ticks` after construction. Changing the
    /// line/elevator structure here is not supported — use the dedicated
    /// topology mutators for that.
    pub fn groups_mut(&mut self) -> &mut [ElevatorGroup] {
        &mut self.groups
    }

    /// Resolve a config `StopId` to its runtime `EntityId`.
    #[must_use]
    pub fn stop_entity(&self, id: StopId) -> Option<EntityId> {
        self.stop_lookup.get(&id).copied()
    }

    /// Resolve a [`StopRef`] to its runtime [`EntityId`].
    fn resolve_stop(&self, stop: StopRef) -> Result<EntityId, SimError> {
        match stop {
            StopRef::ByEntity(id) => Ok(id),
            StopRef::ById(sid) => self.stop_entity(sid).ok_or(SimError::StopNotFound(sid)),
        }
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
    /// - [`SimError::NotAnElevator`] if `elev` is not an elevator.
    /// - [`SimError::NotAStop`] if `stop` is not a stop.
    pub fn push_destination(
        &mut self,
        elev: EntityId,
        stop: impl Into<StopRef>,
    ) -> Result<(), SimError> {
        let stop = self.resolve_stop(stop.into())?;
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
    /// - [`SimError::NotAnElevator`] if `elev` is not an elevator.
    /// - [`SimError::NotAStop`] if `stop` is not a stop.
    pub fn push_destination_front(
        &mut self,
        elev: EntityId,
        stop: impl Into<StopRef>,
    ) -> Result<(), SimError> {
        let stop = self.resolve_stop(stop.into())?;
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
    /// Returns [`SimError::NotAnElevator`] if `elev` is not an elevator.
    pub fn clear_destinations(&mut self, elev: EntityId) -> Result<(), SimError> {
        if self.world.elevator(elev).is_none() {
            return Err(SimError::NotAnElevator(elev));
        }
        if let Some(q) = self.world.destination_queue_mut(elev) {
            q.clear();
        }
        Ok(())
    }

    /// Validate that `elev` is an elevator and `stop` is a stop.
    fn validate_push_targets(&self, elev: EntityId, stop: EntityId) -> Result<(), SimError> {
        if self.world.elevator(elev).is_none() {
            return Err(SimError::NotAnElevator(elev));
        }
        if self.world.stop(stop).is_none() {
            return Err(SimError::NotAStop(stop));
        }
        Ok(())
    }

    // ── ETA queries ─────────────────────────────────────────────────

    /// Estimated time until `elev` arrives at `stop`, summing closed-form
    /// trapezoidal travel time for every leg up to (and including) the leg
    /// that ends at `stop`, plus the door dwell at every *intermediate* stop.
    ///
    /// "Arrival" is the moment the door cycle begins at `stop` — door time
    /// at `stop` itself is **not** added; door time at earlier stops along
    /// the route **is**.
    ///
    /// # Errors
    ///
    /// - [`EtaError::NotAnElevator`] if `elev` is not an elevator entity.
    /// - [`EtaError::NotAStop`] if `stop` is not a stop entity.
    /// - [`EtaError::ServiceModeExcluded`] if the elevator's
    ///   [`ServiceMode`](crate::components::ServiceMode) is dispatch-excluded
    ///   (`Manual` / `Independent`).
    /// - [`EtaError::StopNotQueued`] if `stop` is neither the elevator's
    ///   current movement target nor anywhere in its
    ///   [`destination_queue`](Self::destination_queue).
    /// - [`EtaError::StopVanished`] if a stop in the route lost its position
    ///   during calculation.
    ///
    /// The estimate is best-effort. It assumes the queue is served in order
    /// with no mid-trip insertions; dispatch decisions, manual door commands,
    /// and rider boarding/exiting beyond the configured dwell will perturb
    /// the actual arrival.
    pub fn eta(&self, elev: EntityId, stop: EntityId) -> Result<Duration, EtaError> {
        let elevator = self
            .world
            .elevator(elev)
            .ok_or(EtaError::NotAnElevator(elev))?;
        self.world.stop(stop).ok_or(EtaError::NotAStop(stop))?;
        let svc = self.world.service_mode(elev).copied().unwrap_or_default();
        if svc.is_dispatch_excluded() {
            return Err(EtaError::ServiceModeExcluded(elev));
        }

        // Build the route in service order: current target first (if any),
        // then queue entries, with adjacent duplicates collapsed.
        let mut route: Vec<EntityId> = Vec::new();
        if let Some(t) = elevator.phase().moving_target() {
            route.push(t);
        }
        if let Some(q) = self.world.destination_queue(elev) {
            for &s in q.queue() {
                if route.last() != Some(&s) {
                    route.push(s);
                }
            }
        }
        if !route.contains(&stop) {
            return Err(EtaError::StopNotQueued {
                elevator: elev,
                stop,
            });
        }

        let max_speed = elevator.max_speed();
        let accel = elevator.acceleration();
        let decel = elevator.deceleration();
        let door_cycle_ticks =
            u64::from(elevator.door_transition_ticks()) * 2 + u64::from(elevator.door_open_ticks());
        let door_cycle_secs = (door_cycle_ticks as f64) * self.dt;

        // Account for any in-progress door cycle before the first travel leg:
        // the elevator is parked at its current stop and won't move until the
        // door FSM returns to Closed.
        let mut total = match elevator.door() {
            crate::door::DoorState::Opening {
                ticks_remaining,
                open_duration,
                close_duration,
            } => f64::from(*ticks_remaining + *open_duration + *close_duration) * self.dt,
            crate::door::DoorState::Open {
                ticks_remaining,
                close_duration,
            } => f64::from(*ticks_remaining + *close_duration) * self.dt,
            crate::door::DoorState::Closing { ticks_remaining } => {
                f64::from(*ticks_remaining) * self.dt
            }
            crate::door::DoorState::Closed => 0.0,
        };

        let in_door_cycle = !matches!(elevator.door(), crate::door::DoorState::Closed);
        let mut pos = self
            .world
            .position(elev)
            .ok_or(EtaError::NotAnElevator(elev))?
            .value;
        let vel_signed = self.world.velocity(elev).map_or(0.0, Velocity::value);

        for (idx, &s) in route.iter().enumerate() {
            let s_pos = self
                .world
                .stop_position(s)
                .ok_or(EtaError::StopVanished(s))?;
            let dist = (s_pos - pos).abs();
            // Only the first leg can carry initial velocity, and only if
            // the car is already moving toward this stop and not stuck in
            // a door cycle (which forces it to stop first).
            let v0 = if idx == 0 && !in_door_cycle && vel_signed.abs() > f64::EPSILON {
                let dir = (s_pos - pos).signum();
                if dir * vel_signed > 0.0 {
                    vel_signed.abs()
                } else {
                    0.0
                }
            } else {
                0.0
            };
            total += crate::eta::travel_time(dist, v0, max_speed, accel, decel);
            if s == stop {
                return Ok(Duration::from_secs_f64(total.max(0.0)));
            }
            total += door_cycle_secs;
            pos = s_pos;
        }
        // `route.contains(&stop)` was true above, so the loop must hit `stop`.
        // Fall through as a defensive backstop.
        Err(EtaError::StopNotQueued {
            elevator: elev,
            stop,
        })
    }

    /// Best ETA to `stop` across all dispatch-eligible elevators, optionally
    /// filtered by indicator-lamp [`Direction`](crate::components::Direction).
    ///
    /// Pass [`Direction::Either`](crate::components::Direction::Either) to
    /// consider every car. Otherwise, only cars whose committed direction is
    /// `Either` or matches the requested direction are considered — useful
    /// for hall-call assignment ("which up-going car arrives first?").
    ///
    /// Returns the entity ID of the winning elevator and its ETA, or `None`
    /// if no eligible car has `stop` queued.
    #[must_use]
    pub fn best_eta(
        &self,
        stop: impl Into<StopRef>,
        direction: crate::components::Direction,
    ) -> Option<(EntityId, Duration)> {
        use crate::components::Direction;
        let stop = self.resolve_stop(stop.into()).ok()?;
        self.world
            .iter_elevators()
            .filter_map(|(eid, _, elev)| {
                let car_dir = elev.direction();
                let direction_ok = match direction {
                    Direction::Either => true,
                    requested => car_dir == Direction::Either || car_dir == requested,
                };
                if !direction_ok {
                    return None;
                }
                self.eta(eid, stop).ok().map(|d| (eid, d))
            })
            .min_by_key(|(_, d)| *d)
    }

    // ── Runtime elevator upgrades ────────────────────────────────────
    //
    // Games that want to mutate elevator parameters at runtime (e.g.
    // an RPG speed-upgrade purchase, a scripted capacity boost) go
    // through these setters rather than poking `Elevator` directly via
    // `world_mut()`. Each setter validates its input, updates the
    // underlying component, and emits an [`Event::ElevatorUpgraded`]
    // so game code can react without polling.
    //
    // ### Semantics
    //
    // - `max_speed`, `acceleration`, `deceleration`: applied on the next
    //   movement integration step. The car's **current velocity is
    //   preserved** — there is no instantaneous jerk. If `max_speed`
    //   is lowered below the current velocity, the movement integrator
    //   clamps velocity to the new cap on the next tick.
    // - `weight_capacity`: applied immediately. If the new capacity is
    //   below `current_load` the car ends up temporarily overweight —
    //   no riders are ejected, but the next boarding pass will reject
    //   any rider that would push the load further over the new cap.
    // - `door_transition_ticks`, `door_open_ticks`: applied on the
    //   **next** door cycle. An in-progress door transition keeps its
    //   original timing, so setters never cause visual glitches.

    /// Set the maximum travel speed for an elevator at runtime.
    ///
    /// The new value applies on the next movement integration step;
    /// the car's current velocity is preserved (see the
    /// [runtime upgrades section](crate#runtime-upgrades) of the crate
    /// docs). If the new cap is below the current velocity, the movement
    /// system clamps velocity down on the next tick.
    ///
    /// # Errors
    ///
    /// - [`SimError::NotAnElevator`] if `elevator` is not an elevator entity.
    /// - [`SimError::InvalidConfig`] if `speed` is not a positive finite number.
    ///
    /// # Example
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
    /// let elev = sim.world().iter_elevators().next().unwrap().0;
    /// sim.set_max_speed(elev, 4.0).unwrap();
    /// assert_eq!(sim.world().elevator(elev).unwrap().max_speed(), 4.0);
    /// ```
    pub fn set_max_speed(&mut self, elevator: EntityId, speed: f64) -> Result<(), SimError> {
        Self::validate_positive_finite_f64(speed, "elevators.max_speed")?;
        let old = self.require_elevator(elevator)?.max_speed;
        if let Some(car) = self.world.elevator_mut(elevator) {
            car.max_speed = speed;
        }
        self.emit_upgrade(
            elevator,
            crate::events::UpgradeField::MaxSpeed,
            crate::events::UpgradeValue::float(old),
            crate::events::UpgradeValue::float(speed),
        );
        Ok(())
    }

    /// Set the acceleration rate for an elevator at runtime.
    ///
    /// See [`set_max_speed`](Self::set_max_speed) for the general
    /// velocity-preservation rules that apply to kinematic setters.
    ///
    /// # Errors
    ///
    /// - [`SimError::NotAnElevator`] if `elevator` is not an elevator entity.
    /// - [`SimError::InvalidConfig`] if `accel` is not a positive finite number.
    ///
    /// # Example
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
    /// let elev = sim.world().iter_elevators().next().unwrap().0;
    /// sim.set_acceleration(elev, 3.0).unwrap();
    /// assert_eq!(sim.world().elevator(elev).unwrap().acceleration(), 3.0);
    /// ```
    pub fn set_acceleration(&mut self, elevator: EntityId, accel: f64) -> Result<(), SimError> {
        Self::validate_positive_finite_f64(accel, "elevators.acceleration")?;
        let old = self.require_elevator(elevator)?.acceleration;
        if let Some(car) = self.world.elevator_mut(elevator) {
            car.acceleration = accel;
        }
        self.emit_upgrade(
            elevator,
            crate::events::UpgradeField::Acceleration,
            crate::events::UpgradeValue::float(old),
            crate::events::UpgradeValue::float(accel),
        );
        Ok(())
    }

    /// Set the deceleration rate for an elevator at runtime.
    ///
    /// See [`set_max_speed`](Self::set_max_speed) for the general
    /// velocity-preservation rules that apply to kinematic setters.
    ///
    /// # Errors
    ///
    /// - [`SimError::NotAnElevator`] if `elevator` is not an elevator entity.
    /// - [`SimError::InvalidConfig`] if `decel` is not a positive finite number.
    ///
    /// # Example
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
    /// let elev = sim.world().iter_elevators().next().unwrap().0;
    /// sim.set_deceleration(elev, 3.5).unwrap();
    /// assert_eq!(sim.world().elevator(elev).unwrap().deceleration(), 3.5);
    /// ```
    pub fn set_deceleration(&mut self, elevator: EntityId, decel: f64) -> Result<(), SimError> {
        Self::validate_positive_finite_f64(decel, "elevators.deceleration")?;
        let old = self.require_elevator(elevator)?.deceleration;
        if let Some(car) = self.world.elevator_mut(elevator) {
            car.deceleration = decel;
        }
        self.emit_upgrade(
            elevator,
            crate::events::UpgradeField::Deceleration,
            crate::events::UpgradeValue::float(old),
            crate::events::UpgradeValue::float(decel),
        );
        Ok(())
    }

    /// Set the weight capacity for an elevator at runtime.
    ///
    /// Applied immediately. If the new capacity is below the car's
    /// current load the car is temporarily overweight; no riders are
    /// ejected, but subsequent boarding attempts that would push load
    /// further over the cap will be rejected as
    /// [`RejectionReason::OverCapacity`](crate::error::RejectionReason::OverCapacity).
    ///
    /// # Errors
    ///
    /// - [`SimError::NotAnElevator`] if `elevator` is not an elevator entity.
    /// - [`SimError::InvalidConfig`] if `capacity` is not a positive finite number.
    ///
    /// # Example
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
    /// let elev = sim.world().iter_elevators().next().unwrap().0;
    /// sim.set_weight_capacity(elev, 1200.0).unwrap();
    /// assert_eq!(sim.world().elevator(elev).unwrap().weight_capacity(), 1200.0);
    /// ```
    pub fn set_weight_capacity(
        &mut self,
        elevator: EntityId,
        capacity: f64,
    ) -> Result<(), SimError> {
        Self::validate_positive_finite_f64(capacity, "elevators.weight_capacity")?;
        let old = self.require_elevator(elevator)?.weight_capacity;
        if let Some(car) = self.world.elevator_mut(elevator) {
            car.weight_capacity = capacity;
        }
        self.emit_upgrade(
            elevator,
            crate::events::UpgradeField::WeightCapacity,
            crate::events::UpgradeValue::float(old),
            crate::events::UpgradeValue::float(capacity),
        );
        Ok(())
    }

    /// Set the door open/close transition duration for an elevator.
    ///
    /// Applied on the **next** door cycle — an in-progress transition
    /// keeps its original timing to avoid visual glitches.
    ///
    /// # Errors
    ///
    /// - [`SimError::NotAnElevator`] if `elevator` is not an elevator entity.
    /// - [`SimError::InvalidConfig`] if `ticks` is zero.
    ///
    /// # Example
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
    /// let elev = sim.world().iter_elevators().next().unwrap().0;
    /// sim.set_door_transition_ticks(elev, 3).unwrap();
    /// assert_eq!(sim.world().elevator(elev).unwrap().door_transition_ticks(), 3);
    /// ```
    pub fn set_door_transition_ticks(
        &mut self,
        elevator: EntityId,
        ticks: u32,
    ) -> Result<(), SimError> {
        Self::validate_nonzero_u32(ticks, "elevators.door_transition_ticks")?;
        let old = self.require_elevator(elevator)?.door_transition_ticks;
        if let Some(car) = self.world.elevator_mut(elevator) {
            car.door_transition_ticks = ticks;
        }
        self.emit_upgrade(
            elevator,
            crate::events::UpgradeField::DoorTransitionTicks,
            crate::events::UpgradeValue::ticks(old),
            crate::events::UpgradeValue::ticks(ticks),
        );
        Ok(())
    }

    /// Set how long doors hold fully open for an elevator.
    ///
    /// Applied on the **next** door cycle — a door that is currently
    /// holding open will complete its original dwell before the new
    /// value takes effect.
    ///
    /// # Errors
    ///
    /// - [`SimError::NotAnElevator`] if `elevator` is not an elevator entity.
    /// - [`SimError::InvalidConfig`] if `ticks` is zero.
    ///
    /// # Example
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
    /// let elev = sim.world().iter_elevators().next().unwrap().0;
    /// sim.set_door_open_ticks(elev, 20).unwrap();
    /// assert_eq!(sim.world().elevator(elev).unwrap().door_open_ticks(), 20);
    /// ```
    pub fn set_door_open_ticks(&mut self, elevator: EntityId, ticks: u32) -> Result<(), SimError> {
        Self::validate_nonzero_u32(ticks, "elevators.door_open_ticks")?;
        let old = self.require_elevator(elevator)?.door_open_ticks;
        if let Some(car) = self.world.elevator_mut(elevator) {
            car.door_open_ticks = ticks;
        }
        self.emit_upgrade(
            elevator,
            crate::events::UpgradeField::DoorOpenTicks,
            crate::events::UpgradeValue::ticks(old),
            crate::events::UpgradeValue::ticks(ticks),
        );
        Ok(())
    }

    // ── Manual door control ──────────────────────────────────────────
    //
    // These methods let games drive door state directly — e.g. a
    // cab-panel open/close button in a first-person game, or an RPG
    // where the player *is* the elevator and decides when to cycle doors.
    //
    // Each method either applies the command immediately (if the car is
    // in a matching door-FSM state) or queues it on the elevator for
    // application at the next valid moment. This way games can call
    // these any time without worrying about FSM timing, and get a clean
    // success/failure split between "bad entity" and "bad moment".

    /// Request the doors to open.
    ///
    /// Applied immediately if the car is stopped at a stop with closed
    /// or closing doors; otherwise queued until the car next arrives.
    /// A no-op if the doors are already open or opening.
    ///
    /// # Errors
    ///
    /// - [`SimError::NotAnElevator`] if `elevator` is not an elevator entity.
    /// - [`SimError::ElevatorDisabled`] if the elevator is disabled.
    ///
    /// # Example
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
    /// let elev = sim.world().iter_elevators().next().unwrap().0;
    /// sim.open_door(elev).unwrap();
    /// ```
    pub fn open_door(&mut self, elevator: EntityId) -> Result<(), SimError> {
        self.require_enabled_elevator(elevator)?;
        self.enqueue_door_command(elevator, crate::door::DoorCommand::Open);
        Ok(())
    }

    /// Request the doors to close now.
    ///
    /// Applied immediately if the doors are open or loading — forcing an
    /// early close — unless a rider is mid-boarding/exiting this car, in
    /// which case the close waits for the rider to finish. If doors are
    /// currently opening, the close queues and fires once fully open.
    ///
    /// # Errors
    ///
    /// - [`SimError::NotAnElevator`] if `elevator` is not an elevator entity.
    /// - [`SimError::ElevatorDisabled`] if the elevator is disabled.
    ///
    /// # Example
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
    /// let elev = sim.world().iter_elevators().next().unwrap().0;
    /// sim.close_door(elev).unwrap();
    /// ```
    pub fn close_door(&mut self, elevator: EntityId) -> Result<(), SimError> {
        self.require_enabled_elevator(elevator)?;
        self.enqueue_door_command(elevator, crate::door::DoorCommand::Close);
        Ok(())
    }

    /// Extend the doors' open dwell by `ticks`.
    ///
    /// Cumulative — two calls of 30 ticks each extend the dwell by 60
    /// ticks in total. If the doors aren't open yet, the hold is queued
    /// and applied when they next reach the fully-open state.
    ///
    /// # Errors
    ///
    /// - [`SimError::NotAnElevator`] if `elevator` is not an elevator entity.
    /// - [`SimError::ElevatorDisabled`] if the elevator is disabled.
    /// - [`SimError::InvalidConfig`] if `ticks` is zero.
    ///
    /// # Example
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
    /// let elev = sim.world().iter_elevators().next().unwrap().0;
    /// sim.hold_door(elev, 30).unwrap();
    /// ```
    pub fn hold_door(&mut self, elevator: EntityId, ticks: u32) -> Result<(), SimError> {
        Self::validate_nonzero_u32(ticks, "hold_door.ticks")?;
        self.require_enabled_elevator(elevator)?;
        self.enqueue_door_command(elevator, crate::door::DoorCommand::HoldOpen { ticks });
        Ok(())
    }

    /// Cancel any pending hold extension.
    ///
    /// If the base open timer has already elapsed the doors close on
    /// the next doors-phase tick.
    ///
    /// # Errors
    ///
    /// - [`SimError::NotAnElevator`] if `elevator` is not an elevator entity.
    /// - [`SimError::ElevatorDisabled`] if the elevator is disabled.
    ///
    /// # Example
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
    /// let elev = sim.world().iter_elevators().next().unwrap().0;
    /// sim.hold_door(elev, 100).unwrap();
    /// sim.cancel_door_hold(elev).unwrap();
    /// ```
    pub fn cancel_door_hold(&mut self, elevator: EntityId) -> Result<(), SimError> {
        self.require_enabled_elevator(elevator)?;
        self.enqueue_door_command(elevator, crate::door::DoorCommand::CancelHold);
        Ok(())
    }

    /// Set the target velocity for a manual-mode elevator.
    ///
    /// The velocity is clamped to the elevator's `[-max_speed, max_speed]`
    /// range after validation. The car ramps toward the target each tick
    /// using `acceleration` (speeding up, or starting from rest) or
    /// `deceleration` (slowing down, or reversing direction). Positive
    /// values command upward travel, negative values command downward travel.
    ///
    /// # Errors
    /// - [`SimError::NotAnElevator`] if the entity is not an elevator.
    /// - [`SimError::ElevatorDisabled`] if the elevator is disabled.
    /// - [`SimError::WrongServiceMode`] if the elevator is not in [`ServiceMode::Manual`].
    /// - [`SimError::InvalidConfig`] if `velocity` is not finite (NaN or infinite).
    ///
    /// [`ServiceMode::Manual`]: crate::components::ServiceMode::Manual
    pub fn set_target_velocity(
        &mut self,
        elevator: EntityId,
        velocity: f64,
    ) -> Result<(), SimError> {
        self.require_enabled_elevator(elevator)?;
        self.require_manual_mode(elevator)?;
        if !velocity.is_finite() {
            return Err(SimError::InvalidConfig {
                field: "target_velocity",
                reason: format!("must be finite, got {velocity}"),
            });
        }
        let max = self
            .world
            .elevator(elevator)
            .map_or(f64::INFINITY, |c| c.max_speed);
        let clamped = velocity.clamp(-max, max);
        if let Some(car) = self.world.elevator_mut(elevator) {
            car.manual_target_velocity = Some(clamped);
        }
        self.events.emit(Event::ManualVelocityCommanded {
            elevator,
            target_velocity: Some(ordered_float::OrderedFloat(clamped)),
            tick: self.tick,
        });
        Ok(())
    }

    /// Command an immediate stop on a manual-mode elevator.
    ///
    /// Sets the target velocity to zero; the car decelerates at its
    /// configured `deceleration` rate. Equivalent to
    /// `set_target_velocity(elevator, 0.0)` but emits a distinct
    /// [`Event::ManualVelocityCommanded`] with `None` payload so games can
    /// distinguish an emergency stop from a deliberate hold.
    ///
    /// # Errors
    /// Same as [`set_target_velocity`](Self::set_target_velocity), minus
    /// the finite-velocity check.
    pub fn emergency_stop(&mut self, elevator: EntityId) -> Result<(), SimError> {
        self.require_enabled_elevator(elevator)?;
        self.require_manual_mode(elevator)?;
        if let Some(car) = self.world.elevator_mut(elevator) {
            car.manual_target_velocity = Some(0.0);
        }
        self.events.emit(Event::ManualVelocityCommanded {
            elevator,
            target_velocity: None,
            tick: self.tick,
        });
        Ok(())
    }

    /// Internal: require an elevator be in `ServiceMode::Manual`.
    fn require_manual_mode(&self, elevator: EntityId) -> Result<(), SimError> {
        let actual = self
            .world
            .service_mode(elevator)
            .copied()
            .unwrap_or_default();
        if actual != crate::components::ServiceMode::Manual {
            return Err(SimError::WrongServiceMode {
                entity: elevator,
                expected: crate::components::ServiceMode::Manual,
                actual,
            });
        }
        Ok(())
    }

    /// Internal: push a command onto the queue, collapsing adjacent
    /// duplicates, capping length, and emitting `DoorCommandQueued`.
    fn enqueue_door_command(&mut self, elevator: EntityId, command: crate::door::DoorCommand) {
        if let Some(car) = self.world.elevator_mut(elevator) {
            let q = &mut car.door_command_queue;
            // Collapse adjacent duplicates for idempotent commands
            // (Open/Close/CancelHold) — repeating them adds nothing.
            // HoldOpen is explicitly cumulative, so never collapsed.
            let collapse = matches!(
                command,
                crate::door::DoorCommand::Open
                    | crate::door::DoorCommand::Close
                    | crate::door::DoorCommand::CancelHold
            ) && q.last().copied() == Some(command);
            if !collapse {
                q.push(command);
                if q.len() > crate::components::DOOR_COMMAND_QUEUE_CAP {
                    q.remove(0);
                }
            }
        }
        self.events.emit(Event::DoorCommandQueued {
            elevator,
            command,
            tick: self.tick,
        });
    }

    /// Internal: resolve an elevator entity that is not disabled.
    fn require_enabled_elevator(&self, elevator: EntityId) -> Result<(), SimError> {
        if self.world.elevator(elevator).is_none() {
            return Err(SimError::NotAnElevator(elevator));
        }
        if self.world.is_disabled(elevator) {
            return Err(SimError::ElevatorDisabled(elevator));
        }
        Ok(())
    }

    /// Internal: resolve an elevator entity or return a clear error.
    fn require_elevator(
        &self,
        elevator: EntityId,
    ) -> Result<&crate::components::Elevator, SimError> {
        self.world
            .elevator(elevator)
            .ok_or(SimError::NotAnElevator(elevator))
    }

    /// Internal: positive-finite validator matching the construction-time
    /// error shape in `sim/construction.rs::validate_elevator_config`.
    fn validate_positive_finite_f64(value: f64, field: &'static str) -> Result<(), SimError> {
        if !value.is_finite() {
            return Err(SimError::InvalidConfig {
                field,
                reason: format!("must be finite, got {value}"),
            });
        }
        if value <= 0.0 {
            return Err(SimError::InvalidConfig {
                field,
                reason: format!("must be positive, got {value}"),
            });
        }
        Ok(())
    }

    /// Internal: reject zero-tick timings.
    fn validate_nonzero_u32(value: u32, field: &'static str) -> Result<(), SimError> {
        if value == 0 {
            return Err(SimError::InvalidConfig {
                field,
                reason: "must be > 0".into(),
            });
        }
        Ok(())
    }

    /// Internal: emit a single `ElevatorUpgraded` event for the current tick.
    fn emit_upgrade(
        &mut self,
        elevator: EntityId,
        field: crate::events::UpgradeField,
        old: crate::events::UpgradeValue,
        new: crate::events::UpgradeValue,
    ) {
        self.events.emit(Event::ElevatorUpgraded {
            elevator,
            field,
            old,
            new,
            tick: self.tick,
        });
    }

    // Dispatch & reposition management live in `sim/construction.rs`.

    // ── Tagging ──────────────────────────────────────────────────────

    /// Attach a metric tag to an entity (rider, stop, elevator, etc.).
    ///
    /// Tags enable per-tag metric breakdowns. An entity can have multiple tags.
    /// Riders automatically inherit tags from their origin stop when spawned.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::EntityNotFound`] if the entity does not exist in
    /// the world.
    pub fn tag_entity(&mut self, id: EntityId, tag: impl Into<String>) -> Result<(), SimError> {
        if !self.world.is_alive(id) {
            return Err(SimError::EntityNotFound(id));
        }
        if let Some(tags) = self
            .world
            .resource_mut::<crate::tagged_metrics::MetricTags>()
        {
            tags.tag(id, tag);
        }
        Ok(())
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
    #[allow(clippy::missing_const_for_fn)]
    pub fn build_rider(&mut self, origin: EntityId, destination: EntityId) -> RiderBuilder<'_> {
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
        origin: impl Into<StopRef>,
        destination: impl Into<StopRef>,
        weight: f64,
    ) -> Result<EntityId, SimError> {
        let origin = self.resolve_stop(origin.into())?;
        let destination = self.resolve_stop(destination.into())?;
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
        origin: impl Into<StopRef>,
        destination: impl Into<StopRef>,
        weight: f64,
        route: Route,
    ) -> Result<EntityId, SimError> {
        let origin = self.resolve_stop(origin.into())?;
        let destination = self.resolve_stop(destination.into())?;
        if self.world.stop(origin).is_none() {
            return Err(SimError::EntityNotFound(origin));
        }
        if let Some(leg) = route.current()
            && leg.from != origin
        {
            return Err(SimError::InvalidState {
                entity: origin,
                reason: format!(
                    "origin {origin:?} does not match route first leg from {:?}",
                    leg.from
                ),
            });
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

        // Auto-press the hall button for this rider. Direction is the
        // sign of `dest_pos - origin_pos`; if the two coincide (walk
        // leg, identity trip) no call is registered.
        if let (Some(op), Some(dp)) = (
            self.world.stop_position(origin),
            self.world.stop_position(destination),
        ) && let Some(direction) = crate::components::CallDirection::between(op, dp)
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
        origin: impl Into<StopRef>,
        destination: impl Into<StopRef>,
        weight: f64,
        group: GroupId,
    ) -> Result<EntityId, SimError> {
        let origin = self.resolve_stop(origin.into())?;
        let destination = self.resolve_stop(destination.into())?;
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
        self.world.snapshot_prev_positions();
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

    // ── Hall / car call API ─────────────────────────────────────────

    /// Press an up/down hall button at `stop` without associating it
    /// with any particular rider. Useful for scripted NPCs, player
    /// input, or cutscene cues.
    ///
    /// If a call in this direction already exists at `stop`, the press
    /// tick is left untouched (first press wins for latency purposes).
    ///
    /// # Errors
    /// Returns [`SimError::EntityNotFound`] if `stop` is not a valid
    /// stop entity.
    pub fn press_hall_button(
        &mut self,
        stop: impl Into<StopRef>,
        direction: crate::components::CallDirection,
    ) -> Result<(), SimError> {
        let stop = self.resolve_stop(stop.into())?;
        if self.world.stop(stop).is_none() {
            return Err(SimError::EntityNotFound(stop));
        }
        self.ensure_hall_call(stop, direction, None, None);
        Ok(())
    }

    /// Press a floor button from inside `car`. No-op if the car already
    /// has a pending call for `floor`.
    ///
    /// # Errors
    /// Returns [`SimError::EntityNotFound`] if `car` or `floor` is invalid.
    pub fn press_car_button(
        &mut self,
        car: EntityId,
        floor: impl Into<StopRef>,
    ) -> Result<(), SimError> {
        let floor = self.resolve_stop(floor.into())?;
        if self.world.elevator(car).is_none() {
            return Err(SimError::EntityNotFound(car));
        }
        if self.world.stop(floor).is_none() {
            return Err(SimError::EntityNotFound(floor));
        }
        self.ensure_car_call(car, floor, None);
        Ok(())
    }

    /// Pin the hall call at `(stop, direction)` to `car`. Dispatch is
    /// forbidden from reassigning the call to a different car until
    /// [`unpin_assignment`](Self::unpin_assignment) is called or the
    /// call is cleared.
    ///
    /// # Errors
    /// - [`SimError::EntityNotFound`] — `car` is not a valid elevator.
    /// - [`SimError::InvalidState`] with `entity = stop` — no hall call
    ///   exists at that `(stop, direction)` pair yet.
    /// - [`SimError::InvalidState`] with `entity = car` — the car's
    ///   line does not serve `stop`. Without this check a cross-line
    ///   pin would be silently dropped at dispatch time yet leave the
    ///   call `pinned`, blocking every other car.
    pub fn pin_assignment(
        &mut self,
        car: EntityId,
        stop: EntityId,
        direction: crate::components::CallDirection,
    ) -> Result<(), SimError> {
        let Some(elev) = self.world.elevator(car) else {
            return Err(SimError::EntityNotFound(car));
        };
        let car_line = elev.line;
        // Validate the car's line can reach the stop. If the line has
        // an entry in any group, we consult its `serves` list. A car
        // whose line entity doesn't match any line in any group falls
        // through — older test fixtures create elevators without a
        // line entity, and we don't want to regress them.
        let line_serves_stop = self
            .groups
            .iter()
            .flat_map(|g| g.lines().iter())
            .find(|li| li.entity() == car_line)
            .map(|li| li.serves().contains(&stop));
        if line_serves_stop == Some(false) {
            return Err(SimError::InvalidState {
                entity: car,
                reason: format!(
                    "car's line does not serve stop {stop:?}; pinning would orphan the call"
                ),
            });
        }
        let Some(call) = self.world.hall_call_mut(stop, direction) else {
            return Err(SimError::InvalidState {
                entity: stop,
                reason: "no hall call exists at that stop and direction".to_string(),
            });
        };
        call.assigned_car = Some(car);
        call.pinned = true;
        Ok(())
    }

    /// Release a previous pin at `(stop, direction)`. No-op if the call
    /// doesn't exist or wasn't pinned.
    pub fn unpin_assignment(
        &mut self,
        stop: EntityId,
        direction: crate::components::CallDirection,
    ) {
        if let Some(call) = self.world.hall_call_mut(stop, direction) {
            call.pinned = false;
        }
    }

    /// Iterate every active hall call across the simulation. Yields a
    /// reference per live `(stop, direction)` press; games use this to
    /// render lobby lamp states, pending-rider counts, or per-floor
    /// button animations.
    pub fn hall_calls(&self) -> impl Iterator<Item = &crate::components::HallCall> {
        self.world.iter_hall_calls()
    }

    /// Floor buttons currently pressed inside `car`. Returns an empty
    /// slice when the car has no aboard riders or hasn't been used.
    #[must_use]
    pub fn car_calls(&self, car: EntityId) -> &[crate::components::CarCall] {
        self.world.car_calls(car)
    }

    /// Car currently assigned to serve the call at `(stop, direction)`,
    /// if dispatch has made an assignment yet.
    #[must_use]
    pub fn assigned_car(
        &self,
        stop: EntityId,
        direction: crate::components::CallDirection,
    ) -> Option<EntityId> {
        self.world
            .hall_call(stop, direction)
            .and_then(|c| c.assigned_car)
    }

    /// Estimated ticks remaining before the assigned car reaches the
    /// call at `(stop, direction)`.
    ///
    /// # Errors
    ///
    /// - [`EtaError::NotAStop`] if no hall call exists at `(stop, direction)`.
    /// - [`EtaError::StopNotQueued`] if no car is assigned to the call.
    /// - [`EtaError::NotAnElevator`] if the assigned car has no positional
    ///   data or is not a valid elevator.
    pub fn eta_for_call(
        &self,
        stop: EntityId,
        direction: crate::components::CallDirection,
    ) -> Result<u64, EtaError> {
        let call = self
            .world
            .hall_call(stop, direction)
            .ok_or(EtaError::NotAStop(stop))?;
        let car = call.assigned_car.ok_or(EtaError::NoCarAssigned(stop))?;
        let car_pos = self
            .world
            .position(car)
            .ok_or(EtaError::NotAnElevator(car))?
            .value;
        let stop_pos = self
            .world
            .stop_position(stop)
            .ok_or(EtaError::StopVanished(stop))?;
        let max_speed = self
            .world
            .elevator(car)
            .ok_or(EtaError::NotAnElevator(car))?
            .max_speed();
        if max_speed <= 0.0 {
            return Err(EtaError::NotAnElevator(car));
        }
        let distance = (car_pos - stop_pos).abs();
        // Simple kinematic estimate. The `eta` module has a richer
        // trapezoidal model; the one-liner suits most hall-display use.
        Ok((distance / max_speed).ceil() as u64)
    }

    // ── Internal helpers ────────────────────────────────────────────

    /// Register (or aggregate) a hall call on behalf of a specific
    /// rider, including their destination in DCS mode.
    fn register_hall_call_for_rider(
        &mut self,
        stop: EntityId,
        direction: crate::components::CallDirection,
        rider: EntityId,
        destination: EntityId,
    ) {
        let mode = self
            .groups
            .iter()
            .find(|g| g.stop_entities().contains(&stop))
            .map(crate::dispatch::ElevatorGroup::hall_call_mode);
        let dest = match mode {
            Some(crate::dispatch::HallCallMode::Destination) => Some(destination),
            _ => None,
        };
        self.ensure_hall_call(stop, direction, Some(rider), dest);
    }

    /// Create or aggregate into the hall call at `(stop, direction)`.
    /// Emits [`Event::HallButtonPressed`] only on the *first* press.
    fn ensure_hall_call(
        &mut self,
        stop: EntityId,
        direction: crate::components::CallDirection,
        rider: Option<EntityId>,
        destination: Option<EntityId>,
    ) {
        let mut fresh_press = false;
        if self.world.hall_call(stop, direction).is_none() {
            let mut call = crate::components::HallCall::new(stop, direction, self.tick);
            call.destination = destination;
            call.ack_latency_ticks = self.ack_latency_for_stop(stop);
            if call.ack_latency_ticks == 0 {
                // Controller has zero-tick latency — mark acknowledged
                // immediately so dispatch sees the call this same tick.
                call.acknowledged_at = Some(self.tick);
            }
            if let Some(rid) = rider {
                call.pending_riders.push(rid);
            }
            self.world.set_hall_call(call);
            fresh_press = true;
        } else if let Some(existing) = self.world.hall_call_mut(stop, direction) {
            if let Some(rid) = rider
                && !existing.pending_riders.contains(&rid)
            {
                existing.pending_riders.push(rid);
            }
            // Prefer a populated destination over None; don't overwrite
            // an existing destination even if a later press omits it.
            if existing.destination.is_none() {
                existing.destination = destination;
            }
        }
        if fresh_press {
            self.events.emit(Event::HallButtonPressed {
                stop,
                direction,
                tick: self.tick,
            });
            // Zero-latency controllers acknowledge on the press tick.
            if let Some(call) = self.world.hall_call(stop, direction)
                && call.acknowledged_at == Some(self.tick)
            {
                self.events.emit(Event::HallCallAcknowledged {
                    stop,
                    direction,
                    tick: self.tick,
                });
            }
        }
    }

    /// Ack latency for the group whose `members` slice contains `entity`.
    /// Defaults to 0 if no group matches (unreachable in normal builds).
    fn ack_latency_for(
        &self,
        entity: EntityId,
        members: impl Fn(&crate::dispatch::ElevatorGroup) -> &[EntityId],
    ) -> u32 {
        self.groups
            .iter()
            .find(|g| members(g).contains(&entity))
            .map_or(0, crate::dispatch::ElevatorGroup::ack_latency_ticks)
    }

    /// Ack latency for the group that owns `stop` (0 if no group).
    fn ack_latency_for_stop(&self, stop: EntityId) -> u32 {
        self.ack_latency_for(stop, crate::dispatch::ElevatorGroup::stop_entities)
    }

    /// Ack latency for the group that owns `car` (0 if no group).
    fn ack_latency_for_car(&self, car: EntityId) -> u32 {
        self.ack_latency_for(car, crate::dispatch::ElevatorGroup::elevator_entities)
    }

    /// Create or aggregate into a car call for `(car, floor)`.
    /// Emits [`Event::CarButtonPressed`] on first press; repeat presses
    /// by other riders append to `pending_riders` without re-emitting.
    fn ensure_car_call(&mut self, car: EntityId, floor: EntityId, rider: Option<EntityId>) {
        let press_tick = self.tick;
        let ack_latency = self.ack_latency_for_car(car);
        let Some(queue) = self.world.car_calls_mut(car) else {
            return;
        };
        let existing_idx = queue.iter().position(|c| c.floor == floor);
        let fresh = existing_idx.is_none();
        if let Some(idx) = existing_idx {
            if let Some(rid) = rider
                && !queue[idx].pending_riders.contains(&rid)
            {
                queue[idx].pending_riders.push(rid);
            }
        } else {
            let mut call = crate::components::CarCall::new(car, floor, press_tick);
            call.ack_latency_ticks = ack_latency;
            if ack_latency == 0 {
                call.acknowledged_at = Some(press_tick);
            }
            if let Some(rid) = rider {
                call.pending_riders.push(rid);
            }
            queue.push(call);
        }
        if fresh {
            self.events.emit(Event::CarButtonPressed {
                car,
                floor,
                rider,
                tick: press_tick,
            });
        }
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
