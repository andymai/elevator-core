//! Hall-call destination dispatch ("DCS").
//!
//! Destination dispatch assigns each rider to a specific car at hall-call
//! time (when their destination is first known) and the assignment is
//! **sticky** — it never changes for the rider's lifetime, and no other car
//! will pick them up. The controller minimizes each rider's own travel time,
//! using a simple cost model:
//!
//! ```text
//! J(C) = pickup_time(C, origin)
//!      + ride_time(origin, dest)
//!      + stop_penalty * new_stops_added(C, origin, dest)
//! ```
//!
//! Assignments are recorded as an [`AssignedCar`] extension component on the
//! rider; the loading filter in `crate::systems::loading` consults this to
//! enforce the stickiness invariant.
//!
//! This is a sim — not a faithful reproduction of any vendor's controller.
//! Each assigned car's [`DestinationQueue`](crate::components::DestinationQueue)
//! is rebuilt every dispatch tick from the set of live sticky commitments
//! (waiting riders contribute origin + dest; riding riders contribute dest)
//! and arranged into a direction-aware two-run (plus fallback third-run)
//! monotone sequence so the car visits stops in sweep order rather than
//! in the order assignments arrived.

use std::collections::HashSet;

use serde::{Deserialize, Serialize};

use crate::components::{DestinationQueue, Direction, ElevatorPhase};
use crate::entity::EntityId;
use crate::world::{ExtKey, World};

use super::{DispatchManifest, DispatchStrategy, ElevatorGroup, RankContext, pair_can_do_work};

/// Sticky rider → car assignment produced by [`DestinationDispatch`].
///
/// Stored as an extension component on the rider entity. Once set, the
/// assignment is never mutated; the loading phase uses it to enforce
/// that only the assigned car may board the rider.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct AssignedCar(pub EntityId);

/// Typed extension key for [`AssignedCar`] storage.
pub const ASSIGNED_CAR_KEY: ExtKey<AssignedCar> = ExtKey::new("assigned_car");

/// Hall-call destination dispatch (DCS).
///
/// ## API shape
///
/// Uses [`DispatchStrategy::pre_dispatch`] to write sticky
/// [`AssignedCar`] extensions and rebuild each car's committed stop
/// queue during a `&mut World` phase. [`DispatchStrategy::rank`] then
/// routes each car to its own queue front and returns `None` for every
/// other stop, so the group-wide Hungarian assignment trivially pairs
/// each car with the stop it has already committed to.
#[derive(serde::Serialize, serde::Deserialize)]
pub struct DestinationDispatch {
    /// Weight for per-stop door overhead in the cost function. A positive
    /// value biases assignments toward cars whose route change adds no
    /// fresh stops; set via [`with_stop_penalty`](Self::with_stop_penalty).
    ///
    /// Units: ticks per newly-added stop. `None` ⇒ derive from the car's
    /// own door timings (~`open + 2 * transition`).
    stop_penalty: Option<f64>,
    /// Deferred-commitment window. When `Some(window)`, a rider's
    /// sticky assignment is re-evaluated each pass until the assigned
    /// car is within `window` ticks of the rider's origin — modelling
    /// KONE Polaris's two-button reallocation regime (DCS calls fix on
    /// press; two-button hall calls re-allocate continuously until
    /// commitment). `None` ⇒ immediate sticky (the default), matching
    /// fixed-on-press DCS behavior.
    commitment_window_ticks: Option<u64>,
}

impl DestinationDispatch {
    /// Create a new `DestinationDispatch` with defaults (immediate sticky,
    /// no commitment window).
    #[must_use]
    pub const fn new() -> Self {
        Self {
            stop_penalty: None,
            commitment_window_ticks: None,
        }
    }

    /// Override the fresh-stop penalty (ticks per new stop added to a
    /// car's committed route when it picks this rider up).
    #[must_use]
    pub const fn with_stop_penalty(mut self, penalty: f64) -> Self {
        self.stop_penalty = Some(penalty);
        self
    }

    /// Enable deferred commitment: riders' sticky assignments are
    /// re-evaluated each pass until the currently-assigned car is
    /// within `window` ticks of the rider's origin. At that point the
    /// commitment latches and later ticks leave the assignment alone.
    #[must_use]
    pub const fn with_commitment_window_ticks(mut self, window: u64) -> Self {
        self.commitment_window_ticks = Some(window);
        self
    }
}

impl Default for DestinationDispatch {
    fn default() -> Self {
        Self::new()
    }
}

impl DispatchStrategy for DestinationDispatch {
    #[allow(clippy::too_many_lines)]
    fn pre_dispatch(
        &mut self,
        group: &ElevatorGroup,
        manifest: &DispatchManifest,
        world: &mut World,
    ) {
        // DCS requires the group to be in `HallCallMode::Destination` — that
        // mode is what makes the kiosk-style "rider announces destination
        // at press time" assumption hold. In Classic collective-control
        // mode destinations aren't known until riders board, so running
        // DCS there would commit assignments based on information a real
        // controller wouldn't have. Early-return makes DCS a no-op for
        // misconfigured groups; pair it with the right mode to activate.
        if group.hall_call_mode() != super::HallCallMode::Destination {
            return;
        }

        // Candidate cars in this group that are operable for dispatch.
        let candidate_cars: Vec<EntityId> = group
            .elevator_entities()
            .iter()
            .copied()
            .filter(|eid| !world.is_disabled(*eid))
            .filter(|eid| {
                !world
                    .service_mode(*eid)
                    .is_some_and(|m| m.is_dispatch_excluded())
            })
            .filter(|eid| world.elevator(*eid).is_some())
            .collect();

        if candidate_cars.is_empty() {
            return;
        }

        // Collect unassigned waiting riders in this group. A sticky
        // assignment whose target car is dead or disabled is treated as
        // void — re-assign rather than strand. (Lifecycle hooks in
        // `disable`/`remove_elevator` normally clear these; this is the
        // defense layer if cleanup is ever missed.)
        let mut stale_assignments: Vec<EntityId> = Vec::new();
        let mut pending: Vec<(EntityId, EntityId, EntityId, f64)> = Vec::new();
        for (_, riders) in manifest.iter_waiting_stops() {
            for info in riders {
                if let Some(AssignedCar(c)) = world.ext::<AssignedCar>(info.id) {
                    // An assignment stays sticky only when the target
                    // car is still alive and (no commitment window is
                    // configured, or the car is already inside the
                    // latch window). Otherwise strip it so the rider
                    // re-competes below.
                    let alive = world.elevator(c).is_some() && !world.is_disabled(c);
                    let latched = self
                        .commitment_window_ticks
                        .is_none_or(|w| assigned_car_within_window(world, info.id, c, w));
                    if alive && latched {
                        continue; // sticky and live
                    }
                    stale_assignments.push(info.id);
                }
                let Some(dest) = info.destination else {
                    continue;
                };
                let Some(route) = world.route(info.id) else {
                    continue;
                };
                let Some(leg) = route.current() else {
                    continue;
                };
                if !group.accepts_leg(leg) {
                    continue;
                }
                pending.push((info.id, leg.from, dest, info.weight.value()));
            }
        }
        pending.sort_by_key(|(rid, ..)| *rid);
        // Drop stale extensions so subsequent ticks see them as unassigned.
        for rid in stale_assignments {
            world.remove_ext::<AssignedCar>(rid);
        }

        // Pre-compute committed-load per candidate car: aboard total
        // (`current_load`) plus Waiting riders sticky-assigned to it.
        // Terminal-phase riders whose `AssignedCar` was not cleaned up
        // are filtered by the `RiderPhase::Waiting` check below.
        let mut committed_load: std::collections::BTreeMap<EntityId, f64> =
            std::collections::BTreeMap::new();
        for &eid in &candidate_cars {
            if let Some(car) = world.elevator(eid) {
                committed_load.insert(eid, car.current_load().value());
            }
        }
        let waiting_assignments: Vec<(EntityId, EntityId)> = world
            .ext_map::<AssignedCar>()
            .map(|m| m.iter().map(|(rid, AssignedCar(c))| (rid, *c)).collect())
            .unwrap_or_default();
        for (rid, car) in waiting_assignments {
            if let Some(rider) = world.rider(rid)
                && rider.phase() == crate::components::RiderPhase::Waiting
            {
                *committed_load.entry(car).or_insert(0.0) += rider.weight.value();
            }
        }

        for (rid, origin, dest, weight) in pending {
            let best = candidate_cars
                .iter()
                .filter_map(|&eid| {
                    let car = world.elevator(eid)?;
                    if car.restricted_stops().contains(&dest)
                        || car.restricted_stops().contains(&origin)
                    {
                        return None;
                    }
                    if car.weight_capacity().value() > 0.0 && weight > car.weight_capacity().value()
                    {
                        return None;
                    }
                    let com = committed_load.get(&eid).copied().unwrap_or(0.0);
                    let cost = self.compute_cost(eid, origin, dest, world, com);
                    if cost.is_finite() {
                        Some((eid, cost))
                    } else {
                        None
                    }
                })
                .min_by(|a, b| a.1.total_cmp(&b.1))
                .map(|(eid, _)| eid);

            let Some(car_eid) = best else {
                continue;
            };
            world.insert_ext(rid, AssignedCar(car_eid), ASSIGNED_CAR_KEY);
            *committed_load.entry(car_eid).or_insert(0.0) += weight;
        }

        // Rebuild each candidate car's destination queue from the current
        // set of sticky commitments, arranged in direction-aware two-run
        // monotone order. This is the source of truth per tick and avoids
        // incremental-insertion drift (duplicates, orphaned entries).
        for &car_eid in &candidate_cars {
            rebuild_car_queue(world, car_eid);
        }
    }

    fn rank(&mut self, ctx: &RankContext<'_>) -> Option<f64> {
        // The queue is the source of truth — route each car strictly to
        // its own queue front. Every other stop is unavailable for this
        // car, so the Hungarian assignment reduces to the identity match
        // between each car and the stop it has already committed to.
        //
        // The `pair_can_do_work` gate guards against the same full-car
        // self-assign stall the other built-ins close: a sticky DCS
        // assignment whose car has filled up with earlier riders and
        // whose queue front is still the *pickup* for an un-boarded
        // rider would otherwise rank 0.0, win the Hungarian every tick,
        // and cycle doors forever.
        let front = ctx
            .world
            .destination_queue(ctx.car)
            .and_then(DestinationQueue::front)?;
        if front == ctx.stop && pair_can_do_work(ctx) {
            Some(0.0)
        } else {
            None
        }
    }

    fn builtin_id(&self) -> Option<super::BuiltinStrategy> {
        Some(super::BuiltinStrategy::Destination)
    }

    fn snapshot_config(&self) -> Option<String> {
        ron::to_string(self).ok()
    }

    fn restore_config(&mut self, serialized: &str) -> Result<(), String> {
        let restored: Self = ron::from_str(serialized).map_err(|e| e.to_string())?;
        *self = restored;
        Ok(())
    }
}

impl DestinationDispatch {
    /// Compute the assignment cost of sending car `eid` to pick up a rider
    /// whose route is `origin → dest`.
    fn compute_cost(
        &self,
        eid: EntityId,
        origin: EntityId,
        dest: EntityId,
        world: &World,
        committed_load: f64,
    ) -> f64 {
        let Some(car) = world.elevator(eid) else {
            return f64::INFINITY;
        };
        if car.max_speed().value() <= 0.0 {
            return f64::INFINITY;
        }

        let Some(car_pos) = world.position(eid).map(|p| p.value) else {
            return f64::INFINITY;
        };
        let Some(origin_pos) = world.stop_position(origin) else {
            return f64::INFINITY;
        };
        let Some(dest_pos) = world.stop_position(dest) else {
            return f64::INFINITY;
        };

        let door_overhead = f64::from(car.door_transition_ticks() * 2 + car.door_open_ticks());
        let penalty = self.stop_penalty.unwrap_or_else(|| door_overhead.max(1.0));

        // Pickup time: direct distance + per-stop door overhead for each
        // committed stop that lies between the car and the origin.
        let pickup_dist = (car_pos - origin_pos).abs();
        let pickup_travel = pickup_dist / car.max_speed().value();
        let intervening_committed = world.destination_queue(eid).map_or(0usize, |q| {
            let (lo, hi) = if car_pos < origin_pos {
                (car_pos, origin_pos)
            } else {
                (origin_pos, car_pos)
            };
            q.queue()
                .iter()
                .filter_map(|s| world.stop_position(*s))
                .filter(|p| *p > lo + 1e-9 && *p < hi - 1e-9)
                .count()
        });
        let pickup_time = (intervening_committed as f64).mul_add(door_overhead, pickup_travel);

        // Ride time: origin → dest travel + door overhead at origin pickup.
        let ride_dist = (origin_pos - dest_pos).abs();
        let ride_time = ride_dist / car.max_speed().value() + door_overhead;

        // Fresh stops added: 0, 1, or 2 depending on whether origin/dest
        // are already queued for this car. Probe the queue slice directly
        // instead of cloning it — `compute_cost` runs once per
        // (car, candidate-rider) pair each DCS tick, and at the scale of a
        // busy commercial group the Vec clone was the dominant allocation
        // in `pre_dispatch`.
        let queue_contains = |s: EntityId| {
            world
                .destination_queue(eid)
                .is_some_and(|q| q.queue().contains(&s))
        };
        let mut new_stops = 0f64;
        if !queue_contains(origin) {
            new_stops += 1.0;
        }
        if dest != origin && !queue_contains(dest) {
            new_stops += 1.0;
        }

        // Idle bias: empty cars get a small bonus so the load spreads.
        let idle_bonus = if car.phase() == ElevatorPhase::Idle && car.riders().is_empty() {
            -0.1 * pickup_travel
        } else {
            0.0
        };

        // Load bias: include both aboard and already-assigned-but-waiting
        // riders so dispatch spreads load even before any boarding happens.
        let load_penalty = if car.weight_capacity().value() > 0.0 {
            let effective = car.current_load().value().max(committed_load);
            let ratio = (effective / car.weight_capacity().value()).min(2.0);
            ratio * door_overhead * 4.0
        } else {
            0.0
        };

        pickup_time + ride_time + penalty * new_stops + idle_bonus + load_penalty
    }
}

/// True when the `car` assigned to `rider` is within `window` ticks of
/// the rider's origin, measured by raw distance / `max_speed`. Used to
/// decide whether a deferred commitment has latched.
fn assigned_car_within_window(
    world: &crate::world::World,
    rider: EntityId,
    car: EntityId,
    window: u64,
) -> bool {
    let Some(leg) = world.route(rider).and_then(|r| r.current()) else {
        return false;
    };
    let Some(origin_pos) = world.stop_position(leg.from) else {
        return false;
    };
    let Some(car_pos) = world.position(car).map(|p| p.value) else {
        return false;
    };
    let Some(car_data) = world.elevator(car) else {
        return false;
    };
    let speed = car_data.max_speed().value();
    if !speed.is_finite() || speed <= 0.0 {
        return false;
    }
    // `distance / speed` is seconds (speed is distance/second); convert
    // to ticks so `window` is apples-to-apples. Same class of unit fix
    // as ETD's door-cost conversion (see `etd.rs`). Fall back to 60 Hz
    // for bare-World fixtures that don't seat a `TickRate` resource.
    let tick_rate = world
        .resource::<crate::time::TickRate>()
        .map_or(60.0, |r| r.0);
    let eta_ticks = (car_pos - origin_pos).abs() / speed * tick_rate;
    // A non-finite ETA (NaN from corrupted position) would saturate
    // the `as u64` cast to 0 and erroneously latch the commitment —
    // refuse to latch instead.
    if !eta_ticks.is_finite() {
        return false;
    }
    eta_ticks.round() as u64 <= window
}

/// Drop every sticky [`AssignedCar`] assignment that points at `car_eid`.
///
/// Called by `Simulation::disable` and `Simulation::remove_elevator` when an
/// elevator leaves service, so DCS-routed riders are not stranded behind a
/// dead reference.
pub fn clear_assignments_to(world: &mut crate::world::World, car_eid: EntityId) {
    let stale: Vec<EntityId> = world
        .ext_map::<AssignedCar>()
        .map(|m| {
            m.iter()
                .filter_map(|(rid, AssignedCar(c))| (*c == car_eid).then_some(rid))
                .collect()
        })
        .unwrap_or_default();
    for rid in stale {
        world.remove_ext::<AssignedCar>(rid);
    }
}

/// Rebuild `car_eid`'s destination queue from all live sticky commitments.
///
/// Scans all riders assigned to this car and collects the set of stops it
/// must visit:
///   - waiting riders contribute both their origin and destination,
///   - riding/boarding riders contribute just their destination (origin
///     already visited).
///
/// The stops are then arranged into a two-run monotone sequence: the
/// current sweep (in the car's current direction) followed by the reverse
/// sweep. A third run is appended when a rider's trip reverses the sweep
/// twice (origin behind, dest ahead of origin in the original sweep).
#[allow(clippy::too_many_lines)]
fn rebuild_car_queue(world: &mut crate::world::World, car_eid: EntityId) {
    use crate::components::RiderPhase;

    // Local type for gathered (origin?, dest) trips.
    struct Trip {
        origin: Option<EntityId>,
        dest: EntityId,
    }

    let Some(car) = world.elevator(car_eid) else {
        return;
    };
    let car_pos = world.position(car_eid).map_or(0.0, |p| p.value);
    // Derive the sweep direction primarily from aboard-rider destinations,
    // not the car's indicator lamps. Under heavy load on a single-car group
    // the lamp state is itself a consequence of the previous rebuild, so
    // lamp-driven `sweep_up` creates a self-reinforcing loop: a rebuild
    // ordered around "current direction" keeps fresh pickups ahead of
    // deliveries, which keeps the direction pointed at the pickups, which
    // keeps the rebuild ordering them first. Letting aboard riders' dests
    // pick the sweep breaks the loop — the car finishes delivering before
    // it chases new pickups. Falls back to lamp direction when the car is
    // empty (no aboard demand to break the tie).
    let sweep_up = {
        let mut aboard_up = 0u32;
        let mut aboard_down = 0u32;
        for &rid in car.riders() {
            if let Some(dest) = world
                .route(rid)
                .and_then(crate::components::Route::current_destination)
                && let Some(dp) = world.stop_position(dest)
            {
                if dp > car_pos + 1e-9 {
                    aboard_up += 1;
                } else if dp < car_pos - 1e-9 {
                    aboard_down += 1;
                }
            }
        }
        match aboard_up.cmp(&aboard_down) {
            std::cmp::Ordering::Greater => true,
            std::cmp::Ordering::Less => false,
            std::cmp::Ordering::Equal => {
                matches!(car.direction(), Direction::Up | Direction::Either)
            }
        }
    };

    // Skip inserting a stop the car is currently parked at and loading.
    let at_stop_loading: Option<EntityId> = {
        let stopped_here = !matches!(
            car.phase(),
            ElevatorPhase::MovingToStop(_) | ElevatorPhase::Repositioning(_)
        );
        if stopped_here {
            world.find_stop_at_position(car_pos)
        } else {
            None
        }
    };

    // Gather (origin?, dest) pairs from sticky-assigned riders on this car.
    let assigned_ids: Vec<EntityId> = world
        .ext_map::<AssignedCar>()
        .map(|m| {
            m.iter()
                .filter_map(|(rid, AssignedCar(c))| (*c == car_eid).then_some(rid))
                .collect()
        })
        .unwrap_or_default();

    let mut trips: Vec<Trip> = Vec::new();
    for rid in assigned_ids {
        let Some(rider) = world.rider(rid) else {
            continue;
        };
        let Some(dest) = world
            .route(rid)
            .and_then(crate::components::Route::current_destination)
        else {
            continue;
        };
        match rider.phase() {
            RiderPhase::Waiting => {
                let origin = world
                    .route(rid)
                    .and_then(|r| r.current().map(|leg| leg.from));
                // Strip origin if car is parked at it right now.
                let origin = origin.filter(|o| Some(*o) != at_stop_loading);
                trips.push(Trip { origin, dest });
            }
            RiderPhase::Boarding(_) | RiderPhase::Riding(_) => {
                trips.push(Trip { origin: None, dest });
            }
            _ => {}
        }
    }

    if trips.is_empty() {
        if let Some(q) = world.destination_queue_mut(car_eid) {
            q.clear();
        }
        return;
    }

    // Bucket each stop into up to three runs based on the car's direction:
    //   run1 = current sweep (same direction as car)
    //   run2 = reverse sweep
    //   run3 = second sweep in the original direction (for trips whose
    //          origin is behind the sweep but dest is further in it)
    let mut run1: Vec<(EntityId, f64)> = Vec::new();
    let mut run2: Vec<(EntityId, f64)> = Vec::new();
    let mut run3: Vec<(EntityId, f64)> = Vec::new();

    let in_run1 = |sp: f64| -> bool {
        if sweep_up {
            sp >= car_pos - 1e-9
        } else {
            sp <= car_pos + 1e-9
        }
    };

    let push_unique = |v: &mut Vec<(EntityId, f64)>, s: EntityId, p: f64| {
        if !v.iter().any(|(e, _)| *e == s) {
            v.push((s, p));
        }
    };

    for trip in &trips {
        let dp = world.stop_position(trip.dest).unwrap_or(car_pos);
        if let Some(o) = trip.origin {
            let op = world.stop_position(o).unwrap_or(car_pos);
            let o_in_run1 = in_run1(op);
            let d_in_run1 = in_run1(dp);
            if o_in_run1 {
                push_unique(&mut run1, o, op);
                if d_in_run1 {
                    // Both in run1: dest must be further in sweep than origin.
                    let d_fits = if sweep_up {
                        dp >= op - 1e-9
                    } else {
                        dp <= op + 1e-9
                    };
                    if d_fits {
                        push_unique(&mut run1, trip.dest, dp);
                    } else {
                        // Dest is behind origin in sweep: needs reverse run.
                        push_unique(&mut run2, trip.dest, dp);
                    }
                } else {
                    push_unique(&mut run2, trip.dest, dp);
                }
            } else {
                // Origin is behind sweep: both go in reverse/second run.
                push_unique(&mut run2, o, op);
                if d_in_run1 {
                    // Origin behind, dest ahead: need a third sweep.
                    push_unique(&mut run3, trip.dest, dp);
                } else {
                    // Both behind sweep. Within reverse run, order dest
                    // after origin (dest further into reverse direction).
                    let d_further = if sweep_up {
                        dp <= op + 1e-9
                    } else {
                        dp >= op - 1e-9
                    };
                    if d_further {
                        push_unique(&mut run2, trip.dest, dp);
                    } else {
                        push_unique(&mut run3, trip.dest, dp);
                    }
                }
            }
        } else {
            // No origin: just drop off. Place dest in whichever run contains it.
            if in_run1(dp) {
                push_unique(&mut run1, trip.dest, dp);
            } else {
                push_unique(&mut run2, trip.dest, dp);
            }
        }
    }

    // Sort each run monotonically.
    if sweep_up {
        run1.sort_by(|a, b| a.1.total_cmp(&b.1));
        run2.sort_by(|a, b| b.1.total_cmp(&a.1));
        run3.sort_by(|a, b| a.1.total_cmp(&b.1));
    } else {
        run1.sort_by(|a, b| b.1.total_cmp(&a.1));
        run2.sort_by(|a, b| a.1.total_cmp(&b.1));
        run3.sort_by(|a, b| b.1.total_cmp(&a.1));
    }

    let mut out: Vec<EntityId> = Vec::with_capacity(run1.len() + run2.len() + run3.len());
    out.extend(run1.into_iter().map(|(e, _)| e));
    out.extend(run2.into_iter().map(|(e, _)| e));
    out.extend(run3.into_iter().map(|(e, _)| e));
    let mut seen = HashSet::with_capacity(out.len());
    out.retain(|e| seen.insert(*e));

    if let Some(q) = world.destination_queue_mut(car_eid) {
        q.replace(out);
    }
}
