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
use crate::systems::PhaseContext;
use std::collections::BTreeMap;

impl super::Simulation {
    // ── Sub-stepping ────────────────────────────────────────────────

    /// Get the dispatch strategies map (for advanced sub-stepping).
    #[must_use]
    pub fn dispatchers(&self) -> &BTreeMap<GroupId, Box<dyn DispatchStrategy>> {
        &self.dispatchers
    }

    /// Get the dispatch strategies map mutably (for advanced sub-stepping).
    pub fn dispatchers_mut(&mut self) -> &mut BTreeMap<GroupId, Box<dyn DispatchStrategy>> {
        &mut self.dispatchers
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
        self.tick_in_progress = true;
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
            &mut self.dispatchers,
            &self.rider_index,
        );
        for group in &self.groups {
            self.hooks
                .run_after_group(Phase::Dispatch, group.id(), &mut self.world);
        }
        self.hooks.run_after(Phase::Dispatch, &mut self.world);
    }

    /// Run only the movement phase (with hooks).
    pub fn run_movement(&mut self) {
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
        self.sync_world_tick();
        self.hooks.run_before(Phase::Reposition, &mut self.world);
        if !self.repositioners.is_empty() {
            // Only run per-group hooks for groups that have a repositioner.
            for group in &self.groups {
                if self.repositioners.contains_key(&group.id()) {
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
                &mut self.repositioners,
                &mut self.reposition_buf,
            );
            for group in &self.groups {
                if self.repositioners.contains_key(&group.id()) {
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
        self.pending_output.extend(self.events.drain());
        self.tick += 1;
        self.tick_in_progress = false;
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
}
