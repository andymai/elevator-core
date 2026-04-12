//! Stop (floor/station) component.

/// Component for a stop (floor/station) entity.
#[derive(Debug, Clone)]
pub struct Stop {
    /// Human-readable stop name.
    pub name: String,
    /// Absolute position along the shaft axis.
    pub position: f64,
}
