use crate::dispatch::{DispatchDecision, DispatchStrategy, WaitingManifest};
use crate::elevator::{Elevator, ElevatorState};
use crate::events::{EventBus, SimEvent};
use crate::passenger::{Cargo, CargoState, Passenger, PassengerId, PassengerState};
use crate::stop::{StopConfig, StopId};
use std::collections::HashMap;

/// Assign idle/stopped elevators to stops via the dispatch strategy.
pub fn run(
    elevators: &mut [Elevator],
    stops: &[StopConfig],
    passengers: &[Passenger],
    cargo: &[Cargo],
    dispatch: &mut dyn DispatchStrategy,
    events: &mut EventBus,
    tick: u64,
) {
    for i in 0..elevators.len() {
        let needs_dispatch = matches!(
            elevators[i].state,
            ElevatorState::Idle | ElevatorState::Stopped
        );
        if !needs_dispatch {
            continue;
        }

        let manifest = build_waiting_manifest(passengers, cargo, elevators, i);
        let elevator_snapshot = elevators[i].clone();
        let decision = dispatch.decide(&elevator_snapshot, stops, &manifest);

        match decision {
            DispatchDecision::GoToStop(stop_id) => {
                let current_stop = find_stop_at_position(stops, elevators[i].position);
                elevators[i].state = ElevatorState::MovingToStop(stop_id);
                elevators[i].target_stop = Some(stop_id);
                if let Some(from) = current_stop {
                    events.emit(SimEvent::ElevatorDeparted {
                        elevator: elevators[i].id,
                        from_stop: from,
                        tick,
                    });
                }
            }
            DispatchDecision::Idle => {
                elevators[i].state = ElevatorState::Idle;
            }
        }
    }
}

fn build_waiting_manifest(
    passengers: &[Passenger],
    cargo: &[Cargo],
    elevators: &[Elevator],
    elevator_idx: usize,
) -> WaitingManifest {
    let mut waiting_at_stop: HashMap<StopId, Vec<PassengerId>> = HashMap::new();
    let mut passenger_destinations: HashMap<PassengerId, StopId> = HashMap::new();

    for p in passengers {
        passenger_destinations.insert(p.id, p.destination);
        if p.state == PassengerState::Waiting {
            waiting_at_stop.entry(p.origin).or_default().push(p.id);
        }
    }

    for c in cargo {
        if let CargoState::Loaded(eid) = c.state
            && eid == elevators[elevator_idx].id
        {
            passenger_destinations.insert(PassengerId(c.id.0), c.destination);
        }
    }

    let riders = elevators[elevator_idx].passengers.clone();

    WaitingManifest {
        waiting_at_stop,
        riders,
        passenger_destinations,
    }
}

fn find_stop_at_position(stops: &[StopConfig], position: f64) -> Option<StopId> {
    const EPSILON: f64 = 1e-6;
    stops
        .iter()
        .find(|s| (s.position - position).abs() < EPSILON)
        .map(|s| s.id)
}
