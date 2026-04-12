//! Query filters for restricting which entities match.

use std::marker::PhantomData;

use crate::entity::EntityId;
use crate::world::World;

/// Filter trait for restricting which entities a query matches.
pub trait QueryFilter {
    /// Check if the entity passes the filter.
    fn matches(world: &World, id: EntityId) -> bool;
}

/// No filter — all entities match.
impl QueryFilter for () {
    fn matches(_world: &World, _id: EntityId) -> bool {
        true
    }
}

/// Include only entities that have built-in component `T`.
pub struct With<T>(PhantomData<T>);

/// Exclude entities that have built-in component `T`.
pub struct Without<T>(PhantomData<T>);

/// Include only entities that have extension component `T`.
pub struct ExtWith<T>(PhantomData<T>);

/// Exclude entities that have extension component `T`.
pub struct ExtWithout<T>(PhantomData<T>);

/// Generate `With`/`Without` filter impls for a built-in component.
macro_rules! impl_builtin_filter {
    ($comp:ty, $field:ident) => {
        impl QueryFilter for With<$comp> {
            fn matches(world: &World, id: EntityId) -> bool {
                world.$field.contains_key(id)
            }
        }

        impl QueryFilter for Without<$comp> {
            fn matches(world: &World, id: EntityId) -> bool {
                !world.$field.contains_key(id)
            }
        }
    };
}

impl_builtin_filter!(crate::components::Position, positions);
impl_builtin_filter!(crate::components::Velocity, velocities);
impl_builtin_filter!(crate::components::Elevator, elevators);
impl_builtin_filter!(crate::components::Stop, stops);
impl_builtin_filter!(crate::components::Rider, riders);
impl_builtin_filter!(crate::components::Route, routes);
impl_builtin_filter!(crate::components::Zone, zones);
impl_builtin_filter!(crate::components::Patience, patience);
impl_builtin_filter!(crate::components::Preferences, preferences);

impl<T: 'static + Send + Sync> QueryFilter for ExtWith<T> {
    fn matches(world: &World, id: EntityId) -> bool {
        world.ext_map::<T>().is_some_and(|m| m.contains_key(id))
    }
}

impl<T: 'static + Send + Sync> QueryFilter for ExtWithout<T> {
    fn matches(world: &World, id: EntityId) -> bool {
        !world.ext_map::<T>().is_some_and(|m| m.contains_key(id))
    }
}

/// Generate `QueryFilter` for tuples of filters.
macro_rules! impl_tuple_filter {
    ($($name:ident),+) => {
        impl<$($name: QueryFilter),+> QueryFilter for ($($name,)+) {
            fn matches(world: &World, id: EntityId) -> bool {
                $($name::matches(world, id) &&)+ true
            }
        }
    };
}

impl_tuple_filter!(A, B);
impl_tuple_filter!(A, B, C);
impl_tuple_filter!(A, B, C, D);
impl_tuple_filter!(A, B, C, D, E);
impl_tuple_filter!(A, B, C, D, E, F);
impl_tuple_filter!(A, B, C, D, E, F, G);
impl_tuple_filter!(A, B, C, D, E, F, G, H);
