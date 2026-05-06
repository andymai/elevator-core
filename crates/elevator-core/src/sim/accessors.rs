//! Core accessors: world, tick, metrics, groups, stop lookup.
//!
//! Part of the [`super::Simulation`] API surface; extracted from the
//! monolithic `sim.rs` for readability. See the parent module for the
//! overarching essential-API summary.

use crate::components::Velocity;
use crate::dispatch::ElevatorGroup;
use crate::entity::EntityId;
use crate::error::SimError;
use crate::events::Event;
use crate::ids::GroupId;
use crate::metrics::Metrics;
use crate::stop::{StopId, StopRef};
use crate::time::TimeAdapter;
use crate::world::World;

impl super::Simulation {
    // ── Accessors ────────────────────────────────────────────────────

    /// Get a shared reference to the world.
    //
    // Intentionally non-`const`: a `const` qualifier on a runtime accessor
    // signals "usable in const context", which these methods are not in
    // practice (the `World` is heap-allocated and mutated). Marking them
    // `const` misleads readers without unlocking any call sites.
    #[must_use]
    #[allow(clippy::missing_const_for_fn)]
    pub fn world(&self) -> &World {
        &self.world
    }

    /// Get a mutable reference to the world.
    ///
    /// Exposed for advanced use cases (manual rider management, custom
    /// component attachment). Prefer `spawn_rider` / `build_rider`
    /// for standard operations.
    #[allow(clippy::missing_const_for_fn)]
    pub fn world_mut(&mut self) -> &mut World {
        &mut self.world
    }

    /// Current simulation tick.
    #[must_use]
    pub const fn current_tick(&self) -> u64 {
        self.tick
    }

    /// Time delta per tick (seconds).
    #[must_use]
    pub const fn dt(&self) -> f64 {
        self.dt
    }

    /// Interpolated position between the previous and current tick.
    ///
    /// `alpha` is clamped to `[0.0, 1.0]`, where `0.0` returns the entity's
    /// position at the start of the last completed tick and `1.0` returns
    /// the current position. Intended for smooth rendering when a render
    /// frame falls between simulation ticks.
    ///
    /// Returns `None` if the entity has no position component. Returns the
    /// current position unchanged if no previous snapshot exists (i.e. before
    /// the first [`step`](Self::step)).
    ///
    /// [`step`]: Self::step
    #[must_use]
    pub fn position_at(&self, id: EntityId, alpha: f64) -> Option<f64> {
        let current = self.world.position(id)?.value;
        let alpha = if alpha.is_nan() {
            0.0
        } else {
            alpha.clamp(0.0, 1.0)
        };
        let prev = self.world.prev_position(id).map_or(current, |p| p.value);
        Some(crate::fp::fma(current - prev, alpha, prev))
    }

    /// Current velocity of an entity along the shaft axis (signed: +up, -down).
    ///
    /// Convenience wrapper over [`World::velocity`] that returns the raw
    /// `f64` value. Returns `None` if the entity has no velocity component.
    #[must_use]
    pub fn velocity(&self, id: EntityId) -> Option<f64> {
        self.world.velocity(id).map(Velocity::value)
    }

    /// Get current simulation metrics.
    #[must_use]
    pub const fn metrics(&self) -> &Metrics {
        &self.metrics
    }

    /// The time adapter for tick↔wall-clock conversion.
    #[must_use]
    pub const fn time(&self) -> &TimeAdapter {
        &self.time
    }

    /// Get the elevator groups.
    #[must_use]
    pub fn groups(&self) -> &[ElevatorGroup] {
        &self.groups
    }

    /// Build the [`DispatchManifest`](crate::dispatch::DispatchManifest)
    /// for `group` as it would appear at the start of the next dispatch
    /// pass. Intended for tests and tools that need to inspect the
    /// demand/arrival-rate picture without stepping the sim.
    #[must_use]
    pub fn build_dispatch_manifest(
        &self,
        group: &ElevatorGroup,
    ) -> crate::dispatch::DispatchManifest {
        crate::systems::dispatch::build_manifest(&self.world, group, self.tick, &self.rider_index)
    }

    /// Convenience wrapper returning the manifest for the first group —
    /// what a single-group default-topology sim would dispatch against.
    #[must_use]
    pub fn peek_dispatch_manifest(&self) -> crate::dispatch::DispatchManifest {
        self.groups
            .first()
            .map(|g| self.build_dispatch_manifest(g))
            .unwrap_or_default()
    }

    /// Set how far back the arrival log retains entries before
    /// `advance_tick` prunes them.
    ///
    /// [`set_reposition`](super::Simulation::set_reposition) auto-widens
    /// retention to the installed strategy's
    /// [`min_arrival_log_window`](crate::dispatch::RepositionStrategy::min_arrival_log_window),
    /// so most callers don't need this. Reach for it only when retention
    /// must differ from any strategy's window — tests, custom consumers
    /// reading [`ArrivalLog`](crate::arrival_log::ArrivalLog) directly,
    /// or to pre-stage retention before installing a strategy.
    ///
    /// ## Footgun
    /// Calling this *after* `set_reposition` with a value smaller than
    /// the installed strategy's window silently re-introduces the
    /// truncation bug `set_reposition` was designed to avoid: the
    /// strategy will see only the last `retention_ticks` of arrivals,
    /// not its configured window. The setter trusts the caller; if you
    /// only want to ensure retention is at least N ticks, do
    /// `max(N, current_retention)` at the call site.
    pub fn set_arrival_log_retention_ticks(&mut self, retention_ticks: u64) {
        if let Some(r) = self
            .world
            .resource_mut::<crate::arrival_log::ArrivalLogRetention>()
        {
            r.0 = retention_ticks;
        }
    }

    /// Mutable access to the group collection. Use this to flip a group
    /// into [`HallCallMode::Destination`](crate::dispatch::HallCallMode)
    /// or tune its `ack_latency_ticks` after construction. Changing the
    /// line/elevator structure here is not supported — use the dedicated
    /// topology mutators for that.
    pub fn groups_mut(&mut self) -> &mut [ElevatorGroup] {
        &mut self.groups
    }

    /// Resolve a config `StopId` to its runtime `EntityId`.
    #[must_use]
    pub fn stop_entity(&self, id: StopId) -> Option<EntityId> {
        self.stop_lookup.get(&id).copied()
    }

    /// Resolve a [`StopRef`] to its runtime [`EntityId`].
    pub(super) fn resolve_stop(&self, stop: StopRef) -> Result<EntityId, SimError> {
        match stop {
            StopRef::ByEntity(id) => Ok(id),
            StopRef::ById(sid) => self.stop_entity(sid).ok_or(SimError::StopNotFound(sid)),
        }
    }

    /// Get the strategy identifier for a group.
    #[must_use]
    pub fn strategy_id(&self, group: GroupId) -> Option<&crate::dispatch::BuiltinStrategy> {
        self.strategy_ids.get(&group)
    }

    /// Iterate over the stop ID → entity ID mapping.
    pub fn stop_lookup_iter(&self) -> impl Iterator<Item = (&StopId, &EntityId)> {
        self.stop_lookup.iter()
    }

    /// Peek at events pending for consumer retrieval.
    ///
    /// Flushes the active event bus into the output buffer first so the
    /// returned slice reflects every event emitted up to this call —
    /// matching what [`drain_events`](Self::drain_events) would return.
    /// Without the flush, events emitted outside the tick loop
    /// (`spawn_rider`, `disable`, …) would be visible to drain but not
    /// peek.
    ///
    /// Takes `&mut self` because the flush mutates internal state. If
    /// you only need a count or a quick check after `step()`, prefer
    /// `pending_events().len()` or pattern-matching the slice directly.
    pub fn pending_events(&mut self) -> &[Event] {
        self.pending_output.extend(self.events.drain());
        &self.pending_output
    }
}
