//! ECS-style query builder for iterating entities by component composition.
//!
//! # Examples
//!
//! ```ignore
//! use elevator_sim_core::prelude::*;
//! use elevator_sim_core::query::Ext;
//!
//! // All riders with a position
//! for (id, rider, pos) in world.query::<(EntityId, &Rider, &Position)>().iter() {
//!     println!("{id:?}: phase={:?} at {}", rider.phase, pos.value);
//! }
//!
//! // Elevators without routes
//! for (id, pos) in world.query::<(EntityId, &Position)>()
//!     .with::<Elevator>()
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
