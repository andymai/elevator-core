//! Entity identity and allocation via generational keys.

use serde::{Deserialize, Serialize};

slotmap::new_key_type! {
    /// Universal entity identifier used across all component storages.
    /// Serialize/Deserialize provided by slotmap's `serde` feature.
    pub struct EntityId;
}

/// Generates a typed newtype wrapper around [`EntityId`].
///
/// Each wrapper is `#[repr(transparent)]` with a public inner field for
/// convenient internal access via `.0`, and delegates `Display` to
/// `EntityId`'s `Debug` (since slotmap keys do not implement `Display`).
macro_rules! typed_entity_id {
    ($(#[$meta:meta])* $name:ident) => {
        $(#[$meta])*
        #[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
        #[serde(transparent)]
        #[repr(transparent)]
        pub struct $name(pub EntityId);

        impl $name {
            /// Returns the inner [`EntityId`].
            #[inline]
            pub const fn entity(self) -> EntityId {
                self.0
            }
        }

        impl std::fmt::Display for $name {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                write!(f, "{}({:?})", stringify!($name), self.0)
            }
        }

        impl From<EntityId> for $name {
            #[inline]
            fn from(id: EntityId) -> Self {
                Self(id)
            }
        }

        impl Default for $name {
            fn default() -> Self {
                Self(EntityId::default())
            }
        }
    };
}

typed_entity_id! {
    /// Typed wrapper around [`EntityId`] for elevator entities.
    ElevatorId
}

typed_entity_id! {
    /// Typed wrapper around [`EntityId`] for rider entities.
    RiderId
}
