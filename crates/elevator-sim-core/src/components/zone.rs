//! Group/zone membership component.

use serde::{Deserialize, Serialize};

use crate::ids::GroupId;

/// Component that assigns an entity to an elevator group/zone.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Zone {
    /// The group this entity belongs to.
    pub group: GroupId,
}
