//! Sub-tick stepping, phase hooks, event drainage.
//!
//! Part of the [`super::Simulation`] API surface; extracted from the
//! monolithic `sim.rs` for readability. See the parent module for the
//! overarching essential-API summary.

use crate::dispatch::DispatchStrategy;
use crate::events::EventBus;
use crate::hooks::Phase;
use crate::ids::GroupId;
use crate::metrics::Metrics;
use crate::sim::PhaseCheckState;
use crate::systems::PhaseContext;
use std::collections::BTreeMap;

impl super::Simulation {
    // ── Sub-stepping ────────────────────────────────────────────────

    /// Get the dispatch strategies map (for advanced sub-stepping).
    ///
    /// Returns the strategy half of the internally-encapsulated
    /// dispatcher set — the snapshot identity half is only readable
    /// through [`strategy_id`](Self::strategy_id) so callers can't
    /// accidentally drift the two halves out of sync via this accessor.
    #[must_use]
    pub fn dispatchers(&self) -> &BTreeMap<GroupId, Box<dyn DispatchStrategy>> {
        self.dispatcher_set.strategies()
    }

    /// Get the dispatch strategies map mutably (for advanced sub-stepping).
    ///
    /// Direct insertion via this map bypasses the internally-enforced
    /// strategy/identity atomicity, leaving the snapshot identity
    /// stale. Prefer [`set_dispatch`](Self::set_dispatch) for swaps;
    /// reach for this only when a system needs to mutate an
    /// already-installed trait object in place (e.g. `restore_config`).
    pub fn dispatchers_mut(&mut self) -> &mut BTreeMap<GroupId, Box<dyn DispatchStrategy>> {
        self.dispatcher_set.strategies_mut()
    }

    /// Get a mutable reference to the event bus.
    pub const fn events_mut(&mut self) -> &mut EventBus {
        &mut self.events
    }

    /// Get a mutable reference to the metrics.
    pub const fn metrics_mut(&mut self) -> &mut Metrics {
        &mut self.metrics
    }

    /// Build the `PhaseContext` for the current tick.
    #[must_use]
    pub const fn phase_context(&self) -> PhaseContext {
        PhaseContext {
            tick: self.tick,
            dt: self.dt,
        }
    }

    /// Enable or disable strict substep phase-order validation.
    ///
    /// When enabled, each `run_*` substep method panics if called out
    /// of the canonical 8-phase order, and `advance_tick()` panics if
    /// called before `run_metrics()` has run. Default off — opt in
    /// during host development to fail fast on accidental out-of-order
    /// calls instead of debugging the downstream symptoms (riders
    /// boarding through closed doors, movement before dispatch,
    /// transient rider states bleeding across tick boundaries).
    ///
    /// `step()` and `step_many()` always satisfy the order, so flipping
    /// this on in production code that drives the sim via `step()` is
    /// safe (and zero overhead — a single branch per phase).
    ///
    /// # Canonical order
    ///
    /// Each tick: `run_advance_transient` → `run_dispatch` →
    /// `run_reposition` → `run_advance_queue` → `run_movement` →
    /// `run_doors` → `run_loading` → `run_metrics` → `advance_tick`.
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
    /// sim.set_strict_phase_order(true);
    /// sim.step(); // canonical order — passes the check.
    /// ```
    pub const fn set_strict_phase_order(&mut self, enabled: bool) {
        self.phase_check = if enabled {
            PhaseCheckState::Expecting(Phase::AdvanceTransient)
        } else {
            PhaseCheckState::Disabled
        };
    }

    /// Whether strict substep phase-order validation is currently
    /// enabled. Useful for hosts that want to surface the setting in
    /// debug overlays.
    #[must_use]
    pub const fn is_strict_phase_order(&self) -> bool {
        !matches!(self.phase_check, PhaseCheckState::Disabled)
    }

    /// Validate that `current` is the next-expected phase, then advance
    /// the expectation to `next`. No-op when the guard is disabled.
    /// `next == None` means "tick complete, await `advance_tick`".
    //
    // `clippy::panic` is workspace-denied, but the AwaitingTick arm is
    // unrepresentable as an `assert_eq!` against `current` — there is no
    // single "expected phase" to compare against (the only allowed next
    // action is `advance_tick`, not a phase). A direct `panic!` with a
    // tailored message is the right shape for the AwaitingTick arm; the
    // allow is scoped to this helper only.
    #[allow(clippy::panic)]
    fn check_and_advance_phase(&mut self, current: Phase, next: Option<Phase>) {
        match self.phase_check {
            PhaseCheckState::Disabled => {}
            PhaseCheckState::Expecting(expected) => {
                assert_eq!(
                    expected, current,
                    "substep phase order violated: expected {expected}, called {current}.\n\
                     Canonical order each tick: advance_transient → dispatch → reposition → \
                     advance_queue → movement → doors → loading → metrics, then advance_tick() \
                     before the next cycle. See Simulation::set_strict_phase_order.",
                );
                self.phase_check =
                    next.map_or(PhaseCheckState::AwaitingTick, PhaseCheckState::Expecting);
            }
            PhaseCheckState::AwaitingTick => {
                panic!(
                    "substep phase order violated: called {current} but the previous tick's \
                     metrics phase has run — advance_tick() must run before the next cycle. \
                     See Simulation::set_strict_phase_order.",
                );
            }
        }
    }

    /// Run only the `advance_transient` phase (with hooks).
    ///
    /// # Phase ordering
    ///
    /// When calling individual phase methods instead of [`step()`](Self::step),
    /// phases **must** be called in this order each tick:
    ///
    /// 1. `run_advance_transient`
    /// 2. `run_dispatch`
    /// 3. `run_reposition`
    /// 4. `run_advance_queue`
    /// 5. `run_movement`
    /// 6. `run_doors`
    /// 7. `run_loading`
    /// 8. `run_metrics`
    ///
    /// Out-of-order execution may cause riders to board with closed doors,
    /// elevators to move before dispatch, or transient states to persist
    /// across tick boundaries.
    pub fn run_advance_transient(&mut self) {
        self.check_and_advance_phase(Phase::AdvanceTransient, Some(Phase::Dispatch));
        self.set_tick_in_progress(true);
        self.sync_world_tick();
        self.hooks
            .run_before(Phase::AdvanceTransient, &mut self.world);
        for group in &self.groups {
            self.hooks
                .run_before_group(Phase::AdvanceTransient, group.id(), &mut self.world);
        }
        let ctx = self.phase_context();
        crate::systems::advance_transient::run(
            &mut self.world,
            &mut self.events,
            &ctx,
            &mut self.rider_index,
        );
        for group in &self.groups {
            self.hooks
                .run_after_group(Phase::AdvanceTransient, group.id(), &mut self.world);
        }
        self.hooks
            .run_after(Phase::AdvanceTransient, &mut self.world);
    }

    /// Run only the dispatch phase (with hooks).
    pub fn run_dispatch(&mut self) {
        self.check_and_advance_phase(Phase::Dispatch, Some(Phase::Reposition));
        self.sync_world_tick();
        self.hooks.run_before(Phase::Dispatch, &mut self.world);
        for group in &self.groups {
            self.hooks
                .run_before_group(Phase::Dispatch, group.id(), &mut self.world);
        }
        let ctx = self.phase_context();
        crate::systems::dispatch::run(
            &mut self.world,
            &mut self.events,
            &ctx,
            &self.groups,
            self.dispatcher_set.strategies_mut(),
            &self.rider_index,
            &mut self.dispatch_scratch,
        );
        for group in &self.groups {
            self.hooks
                .run_after_group(Phase::Dispatch, group.id(), &mut self.world);
        }
        self.hooks.run_after(Phase::Dispatch, &mut self.world);
    }

    /// Run only the movement phase (with hooks).
    pub fn run_movement(&mut self) {
        self.check_and_advance_phase(Phase::Movement, Some(Phase::Doors));
        self.hooks.run_before(Phase::Movement, &mut self.world);
        for group in &self.groups {
            self.hooks
                .run_before_group(Phase::Movement, group.id(), &mut self.world);
        }
        let ctx = self.phase_context();
        self.world.elevator_ids_into(&mut self.elevator_ids_buf);
        crate::systems::movement::run(
            &mut self.world,
            &mut self.events,
            &ctx,
            &self.elevator_ids_buf,
            &mut self.metrics,
        );
        for group in &self.groups {
            self.hooks
                .run_after_group(Phase::Movement, group.id(), &mut self.world);
        }
        self.hooks.run_after(Phase::Movement, &mut self.world);
    }

    /// Run only the doors phase (with hooks).
    pub fn run_doors(&mut self) {
        self.check_and_advance_phase(Phase::Doors, Some(Phase::Loading));
        self.hooks.run_before(Phase::Doors, &mut self.world);
        for group in &self.groups {
            self.hooks
                .run_before_group(Phase::Doors, group.id(), &mut self.world);
        }
        let ctx = self.phase_context();
        self.world.elevator_ids_into(&mut self.elevator_ids_buf);
        crate::systems::doors::run(
            &mut self.world,
            &mut self.events,
            &ctx,
            &self.groups,
            &self.elevator_ids_buf,
        );
        for group in &self.groups {
            self.hooks
                .run_after_group(Phase::Doors, group.id(), &mut self.world);
        }
        self.hooks.run_after(Phase::Doors, &mut self.world);
    }

    /// Run only the loading phase (with hooks).
    pub fn run_loading(&mut self) {
        self.check_and_advance_phase(Phase::Loading, Some(Phase::Metrics));
        self.hooks.run_before(Phase::Loading, &mut self.world);
        for group in &self.groups {
            self.hooks
                .run_before_group(Phase::Loading, group.id(), &mut self.world);
        }
        let ctx = self.phase_context();
        self.world.elevator_ids_into(&mut self.elevator_ids_buf);
        crate::systems::loading::run(
            &mut self.world,
            &mut self.events,
            &ctx,
            &self.groups,
            &self.elevator_ids_buf,
            &mut self.rider_index,
        );
        for group in &self.groups {
            self.hooks
                .run_after_group(Phase::Loading, group.id(), &mut self.world);
        }
        self.hooks.run_after(Phase::Loading, &mut self.world);
    }

    /// Run only the advance-queue phase (with hooks).
    ///
    /// Reconciles each elevator's phase/target with the front of its
    /// [`DestinationQueue`](crate::components::DestinationQueue). Runs
    /// between Reposition and Movement.
    pub fn run_advance_queue(&mut self) {
        self.check_and_advance_phase(Phase::AdvanceQueue, Some(Phase::Movement));
        self.hooks.run_before(Phase::AdvanceQueue, &mut self.world);
        for group in &self.groups {
            self.hooks
                .run_before_group(Phase::AdvanceQueue, group.id(), &mut self.world);
        }
        let ctx = self.phase_context();
        self.world.elevator_ids_into(&mut self.elevator_ids_buf);
        crate::systems::advance_queue::run(
            &mut self.world,
            &mut self.events,
            &ctx,
            &self.groups,
            &self.elevator_ids_buf,
        );
        for group in &self.groups {
            self.hooks
                .run_after_group(Phase::AdvanceQueue, group.id(), &mut self.world);
        }
        self.hooks.run_after(Phase::AdvanceQueue, &mut self.world);
    }

    /// Run only the reposition phase (with hooks).
    ///
    /// Global before/after hooks always fire even when no
    /// [`RepositionStrategy`](crate::dispatch::RepositionStrategy) is
    /// configured. Per-group hooks only fire for groups that have a
    /// repositioner — this differs from other phases where per-group hooks
    /// fire unconditionally.
    pub fn run_reposition(&mut self) {
        self.check_and_advance_phase(Phase::Reposition, Some(Phase::AdvanceQueue));
        self.sync_world_tick();
        self.hooks.run_before(Phase::Reposition, &mut self.world);
        if !self.repositioner_set.is_empty() {
            // Only run per-group hooks for groups that have a repositioner.
            for group in &self.groups {
                if self.repositioner_set.contains_key(group.id()) {
                    self.hooks
                        .run_before_group(Phase::Reposition, group.id(), &mut self.world);
                }
            }
            let ctx = self.phase_context();
            crate::systems::reposition::run(
                &mut self.world,
                &mut self.events,
                &ctx,
                &self.groups,
                self.repositioner_set.strategies_mut(),
                &mut self.reposition_buf,
            );
            for group in &self.groups {
                if self.repositioner_set.contains_key(group.id()) {
                    self.hooks
                        .run_after_group(Phase::Reposition, group.id(), &mut self.world);
                }
            }
        }
        self.hooks.run_after(Phase::Reposition, &mut self.world);
    }

    /// Run the energy system (no hooks — inline phase).
    #[cfg(feature = "energy")]
    fn run_energy(&mut self) {
        let ctx = self.phase_context();
        self.world.elevator_ids_into(&mut self.elevator_ids_buf);
        crate::systems::energy::run(
            &mut self.world,
            &mut self.events,
            &ctx,
            &self.elevator_ids_buf,
        );
    }

    /// Run only the metrics phase (with hooks).
    pub fn run_metrics(&mut self) {
        // None → AwaitingTick: advance_tick() must come before the next cycle.
        self.check_and_advance_phase(Phase::Metrics, None);
        self.hooks.run_before(Phase::Metrics, &mut self.world);
        for group in &self.groups {
            self.hooks
                .run_before_group(Phase::Metrics, group.id(), &mut self.world);
        }
        let ctx = self.phase_context();
        crate::systems::metrics::run(
            &mut self.world,
            &self.events,
            &mut self.metrics,
            &ctx,
            &self.groups,
        );
        for group in &self.groups {
            self.hooks
                .run_after_group(Phase::Metrics, group.id(), &mut self.world);
        }
        self.hooks.run_after(Phase::Metrics, &mut self.world);
    }

    // Phase-hook registration lives in `sim/construction.rs`.

    /// Increment the tick counter and flush events to the output buffer.
    ///
    /// Call after running all desired phases. Events emitted during this tick
    /// are moved to the output buffer and available via `drain_events()`.
    pub fn advance_tick(&mut self) {
        // Reset the substep guard to the start of the next cycle. With
        // strict mode on, calling advance_tick from Expecting(X != AdvanceTransient)
        // means the host skipped at least one phase — fail loud rather
        // than silently bumping the tick counter on a half-stepped cycle.
        match self.phase_check {
            PhaseCheckState::Disabled => {}
            PhaseCheckState::AwaitingTick => {
                self.phase_check = PhaseCheckState::Expecting(Phase::AdvanceTransient);
            }
            PhaseCheckState::Expecting(phase) => {
                assert_eq!(
                    phase,
                    Phase::AdvanceTransient,
                    "advance_tick() called mid-tick: expected to be entering phase {phase} but the \
                     metrics phase has not run yet. See Simulation::set_strict_phase_order.",
                );
                // Already at the start of a cycle (no phases run since
                // last advance_tick) — harmless idempotent reset.
            }
        }
        self.pending_output.extend(self.events.drain());
        self.tick += 1;
        self.set_tick_in_progress(false);
        // Keep the `CurrentTick` world resource in lockstep after the tick
        // counter advances; substep consumers driving phases manually
        // will see the fresh value on their next call.
        self.sync_world_tick();
        // Drop arrival-log entries older than the configured retention.
        // Unbounded growth would turn `arrivals_in_window` into an O(n)
        // per-stop per-tick scan.
        let retention = self
            .world
            .resource::<crate::arrival_log::ArrivalLogRetention>()
            .copied()
            .unwrap_or_default()
            .0;
        let cutoff = self.tick.saturating_sub(retention);
        if let Some(log) = self.world.resource_mut::<crate::arrival_log::ArrivalLog>() {
            log.prune_before(cutoff);
        }
        if let Some(log) = self
            .world
            .resource_mut::<crate::arrival_log::DestinationLog>()
        {
            log.prune_before(cutoff);
        }
    }

    /// Mirror `self.tick` into the `CurrentTick` world resource so
    /// phases that only have `&World` (reposition strategies, custom
    /// consumers) can compute rolling-window queries without plumbing
    /// `PhaseContext`. Called from `step()` and `advance_tick()` so
    /// manual-phase callers stay in sync too.
    fn sync_world_tick(&mut self) {
        if let Some(ct) = self.world.resource_mut::<crate::arrival_log::CurrentTick>() {
            ct.0 = self.tick;
        }
    }

    /// Advance the simulation by one tick.
    ///
    /// Events from this tick are buffered internally and available via
    /// `drain_events()`. The metrics system only processes events from
    /// the current tick, regardless of whether the consumer drains them.
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
    /// sim.step();
    /// assert_eq!(sim.current_tick(), 1);
    /// ```
    pub fn step(&mut self) {
        self.sync_world_tick();
        self.world.snapshot_prev_positions();
        self.run_advance_transient();
        self.run_dispatch();
        self.run_reposition();
        self.run_advance_queue();
        self.run_movement();
        self.run_doors();
        self.run_loading();
        #[cfg(feature = "energy")]
        self.run_energy();
        self.run_metrics();
        self.advance_tick();
    }

    /// Advance the simulation by `n` ticks.
    ///
    /// Equivalent to calling [`step`](Self::step) `n` times. Hosts driving
    /// the sim across an FFI / wasm boundary should prefer this over a
    /// per-tick loop on their side: keeping the loop in Rust avoids
    /// per-tick boundary crossings that add up at scale.
    ///
    /// Events from each tick accumulate in the internal queue; consumers
    /// call [`drain_events`](Self::drain_events) once after the batch to
    /// read the cumulative stream.
    ///
    /// `n == 0` is a no-op.
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
    /// sim.step_many(60);
    /// assert_eq!(sim.current_tick(), 60);
    /// ```
    pub fn step_many(&mut self, n: u32) {
        for _ in 0..n {
            self.step();
        }
    }

    /// Step the simulation until every rider reaches a terminal phase
    /// (`Arrived`, `Abandoned`, or `Resident`), draining events each
    /// tick so event-driven metrics stay up to date.
    ///
    /// Returns the number of ticks actually stepped, or `Err(max_ticks)`
    /// if the budget was exhausted before the sim drained. The cap is a
    /// safety net against a stuck dispatch or an unserviceable rider
    /// holding the tick loop open forever — right-size it for your
    /// workload and fail fast rather than spinning silently.
    ///
    /// A sim with zero riders returns `Ok(0)` immediately.
    ///
    /// ```
    /// use elevator_core::prelude::*;
    /// use elevator_core::stop::StopId;
    ///
    /// let mut sim = SimulationBuilder::demo().build().unwrap();
    /// sim.spawn_rider(StopId(0), StopId(1), 70.0).unwrap();
    /// let ticks = sim.run_until_quiet(2_000).expect("sim drained in time");
    /// assert!(sim.metrics().total_delivered() >= 1);
    /// assert!(ticks <= 2_000);
    /// ```
    ///
    /// # Errors
    /// Returns `Err(max_ticks)` when `max_ticks` elapse without every
    /// rider reaching a terminal phase. Inspect `sim.world()`
    /// iteration or `sim.metrics()` to diagnose stuck riders; the
    /// sim is left in its partially-advanced state so you can
    /// snapshot it for post-mortem.
    pub fn run_until_quiet(&mut self, max_ticks: u64) -> Result<u64, u64> {
        use crate::components::RiderPhase;

        fn all_quiet(sim: &super::Simulation) -> bool {
            sim.world().iter_riders().all(|(_, r)| {
                matches!(
                    r.phase(),
                    RiderPhase::Arrived | RiderPhase::Abandoned | RiderPhase::Resident
                )
            })
        }

        if all_quiet(self) {
            return Ok(0);
        }
        for tick in 1..=max_ticks {
            self.step();
            let _ = self.drain_events();
            if all_quiet(self) {
                return Ok(tick);
            }
        }
        Err(max_ticks)
    }
}
