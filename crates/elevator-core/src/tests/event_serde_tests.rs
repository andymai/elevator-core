use crate::error::RejectionReason;
use crate::events::Event;
use crate::world::World;

#[test]
fn roundtrip_sim_event_ron() {
    // We need valid EntityIds from a World to construct events.
    let mut world = World::new();
    let e1 = world.spawn();
    let e2 = world.spawn();
    let e3 = world.spawn();

    let events = vec![
        Event::ElevatorDeparted {
            elevator: e1,
            from_stop: e2,
            tick: 10,
        },
        Event::ElevatorArrived {
            elevator: e1,
            at_stop: e3,
            tick: 20,
        },
        Event::DoorOpened {
            elevator: e1,
            tick: 5,
        },
        Event::DoorClosed {
            elevator: e1,
            tick: 8,
        },
        Event::RiderSpawned {
            rider: e2,
            origin: e1,
            destination: e3,
            tick: 1,
        },
        Event::RiderBoarded {
            rider: e2,
            elevator: e1,
            tick: 15,
        },
        Event::RiderExited {
            rider: e2,
            elevator: e1,
            stop: e3,
            tick: 30,
        },
        Event::RiderRejected {
            rider: e2,
            elevator: e1,
            reason: RejectionReason::OverCapacity,
            context: None,
            tick: 99,
        },
        Event::RiderAbandoned {
            rider: e2,
            stop: e1,
            tick: 50,
        },
    ];

    for event in &events {
        let serialized = ron::to_string(event).expect("failed to serialize Event");
        let deserialized: Event = ron::from_str(&serialized).expect("failed to deserialize Event");
        assert_eq!(*event, deserialized);
    }
}
