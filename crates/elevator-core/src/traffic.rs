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
