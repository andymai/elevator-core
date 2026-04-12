//! Typed identifiers for simulation concepts (groups, zones).

use serde::{Deserialize, Serialize};

/// Numeric identifier for an elevator group.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct GroupId(pub u32);
