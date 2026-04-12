use serde::{Deserialize, Serialize};

slotmap::new_key_type! {
    /// Universal entity identifier used across all component storages.
    pub struct EntityId;
}

// slotmap keys implement Copy, Clone, PartialEq, Eq, Hash by default.
// We need Serialize/Deserialize for replay and scenario support.
