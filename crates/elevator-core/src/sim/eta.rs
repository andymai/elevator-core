//! ETA queries (single-stop and best-of-group).
//!
//! Part of the [`super::Simulation`] API surface; extracted from the
//! monolithic `sim.rs` for readability. See the parent module for the
//! overarching essential-API summary.

use crate::components::Velocity;
use crate::entity::{ElevatorId, EntityId};
use crate::error::EtaError;
use crate::stop::StopRef;
use std::time::Duration;

impl super::Simulation {
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
    pub fn eta(&self, elev: ElevatorId, stop: EntityId) -> Result<Duration, EtaError> {
        let elev = elev.entity();
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

        let max_speed = elevator.max_speed().value();
        let accel = elevator.acceleration().value();
        let decel = elevator.deceleration().value();
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
                self.eta(ElevatorId::from(eid), stop).ok().map(|d| (eid, d))
            })
            .min_by_key(|(_, d)| *d)
    }
}
