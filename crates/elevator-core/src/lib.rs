//! # elevator-core
//!
//! Engine-agnostic, tick-based elevator simulation library for Rust.
//!
//! This crate provides the building blocks for modeling vertical transportation
//! systems — from a 3-story office building to an orbital space elevator.
//! Stops sit at arbitrary positions rather than uniform floors, and the
//! simulation is driven by a deterministic 7-phase tick loop.
//!
//! ## Key capabilities
//!
//! - **Pluggable dispatch** — four built-in algorithms ([`dispatch::scan::ScanDispatch`],
//!   [`dispatch::look::LookDispatch`], [`dispatch::nearest_car::NearestCarDispatch`],
//!   [`dispatch::etd::EtdDispatch`]) plus the [`dispatch::DispatchStrategy`] trait
//!   for custom implementations.
//! - **Trapezoidal motion profiles** — realistic acceleration, cruise, and
//!   deceleration computed per-tick in the [`movement`] module.
//! - **Extension components** — attach arbitrary `Serialize + DeserializeOwned`
//!   data to any entity via [`world::World::insert_ext`] without modifying the
//!   library.
//! - **Lifecycle hooks** — inject logic before or after any of the six
//!   simulation phases. See [`hooks::Phase`].
//! - **Metrics and events** — query aggregate wait/ride times through
//!   [`metrics::Metrics`] and react to fine-grained tick events via
//!   [`events::Event`].
//! - **Snapshot save/load** — capture and restore full simulation state with
//!   [`snapshot::WorldSnapshot`].
//! - **Zero `unsafe` code** — enforced by `#![forbid(unsafe_code)]`.
//!
//! ## Quick start
//!
//! ```rust
//! use elevator_core::prelude::*;
//! use elevator_core::stop::StopConfig;
//!
//! let mut sim = SimulationBuilder::new()
//!     .stops(vec![
//!         StopConfig { id: StopId(0), name: "Ground".into(), position: 0.0 },
//!         StopConfig { id: StopId(1), name: "Floor 2".into(), position: 4.0 },
//!         StopConfig { id: StopId(2), name: "Floor 3".into(), position: 8.0 },
//!     ])
//!     .build()
//!     .unwrap();
//!
//! sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 75.0).unwrap();
//!
//! for _ in 0..1000 {
//!     sim.step();
//! }
//!
//! assert!(sim.metrics().total_delivered() > 0);
//! ```
//!
//! ## Crate layout
//!
//! | Module | Purpose |
//! |--------|---------|
//! | [`builder`] | Fluent [`SimulationBuilder`](builder::SimulationBuilder) API |
//! | [`sim`] | Top-level [`Simulation`](sim::Simulation) runner and tick loop |
//! | [`dispatch`] | Dispatch strategies and the [`DispatchStrategy`](dispatch::DispatchStrategy) trait |
//! | [`world`] | ECS-style [`World`](world::World) with typed component storage |
//! | [`components`] | Data types: [`Elevator`](components::Elevator), [`Rider`](components::Rider), [`Stop`](components::Stop), etc. |
//! | [`events`] | [`Event`](events::Event) variants and the [`EventBus`](events::EventBus) |
//! | [`metrics`] | Aggregate [`Metrics`](metrics::Metrics) (wait time, throughput, etc.) |
//! | [`config`] | RON-deserializable [`SimConfig`](config::SimConfig) |
//! | [`hooks`] | Lifecycle hook registration by [`Phase`](hooks::Phase) |
//! | [`query`] | Entity query builder for filtering by component composition |
//!
//! ## Architecture overview
//!
//! ### 7-phase tick loop
//!
//! Each call to [`Simulation::step()`](sim::Simulation::step) runs these
//! phases in order:
//!
//! 1. **`AdvanceTransient`** — transitions `Boarding→Riding`, `Exiting→Arrived`,
//!    teleports walkers.
//! 2. **Dispatch** — builds a [`DispatchManifest`](dispatch::DispatchManifest)
//!    and calls each group's [`DispatchStrategy`](dispatch::DispatchStrategy).
//! 3. **Reposition** — optional phase; moves idle elevators via
//!    [`RepositionStrategy`](dispatch::RepositionStrategy) for better coverage.
//! 4. **Movement** — applies trapezoidal velocity profiles, detects stop arrivals
//!    and emits [`PassingFloor`](events::Event::PassingFloor) events.
//! 5. **Doors** — ticks the [`DoorState`](door::DoorState) FSM per elevator.
//! 6. **Loading** — boards/exits riders with capacity and preference checks.
//! 7. **Metrics** — aggregates wait/ride times into [`Metrics`](metrics::Metrics)
//!    and per-tag accumulators.
//!
//! ### Component relationships
//!
//! ```text
//! Group ──contains──▶ Line ──has──▶ Elevator ──carries──▶ Rider
//!   │                  │              │                      │
//!   └── DispatchStrategy              └── Position           └── Route (optional)
//!        RepositionStrategy               Velocity               Patience
//!                      │                  DoorState               Preferences
//!                      └── Stop (served stops along the shaft)
//! ```
//!
//! ### Extension storage
//!
//! Games attach custom data to any entity without modifying the library:
//!
//! ```rust,ignore
//! // Attach a VIP flag to a rider.
//! world.insert_ext(rider_id, VipTag { priority: 1 }, "vip_tag");
//!
//! // Query it alongside built-in components.
//! for (id, rider, vip) in world.query::<(EntityId, &Rider, &Ext<VipTag>)>().iter() {
//!     // ...
//! }
//! ```
//!
//! Extensions participate in snapshots via `serialize_extensions()` /
//! `register_ext::<T>(name)` + `load_extensions()`.
//!
//! ### Snapshot lifecycle
//!
//! 1. Capture: `sim.snapshot()` → [`WorldSnapshot`](snapshot::WorldSnapshot)
//! 2. Serialize: serde (RON, JSON, bincode, etc.)
//! 3. Deserialize + restore: `snapshot.restore(factory)` → new `Simulation`
//! 4. Re-register extensions: `world.register_ext::<T>(name)` per type
//! 5. Load extension data: `sim.load_extensions()`
//!
//! ### Performance
//!
//! | Operation | Complexity |
//! |-----------|-----------|
//! | Entity iteration | O(n) via `SlotMap` secondary maps |
//! | Stop-passing detection | O(log n) via `SortedStops` binary search |
//! | Dispatch manifest build | O(riders) per group |
//! | Topology graph queries | O(V+E) BFS, lazy rebuild |
//!
//! For narrative guides, tutorials, and architecture walkthroughs, see the
//! [mdBook documentation](https://andymai.github.io/elevator-core/).

#![forbid(unsafe_code)]
#![deny(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

/// Entity-component data types for the simulation.
pub mod components;
/// Entity identity and allocation.
pub mod entity;
/// Simulation error types.
pub mod error;
/// Typed identifiers for groups and other sim concepts.
pub mod ids;
/// ECS-style query builder for iterating entities by component composition.
pub mod query;
/// Tick-loop system phases (dispatch, reposition, movement, doors, loading, metrics).
pub mod systems;
/// Central entity/component storage.
pub mod world;

/// Fluent builder for constructing a Simulation programmatically.
pub mod builder;
/// Building and elevator configuration (RON deserialization).
pub mod config;
/// Pluggable dispatch strategies (SCAN, LOOK, nearest-car, ETD).
pub mod dispatch;
/// Door finite-state machine.
pub mod door;
/// Simulation event bus and event types.
pub mod events;
/// Lifecycle hooks for injecting logic before/after simulation phases.
pub mod hooks;
/// Aggregate simulation metrics.
pub mod metrics;
/// Trapezoidal velocity-profile movement math.
pub mod movement;
/// Scenario replay from recorded event streams.
pub mod scenario;
/// Top-level simulation runner.
pub mod sim;
/// World snapshot for save/load.
pub mod snapshot;
/// Stop configuration helpers.
pub mod stop;
/// Tag-based per-entity metrics.
pub mod tagged_metrics;
/// Tick-to-wall-clock time conversion.
pub mod time;
/// Topology graph for cross-line connectivity queries.
pub mod topology;
/// Traffic generation (arrival patterns).
#[cfg(feature = "traffic")]
pub mod traffic;

/// Register multiple extension types for snapshot deserialization in one call.
///
/// Eliminates the manual `register_ext` ceremony after snapshot restore.
///
/// # Example
///
/// ```ignore
/// register_extensions!(sim.world_mut(), VipTag => "vip_tag", Priority => "priority");
/// ```
#[macro_export]
macro_rules! register_extensions {
    ($world:expr, $($ty:ty => $name:expr),+ $(,)?) => {
        $( $world.register_ext::<$ty>($name); )+
    };
}

/// Common imports for consumers of this library.
pub mod prelude {
    pub use crate::builder::SimulationBuilder;
    pub use crate::components::{
        Elevator, ElevatorPhase, FloorPosition, Line, Orientation, Patience, Position, Preferences,
        Rider, RiderPhase, Route, Stop, Velocity,
    };
    pub use crate::config::{GroupConfig, LineConfig, SimConfig};
    pub use crate::dispatch::reposition::{
        DemandWeighted, NearestIdle, ReturnToLobby, SpreadEvenly,
    };
    pub use crate::dispatch::{
        BuiltinReposition, BuiltinStrategy, DispatchDecision, DispatchManifest, DispatchStrategy,
        RepositionStrategy, RiderInfo,
    };
    pub use crate::dispatch::{ElevatorGroup, LineInfo};
    pub use crate::entity::EntityId;
    pub use crate::error::{RejectionContext, RejectionReason, SimError};
    pub use crate::events::{Event, EventBus, EventChannel, RouteInvalidReason};
    pub use crate::hooks::Phase;
    pub use crate::ids::GroupId;
    pub use crate::metrics::Metrics;
    pub use crate::sim::{ElevatorParams, LineParams, Simulation};
    pub use crate::snapshot::WorldSnapshot;
    pub use crate::stop::StopId;
    pub use crate::systems::PhaseContext;
    pub use crate::tagged_metrics::{MetricTags, TaggedMetric};
    pub use crate::time::TimeAdapter;
    pub use crate::topology::TopologyGraph;
}

#[cfg(test)]
mod tests;
