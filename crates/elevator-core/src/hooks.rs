//! Lifecycle hooks for injecting custom logic before/after simulation phases.
//!
//! # Example
//!
//! ```rust
//! use elevator_core::prelude::*;
//! use elevator_core::hooks::Phase;
//!
//! let mut sim = SimulationBuilder::demo()
//!     .before(Phase::Dispatch, |world| {
//!         // Inspect world state before dispatch runs
//!         let idle_count = world.iter_idle_elevators().count();
//!         let _ = idle_count; // use it
//!     })
//!     .build()
//!     .unwrap();
//!
//! sim.step(); // hooks fire during each step
//! ```

use crate::ids::GroupId;
use crate::world::World;
use std::collections::HashMap;

/// Simulation phase identifier for hook registration.
///
/// Each variant corresponds to one phase in the tick loop. Hooks registered
/// for a phase run immediately before or after that phase executes.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[non_exhaustive]
pub enum Phase {
    /// Advance transient rider states (Boarding→Riding, Exiting→Arrived).
    AdvanceTransient,
    /// Assign idle elevators to stops via dispatch strategy.
    Dispatch,
    /// Update elevator position and velocity.
    Movement,
    /// Tick door finite-state machines.
    Doors,
    /// Board and exit riders.
    Loading,
    /// Reposition idle elevators for better coverage.
    Reposition,
    /// Reconcile elevator phase with its `DestinationQueue` front.
    AdvanceQueue,
    /// Aggregate metrics from tick events.
    Metrics,
}

impl std::fmt::Display for Phase {
    /// ```
    /// # use elevator_core::hooks::Phase;
    /// assert_eq!(format!("{}", Phase::Dispatch), "dispatch");
    /// assert_eq!(format!("{}", Phase::AdvanceTransient), "advance_transient");
    /// ```
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::AdvanceTransient => "advance_transient",
            Self::Dispatch => "dispatch",
            Self::Movement => "movement",
            Self::Doors => "doors",
            Self::Loading => "loading",
            Self::Reposition => "reposition",
            Self::AdvanceQueue => "advance_queue",
            Self::Metrics => "metrics",
        };
        f.write_str(s)
    }
}

/// Whether a hook fires before or after its phase.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub(crate) enum When {
    /// Fires immediately before the phase body runs.
    Before,
    /// Fires immediately after the phase body completes.
    After,
}

/// A boxed closure that receives mutable world access during a phase hook.
pub(crate) type PhaseHook = Box<dyn Fn(&mut World) + Send + Sync>;

/// Storage for hooks keyed by `(phase, when, optional group)`.
///
/// Collapses what used to be four parallel `HashMap`s — `before`,
/// `after`, `before_group`, `after_group` — into a single map keyed
/// on the full hook scope. The four `add_*` / `run_*` methods are
/// thin wrappers preserved for the `SimulationBuilder` shape.
#[derive(Default)]
pub(crate) struct PhaseHooks {
    /// All registered hooks keyed on `(phase, when, optional group)`.
    hooks: HashMap<(Phase, When, Option<GroupId>), Vec<PhaseHook>>,
}

impl PhaseHooks {
    /// Append `hook` to the bucket identified by `(phase, when, group)`.
    fn add(&mut self, phase: Phase, when: When, group: Option<GroupId>, hook: PhaseHook) {
        self.hooks
            .entry((phase, when, group))
            .or_default()
            .push(hook);
    }

    /// Invoke every hook registered for the given scope, in
    /// registration order. Returns `true` when at least one hook ran;
    /// the ungrouped wrappers use this to scope the debug invariant
    /// check, preserving the original semantic of "only check when a
    /// hook actually touched the world".
    fn run(&self, phase: Phase, when: When, group: Option<GroupId>, world: &mut World) -> bool {
        let Some(hooks) = self.hooks.get(&(phase, when, group)) else {
            return false;
        };
        for hook in hooks {
            hook(world);
        }
        true
    }

    /// Run all before-hooks for the given phase.
    pub(crate) fn run_before(&self, phase: Phase, world: &mut World) {
        if self.run(phase, When::Before, None, world) {
            Self::debug_check_invariants(phase, world);
        }
    }

    /// Run all after-hooks for the given phase.
    pub(crate) fn run_after(&self, phase: Phase, world: &mut World) {
        if self.run(phase, When::After, None, world) {
            Self::debug_check_invariants(phase, world);
        }
    }

    /// In debug builds, verify that hooks did not break core invariants.
    #[cfg(debug_assertions)]
    fn debug_check_invariants(phase: Phase, world: &World) {
        for (eid, _, elev) in world.iter_elevators() {
            for &rider_id in &elev.riders {
                debug_assert!(
                    world.is_alive(rider_id),
                    "hook after {phase:?}: elevator {eid:?} references dead rider {rider_id:?}"
                );
            }
        }
    }

    #[cfg(not(debug_assertions))]
    fn debug_check_invariants(_phase: Phase, _world: &World) {}

    /// Register a hook to run before a phase.
    pub(crate) fn add_before(&mut self, phase: Phase, hook: PhaseHook) {
        self.add(phase, When::Before, None, hook);
    }

    /// Register a hook to run after a phase.
    pub(crate) fn add_after(&mut self, phase: Phase, hook: PhaseHook) {
        self.add(phase, When::After, None, hook);
    }

    /// Run all before-hooks for the given phase and group.
    pub(crate) fn run_before_group(&self, phase: Phase, group: GroupId, world: &mut World) {
        self.run(phase, When::Before, Some(group), world);
    }

    /// Run all after-hooks for the given phase and group.
    pub(crate) fn run_after_group(&self, phase: Phase, group: GroupId, world: &mut World) {
        self.run(phase, When::After, Some(group), world);
    }

    /// Register a hook to run before a phase for a specific group.
    pub(crate) fn add_before_group(&mut self, phase: Phase, group: GroupId, hook: PhaseHook) {
        self.add(phase, When::Before, Some(group), hook);
    }

    /// Register a hook to run after a phase for a specific group.
    pub(crate) fn add_after_group(&mut self, phase: Phase, group: GroupId, hook: PhaseHook) {
        self.add(phase, When::After, Some(group), hook);
    }
}
