use crate::events::SimEvent;
use crate::world::World;

#[test]
fn roundtrip_sim_event_ron() {
    // We need valid EntityIds from a World to construct events.
    let mut world = World::new();
    let e1 = world.spawn();
    let e2 = world.spawn();
    let e3 = world.spawn();

    let events = vec![
        SimEvent::ElevatorDeparted {
            elevator: e1,
            from_stop: e2,
            tick: 10,
        },
        SimEvent::ElevatorArrived {
            elevator: e1,
            at_stop: e3,
            tick: 20,
        },
        SimEvent::DoorOpened {
            elevator: e1,
            tick: 5,
        },
        SimEvent::DoorClosed {
            elevator: e1,
            tick: 8,
        },
        SimEvent::RiderSpawned {
            rider: e2,
            origin: e1,
            destination: e3,
            tick: 1,
        },
        SimEvent::RiderBoarded {
            rider: e2,
            elevator: e1,
            tick: 15,
        },
        SimEvent::RiderAlighted {
            rider: e2,
            elevator: e1,
            stop: e3,
            tick: 30,
        },
        SimEvent::RiderRejected {
            rider: e2,
            elevator: e1,
            reason: "overweight".to_string(),
            tick: 99,
        },
        SimEvent::RiderAbandoned {
            rider: e2,
            stop: e1,
            tick: 50,
        },
    ];

    for event in &events {
        let serialized = ron::to_string(event).expect("failed to serialize SimEvent");
        let deserialized: SimEvent =
            ron::from_str(&serialized).expect("failed to deserialize SimEvent");
        assert_eq!(*event, deserialized);
    }
}
