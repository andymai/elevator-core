use crate::dispatch::*;
use crate::door::DoorState;
use crate::elevator::*;
use crate::passenger::PassengerId;
use crate::stop::*;
use std::collections::HashMap;

fn test_stops() -> Vec<StopConfig> {
    vec![
        StopConfig {
            id: StopId(0),
            name: "Ground".into(),
            position: 0.0,
        },
        StopConfig {
            id: StopId(1),
            name: "Floor 2".into(),
            position: 4.0,
        },
        StopConfig {
            id: StopId(2),
            name: "Floor 3".into(),
            position: 8.0,
        },
        StopConfig {
            id: StopId(3),
            name: "Roof".into(),
            position: 12.0,
        },
    ]
}

fn test_elevator(position: f64) -> Elevator {
    Elevator {
        id: ElevatorId(0),
        position,
        velocity: 0.0,
        state: ElevatorState::Idle,
        door: DoorState::Closed,
        max_speed: 2.0,
        acceleration: 1.5,
        deceleration: 2.0,
        weight_capacity: 800.0,
        current_load: 0.0,
        passengers: vec![],
        cargo: vec![],
        target_stop: None,
        door_transition_ticks: 15,
        door_open_ticks: 60,
    }
}

fn empty_manifest() -> WaitingManifest {
    WaitingManifest {
        waiting_at_stop: HashMap::new(),
        riders: vec![],
        passenger_destinations: HashMap::new(),
    }
}

#[test]
fn no_requests_returns_idle() {
    let mut scan = ScanDispatch::new();
    let elevator = test_elevator(0.0);
    let stops = test_stops();
    let manifest = empty_manifest();

    let decision = scan.decide(&elevator, &stops, &manifest);
    assert_eq!(decision, DispatchDecision::Idle);
}

#[test]
fn goes_to_nearest_stop_in_current_direction() {
    let mut scan = ScanDispatch::new(); // direction: Up
    let elevator = test_elevator(0.0);
    let stops = test_stops();

    let mut waiting = HashMap::new();
    waiting.insert(StopId(1), vec![PassengerId(10)]);
    waiting.insert(StopId(3), vec![PassengerId(20)]);

    let manifest = WaitingManifest {
        waiting_at_stop: waiting,
        riders: vec![],
        passenger_destinations: HashMap::new(),
    };

    let decision = scan.decide(&elevator, &stops, &manifest);
    // Nearest stop ahead (Up from 0.0) is StopId(1) at 4.0
    assert_eq!(decision, DispatchDecision::GoToStop(StopId(1)));
}

#[test]
fn reverses_when_nothing_ahead() {
    let mut scan = ScanDispatch::new(); // direction: Up
    let elevator = test_elevator(8.0);
    let stops = test_stops();

    let mut waiting = HashMap::new();
    waiting.insert(StopId(0), vec![PassengerId(10)]);
    waiting.insert(StopId(1), vec![PassengerId(20)]);

    let manifest = WaitingManifest {
        waiting_at_stop: waiting,
        riders: vec![],
        passenger_destinations: HashMap::new(),
    };

    let decision = scan.decide(&elevator, &stops, &manifest);
    // Nothing above 8.0 is interesting. Reverse to Down.
    // Nearest below = StopId(1) at 4.0
    assert_eq!(decision, DispatchDecision::GoToStop(StopId(1)));
}

#[test]
fn serves_rider_destination() {
    let mut scan = ScanDispatch::new(); // direction: Up
    let elevator = test_elevator(0.0);
    let stops = test_stops();

    let mut destinations = HashMap::new();
    destinations.insert(PassengerId(1), StopId(2));

    let manifest = WaitingManifest {
        waiting_at_stop: HashMap::new(),
        riders: vec![PassengerId(1)],
        passenger_destinations: destinations,
    };

    let decision = scan.decide(&elevator, &stops, &manifest);
    assert_eq!(decision, DispatchDecision::GoToStop(StopId(2)));
}

#[test]
fn prefers_current_direction() {
    let mut scan = ScanDispatch::new(); // direction: Up
    let elevator = test_elevator(4.0);
    let stops = test_stops();

    let mut waiting = HashMap::new();
    waiting.insert(StopId(0), vec![PassengerId(10)]); // below at 0.0
    waiting.insert(StopId(2), vec![PassengerId(20)]); // above at 8.0

    let manifest = WaitingManifest {
        waiting_at_stop: waiting,
        riders: vec![],
        passenger_destinations: HashMap::new(),
    };

    let decision = scan.decide(&elevator, &stops, &manifest);
    // Should continue Up to StopId(2) rather than reversing to StopId(0)
    assert_eq!(decision, DispatchDecision::GoToStop(StopId(2)));
}
