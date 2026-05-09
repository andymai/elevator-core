//! Hungarian-assignment pass and per-pass scratch buffers.
//!
//! This module owns the optimal-bipartite-matching machinery that
//! consumes a [`DispatchStrategy`]'s `rank` outputs and turns them
//! into one [`DispatchDecision`] per idle car. It's the bottom of
//! the dispatch stack — strategies hand it scores, hosts hand it the
//! manifest, and `systems::dispatch::run` calls it once per group
//! per tick.

use std::collections::HashSet;

use crate::components::{ElevatorPhase, Route, TransportMode};
use crate::entity::EntityId;
use crate::world::World;

use super::{
    DispatchDecision, DispatchManifest, DispatchStrategy, ElevatorGroup, LineInfo, RankContext,
};

/// Resolution of a single dispatch assignment pass for one group.
///
/// Produced by `assign` and consumed by
/// `crate::systems::dispatch::run` to apply decisions to the world.
#[derive(Debug, Clone)]
pub struct AssignmentResult {
    /// `(car, decision)` pairs for every idle car in the group.
    pub decisions: Vec<(EntityId, DispatchDecision)>,
}

/// Per-simulation scratch buffers for the dispatch phase.
///
/// Every field is a `Vec`/`HashSet` whose allocations the hot path
/// would otherwise re-take on every tick per group (cost matrix
/// backing store, pending-stops list, servicing cars, pinned /
/// committed / idle-elevator filters). Owning them on the
/// simulation lets each dispatch pass `clear()` them in place and
/// reuse the capacity — on a 50-car × 200-stop group the cost matrix
/// alone is ~80 KB of heap churn per tick, and at the 500-car
/// `scaling_extreme` scale it's ~20 MB.
///
/// The scratch is always cleared before use; consumers should not
/// rely on any carry-over content between groups or ticks.
#[derive(Default)]
pub struct DispatchScratch {
    /// Reusable `Matrix<i64>` the Hungarian consumes by reference. When
    /// the dispatch pass can reuse the stored Matrix (`rows × cols`
    /// match), this is `Some` and gets filled in-place via `Matrix::fill`;
    /// when shapes change the slot is replaced with `Matrix::new`.
    pub cost_matrix_mx: Option<pathfinding::matrix::Matrix<i64>>,
    /// `(stop, line, remaining_capacity)` for door-cycling cars, used
    /// by `pending_stops_minus_covered` to avoid double-dispatching
    /// stops a car is already servicing.
    pub servicing: Vec<(EntityId, EntityId, f64)>,
    /// Stops with live demand, returned from `pending_stops_minus_covered`.
    pub pending_stops: Vec<(EntityId, f64)>,
    /// Aboard-rider destinations across idle cars — consulted so a
    /// stop that a car aboard wants to reach stays pickup-eligible.
    pub idle_rider_destinations: HashSet<EntityId>,
    /// Per-stop linestamp buffer reused inside `is_covered`.
    pub lines_here: Vec<EntityId>,
    /// Pinned hall-call `(car, stop)` pairs for the current group.
    pub pinned_pairs: Vec<(EntityId, EntityId)>,
    /// Committed `(car, target)` pairs — mid-flight cars whose trip
    /// still has demand; held out of the Hungarian idle pool.
    pub committed_pairs: Vec<(EntityId, EntityId)>,
    /// Idle elevator pool `(car, position)` for this group.
    pub idle_elevators: Vec<(EntityId, f64)>,
    /// Per-car `(distance, pending_stops_index)` buffer used by the
    /// top-K candidate-pruning pass. Cleared and refilled per row in
    /// the matrix-fill loop; capacity carries across cars and ticks.
    pub top_k_buf: Vec<(f64, usize)>,
}

impl DispatchScratch {
    /// Clear every buffer without freeing its backing capacity.
    ///
    /// `cost_matrix_mx` is re-sized/re-filled lazily in
    /// `assign_with_scratch`; leaving it alone here preserves its
    /// capacity when the group's (rows, cols) match the last
    /// dispatch pass. `top_k_buf` is cleared per-row inside the
    /// matrix-fill loop, not here.
    pub fn clear_all(&mut self) {
        self.servicing.clear();
        self.pending_stops.clear();
        self.idle_rider_destinations.clear();
        self.lines_here.clear();
        self.pinned_pairs.clear();
        self.committed_pairs.clear();
        self.idle_elevators.clear();
    }
}

/// Sentinel weight used to pad unavailable `(car, stop)` pairs when
/// building the cost matrix for the Hungarian solver. Chosen so that
/// `n · SENTINEL` can't overflow `i64`: the Kuhn–Munkres implementation
/// sums weights and potentials across each row/column internally, so
/// headroom of ~2¹⁵ above the sentinel lets groups scale past 30 000
/// cars or stops before any arithmetic risk appears.
const ASSIGNMENT_SENTINEL: i64 = 1 << 48;
/// Fixed-point scale for converting `f64` costs to the `i64` values the
/// Hungarian solver requires. One unit ≈ one micro-tick / millimeter:
/// the smallest meaningful rank delta is sub-tick / sub-millimeter, so
/// scaling by 1e6 keeps that delta as a 1-unit `i64` difference and
/// preserves the strategy's tie-breaking precision through the cast.
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
    scratch: &mut DispatchScratch,
) {
    // Refill `scratch.servicing` in place — the buffer survives across
    // ticks so the hot path doesn't reallocate per group.
    scratch.servicing.clear();
    for &eid in group.elevator_entities() {
        let Some(car) = world.elevator(eid) else {
            continue;
        };
        let Some(target) = car.target_stop() else {
            continue;
        };
        if !matches!(
            car.phase(),
            ElevatorPhase::MovingToStop(_)
                | ElevatorPhase::DoorOpening
                | ElevatorPhase::Loading
                | ElevatorPhase::DoorClosing
        ) {
            continue;
        }
        let remaining = car.weight_capacity().value() - car.current_load().value();
        scratch.servicing.push((target, car.line(), remaining));
    }

    // Aboard-rider destinations — reused buffer, same owned semantics.
    scratch.idle_rider_destinations.clear();
    for &(car_eid, _) in idle_cars {
        if let Some(car) = world.elevator(car_eid) {
            for &rid in car.riders() {
                if let Some(dest) = world.route(rid).and_then(Route::current_destination) {
                    scratch.idle_rider_destinations.insert(dest);
                }
            }
        }
    }

    // A stop is "covered" iff every waiting rider this group sees can
    // board at least one of the door-cycling cars here (line check)
    // AND the combined remaining capacity of the cars whose line
    // accepts the rider is enough to board them all (capacity check).
    //
    // Iterates `manifest.waiting_riders_at` rather than `world.iter_riders`
    // so `TransportMode::Walk` riders and cross-group-routed riders
    // (excluded by `build_manifest`) don't inflate the weight total.
    // `lines_here` is the same `scratch.lines_here` buffer each call —
    // cleared then refilled — so coverage checks don't churn the
    // allocator per stop.
    let mut lines_here: Vec<EntityId> = std::mem::take(&mut scratch.lines_here);
    let servicing = &scratch.servicing;
    let is_covered = |stop_eid: EntityId, lines_here: &mut Vec<EntityId>| -> bool {
        lines_here.clear();
        let mut capacity_here = 0.0;
        for &(stop, line, rem) in servicing {
            if stop == stop_eid {
                lines_here.push(line);
                capacity_here += rem;
            }
        }
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

    scratch.pending_stops.clear();
    for &stop in group.stop_entities() {
        if !manifest.has_demand(stop) {
            continue;
        }
        let keep =
            scratch.idle_rider_destinations.contains(&stop) || !is_covered(stop, &mut lines_here);
        if !keep {
            continue;
        }
        if let Some(pos) = world.stop_position(stop) {
            scratch.pending_stops.push((stop, pos));
        }
    }
    // Return the lines_here buffer to scratch so its capacity survives.
    scratch.lines_here = lines_here;
}

/// Run one group's assignment pass: build the cost matrix, solve the
/// optimal bipartite matching, then resolve unassigned cars via
/// [`DispatchStrategy::fallback`].
///
/// Visible to the `systems` module; not part of the public API.
/// Back-compat wrapper that allocates a throw-away scratch for
/// tests and one-off callers. Production paths (in
/// `crate::systems::dispatch::run`) must use
/// [`assign_with_scratch`] so the scratch capacity amortises
/// across ticks.
#[cfg(test)]
pub fn assign(
    strategy: &mut dyn DispatchStrategy,
    idle_cars: &[(EntityId, f64)],
    group: &ElevatorGroup,
    manifest: &DispatchManifest,
    world: &World,
) -> AssignmentResult {
    let mut scratch = DispatchScratch::default();
    assign_with_scratch(strategy, idle_cars, group, manifest, world, &mut scratch)
}

/// Run one group's assignment pass: build the cost matrix, solve the
/// optimal bipartite matching, then resolve unassigned cars via
/// [`DispatchStrategy::fallback`]. Uses `scratch` so the per-tick
/// allocations (cost matrix, pending stops, etc.) reuse capacity
/// across invocations.
#[allow(clippy::too_many_lines)]
pub fn assign_with_scratch(
    strategy: &mut dyn DispatchStrategy,
    idle_cars: &[(EntityId, f64)],
    group: &ElevatorGroup,
    manifest: &DispatchManifest,
    world: &World,
    scratch: &mut DispatchScratch,
) -> AssignmentResult {
    // Fill `scratch.pending_stops` in place. The buffer's capacity
    // survives across ticks.
    pending_stops_minus_covered(group, manifest, world, idle_cars, scratch);

    let n = idle_cars.len();
    let m = scratch.pending_stops.len();

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

    // Hungarian requires rows <= cols. Reuse the scratch `Matrix` when
    // the shape matches the previous dispatch pass — on a realistic
    // building the (rows, cols) tuple changes only when the car or
    // stop count does, so steady-state dispatch avoids any heap
    // traffic for the cost matrix at all. When the shape does change,
    // a fresh Matrix replaces the stored one and becomes the new
    // reusable buffer going forward.
    let cols = n.max(m);
    match &mut scratch.cost_matrix_mx {
        Some(mx) if mx.rows == n && mx.columns == cols => {
            mx.fill(ASSIGNMENT_SENTINEL);
        }
        slot => {
            *slot = Some(pathfinding::matrix::Matrix::new(
                n,
                cols,
                ASSIGNMENT_SENTINEL,
            ));
        }
    }
    let matrix_ref = scratch
        .cost_matrix_mx
        .as_mut()
        .unwrap_or_else(|| unreachable!("cost_matrix_mx populated by match above"));

    // Top-K candidate pruning: when the strategy returns `Some(K)`,
    // each car only scores its K nearest viable pending stops; the
    // rest stay sentinel-cost so the Hungarian skips them. Cuts
    // per-cell rank() calls dramatically at large m without changing
    // the matrix shape (pathfinding's row/column reduction handles
    // the sparse rows efficiently).
    //
    // Determinism: tie-break on (distance, EntityId) so the kept set
    // is the same across runs and across snapshot round-trip.
    let candidate_limit = strategy.candidate_limit();
    // Take the buffer out of scratch so we can borrow `pending_stops`
    // and the top-K buf simultaneously without aliasing the same
    // `&mut scratch`.
    let mut top_k_buf = std::mem::take(&mut scratch.top_k_buf);
    {
        let pending_stops = &scratch.pending_stops;
        for (i, &(car_eid, car_pos)) in idle_cars.iter().enumerate() {
            strategy.prepare_car(car_eid, car_pos, group, manifest, world);
            // Borrow the car's restricted-stops set for this row so each
            // (car, stop) pair can short-circuit before calling rank().
            // Pre-fix only DCS consulted restricted_stops; SCAN/LOOK/NC/ETD
            // happily ranked restricted pairs and `commit_go_to_stop` later
            // silently dropped the assignment, starving the call. (#256)
            let restricted = world
                .elevator(car_eid)
                .map(crate::components::Elevator::restricted_stops);

            // The car's line's `serves` list is the set of stops it can
            // physically reach. In a single-line group every stop is
            // served (filter is a no-op); in a multi-line group (e.g.
            // sky-lobby + service bank, low/high banks sharing a
            // transfer floor) a car on line A must not be assigned to
            // a stop only line B serves — it would commit, sit there
            // unable to reach, and starve the call. The pre-fix matrix
            // happily ranked such cross-line pairs because no other
            // gate caught them: `restricted_stops` is for explicit
            // access denials, `pending_stops_minus_covered` filters
            // stops not cars, and built-in strategies score on
            // distance/direction without consulting line topology.
            let car_serves: Option<&[EntityId]> = world
                .elevator(car_eid)
                .map(crate::components::Elevator::line)
                .and_then(|line_eid| {
                    group
                        .lines()
                        .iter()
                        .find(|li| li.entity() == line_eid)
                        .map(LineInfo::serves)
                });
            // `None` here means the car's line isn't in this group's
            // line list — a topology inconsistency that should be
            // unreachable. We can't fail the dispatch tick over it (the
            // sim still has to make progress), so the filter falls
            // open: the car is treated as if it could reach any stop.
            // The debug-assert catches it during testing without
            // affecting release builds.
            debug_assert!(
                world.elevator(car_eid).is_none() || car_serves.is_some(),
                "car {car_eid:?} on line not present in its group's lines list"
            );

            // Build (distance, pending_stops index) for every VIABLE
            // candidate. Line- and restricted-filter happen here so
            // the top-K cut applies to viable candidates only — a
            // line-restricted car still sees up to K reachable stops.
            top_k_buf.clear();
            for (j, &(stop_eid, stop_pos)) in pending_stops.iter().enumerate() {
                if restricted.is_some_and(|r| r.contains(&stop_eid)) {
                    continue;
                }
                if car_serves.is_some_and(|s| !s.contains(&stop_eid)) {
                    continue;
                }
                let dist = (car_pos - stop_pos).abs();
                top_k_buf.push((dist, j));
            }

            // Apply the top-K cut. Sort by (distance, stop EntityId)
            // for determinism on equidistant ties.
            if let Some(k) = candidate_limit
                && top_k_buf.len() > k
            {
                top_k_buf.sort_by(|&(da, ja), &(db, jb)| {
                    da.partial_cmp(&db)
                        .unwrap_or(std::cmp::Ordering::Equal)
                        .then_with(|| pending_stops[ja].0.cmp(&pending_stops[jb].0))
                });
                top_k_buf.truncate(k);
            }

            // Fill the matrix only for kept indices. Non-viable and
            // non-top-K cells stay at the SENTINEL value the matrix
            // was initialised with.
            for &(_, j) in &top_k_buf {
                let (stop_eid, _) = pending_stops[j];
                let ctx = RankContext {
                    car: car_eid,
                    stop: stop_eid,
                    group,
                    manifest,
                    world,
                };
                let scaled = strategy.rank(&ctx).map_or(ASSIGNMENT_SENTINEL, scale_cost);
                matrix_ref[(i, j)] = scaled;
            }
        }
    }
    // Return the buffer to scratch so its capacity carries to the next
    // group/tick.
    scratch.top_k_buf = top_k_buf;
    let matrix = &*matrix_ref;
    let (_, assignments) = pathfinding::kuhn_munkres::kuhn_munkres_min(matrix);

    for (i, &(car_eid, car_pos)) in idle_cars.iter().enumerate() {
        let col = assignments[i];
        // A real assignment is: col points to a real stop (col < m) AND
        // the cost isn't sentinel-padded (meaning rank() returned Some).
        if col < m && matrix[(i, col)] < ASSIGNMENT_SENTINEL {
            let (stop_eid, _) = scratch.pending_stops[col];
            decisions.push((car_eid, DispatchDecision::GoToStop(stop_eid)));
        } else {
            let d = strategy.fallback(car_eid, car_pos, group, manifest, world);
            decisions.push((car_eid, d));
        }
    }

    AssignmentResult { decisions }
}
