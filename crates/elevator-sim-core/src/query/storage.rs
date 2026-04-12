//! Type-erased storage for extension components.

use std::any::Any;

use slotmap::SecondaryMap;

use crate::entity::EntityId;

/// Type-erased operations on extension component storage.
///
/// Implemented by `SecondaryMap<EntityId, T>` to enable `World` to manage
/// extension components without knowing their concrete types.
pub trait AnyExtMap: Send + Sync {
    /// Remove an entity's value from this storage.
    fn remove(&mut self, id: EntityId);

    /// Downcast to concrete type for typed access.
    fn as_any(&self) -> &dyn Any;

    /// Downcast to concrete type mutably.
    fn as_any_mut(&mut self) -> &mut dyn Any;
}

impl<T: 'static + Send + Sync> AnyExtMap for SecondaryMap<EntityId, T> {
    fn remove(&mut self, id: EntityId) {
        self.remove(id);
    }

    fn as_any(&self) -> &dyn Any {
        self
    }

    fn as_any_mut(&mut self) -> &mut dyn Any {
        self
    }
}
