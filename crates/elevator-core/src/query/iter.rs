//! Query builder and iterator for entity iteration.

use std::marker::PhantomData;

use slotmap::basic::Keys;

use crate::entity::EntityId;
use crate::world::World;

use super::fetch::WorldQuery;
use super::filter::QueryFilter;

/// Builder for mutable extension queries.
///
/// Created by [`World::query_ext_mut()`]. Collects matching entity IDs
/// upfront (keys snapshot) to avoid borrow conflicts, then provides
/// [`for_each_mut`](Self::for_each_mut) for mutable iteration.
pub struct ExtQueryMut<'w, T: 'static + Send + Sync, F: QueryFilter = ()> {
    /// The world being queried (mutable).
    world: &'w mut World,
    /// Snapshot of matching entity IDs.
    ids: Vec<EntityId>,
    /// Marker for the extension type and filter.
    _marker: PhantomData<(T, F)>,
}

impl<'w, T: 'static + Send + Sync, F: QueryFilter> ExtQueryMut<'w, T, F> {
    /// Create a new mutable extension query builder.
    pub(crate) fn new(world: &'w mut World) -> Self {
        let ids: Vec<EntityId> = world
            .alive_keys()
            .filter(|&id| {
                world.ext_map::<T>().is_some_and(|m| m.contains_key(id)) && F::matches(world, id)
            })
            .collect();
        Self {
            world,
            ids,
            _marker: PhantomData,
        }
    }

    /// Entity IDs matching this query.
    #[must_use]
    pub fn ids(&self) -> &[EntityId] {
        &self.ids
    }

    /// Number of matching entities.
    #[must_use]
    pub const fn count(&self) -> usize {
        self.ids.len()
    }

    /// Apply a closure to each matching entity's extension data mutably.
    pub fn for_each_mut(&mut self, mut f: impl FnMut(EntityId, &mut T)) {
        for &id in &self.ids {
            if let Some(val) = self.world.get_ext_mut::<T>(id) {
                f(id, val);
            }
        }
    }
}

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

impl<'w, Q: WorldQuery, F: QueryFilter> QueryIter<'w, Q, F> {
    /// Count the number of matching entities without collecting.
    #[must_use]
    pub fn count_matches(self) -> usize {
        self.count()
    }

    /// Return `true` if any entity matches the given predicate.
    pub fn any_match(mut self, predicate: impl FnMut(Q::Item<'w>) -> bool) -> bool {
        self.any(predicate)
    }

    /// Return `true` if all matching entities satisfy the predicate.
    ///
    /// Returns `true` for an empty query (vacuous truth).
    pub fn all_match(mut self, predicate: impl FnMut(Q::Item<'w>) -> bool) -> bool {
        self.all(predicate)
    }

    /// Find the first entity matching the predicate.
    pub fn find_match(
        mut self,
        predicate: impl FnMut(&Q::Item<'w>) -> bool,
    ) -> Option<Q::Item<'w>> {
        self.find(predicate)
    }
}
