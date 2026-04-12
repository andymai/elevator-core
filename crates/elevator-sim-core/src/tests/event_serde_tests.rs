use crate::elevator::ElevatorId;
use crate::events::SimEvent;
use crate::passenger::{CargoId, PassengerId};
use crate::stop::StopId;

#[test]
fn roundtrip_sim_event_ron() {
    let events = vec![
        SimEvent::ElevatorDeparted {
            elevator: ElevatorId(1),
            from_stop: StopId(0),
            tick: 10,
        },
        SimEvent::ElevatorArrived {
            elevator: ElevatorId(1),
            at_stop: StopId(2),
            tick: 20,
        },
        SimEvent::DoorOpened {
            elevator: ElevatorId(0),
            tick: 5,
        },
        SimEvent::DoorClosed {
            elevator: ElevatorId(0),
            tick: 8,
        },
        SimEvent::PassengerSpawned {
            passenger: PassengerId(42),
            origin: StopId(0),
            destination: StopId(3),
            tick: 1,
        },
        SimEvent::PassengerBoarded {
            passenger: PassengerId(42),
            elevator: ElevatorId(1),
            tick: 15,
        },
        SimEvent::PassengerAlighted {
            passenger: PassengerId(42),
            elevator: ElevatorId(1),
            stop: StopId(3),
            tick: 30,
        },
        SimEvent::CargoLoaded {
            cargo: CargoId(7),
            elevator: ElevatorId(0),
            tick: 12,
        },
        SimEvent::CargoUnloaded {
            cargo: CargoId(7),
            elevator: ElevatorId(0),
            stop: StopId(1),
            tick: 25,
        },
        SimEvent::OverweightRejected {
            entity_kind: "passenger".to_string(),
            elevator: ElevatorId(0),
            tick: 99,
        },
    ];

    for event in &events {
        let serialized = ron::to_string(event).expect("failed to serialize SimEvent");
        let deserialized: SimEvent =
            ron::from_str(&serialized).expect("failed to deserialize SimEvent");
        assert_eq!(*event, deserialized);
    }
}
