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
//! ## What this strategy does
//!
//! - **Fixed dwell**: every Loop car in the group has its
//!   `door_open_ticks` rewritten to the schedule's `dwell_ticks` once
//!   per pass via `pre_dispatch`. Idempotent — the same value is
//!   written unconditionally each tick, so re-applying the strategy
//!   leaves car state unchanged.
//! - **Hold-recovery**: when a car arrives at a stop sooner than
//!   `target_headway_ticks` after the preceding car arrived at the
//!   same stop, the strategy issues a [`DoorCommand::HoldOpen`]
//!   extending the dwell by `min(target_headway_ticks - gap,
//!   hold_cap_ticks)`. This pushes the bunched follower back to its
//!   schedule slot rather than letting it tailgate the leader.
//!   - The cap prevents indefinite hold if the leader is stuck (e.g.
//!     stopped indefinitely for heavy boarding) — the follower waits
//!     at most `hold_cap_ticks` extra per stop, then resumes patrol.
//!   - Crucially, hold-recovery **never speeds a car up**: an
//!     early-arriving follower can only delay itself, never overtake.
//!   - A leader that runs late is not held — only followers running
//!     ahead of their schedule are held.
//! - **Snapshot round-trip**: `builtin_id` returns
//!   [`BuiltinStrategy::LoopSchedule`] and `snapshot_config` /
//!   `restore_config` carry all three tunable fields. Per-pass
//!   bookkeeping (last-arrival ticks, in-loading set) is `#[serde(skip)]`
//!   — restored sims rebuild it on the first tick where each car next
//!   enters Loading.
//!
//! Bunching under heavy load is **largely** mitigated by hold-recovery
//! but not eliminated: a leader that takes an unusually long time to
//! board may exceed `hold_cap_ticks` of follower hold, and the
//! follower then catches up before recovering. Tune `hold_cap_ticks`
//! to the worst-case boarding burst your line expects.
//!
//! [`DoorCommand::HoldOpen`]: crate::door::DoorCommand::HoldOpen
//! [`LineKind::Loop`]: crate::components::LineKind::Loop

use std::collections::HashMap;

use crate::components::ElevatorPhase;
use crate::door::DoorCommand;
use crate::entity::EntityId;
use crate::world::World;

use super::{BuiltinStrategy, DispatchManifest, DispatchStrategy, ElevatorGroup, RankContext};

/// Default hold-recovery cap.
///
/// Picked to be comfortably below most real-world worst-case dwells
/// while still letting the schedule recover from typical boarding
/// excursions on a 60Hz sim. Hosts should tune via
/// [`LoopScheduleDispatch::new`] for production scenarios.
pub const DEFAULT_HOLD_CAP_TICKS: u32 = 120;

/// Dispatch strategy that holds Loop cars to a uniform dwell at every
/// stop, with hold-recovery to keep the timetable stable under load.
///
/// See the module-level documentation for the full contract. The
/// tunable fields are exposed through accessors so hosts can inspect
/// the schedule in-flight (HUDs, debuggers). The struct itself is
/// immutable after construction — replace the active strategy via
/// [`Simulation::set_dispatch`](crate::sim::Simulation::set_dispatch)
/// with a freshly-built instance to retune live, or rely on
/// [`restore_config`](DispatchStrategy::restore_config) on the snapshot
/// path.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LoopScheduleDispatch {
    /// Target dwell at each stop, in ticks. Overrides every Loop car's
    /// per-car `door_open_ticks` whenever this strategy is active on
    /// the group.
    dwell_ticks: u32,
    /// Desired tick gap between consecutive cars arriving at the same
    /// stop. A follower arriving below this gap holds its dwell to
    /// recover. Set above expected loop transit time for the gap to be
    /// reachable.
    target_headway_ticks: u32,
    /// Upper bound on the extra dwell hold-recovery applies per stop.
    /// Without this cap, a stalled leader (e.g. heavy boarding well
    /// beyond `dwell_ticks`) would freeze the follower indefinitely.
    hold_cap_ticks: u32,
    /// Per-stop tick of the most recent arrival, used to compute the
    /// gap on the next arrival. Skipped in snapshot serialization —
    /// restored sims rebuild the map on the first arrival at each stop
    /// after restore. The first-arrival miss is a one-time cost
    /// equivalent to one un-held tick per stop after restore.
    ///
    /// Keyed on the served stop's [`EntityId`]. Entries for stops
    /// removed via [`Simulation::remove_stop`](crate::sim::Simulation::remove_stop)
    /// remain in the map; this is safe because the entity allocator
    /// uses generation counters under `slotmap`, so a removed
    /// [`EntityId`] never re-points at a newly-spawned stop.
    /// Long-running sims that churn stops will leak a few bytes per
    /// retired stop — bounded and acceptable for v1.
    #[serde(skip)]
    last_arrival_tick: HashMap<EntityId, u64>,
    /// Per-car `(last loading-pre-dispatch tick, last seen stop)`.
    /// The fresh-arrival predicate fires whenever the recorded tick
    /// is not the immediately preceding `pre_dispatch` tick *or* the
    /// recorded stop changed. The tick-anchored half catches
    /// same-stop re-arrivals on a tiny loop (car leaves S, runs once
    /// around, returns to S); the stop-anchored half catches normal
    /// arrival-at-the-next-stop transitions while the car was still
    /// in Loading state on the previous pass (rare but legal under
    /// long dwells).
    #[serde(skip)]
    seen: HashMap<EntityId, (u64, EntityId)>,
}

impl LoopScheduleDispatch {
    /// Construct a `LoopScheduleDispatch` with explicit tunables.
    ///
    /// All three integer parameters are clamped to a minimum of `1`:
    /// a zero dwell would collapse the door cycle into a no-op, a zero
    /// headway would never trigger recovery, and a zero hold cap would
    /// disable recovery entirely (use a small but positive value to
    /// keep recovery active without unbounded waits).
    #[must_use]
    pub fn new(dwell_ticks: u32, target_headway_ticks: u32, hold_cap_ticks: u32) -> Self {
        Self {
            dwell_ticks: dwell_ticks.max(1),
            target_headway_ticks: target_headway_ticks.max(1),
            hold_cap_ticks: hold_cap_ticks.max(1),
            last_arrival_tick: HashMap::new(),
            seen: HashMap::new(),
        }
    }

    /// Dwell at each stop, in ticks. See [`Self::new`] for the
    /// invariants this guarantees.
    #[must_use]
    pub const fn dwell_ticks(&self) -> u32 {
        self.dwell_ticks
    }

    /// Desired tick gap between consecutive arrivals at the same stop.
    #[must_use]
    pub const fn target_headway_ticks(&self) -> u32 {
        self.target_headway_ticks
    }

    /// Maximum extra dwell hold-recovery will apply per stop.
    #[must_use]
    pub const fn hold_cap_ticks(&self) -> u32 {
        self.hold_cap_ticks
    }
}

impl Default for LoopScheduleDispatch {
    /// Sensible defaults for a 60-tick-per-second sim: a 30-tick
    /// (half-second) dwell, a 300-tick (5-second) headway target, and
    /// a 120-tick (2-second) hold cap. Hosts should call [`Self::new`]
    /// with values matched to their line geometry rather than relying
    /// on these.
    fn default() -> Self {
        Self::new(30, 300, DEFAULT_HOLD_CAP_TICKS)
    }
}

impl DispatchStrategy for LoopScheduleDispatch {
    fn pre_dispatch(
        &mut self,
        group: &ElevatorGroup,
        _manifest: &DispatchManifest,
        world: &mut World,
    ) {
        // Tick fetched once up-front. `pre_dispatch` doesn't carry a
        // tick parameter (the trait predates loop-aware strategies),
        // so we read the `CurrentTick` resource the runtime keeps in
        // sync. Missing the resource means we're being driven by tests
        // that didn't seed it; hold `None` and skip the recovery path
        // entirely. A `0` fallback would fabricate gaps against any
        // prior arrival recorded at a non-zero tick.
        let now = world
            .resource::<crate::arrival_log::CurrentTick>()
            .map(|ct| ct.0);

        for line in group.lines() {
            let line_eid = line.entity();
            if !world
                .line(line_eid)
                .is_some_and(crate::components::Line::is_loop)
            {
                continue;
            }
            // Snapshot elevator entities up front so we can take a
            // separate mutable borrow per car inside the loop without
            // holding the immutable `&[EntityId]` from `line.elevators()`
            // across mutable accesses to `world`.
            let elevators: Vec<EntityId> = line.elevators().to_vec();

            for eid in elevators {
                let Some(car) = world.elevator(eid) else {
                    continue;
                };
                // Fixed-dwell override applied to every Loop car, every
                // tick. Idempotent — the same value is written
                // regardless of the car's current phase, so a car
                // mid-cycle picks up the override on its next request.
                let phase = car.phase;
                let at_stop = car.target_stop;
                {
                    // Re-acquire as `_mut` for the write, then drop
                    // immediately so the gap-recovery branch below can
                    // hold its own borrow.
                    if let Some(c) = world.elevator_mut(eid) {
                        c.door_open_ticks = self.dwell_ticks;
                    }
                }

                if !matches!(phase, ElevatorPhase::Loading) {
                    continue;
                }
                let Some(now) = now else { continue };
                let Some(stop) = at_stop else { continue };

                // Fresh-arrival predicate: the car was either not
                // observed in Loading on the immediately preceding
                // pre_dispatch tick, OR it's now at a different stop
                // than it was on the previous Loading observation. The
                // tick-anchored half catches same-stop re-arrivals
                // (car runs a full lap on a tiny loop and returns to
                // the same stop), the stop-anchored half catches the
                // normal arrival-at-next-stop transition. Subsequent
                // ticks where the car remains in Loading at the same
                // stop update `seen` but don't re-issue HoldOpen.
                let prev_seen = self.seen.insert(eid, (now, stop));
                let is_fresh_arrival = match prev_seen {
                    None => true,
                    Some((prev_tick, prev_stop)) => prev_tick + 1 != now || prev_stop != stop,
                };
                if !is_fresh_arrival {
                    continue;
                }

                // Gap = how long since the previous arrival at this
                // stop. The first arrival at a stop has no previous;
                // there's nothing to recover *against*, so the dwell
                // override is the only thing applied.
                let Some(&prev) = self.last_arrival_tick.get(&stop) else {
                    self.last_arrival_tick.insert(stop, now);
                    continue;
                };
                self.last_arrival_tick.insert(stop, now);

                let gap = now.saturating_sub(prev);
                let target = u64::from(self.target_headway_ticks);
                if gap >= target {
                    continue;
                }
                // Cars arriving below target headway extend their
                // dwell by the gap deficit, capped to keep a stuck
                // leader from freezing the follower indefinitely.
                #[allow(
                    clippy::cast_possible_truncation,
                    reason = "deficit is bounded by target_headway_ticks (u32); truncation to u32 is exact"
                )]
                let deficit = (target - gap) as u32;
                let extra = deficit.min(self.hold_cap_ticks);
                if extra == 0 {
                    continue;
                }
                if let Some(c) = world.elevator_mut(eid) {
                    // Push directly to the per-car queue rather than
                    // routing through `Simulation::enqueue_door_command`
                    // — the strategy only has `&mut World`, not a sim
                    // handle, and `HoldOpen` is explicitly cumulative
                    // (collapsing adjacent dupes would silently drop a
                    // real recovery deficit). Honour the cap so the
                    // queue can't grow unbounded across a sustained
                    // bunching episode.
                    if c.door_command_queue.len() < crate::components::DOOR_COMMAND_QUEUE_CAP {
                        c.door_command_queue
                            .push(DoorCommand::HoldOpen { ticks: extra });
                    }
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

    fn notify_removed(&mut self, elevator: EntityId) {
        // Drop bookkeeping for removed elevators so the map doesn't
        // grow without bound across long-running sims that swap cars
        // in and out (e.g. test harnesses).
        self.seen.remove(&elevator);
    }
}
