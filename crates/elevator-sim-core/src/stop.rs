//! Stop identifiers and configuration.

use serde::{Deserialize, Serialize};

/// Numeric identifier for a stop along the shaft.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct StopId(pub u32);

/// A stop at an arbitrary position along the elevator shaft.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StopConfig {
    /// The unique identifier for this stop.
    pub id: StopId,
    /// Human-readable name for this stop.
    pub name: String,
    /// Absolute position along the shaft axis (distance units from origin).
    pub position: f64,
}
