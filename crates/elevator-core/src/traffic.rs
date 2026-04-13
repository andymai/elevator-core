//! Traffic generation patterns for rider origin/destination distributions.

use crate::entity::EntityId;
use rand::Rng;

/// Traffic pattern for generating realistic rider origin/destination distributions.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum TrafficPattern {
    /// Uniform random: equal probability for all origin/destination pairs.
    Uniform,
    /// Morning rush: most riders originate from the lobby (first stop) going up.
    UpPeak,
    /// Evening rush: most riders head to the lobby (first stop) from upper stops.
    DownPeak,
    /// Lunch rush: riders go from upper stops to a mid-range stop and back.
    Lunchtime,
    /// Mixed: combination of up-peak, down-peak, and inter-floor traffic.
    Mixed,
}

impl TrafficPattern {
    /// Sample an (origin, destination) pair from the given stops.
    ///
    /// `stops` must be sorted by position (lowest first). The first stop
    /// is treated as the "lobby" for peak patterns.
    ///
    /// Returns `None` if fewer than 2 stops are provided.
    pub fn sample(&self, stops: &[EntityId], rng: &mut impl Rng) -> Option<(EntityId, EntityId)> {
        if stops.len() < 2 {
            return None;
        }

        let n = stops.len();
        let lobby = stops[0];
        let mid = stops[n / 2];

        match self {
            Self::Uniform => {
                let origin_idx = rng.random_range(0..n);
                let mut dest_idx = rng.random_range(0..n);
                while dest_idx == origin_idx {
                    dest_idx = rng.random_range(0..n);
                }
                Some((stops[origin_idx], stops[dest_idx]))
            }

            Self::UpPeak => {
                // 80% from lobby, 20% inter-floor.
                if rng.random_range(0.0..1.0) < 0.8 {
                    let dest_idx = rng.random_range(1..n);
                    Some((lobby, stops[dest_idx]))
                } else {
                    Some(Self::uniform_pair(stops, rng))
                }
            }

            Self::DownPeak => {
                // 80% heading to lobby, 20% inter-floor.
                if rng.random_range(0.0..1.0) < 0.8 {
                    let origin_idx = rng.random_range(1..n);
                    Some((stops[origin_idx], lobby))
                } else {
                    Some(Self::uniform_pair(stops, rng))
                }
            }

            Self::Lunchtime => {
                // 40% going from upper to mid, 40% from mid to upper, 20% random.
                let r: f64 = rng.random_range(0.0..1.0);
                if r < 0.4 {
                    // Upper stop to mid.
                    let upper_start = n / 2 + 1;
                    if upper_start < n {
                        let origin_idx = rng.random_range(upper_start..n);
                        Some((stops[origin_idx], mid))
                    } else {
                        Some(Self::uniform_pair(stops, rng))
                    }
                } else if r < 0.8 {
                    // Mid to upper stop.
                    let upper_start = n / 2 + 1;
                    if upper_start < n {
                        let dest_idx = rng.random_range(upper_start..n);
                        Some((mid, stops[dest_idx]))
                    } else {
                        Some(Self::uniform_pair(stops, rng))
                    }
                } else {
                    Some(Self::uniform_pair(stops, rng))
                }
            }

            Self::Mixed => {
                // 30% up-peak, 30% down-peak, 40% inter-floor.
                let r: f64 = rng.random_range(0.0..1.0);
                if r < 0.3 {
                    let dest_idx = rng.random_range(1..n);
                    Some((lobby, stops[dest_idx]))
                } else if r < 0.6 {
                    let origin_idx = rng.random_range(1..n);
                    Some((stops[origin_idx], lobby))
                } else {
                    Some(Self::uniform_pair(stops, rng))
                }
            }
        }
    }

    /// Sample a uniform random (origin, destination) pair with distinct stops.
    fn uniform_pair(stops: &[EntityId], rng: &mut impl Rng) -> (EntityId, EntityId) {
        let n = stops.len();
        let origin_idx = rng.random_range(0..n);
        let mut dest_idx = rng.random_range(0..n);
        while dest_idx == origin_idx {
            dest_idx = rng.random_range(0..n);
        }
        (stops[origin_idx], stops[dest_idx])
    }
}

/// A time-varying traffic schedule that selects patterns based on tick count.
///
/// Maps tick ranges to traffic patterns, enabling realistic daily cycles
/// (e.g., up-peak in the morning, lunchtime at noon, down-peak in evening).
///
/// # Example
///
/// ```rust,ignore
/// use elevator_core::traffic::{TrafficPattern, TrafficSchedule};
///
/// let schedule = TrafficSchedule::new(vec![
///     (0..3600, TrafficPattern::UpPeak),      // First hour: morning rush
///     (3600..7200, TrafficPattern::Uniform),   // Second hour: normal
///     (7200..10800, TrafficPattern::Lunchtime), // Third hour: lunch
///     (10800..14400, TrafficPattern::DownPeak), // Fourth hour: evening rush
/// ]);
///
/// // Sampling uses the pattern active at the given tick
/// let stops = vec![/* ... */];
/// let (origin, dest) = schedule.sample(tick, &stops, &mut rng).unwrap();
/// ```
#[derive(Debug, Clone)]
pub struct TrafficSchedule {
    /// Tick ranges mapped to traffic patterns, in order.
    segments: Vec<(std::ops::Range<u64>, TrafficPattern)>,
    /// Pattern to use when tick falls outside all segments.
    fallback: TrafficPattern,
}

impl TrafficSchedule {
    /// Create a schedule from segments.
    ///
    /// Segments are `(tick_range, pattern)` pairs. If the current tick
    /// doesn't fall within any segment, the fallback `Uniform` pattern is used.
    #[must_use]
    pub const fn new(segments: Vec<(std::ops::Range<u64>, TrafficPattern)>) -> Self {
        Self {
            segments,
            fallback: TrafficPattern::Uniform,
        }
    }

    /// Set the fallback pattern for ticks outside all segments.
    #[must_use]
    pub const fn with_fallback(mut self, pattern: TrafficPattern) -> Self {
        self.fallback = pattern;
        self
    }

    /// Get the active traffic pattern for the given tick.
    #[must_use]
    pub fn pattern_at(&self, tick: u64) -> &TrafficPattern {
        self.segments
            .iter()
            .find(|(range, _)| range.contains(&tick))
            .map_or(&self.fallback, |(_, pattern)| pattern)
    }

    /// Sample an (origin, destination) pair using the pattern active at `tick`.
    ///
    /// Delegates to [`TrafficPattern::sample()`] for the active pattern.
    pub fn sample(
        &self,
        tick: u64,
        stops: &[EntityId],
        rng: &mut impl Rng,
    ) -> Option<(EntityId, EntityId)> {
        self.pattern_at(tick).sample(stops, rng)
    }

    /// Create a typical office-building daily schedule.
    ///
    /// Assumes `ticks_per_hour` ticks per real-world hour:
    /// - Hours 0-1: Up-peak (morning rush)
    /// - Hours 1-4: Uniform (normal traffic)
    /// - Hours 4-5: Lunchtime
    /// - Hours 5-8: Uniform (afternoon)
    /// - Hours 8-9: Down-peak (evening rush)
    /// - Hours 9+: Uniform (fallback)
    #[must_use]
    pub fn office_day(ticks_per_hour: u64) -> Self {
        Self::new(vec![
            (0..ticks_per_hour, TrafficPattern::UpPeak),
            (ticks_per_hour..4 * ticks_per_hour, TrafficPattern::Uniform),
            (
                4 * ticks_per_hour..5 * ticks_per_hour,
                TrafficPattern::Lunchtime,
            ),
            (
                5 * ticks_per_hour..8 * ticks_per_hour,
                TrafficPattern::Uniform,
            ),
            (
                8 * ticks_per_hour..9 * ticks_per_hour,
                TrafficPattern::DownPeak,
            ),
        ])
    }
}
