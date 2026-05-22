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
pub(crate) mod strategy_set;
mod substep;
mod tagging;
mod topology;

pub(crate) use strategy_set::{DispatcherSet, RepositionerSet};
#[allow(clippy::redundant_pub_crate)]
pub(crate) mod transition;

pub use rider::RiderBuilder;

use crate::components::{Accel, Orientation, SpatialPosition, Speed, Weight};
use crate::dispatch::ElevatorGroup;
use crate::entity::EntityId;
use crate::events::{Event, EventBus};
use crate::hooks::PhaseHooks;
use crate::ids::GroupId;
use crate::metrics::Metrics;
use crate::rider_index::RiderIndex;
use crate::stop::StopId;
use crate::time::TimeAdapter;
use crate::topology::TopologyGraph;
use crate::world::World;
use std::collections::{HashMap, HashSet};
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
    ///
    /// Used only when [`Self::kind`] is `None`; otherwise the kind's
    /// own bounds win. Kept for backward-compat with callers that
    /// haven't migrated to constructing
    /// [`LineKind`](crate::components::LineKind) directly.
    pub min_position: f64,
    /// Highest reachable position on the line axis. See
    /// [`Self::min_position`] for the kind interaction.
    pub max_position: f64,
    /// Optional floor-plan position. On a Loop line this is the
    /// loop center.
    pub position: Option<SpatialPosition>,
    /// Maximum cars on this line (None = unlimited).
    pub max_cars: Option<usize>,
    /// Topology kind. When `Some`, takes precedence over the flat
    /// `min_position`/`max_position` fields. When `None`, falls back
    /// to [`LineKind::Linear`](crate::components::LineKind::Linear)
    /// built from the flat fields — matches the pre-`LineKind` behavior.
    pub kind: Option<crate::components::LineKind>,
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
            kind: None,
        }
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
    /// Config-time `ElevatorConfig.id` → runtime `EntityId` mapping.
    /// Populated only for elevators spawned from the initial config —
    /// runtime `add_elevator` takes `ElevatorParams` (no config id) and
    /// returns the new `EntityId` directly, so it does not populate
    /// this map. Mirror of [`Self::stop_lookup`] semantics.
    elevator_lookup: HashMap<crate::config::ElevatorConfigId, EntityId>,
    /// Config-time `LineConfig.id` → runtime `EntityId` mapping.
    /// Populated only for lines from an explicit `building.lines` block
    /// in the config; legacy (flat-elevator-list) configs build a single
    /// default line with no config id, so this stays empty for them.
    /// Runtime `add_line` takes `LineParams` (no config id) and returns
    /// the entity directly. Mirror of [`Self::stop_lookup`] semantics.
    line_lookup: HashMap<crate::config::LineConfigId, EntityId>,
    /// Dispatch strategies + their snapshot identities, keyed by group.
    /// Owns both halves so insert/remove stay atomic — see
    /// [`DispatcherSet`].
    dispatcher_set: DispatcherSet,
    /// Reposition strategies + their snapshot identities, keyed by group.
    /// Empty when no group opts into the reposition phase.
    repositioner_set: RepositionerSet,
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
    ///
    /// Stays `pub(crate)` rather than method-encapsulated because the
    /// dispatch phase needs simultaneous disjoint mutable borrows of
    /// `world`, `events`, and the scratch — a getter returning
    /// `&mut DispatchScratch` would borrow all of `self`, conflicting
    /// with `&mut self.world` in the same call.
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
    /// `&self`. (#297) Read via [`tick_in_progress`](Self::tick_in_progress);
    /// the substep loop owns the mutation through
    /// [`set_tick_in_progress`](Self::set_tick_in_progress).
    tick_in_progress: bool,
    /// Opt-in phase-order check for the substep API. `Disabled` (the
    /// default) skips all checks for backwards compatibility and zero
    /// runtime cost. Hosts driving phases manually can flip this on
    /// via [`set_strict_phase_order`](Self::set_strict_phase_order) to
    /// fail fast on out-of-order `run_*` calls instead of seeing the
    /// diffuse symptoms (riders boarding through closed doors,
    /// movement before dispatch, transient states bleeding across
    /// tick boundaries).
    pub(crate) phase_check: PhaseCheck,
}

/// State of the substep phase-order guard.
///
/// `Disabled` (the default) is a no-op: every `run_*` method
/// short-circuits the check, so there is no runtime cost for hosts
/// that don't opt in. `Expecting(phase)` enforces that the next
/// `run_*` call matches `phase`; `AwaitingTick` requires
/// [`Simulation::advance_tick`] before the next cycle begins.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum PhaseCheck {
    /// Guard is off; substep calls are not validated.
    Disabled,
    /// Guard is on and the next allowed `run_*` is this phase.
    Expecting(crate::hooks::Phase),
    /// Metrics has run; `advance_tick()` must come before the next cycle.
    AwaitingTick,
}

impl Simulation {
    /// Whether the sim is between [`run_advance_transient`] and
    /// [`advance_tick`] — i.e. mid-tick. Snapshot capture needs this
    /// to reject mid-tick saves that would lose in-progress
    /// event-bus state.
    ///
    /// [`run_advance_transient`]: Self::run_advance_transient
    /// [`advance_tick`]: Self::advance_tick
    #[must_use]
    pub(crate) const fn tick_in_progress(&self) -> bool {
        self.tick_in_progress
    }

    /// Set the mid-tick guard. Owned by the substep runner — only
    /// `run_advance_transient` flips it on and `advance_tick` flips
    /// it off.
    pub(crate) const fn set_tick_in_progress(&mut self, in_progress: bool) {
        self.tick_in_progress = in_progress;
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
