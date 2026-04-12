//! Query builder and iterator for entity iteration.

use std::marker::PhantomData;

use slotmap::basic::Keys;

use crate::entity::EntityId;
use crate::world::World;

use super::fetch::WorldQuery;
use super::filter::QueryFilter;

/// Builder for constructing and executing queries.
///
/// Created by [`World::query()`]. Chain `.with::<T>()` and `.without::<T>()`
/// to add filters, then call `.iter()` or `.get(id)` to execute.
pub struct QueryBuilder<'w, Q: WorldQuery, F: QueryFilter = ()> {
    /// The world being queried.
    world: &'w World,
    /// Type-level query and filter state.
    _marker: PhantomData<(Q, F)>,
}

impl<'w, Q: WorldQuery, F: QueryFilter> QueryBuilder<'w, Q, F> {
    /// Create a new query builder.
    pub(crate) const fn new(world: &'w World) -> Self {
        Self {
            world,
            _marker: PhantomData,
        }
    }

    /// Add a `With<T>` filter — only match entities that have built-in component `T`.
    #[must_use]
    pub const fn with<T: 'static>(self) -> QueryBuilder<'w, Q, (F, super::filter::With<T>)>
    where
        (F, super::filter::With<T>): QueryFilter,
    {
        QueryBuilder::new(self.world)
    }

    /// Add a `Without<T>` filter — exclude entities that have built-in component `T`.
    #[must_use]
    pub const fn without<T: 'static>(self) -> QueryBuilder<'w, Q, (F, super::filter::Without<T>)>
    where
        (F, super::filter::Without<T>): QueryFilter,
    {
        QueryBuilder::new(self.world)
    }

    /// Add an `ExtWith<T>` filter — only match entities with extension component `T`.
    #[must_use]
    pub const fn ext_with<T: 'static + Send + Sync>(
        self,
    ) -> QueryBuilder<'w, Q, (F, super::filter::ExtWith<T>)>
    where
        (F, super::filter::ExtWith<T>): QueryFilter,
    {
        QueryBuilder::new(self.world)
    }

    /// Add an `ExtWithout<T>` filter — exclude entities with extension component `T`.
    #[must_use]
    pub const fn ext_without<T: 'static + Send + Sync>(
        self,
    ) -> QueryBuilder<'w, Q, (F, super::filter::ExtWithout<T>)>
    where
        (F, super::filter::ExtWithout<T>): QueryFilter,
    {
        QueryBuilder::new(self.world)
    }

    /// Execute the query and iterate matching entities.
    #[must_use]
    pub fn iter(self) -> QueryIter<'w, Q, F> {
        QueryIter {
            world: self.world,
            keys: self.world.alive_keys(),
            _marker: PhantomData,
        }
    }

    /// Fetch a single entity by ID.
    #[must_use]
    pub fn get(self, id: EntityId) -> Option<Q::Item<'w>> {
        if !Q::contains(self.world, id) || !F::matches(self.world, id) {
            return None;
        }
        Q::fetch(self.world, id)
    }
}

/// Iterator over entities matching a query and its filters.
pub struct QueryIter<'w, Q: WorldQuery, F: QueryFilter> {
    /// The world being iterated.
    world: &'w World,
    /// Iterator over alive entity keys.
    keys: Keys<'w, EntityId, ()>,
    /// Type-level query and filter state.
    _marker: PhantomData<(Q, F)>,
}

impl<'w, Q: WorldQuery, F: QueryFilter> Iterator for QueryIter<'w, Q, F> {
    type Item = Q::Item<'w>;

    fn next(&mut self) -> Option<Self::Item> {
        loop {
            let id = self.keys.next()?;
            if !Q::contains(self.world, id) {
                continue;
            }
            if !F::matches(self.world, id) {
                continue;
            }
            if let Some(item) = Q::fetch(self.world, id) {
                return Some(item);
            }
        }
    }
}
