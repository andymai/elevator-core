//! # elevator-core
//!
//! Engine-agnostic, tick-based elevator simulation library for Rust.
//!
//! This crate provides the building blocks for modeling vertical transportation
//! systems — from a 3-story office building to an orbital space elevator.
//! Stops sit at arbitrary positions rather than uniform floors, and the
//! simulation is driven by a deterministic 8-phase tick loop.
//!
//! ## Key capabilities
//!
//! - **Pluggable dispatch** — four built-in algorithms ([`dispatch::scan::ScanDispatch`],
//!   [`dispatch::look::LookDispatch`], [`dispatch::nearest_car::NearestCarDispatch`],
//!   [`dispatch::etd::EtdDispatch`]) plus the [`dispatch::DispatchStrategy`] trait
//!   for custom implementations.
//! - **Trapezoidal motion profiles** — realistic acceleration, cruise, and
//!   deceleration computed per-tick.
//! - **Extension components** — attach arbitrary `Serialize + DeserializeOwned`
//!   data to any entity via [`world::World::insert_ext`] without modifying the
//!   library.
//! - **Lifecycle hooks** — inject logic before or after any of the eight
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
//! let mut sim = SimulationBuilder::demo()
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
//! | [`components`] | Entity data types: [`Rider`](components::Rider), [`Elevator`](components::Elevator), [`Stop`](components::Stop), [`Line`](components::Line), [`Route`](components::Route), [`Patience`](components::Patience), [`Preferences`](components::Preferences), [`AccessControl`](components::AccessControl), [`DestinationQueue`](components::DestinationQueue), [`ServiceMode`](components::ServiceMode), [`Orientation`](components::Orientation), [`Position`](components::Position), [`Velocity`](components::Velocity), [`FloorPosition`](components::FloorPosition) |
//! | [`config`] | RON-deserializable [`SimConfig`](config::SimConfig), [`GroupConfig`](config::GroupConfig), [`LineConfig`](config::LineConfig) |
//! | [`events`] | [`Event`](events::Event) variants and the [`EventBus`](events::EventBus) |
//! | [`metrics`] | Aggregate [`Metrics`](metrics::Metrics) (wait time, throughput, etc.) |
//! | [`hooks`] | Lifecycle hook registration by [`Phase`](hooks::Phase) |
//! | [`query`] | Entity query builder for filtering by component composition |
//! | [`systems`] | Per-phase tick logic (dispatch, movement, doors, loading, ...) |
//! | [`snapshot`] | [`WorldSnapshot`](snapshot::WorldSnapshot) save/restore with custom-strategy factory |
//! | [`scenario`] | Deterministic scenario replay from recorded event streams |
//! | [`topology`] | Lazy-rebuilt connectivity graph for cross-line routing |
//! | [`traffic`] | [`TrafficSource`](traffic::TrafficSource) trait + `PoissonSource` (feature-gated) |
//! | [`tagged_metrics`] | Per-tag metric accumulators for zone/line/priority breakdowns |
//! | [`movement`] | Trapezoidal velocity-profile primitives ([`braking_distance`](movement::braking_distance), [`tick_movement`](movement::tick_movement)) |
//! | [`door`] | Door finite-state machine ([`DoorState`](door::DoorState)) |
//! | [`time`] | Tick-to-wall-clock conversion ([`TimeAdapter`](time::TimeAdapter)) |
//! | `energy` | Simplified per-elevator energy modeling (gated behind the `energy` feature) |
//! | [`stop`] | [`StopId`](stop::StopId) and [`StopConfig`](stop::StopConfig) |
//! | [`entity`] | Opaque [`EntityId`](entity::EntityId) runtime identity |
//! | [`ids`] | Config-level typed identifiers ([`GroupId`](ids::GroupId), etc.) |
//! | [`error`] | [`SimError`](error::SimError), [`RejectionReason`](error::RejectionReason), [`RejectionContext`](error::RejectionContext) |
//!
//! ## Architecture overview
//!
//! ### 8-phase tick loop
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
//! 4. **`AdvanceQueue`** — reconciles each elevator's phase/target with the
//!    front of its [`DestinationQueue`](components::DestinationQueue), so
//!    imperative pushes from game code take effect before movement.
//! 5. **Movement** — applies trapezoidal velocity profiles, detects stop arrivals
//!    and emits [`PassingFloor`](events::Event::PassingFloor) events.
//! 6. **Doors** — ticks the [`DoorState`](door::DoorState) FSM per elevator.
//! 7. **Loading** — boards/exits riders with capacity and preference checks.
//! 8. **Metrics** — aggregates wait/ride times into [`Metrics`](metrics::Metrics)
//!    and per-tag accumulators.
//!
//! For full per-phase semantics (events emitted, edge cases, design rationale),
//! see [`ARCHITECTURE.md`][arch] §3. This crate-level summary is the short
//! form; `ARCHITECTURE.md` is canonical.
//!
//! [arch]: https://github.com/andymai/elevator-core/blob/main/crates/elevator-core/ARCHITECTURE.md
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
//! ### Rider lifecycle
//!
//! Riders progress through phases managed by the simulation:
//!
//! ```text
//! Waiting → Boarding → Riding → Exiting → Arrived
//!    ↑         (1 tick)           (1 tick)     │
//!    │                                         ├── settle_rider() → Resident
//!    │                                         │                       │
//!    │                                         └── despawn_rider()     │
//!    │                                                                 │
//!    └──────── reroute_rider() ────────────────────────────────────────┘
//!
//! Waiting ──(patience exceeded)──→ Abandoned ──→ settle/despawn
//! ```
//!
//! - **`Arrived`** / **`Abandoned`**: terminal states; consumer must explicitly
//!   settle or despawn the rider.
//! - **`Resident`**: parked at a stop, invisible to dispatch and loading.
//!   Query with [`Simulation::residents_at()`](sim::Simulation::residents_at).
//! - **Population queries**: O(1) via maintained reverse index —
//!   [`residents_at`](sim::Simulation::residents_at),
//!   [`waiting_at`](sim::Simulation::waiting_at),
//!   [`abandoned_at`](sim::Simulation::abandoned_at).
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
//! | Population queries | O(1) via `RiderIndex` reverse index |
//! | Topology graph queries | O(V+E) BFS, lazy rebuild |
//!
//! ## Runtime upgrades
//!
//! Elevator kinematic and door-timing parameters can be mutated at runtime
//! via the `Simulation::set_*` setters — handy for RPG-style upgrade systems
//! or scripted events that boost speed, capacity, or door behavior mid-game.
//!
//! Each setter validates its input, mutates the underlying component, and
//! emits an [`Event::ElevatorUpgraded`](events::Event::ElevatorUpgraded) so
//! game code can react (score popups, SFX, UI). Velocity is preserved when
//! kinematic parameters change — the integrator picks up the new values on
//! the next tick without jerk. Door-timing changes apply to the next door
//! cycle and never retroactively retime an in-progress transition.
//!
//! See [`examples/runtime_upgrades.rs`][rte] for an end-to-end demonstration
//! that doubles a car's `max_speed` mid-run and prints the throughput delta.
//!
//! [rte]: https://github.com/andymai/elevator-core/blob/main/crates/elevator-core/examples/runtime_upgrades.rs
//!
//! ## Door control
//!
//! Games that want to drive elevator doors directly — e.g. the player
//! pressing "open" or "close" on a cab panel in a first-person game, or an
//! RPG where the player *is* the elevator — use the manual door-control
//! API on [`Simulation`](sim::Simulation):
//!
//! - [`request_door_open`](sim::Simulation::request_door_open)
//! - [`request_door_close`](sim::Simulation::request_door_close)
//! - [`hold_door_open`](sim::Simulation::hold_door_open) (cumulative)
//! - [`cancel_door_hold`](sim::Simulation::cancel_door_hold)
//!
//! Each call is either applied immediately (if the car is in a matching
//! door-FSM state) or queued on the elevator's
//! [`door_command_queue`](components::Elevator::door_command_queue) and
//! re-tried every tick until it can be applied. The only hard errors are
//! "not an elevator" / "elevator disabled" and (for `hold_door_open`) a
//! zero-tick argument — the rest return `Ok(())` and let the engine pick
//! the right moment. A [`DoorCommand`](door::DoorCommand) can be:
//!
//! - `Open` — reverses a closing door; no-op if already open or opening;
//!   queues while the car is moving.
//! - `Close` — forces an early close from `Loading`. Waits one tick if a
//!   rider is mid-boarding/exiting (safe-close).
//! - `HoldOpen { ticks }` — adds to the remaining open dwell; two calls
//!   of 30 ticks stack to 60. Queues if doors aren't open yet.
//! - `CancelHold` — clamps any accumulated hold back to the base dwell.
//!
//! Every command emits
//! [`Event::DoorCommandQueued`](events::Event::DoorCommandQueued) when
//! submitted and
//! [`Event::DoorCommandApplied`](events::Event::DoorCommandApplied) when
//! it actually takes effect — useful for driving UI feedback (button
//! flashes, SFX) without polling the elevator every tick.
//!
//! See [`examples/door_commands.rs`][dex] for a runnable demo.
//!
//! [dex]: https://github.com/andymai/elevator-core/blob/main/crates/elevator-core/examples/door_commands.rs
//!
//! ## Sub-tick position interpolation
//!
//! Games that render at a higher framerate than the simulation ticks (e.g.
//! a 60 Hz sim driving a 144 Hz camera, or a first-person game where the
//! player is parented to an elevator car) need a smooth position between
//! ticks. [`Simulation::position_at`](sim::Simulation::position_at) lerps
//! between the snapshot taken at the start of the current tick and the
//! post-tick position, using an `alpha` accumulator clamped to `[0.0, 1.0]`:
//!
//! ```text
//! // typical fixed-timestep render loop
//! accumulator += frame_dt;
//! while accumulator >= sim.dt() {
//!     sim.step();
//!     accumulator -= sim.dt();
//! }
//! let alpha = accumulator / sim.dt();
//! let y = sim.position_at(car, alpha).unwrap();
//! ```
//!
//! The previous-position snapshot is refreshed automatically at the start
//! of every [`step`](sim::Simulation::step). [`Simulation::velocity`] is
//! a convenience that returns the raw `f64` along the shaft axis (signed:
//! +up, -down) for camera tilt, motion blur, or cabin-sway effects.
//!
//! See [`examples/fp_player_rider.rs`][fpe] for a runnable demo.
//!
//! [fpe]: https://github.com/andymai/elevator-core/blob/main/crates/elevator-core/examples/fp_player_rider.rs
//!
//! ## Manual-drive mode
//!
//! Games where the player *is* the elevator — driving the car with a
//! velocity stick, slamming an emergency brake, stopping between floors
//! — use [`ServiceMode::Manual`](components::ServiceMode::Manual). Manual
//! elevators are skipped by the automatic dispatch and repositioning
//! phases; the consumer drives movement via:
//!
//! - [`Simulation::set_target_velocity`](sim::Simulation::set_target_velocity) — signed target speed (+up, -down), clamped to the car's `max_speed`.
//! - [`Simulation::emergency_stop`](sim::Simulation::emergency_stop) — commands an immediate deceleration to zero.
//!
//! Physics still apply: velocity ramps toward the target using the car's
//! `acceleration` / `deceleration` caps, and positions update at the same
//! rate as normal elevators. Manual elevators can come to rest at any
//! position — they are not required to align with a configured stop.
//! Door behaviour is governed by the [manual door-control API](#door-control);
//! nothing opens or closes automatically. Leaving `Manual` clears any
//! pending velocity command.
//!
//! Each command emits
//! [`Event::ManualVelocityCommanded`](events::Event::ManualVelocityCommanded)
//! with the clamped target, or `None` for an emergency stop.
//!
//! See [`examples/manual_driver.rs`][mde] for a runnable demo.
//!
//! [mde]: https://github.com/andymai/elevator-core/blob/main/crates/elevator-core/examples/manual_driver.rs
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
/// Simplified energy modeling for elevators.
#[cfg(feature = "energy")]
pub mod energy;
/// Simulation event bus and event types.
pub mod events;
/// Lifecycle hooks for injecting logic before/after simulation phases.
pub mod hooks;
/// Aggregate simulation metrics.
pub mod metrics;
/// Trapezoidal velocity-profile movement math.
///
/// Exposes [`braking_distance`](movement::braking_distance) for consumers
/// writing opportunistic dispatch strategies that need the kinematic answer
/// without constructing a `Simulation`.
pub mod movement;
/// Phase-partitioned reverse index for rider population queries.
mod rider_index;
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
/// ```
/// use elevator_core::prelude::*;
/// use elevator_core::register_extensions;
/// use serde::{Deserialize, Serialize};
///
/// #[derive(Clone, Debug, Serialize, Deserialize)]
/// struct VipTag { level: u32 }
///
/// #[derive(Clone, Debug, Serialize, Deserialize)]
/// struct Priority { rank: u8 }
///
/// let mut sim = SimulationBuilder::demo().build().unwrap();
/// register_extensions!(sim.world_mut(), VipTag => "vip_tag", Priority => "priority");
/// ```
#[macro_export]
macro_rules! register_extensions {
    ($world:expr, $($ty:ty => $name:expr),+ $(,)?) => {
        $( $world.register_ext::<$ty>($name); )+
    };
}

/// Common imports for consumers of this library.
///
/// `use elevator_core::prelude::*;` pulls in the types you need for the vast
/// majority of simulations — building a sim, stepping it, spawning riders,
/// reading events and metrics, and writing custom dispatch strategies.
///
/// # Contents
///
/// - **Builder & simulation:** [`SimulationBuilder`](crate::builder::SimulationBuilder),
///   [`Simulation`](crate::sim::Simulation),
///   [`RiderBuilder`](crate::sim::RiderBuilder)
/// - **Components:** [`Rider`](crate::components::Rider),
///   [`RiderPhase`](crate::components::RiderPhase),
///   [`Elevator`](crate::components::Elevator),
///   [`ElevatorPhase`](crate::components::ElevatorPhase),
///   [`Stop`](crate::components::Stop), [`Line`](crate::components::Line),
///   [`Position`](crate::components::Position),
///   [`Velocity`](crate::components::Velocity),
///   [`FloorPosition`](crate::components::FloorPosition),
///   [`Route`](crate::components::Route),
///   [`Patience`](crate::components::Patience),
///   [`Preferences`](crate::components::Preferences),
///   [`AccessControl`](crate::components::AccessControl),
///   [`Orientation`](crate::components::Orientation),
///   [`ServiceMode`](crate::components::ServiceMode)
/// - **Config:** [`SimConfig`](crate::config::SimConfig),
///   [`GroupConfig`](crate::config::GroupConfig),
///   [`LineConfig`](crate::config::LineConfig)
/// - **Dispatch:** [`DispatchStrategy`](crate::dispatch::DispatchStrategy),
///   [`RepositionStrategy`](crate::dispatch::RepositionStrategy), plus the
///   built-in reposition strategies
///   [`NearestIdle`](crate::dispatch::reposition::NearestIdle),
///   [`ReturnToLobby`](crate::dispatch::reposition::ReturnToLobby),
///   [`SpreadEvenly`](crate::dispatch::reposition::SpreadEvenly),
///   [`DemandWeighted`](crate::dispatch::reposition::DemandWeighted)
/// - **Identity:** [`EntityId`](crate::entity::EntityId),
///   [`StopId`](crate::stop::StopId), [`GroupId`](crate::ids::GroupId)
/// - **Errors & events:** [`SimError`](crate::error::SimError),
///   [`RejectionReason`](crate::error::RejectionReason),
///   [`RejectionContext`](crate::error::RejectionContext),
///   [`Event`](crate::events::Event),
///   [`EventBus`](crate::events::EventBus)
/// - **Misc:** [`Metrics`](crate::metrics::Metrics),
///   [`TimeAdapter`](crate::time::TimeAdapter)
///
/// # Not included (import explicitly)
///
/// - Concrete dispatch implementations: `dispatch::scan::ScanDispatch`,
///   `dispatch::look::LookDispatch`, `dispatch::nearest_car::NearestCarDispatch`,
///   `dispatch::etd::EtdDispatch`
/// - `ElevatorConfig` and `StopConfig` from [`crate::config`]
/// - Traffic generation types from [`crate::traffic`] (feature-gated)
/// - Snapshot types from [`crate::snapshot`]
/// - The [`World`](crate::world::World) type (accessed via `sim.world()`,
///   but required as a parameter when implementing custom dispatch)
pub mod prelude {
    pub use crate::builder::SimulationBuilder;
    pub use crate::components::{
        AccessControl, DestinationQueue, Direction, Elevator, ElevatorPhase, FloorPosition, Line,
        Orientation, Patience, Position, Preferences, Rider, RiderPhase, Route, ServiceMode, Stop,
        Velocity,
    };
    pub use crate::config::{GroupConfig, LineConfig, SimConfig};
    pub use crate::dispatch::reposition::{
        DemandWeighted, NearestIdle, ReturnToLobby, SpreadEvenly,
    };
    pub use crate::dispatch::{
        AssignedCar, DestinationDispatch, DispatchStrategy, RepositionStrategy,
    };
    pub use crate::entity::EntityId;
    pub use crate::error::{RejectionContext, RejectionReason, SimError};
    pub use crate::events::{Event, EventBus, EventCategory};
    pub use crate::ids::GroupId;
    pub use crate::metrics::Metrics;
    pub use crate::sim::{RiderBuilder, Simulation};
    pub use crate::stop::StopId;
    pub use crate::time::TimeAdapter;
}

#[cfg(test)]
mod tests;
