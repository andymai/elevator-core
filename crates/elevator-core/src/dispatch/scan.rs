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
use super::{DispatchManifest, DispatchStrategy, ElevatorGroup, RankContext, pair_is_useful};

/// Elevator dispatch using the SCAN (elevator) algorithm.
///
/// Each car tracks a sweep direction; stops demanded in that direction
/// receive a positional cost while stops behind are excluded. When
/// nothing remains ahead, the sweep reverses and the car considers the
/// reverse side. Direction and mode are resolved once per pass in
/// [`DispatchStrategy::prepare_car`] so ranking is independent of the
/// iteration order over stops.
#[derive(serde::Serialize, serde::Deserialize)]
pub struct ScanDispatch {
    /// Per-elevator sweep direction. Persisted across dispatch passes
    /// (reversed once a sweep exhausts demand ahead) and round-tripped
    /// through [`DispatchStrategy::snapshot_config`] so a restored sim
    /// continues the current sweep instead of defaulting to `Up` for
    /// every car.
    direction: HashMap<EntityId, SweepDirection>,
    /// Per-elevator accept mode for the current dispatch pass.
    /// Overwritten in full by `prepare_car` every pass, so no round-
    /// trip is needed; `#[serde(skip)]` keeps snapshot bytes compact
    /// and deterministic across process runs.
    #[serde(skip)]
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

    fn rank(&mut self, ctx: &RankContext<'_>) -> Option<f64> {
        // Reject un-servable pairs so a full car with only
        // over-capacity waiting demand at its own stop can't open/close
        // doors indefinitely. SCAN's direction reversal normally lifts
        // it out of the self-stop within one tick (strict-ahead excludes
        // the current position), but the Lenient transition tick would
        // still rank the self-pair at cost 0 without this guard.
        if !pair_is_useful(ctx, false) {
            return None;
        }
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

    fn builtin_id(&self) -> Option<super::BuiltinStrategy> {
        Some(super::BuiltinStrategy::Scan)
    }

    fn snapshot_config(&self) -> Option<String> {
        ron::to_string(self).ok()
    }

    fn restore_config(&mut self, serialized: &str) -> Result<(), String> {
        let restored: Self = ron::from_str(serialized).map_err(|e| e.to_string())?;
        *self = restored;
        Ok(())
    }
}
