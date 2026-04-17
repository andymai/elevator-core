//! Hall-call and car-call API.
//!
//! Part of the [`super::Simulation`] API surface; extracted from the
//! monolithic `sim.rs` for readability. See the parent module for the
//! overarching essential-API summary.

#![allow(unused_imports)]

use crate::components::{
    Accel, AccessControl, ElevatorPhase, Orientation, Patience, Preferences, Rider, RiderPhase,
    Route, SpatialPosition, Speed, Velocity, Weight,
};
use crate::dispatch::{BuiltinReposition, DispatchStrategy, ElevatorGroup, RepositionStrategy};
use crate::entity::{ElevatorId, EntityId, RiderId};
use crate::error::{EtaError, SimError};
use crate::events::{Event, EventBus};
use crate::hooks::{Phase, PhaseHooks};
use crate::ids::GroupId;
use crate::metrics::Metrics;
use crate::rider_index::RiderIndex;
use crate::stop::{StopId, StopRef};
use crate::systems::PhaseContext;
use crate::time::TimeAdapter;
use crate::topology::TopologyGraph;
use crate::world::World;
use std::collections::{BTreeMap, HashMap, HashSet};
use std::fmt;
use std::sync::Mutex;
use std::time::Duration;

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
}
