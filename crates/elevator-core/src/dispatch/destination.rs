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
//! rider; the loading filter in [`crate::systems::loading`] consults this to
//! enforce the stickiness invariant.
//!
//! This is a sim — not a faithful reproduction of any vendor's controller.
//! Each assigned car's [`DestinationQueue`](crate::components::DestinationQueue)
//! is rebuilt every dispatch tick from the set of live sticky commitments
//! (waiting riders contribute origin + dest; riding riders contribute dest)
//! and arranged into a direction-aware two-run (plus fallback third-run)
//! monotone sequence so the car visits stops in sweep order rather than
//! in the order assignments arrived.

use serde::{Deserialize, Serialize};

use crate::components::{DestinationQueue, Direction, ElevatorPhase, TransportMode};
use crate::entity::EntityId;
use crate::world::{ExtKey, World};

use super::{DispatchManifest, DispatchStrategy, ElevatorGroup};

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
pub struct DestinationDispatch {
    /// Weight for per-stop door overhead in the cost function. A positive
    /// value biases assignments toward cars whose route change adds no
    /// fresh stops; set via [`with_stop_penalty`](Self::with_stop_penalty).
    ///
    /// Units: ticks per newly-added stop. `None` ⇒ derive from the car's
    /// own door timings (~`open + 2 * transition`).
    stop_penalty: Option<f64>,
}

impl DestinationDispatch {
    /// Create a new `DestinationDispatch` with defaults.
    #[must_use]
    pub const fn new() -> Self {
        Self { stop_penalty: None }
    }

    /// Override the fresh-stop penalty (ticks per new stop added to a
    /// car's committed route when it picks this rider up).
    #[must_use]
    pub const fn with_stop_penalty(mut self, penalty: f64) -> Self {
        self.stop_penalty = Some(penalty);
        self
    }
}

impl Default for DestinationDispatch {
    fn default() -> Self {
        Self::new()
    }
}

impl DispatchStrategy for DestinationDispatch {
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

        // Collect unassigned waiting riders in this group.
        let mut pending: Vec<(EntityId, EntityId, EntityId, f64)> = Vec::new();
        for riders in manifest.waiting_at_stop.values() {
            for info in riders {
                if world.ext::<AssignedCar>(info.id).is_some() {
                    continue; // sticky
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
                let group_ok = match leg.via {
                    TransportMode::Group(g) => g == group.id(),
                    TransportMode::Line(l) => group.lines().iter().any(|li| li.entity() == l),
                    TransportMode::Walk => false,
                };
                if !group_ok {
                    continue;
                }
                pending.push((info.id, leg.from, dest, info.weight));
            }
        }
        pending.sort_by_key(|(rid, ..)| *rid);

        // Pre-compute committed-load per car (riders aboard + already-
        // assigned waiting riders not yet boarded). Used by cost function
        // to discourage piling more riders onto an already-full car.
        let mut committed_load: std::collections::BTreeMap<EntityId, f64> =
            std::collections::BTreeMap::new();
        for (rid, rider) in world.iter_riders() {
            use crate::components::RiderPhase;
            // Count riders whose weight is "committed" to a specific car:
            // actively aboard (Boarding/Riding) or still-Waiting with a
            // sticky assignment. Terminal phases (Exiting, Arrived,
            // Abandoned, Resident, Walking) must not contribute — AssignedCar
            // is sticky and never cleared, so including them would permanently
            // inflate the former car's committed load over long runs.
            let car = match rider.phase() {
                RiderPhase::Riding(c) | RiderPhase::Boarding(c) => Some(c),
                RiderPhase::Waiting => world.ext::<AssignedCar>(rid).map(|AssignedCar(c)| c),
                _ => None,
            };
            if let Some(c) = car {
                *committed_load.entry(c).or_insert(0.0) += rider.weight;
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
                    if car.weight_capacity() > 0.0 && weight > car.weight_capacity() {
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

    fn rank(
        &mut self,
        car: EntityId,
        _car_position: f64,
        stop: EntityId,
        _stop_position: f64,
        _group: &ElevatorGroup,
        _manifest: &DispatchManifest,
        world: &World,
    ) -> Option<f64> {
        // The queue is the source of truth — route each car strictly to
        // its own queue front. Every other stop is unavailable for this
        // car, so the Hungarian assignment reduces to the identity match
        // between each car and the stop it has already committed to.
        let front = world
            .destination_queue(car)
            .and_then(DestinationQueue::front)?;
        if front == stop { Some(0.0) } else { None }
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
        if car.max_speed() <= 0.0 {
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
        let pickup_travel = pickup_dist / car.max_speed();
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
        let ride_time = ride_dist / car.max_speed() + door_overhead;

        // Fresh stops added: 0, 1, or 2 depending on whether origin/dest
        // are already queued for this car.
        let existing: Vec<EntityId> = world
            .destination_queue(eid)
            .map_or_else(Vec::new, |q| q.queue().to_vec());
        let mut new_stops = 0f64;
        if !existing.contains(&origin) {
            new_stops += 1.0;
        }
        if !existing.contains(&dest) && dest != origin {
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
        let load_penalty = if car.weight_capacity() > 0.0 {
            let effective = car.current_load().max(committed_load);
            let ratio = (effective / car.weight_capacity()).min(2.0);
            ratio * door_overhead * 4.0
        } else {
            0.0
        };

        pickup_time + ride_time + penalty * new_stops + idle_bonus + load_penalty
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
    let sweep_up = match car.direction() {
        Direction::Up | Direction::Either => true,
        Direction::Down => false,
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

    // Gather (origin?, dest) pairs from all sticky-assigned riders for this car.
    let mut trips: Vec<Trip> = Vec::new();
    for (rid, rider) in world.iter_riders() {
        let Some(AssignedCar(assigned)) = world.ext::<AssignedCar>(rid) else {
            continue;
        };
        if assigned != car_eid {
            continue;
        }
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
    out.dedup();

    if let Some(q) = world.destination_queue_mut(car_eid) {
        q.replace(out);
    }
}
