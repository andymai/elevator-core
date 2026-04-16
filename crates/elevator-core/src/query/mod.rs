//! ECS-style query builder for iterating entities by component composition.
//!
//! # Examples
//!
//! ```
//! use elevator_core::prelude::*;
//! use elevator_core::query::{Ext, With, Without};
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
