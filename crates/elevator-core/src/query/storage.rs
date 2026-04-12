//! Type-erased storage for extension components.

use std::any::Any;
use std::collections::HashMap;

use serde::Serialize;
use serde::de::DeserializeOwned;
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

    /// Serialize all entries to a map of `EntityId` → RON string.
    fn serialize_entries(&self) -> HashMap<EntityId, String>;

    /// Deserialize entries from a map of `EntityId` → RON string, replacing current contents.
    fn deserialize_entries(&mut self, data: &HashMap<EntityId, String>);
}

impl<T: 'static + Send + Sync + Serialize + DeserializeOwned> AnyExtMap
    for SecondaryMap<EntityId, T>
{
    fn remove(&mut self, id: EntityId) {
        self.remove(id);
    }

    fn as_any(&self) -> &dyn Any {
        self
    }

    fn as_any_mut(&mut self) -> &mut dyn Any {
        self
    }

    fn serialize_entries(&self) -> HashMap<EntityId, String> {
        self.iter()
            .filter_map(|(id, val)| ron::to_string(val).ok().map(|s| (id, s)))
            .collect()
    }

    fn deserialize_entries(&mut self, data: &HashMap<EntityId, String>) {
        for (id, ron_str) in data {
            if let Ok(val) = ron::from_str::<T>(ron_str) {
                self.insert(*id, val);
            }
        }
    }
}
