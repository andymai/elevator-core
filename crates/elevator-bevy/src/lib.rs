//! Library surface for `elevator-bevy`.
//!
//! The crate ships primarily as a binary (`src/main.rs`). This library target
//! is intentionally minimal: it re-exports only `sim_bridge`, which is the one
//! module whose types (`SimulationRes`, `SimSpeed`, `EventWrapper`) the
//! `bevy-integration.md` chapter imports directly. The chapter's other
//! snippets (the `ElevatorSimPlugin` declaration, per-system examples) define
//! their own shadow types inline so they stay self-contained doctests. If a
//! future chapter needs `plugin` or any other sibling module, expose it here
//! rather than widening the hidden scaffolding.

pub mod sim_bridge;

#[cfg(doctest)]
mod doctests;
