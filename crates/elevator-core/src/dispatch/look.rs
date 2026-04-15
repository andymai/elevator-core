//! LOOK dispatch algorithm — reverses at the last request, not the shaft end.
//!
//! Introduced in Merten, A. G. (1970), "Some Quantitative Techniques for
//! File Organization" (Univ. Wisconsin tech report) as an improvement on
//! SCAN that avoids unnecessary travel past the furthest pending request.
//!
//! Within this library SCAN and LOOK share identical dispatch semantics:
//! both prefer demanded stops in the current sweep direction and reverse
//! only when nothing remains ahead. The historical distinction — whether
//! the car drives to the physical shaft end between sweeps — applies to
//! the motion layer, not dispatch.

use std::collections::HashMap;

use crate::entity::EntityId;
use crate::world::World;

use super::{DispatchManifest, DispatchStrategy, ElevatorGroup};

/// Tolerance for floating-point position comparisons.
const EPSILON: f64 = 1e-9;

/// Sweep direction for a single car.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub(crate) enum Direction {
    /// Traveling upward (increasing position).
    Up,
    /// Traveling downward (decreasing position).
    Down,
}

/// Per-car accept mode, mirroring the SCAN strategy. See `scan::Mode`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Mode {
    /// Accept only strictly-ahead stops.
    Strict,
    /// Sweep just reversed; accept stops in the non-strict half.
    Lenient,
}

/// Elevator dispatch using the LOOK algorithm. See module docs.
pub struct LookDispatch {
    /// Per-elevator sweep direction.
    direction: HashMap<EntityId, Direction>,
    /// Per-elevator accept mode for the current dispatch pass.
    mode: HashMap<EntityId, Mode>,
}

impl LookDispatch {
    /// Create a new `LookDispatch` with no initial direction state.
    #[must_use]
    pub fn new() -> Self {
        Self {
            direction: HashMap::new(),
            mode: HashMap::new(),
        }
    }

    /// Sweep direction for `car`, defaulting to `Up` for first-time callers.
    fn direction_for(&self, car: EntityId) -> Direction {
        self.direction.get(&car).copied().unwrap_or(Direction::Up)
    }

    /// Accept mode for `car` in the current pass, defaulting to `Strict`.
    fn mode_for(&self, car: EntityId) -> Mode {
        self.mode.get(&car).copied().unwrap_or(Mode::Strict)
    }

    /// True if any demanded stop is strictly ahead of `car_pos` in `dir`.
    fn strict_demand_ahead(
        dir: Direction,
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
                Direction::Up => p > car_pos + EPSILON,
                Direction::Down => p < car_pos - EPSILON,
            }
        })
    }
}

impl Default for LookDispatch {
    fn default() -> Self {
        Self::new()
    }
}

impl DispatchStrategy for LookDispatch {
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
                Direction::Up => Direction::Down,
                Direction::Down => Direction::Up,
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
            (Mode::Strict, Direction::Up) => stop_position > car_position + EPSILON,
            (Mode::Strict, Direction::Down) => stop_position < car_position - EPSILON,
            (Mode::Lenient, Direction::Up) => stop_position > car_position - EPSILON,
            (Mode::Lenient, Direction::Down) => stop_position < car_position + EPSILON,
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
