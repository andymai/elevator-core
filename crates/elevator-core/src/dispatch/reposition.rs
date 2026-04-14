//! Built-in repositioning strategies for idle elevators.
//!
//! # Example
//!
//! ```rust
//! use elevator_core::prelude::*;
//! use elevator_core::dispatch::BuiltinReposition;
//!
//! let sim = SimulationBuilder::demo()
//!     .reposition(SpreadEvenly, BuiltinReposition::SpreadEvenly)
//!     .build()
//!     .unwrap();
//! ```

use crate::entity::EntityId;
use crate::tagged_metrics::{MetricTags, TaggedMetric};
use crate::world::World;

use super::{ElevatorGroup, RepositionStrategy};

/// Distribute idle elevators evenly across the group's stops.
///
/// For each idle elevator, assigns it to the stop position that maximizes
/// the minimum distance from any other (non-idle or already-assigned) elevator.
/// This spreads coverage across the shaft.
pub struct SpreadEvenly;

impl RepositionStrategy for SpreadEvenly {
    fn reposition(
        &mut self,
        idle_elevators: &[(EntityId, f64)],
        stop_positions: &[(EntityId, f64)],
        group: &ElevatorGroup,
        world: &World,
    ) -> Vec<(EntityId, EntityId)> {
        if idle_elevators.is_empty() || stop_positions.is_empty() {
            return Vec::new();
        }

        // Collect positions of all non-idle elevators in this group.
        let mut occupied: Vec<f64> = group
            .elevator_entities()
            .iter()
            .filter_map(|&eid| {
                // Skip idle elevators — they're the ones we're repositioning.
                if idle_elevators.iter().any(|(ie, _)| *ie == eid) {
                    return None;
                }
                world.position(eid).map(|p| p.value)
            })
            .collect();

        let mut results = Vec::new();

        for &(elev_eid, elev_pos) in idle_elevators {
            // Find the stop that maximizes min distance from all occupied positions.
            let best = stop_positions.iter().max_by(|a, b| {
                let min_a = min_distance_to(a.1, &occupied);
                let min_b = min_distance_to(b.1, &occupied);
                min_a.total_cmp(&min_b)
            });

            if let Some(&(stop_eid, stop_pos)) = best {
                if (stop_pos - elev_pos).abs() > 1e-6 {
                    results.push((elev_eid, stop_eid));
                }
                occupied.push(stop_pos);
            }
        }

        results
    }
}

/// Return idle elevators to a configured home stop (default: first stop).
///
/// Classic lobby-return strategy. All idle elevators converge on a single
/// designated stop, typically the ground floor or main lobby.
pub struct ReturnToLobby {
    /// Index into the group's stop list for the home stop.
    /// Defaults to 0 (first stop).
    pub home_stop_index: usize,
}

impl ReturnToLobby {
    /// Create with default home stop (index 0).
    #[must_use]
    pub const fn new() -> Self {
        Self { home_stop_index: 0 }
    }

    /// Create with a specific home stop index.
    #[must_use]
    pub const fn with_home(index: usize) -> Self {
        Self {
            home_stop_index: index,
        }
    }
}

impl Default for ReturnToLobby {
    fn default() -> Self {
        Self::new()
    }
}

impl RepositionStrategy for ReturnToLobby {
    fn reposition(
        &mut self,
        idle_elevators: &[(EntityId, f64)],
        stop_positions: &[(EntityId, f64)],
        _group: &ElevatorGroup,
        _world: &World,
    ) -> Vec<(EntityId, EntityId)> {
        let Some(&(home_eid, home_pos)) = stop_positions.get(self.home_stop_index) else {
            return Vec::new();
        };

        idle_elevators
            .iter()
            .filter(|(_, pos)| (*pos - home_pos).abs() > 1e-6)
            .map(|&(eid, _)| (eid, home_eid))
            .collect()
    }
}

/// Position idle elevators near stops with historically high demand.
///
/// Reads per-stop throughput from the [`MetricTags`] system to weight
/// stop positions. Idle elevators are assigned to the highest-demand
/// stops that don't already have an elevator nearby.
pub struct DemandWeighted;

impl RepositionStrategy for DemandWeighted {
    fn reposition(
        &mut self,
        idle_elevators: &[(EntityId, f64)],
        stop_positions: &[(EntityId, f64)],
        group: &ElevatorGroup,
        world: &World,
    ) -> Vec<(EntityId, EntityId)> {
        if idle_elevators.is_empty() || stop_positions.is_empty() {
            return Vec::new();
        }

        // Build demand weights from tagged metrics.
        let tags = world.resource::<MetricTags>();
        let mut scored_stops: Vec<(EntityId, f64, f64)> = stop_positions
            .iter()
            .map(|&(stop_eid, stop_pos)| {
                let demand = tags
                    .and_then(|t| {
                        t.tags_for(stop_eid)
                            .iter()
                            .filter_map(|tag| t.metric(tag).map(TaggedMetric::total_delivered))
                            .max()
                    })
                    .unwrap_or(0) as f64;
                (stop_eid, stop_pos, demand + 1.0) // +1 to avoid zero weights
            })
            .collect();

        // Sort by demand descending — highest demand stops get elevators first.
        scored_stops.sort_by(|a, b| b.2.total_cmp(&a.2));

        // Collect non-idle elevator positions.
        let mut occupied: Vec<f64> = group
            .elevator_entities()
            .iter()
            .filter_map(|&eid| {
                if idle_elevators.iter().any(|(ie, _)| *ie == eid) {
                    return None;
                }
                world.position(eid).map(|p| p.value)
            })
            .collect();

        let mut results = Vec::new();
        let mut assigned_elevators: Vec<EntityId> = Vec::new();

        for (stop_eid, stop_pos, _demand) in &scored_stops {
            // Skip if there's already an elevator near this stop.
            if min_distance_to(*stop_pos, &occupied) < 1e-6 {
                continue;
            }

            // Find the closest unassigned idle elevator.
            let closest = idle_elevators
                .iter()
                .filter(|(eid, _)| !assigned_elevators.contains(eid))
                .min_by(|a, b| {
                    let da = (a.1 - stop_pos).abs();
                    let db = (b.1 - stop_pos).abs();
                    da.total_cmp(&db)
                });

            if let Some(&(elev_eid, elev_pos)) = closest {
                if (elev_pos - stop_pos).abs() > 1e-6 {
                    results.push((elev_eid, *stop_eid));
                    assigned_elevators.push(elev_eid);
                    occupied.push(*stop_pos);
                }
            }

            if assigned_elevators.len() == idle_elevators.len() {
                break;
            }
        }

        results
    }
}

/// No-op strategy: idle elevators stay where they stopped.
///
/// Use this to disable repositioning for a group while keeping
/// the repositioning phase active for other groups.
pub struct NearestIdle;

impl RepositionStrategy for NearestIdle {
    fn reposition(
        &mut self,
        _idle_elevators: &[(EntityId, f64)],
        _stop_positions: &[(EntityId, f64)],
        _group: &ElevatorGroup,
        _world: &World,
    ) -> Vec<(EntityId, EntityId)> {
        Vec::new()
    }
}

/// Minimum distance from `pos` to any value in `others`.
fn min_distance_to(pos: f64, others: &[f64]) -> f64 {
    if others.is_empty() {
        return f64::INFINITY;
    }
    others
        .iter()
        .map(|&o| (pos - o).abs())
        .fold(f64::INFINITY, f64::min)
}
