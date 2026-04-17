//! Runtime elevator upgrades (speed, accel, decel, capacity, door timings).
//!
//! Part of the [`super::Simulation`] API surface; extracted from the
//! monolithic `sim.rs` for readability. See the parent module for the
//! overarching essential-API summary.

use crate::components::{Accel, Speed, Weight};
use crate::entity::ElevatorId;
use crate::error::SimError;

impl super::Simulation {
    // ── Runtime elevator upgrades ────────────────────────────────────
    //
    // Games that want to mutate elevator parameters at runtime (e.g.
    // an RPG speed-upgrade purchase, a scripted capacity boost) go
    // through these setters rather than poking `Elevator` directly via
    // `world_mut()`. Each setter validates its input, updates the
    // underlying component, and emits an [`Event::ElevatorUpgraded`]
    // so game code can react without polling.
    //
    // ### Semantics
    //
    // - `max_speed`, `acceleration`, `deceleration`: applied on the next
    //   movement integration step. The car's **current velocity is
    //   preserved** — there is no instantaneous jerk. If `max_speed`
    //   is lowered below the current velocity, the movement integrator
    //   clamps velocity to the new cap on the next tick.
    // - `weight_capacity`: applied immediately. If the new capacity is
    //   below `current_load` the car ends up temporarily overweight —
    //   no riders are ejected, but the next boarding pass will reject
    //   any rider that would push the load further over the new cap.
    // - `door_transition_ticks`, `door_open_ticks`: applied on the
    //   **next** door cycle. An in-progress door transition keeps its
    //   original timing, so setters never cause visual glitches.

    /// Set the maximum travel speed for an elevator at runtime.
    ///
    /// The new value applies on the next movement integration step;
    /// the car's current velocity is preserved (see the
    /// [runtime upgrades section](crate#runtime-upgrades) of the crate
    /// docs). If the new cap is below the current velocity, the movement
    /// system clamps velocity down on the next tick.
    ///
    /// # Errors
    ///
    /// - [`SimError::NotAnElevator`] if `elevator` is not an elevator entity.
    /// - [`SimError::InvalidConfig`] if `speed` is not a positive finite number.
    ///
    /// # Example
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
    /// let elev = ElevatorId::from(sim.world().iter_elevators().next().unwrap().0);
    /// sim.set_max_speed(elev, 4.0).unwrap();
    /// assert_eq!(sim.world().elevator(elev.entity()).unwrap().max_speed().value(), 4.0);
    /// ```
    pub fn set_max_speed(&mut self, elevator: ElevatorId, speed: f64) -> Result<(), SimError> {
        let elevator = elevator.entity();
        Self::validate_positive_finite_f64(speed, "elevators.max_speed")?;
        let old = self.require_elevator(elevator)?.max_speed.value();
        let speed = Speed::from(speed);
        if let Some(car) = self.world.elevator_mut(elevator) {
            car.max_speed = speed;
        }
        self.emit_upgrade(
            elevator,
            crate::events::UpgradeField::MaxSpeed,
            crate::events::UpgradeValue::float(old),
            crate::events::UpgradeValue::float(speed.value()),
        );
        Ok(())
    }

    /// Set the acceleration rate for an elevator at runtime.
    ///
    /// See [`set_max_speed`](Self::set_max_speed) for the general
    /// velocity-preservation rules that apply to kinematic setters.
    ///
    /// # Errors
    ///
    /// - [`SimError::NotAnElevator`] if `elevator` is not an elevator entity.
    /// - [`SimError::InvalidConfig`] if `accel` is not a positive finite number.
    ///
    /// # Example
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
    /// let elev = ElevatorId::from(sim.world().iter_elevators().next().unwrap().0);
    /// sim.set_acceleration(elev, 3.0).unwrap();
    /// assert_eq!(sim.world().elevator(elev.entity()).unwrap().acceleration().value(), 3.0);
    /// ```
    pub fn set_acceleration(&mut self, elevator: ElevatorId, accel: f64) -> Result<(), SimError> {
        let elevator = elevator.entity();
        Self::validate_positive_finite_f64(accel, "elevators.acceleration")?;
        let old = self.require_elevator(elevator)?.acceleration.value();
        let accel = Accel::from(accel);
        if let Some(car) = self.world.elevator_mut(elevator) {
            car.acceleration = accel;
        }
        self.emit_upgrade(
            elevator,
            crate::events::UpgradeField::Acceleration,
            crate::events::UpgradeValue::float(old),
            crate::events::UpgradeValue::float(accel.value()),
        );
        Ok(())
    }

    /// Set the deceleration rate for an elevator at runtime.
    ///
    /// See [`set_max_speed`](Self::set_max_speed) for the general
    /// velocity-preservation rules that apply to kinematic setters.
    ///
    /// # Errors
    ///
    /// - [`SimError::NotAnElevator`] if `elevator` is not an elevator entity.
    /// - [`SimError::InvalidConfig`] if `decel` is not a positive finite number.
    ///
    /// # Example
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
    /// let elev = ElevatorId::from(sim.world().iter_elevators().next().unwrap().0);
    /// sim.set_deceleration(elev, 3.5).unwrap();
    /// assert_eq!(sim.world().elevator(elev.entity()).unwrap().deceleration().value(), 3.5);
    /// ```
    pub fn set_deceleration(&mut self, elevator: ElevatorId, decel: f64) -> Result<(), SimError> {
        let elevator = elevator.entity();
        Self::validate_positive_finite_f64(decel, "elevators.deceleration")?;
        let old = self.require_elevator(elevator)?.deceleration.value();
        let decel = Accel::from(decel);
        if let Some(car) = self.world.elevator_mut(elevator) {
            car.deceleration = decel;
        }
        self.emit_upgrade(
            elevator,
            crate::events::UpgradeField::Deceleration,
            crate::events::UpgradeValue::float(old),
            crate::events::UpgradeValue::float(decel.value()),
        );
        Ok(())
    }

    /// Set the weight capacity for an elevator at runtime.
    ///
    /// Applied immediately. If the new capacity is below the car's
    /// current load the car is temporarily overweight; no riders are
    /// ejected, but subsequent boarding attempts that would push load
    /// further over the cap will be rejected as
    /// [`RejectionReason::OverCapacity`](crate::error::RejectionReason::OverCapacity).
    ///
    /// # Errors
    ///
    /// - [`SimError::NotAnElevator`] if `elevator` is not an elevator entity.
    /// - [`SimError::InvalidConfig`] if `capacity` is not a positive finite number.
    ///
    /// # Example
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
    /// let elev = ElevatorId::from(sim.world().iter_elevators().next().unwrap().0);
    /// sim.set_weight_capacity(elev, 1200.0).unwrap();
    /// assert_eq!(sim.world().elevator(elev.entity()).unwrap().weight_capacity().value(), 1200.0);
    /// ```
    pub fn set_weight_capacity(
        &mut self,
        elevator: ElevatorId,
        capacity: f64,
    ) -> Result<(), SimError> {
        let elevator = elevator.entity();
        Self::validate_positive_finite_f64(capacity, "elevators.weight_capacity")?;
        let old = self.require_elevator(elevator)?.weight_capacity.value();
        let capacity = Weight::from(capacity);
        if let Some(car) = self.world.elevator_mut(elevator) {
            car.weight_capacity = capacity;
        }
        self.emit_upgrade(
            elevator,
            crate::events::UpgradeField::WeightCapacity,
            crate::events::UpgradeValue::float(old),
            crate::events::UpgradeValue::float(capacity.value()),
        );
        Ok(())
    }

    /// Set the door open/close transition duration for an elevator.
    ///
    /// Applied on the **next** door cycle — an in-progress transition
    /// keeps its original timing to avoid visual glitches.
    ///
    /// # Errors
    ///
    /// - [`SimError::NotAnElevator`] if `elevator` is not an elevator entity.
    /// - [`SimError::InvalidConfig`] if `ticks` is zero.
    ///
    /// # Example
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
    /// let elev = ElevatorId::from(sim.world().iter_elevators().next().unwrap().0);
    /// sim.set_door_transition_ticks(elev, 3).unwrap();
    /// assert_eq!(sim.world().elevator(elev.entity()).unwrap().door_transition_ticks(), 3);
    /// ```
    pub fn set_door_transition_ticks(
        &mut self,
        elevator: ElevatorId,
        ticks: u32,
    ) -> Result<(), SimError> {
        let elevator = elevator.entity();
        Self::validate_nonzero_u32(ticks, "elevators.door_transition_ticks")?;
        let old = self.require_elevator(elevator)?.door_transition_ticks;
        if let Some(car) = self.world.elevator_mut(elevator) {
            car.door_transition_ticks = ticks;
        }
        self.emit_upgrade(
            elevator,
            crate::events::UpgradeField::DoorTransitionTicks,
            crate::events::UpgradeValue::ticks(old),
            crate::events::UpgradeValue::ticks(ticks),
        );
        Ok(())
    }

    /// Set how long doors hold fully open for an elevator.
    ///
    /// Applied on the **next** door cycle — a door that is currently
    /// holding open will complete its original dwell before the new
    /// value takes effect.
    ///
    /// # Errors
    ///
    /// - [`SimError::NotAnElevator`] if `elevator` is not an elevator entity.
    /// - [`SimError::InvalidConfig`] if `ticks` is zero.
    ///
    /// # Example
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
    /// let elev = ElevatorId::from(sim.world().iter_elevators().next().unwrap().0);
    /// sim.set_door_open_ticks(elev, 20).unwrap();
    /// assert_eq!(sim.world().elevator(elev.entity()).unwrap().door_open_ticks(), 20);
    /// ```
    pub fn set_door_open_ticks(
        &mut self,
        elevator: ElevatorId,
        ticks: u32,
    ) -> Result<(), SimError> {
        let elevator = elevator.entity();
        Self::validate_nonzero_u32(ticks, "elevators.door_open_ticks")?;
        let old = self.require_elevator(elevator)?.door_open_ticks;
        if let Some(car) = self.world.elevator_mut(elevator) {
            car.door_open_ticks = ticks;
        }
        self.emit_upgrade(
            elevator,
            crate::events::UpgradeField::DoorOpenTicks,
            crate::events::UpgradeValue::ticks(old),
            crate::events::UpgradeValue::ticks(ticks),
        );
        Ok(())
    }
}
