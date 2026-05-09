//! ECS-style query builder for iterating entities by component composition.
//!
//! # Audience
//!
//! This module is the **extension-author surface**: the generic
//! builder for iterating over arbitrary component combinations,
//! including [`Ext<T>`](crate::query::Ext) game-defined components.
//! Use it when:
//!
//! - You're filtering on a combination of components
//!   ([`With`](crate::query::With) / [`Without`](crate::query::Without)
//!   / multiple `&T` slots) — e.g. "all riders with a `VipTag`
//!   extension and a position".
//! - You're operating on game-defined [`Ext<T>`](crate::query::Ext)
//!   components that don't have hand-written iterators on
//!   [`World`](crate::world::World).
//!
//! Core's per-tick hot paths intentionally use the typed
//! [`World::iter_riders`](crate::world::World::iter_riders),
//! [`World::iter_elevators`](crate::world::World::iter_elevators),
//! [`World::iter_stops`](crate::world::World::iter_stops), etc. —
//! direct accessors over the `SoA` storage that skip the generic
//! dispatch layer. The builder is for the cases those don't cover.
//! `query_bench` shows the builder is fast (linear in entity count
//! with a small constant), but for known component types the typed
//! accessor is still preferred.
//!
//! # Examples
//!
//! ```
//! use elevator_core::components::{Position, Rider, Route};
//! use elevator_core::prelude::*;
//! use elevator_core::query::{Ext, With, Without};
//! use elevator_core::world::ExtKey;
//!
//! use serde::{Serialize, Deserialize};
//!
//! #[derive(Debug, Clone, Serialize, Deserialize)]
//! struct VipTag { level: u32 }
//!
//! let mut sim = SimulationBuilder::demo().build().unwrap();
//! let rider_eid = sim.spawn_rider(StopId(0), StopId(1), 75.0).unwrap();
//!
//! // Attach an extension component.
//! sim.world_mut().insert_ext(rider_eid.entity(), VipTag { level: 5 }, ExtKey::from_type_name());
//!
//! let world = sim.world();
//!
//! // All riders with a position
//! for (id, rider, pos) in world.query::<(EntityId, &Rider, &Position)>().iter() {
//!     println!("{id:?}: phase={:?} at {}", rider.phase(), pos.value());
//! }
//!
//! // Entities with Position but without Route
//! for (id, pos) in world.query::<(EntityId, &Position)>()
//!     .without::<Route>()
//!     .iter()
//! {
//!     println!("{id:?} at {}", pos.value());
//! }
//!
//! // Extension components (cloned)
//! for (id, vip) in world.query::<(EntityId, &Ext<VipTag>)>().iter() {
//!     println!("VIP rider {id:?}: level {}", vip.level);
//! }
//! ```

pub(crate) mod storage;

mod fetch;
mod filter;
mod iter;

pub use fetch::{Ext, ExtMut, WorldQuery};
pub use filter::{ExtWith, ExtWithout, QueryFilter, With, Without};
pub use iter::{ExtQueryMut, QueryBuilder, QueryIter};
