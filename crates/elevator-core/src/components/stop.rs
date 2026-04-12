//! Stop (floor/station) component.

use serde::{Deserialize, Serialize};

/// Component for a stop (floor/station) entity.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stop {
    /// Human-readable stop name.
    pub name: String,
    /// Absolute position along the shaft axis.
    pub position: f64,
}
