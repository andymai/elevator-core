//! Compiles the crate README and every `docs/src/` chapter as doc tests so
//! the code fences inside them cannot drift from the real API.
//!
//! Each `include_str!` pulls a markdown file into rustdoc's view. `cargo
//! test --doc` then extracts every fenced Rust block and compiles it. Bare
//! ```rust fences are compiled and run; ```rust,no_run fences are compiled
//! only (safe for infinite loops or long simulations); ```rust,ignore is
//! disallowed by `scripts/lint-docs.sh`.
//!
//! Chapters that require the `elevator-bevy` crate (e.g. `bevy-integration.md`)
//! are hosted in that crate's doctest module instead.

#![cfg(doctest)]
#![allow(missing_docs)]

#[doc = include_str!("../../../README.md")]
pub struct Readme;

#[doc = include_str!("../../../docs/src/quick-start.md")]
pub struct QuickStart;

#[doc = include_str!("../../../docs/src/configuration.md")]
pub struct Configuration;

#[doc = include_str!("../../../docs/src/stops-lines-groups.md")]
pub struct StopsLinesGroups;

#[doc = include_str!("../../../docs/src/elevators.md")]
pub struct Elevators;

#[doc = include_str!("../../../docs/src/riders.md")]
pub struct Riders;

#[doc = include_str!("../../../docs/src/rider-lifecycle.md")]
pub struct RiderLifecycle;

#[doc = include_str!("../../../docs/src/simulation-loop.md")]
pub struct SimulationLoop;

#[doc = include_str!("../../../docs/src/dispatch-strategies.md")]
pub struct DispatchStrategies;

#[doc = include_str!("../../../docs/src/custom-dispatch.md")]
pub struct CustomDispatch;

#[doc = include_str!("../../../docs/src/hall-calls.md")]
pub struct HallCalls;

#[doc = include_str!("../../../docs/src/door-control.md")]
pub struct DoorControl;

#[doc = include_str!("../../../docs/src/movement-physics.md")]
pub struct MovementPhysics;

#[doc = include_str!("../../../docs/src/manual-inspection-modes.md")]
pub struct ManualInspectionModes;

#[doc = include_str!("../../../docs/src/events-metrics.md")]
pub struct EventsMetrics;

#[doc = include_str!("../../../docs/src/lifecycle-hooks.md")]
pub struct LifecycleHooks;

#[doc = include_str!("../../../docs/src/extensions.md")]
pub struct Extensions;

#[doc = include_str!("../../../docs/src/snapshots-determinism.md")]
pub struct SnapshotsDeterminism;

#[doc = include_str!("../../../docs/src/traffic-generation.md")]
pub struct TrafficGeneration;

#[doc = include_str!("../../../docs/src/error-handling.md")]
pub struct ErrorHandling;

#[doc = include_str!("../../../docs/src/headless-non-bevy.md")]
pub struct HeadlessNonBevy;

#[doc = include_str!("../../../docs/src/testing.md")]
pub struct Testing;

#[doc = include_str!("../../../docs/src/performance.md")]
pub struct Performance;
