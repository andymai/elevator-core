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

use crate::arrival_log::{ArrivalLog, CurrentTick, DEFAULT_ARRIVAL_WINDOW_TICKS};
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
        out: &mut Vec<(EntityId, EntityId)>,
    ) {
        if idle_elevators.is_empty() || stop_positions.is_empty() {
            return;
        }

        // Collect positions of all non-idle elevators in this group.
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

        for &(elev_eid, elev_pos) in idle_elevators {
            // Primary criterion: maximize the minimum distance from any
            // already-occupied position (true "spread"). Tie-breaker:
            // prefer the stop closest to the elevator's current position
            // — otherwise, with no occupied positions at sim start, every
            // stop is tied at `INFINITY` and `max_by`'s last-wins default
            // ships every car to the topmost stop. That was the reported
            // "cars travel to the top at sim start with no demand" bug.
            let best = stop_positions.iter().max_by(|a, b| {
                let min_a = min_distance_to(a.1, &occupied);
                let min_b = min_distance_to(b.1, &occupied);
                min_a.total_cmp(&min_b).then_with(|| {
                    let dist_a = (a.1 - elev_pos).abs();
                    let dist_b = (b.1 - elev_pos).abs();
                    // `max_by` returns the greater element; invert so the
                    // closer stop to the elevator is considered greater.
                    dist_b.total_cmp(&dist_a)
                })
            });

            if let Some(&(stop_eid, stop_pos)) = best {
                if (stop_pos - elev_pos).abs() > 1e-6 {
                    out.push((elev_eid, stop_eid));
                }
                occupied.push(stop_pos);
            }
        }
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
        out: &mut Vec<(EntityId, EntityId)>,
    ) {
        let Some(&(home_eid, home_pos)) = stop_positions.get(self.home_stop_index) else {
            return;
        };

        out.extend(
            idle_elevators
                .iter()
                .filter(|(_, pos)| (*pos - home_pos).abs() > 1e-6)
                .map(|&(eid, _)| (eid, home_eid)),
        );
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
        out: &mut Vec<(EntityId, EntityId)>,
    ) {
        if idle_elevators.is_empty() || stop_positions.is_empty() {
            return;
        }

        let tags = world.resource::<MetricTags>();
        // `demand + 1.0` keeps zero-demand stops in the running — the
        // strategy still produces a spread at sim start before any
        // deliveries have been recorded.
        let mut scored: Vec<(EntityId, f64, f64)> = stop_positions
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
                (stop_eid, stop_pos, demand + 1.0)
            })
            .collect();
        scored.sort_by(|a, b| b.2.total_cmp(&a.2));

        assign_greedy_by_score(&scored, idle_elevators, group, world, out);
    }
}

/// Predictive parking: park idle elevators near stops with the
/// highest recent per-stop arrival rate.
///
/// Reads the [`ArrivalLog`] and [`CurrentTick`] world resources
/// (always present under a built sim) to compute a rolling window of
/// arrivals. Cars are greedily assigned to the highest-rate stops that
/// don't already have a car nearby, so the group spreads across the
/// hottest floors rather than clustering on one.
///
/// Parallels the headline feature of Otis Compass Infinity — forecast
/// demand from recent traffic, pre-position cars accordingly. Falls
/// back to no-op when no arrivals have been logged.
pub struct PredictiveParking {
    /// Rolling window (ticks) used to compute per-stop arrival counts.
    /// Shorter windows react faster; longer windows smooth noise.
    window_ticks: u64,
}

impl PredictiveParking {
    /// Create with the default rolling window
    /// ([`DEFAULT_ARRIVAL_WINDOW_TICKS`]).
    #[must_use]
    pub const fn new() -> Self {
        Self {
            window_ticks: DEFAULT_ARRIVAL_WINDOW_TICKS,
        }
    }

    /// Create with a custom rolling window (ticks). Shorter windows
    /// react faster to traffic shifts; longer windows smooth out noise.
    ///
    /// # Panics
    /// Panics on `window_ticks == 0`. A zero window would cause
    /// `ArrivalLog::arrivals_in_window` to return 0 for every stop —
    /// the strategy would silently no-op, which is almost never what
    /// the caller meant.
    #[must_use]
    pub const fn with_window_ticks(window_ticks: u64) -> Self {
        assert!(
            window_ticks > 0,
            "PredictiveParking::with_window_ticks requires a positive window"
        );
        Self { window_ticks }
    }
}

impl Default for PredictiveParking {
    fn default() -> Self {
        Self::new()
    }
}

impl RepositionStrategy for PredictiveParking {
    fn reposition(
        &mut self,
        idle_elevators: &[(EntityId, f64)],
        stop_positions: &[(EntityId, f64)],
        group: &ElevatorGroup,
        world: &World,
        out: &mut Vec<(EntityId, EntityId)>,
    ) {
        if idle_elevators.is_empty() || stop_positions.is_empty() {
            return;
        }
        let Some(log) = world.resource::<ArrivalLog>() else {
            return;
        };
        let now = world.resource::<CurrentTick>().map_or(0, |ct| ct.0);

        // Score each stop by its arrival count over the window. Keep
        // only positives — stops with zero recent arrivals are not
        // parking targets (no signal to act on).
        let mut scored: Vec<(EntityId, f64, u64)> = stop_positions
            .iter()
            .filter_map(|&(sid, pos)| {
                let count = log.arrivals_in_window(sid, now, self.window_ticks);
                (count > 0).then_some((sid, pos, count))
            })
            .collect();
        if scored.is_empty() {
            return;
        }
        // Highest arrival count first; stable sort preserves stop-id
        // order on ties so the result stays deterministic.
        scored.sort_by_key(|(_, _, count)| std::cmp::Reverse(*count));

        assign_greedy_by_score(&scored, idle_elevators, group, world, out);
    }
}

/// Mode-gated reposition: dispatches to an inner strategy chosen
/// by the current [`TrafficMode`](crate::traffic_detector::TrafficMode).
///
/// Closes the playground-reported "chaotic repositioning" complaint:
/// the single-strategy defaults either lock cars to the lobby
/// ([`ReturnToLobby`]) or shuttle them toward the hottest stop
/// ([`PredictiveParking`]) regardless of traffic shape. Adaptive
/// picks per mode:
///
/// | Mode                                              | Inner                      |
/// |---------------------------------------------------|----------------------------|
/// | [`UpPeak`](crate::traffic_detector::TrafficMode::UpPeak)         | [`ReturnToLobby`]           |
/// | [`InterFloor`](crate::traffic_detector::TrafficMode::InterFloor) | [`PredictiveParking`]       |
/// | [`DownPeak`](crate::traffic_detector::TrafficMode::DownPeak)     | [`PredictiveParking`] (today) |
/// | [`Idle`](crate::traffic_detector::TrafficMode::Idle)             | no-op (stay put)             |
///
/// The `DownPeak` row uses `PredictiveParking` for now — it'll
/// become a dedicated upper-floor-biased variant once
/// `TrafficDetector` emits `DownPeak` (needs the destination-log
/// that today's [`ArrivalLog`] doesn't carry). Falls back to a
/// `PredictiveParking`-like default if the detector is missing
/// from `World` (e.g. hand-built tests bypassing `Simulation`).
pub struct AdaptiveParking {
    /// Inner strategy used in up-peak mode. Configurable so games
    /// can pin a different home stop (sky-lobby buildings, e.g.).
    return_to_lobby: ReturnToLobby,
    /// Inner strategy used when demand is diffuse or heading down.
    predictive: PredictiveParking,
}

impl AdaptiveParking {
    /// Create with defaults: `ReturnToLobby::new()` (home = stop 0)
    /// and `PredictiveParking::new()` (default rolling window).
    #[must_use]
    pub const fn new() -> Self {
        Self {
            return_to_lobby: ReturnToLobby::new(),
            predictive: PredictiveParking::new(),
        }
    }

    /// Override the home stop used during `UpPeak`. Same semantics as
    /// [`ReturnToLobby::with_home`].
    #[must_use]
    pub const fn with_home(mut self, index: usize) -> Self {
        self.return_to_lobby = ReturnToLobby::with_home(index);
        self
    }

    /// Override the window used for `InterFloor` / `DownPeak`
    /// predictive parking. Same semantics as
    /// [`PredictiveParking::with_window_ticks`].
    ///
    /// # Panics
    /// Panics on `window_ticks = 0`, matching `PredictiveParking`.
    #[must_use]
    pub const fn with_window_ticks(mut self, window_ticks: u64) -> Self {
        self.predictive = PredictiveParking::with_window_ticks(window_ticks);
        self
    }
}

impl Default for AdaptiveParking {
    fn default() -> Self {
        Self::new()
    }
}

impl RepositionStrategy for AdaptiveParking {
    fn reposition(
        &mut self,
        idle_elevators: &[(EntityId, f64)],
        stop_positions: &[(EntityId, f64)],
        group: &ElevatorGroup,
        world: &World,
        out: &mut Vec<(EntityId, EntityId)>,
    ) {
        use crate::traffic_detector::{TrafficDetector, TrafficMode};
        let mode = world
            .resource::<TrafficDetector>()
            .map_or(TrafficMode::InterFloor, TrafficDetector::current_mode);
        match mode {
            TrafficMode::Idle => {
                // Stay put — no point commuting when there's no
                // demand to pre-position for.
            }
            TrafficMode::UpPeak => {
                self.return_to_lobby
                    .reposition(idle_elevators, stop_positions, group, world, out);
            }
            TrafficMode::DownPeak | TrafficMode::InterFloor => {
                self.predictive
                    .reposition(idle_elevators, stop_positions, group, world, out);
            }
        }
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
        _out: &mut Vec<(EntityId, EntityId)>,
    ) {
    }
}

/// Shared greedy-assign step for score-driven parking strategies.
///
/// `scored` is the list of `(stop_id, stop_pos, _score)` in descending
/// priority order (strategies sort/filter upstream). For each stop in
/// that order, pick the closest still-unassigned idle elevator and
/// send it there — unless the stop is already covered by a non-idle
/// car or the closest idle car is already parked on it.
///
/// The tuple's third element is ignored here; it exists only to keep
/// the caller's scoring type visible at the call site.
fn assign_greedy_by_score<S>(
    scored: &[(EntityId, f64, S)],
    idle_elevators: &[(EntityId, f64)],
    group: &ElevatorGroup,
    world: &World,
    out: &mut Vec<(EntityId, EntityId)>,
) {
    // Positions of non-idle elevators — avoid parking on top of cars
    // already in service.
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

    let mut assigned: Vec<EntityId> = Vec::new();
    for (stop_eid, stop_pos, _) in scored {
        if min_distance_to(*stop_pos, &occupied) < 1e-6 {
            continue;
        }

        let closest = idle_elevators
            .iter()
            .filter(|(eid, _)| !assigned.contains(eid))
            .min_by(|a, b| (a.1 - stop_pos).abs().total_cmp(&(b.1 - stop_pos).abs()));

        if let Some(&(elev_eid, elev_pos)) = closest
            && (elev_pos - stop_pos).abs() > 1e-6
        {
            out.push((elev_eid, *stop_eid));
            assigned.push(elev_eid);
            occupied.push(*stop_pos);
        }

        if assigned.len() == idle_elevators.len() {
            break;
        }
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
