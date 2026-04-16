//! Line (physical path) component — shaft, tether, track, etc.

use serde::{Deserialize, Serialize};

use crate::ids::GroupId;

/// Physical orientation of a line.
///
/// This is metadata for external systems (rendering, spatial queries).
/// The simulation always operates along a 1D axis regardless of orientation.
#[derive(Debug, Clone, Copy, Default, PartialEq, Serialize, Deserialize)]
#[non_exhaustive]
pub enum Orientation {
    /// Standard vertical elevator shaft.
    #[default]
    Vertical,
    /// Angled incline (e.g., funicular).
    Angled {
        /// Angle from horizontal in degrees (0 = horizontal, 90 = vertical).
        degrees: f64,
    },
    /// Horizontal people-mover or transit line.
    Horizontal,
}

/// 2D position on a floor plan (for spatial queries and rendering).
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct SpatialPosition {
    /// X coordinate on the floor plan.
    pub x: f64,
    /// Y coordinate on the floor plan.
    pub y: f64,
}

/// Component for a line entity — the physical path an elevator car travels.
///
/// In a building this is a hoistway/shaft. For a space elevator it is a
/// tether or cable. The term "line" is domain-neutral.
///
/// A line belongs to exactly one [`GroupId`] at a time but can be
/// reassigned at runtime (swing-car pattern). Multiple cars may share
/// a line (multi-car shafts); collision avoidance is left to game hooks.
///
/// Intrinsic properties only — relationship data (which elevators, which
/// stops) lives in [`LineInfo`](crate::dispatch::LineInfo) on the
/// [`ElevatorGroup`](crate::dispatch::ElevatorGroup).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Line {
    /// Human-readable name.
    pub(crate) name: String,
    /// Dispatch group this line currently belongs to.
    pub(crate) group: GroupId,
    /// Physical orientation (metadata for rendering).
    pub(crate) orientation: Orientation,
    /// Optional floor-plan position (for spatial queries).
    pub(crate) position: Option<SpatialPosition>,
    /// Lowest reachable position along the line axis.
    pub(crate) min_position: f64,
    /// Highest reachable position along the line axis.
    pub(crate) max_position: f64,
    /// Maximum number of cars allowed on this line (None = unlimited).
    pub(crate) max_cars: Option<usize>,
}

impl Line {
    /// Human-readable name.
    #[must_use]
    pub fn name(&self) -> &str {
        &self.name
    }

    /// Dispatch group this line currently belongs to.
    #[must_use]
    pub const fn group(&self) -> GroupId {
        self.group
    }

    /// Physical orientation.
    #[must_use]
    pub const fn orientation(&self) -> Orientation {
        self.orientation
    }

    /// Optional floor-plan position.
    #[must_use]
    pub const fn position(&self) -> Option<&SpatialPosition> {
        self.position.as_ref()
    }

    /// Lowest reachable position along the line axis.
    #[must_use]
    pub const fn min_position(&self) -> f64 {
        self.min_position
    }

    /// Highest reachable position along the line axis.
    #[must_use]
    pub const fn max_position(&self) -> f64 {
        self.max_position
    }

    /// Maximum number of cars allowed on this line.
    #[must_use]
    pub const fn max_cars(&self) -> Option<usize> {
        self.max_cars
    }
}
