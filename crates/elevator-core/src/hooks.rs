//! Lifecycle hooks for injecting custom logic before/after simulation phases.

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
    /// Advance transient rider states (Boarding→Riding, Alighting→Arrived).
    AdvanceTransient,
    /// Assign idle elevators to stops via dispatch strategy.
    Dispatch,
    /// Update elevator position and velocity.
    Movement,
    /// Tick door finite-state machines.
    Doors,
    /// Board and alight riders.
    Loading,
    /// Aggregate metrics from tick events.
    Metrics,
}

/// A boxed closure that receives mutable world access during a phase hook.
pub(crate) type PhaseHook = Box<dyn Fn(&mut World) + Send + Sync>;

/// Storage for before/after hooks keyed by phase.
#[derive(Default)]
pub(crate) struct PhaseHooks {
    /// Hooks to run before each phase.
    before: HashMap<Phase, Vec<PhaseHook>>,
    /// Hooks to run after each phase.
    after: HashMap<Phase, Vec<PhaseHook>>,
    /// Hooks to run before a phase for a specific group.
    before_group: HashMap<(Phase, GroupId), Vec<PhaseHook>>,
    /// Hooks to run after a phase for a specific group.
    after_group: HashMap<(Phase, GroupId), Vec<PhaseHook>>,
}

impl PhaseHooks {
    /// Run all before-hooks for the given phase.
    pub(crate) fn run_before(&self, phase: Phase, world: &mut World) {
        if let Some(hooks) = self.before.get(&phase) {
            for hook in hooks {
                hook(world);
            }
        }
    }

    /// Run all after-hooks for the given phase.
    pub(crate) fn run_after(&self, phase: Phase, world: &mut World) {
        if let Some(hooks) = self.after.get(&phase) {
            for hook in hooks {
                hook(world);
            }
        }
    }

    /// Register a hook to run before a phase.
    pub(crate) fn add_before(&mut self, phase: Phase, hook: PhaseHook) {
        self.before.entry(phase).or_default().push(hook);
    }

    /// Register a hook to run after a phase.
    pub(crate) fn add_after(&mut self, phase: Phase, hook: PhaseHook) {
        self.after.entry(phase).or_default().push(hook);
    }

    /// Run all before-hooks for the given phase and group.
    pub(crate) fn run_before_group(&self, phase: Phase, group: GroupId, world: &mut World) {
        if let Some(hooks) = self.before_group.get(&(phase, group)) {
            for hook in hooks {
                hook(world);
            }
        }
    }

    /// Run all after-hooks for the given phase and group.
    pub(crate) fn run_after_group(&self, phase: Phase, group: GroupId, world: &mut World) {
        if let Some(hooks) = self.after_group.get(&(phase, group)) {
            for hook in hooks {
                hook(world);
            }
        }
    }

    /// Register a hook to run before a phase for a specific group.
    pub(crate) fn add_before_group(&mut self, phase: Phase, group: GroupId, hook: PhaseHook) {
        self.before_group
            .entry((phase, group))
            .or_default()
            .push(hook);
    }

    /// Register a hook to run after a phase for a specific group.
    pub(crate) fn add_after_group(&mut self, phase: Phase, group: GroupId, hook: PhaseHook) {
        self.after_group
            .entry((phase, group))
            .or_default()
            .push(hook);
    }
}
