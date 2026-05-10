//! `LoopSchedule` — fixed-dwell timetable for [`LineKind::Loop`] groups.
//!
//! Where [`crate::dispatch::LoopSweepDispatch`] lets each Loop car
//! carry whatever per-car `door_open_ticks` the config specified
//! (so dwell tracks the rider load at each stop), `LoopSchedule`
//! overrides every Loop car in the group to a single
//! `dwell_ticks` value. The resulting timetable is predictable —
//! every car spends the same amount of time at every stop on every
//! lap — which is what people-mover lines, gondolas, and timetabled
//! shuttle services want.
//!
//! ## What this PR ships
//!
//! - Fixed-dwell override applied via `pre_dispatch`: every Loop car
//!   in the group has its `door_open_ticks` rewritten to the schedule's
//!   `dwell_ticks` once per pass. Idempotent — the same value is
//!   written unconditionally each tick, so re-applying the strategy
//!   leaves car state unchanged.
//! - Round-trips through snapshots and config: `builtin_id` returns
//!   [`BuiltinStrategy::LoopSchedule`] and `snapshot_config` /
//!   `restore_config` carry the two tunable fields.
//! - The construction-time validator (relaxed from the
//!   `LoopSweep`-only check in PR #816) accepts both `LoopSweep` and
//!   `LoopSchedule` on Loop groups.
//!
//! ## Deferred to a follow-up
//!
//! The `target_headway_ticks` field is parsed and serialized but the
//! hold-recovery mechanism that would consume it (extending dwell when
//! a car arrives early relative to the preceding car so the schedule
//! resynchronises) lands in the next PR in this series. Keeping it on
//! the struct now is forward-compatible: snapshots taken today survive
//! the wiring change unchanged.
//!
//! Bunching under heavy load is therefore a known v1 limitation. With
//! fixed dwell alone, a leading car that picks up an unusually large
//! group can fall behind schedule, and the following car catches up.
//! Hold-recovery prevents that follower-on-leader bunching.
//!
//! [`LineKind::Loop`]: crate::components::LineKind::Loop

use crate::entity::EntityId;
use crate::world::World;

use super::{BuiltinStrategy, DispatchManifest, DispatchStrategy, ElevatorGroup, RankContext};

/// Dispatch strategy that holds Loop cars to a uniform dwell at every
/// stop.
///
/// See the module-level documentation for the full contract. The two
/// tunable fields are exposed through accessors so hosts can inspect
/// the schedule in-flight (HUDs, debuggers). The struct itself is
/// immutable after construction — replace the active strategy via
/// [`Simulation::set_dispatch`](crate::sim::Simulation::set_dispatch)
/// with a freshly-built instance to retune live, or rely on
/// [`restore_config`](DispatchStrategy::restore_config) on the snapshot
/// path.
#[derive(Debug, Clone, Copy, serde::Serialize, serde::Deserialize)]
pub struct LoopScheduleDispatch {
    /// Target dwell at each stop, in ticks. Overrides every Loop car's
    /// per-car `door_open_ticks` whenever this strategy is active on
    /// the group.
    dwell_ticks: u32,
    /// Desired tick gap between consecutive cars arriving at the same
    /// stop. Held on the struct now for snapshot-stability; the
    /// hold-recovery path that consumes it ships in a follow-up PR.
    target_headway_ticks: u32,
}

impl LoopScheduleDispatch {
    /// Construct a `LoopScheduleDispatch`.
    ///
    /// Both `dwell_ticks` and `target_headway_ticks` are clamped to a
    /// minimum of `1` — a zero dwell would collapse the door cycle into
    /// a no-op (the car arrives, immediately departs, never boards),
    /// and a zero headway is meaningless. Construction-time validation
    /// in `validate_explicit_topology` rejects pathological values up
    /// front; this clamp is a defence in depth for hosts wiring the
    /// strategy at runtime through `set_dispatch`.
    #[must_use]
    pub const fn new(dwell_ticks: u32, target_headway_ticks: u32) -> Self {
        Self {
            dwell_ticks: if dwell_ticks == 0 { 1 } else { dwell_ticks },
            target_headway_ticks: if target_headway_ticks == 0 {
                1
            } else {
                target_headway_ticks
            },
        }
    }

    /// Dwell at each stop, in ticks. See [`Self::new`] for the
    /// invariants this guarantees.
    #[must_use]
    pub const fn dwell_ticks(&self) -> u32 {
        self.dwell_ticks
    }

    /// Desired tick gap between consecutive arrivals.
    #[must_use]
    pub const fn target_headway_ticks(&self) -> u32 {
        self.target_headway_ticks
    }
}

impl Default for LoopScheduleDispatch {
    /// Sensible defaults for a 60-tick-per-second sim: a 30-tick
    /// (half-second) dwell and a 300-tick (5-second) headway target.
    /// Hosts should call [`Self::new`] with values matched to their
    /// line geometry rather than relying on these.
    fn default() -> Self {
        Self::new(30, 300)
    }
}

impl DispatchStrategy for LoopScheduleDispatch {
    fn pre_dispatch(
        &mut self,
        group: &ElevatorGroup,
        _manifest: &DispatchManifest,
        world: &mut World,
    ) {
        // Stamp the schedule's dwell onto every Loop car in the group.
        // We rewrite unconditionally rather than compare-then-write
        // because the comparison + branch saves nothing in practice
        // (the field is a `u32` on a struct already in cache) and the
        // unconditional write keeps the operation defensively
        // idempotent against any host that re-set `door_open_ticks`
        // out-of-band between ticks.
        //
        // Lines that the group claims but the world doesn't know about,
        // and elevators whose entity has been removed since the group
        // was last rebuilt, are simply skipped — there's no useful work
        // to do, and silently degrading matches how every other
        // dispatch strategy handles dangling references.
        for line in group.lines() {
            if !world
                .line(line.entity())
                .is_some_and(crate::components::Line::is_loop)
            {
                continue;
            }
            for &eid in line.elevators() {
                if let Some(car) = world.elevator_mut(eid) {
                    car.door_open_ticks = self.dwell_ticks;
                }
            }
        }
    }

    fn rank(&self, _ctx: &RankContext<'_>) -> Option<f64> {
        // Loop cars are excluded from the Hungarian idle pool by
        // `systems::dispatch::run`, so this method is unreachable in
        // practice. Returning `None` keeps the contract conservative
        // (a `Some(finite)` would have to invent a meaningless cost).
        None
    }

    fn builtin_id(&self) -> Option<BuiltinStrategy> {
        Some(BuiltinStrategy::LoopSchedule)
    }

    fn snapshot_config(&self) -> Option<String> {
        // RON-serialize the tunable fields so snapshot round-trip
        // preserves the schedule's identity. Without this, restoring a
        // snapshot would call `LoopScheduleDispatch::default()` via
        // `BuiltinStrategy::instantiate` and silently downgrade
        // whatever the live sim configured.
        ron::to_string(self).ok()
    }

    fn restore_config(&mut self, config: &str) -> Result<(), String> {
        // A garbled config is a snapshot/version drift bug. Surface
        // the parse error to the caller (the snapshot restore path)
        // rather than swallow it — `WorldSnapshot::restore` propagates
        // it back as the restore error so the caller sees a clear
        // failure instead of a silently-defaulted strategy with
        // observably different dwell timing.
        let restored: Self = ron::from_str(config).map_err(|e| e.to_string())?;
        *self = restored;
        Ok(())
    }

    fn notify_removed(&mut self, _elevator: EntityId) {
        // No per-car state to evict.
    }
}
