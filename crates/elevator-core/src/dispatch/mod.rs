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
//! use elevator_core::dispatch::RankContext;
//! use elevator_core::prelude::*;
//!
//! struct AlwaysFirstStop;
//!
//! impl DispatchStrategy for AlwaysFirstStop {
//!     fn rank(&self, ctx: &RankContext<'_>) -> Option<f64> {
//!         // Prefer the group's first stop; everything else is unavailable.
//!         if Some(&ctx.stop) == ctx.group.stop_entities().first() {
//!             Some((ctx.car_position() - ctx.stop_position()).abs())
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

/// Hungarian-assignment pass + per-pass scratch buffers.
pub(crate) mod assignment;
/// Hall-call destination dispatch algorithm.
pub mod destination;
/// Estimated Time to Destination dispatch algorithm.
pub mod etd;
/// LOOK dispatch algorithm.
pub mod look;
/// Per-tick demand picture handed to dispatch strategies.
pub mod manifest;
/// Nearest-car dispatch algorithm.
pub mod nearest_car;
/// Built-in repositioning strategies.
pub mod reposition;
/// Relative System Response (RSR) dispatch algorithm.
pub mod rsr;
/// SCAN dispatch algorithm.
pub mod scan;
/// Per-elevator scratch helper for custom strategies.
pub mod scratch;
/// Shared sweep-direction logic used by SCAN and LOOK.
pub(crate) mod sweep;

pub use assignment::AssignmentResult;
#[cfg(test)]
pub(crate) use assignment::assign;
pub(crate) use assignment::{DispatchScratch, assign_with_scratch};
pub use destination::{AssignedCar, DestinationDispatch};
pub use etd::EtdDispatch;
pub use look::LookDispatch;
pub use manifest::{DispatchManifest, RiderInfo};
pub use nearest_car::NearestCarDispatch;
pub use rsr::RsrDispatch;
pub use scan::ScanDispatch;
pub use scratch::PrepareScratch;

use serde::{Deserialize, Serialize};

use crate::components::Route;
use crate::entity::EntityId;
use crate::ids::GroupId;
use crate::world::World;

/// Whether assigning `ctx.car` to `ctx.stop` is worth ranking.
///
/// Combines two checks every dispatch strategy needs at the top of its
/// `rank` implementation:
///
/// 1. **Servability** — capacity, full-load bypass, and the loading-phase
///    boarding filter. A pair that can't exit an aboard rider, board a
///    waiter, or answer a rider-less hall call is a no-op move (and a
///    zero-cost one when the car is already parked there) which would
///    otherwise stall doors against unservable demand.
/// 2. **Path discipline** (only when `respect_aboard_path` is `true`) —
///    refuses pickups that would pull a car carrying routed riders off
///    the direct path to every aboard rider's destination. Without it, a
///    stream of closer-destination hall calls can indefinitely preempt a
///    farther aboard rider's delivery (the "never reaches the
///    passenger's desired stop" loop).
///
/// Strategies with their own direction discipline (SCAN, LOOK, ETD,
/// Destination) pass `respect_aboard_path: false` because their
/// sweep/direction terms already rule out backtracks. Strategies without
/// it (`NearestCar`, RSR) pass `respect_aboard_path: true`. Custom
/// strategies should pass `true` unless they enforce direction
/// discipline themselves.
///
/// Aboard riders without a published route (game-managed manual riders)
/// don't constrain the path — any pickup is trivially on-the-way for
/// them, so the path check trivially passes when no aboard rider has a
/// `Route::current_destination`.
#[must_use]
pub fn pair_is_useful(ctx: &RankContext<'_>, respect_aboard_path: bool) -> bool {
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
    let servable = if waiting.is_empty() {
        // No waiters at the stop, and no aboard rider of ours exits here
        // (the `can_exit_here` short-circuit ruled that out above).
        // Demand must therefore come from either another car's
        // `riding_to_stop` (not work this car can perform) or a
        // rider-less hall call (someone pressed a button with no rider
        // attached yet — a press from `press_hall_button` or one whose
        // riders have since been fulfilled or abandoned). Only the
        // latter is actionable; without this filter an idle car parked
        // at the stop collapses to cost 0, the Hungarian picks the
        // self-pair every tick, and doors cycle open/close indefinitely
        // while the other car finishes its trip.
        ctx.manifest
            .hall_calls_at_stop
            .get(&ctx.stop)
            .is_some_and(|calls| calls.iter().any(|c| c.pending_riders.is_empty()))
    } else {
        waiting
            .iter()
            .any(|r| rider_can_board(r, car, ctx, remaining_capacity))
    };
    if !servable {
        return false;
    }
    if !respect_aboard_path || car.riders().is_empty() {
        return true;
    }

    // Route-less aboard riders (game-managed manual riders) don't
    // publish a destination, so there's no committed path to protect.
    // Any pickup is trivially on-the-way — let it through. Otherwise
    // we'd refuse every pickup the moment the car carried its first
    // manually-managed passenger.
    let has_routed_rider = car.riders().iter().any(|&rid| {
        ctx.world
            .route(rid)
            .and_then(Route::current_destination)
            .is_some()
    });
    if !has_routed_rider {
        return true;
    }

    // Pickups allowed only on the path to an aboard rider's destination.
    // Candidate at the car's position (to_cand = 0) trivially qualifies —
    // useful for same-floor boards.
    let to_cand = ctx.stop_position() - ctx.car_position();
    car.riders().iter().any(|&rid| {
        let Some(dest) = ctx.world.route(rid).and_then(Route::current_destination) else {
            return false;
        };
        let Some(dest_pos) = ctx.world.stop_position(dest) else {
            return false;
        };
        let to_dest = dest_pos - ctx.car_position();
        to_dest * to_cand >= 0.0 && to_cand.abs() <= to_dest.abs()
    })
}

/// Sum of `wait_ticks` across `riders`, as `f64`.
///
/// Helper used by ETD and RSR fairness terms — both compute the same
/// `riders.iter().map(|r| r.wait_ticks as f64).sum()` and feed the
/// result into a fused-multiply-add against a configured weight.
#[must_use]
pub(crate) fn wait_ticks_sum(riders: &[RiderInfo]) -> f64 {
    riders.iter().map(|r| r.wait_ticks as f64).sum()
}

/// Sum of squared `wait_ticks` across `riders`, as `f64`.
///
/// Used by ETD's quadratic-fairness term to escalate cost as old
/// waiters age. RSR has no quadratic fairness; the linear form lives
/// in [`wait_ticks_sum`].
#[must_use]
pub(crate) fn wait_ticks_squared_sum(riders: &[RiderInfo]) -> f64 {
    riders
        .iter()
        .map(|r| {
            let w = r.wait_ticks as f64;
            w * w
        })
        .sum()
}

/// Apply a fairness bonus to a dispatch cost, clamping at zero.
///
/// Computes `(cost - weight * term).max(0.0)` via [`fp::fma`] for
/// tighter rounding than the manual `cost - weight * term` form when
/// the multiplier and product are both finite.
///
/// Both ETD's `age_linear` / `wait_squared` weights and RSR's
/// `age_linear_weight` use this exact shape — a non-negative
/// `weight` scaled against a non-negative aggregate (`wait_ticks_sum`
/// / `wait_ticks_squared_sum`) subtracted from the running cost. The
/// `.max(0.0)` floor is mandatory because the Hungarian assignment
/// requires non-negative costs; without it, deeply-aged waits could
/// underflow the cost into the negative territory, where the assigner's
/// row-reduction step would produce a smaller-than-zero pseudo-cost
/// and silently mis-rank.
///
/// [`fp::fma`]: crate::fp::fma
#[must_use]
pub(crate) fn apply_fairness_bonus(cost: f64, weight: f64, term: f64) -> f64 {
    crate::fp::fma(weight, -term, cost).max(0.0)
}

/// Whether a waiting rider could actually board this car, matching the
/// same filters the loading phase applies. Prevents `pair_is_useful`
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
    if dest_pos > ctx.stop_position() && !car.going_up() {
        return false;
    }
    if dest_pos < ctx.stop_position() && !car.going_down() {
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
    let going_up = target_pos > ctx.car_position();
    let going_down = target_pos < ctx.car_position();
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
    let stop_above = ctx.stop_position() > ctx.car_position();
    let stop_below = ctx.stop_position() < ctx.car_position();
    (going_up && stop_above) || (going_down && stop_below)
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
            // `Default` ships the tuned stack (age-linear fairness term
            // active); `new()` is the zero baseline for mutant/unit
            // tests that isolate single terms. The playground's "ETD"
            // dropdown entry should map to the strategy with fairness
            // protection, not the raw version that lets the max-wait
            // tail drift unbounded.
            Self::Etd => Some(Box::new(etd::EtdDispatch::default())),
            Self::Destination => Some(Box::new(destination::DestinationDispatch::new())),
            // `Default` ships with the tuned penalty stack; `new()` is
            // the zero baseline for additive-composition tests. The
            // playground's "RSR" dropdown entry should map to the
            // actual strategy, not to NearestCar-in-disguise, so use
            // `Default` here.
            Self::Rsr => Some(Box::new(rsr::RsrDispatch::default())),
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

    /// Add an elevator to this line, deduplicating against existing entries.
    ///
    /// Returns `true` if the elevator was inserted, `false` if it was
    /// already present. Replaces direct `&mut Vec` access so callers
    /// can't introduce duplicates the dedup invariants in
    /// [`ElevatorGroup::rebuild_caches`] rely on.
    pub(crate) fn add_elevator(&mut self, elevator: EntityId) -> bool {
        if self.elevators.contains(&elevator) {
            false
        } else {
            self.elevators.push(elevator);
            true
        }
    }

    /// Remove an elevator from this line.
    ///
    /// Returns `true` if the elevator was present and removed, `false`
    /// if it was absent.
    pub(crate) fn remove_elevator(&mut self, elevator: EntityId) -> bool {
        let len_before = self.elevators.len();
        self.elevators.retain(|&e| e != elevator);
        self.elevators.len() != len_before
    }

    /// Add a stop to this line's served list, deduplicating against
    /// existing entries.
    ///
    /// Returns `true` if the stop was inserted, `false` if it was
    /// already present.
    pub(crate) fn add_stop(&mut self, stop: EntityId) -> bool {
        if self.serves.contains(&stop) {
            false
        } else {
            self.serves.push(stop);
            true
        }
    }

    /// Remove a stop from this line's served list.
    ///
    /// Returns `true` if the stop was present and removed, `false`
    /// if it was absent.
    pub(crate) fn remove_stop(&mut self, stop: EntityId) -> bool {
        let len_before = self.serves.len();
        self.serves.retain(|&s| s != stop);
        self.serves.len() != len_before
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
    /// [`CarCall`](crate::components::CarCall). Dispatch sees a direction
    /// per call but does not know individual rider destinations until
    /// they're aboard.
    #[default]
    Classic,
    /// Modern destination dispatch ("DCS" — Otis `CompassPlus`, KONE
    /// Polaris, Schindler PORT).
    ///
    /// Riders enter their destination at a hall kiosk, so each
    /// [`HallCall`](crate::components::HallCall) carries a destination
    /// stop from the moment it's pressed. Required by
    /// [`DestinationDispatch`].
    Destination,
}

impl std::fmt::Display for HallCallMode {
    /// ```
    /// # use elevator_core::dispatch::HallCallMode;
    /// assert_eq!(format!("{}", HallCallMode::Classic), "classic");
    /// assert_eq!(format!("{}", HallCallMode::Destination), "destination");
    /// ```
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Classic => f.write_str("classic"),
            Self::Destination => f.write_str("destination"),
        }
    }
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

/// Look up the `serves` list for an elevator's line.
///
/// Walks `groups` to find the [`LineInfo`] whose entity matches the
/// car's current `line()`. Returns `None` if the car has no line
/// registered in any group (an inconsistent state — should be
/// unreachable in a healthy sim).
///
/// Helper for callers of
/// [`World::find_stop_at_position_in`](crate::world::World::find_stop_at_position_in)
/// that already have group context: `find_stop_at_position(pos)` is
/// global (any line wins) and ambiguous when two lines share a
/// position; passing the elevator's serves list scopes the lookup to
/// *its* line.
///
/// Cost: `O(groups × lines_per_group)` per call. For loops over many
/// elevators per tick, prefer [`build_line_serves_index`] +
/// [`elevator_line_serves_indexed`] to amortize the line walk.
#[must_use]
pub fn elevator_line_serves<'a>(
    world: &World,
    groups: &'a [ElevatorGroup],
    elevator: EntityId,
) -> Option<&'a [EntityId]> {
    let line_eid = world.elevator(elevator)?.line();
    groups
        .iter()
        .flat_map(ElevatorGroup::lines)
        .find(|li| li.entity() == line_eid)
        .map(LineInfo::serves)
}

/// Pre-built index mapping each line entity to its `serves` slice.
/// Built once with [`build_line_serves_index`]; queried with
/// [`elevator_line_serves_indexed`] for O(1) per-elevator lookup.
pub type LineServesIndex<'a> = std::collections::HashMap<EntityId, &'a [EntityId]>;

/// Build a [`LineServesIndex`] from the group list. O(groups × lines).
/// Call once per substep / system and reuse across the elevator loop.
#[must_use]
pub fn build_line_serves_index(groups: &[ElevatorGroup]) -> LineServesIndex<'_> {
    let mut idx: LineServesIndex<'_> = std::collections::HashMap::new();
    for li in groups.iter().flat_map(ElevatorGroup::lines) {
        idx.insert(li.entity(), li.serves());
    }
    idx
}

/// Indexed variant of [`elevator_line_serves`]. O(1) per call given
/// a pre-built [`LineServesIndex`].
#[must_use]
pub fn elevator_line_serves_indexed<'a>(
    world: &World,
    index: &LineServesIndex<'a>,
    elevator: EntityId,
) -> Option<&'a [EntityId]> {
    let line_eid = world.elevator(elevator)?.line();
    index.get(&line_eid).copied()
}

/// Context passed to [`DispatchStrategy::rank`].
///
/// Bundles the per-call arguments into a single struct so future context
/// fields can be added without breaking existing trait implementations.
#[non_exhaustive]
pub struct RankContext<'a> {
    /// The elevator being evaluated.
    pub car: EntityId,
    /// The stop being evaluated as a candidate destination.
    pub stop: EntityId,
    /// The dispatch group this assignment belongs to.
    pub group: &'a ElevatorGroup,
    /// Demand snapshot for the current dispatch pass.
    pub manifest: &'a DispatchManifest,
    /// Read-only world state.
    pub world: &'a World,
}

impl RankContext<'_> {
    /// Position of [`car`](Self::car) along the shaft axis.
    ///
    /// Returns `0.0` for an entity that has no `Position` component
    /// (which would never reach this method through normal dispatch
    /// — `compute_assignments` filters out cars without positions
    /// upstream — but the defensive default protects custom callers).
    /// Derived from [`world`](Self::world) on each call: the dispatch
    /// loop never moves elevators between rank calls, so re-deriving
    /// is free, and skipping the duplicate field eliminates the
    /// synchronisation risk of the old shape.
    #[must_use]
    pub fn car_position(&self) -> f64 {
        self.world.position(self.car).map_or(0.0, |p| p.value)
    }

    /// Position of [`stop`](Self::stop) along the shaft axis.
    ///
    /// Returns `0.0` for an entity that has no `Stop` component (same
    /// rationale as [`car_position`](Self::car_position)).
    #[must_use]
    pub fn stop_position(&self) -> f64 {
        self.world.stop_position(self.stop).unwrap_or(0.0)
    }
}

impl std::fmt::Debug for RankContext<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("RankContext")
            .field("car", &self.car)
            .field("car_position", &self.car_position())
            .field("stop", &self.stop)
            .field("stop_position", &self.stop_position())
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
    /// Takes `&self` so the assignment loop can score `(car, stop)` pairs
    /// in any order without producing an asymmetric cost matrix. Compute
    /// any per-car scratch in [`prepare_car`](Self::prepare_car) (which
    /// takes `&mut self`) before this method is called.
    fn rank(&self, ctx: &RankContext<'_>) -> Option<f64>;

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
    /// Default: `None` (unidentified — the constructor falls back to
    /// recording [`BuiltinStrategy::Scan`], matching pre-fix behaviour
    /// for callers that never cared about round-trip identity). Custom
    /// strategies that DO care should override this to return
    /// [`BuiltinStrategy::Custom`] with a stable name.
    #[must_use]
    fn builtin_id(&self) -> Option<BuiltinStrategy> {
        None
    }

    /// Serialize this strategy's tunable configuration to a string
    /// that [`restore_config`](Self::restore_config) can apply to a
    /// freshly-instantiated instance.
    ///
    /// Returning `Some(..)` makes the configuration survive snapshot
    /// round-trip: without it, [`crate::snapshot::WorldSnapshot::restore`]
    /// instantiates each built-in via [`BuiltinStrategy::instantiate`],
    /// which calls `::new()` with default weights — silently dropping
    /// any tuning applied via `with_*` builder methods (e.g.
    /// `EtdDispatch::with_delay_weight(2.5)` degrades to the default
    /// `1.0` on the restored sim).
    ///
    /// Default: `None` (no configuration to save). Built-ins with
    /// tunable weights override to return a RON-serialized copy of
    /// themselves; strategies with transient per-pass scratch should
    /// use `#[serde(skip)]` on those fields so the snapshot stays
    /// compact and deterministic.
    #[must_use]
    fn snapshot_config(&self) -> Option<String> {
        None
    }

    /// Restore tunable configuration from a string previously produced
    /// by [`snapshot_config`](Self::snapshot_config) on the same
    /// strategy variant. Called by
    /// [`crate::snapshot::WorldSnapshot::restore`] immediately after
    /// [`BuiltinStrategy::instantiate`] builds the default instance,
    /// so the restore writes over the defaults.
    ///
    /// # Errors
    /// Returns the underlying parse error as a `String` when the
    /// serialized form doesn't round-trip. Default implementation
    /// ignores the argument and returns `Ok(())` — paired with the
    /// `None` default of `snapshot_config`, this means strategies that
    /// don't override either method skip configuration round-trip,
    /// matching pre-fix behaviour.
    fn restore_config(&mut self, _serialized: &str) -> Result<(), String> {
        Ok(())
    }

    /// Maximum candidate stops the assignment phase considers per car.
    ///
    /// `Some(K)` keeps only the K nearest viable pending stops per
    /// idle car when filling the cost matrix; the rest are sentinel-
    /// scored so the Hungarian skips them. `None` disables pruning
    /// (full matrix). The default is `Some(50)` — generous enough to
    /// preserve optimality on real-building loads (≤200 stops, ≤50
    /// cars) while cutting per-cell `rank()` calls ~90× at extreme
    /// scale (5000 stops × 500 cars). Researchers and tests asserting
    /// global-optimal assignments can opt out via the strategy's
    /// `with_candidate_limit(None)` builder.
    ///
    /// "Nearest" here means absolute axial distance
    /// (`|car_pos - stop_pos|`) with `(distance, EntityId)` tie-break
    /// for snapshot-determinism. Line-restriction and
    /// [`Elevator::restricted_stops`](crate::components::Elevator::restricted_stops)
    /// filtering happens *before* the top-K cut, so a car always
    /// sees up to K *viable* candidates rather than K nominal ones
    /// of which most are unreachable.
    ///
    /// Strategies that don't go through the Hungarian path
    /// ([`scan::ScanDispatch`], [`look::LookDispatch`],
    /// [`nearest_car::NearestCarDispatch`]) inherit the default but
    /// it's a no-op for them — their per-car `rank` is independent
    /// of matrix size.
    #[must_use]
    fn candidate_limit(&self) -> Option<usize> {
        Some(DEFAULT_CANDIDATE_LIMIT)
    }
}

/// Default per-car candidate limit applied by the
/// [`DispatchStrategy::candidate_limit`] trait default.
///
/// Strategies that build with a custom limit override the trait method
/// to return their stored value; opting out (`None`) disables pruning
/// entirely.
pub const DEFAULT_CANDIDATE_LIMIT: usize = 50;

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

    /// If this strategy is a known built-in variant, return it so
    /// [`Simulation::set_reposition`](crate::sim::Simulation::set_reposition)
    /// callers don't have to pass a separate [`BuiltinReposition`] id
    /// that might drift from the dispatcher's actual type.
    ///
    /// Mirrors the pattern introduced for [`DispatchStrategy::builtin_id`]
    /// in #410: the runtime impl identifies itself so the snapshot
    /// identity always matches the executing behaviour, instead of
    /// depending on the caller to keep two parameters consistent.
    /// Default `None` — custom strategies should override to return
    /// [`BuiltinReposition::Custom`] with a stable name for snapshot
    /// fidelity.
    #[must_use]
    fn builtin_id(&self) -> Option<BuiltinReposition> {
        None
    }

    /// Minimum [`ArrivalLog`](crate::arrival_log::ArrivalLog) retention
    /// (in ticks) the strategy needs to function. Strategies that read
    /// the log directly with a custom rolling window must override this
    /// so [`Simulation::set_reposition`](crate::sim::Simulation::set_reposition)
    /// can widen
    /// [`ArrivalLogRetention`](crate::arrival_log::ArrivalLogRetention)
    /// to keep the data alive long enough for the query.
    ///
    /// Default `0` — strategies that don't read the arrival log (or that
    /// only consume it through [`DispatchManifest::arrivals_at`], which
    /// already tracks retention) impose no requirement.
    #[must_use]
    fn min_arrival_log_window(&self) -> u64 {
        0
    }
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
