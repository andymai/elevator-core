//! Manual door control and `ServiceMode::Manual` commands.
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
    // ── Manual door control ──────────────────────────────────────────
    //
    // These methods let games drive door state directly — e.g. a
    // cab-panel open/close button in a first-person game, or an RPG
    // where the player *is* the elevator and decides when to cycle doors.
    //
    // Each method either applies the command immediately (if the car is
    // in a matching door-FSM state) or queues it on the elevator for
    // application at the next valid moment. This way games can call
    // these any time without worrying about FSM timing, and get a clean
    // success/failure split between "bad entity" and "bad moment".

    /// Request the doors to open.
    ///
    /// Applied immediately if the car is stopped at a stop with closed
    /// or closing doors; otherwise queued until the car next arrives.
    /// A no-op if the doors are already open or opening.
    ///
    /// # Errors
    ///
    /// - [`SimError::NotAnElevator`] if `elevator` is not an elevator entity.
    /// - [`SimError::ElevatorDisabled`] if the elevator is disabled.
    ///
    /// # Example
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
    /// let elev = ElevatorId::from(sim.world().iter_elevators().next().unwrap().0);
    /// sim.open_door(elev).unwrap();
    /// ```
    pub fn open_door(&mut self, elevator: ElevatorId) -> Result<(), SimError> {
        let elevator = elevator.entity();
        self.require_enabled_elevator(elevator)?;
        self.enqueue_door_command(elevator, crate::door::DoorCommand::Open);
        Ok(())
    }

    /// Request the doors to close now.
    ///
    /// Applied immediately if the doors are open or loading — forcing an
    /// early close — unless a rider is mid-boarding/exiting this car, in
    /// which case the close waits for the rider to finish. If doors are
    /// currently opening, the close queues and fires once fully open.
    ///
    /// # Errors
    ///
    /// - [`SimError::NotAnElevator`] if `elevator` is not an elevator entity.
    /// - [`SimError::ElevatorDisabled`] if the elevator is disabled.
    ///
    /// # Example
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
    /// let elev = ElevatorId::from(sim.world().iter_elevators().next().unwrap().0);
    /// sim.close_door(elev).unwrap();
    /// ```
    pub fn close_door(&mut self, elevator: ElevatorId) -> Result<(), SimError> {
        let elevator = elevator.entity();
        self.require_enabled_elevator(elevator)?;
        self.enqueue_door_command(elevator, crate::door::DoorCommand::Close);
        Ok(())
    }

    /// Extend the doors' open dwell by `ticks`.
    ///
    /// Cumulative — two calls of 30 ticks each extend the dwell by 60
    /// ticks in total. If the doors aren't open yet, the hold is queued
    /// and applied when they next reach the fully-open state.
    ///
    /// # Errors
    ///
    /// - [`SimError::NotAnElevator`] if `elevator` is not an elevator entity.
    /// - [`SimError::ElevatorDisabled`] if the elevator is disabled.
    /// - [`SimError::InvalidConfig`] if `ticks` is zero.
    ///
    /// # Example
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
    /// let elev = ElevatorId::from(sim.world().iter_elevators().next().unwrap().0);
    /// sim.hold_door(elev, 30).unwrap();
    /// ```
    pub fn hold_door(&mut self, elevator: ElevatorId, ticks: u32) -> Result<(), SimError> {
        let elevator = elevator.entity();
        Self::validate_nonzero_u32(ticks, "hold_door.ticks")?;
        self.require_enabled_elevator(elevator)?;
        self.enqueue_door_command(elevator, crate::door::DoorCommand::HoldOpen { ticks });
        Ok(())
    }

    /// Cancel any pending hold extension.
    ///
    /// If the base open timer has already elapsed the doors close on
    /// the next doors-phase tick.
    ///
    /// # Errors
    ///
    /// - [`SimError::NotAnElevator`] if `elevator` is not an elevator entity.
    /// - [`SimError::ElevatorDisabled`] if the elevator is disabled.
    ///
    /// # Example
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
    /// let elev = ElevatorId::from(sim.world().iter_elevators().next().unwrap().0);
    /// sim.hold_door(elev, 100).unwrap();
    /// sim.cancel_door_hold(elev).unwrap();
    /// ```
    pub fn cancel_door_hold(&mut self, elevator: ElevatorId) -> Result<(), SimError> {
        let elevator = elevator.entity();
        self.require_enabled_elevator(elevator)?;
        self.enqueue_door_command(elevator, crate::door::DoorCommand::CancelHold);
        Ok(())
    }

    /// Set the target velocity for a manual-mode elevator.
    ///
    /// The velocity is clamped to the elevator's `[-max_speed, max_speed]`
    /// range after validation. The car ramps toward the target each tick
    /// using `acceleration` (speeding up, or starting from rest) or
    /// `deceleration` (slowing down, or reversing direction). Positive
    /// values command upward travel, negative values command downward travel.
    ///
    /// # Errors
    /// - [`SimError::NotAnElevator`] if the entity is not an elevator.
    /// - [`SimError::ElevatorDisabled`] if the elevator is disabled.
    /// - [`SimError::WrongServiceMode`] if the elevator is not in [`ServiceMode::Manual`].
    /// - [`SimError::InvalidConfig`] if `velocity` is not finite (NaN or infinite).
    ///
    /// [`ServiceMode::Manual`]: crate::components::ServiceMode::Manual
    pub fn set_target_velocity(
        &mut self,
        elevator: ElevatorId,
        velocity: f64,
    ) -> Result<(), SimError> {
        let elevator = elevator.entity();
        self.require_enabled_elevator(elevator)?;
        self.require_manual_mode(elevator)?;
        if !velocity.is_finite() {
            return Err(SimError::InvalidConfig {
                field: "target_velocity",
                reason: format!("must be finite, got {velocity}"),
            });
        }
        let max = self
            .world
            .elevator(elevator)
            .map_or(f64::INFINITY, |c| c.max_speed.value());
        let clamped = velocity.clamp(-max, max);
        if let Some(car) = self.world.elevator_mut(elevator) {
            car.manual_target_velocity = Some(clamped);
        }
        self.events.emit(Event::ManualVelocityCommanded {
            elevator,
            target_velocity: Some(ordered_float::OrderedFloat(clamped)),
            tick: self.tick,
        });
        Ok(())
    }

    /// Command an immediate stop on a manual-mode elevator.
    ///
    /// Sets the target velocity to zero; the car decelerates at its
    /// configured `deceleration` rate. Equivalent to
    /// `set_target_velocity(elevator, 0.0)` but emits a distinct
    /// [`Event::ManualVelocityCommanded`] with `None` payload so games can
    /// distinguish an emergency stop from a deliberate hold.
    ///
    /// # Errors
    /// Same as [`set_target_velocity`](Self::set_target_velocity), minus
    /// the finite-velocity check.
    pub fn emergency_stop(&mut self, elevator: ElevatorId) -> Result<(), SimError> {
        let elevator = elevator.entity();
        self.require_enabled_elevator(elevator)?;
        self.require_manual_mode(elevator)?;
        if let Some(car) = self.world.elevator_mut(elevator) {
            car.manual_target_velocity = Some(0.0);
        }
        self.events.emit(Event::ManualVelocityCommanded {
            elevator,
            target_velocity: None,
            tick: self.tick,
        });
        Ok(())
    }

    /// Internal: require an elevator be in `ServiceMode::Manual`.
    fn require_manual_mode(&self, elevator: EntityId) -> Result<(), SimError> {
        let actual = self
            .world
            .service_mode(elevator)
            .copied()
            .unwrap_or_default();
        if actual != crate::components::ServiceMode::Manual {
            return Err(SimError::WrongServiceMode {
                entity: elevator,
                expected: crate::components::ServiceMode::Manual,
                actual,
            });
        }
        Ok(())
    }

    /// Internal: push a command onto the queue, collapsing adjacent
    /// duplicates, capping length, and emitting `DoorCommandQueued`.
    fn enqueue_door_command(&mut self, elevator: EntityId, command: crate::door::DoorCommand) {
        if let Some(car) = self.world.elevator_mut(elevator) {
            let q = &mut car.door_command_queue;
            // Collapse adjacent duplicates for idempotent commands
            // (Open/Close/CancelHold) — repeating them adds nothing.
            // HoldOpen is explicitly cumulative, so never collapsed.
            let collapse = matches!(
                command,
                crate::door::DoorCommand::Open
                    | crate::door::DoorCommand::Close
                    | crate::door::DoorCommand::CancelHold
            ) && q.last().copied() == Some(command);
            if !collapse {
                q.push(command);
                if q.len() > crate::components::DOOR_COMMAND_QUEUE_CAP {
                    q.remove(0);
                }
            }
        }
        self.events.emit(Event::DoorCommandQueued {
            elevator,
            command,
            tick: self.tick,
        });
    }

    /// Internal: resolve an elevator entity that is not disabled.
    fn require_enabled_elevator(&self, elevator: EntityId) -> Result<(), SimError> {
        if self.world.elevator(elevator).is_none() {
            return Err(SimError::NotAnElevator(elevator));
        }
        if self.world.is_disabled(elevator) {
            return Err(SimError::ElevatorDisabled(elevator));
        }
        Ok(())
    }

    /// Internal: resolve an elevator entity or return a clear error.
    pub(super) fn require_elevator(
        &self,
        elevator: EntityId,
    ) -> Result<&crate::components::Elevator, SimError> {
        self.world
            .elevator(elevator)
            .ok_or(SimError::NotAnElevator(elevator))
    }

    /// Internal: positive-finite validator matching the construction-time
    /// error shape in `sim/construction.rs::validate_elevator_config`.
    pub(super) fn validate_positive_finite_f64(
        value: f64,
        field: &'static str,
    ) -> Result<(), SimError> {
        if !value.is_finite() {
            return Err(SimError::InvalidConfig {
                field,
                reason: format!("must be finite, got {value}"),
            });
        }
        if value <= 0.0 {
            return Err(SimError::InvalidConfig {
                field,
                reason: format!("must be positive, got {value}"),
            });
        }
        Ok(())
    }

    /// Internal: reject zero-tick timings.
    pub(super) fn validate_nonzero_u32(value: u32, field: &'static str) -> Result<(), SimError> {
        if value == 0 {
            return Err(SimError::InvalidConfig {
                field,
                reason: "must be > 0".into(),
            });
        }
        Ok(())
    }

    /// Internal: emit a single `ElevatorUpgraded` event for the current tick.
    pub(super) fn emit_upgrade(
        &mut self,
        elevator: EntityId,
        field: crate::events::UpgradeField,
        old: crate::events::UpgradeValue,
        new: crate::events::UpgradeValue,
    ) {
        self.events.emit(Event::ElevatorUpgraded {
            elevator,
            field,
            old,
            new,
            tick: self.tick,
        });
    }

    // Dispatch & reposition management live in `sim/construction.rs`.
}
