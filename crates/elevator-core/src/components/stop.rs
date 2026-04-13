//! Stop (floor/station) component.

use serde::{Deserialize, Serialize};

/// Component for a stop (floor/station) entity.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stop {
    /// Human-readable stop name.
    pub(crate) name: String,
    /// Absolute position along the shaft axis.
    pub(crate) position: f64,
}

impl Stop {
    /// Human-readable stop name.
    #[must_use]
    pub fn name(&self) -> &str {
        &self.name
    }

    /// Absolute position along the shaft axis.
    #[must_use]
    pub const fn position(&self) -> f64 {
        self.position
    }
}
