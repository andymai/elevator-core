//! Hall-call and car-call API.
//!
//! Part of the [`super::Simulation`] API surface; extracted from the
//! monolithic `sim.rs` for readability. See the parent module for the
//! overarching essential-API summary.

use crate::entity::{ElevatorId, EntityId};
use crate::error::{EtaError, SimError};
use crate::events::Event;
use crate::stop::StopRef;

impl super::Simulation {
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
        car: ElevatorId,
        floor: impl Into<StopRef>,
    ) -> Result<(), SimError> {
        let car = car.entity();
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
    /// - [`SimError::HallCallNotFound`] — no hall call exists at that
    ///   `(stop, direction)` pair yet.
    /// - [`SimError::LineDoesNotServeStop`] — the car's line does not
    ///   serve `stop`. Without this check a cross-line pin would be
    ///   silently dropped at dispatch time yet leave the call `pinned`,
    ///   blocking every other car.
    pub fn pin_assignment(
        &mut self,
        car: ElevatorId,
        stop: EntityId,
        direction: crate::components::CallDirection,
    ) -> Result<(), SimError> {
        let car = car.entity();
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
            return Err(SimError::LineDoesNotServeStop {
                line_or_car: car,
                stop,
            });
        }
        let Some(call) = self.world.hall_call_mut(stop, direction) else {
            return Err(SimError::HallCallNotFound { stop, direction });
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
    pub fn car_calls(&self, car: ElevatorId) -> &[crate::components::CarCall] {
        let car = car.entity();
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
            .max_speed()
            .value();
        if max_speed <= 0.0 {
            return Err(EtaError::NotAnElevator(car));
        }
        let distance = (car_pos - stop_pos).abs();
        // Simple kinematic estimate. The `eta` module has a richer
        // trapezoidal model; the one-liner suits most hall-display use.
        Ok((distance / max_speed).ceil() as u64)
    }

    /// Create or aggregate into the hall call at `(stop, direction)`.
    /// Emits [`Event::HallButtonPressed`] only on the *first* press.
    pub(super) fn ensure_hall_call(
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
            debug_assert!(
                false,
                "ensure_car_call: car {car:?} has no car_calls component"
            );
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
