use crate::door::{DoorState, DoorTransition};

#[test]
fn full_door_cycle() {
    let mut door = DoorState::request_open(3, 5);

    // Opening phase: 3 ticks total, transitions on the 3rd
    assert_eq!(
        door,
        DoorState::Opening {
            ticks_remaining: 3,
            open_duration: 5,
            close_duration: 3,
        }
    );

    assert_eq!(door.tick(), DoorTransition::None);
    assert!(matches!(
        door,
        DoorState::Opening {
            ticks_remaining: 2,
            ..
        }
    ));

    assert_eq!(door.tick(), DoorTransition::None);
    assert!(matches!(
        door,
        DoorState::Opening {
            ticks_remaining: 1,
            ..
        }
    ));

    assert_eq!(door.tick(), DoorTransition::FinishedOpening);
    assert_eq!(
        door,
        DoorState::Open {
            ticks_remaining: 5,
            close_duration: 3,
        }
    );

    // Open phase: 5 ticks total, transitions on the 5th
    assert_eq!(door.tick(), DoorTransition::None); // 4 remaining
    assert_eq!(door.tick(), DoorTransition::None); // 3 remaining
    assert_eq!(door.tick(), DoorTransition::None); // 2 remaining
    assert_eq!(door.tick(), DoorTransition::None); // 1 remaining

    assert_eq!(door.tick(), DoorTransition::FinishedOpen);
    assert_eq!(
        door,
        DoorState::Closing {
            ticks_remaining: 3,
            total_duration: 3,
        }
    );

    // Closing phase: 3 ticks total, transitions on the 3rd
    assert_eq!(door.tick(), DoorTransition::None);
    assert!(matches!(
        door,
        DoorState::Closing {
            ticks_remaining: 2,
            ..
        }
    ));

    assert_eq!(door.tick(), DoorTransition::None);
    assert!(matches!(
        door,
        DoorState::Closing {
            ticks_remaining: 1,
            ..
        }
    ));

    assert_eq!(door.tick(), DoorTransition::FinishedClosing);
    assert_eq!(door, DoorState::Closed);
}

#[test]
fn is_open_and_is_closed() {
    let closed = DoorState::Closed;
    assert!(closed.is_closed());
    assert!(!closed.is_open());

    let opening = DoorState::Opening {
        ticks_remaining: 2,
        open_duration: 3,
        close_duration: 2,
    };
    assert!(!opening.is_open());
    assert!(!opening.is_closed());

    let open = DoorState::Open {
        ticks_remaining: 3,
        close_duration: 2,
    };
    assert!(open.is_open());
    assert!(!open.is_closed());

    let closing = DoorState::Closing {
        ticks_remaining: 2,
        total_duration: 2,
    };
    assert!(!closing.is_open());
    assert!(!closing.is_closed());
}

#[test]
fn single_tick_durations() {
    let mut door = DoorState::request_open(1, 1);

    assert_eq!(door.tick(), DoorTransition::FinishedOpening);
    assert!(door.is_open());

    assert_eq!(door.tick(), DoorTransition::FinishedOpen);
    assert!(matches!(
        door,
        DoorState::Closing {
            ticks_remaining: 1,
            ..
        }
    ));

    assert_eq!(door.tick(), DoorTransition::FinishedClosing);
    assert!(door.is_closed());
}

#[test]
fn closed_door_tick_is_noop() {
    let mut door = DoorState::Closed;
    assert_eq!(door.tick(), DoorTransition::None);
    assert_eq!(door, DoorState::Closed);

    // Multiple ticks remain a no-op
    assert_eq!(door.tick(), DoorTransition::None);
    assert_eq!(door, DoorState::Closed);
}
