//! Terminal UI debugger for `elevator-core`.
//!
//! Two modes share one binary:
//!
//! - **Interactive** (default): live viewer with shaft column, event log,
//!   dispatch summary, and metrics; pause/step/rate hotkeys; category
//!   filters and per-entity follow.
//! - **Headless** (`--headless`): step the sim N ticks, print a metrics
//!   summary, optionally emit the full event stream as JSON. Suitable
//!   for CI smoke tests and bug-repro capture.
//!
//! See `docs/src/tui-debugger.md` for the full hotkey reference and
//! debugging recipes.

pub mod app;
pub mod cli;
pub mod config_io;
pub mod headless;
pub mod state;
pub mod ui;
