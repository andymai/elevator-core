//! The `WorldQuery` trait and implementations for fetching component data.

use std::marker::PhantomData;

use crate::entity::EntityId;
use crate::world::World;

/// Describes what data a query fetches for each matching entity.
///
/// Implementations exist for:
/// - `EntityId` — passes through the entity ID
/// - `&T` for built-in components — reads from the component's `SecondaryMap`
/// - `Option<&T>` for built-in components — optional read (always matches)
/// - `&Ext<T>` for extension components — read from extension storage
/// - Tuples of the above (up to arity 8)
pub trait WorldQuery {
    /// The item yielded per entity.
    type Item<'w>;

    /// Try to fetch data for a single entity. Returns `None` if missing.
    fn fetch(world: &World, id: EntityId) -> Option<Self::Item<'_>>;

    /// Check component presence without extracting data.
    fn contains(world: &World, id: EntityId) -> bool;
}

/// Marker type for querying extension components.
///
/// Extension values are read by reference from type-erased storage.
pub struct Ext<T>(PhantomData<T>);

/// Marker type for mutable extension queries.
pub struct ExtMut<T>(PhantomData<T>);

impl WorldQuery for EntityId {
    type Item<'w> = Self;

    fn fetch(_world: &World, id: EntityId) -> Option<Self::Item<'_>> {
        Some(id)
    }

    fn contains(_world: &World, _id: EntityId) -> bool {
        true
    }
}

/// Generate `WorldQuery` impls for a built-in component stored as a `SecondaryMap` field.
macro_rules! impl_builtin_query {
    ($comp:ty, $field:ident) => {
        impl WorldQuery for &$comp {
            type Item<'w> = &'w $comp;

            fn fetch(world: &World, id: EntityId) -> Option<Self::Item<'_>> {
                world.$field.get(id)
            }

            fn contains(world: &World, id: EntityId) -> bool {
                world.$field.contains_key(id)
            }
        }

        impl WorldQuery for Option<&$comp> {
            type Item<'w> = Option<&'w $comp>;

            fn fetch(world: &World, id: EntityId) -> Option<Self::Item<'_>> {
                Some(world.$field.get(id))
            }

            fn contains(_world: &World, _id: EntityId) -> bool {
                true
            }
        }
    };
}

impl_builtin_query!(crate::components::Position, positions);
impl_builtin_query!(crate::components::Velocity, velocities);
impl_builtin_query!(crate::components::Elevator, elevators);
impl_builtin_query!(crate::components::Stop, stops);
impl_builtin_query!(crate::components::Rider, riders);
impl_builtin_query!(crate::components::Route, routes);
impl_builtin_query!(crate::components::Line, lines);
impl_builtin_query!(crate::components::Patience, patience);
impl_builtin_query!(crate::components::Preferences, preferences);

impl<T: 'static + Send + Sync> WorldQuery for &Ext<T> {
    type Item<'w> = &'w T;

    fn fetch(world: &World, id: EntityId) -> Option<Self::Item<'_>> {
        world.ext_map::<T>()?.get(id)
    }

    fn contains(world: &World, id: EntityId) -> bool {
        world.ext_map::<T>().is_some_and(|m| m.contains_key(id))
    }
}

/// Generate `WorldQuery` for tuples of queries.
macro_rules! impl_tuple_query {
    ($($name:ident),+) => {
        #[allow(non_snake_case)]
        impl<$($name: WorldQuery),+> WorldQuery for ($($name,)+) {
            type Item<'w> = ($($name::Item<'w>,)+);

            fn fetch(world: &World, id: EntityId) -> Option<Self::Item<'_>> {
                Some(($($name::fetch(world, id)?,)+))
            }

            fn contains(world: &World, id: EntityId) -> bool {
                $($name::contains(world, id) &&)+ true
            }
        }
    };
}

impl_tuple_query!(A);
impl_tuple_query!(A, B);
impl_tuple_query!(A, B, C);
impl_tuple_query!(A, B, C, D);
impl_tuple_query!(A, B, C, D, E);
impl_tuple_query!(A, B, C, D, E, F);
impl_tuple_query!(A, B, C, D, E, F, G);
impl_tuple_query!(A, B, C, D, E, F, G, H);
