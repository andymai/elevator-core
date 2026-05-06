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
//! - [`Simulation::spawn_rider()`](crate::sim::Simulation::spawn_rider)
//!   — simple origin/destination/weight spawn (accepts `EntityId` or `StopId`).
//! - [`Simulation::build_rider()`](crate::sim::Simulation::build_rider)
//!   — fluent [`RiderBuilder`](crate::sim::RiderBuilder) for patience, preferences, access
//!   control, explicit groups, multi-leg routes (accepts `EntityId` or `StopId`).
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
//! - [`Simulation::abort_movement()`](crate::sim::Simulation::abort_movement)
//!   — hard-abort an in-flight trip, braking the car to the nearest
//!   reachable stop without opening doors (riders stay aboard).
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

mod accessors;
mod calls;
mod construction;
mod destinations;
mod eta;
mod lifecycle;
mod manual;
mod rider;
mod runtime;
mod substep;
mod tagging;
mod topology;
#[allow(clippy::redundant_pub_crate)]
pub(crate) mod transition;

use crate::components::{
    Accel, AccessControl, Orientation, Patience, Preferences, Route, SpatialPosition, Speed, Weight,
};
use crate::dispatch::{BuiltinReposition, DispatchStrategy, ElevatorGroup, RepositionStrategy};
use crate::entity::{EntityId, RiderId};
use crate::error::SimError;
use crate::events::{Event, EventBus};
use crate::hooks::PhaseHooks;
use crate::ids::GroupId;
use crate::metrics::Metrics;
use crate::rider_index::RiderIndex;
use crate::stop::StopId;
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
    pub max_speed: Speed,
    /// Acceleration rate (distance/tick^2).
    pub acceleration: Accel,
    /// Deceleration rate (distance/tick^2).
    pub deceleration: Accel,
    /// Maximum weight the car can carry.
    pub weight_capacity: Weight,
    /// Ticks for a door open/close transition.
    pub door_transition_ticks: u32,
    /// Ticks the door stays fully open.
    pub door_open_ticks: u32,
    /// Stop entity IDs this elevator cannot serve (access restriction).
    pub restricted_stops: HashSet<EntityId>,
    /// Speed multiplier for Inspection mode (0.0..1.0).
    pub inspection_speed_factor: f64,
    /// Full-load bypass threshold for upward pickups (see
    /// [`Elevator::bypass_load_up_pct`](crate::components::Elevator::bypass_load_up_pct)).
    pub bypass_load_up_pct: Option<f64>,
    /// Full-load bypass threshold for downward pickups.
    pub bypass_load_down_pct: Option<f64>,
}

impl Default for ElevatorParams {
    fn default() -> Self {
        Self {
            max_speed: Speed::from(2.0),
            acceleration: Accel::from(1.5),
            deceleration: Accel::from(2.0),
            weight_capacity: Weight::from(800.0),
            door_transition_ticks: 5,
            door_open_ticks: 10,
            restricted_stops: HashSet::new(),
            inspection_speed_factor: 0.25,
            bypass_load_up_pct: None,
            bypass_load_down_pct: None,
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
/// Created via [`Simulation::build_rider`].
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
pub struct RiderBuilder<'a> {
    /// Mutable reference to the simulation (consumed on spawn).
    sim: &'a mut Simulation,
    /// Origin stop entity.
    origin: EntityId,
    /// Destination stop entity.
    destination: EntityId,
    /// Rider weight (default: 75.0).
    weight: Weight,
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
    pub fn weight(mut self, weight: impl Into<Weight>) -> Self {
        self.weight = weight.into();
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
    /// Returns [`SimError::RouteOriginMismatch`] if an explicit route's first leg
    /// does not start at `origin`.
    pub fn spawn(self) -> Result<RiderId, SimError> {
        let route = if let Some(route) = self.route {
            // Validate route origin matches the spawn origin.
            if let Some(leg) = route.current()
                && leg.from != self.origin
            {
                return Err(SimError::RouteOriginMismatch {
                    expected_origin: self.origin,
                    route_origin: leg.from,
                });
            }
            route
        } else {
            // No explicit route: must build one from origin → destination.
            // Same origin/destination produces a Route::direct that no hall
            // call can summon a car for — rider deadlocks Waiting (#273).
            // The route-supplied path above is exempt from this check: a
            // caller that constructs their own Route presumably also drives
            // the corresponding hall-call / dispatch path, so the
            // same-stop case there is their responsibility, not ours.
            if self.origin == self.destination {
                return Err(SimError::InvalidConfig {
                    field: "destination",
                    reason: "origin and destination must differ; same-stop \
                             spawns deadlock with no hall call to summon a car"
                        .into(),
                });
            }
            if let Some(group) = self.group {
                if !self.sim.groups.iter().any(|g| g.id() == group) {
                    return Err(SimError::GroupNotFound(group));
                }
                Route::direct(self.origin, self.destination, group)
            } else {
                // Auto-detect the single-group case first; on `NoRoute` or
                // `AmbiguousRoute`, fall back to the multi-leg topology
                // search so zoned buildings and specialty-overlap floors
                // work through the plain `spawn_rider` API without callers
                // having to thread a group pick through transfer points.
                match self.sim.auto_detect_group(self.origin, self.destination) {
                    Ok(group) => Route::direct(self.origin, self.destination, group),
                    Err(
                        original @ (SimError::NoRoute { .. } | SimError::AmbiguousRoute { .. }),
                    ) => {
                        match self.sim.shortest_route(self.origin, self.destination) {
                            Some(route) => route,
                            // Preserve the original diagnostic context (which
                            // groups serve origin / destination) so callers
                            // still see the misconfiguration, not just a
                            // bare "no route" from the fallback.
                            None => return Err(original),
                        }
                    }
                    Err(other) => return Err(other),
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

        Ok(RiderId::wrap_unchecked(eid))
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
    /// Reusable buffer for reposition decisions (avoids per-tick allocation).
    reposition_buf: Vec<(EntityId, EntityId)>,
    /// Scratch buffers owned by the dispatch phase — the cost matrix,
    /// pending-stops list, servicing slice, pinned / committed /
    /// idle-elevator filters. Holding them on the sim means each
    /// dispatch pass reuses capacity instead of re-allocating.
    pub(crate) dispatch_scratch: crate::dispatch::DispatchScratch,
    /// Lazy-rebuilt connectivity graph for cross-line topology queries.
    topo_graph: Mutex<TopologyGraph>,
    /// Phase-partitioned reverse index for O(1) population queries.
    rider_index: RiderIndex,
    /// True between the first per-phase `run_*` call and the matching
    /// `advance_tick()`. Used by [`try_snapshot`](Self::try_snapshot) to
    /// reject mid-tick captures that would lose in-progress event-bus
    /// state. Always false outside the substep API path because
    /// [`step()`](Self::step) takes `&mut self` and snapshots take
    /// `&self`. (#297)
    pub(crate) tick_in_progress: bool,
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
