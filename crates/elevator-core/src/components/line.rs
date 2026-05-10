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

impl std::fmt::Display for Orientation {
    /// Bounded precision keeps TUI/HUD output stable when `degrees` is the
    /// result of a radians→degrees conversion that doesn't round-trip cleanly.
    ///
    /// ```
    /// # use elevator_core::components::Orientation;
    /// assert_eq!(format!("{}", Orientation::Vertical), "vertical");
    /// assert_eq!(format!("{}", Orientation::Horizontal), "horizontal");
    /// assert_eq!(format!("{}", Orientation::Angled { degrees: 30.0 }), "30.0°");
    /// assert_eq!(
    ///     format!("{}", Orientation::Angled { degrees: 22.123_456_789 }),
    ///     "22.1°",
    /// );
    /// ```
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Vertical => f.write_str("vertical"),
            Self::Horizontal => f.write_str("horizontal"),
            Self::Angled { degrees } => write!(f, "{degrees:.1}°"),
        }
    }
}

/// 2D position on a floor plan (for spatial queries and rendering).
///
/// On a [`LineKind::Linear`] line this anchors one end of the axis. On a
/// [`LineKind::Loop`] line this anchors the geometric *center* of the
/// loop; hosts derive any rendering radius from
/// [`Line::circumference`] (e.g. `r = C / (2π)` for a circular layout).
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct SpatialPosition {
    /// X coordinate on the floor plan.
    pub x: f64,
    /// Y coordinate on the floor plan.
    pub y: f64,
}

/// Topology of a line — open-ended linear axis or closed loop.
///
/// `Linear` is the default for elevator shafts, tethers, and other paths
/// bounded by `[min, max]`. `Loop` (gated behind the `loop_lines`
/// feature) models a closed-loop transit line where positions wrap
/// modulo `circumference`. Helpers in [`super::cyclic`] operate on Loop
/// positions; consumer code dispatches on this enum to pick linear vs
/// cyclic semantics.
///
/// `#[non_exhaustive]` — future topologies (figure-eight, branching, etc.)
/// can be added without a major version bump.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[non_exhaustive]
pub enum LineKind {
    /// Open-ended line with hard `[min, max]` position bounds. Cars
    /// reverse at endpoints; this matches every existing dispatch
    /// strategy (LOOK, sweep, scan, destination, etc.).
    Linear {
        /// Lowest reachable position.
        min: f64,
        /// Highest reachable position.
        max: f64,
    },
    /// Closed loop with cyclic position semantics. Positions wrap into
    /// `[0, circumference)`; cars travel one direction only and
    /// maintain a strict no-overtake ordering with at least
    /// `min_headway` between successive cars.
    #[cfg(feature = "loop_lines")]
    Loop {
        /// Total path length around the loop. Must be `> 0` —
        /// construction (`Simulation::add_line` and the explicit-topology
        /// builder) rejects non-positive or non-finite values.
        circumference: f64,
        /// Minimum permitted forward distance between successive cars.
        /// PR 3 will add construction-time validation
        /// (`max_cars * min_headway <= circumference`); until then, the
        /// dispatch and movement code added in subsequent PRs is
        /// responsible for behaving sanely on degenerate values.
        /// Callers should set this strictly positive.
        min_headway: f64,
    },
}

impl LineKind {
    /// Whether this line is a closed loop.
    #[must_use]
    pub const fn is_loop(&self) -> bool {
        match self {
            Self::Linear { .. } => false,
            #[cfg(feature = "loop_lines")]
            Self::Loop { .. } => true,
        }
    }

    /// Validate that this kind's intrinsic bounds are well-formed.
    ///
    /// Returns `Err((field, reason))` on a violation; both construction
    /// entry points ([`Simulation::add_line`](crate::sim::Simulation::add_line)
    /// and the explicit-topology builder) call this and lift the error
    /// into [`SimError::InvalidConfig`](crate::error::SimError::InvalidConfig).
    ///
    /// The intent is the *trivial* per-kind sanity checks — bounds finite
    /// and ordered, circumference positive. Cross-line invariants
    /// (`max_cars` × headway, group homogeneity, initial spacing) are PR 3.
    ///
    /// # Errors
    ///
    /// `Linear` rejects non-finite or `min > max` bounds. `Loop` rejects
    /// non-finite or non-positive `circumference`.
    pub fn validate(&self) -> Result<(), (&'static str, String)> {
        match self {
            Self::Linear { min, max } => {
                if !min.is_finite() || !max.is_finite() {
                    return Err((
                        "line.range",
                        format!("min/max must be finite (got min={min}, max={max})"),
                    ));
                }
                if min > max {
                    return Err(("line.range", format!("min ({min}) must be <= max ({max})")));
                }
            }
            #[cfg(feature = "loop_lines")]
            Self::Loop { circumference, .. } => {
                if !circumference.is_finite() || *circumference <= 0.0 {
                    return Err((
                        "line.kind",
                        format!("loop circumference must be finite and > 0 (got {circumference})"),
                    ));
                }
            }
        }
        Ok(())
    }
}

/// Component for a line entity — the physical path an elevator car travels.
///
/// In a building this is a hoistway/shaft. For a space elevator it is a
/// tether or cable. For a metro or people-mover (with the `loop_lines`
/// feature) it is a closed loop. The term "line" is domain-neutral.
///
/// A line belongs to exactly one [`GroupId`] at a time but can be
/// reassigned at runtime (swing-car pattern). Multiple cars may share
/// a line (multi-car shafts); collision avoidance is left to game hooks
/// for `Linear` lines and enforced by headway clamping for `Loop` lines.
///
/// Intrinsic properties only — relationship data (which elevators, which
/// stops) lives in [`LineInfo`](crate::dispatch::LineInfo) on the
/// [`ElevatorGroup`](crate::dispatch::ElevatorGroup).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(from = "LineWire", into = "LineWire")]
pub struct Line {
    /// Human-readable name.
    pub(crate) name: String,
    /// Dispatch group this line currently belongs to.
    pub(crate) group: GroupId,
    /// Physical orientation (metadata for rendering).
    pub(crate) orientation: Orientation,
    /// Optional floor-plan position (for spatial queries / rendering).
    pub(crate) position: Option<SpatialPosition>,
    /// Topology kind — open-ended linear axis or closed loop.
    pub(crate) kind: LineKind,
    /// Maximum number of cars allowed on this line (None = unlimited).
    pub(crate) max_cars: Option<usize>,
}

/// On-the-wire representation of [`Line`]. Bridges the legacy flat
/// `min_position` / `max_position` fields with the new `kind` field
/// during the transitional release: snapshots written by builds that
/// haven't migrated yet still deserialize correctly, and snapshots
/// from this build can still be inspected by older tooling.
///
/// On serialize we emit `kind` *and* derived flat fields. On deserialize,
/// `kind` is preferred; flat fields are the fallback.
#[derive(Debug, Clone, Serialize, Deserialize)]
struct LineWire {
    /// Human-readable name (always present in both legacy and current shapes).
    name: String,
    /// Dispatch group ownership.
    group: GroupId,
    /// Physical orientation (defaults to Vertical if absent).
    #[serde(default)]
    orientation: Orientation,
    /// 2D anchor on the floor plan (defaults to None).
    #[serde(default)]
    position: Option<SpatialPosition>,
    /// New topology field — preferred when present.
    #[serde(default)]
    kind: Option<LineKind>,
    /// Legacy flat field — fallback when `kind` is absent.
    #[serde(default)]
    min_position: Option<f64>,
    /// Legacy flat field — fallback when `kind` is absent.
    #[serde(default)]
    max_position: Option<f64>,
    /// Maximum cars on this line.
    #[serde(default)]
    max_cars: Option<usize>,
}

impl From<LineWire> for Line {
    fn from(w: LineWire) -> Self {
        let kind = w.kind.unwrap_or_else(|| LineKind::Linear {
            min: w.min_position.unwrap_or(0.0),
            max: w.max_position.unwrap_or(0.0),
        });
        Self {
            name: w.name,
            group: w.group,
            orientation: w.orientation,
            position: w.position,
            kind,
            max_cars: w.max_cars,
        }
    }
}

impl From<Line> for LineWire {
    fn from(l: Line) -> Self {
        let (min_position, max_position) = match &l.kind {
            LineKind::Linear { min, max } => (Some(*min), Some(*max)),
            #[cfg(feature = "loop_lines")]
            LineKind::Loop { circumference, .. } => (Some(0.0), Some(*circumference)),
        };
        Self {
            name: l.name,
            group: l.group,
            orientation: l.orientation,
            position: l.position,
            kind: Some(l.kind),
            min_position,
            max_position,
            max_cars: l.max_cars,
        }
    }
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

    /// Optional floor-plan position. For [`LineKind::Loop`] this is the
    /// geometric *center* of the loop; hosts derive a rendering radius
    /// from [`Self::circumference`].
    #[must_use]
    pub const fn position(&self) -> Option<&SpatialPosition> {
        self.position.as_ref()
    }

    /// Topology kind — linear axis or closed loop.
    #[must_use]
    pub const fn kind(&self) -> &LineKind {
        &self.kind
    }

    /// Whether this is a closed-loop line.
    #[must_use]
    pub const fn is_loop(&self) -> bool {
        self.kind.is_loop()
    }

    /// Lowest reachable position on a [`LineKind::Linear`] line. Returns
    /// `None` for [`LineKind::Loop`] — loops have no endpoints.
    ///
    /// Replaces the former `min_position()` accessor. Callers that
    /// blindly dereferenced the old `f64` should now decide whether
    /// they want Linear-only behavior (`linear_min().expect("linear")`)
    /// or to handle Loop explicitly.
    #[must_use]
    pub const fn linear_min(&self) -> Option<f64> {
        match self.kind {
            LineKind::Linear { min, .. } => Some(min),
            #[cfg(feature = "loop_lines")]
            LineKind::Loop { .. } => None,
        }
    }

    /// Highest reachable position on a [`LineKind::Linear`] line. Returns
    /// `None` for [`LineKind::Loop`].
    #[must_use]
    pub const fn linear_max(&self) -> Option<f64> {
        match self.kind {
            LineKind::Linear { max, .. } => Some(max),
            #[cfg(feature = "loop_lines")]
            LineKind::Loop { .. } => None,
        }
    }

    /// Total path length of a [`LineKind::Loop`] line. Returns `None`
    /// for [`LineKind::Linear`].
    #[must_use]
    pub const fn circumference(&self) -> Option<f64> {
        match self.kind {
            LineKind::Linear { .. } => None,
            #[cfg(feature = "loop_lines")]
            LineKind::Loop { circumference, .. } => Some(circumference),
        }
    }

    /// Minimum forward distance between successive cars on a
    /// [`LineKind::Loop`] line. Returns `None` for [`LineKind::Linear`].
    #[must_use]
    pub const fn min_headway(&self) -> Option<f64> {
        match self.kind {
            LineKind::Linear { .. } => None,
            #[cfg(feature = "loop_lines")]
            LineKind::Loop { min_headway, .. } => Some(min_headway),
        }
    }

    /// Maximum number of cars allowed on this line.
    #[must_use]
    pub const fn max_cars(&self) -> Option<usize> {
        self.max_cars
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn linear_accessors_return_some() {
        let line = Line::from(LineWire {
            name: "L1".into(),
            group: GroupId(0),
            orientation: Orientation::Vertical,
            position: None,
            kind: Some(LineKind::Linear {
                min: 0.0,
                max: 100.0,
            }),
            min_position: None,
            max_position: None,
            max_cars: None,
        });
        assert_eq!(line.linear_min(), Some(0.0));
        assert_eq!(line.linear_max(), Some(100.0));
        assert_eq!(line.circumference(), None);
        assert_eq!(line.min_headway(), None);
        assert!(!line.is_loop());
    }

    #[test]
    fn legacy_flat_fields_construct_linear_kind() {
        let line = Line::from(LineWire {
            name: "L1".into(),
            group: GroupId(0),
            orientation: Orientation::Vertical,
            position: None,
            kind: None,
            min_position: Some(0.0),
            max_position: Some(50.0),
            max_cars: None,
        });
        assert_eq!(
            line.kind(),
            &LineKind::Linear {
                min: 0.0,
                max: 50.0
            }
        );
    }

    #[test]
    #[allow(clippy::unwrap_used, reason = "test helper")]
    fn round_trip_writes_both_kind_and_flat_fields() {
        let line = Line {
            name: "L1".into(),
            group: GroupId(0),
            orientation: Orientation::Vertical,
            position: None,
            kind: LineKind::Linear {
                min: 0.0,
                max: 75.0,
            },
            max_cars: None,
        };
        let serialized = serde_json::to_value(&line).unwrap();
        // Both shapes must be present so an older deserializer can still read it.
        assert!(serialized.get("kind").is_some());
        assert_eq!(
            serialized
                .get("min_position")
                .and_then(serde_json::Value::as_f64),
            Some(0.0)
        );
        assert_eq!(
            serialized
                .get("max_position")
                .and_then(serde_json::Value::as_f64),
            Some(75.0)
        );

        let deserialized: Line = serde_json::from_value(serialized).unwrap();
        assert_eq!(deserialized.kind(), line.kind());
    }

    #[test]
    fn validate_rejects_non_finite_linear() {
        assert!(
            LineKind::Linear {
                min: f64::NAN,
                max: 10.0
            }
            .validate()
            .is_err()
        );
        assert!(
            LineKind::Linear {
                min: 5.0,
                max: f64::INFINITY
            }
            .validate()
            .is_err()
        );
    }

    #[test]
    fn validate_rejects_inverted_linear_bounds() {
        assert!(
            LineKind::Linear {
                min: 10.0,
                max: 5.0
            }
            .validate()
            .is_err()
        );
    }

    #[test]
    fn validate_accepts_well_formed_linear() {
        assert!(
            LineKind::Linear {
                min: 0.0,
                max: 100.0
            }
            .validate()
            .is_ok()
        );
    }

    #[cfg(feature = "loop_lines")]
    #[test]
    fn validate_rejects_non_positive_circumference() {
        assert!(
            LineKind::Loop {
                circumference: 0.0,
                min_headway: 5.0
            }
            .validate()
            .is_err()
        );
        assert!(
            LineKind::Loop {
                circumference: -1.0,
                min_headway: 5.0
            }
            .validate()
            .is_err()
        );
        assert!(
            LineKind::Loop {
                circumference: f64::NAN,
                min_headway: 5.0
            }
            .validate()
            .is_err()
        );
    }

    #[cfg(feature = "loop_lines")]
    #[test]
    fn validate_accepts_positive_circumference() {
        assert!(
            LineKind::Loop {
                circumference: 100.0,
                min_headway: 5.0
            }
            .validate()
            .is_ok()
        );
    }

    #[cfg(feature = "loop_lines")]
    #[test]
    fn loop_accessors_return_some() {
        let line = Line::from(LineWire {
            name: "L1".into(),
            group: GroupId(0),
            orientation: Orientation::Horizontal,
            position: None,
            kind: Some(LineKind::Loop {
                circumference: 200.0,
                min_headway: 10.0,
            }),
            min_position: None,
            max_position: None,
            max_cars: None,
        });
        assert_eq!(line.linear_min(), None);
        assert_eq!(line.linear_max(), None);
        assert_eq!(line.circumference(), Some(200.0));
        assert_eq!(line.min_headway(), Some(10.0));
        assert!(line.is_loop());
    }
}
