use crate::elevator::Elevator;
use crate::passenger::PassengerId;
use crate::stop::{StopConfig, StopId};
use std::collections::HashMap;

/// Decision returned by a dispatch strategy.
#[derive(Debug, Clone, PartialEq)]
pub enum DispatchDecision {
    GoToStop(StopId),
    Idle,
}

/// Snapshot of waiting passengers and riders, owned to avoid borrow conflicts.
pub struct WaitingManifest {
    /// Passengers waiting at each stop.
    pub waiting_at_stop: HashMap<StopId, Vec<PassengerId>>,
    /// Passengers currently riding in the elevator.
    pub riders: Vec<PassengerId>,
    /// Destination for each known passenger.
    pub passenger_destinations: HashMap<PassengerId, StopId>,
}

/// Trait for pluggable elevator dispatch algorithms.
pub trait DispatchStrategy: Send + Sync {
    fn decide(
        &mut self,
        elevator: &Elevator,
        stops: &[StopConfig],
        waiting: &WaitingManifest,
    ) -> DispatchDecision;
}

const EPSILON: f64 = 1e-9;

/// Direction of travel for the SCAN algorithm.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ScanDirection {
    Up,
    Down,
}

/// Elevator dispatch using the SCAN (elevator) algorithm.
///
/// Serves all requests in the current direction of travel before reversing,
/// similar to a disk arm sweep.
pub struct ScanDispatch {
    direction: ScanDirection,
}

impl ScanDispatch {
    pub fn new() -> Self {
        ScanDispatch {
            direction: ScanDirection::Up,
        }
    }
}

impl Default for ScanDispatch {
    fn default() -> Self {
        Self::new()
    }
}

impl DispatchStrategy for ScanDispatch {
    fn decide(
        &mut self,
        elevator: &Elevator,
        stops: &[StopConfig],
        manifest: &WaitingManifest,
    ) -> DispatchDecision {
        // Collect all "interesting" stop IDs: stops with waiting passengers or rider destinations.
        let mut interesting: std::collections::HashSet<StopId> = std::collections::HashSet::new();

        for stop_id in manifest.waiting_at_stop.keys() {
            if let Some(passengers) = manifest.waiting_at_stop.get(stop_id)
                && !passengers.is_empty()
            {
                interesting.insert(*stop_id);
            }
        }

        for rider_id in &manifest.riders {
            if let Some(dest) = manifest.passenger_destinations.get(rider_id) {
                interesting.insert(*dest);
            }
        }

        if interesting.is_empty() {
            return DispatchDecision::Idle;
        }

        // Map stop IDs to (StopId, position).
        let interesting_stops: Vec<(StopId, f64)> = interesting
            .iter()
            .filter_map(|sid| {
                stops
                    .iter()
                    .find(|s| s.id == *sid)
                    .map(|s| (s.id, s.position))
            })
            .collect();

        let pos = elevator.position;

        // Partition into ahead and behind based on current direction.
        let (ahead, behind): (Vec<_>, Vec<_>) = match self.direction {
            ScanDirection::Up => interesting_stops
                .iter()
                .partition(|(_, p)| *p > pos + EPSILON),
            ScanDirection::Down => interesting_stops
                .iter()
                .partition(|(_, p)| *p < pos - EPSILON),
        };

        if !ahead.is_empty() {
            // Pick nearest in current direction.
            let nearest = match self.direction {
                ScanDirection::Up => ahead
                    .iter()
                    .min_by(|a: &&&(StopId, f64), b: &&&(StopId, f64)| {
                        a.1.partial_cmp(&b.1).unwrap()
                    }),
                ScanDirection::Down => ahead
                    .iter()
                    .max_by(|a: &&&(StopId, f64), b: &&&(StopId, f64)| {
                        a.1.partial_cmp(&b.1).unwrap()
                    }),
            };
            return DispatchDecision::GoToStop(nearest.unwrap().0);
        }

        // Nothing ahead — reverse direction.
        self.direction = match self.direction {
            ScanDirection::Up => ScanDirection::Down,
            ScanDirection::Down => ScanDirection::Up,
        };

        // Pick nearest in the new direction (from behind).
        if behind.is_empty() {
            // All interesting stops are at the current position — go there.
            return interesting_stops
                .first()
                .map(|(sid, _)| DispatchDecision::GoToStop(*sid))
                .unwrap_or(DispatchDecision::Idle);
        }

        let nearest = match self.direction {
            ScanDirection::Up => behind
                .iter()
                .min_by(|a, b| a.1.partial_cmp(&b.1).unwrap()),
            ScanDirection::Down => behind
                .iter()
                .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap()),
        };

        DispatchDecision::GoToStop(nearest.unwrap().0)
    }
}
