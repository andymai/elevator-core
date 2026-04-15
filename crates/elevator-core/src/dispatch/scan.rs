//! SCAN (elevator) dispatch algorithm — sweeps end-to-end before reversing.
//!
//! Originally described for disk-arm scheduling in Denning, P. J. (1967),
//! "Effects of Scheduling on File Memory Operations", *Proc. AFIPS Spring
//! Joint Computer Conference*, 9–21. The same sweep discipline is the
//! textbook "elevator" algorithm.

use std::collections::HashMap;

use crate::entity::EntityId;
use crate::world::World;

use super::{DispatchManifest, DispatchStrategy, ElevatorGroup};

/// Tolerance for floating-point position comparisons.
const EPSILON: f64 = 1e-9;

/// Direction of travel for the SCAN algorithm.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub(crate) enum ScanDirection {
    /// Traveling upward (increasing position).
    Up,
    /// Traveling downward (decreasing position).
    Down,
}

/// Per-car state computed by [`DispatchStrategy::prepare_car`] and read
/// by [`DispatchStrategy::rank`].
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Mode {
    /// Demand exists strictly ahead in the stored direction; accept
    /// only strictly-ahead stops.
    Strict,
    /// The sweep just reversed; accept any demanded stop in the new
    /// direction's non-strict half (including the car's current position).
    Lenient,
}

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
    direction: HashMap<EntityId, ScanDirection>,
    /// Per-elevator accept mode for the current dispatch pass.
    mode: HashMap<EntityId, Mode>,
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
    fn direction_for(&self, car: EntityId) -> ScanDirection {
        self.direction
            .get(&car)
            .copied()
            .unwrap_or(ScanDirection::Up)
    }

    /// Accept mode for `car` in the current pass, defaulting to `Strict`.
    fn mode_for(&self, car: EntityId) -> Mode {
        self.mode.get(&car).copied().unwrap_or(Mode::Strict)
    }

    /// True if any demanded stop is strictly ahead of `car_pos` in `dir`.
    fn strict_demand_ahead(
        dir: ScanDirection,
        car_pos: f64,
        group: &ElevatorGroup,
        manifest: &DispatchManifest,
        world: &World,
    ) -> bool {
        group.stop_entities().iter().any(|&s| {
            if !manifest.has_demand(s) {
                return false;
            }
            let Some(p) = world.stop_position(s) else {
                return false;
            };
            match dir {
                ScanDirection::Up => p > car_pos + EPSILON,
                ScanDirection::Down => p < car_pos - EPSILON,
            }
        })
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
        if Self::strict_demand_ahead(current, car_position, group, manifest, world) {
            self.mode.insert(car, Mode::Strict);
        } else {
            let reversed = match current {
                ScanDirection::Up => ScanDirection::Down,
                ScanDirection::Down => ScanDirection::Up,
            };
            self.direction.insert(car, reversed);
            self.mode.insert(car, Mode::Lenient);
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
        let direction = self.direction_for(car);
        let mode = self.mode_for(car);
        let accept = match (mode, direction) {
            (Mode::Strict, ScanDirection::Up) => stop_position > car_position + EPSILON,
            (Mode::Strict, ScanDirection::Down) => stop_position < car_position - EPSILON,
            (Mode::Lenient, ScanDirection::Up) => stop_position > car_position - EPSILON,
            (Mode::Lenient, ScanDirection::Down) => stop_position < car_position + EPSILON,
        };
        if accept {
            Some((car_position - stop_position).abs())
        } else {
            None
        }
    }

    fn notify_removed(&mut self, elevator: EntityId) {
        self.direction.remove(&elevator);
        self.mode.remove(&elevator);
    }
}
