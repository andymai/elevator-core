//! SCAN (elevator) dispatch algorithm — sweeps end-to-end before reversing.
//!
//! Originally described for disk-arm scheduling in Denning, P. J. (1967),
//! "Effects of Scheduling on File Memory Operations", *Proc. AFIPS Spring
//! Joint Computer Conference*, 9–21. The same sweep discipline is the
//! textbook "elevator" algorithm.

use std::collections::HashMap;

use crate::entity::EntityId;
use crate::world::World;

use super::sweep::{self, SweepDirection, SweepMode};
use super::{DispatchManifest, DispatchStrategy, ElevatorGroup};

/// Elevator dispatch using the SCAN (elevator) algorithm.
///
/// Each car tracks a sweep direction; stops demanded in that direction
/// receive a positional cost while stops behind are excluded. When
/// nothing remains ahead, the sweep reverses and the car considers the
/// reverse side. Direction and mode are resolved once per pass in
/// [`DispatchStrategy::prepare_car`] so ranking is independent of the
/// iteration order over stops.
pub struct ScanDispatch {
    /// Per-elevator sweep direction.
    direction: HashMap<EntityId, SweepDirection>,
    /// Per-elevator accept mode for the current dispatch pass.
    mode: HashMap<EntityId, SweepMode>,
}

impl ScanDispatch {
    /// Create a new `ScanDispatch` with no initial direction state.
    #[must_use]
    pub fn new() -> Self {
        Self {
            direction: HashMap::new(),
            mode: HashMap::new(),
        }
    }

    /// Sweep direction for `car`, defaulting to `Up` for first-time callers.
    fn direction_for(&self, car: EntityId) -> SweepDirection {
        self.direction
            .get(&car)
            .copied()
            .unwrap_or(SweepDirection::Up)
    }

    /// Accept mode for `car` in the current pass, defaulting to `Strict`.
    fn mode_for(&self, car: EntityId) -> SweepMode {
        self.mode.get(&car).copied().unwrap_or(SweepMode::Strict)
    }
}

impl Default for ScanDispatch {
    fn default() -> Self {
        Self::new()
    }
}

impl DispatchStrategy for ScanDispatch {
    fn prepare_car(
        &mut self,
        car: EntityId,
        car_position: f64,
        group: &ElevatorGroup,
        manifest: &DispatchManifest,
        world: &World,
    ) {
        let current = self.direction_for(car);
        if sweep::strict_demand_ahead(current, car_position, group, manifest, world) {
            self.mode.insert(car, SweepMode::Strict);
        } else {
            self.direction.insert(car, current.reversed());
            self.mode.insert(car, SweepMode::Lenient);
        }
    }

    fn rank(
        &mut self,
        car: EntityId,
        car_position: f64,
        _stop: EntityId,
        stop_position: f64,
        _group: &ElevatorGroup,
        _manifest: &DispatchManifest,
        _world: &World,
    ) -> Option<f64> {
        sweep::rank(
            self.mode_for(car),
            self.direction_for(car),
            car_position,
            stop_position,
        )
    }

    fn notify_removed(&mut self, elevator: EntityId) {
        self.direction.remove(&elevator);
        self.mode.remove(&elevator);
    }
}
