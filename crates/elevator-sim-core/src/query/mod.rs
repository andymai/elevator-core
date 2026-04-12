//! ECS-style query builder for iterating entities by component composition.
//!
//! # Examples
//!
//! ```
//! use elevator_sim_core::prelude::*;
//! use elevator_sim_core::world::World;
//! use elevator_sim_core::query::{Ext, With, Without};
//!
//! use serde::{Serialize, Deserialize};
//!
//! #[derive(Debug, Clone, Serialize, Deserialize)]
//! struct VipTag { level: u32 }
//!
//! let mut world = World::new();
//!
//! // Spawn a rider with a position
//! let r = world.spawn();
//! world.set_rider(r, Rider {
//!     weight: 75.0,
//!     phase: RiderPhase::Waiting,
//!     current_stop: None,
//!     spawn_tick: 0,
//!     board_tick: None,
//! });
//! world.set_position(r, Position { value: 0.0 });
//! world.insert_ext(r, VipTag { level: 5 }, "vip_tag");
//!
//! // All riders with a position
//! for (id, rider, pos) in world.query::<(EntityId, &Rider, &Position)>().iter() {
//!     println!("{id:?}: phase={:?} at {}", rider.phase, pos.value);
//! }
//!
//! // Entities with Position but without Route
//! for (id, pos) in world.query::<(EntityId, &Position)>()
//!     .without::<Route>()
//!     .iter()
//! {
//!     println!("{id:?} at {}", pos.value);
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

pub use fetch::{Ext, WorldQuery};
pub use filter::{ExtWith, ExtWithout, QueryFilter, With, Without};
pub use iter::{QueryBuilder, QueryIter};
