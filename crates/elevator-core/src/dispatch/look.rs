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

use super::sweep::{self, SweepDirection, SweepMode};
use super::{DispatchManifest, DispatchStrategy, ElevatorGroup, RankContext};

/// Elevator dispatch using the LOOK algorithm. See module docs.
pub struct LookDispatch {
    /// Per-elevator sweep direction.
    direction: HashMap<EntityId, SweepDirection>,
    /// Per-elevator accept mode for the current dispatch pass.
    mode: HashMap<EntityId, SweepMode>,
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
        if sweep::strict_demand_ahead(current, car_position, group, manifest, world) {
            self.mode.insert(car, SweepMode::Strict);
        } else {
            self.direction.insert(car, current.reversed());
            self.mode.insert(car, SweepMode::Lenient);
        }
    }

    fn rank(&mut self, ctx: &RankContext<'_>) -> Option<f64> {
        sweep::rank(
            self.mode_for(ctx.car),
            self.direction_for(ctx.car),
            ctx.car_position,
            ctx.stop_position,
        )
    }

    fn notify_removed(&mut self, elevator: EntityId) {
        self.direction.remove(&elevator);
        self.mode.remove(&elevator);
    }
}
