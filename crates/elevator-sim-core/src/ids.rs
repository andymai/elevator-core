use serde::{Deserialize, Serialize};

/// Elevator group identifier.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct GroupId(pub u32);
