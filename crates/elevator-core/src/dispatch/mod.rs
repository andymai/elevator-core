//! Pluggable dispatch strategies for assigning elevators to stops.
//!
//! Strategies express preferences as scores on `(car, stop)` pairs via
//! [`DispatchStrategy::rank`](crate::dispatch::DispatchStrategy::rank). The
//! dispatch system then runs an optimal bipartite assignment (Kuhn–Munkres /
//! Hungarian algorithm) so coordination — one car per hall call — is a library
//! invariant, not a per-strategy responsibility. Cars left unassigned are
//! handed to [`DispatchStrategy::fallback`](crate::dispatch::DispatchStrategy::fallback)
//! for per-car policy (idle, park, etc.).
//!
//! # Example: custom dispatch strategy
//!
//! ```rust
//! use elevator_core::prelude::*;
//!
//! struct AlwaysFirstStop;
//!
//! impl DispatchStrategy for AlwaysFirstStop {
//!     fn rank(&mut self, ctx: &RankContext<'_>) -> Option<f64> {
//!         // Prefer the group's first stop; everything else is unavailable.
//!         if Some(&ctx.stop) == ctx.group.stop_entities().first() {
//!             Some((ctx.car_position - ctx.stop_position).abs())
//!         } else {
//!             None
//!         }
//!     }
//! }
//!
//! let sim = SimulationBuilder::demo()
//!     .dispatch(AlwaysFirstStop)
//!     .build()
//!     .unwrap();
//! ```

/// Hall-call destination dispatch algorithm.
pub mod destination;
/// Estimated Time to Destination dispatch algorithm.
pub mod etd;
/// LOOK dispatch algorithm.
pub mod look;
/// Nearest-car dispatch algorithm.
pub mod nearest_car;
/// Built-in repositioning strategies.
pub mod reposition;
/// Relative System Response (RSR) dispatch algorithm.
pub mod rsr;
/// SCAN dispatch algorithm.
pub mod scan;
/// Shared sweep-direction logic used by SCAN and LOOK.
pub(crate) mod sweep;

pub use destination::{AssignedCar, DestinationDispatch};
pub use etd::EtdDispatch;
pub use look::LookDispatch;
pub use nearest_car::NearestCarDispatch;
pub use rsr::RsrDispatch;
pub use scan::ScanDispatch;

use serde::{Deserialize, Serialize};

use crate::components::{
    CallDirection, CarCall, ElevatorPhase, HallCall, Route, TransportMode, Weight,
};
use crate::entity::EntityId;
use crate::ids::GroupId;
use crate::world::World;
use std::collections::{BTreeMap, HashSet};

/// Whether assigning `ctx.car` to `ctx.stop` can perform useful work.
///
/// "Useful" here means one of: exit an aboard rider, board a waiting
/// rider that fits, or answer a rider-less hall call with at least some
/// spare capacity. A pair that can do none of those is a no-op move —
/// and worse, a zero-cost one when the car is already parked at the
/// stop — which dispatch strategies must exclude to avoid door-cycle
/// stalls against unservable demand.
///
/// Built-in strategies use this as a universal floor; delivery-safety
/// guarantees are only as strong as this guard. Custom strategies
/// should call it at the top of their `rank` implementations when
/// capacity-based stalls are a concern.
#[must_use]
pub fn pair_can_do_work(ctx: &RankContext<'_>) -> bool {
    let Some(car) = ctx.world.elevator(ctx.car) else {
        return false;
    };
    let can_exit_here = car
        .riders()
        .iter()
        .any(|&rid| ctx.world.route(rid).and_then(Route::current_destination) == Some(ctx.stop));
    if can_exit_here {
        return true;
    }

    // Direction-dependent full-load bypass (Otis Elevonic 411 model,
    // patent US5490580A). A car loaded above its configured threshold
    // in the current travel direction ignores hall calls in that same
    // direction. Aboard riders still get delivered — the `can_exit_here`
    // short-circuit above guarantees their destinations remain rank-able.
    if bypass_in_current_direction(car, ctx) {
        return false;
    }

    let remaining_capacity = car.weight_capacity.value() - car.current_load.value();
    if remaining_capacity <= 0.0 {
        return false;
    }
    let waiting = ctx.manifest.waiting_riders_at(ctx.stop);
    if !waiting.is_empty() {
        return waiting
            .iter()
            .any(|r| rider_can_board(r, car, ctx, remaining_capacity));
    }
    // No waiters at the stop, and no aboard rider of ours exits here
    // (the `can_exit_here` short-circuit ruled that out above). Demand
    // must therefore come from either another car's `riding_to_stop`
    // (not work this car can perform) or a rider-less hall call
    // (someone pressed a button with no rider attached yet — a press
    // from `press_hall_button` or one whose riders have since been
    // fulfilled or abandoned). Only the latter is actionable; without
    // this filter an idle car parked at the stop collapses to cost 0,
    // the Hungarian picks the self-pair every tick, and doors cycle
    // open/close indefinitely while the other car finishes its trip.
    ctx.manifest
        .hall_calls_at_stop
        .get(&ctx.stop)
        .is_some_and(|calls| calls.iter().any(|c| c.pending_riders.is_empty()))
}

/// Whether a waiting rider could actually board this car, matching the
/// same filters the loading phase applies. Prevents `pair_can_do_work`
/// from approving a pickup whose only demand is direction-filtered or
/// over-capacity — the loading phase would reject the rider, doors
/// would cycle, and dispatch would re-pick the zero-cost self-pair.
fn rider_can_board(
    rider: &RiderInfo,
    car: &crate::components::Elevator,
    ctx: &RankContext<'_>,
    remaining_capacity: f64,
) -> bool {
    if rider.weight.value() > remaining_capacity {
        return false;
    }
    // Match `systems::loading`'s direction filter: a rider whose trip
    // goes the opposite way of the car's committed direction will not
    // be boarded. An unknown destination (no route yet) is treated as
    // unconstrained — let the rider through and let the loading phase
    // make the final call.
    let Some(dest) = rider.destination else {
        return true;
    };
    let Some(dest_pos) = ctx.world.stop_position(dest) else {
        return true;
    };
    if dest_pos > ctx.stop_position && !car.going_up() {
        return false;
    }
    if dest_pos < ctx.stop_position && !car.going_down() {
        return false;
    }
    true
}

/// True when a full-load bypass applies: the car has a configured
/// threshold for its current travel direction, is above that threshold,
/// and the candidate stop lies in that same direction.
fn bypass_in_current_direction(car: &crate::components::Elevator, ctx: &RankContext<'_>) -> bool {
    // Derive travel direction from the car's current target, if any.
    // An Idle or Stopped car has no committed direction → no bypass.
    let Some(target) = car.phase().moving_target() else {
        return false;
    };
    let Some(target_pos) = ctx.world.stop_position(target) else {
        return false;
    };
    let going_up = target_pos > ctx.car_position;
    let going_down = target_pos < ctx.car_position;
    if !going_up && !going_down {
        return false;
    }
    let threshold = if going_up {
        car.bypass_load_up_pct()
    } else {
        car.bypass_load_down_pct()
    };
    let Some(pct) = threshold else {
        return false;
    };
    let capacity = car.weight_capacity().value();
    if capacity <= 0.0 {
        return false;
    }
    let load_ratio = car.current_load().value() / capacity;
    if load_ratio < pct {
        return false;
    }
    // Only same-direction pickups get bypassed.
    let stop_above = ctx.stop_position > ctx.car_position;
    let stop_below = ctx.stop_position < ctx.car_position;
    (going_up && stop_above) || (going_down && stop_below)
}

/// Metadata about a single rider, available to dispatch strategies.
#[derive(Debug, Clone)]
#[non_exhaustive]
pub struct RiderInfo {
    /// Rider entity ID.
    pub id: EntityId,
    /// Rider's destination stop entity (from route).
    pub destination: Option<EntityId>,
    /// Rider weight.
    pub weight: Weight,
    /// Ticks this rider has been waiting (0 if riding).
    pub wait_ticks: u64,
}

/// Full demand picture for dispatch decisions.
///
/// Contains per-rider metadata grouped by stop, enabling entity-aware
/// dispatch strategies (priority, weight-aware, VIP-first, etc.).
///
/// Uses `BTreeMap` for deterministic iteration order.
#[derive(Debug, Clone, Default)]
pub struct DispatchManifest {
    /// Riders waiting at each stop, with full per-rider metadata.
    pub(crate) waiting_at_stop: BTreeMap<EntityId, Vec<RiderInfo>>,
    /// Riders currently aboard elevators, grouped by their destination stop.
    pub(crate) riding_to_stop: BTreeMap<EntityId, Vec<RiderInfo>>,
    /// Number of residents at each stop (read-only hint for dispatch strategies).
    pub(crate) resident_count_at_stop: BTreeMap<EntityId, usize>,
    /// Pending hall calls at each stop — at most two entries per stop
    /// (one per [`CallDirection`]). Populated only for stops served by
    /// the group being dispatched. Strategies read this to rank based on
    /// call age, pending-rider count, pin flags, or DCS destinations.
    pub(crate) hall_calls_at_stop: BTreeMap<EntityId, Vec<HallCall>>,
    /// Floor buttons pressed inside each car in the group. Keyed by car
    /// entity. Strategies read this to plan intermediate stops without
    /// poking into `World` directly.
    pub(crate) car_calls_by_car: BTreeMap<EntityId, Vec<CarCall>>,
    /// Recent arrivals per stop, counted over
    /// [`DispatchManifest::arrival_window_ticks`] ticks. Populated from
    /// the [`crate::arrival_log::ArrivalLog`] world resource each pass
    /// so strategies can read a traffic-rate signal without touching
    /// world state directly.
    pub(crate) arrivals_at_stop: BTreeMap<EntityId, u64>,
    /// Window the `arrivals_at_stop` counts cover, in ticks. Exposed so
    /// strategies interpreting the raw counts can convert them to a
    /// rate (per tick or per second).
    pub(crate) arrival_window_ticks: u64,
}

impl DispatchManifest {
    /// Number of riders waiting at a stop.
    #[must_use]
    pub fn waiting_count_at(&self, stop: EntityId) -> usize {
        self.waiting_at_stop.get(&stop).map_or(0, Vec::len)
    }

    /// Total weight of riders waiting at a stop.
    #[must_use]
    pub fn total_weight_at(&self, stop: EntityId) -> f64 {
        self.waiting_at_stop
            .get(&stop)
            .map_or(0.0, |riders| riders.iter().map(|r| r.weight.value()).sum())
    }

    /// Number of riders heading to a stop (aboard elevators).
    #[must_use]
    pub fn riding_count_to(&self, stop: EntityId) -> usize {
        self.riding_to_stop.get(&stop).map_or(0, Vec::len)
    }

    /// Whether a stop has any demand for this group: waiting riders,
    /// riders heading there, or a *rider-less* hall call (one that
    /// `press_hall_button` placed without a backing rider). Pre-fix
    /// the rider-less case was invisible to every built-in dispatcher,
    /// so explicit button presses with no associated rider went
    /// unanswered indefinitely (#255).
    ///
    /// Hall calls *with* `pending_riders` are not double-counted —
    /// those riders already appear in `waiting_count_at` for the
    /// groups whose dispatch surface they belong to. Adding the call
    /// to `has_demand` for *every* group that serves the stop would
    /// pull cars from groups the rider doesn't even want, causing
    /// open/close oscillation regression that the multi-group test
    /// `dispatch_ignores_waiting_rider_targeting_another_group` pins.
    #[must_use]
    pub fn has_demand(&self, stop: EntityId) -> bool {
        self.waiting_count_at(stop) > 0
            || self.riding_count_to(stop) > 0
            || self
                .hall_calls_at_stop
                .get(&stop)
                .is_some_and(|calls| calls.iter().any(|c| c.pending_riders.is_empty()))
    }

    /// Number of residents at a stop (read-only hint, not active demand).
    #[must_use]
    pub fn resident_count_at(&self, stop: EntityId) -> usize {
        self.resident_count_at_stop.get(&stop).copied().unwrap_or(0)
    }

    /// Rider arrivals at `stop` within the last
    /// [`arrival_window_ticks`](Self::arrival_window_ticks) ticks. The
    /// signal is the rolling-window per-stop arrival rate that
    /// commercial controllers use to pick a traffic mode and that
    /// [`crate::dispatch::reposition::PredictiveParking`] uses to
    /// forecast demand. Unvisited stops return 0.
    #[must_use]
    pub fn arrivals_at(&self, stop: EntityId) -> u64 {
        self.arrivals_at_stop.get(&stop).copied().unwrap_or(0)
    }

    /// Window size (in ticks) over which [`arrivals_at`](Self::arrivals_at)
    /// counts events. Strategies convert counts to rates by dividing
    /// by this.
    #[must_use]
    pub const fn arrival_window_ticks(&self) -> u64 {
        self.arrival_window_ticks
    }

    /// The hall call at `(stop, direction)`, if pressed.
    #[must_use]
    pub fn hall_call_at(&self, stop: EntityId, direction: CallDirection) -> Option<&HallCall> {
        self.hall_calls_at_stop
            .get(&stop)?
            .iter()
            .find(|c| c.direction == direction)
    }

    /// All hall calls across every stop in the group (flattened iterator).
    ///
    /// No `#[must_use]` needed: `impl Iterator` already carries that
    /// annotation, and adding our own triggers clippy's
    /// `double_must_use` lint.
    pub fn iter_hall_calls(&self) -> impl Iterator<Item = &HallCall> {
        self.hall_calls_at_stop.values().flatten()
    }

    /// Floor buttons currently pressed inside `car`. Empty slice if the
    /// car has no aboard riders or no outstanding presses.
    #[must_use]
    pub fn car_calls_for(&self, car: EntityId) -> &[CarCall] {
        self.car_calls_by_car.get(&car).map_or(&[], Vec::as_slice)
    }

    /// Riders waiting at a specific stop.
    #[must_use]
    pub fn waiting_riders_at(&self, stop: EntityId) -> &[RiderInfo] {
        self.waiting_at_stop.get(&stop).map_or(&[], Vec::as_slice)
    }

    /// Iterate over all `(stop, riders)` pairs with waiting demand.
    pub fn iter_waiting_stops(&self) -> impl Iterator<Item = (&EntityId, &[RiderInfo])> {
        self.waiting_at_stop
            .iter()
            .map(|(stop, riders)| (stop, riders.as_slice()))
    }

    /// Riders currently riding toward a specific stop.
    #[must_use]
    pub fn riding_riders_to(&self, stop: EntityId) -> &[RiderInfo] {
        self.riding_to_stop.get(&stop).map_or(&[], Vec::as_slice)
    }

    /// Iterate over all `(stop, riders)` pairs with in-transit demand.
    pub fn iter_riding_stops(&self) -> impl Iterator<Item = (&EntityId, &[RiderInfo])> {
        self.riding_to_stop
            .iter()
            .map(|(stop, riders)| (stop, riders.as_slice()))
    }

    /// Iterate over all `(stop, hall_calls)` pairs with active calls.
    pub fn iter_hall_call_stops(&self) -> impl Iterator<Item = (&EntityId, &[HallCall])> {
        self.hall_calls_at_stop
            .iter()
            .map(|(stop, calls)| (stop, calls.as_slice()))
    }
}

/// Serializable identifier for built-in dispatch strategies.
///
/// Used in snapshots and config files to restore the correct strategy
/// without requiring the game to manually re-wire dispatch. Custom strategies
/// are represented by the `Custom(String)` variant.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[non_exhaustive]
pub enum BuiltinStrategy {
    /// SCAN (elevator) algorithm — sweeps end-to-end.
    Scan,
    /// LOOK algorithm — reverses at last request.
    Look,
    /// Nearest-car — assigns closest idle elevator.
    NearestCar,
    /// Estimated Time to Destination — minimizes total cost.
    Etd,
    /// Hall-call destination dispatch — sticky per-rider assignment.
    Destination,
    /// Relative System Response — additive composite of ETA, direction,
    /// car-call affinity, and load-share terms.
    Rsr,
    /// Custom strategy identified by name. The game must provide a factory.
    Custom(String),
}

impl std::fmt::Display for BuiltinStrategy {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Scan => write!(f, "Scan"),
            Self::Look => write!(f, "Look"),
            Self::NearestCar => write!(f, "NearestCar"),
            Self::Etd => write!(f, "Etd"),
            Self::Destination => write!(f, "Destination"),
            Self::Rsr => write!(f, "Rsr"),
            Self::Custom(name) => write!(f, "Custom({name})"),
        }
    }
}

impl BuiltinStrategy {
    /// Instantiate the dispatch strategy for this variant.
    ///
    /// Returns `None` for `Custom` — the game must provide those via
    /// a factory function.
    #[must_use]
    pub fn instantiate(&self) -> Option<Box<dyn DispatchStrategy>> {
        match self {
            Self::Scan => Some(Box::new(scan::ScanDispatch::new())),
            Self::Look => Some(Box::new(look::LookDispatch::new())),
            Self::NearestCar => Some(Box::new(nearest_car::NearestCarDispatch::new())),
            Self::Etd => Some(Box::new(etd::EtdDispatch::new())),
            Self::Destination => Some(Box::new(destination::DestinationDispatch::new())),
            Self::Rsr => Some(Box::new(rsr::RsrDispatch::new())),
            Self::Custom(_) => None,
        }
    }
}

/// Decision returned by a dispatch strategy.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[non_exhaustive]
pub enum DispatchDecision {
    /// Go to the specified stop entity.
    GoToStop(EntityId),
    /// Remain idle.
    Idle,
}

/// Per-line relationship data within an [`ElevatorGroup`].
///
/// This is a denormalized cache maintained by [`Simulation`](crate::sim::Simulation).
/// The source of truth for intrinsic line properties is the
/// [`Line`](crate::components::Line) component in World.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineInfo {
    /// Line entity ID.
    entity: EntityId,
    /// Elevator entities on this line.
    elevators: Vec<EntityId>,
    /// Stop entities served by this line.
    serves: Vec<EntityId>,
}

impl LineInfo {
    /// Create a new `LineInfo`.
    #[must_use]
    pub const fn new(entity: EntityId, elevators: Vec<EntityId>, serves: Vec<EntityId>) -> Self {
        Self {
            entity,
            elevators,
            serves,
        }
    }

    /// Line entity ID.
    #[must_use]
    pub const fn entity(&self) -> EntityId {
        self.entity
    }

    /// Elevator entities on this line.
    #[must_use]
    pub fn elevators(&self) -> &[EntityId] {
        &self.elevators
    }

    /// Stop entities served by this line.
    #[must_use]
    pub fn serves(&self) -> &[EntityId] {
        &self.serves
    }

    /// Set the line entity ID (used during snapshot restore).
    pub(crate) const fn set_entity(&mut self, entity: EntityId) {
        self.entity = entity;
    }

    /// Mutable access to elevator entities on this line.
    pub(crate) const fn elevators_mut(&mut self) -> &mut Vec<EntityId> {
        &mut self.elevators
    }

    /// Mutable access to stop entities served by this line.
    pub(crate) const fn serves_mut(&mut self) -> &mut Vec<EntityId> {
        &mut self.serves
    }
}

/// How hall calls expose rider destinations to dispatch.
///
/// Different building eras and controller designs reveal destinations
/// at different moments. Groups pick a mode so the sim can model both
/// traditional up/down collective-control elevators and modern
/// destination-dispatch lobby kiosks within the same simulation.
///
/// Stops are expected to belong to exactly one group. When a stop
/// overlaps multiple groups, the hall-call press consults the first
/// group containing it (iteration order over
/// [`Simulation::groups`](crate::sim::Simulation::groups)), which in
/// turn determines the `HallCallMode` and ack latency applied to that
/// call. Overlapping topologies are not validated at construction
/// time; games that need them should be aware of this first-match
/// rule.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[non_exhaustive]
pub enum HallCallMode {
    /// Traditional collective-control ("classic" Otis/Westinghouse).
    ///
    /// Riders press an up or down button in the hall; the destination
    /// is revealed only *after* boarding, via a
    /// [`CarCall`]. Dispatch sees a direction
    /// per call but does not know individual rider destinations until
    /// they're aboard.
    #[default]
    Classic,
    /// Modern destination dispatch ("DCS" — Otis `CompassPlus`, KONE
    /// Polaris, Schindler PORT).
    ///
    /// Riders enter their destination at a hall kiosk, so each
    /// [`HallCall`] carries a destination
    /// stop from the moment it's pressed. Required by
    /// [`DestinationDispatch`].
    Destination,
}

/// Runtime elevator group: a set of lines sharing a dispatch strategy.
///
/// A group is the logical dispatch unit. It contains one or more
/// [`LineInfo`] entries, each representing a physical path with its
/// elevators and served stops.
///
/// The flat `elevator_entities` and `stop_entities` fields are derived
/// caches (union of all lines' elevators/stops), rebuilt automatically
/// via [`rebuild_caches()`](Self::rebuild_caches).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElevatorGroup {
    /// Unique group identifier.
    id: GroupId,
    /// Human-readable group name.
    name: String,
    /// Lines belonging to this group.
    lines: Vec<LineInfo>,
    /// How hall calls reveal destinations to dispatch (Classic vs DCS).
    hall_call_mode: HallCallMode,
    /// Ticks between a button press and dispatch first seeing the call.
    /// `0` = immediate (current behavior). Realistic values: 5–30 ticks
    /// at 60 Hz, modeling controller processing latency.
    ack_latency_ticks: u32,
    /// Derived flat cache — rebuilt by `rebuild_caches()`.
    elevator_entities: Vec<EntityId>,
    /// Derived flat cache — rebuilt by `rebuild_caches()`.
    stop_entities: Vec<EntityId>,
}

impl ElevatorGroup {
    /// Create a new group with the given lines. Caches are built automatically.
    /// Defaults: [`HallCallMode::Classic`], `ack_latency_ticks = 0`.
    #[must_use]
    pub fn new(id: GroupId, name: String, lines: Vec<LineInfo>) -> Self {
        let mut group = Self {
            id,
            name,
            lines,
            hall_call_mode: HallCallMode::default(),
            ack_latency_ticks: 0,
            elevator_entities: Vec::new(),
            stop_entities: Vec::new(),
        };
        group.rebuild_caches();
        group
    }

    /// Override the hall call mode for this group.
    #[must_use]
    pub const fn with_hall_call_mode(mut self, mode: HallCallMode) -> Self {
        self.hall_call_mode = mode;
        self
    }

    /// Override the ack latency for this group.
    #[must_use]
    pub const fn with_ack_latency_ticks(mut self, ticks: u32) -> Self {
        self.ack_latency_ticks = ticks;
        self
    }

    /// Set the hall call mode in-place (for mutation via
    /// [`Simulation::groups_mut`](crate::sim::Simulation::groups_mut)).
    pub const fn set_hall_call_mode(&mut self, mode: HallCallMode) {
        self.hall_call_mode = mode;
    }

    /// Set the ack latency in-place.
    pub const fn set_ack_latency_ticks(&mut self, ticks: u32) {
        self.ack_latency_ticks = ticks;
    }

    /// Hall call mode for this group.
    #[must_use]
    pub const fn hall_call_mode(&self) -> HallCallMode {
        self.hall_call_mode
    }

    /// Controller ack latency for this group.
    #[must_use]
    pub const fn ack_latency_ticks(&self) -> u32 {
        self.ack_latency_ticks
    }

    /// Unique group identifier.
    #[must_use]
    pub const fn id(&self) -> GroupId {
        self.id
    }

    /// Human-readable group name.
    #[must_use]
    pub fn name(&self) -> &str {
        &self.name
    }

    /// Lines belonging to this group.
    #[must_use]
    pub fn lines(&self) -> &[LineInfo] {
        &self.lines
    }

    /// Mutable access to lines (call [`rebuild_caches()`](Self::rebuild_caches) after mutating).
    pub const fn lines_mut(&mut self) -> &mut Vec<LineInfo> {
        &mut self.lines
    }

    /// Elevator entities belonging to this group (derived from lines).
    #[must_use]
    pub fn elevator_entities(&self) -> &[EntityId] {
        &self.elevator_entities
    }

    /// Stop entities served by this group (derived from lines, deduplicated).
    #[must_use]
    pub fn stop_entities(&self) -> &[EntityId] {
        &self.stop_entities
    }

    /// Whether this group can serve a rider on `leg`. A `Group(g)` leg
    /// matches by group id; a `Line(l)` leg matches if `l` belongs to
    /// this group; `Walk` never rides an elevator.
    #[must_use]
    pub fn accepts_leg(&self, leg: &crate::components::RouteLeg) -> bool {
        match leg.via {
            crate::components::TransportMode::Group(g) => g == self.id,
            crate::components::TransportMode::Line(l) => {
                self.lines.iter().any(|li| li.entity() == l)
            }
            crate::components::TransportMode::Walk => false,
        }
    }

    /// Push a stop entity directly into the group's stop cache.
    ///
    /// Use when a stop belongs to the group for dispatch purposes but is
    /// not (yet) assigned to any line. Call `add_stop_to_line` later to
    /// wire it into the topology graph.
    pub(crate) fn push_stop(&mut self, stop: EntityId) {
        if !self.stop_entities.contains(&stop) {
            self.stop_entities.push(stop);
        }
    }

    /// Push an elevator entity directly into the group's elevator cache
    /// (in addition to the line it belongs to).
    pub(crate) fn push_elevator(&mut self, elevator: EntityId) {
        if !self.elevator_entities.contains(&elevator) {
            self.elevator_entities.push(elevator);
        }
    }

    /// Rebuild derived caches from lines. Call after mutating lines.
    pub fn rebuild_caches(&mut self) {
        self.elevator_entities = self
            .lines
            .iter()
            .flat_map(|li| li.elevators.iter().copied())
            .collect();
        let mut stops: Vec<EntityId> = self
            .lines
            .iter()
            .flat_map(|li| li.serves.iter().copied())
            .collect();
        stops.sort_unstable();
        stops.dedup();
        self.stop_entities = stops;
    }
}

/// Context passed to [`DispatchStrategy::rank`].
///
/// Bundles the per-call arguments into a single struct so future context
/// fields can be added without breaking existing trait implementations.
#[non_exhaustive]
pub struct RankContext<'a> {
    /// The elevator being evaluated.
    pub car: EntityId,
    /// Current position of the car along the shaft axis.
    pub car_position: f64,
    /// The stop being evaluated as a candidate destination.
    pub stop: EntityId,
    /// Position of the candidate stop along the shaft axis.
    pub stop_position: f64,
    /// The dispatch group this assignment belongs to.
    pub group: &'a ElevatorGroup,
    /// Demand snapshot for the current dispatch pass.
    pub manifest: &'a DispatchManifest,
    /// Read-only world state.
    pub world: &'a World,
}

impl std::fmt::Debug for RankContext<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("RankContext")
            .field("car", &self.car)
            .field("car_position", &self.car_position)
            .field("stop", &self.stop)
            .field("stop_position", &self.stop_position)
            .field("group", &self.group)
            .field("manifest", &self.manifest)
            .field("world", &"World { .. }")
            .finish()
    }
}

/// Pluggable dispatch algorithm.
///
/// Strategies implement [`rank`](Self::rank) to score each `(car, stop)`
/// pair; the dispatch system then performs an optimal assignment across
/// the whole group, guaranteeing that no two cars are sent to the same
/// hall call.
///
/// Returning `None` from `rank` excludes a pair from assignment — useful
/// for capacity limits, direction preferences, restricted stops, or
/// sticky commitments.
///
/// Cars that receive no stop fall through to [`fallback`](Self::fallback),
/// which returns the policy for that car (idle, park, etc.).
pub trait DispatchStrategy: Send + Sync {
    /// Optional hook called once per group before the assignment pass.
    ///
    /// Strategies that need to mutate [`World`] extension storage (e.g.
    /// [`DestinationDispatch`] writing sticky rider → car assignments)
    /// or pre-populate [`crate::components::DestinationQueue`] entries
    /// override this. Default: no-op.
    fn pre_dispatch(
        &mut self,
        _group: &ElevatorGroup,
        _manifest: &DispatchManifest,
        _world: &mut World,
    ) {
    }

    /// Optional hook called once per candidate car, before any
    /// [`rank`](Self::rank) calls for that car in the current pass.
    ///
    /// Strategies whose ranking depends on stable per-car state (e.g. the
    /// sweep direction used by SCAN/LOOK) set that state here so later
    /// `rank` calls see a consistent view regardless of iteration order.
    /// The default is a no-op.
    fn prepare_car(
        &mut self,
        _car: EntityId,
        _car_position: f64,
        _group: &ElevatorGroup,
        _manifest: &DispatchManifest,
        _world: &World,
    ) {
    }

    /// Score the cost of sending `car` to `stop`. Lower is better.
    ///
    /// Returning `None` marks this `(car, stop)` pair as unavailable;
    /// the assignment algorithm will never pair them. Use this for
    /// capacity limits, wrong-direction stops, stops outside the line's
    /// topology, or pairs already committed via a sticky assignment.
    ///
    /// Must return a finite, non-negative value if `Some` — infinities
    /// and NaN can destabilize the underlying Hungarian solver.
    ///
    /// Implementations must not mutate per-car state inside `rank`: the
    /// dispatch system calls `rank(car, stop_0..stop_m)` in a loop, so
    /// mutating `self` on one call affects subsequent calls for the same
    /// car within the same pass and produces an asymmetric cost matrix
    /// whose results depend on iteration order. Use
    /// [`prepare_car`](Self::prepare_car) to compute and store any
    /// per-car state before `rank` is called.
    fn rank(&mut self, ctx: &RankContext<'_>) -> Option<f64>;

    /// Decide what an idle car should do when no stop was assigned to it.
    ///
    /// Called for each car the assignment phase could not pair with a
    /// stop (because there were no stops, or all candidate stops had
    /// rank `None` for this car). Default: [`DispatchDecision::Idle`].
    fn fallback(
        &mut self,
        _car: EntityId,
        _car_position: f64,
        _group: &ElevatorGroup,
        _manifest: &DispatchManifest,
        _world: &World,
    ) -> DispatchDecision {
        DispatchDecision::Idle
    }

    /// Notify the strategy that an elevator has been removed.
    ///
    /// Implementations with per-elevator state (e.g. direction tracking)
    /// should clean up here to prevent unbounded memory growth.
    fn notify_removed(&mut self, _elevator: EntityId) {}

    /// If this strategy is a known built-in variant, return it so
    /// [`Simulation::new`](crate::sim::Simulation::new) can stamp the
    /// correct [`BuiltinStrategy`] into the group's snapshot identity.
    ///
    /// Without this, legacy-topology sims constructed via
    /// `Simulation::new(config, SomeNonScanStrategy::new())` silently
    /// recorded `BuiltinStrategy::Scan` as their identity — so a
    /// snapshot round-trip replaced the running strategy with Scan
    /// and produced different dispatch decisions post-restore
    /// (determinism regression).
    ///
    /// Default: `None` (unidentified — callers using the builder API
    /// should call [`SimulationBuilder::with_strategy_id`] for
    /// snapshot fidelity; custom strategies should override this if
    /// they want stable round-trip identity, typically by returning
    /// [`BuiltinStrategy::Custom`] with a stable name).
    ///
    /// [`SimulationBuilder::with_strategy_id`]: crate::builder::SimulationBuilder::with_strategy_id
    #[must_use]
    fn builtin_id(&self) -> Option<BuiltinStrategy> {
        None
    }
}

/// Resolution of a single dispatch assignment pass for one group.
///
/// Produced by `assign` and consumed by
/// `crate::systems::dispatch::run` to apply decisions to the world.
#[derive(Debug, Clone)]
pub struct AssignmentResult {
    /// `(car, decision)` pairs for every idle car in the group.
    pub decisions: Vec<(EntityId, DispatchDecision)>,
}

/// Sentinel weight used to pad unavailable `(car, stop)` pairs when
/// building the cost matrix for the Hungarian solver. Chosen so that
/// `n · SENTINEL` can't overflow `i64`: the Kuhn–Munkres implementation
/// sums weights and potentials across each row/column internally, so
/// headroom of ~2¹⁵ above the sentinel lets groups scale past 30 000
/// cars or stops before any arithmetic risk appears.
const ASSIGNMENT_SENTINEL: i64 = 1 << 48;
/// Fixed-point scale for converting `f64` costs to the `i64` values the
/// Hungarian solver requires. One unit ≈ one micro-tick / millimeter.
const ASSIGNMENT_SCALE: f64 = 1_000_000.0;

/// Convert a `f64` rank cost into the fixed-point `i64` the Hungarian
/// solver consumes. Non-finite, negative, or overflow-prone inputs map
/// to the unavailable sentinel.
fn scale_cost(cost: f64) -> i64 {
    if !cost.is_finite() || cost < 0.0 {
        debug_assert!(
            cost.is_finite() && cost >= 0.0,
            "DispatchStrategy::rank() returned invalid cost {cost}; must be finite and non-negative"
        );
        return ASSIGNMENT_SENTINEL;
    }
    // Cap at just below sentinel so any real rank always beats unavailable.
    (cost * ASSIGNMENT_SCALE)
        .round()
        .clamp(0.0, (ASSIGNMENT_SENTINEL - 1) as f64) as i64
}

/// Build the pending-demand stop list, subtracting stops whose
/// demand is already being absorbed by a car — either currently in
/// its door cycle at the stop, or en route via `MovingToStop`.
///
/// Both phases count as "servicing" because they represent a
/// commitment to open doors at the target with remaining capacity
/// that waiting riders can (typically) fit into. Without the
/// `MovingToStop` case, a new idle car becoming available during
/// car A's trip to the lobby gets paired with the same lobby call
/// on the next dispatch tick — car B travels empty behind car A
/// and the playground shows two cars doing a lobby touch-and-go
/// for one rider. Composes with the commitment set in
/// [`systems::dispatch`](crate::systems::dispatch), which excludes
/// committed cars from the idle pool at the same time.
///
/// `Stopped` (parked-with-doors-closed) is deliberately *not* in
/// the list: that's a legitimately reassignable state.
/// `Repositioning` is also excluded — a repositioning car doesn't
/// open doors on arrival, so it cannot absorb waiting riders.
///
/// Line-pinned riders (`TransportMode::Line(L)`) keep a stop
/// pending even when a car is present, because a car on Shaft A
/// can't absorb a rider pinned to Shaft B. Coverage also fails
/// when the waiting riders' combined weight exceeds the servicing
/// car's remaining capacity — the leftover spills out when doors
/// close and deserves its own dispatch immediately.
fn pending_stops_minus_covered(
    group: &ElevatorGroup,
    manifest: &DispatchManifest,
    world: &World,
    idle_cars: &[(EntityId, f64)],
) -> Vec<(EntityId, f64)> {
    // Vec + linear scan is fine: groups have O(few) elevators and
    // this runs once per dispatch tick.
    let servicing: Vec<(EntityId, EntityId, f64)> = group
        .elevator_entities()
        .iter()
        .filter_map(|&eid| {
            let car = world.elevator(eid)?;
            let target = car.target_stop()?;
            matches!(
                car.phase(),
                ElevatorPhase::MovingToStop(_)
                    | ElevatorPhase::DoorOpening
                    | ElevatorPhase::Loading
                    | ElevatorPhase::DoorClosing
            )
            .then(|| {
                let remaining = car.weight_capacity().value() - car.current_load().value();
                (target, car.line(), remaining)
            })
        })
        .collect();

    // A stop is "covered" iff every waiting rider this group sees can
    // board at least one of the door-cycling cars here (line check)
    // AND the combined remaining capacity of the cars whose line
    // accepts the rider is enough to board them all (capacity check).
    //
    // Iterates `manifest.waiting_riders_at` rather than `world.iter_riders`
    // so `TransportMode::Walk` riders and cross-group-routed riders
    // (excluded by `build_manifest`) don't inflate the weight total.
    let is_covered = |stop_eid: EntityId| {
        // Single fold so readers see the "same cars, both attributes"
        // invariant structurally — the two derived values can never
        // disagree about which cars contributed.
        let (lines_here, capacity_here): (Vec<EntityId>, f64) =
            servicing
                .iter()
                .fold((Vec::new(), 0.0), |(mut lines, cap), &(stop, line, rem)| {
                    if stop == stop_eid {
                        lines.push(line);
                        (lines, cap + rem)
                    } else {
                        (lines, cap)
                    }
                });
        if lines_here.is_empty() {
            return false;
        }
        let mut total_weight = 0.0;
        for rider in manifest.waiting_riders_at(stop_eid) {
            let required_line = world
                .route(rider.id)
                .and_then(Route::current)
                .and_then(|leg| match leg.via {
                    TransportMode::Line(l) => Some(l),
                    _ => None,
                });
            if let Some(required) = required_line
                && !lines_here.contains(&required)
            {
                return false;
            }
            total_weight += rider.weight.value();
        }
        total_weight <= capacity_here
    };

    let idle_rider_destinations: HashSet<EntityId> = idle_cars
        .iter()
        .filter_map(|&(car_eid, _)| world.elevator(car_eid))
        .flat_map(|car| car.riders().iter().copied())
        .filter_map(|rid| world.route(rid).and_then(Route::current_destination))
        .collect();

    group
        .stop_entities()
        .iter()
        .filter(|s| {
            if !manifest.has_demand(**s) {
                return false;
            }
            if idle_rider_destinations.contains(*s) {
                return true;
            }
            !is_covered(**s)
        })
        .filter_map(|s| world.stop_position(*s).map(|p| (*s, p)))
        .collect()
}

/// Run one group's assignment pass: build the cost matrix, solve the
/// optimal bipartite matching, then resolve unassigned cars via
/// [`DispatchStrategy::fallback`].
///
/// Visible to the `systems` module; not part of the public API.
pub(crate) fn assign(
    strategy: &mut dyn DispatchStrategy,
    idle_cars: &[(EntityId, f64)],
    group: &ElevatorGroup,
    manifest: &DispatchManifest,
    world: &World,
) -> AssignmentResult {
    // Collect stops with active demand and known positions, excluding
    // any whose demand is already being absorbed by a car mid door
    // cycle (see `pending_stops_minus_covered` for the why).
    let pending_stops = pending_stops_minus_covered(group, manifest, world, idle_cars);

    let n = idle_cars.len();
    let m = pending_stops.len();

    if n == 0 {
        return AssignmentResult {
            decisions: Vec::new(),
        };
    }

    let mut decisions: Vec<(EntityId, DispatchDecision)> = Vec::with_capacity(n);

    if m == 0 {
        for &(eid, pos) in idle_cars {
            let d = strategy.fallback(eid, pos, group, manifest, world);
            decisions.push((eid, d));
        }
        return AssignmentResult { decisions };
    }

    // Build cost matrix. Hungarian requires rows <= cols.
    let cols = n.max(m);
    let mut data: Vec<i64> = vec![ASSIGNMENT_SENTINEL; n * cols];
    for (i, &(car_eid, car_pos)) in idle_cars.iter().enumerate() {
        strategy.prepare_car(car_eid, car_pos, group, manifest, world);
        // Cache the car's restricted-stops set for this row so each
        // (car, stop) pair can short-circuit before calling rank().
        // Pre-fix only DCS consulted restricted_stops; SCAN/LOOK/NC/ETD
        // happily ranked restricted pairs and `commit_go_to_stop` later
        // silently dropped the assignment, starving the call. (#256)
        let restricted = world
            .elevator(car_eid)
            .map(|c| c.restricted_stops().clone())
            .unwrap_or_default();
        for (j, &(stop_eid, stop_pos)) in pending_stops.iter().enumerate() {
            if restricted.contains(&stop_eid) {
                continue; // leave SENTINEL — this pair is unavailable
            }
            let ctx = RankContext {
                car: car_eid,
                car_position: car_pos,
                stop: stop_eid,
                stop_position: stop_pos,
                group,
                manifest,
                world,
            };
            let scaled = strategy.rank(&ctx).map_or(ASSIGNMENT_SENTINEL, scale_cost);
            data[i * cols + j] = scaled;
        }
    }
    // `from_vec` only fails if `n * cols != data.len()` — both derived
    // from `n` and `cols` above, so the construction is infallible. Fall
    // back to an empty-result shape in the unlikely event the invariant
    // is violated in future refactors.
    let Ok(matrix) = pathfinding::matrix::Matrix::from_vec(n, cols, data) else {
        for &(car_eid, car_pos) in idle_cars {
            let d = strategy.fallback(car_eid, car_pos, group, manifest, world);
            decisions.push((car_eid, d));
        }
        return AssignmentResult { decisions };
    };
    let (_, assignments) = pathfinding::kuhn_munkres::kuhn_munkres_min(&matrix);

    for (i, &(car_eid, car_pos)) in idle_cars.iter().enumerate() {
        let col = assignments[i];
        // A real assignment is: col points to a real stop (col < m) AND
        // the cost isn't sentinel-padded (meaning rank() returned Some).
        if col < m && matrix[(i, col)] < ASSIGNMENT_SENTINEL {
            let (stop_eid, _) = pending_stops[col];
            decisions.push((car_eid, DispatchDecision::GoToStop(stop_eid)));
        } else {
            let d = strategy.fallback(car_eid, car_pos, group, manifest, world);
            decisions.push((car_eid, d));
        }
    }

    AssignmentResult { decisions }
}

/// Pluggable strategy for repositioning idle elevators.
///
/// After the dispatch phase, elevators that remain idle (no pending
/// assignments) are candidates for repositioning. The strategy decides
/// where each idle elevator should move to improve coverage and reduce
/// expected response times.
///
/// Implementations receive the set of idle elevator positions and the
/// group's stop positions, then return a target stop for each elevator
/// (or `None` to leave it in place).
pub trait RepositionStrategy: Send + Sync {
    /// Decide where to reposition idle elevators.
    ///
    /// Push `(elevator_entity, target_stop_entity)` pairs into `out`.
    /// The buffer is cleared before each call — implementations should
    /// only push, never read prior contents. Elevators not pushed remain idle.
    fn reposition(
        &mut self,
        idle_elevators: &[(EntityId, f64)],
        stop_positions: &[(EntityId, f64)],
        group: &ElevatorGroup,
        world: &World,
        out: &mut Vec<(EntityId, EntityId)>,
    );
}

/// Serializable identifier for built-in repositioning strategies.
///
/// Used in config and snapshots to restore the correct strategy.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[non_exhaustive]
pub enum BuiltinReposition {
    /// Distribute idle elevators evenly across stops.
    SpreadEvenly,
    /// Return idle elevators to a configured home stop.
    ReturnToLobby,
    /// Position near stops with historically high demand.
    DemandWeighted,
    /// Keep idle elevators where they are (no-op).
    NearestIdle,
    /// Pre-position cars near stops with the highest recent arrival rate.
    PredictiveParking,
    /// Mode-gated: picks between `ReturnToLobby` / `PredictiveParking`
    /// based on the current `TrafficDetector` mode.
    Adaptive,
    /// Custom strategy identified by name.
    Custom(String),
}

impl std::fmt::Display for BuiltinReposition {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::SpreadEvenly => write!(f, "SpreadEvenly"),
            Self::ReturnToLobby => write!(f, "ReturnToLobby"),
            Self::DemandWeighted => write!(f, "DemandWeighted"),
            Self::NearestIdle => write!(f, "NearestIdle"),
            Self::PredictiveParking => write!(f, "PredictiveParking"),
            Self::Adaptive => write!(f, "Adaptive"),
            Self::Custom(name) => write!(f, "Custom({name})"),
        }
    }
}

impl BuiltinReposition {
    /// Instantiate the reposition strategy for this variant.
    ///
    /// Returns `None` for `Custom` — the game must provide those via
    /// a factory function. `ReturnToLobby` uses stop index 0 as default.
    #[must_use]
    pub fn instantiate(&self) -> Option<Box<dyn RepositionStrategy>> {
        match self {
            Self::SpreadEvenly => Some(Box::new(reposition::SpreadEvenly)),
            Self::ReturnToLobby => Some(Box::new(reposition::ReturnToLobby::new())),
            Self::DemandWeighted => Some(Box::new(reposition::DemandWeighted)),
            Self::NearestIdle => Some(Box::new(reposition::NearestIdle)),
            Self::PredictiveParking => Some(Box::new(reposition::PredictiveParking::new())),
            Self::Adaptive => Some(Box::new(reposition::AdaptiveParking::new())),
            Self::Custom(_) => None,
        }
    }
}
