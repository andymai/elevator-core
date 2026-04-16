//! Stop identifiers and configuration.

use crate::entity::EntityId;
use serde::{Deserialize, Serialize};

/// Numeric identifier for a stop along the shaft.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct StopId(pub u32);

/// A reference to a stop by either its config-time [`StopId`] or its
/// runtime [`EntityId`].
///
/// Methods on [`Simulation`](crate::sim::Simulation) that take a stop
/// accept `impl Into<StopRef>`, so callers can pass either type directly.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum StopRef {
    /// Config-time identifier.
    ById(StopId),
    /// Runtime entity identifier.
    ByEntity(EntityId),
}

impl From<StopId> for StopRef {
    fn from(id: StopId) -> Self {
        Self::ById(id)
    }
}

impl From<EntityId> for StopRef {
    fn from(id: EntityId) -> Self {
        Self::ByEntity(id)
    }
}

impl std::fmt::Display for StopId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "StopId({})", self.0)
    }
}

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

impl StopConfig {
    /// Build a `Vec<StopConfig>` from a compact `(name, position)` slice.
    ///
    /// `StopId`s are assigned sequentially starting at 0. Useful for demos,
    /// tests, and any sim whose stops don't need hand-picked identifiers.
    ///
    /// # Example
    ///
    /// ```
    /// use elevator_core::stop::StopConfig;
    ///
    /// let stops = StopConfig::linear(&[
    ///     ("Ground", 0.0),
    ///     ("Floor 2", 4.0),
    ///     ("Floor 3", 8.0),
    /// ]);
    /// assert_eq!(stops.len(), 3);
    /// assert_eq!(stops[0].name, "Ground");
    /// assert_eq!(stops[2].position, 8.0);
    /// ```
    #[must_use]
    pub fn linear(stops: &[(&str, f64)]) -> Vec<Self> {
        stops
            .iter()
            .enumerate()
            .map(|(i, (name, position))| Self {
                id: StopId(u32::try_from(i).unwrap_or(u32::MAX)),
                name: (*name).to_owned(),
                position: *position,
            })
            .collect()
    }
}
