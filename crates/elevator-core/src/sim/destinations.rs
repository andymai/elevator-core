//! Imperative destination queue API (push/clear/abort).
//!
//! Part of the [`super::Simulation`] API surface; extracted from the
//! monolithic `sim.rs` for readability. See the parent module for the
//! overarching essential-API summary.

use crate::components::ElevatorPhase;
use crate::entity::{ElevatorId, EntityId};
use crate::error::SimError;
use crate::events::Event;
use crate::stop::StopRef;
use crate::world::World;

impl super::Simulation {
    // ── Destination queue (imperative dispatch) ────────────────────

    /// Read-only view of an elevator's destination queue (FIFO of target
    /// stop `EntityId`s).
    ///
    /// Returns `None` if `elev` is not an elevator entity. Returns
    /// `Some(&[])` for elevators with an empty queue.
    #[must_use]
    pub fn destination_queue(&self, elev: ElevatorId) -> Option<&[EntityId]> {
        let elev = elev.entity();
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
        elev: ElevatorId,
        stop: impl Into<StopRef>,
    ) -> Result<(), SimError> {
        let elev = elev.entity();
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
        elev: ElevatorId,
        stop: impl Into<StopRef>,
    ) -> Result<(), SimError> {
        let elev = elev.entity();
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
    /// Does **not** affect an in-flight movement — the elevator will
    /// finish its current leg and then go idle (since the queue is empty).
    /// To stop a moving car immediately, use
    /// [`abort_movement`](Self::abort_movement), which brakes the car to
    /// the nearest reachable stop and also clears the queue.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::NotAnElevator`] if `elev` is not an elevator.
    pub fn clear_destinations(&mut self, elev: ElevatorId) -> Result<(), SimError> {
        let elev = elev.entity();
        if self.world.elevator(elev).is_none() {
            return Err(SimError::NotAnElevator(elev));
        }
        if let Some(q) = self.world.destination_queue_mut(elev) {
            q.clear();
        }
        Ok(())
    }

    /// Abort the elevator's in-flight movement and park at the nearest
    /// reachable stop.
    ///
    /// Computes the minimum stopping position under the car's normal
    /// deceleration profile (see
    /// [`future_stop_position`](Self::future_stop_position)), picks the
    /// closest stop at or past that position in the current direction of
    /// travel, re-targets there via
    /// [`ElevatorPhase::Repositioning`](crate::components::ElevatorPhase)
    /// so the car arrives **without opening doors**, and clears any queued
    /// destinations. Onboard riders stay aboard.
    ///
    /// Emits [`Event::MovementAborted`](crate::events::Event)
    /// when an abort occurs.
    ///
    /// # No-op conditions
    ///
    /// Returns `Ok(())` without changes if the car is not currently moving
    /// (any phase other than
    /// [`MovingToStop`](crate::components::ElevatorPhase::MovingToStop) or
    /// [`Repositioning`](crate::components::ElevatorPhase::Repositioning)),
    /// or if the simulation has no stops.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::NotAnElevator`] if `elev` is not an elevator.
    pub fn abort_movement(&mut self, elev: ElevatorId) -> Result<(), SimError> {
        let eid = elev.entity();
        let Some(car) = self.world.elevator(eid) else {
            return Err(SimError::NotAnElevator(eid));
        };
        if !car.phase().is_moving() {
            return Ok(());
        }

        let pos = self.world.position(eid).map_or(0.0, |p| p.value);
        let vel = self.world.velocity(eid).map_or(0.0, |v| v.value);
        let Some(brake_pos) = self.future_stop_position(eid) else {
            return Ok(());
        };

        let Some(brake_stop) = brake_target_stop(&self.world, pos, vel, brake_pos) else {
            return Ok(());
        };

        if let Some(car) = self.world.elevator_mut(eid) {
            car.phase = ElevatorPhase::Repositioning(brake_stop);
            car.target_stop = Some(brake_stop);
            car.repositioning = true;
        }
        if let Some(q) = self.world.destination_queue_mut(eid) {
            q.clear();
        }

        self.events.emit(Event::MovementAborted {
            elevator: eid,
            brake_target: brake_stop,
            tick: self.tick,
        });

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
}

/// Pick the stop to park at when aborting an in-flight movement.
///
/// Tries three strategies in order:
///
/// 1. **Closest stop at or past `brake_pos` in the direction of travel.**
///    The car can decelerate into it naturally without overshoot.
/// 2. **Farthest stop still in the direction of travel (end-of-line).**
///    If the car is too close to the end of the line to fit a full
///    deceleration, pick the terminal stop ahead of it; the movement
///    system's overshoot-snap will absorb the small residual distance.
/// 3. **Nearest stop overall.** Only reachable when the car has no
///    stops ahead of it at all (e.g., single-stop worlds or the car is
///    already past the final stop); also handles the `vel == 0` case.
///
/// Returns `None` only if the world has no stops at all.
fn brake_target_stop(world: &World, pos: f64, vel: f64, brake_pos: f64) -> Option<EntityId> {
    let dir = vel.signum();
    if dir != 0.0 {
        let ahead_of_brake = world
            .iter_stops()
            .filter(|(_, stop)| (stop.position() - brake_pos) * dir >= 0.0)
            .min_by(|(_, a), (_, b)| {
                (a.position() - pos)
                    .abs()
                    .total_cmp(&(b.position() - pos).abs())
            })
            .map(|(id, _)| id);
        if ahead_of_brake.is_some() {
            return ahead_of_brake;
        }
        let ahead_of_car = world
            .iter_stops()
            .filter(|(_, stop)| (stop.position() - pos) * dir >= 0.0)
            .max_by(|(_, a), (_, b)| {
                ((a.position() - pos) * dir).total_cmp(&((b.position() - pos) * dir))
            })
            .map(|(id, _)| id);
        if ahead_of_car.is_some() {
            return ahead_of_car;
        }
    }
    world.find_nearest_stop(brake_pos)
}
