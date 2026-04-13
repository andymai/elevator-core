use std::collections::HashSet;

use crate::components::AccessControl;
use crate::error::RejectionReason;
use crate::events::Event;
use crate::stop::StopId;

use super::helpers;

/// Rider rejected when elevator has restricted_stops containing the destination.
#[test]
fn rider_rejected_by_elevator_restriction() {
    let mut config = helpers::default_config();
    // Restrict elevator from serving Floor 3 (StopId(2)).
    config.elevators[0].restricted_stops = vec![StopId(2)];

    let mut sim =
        crate::sim::Simulation::new(&config, helpers::scan()).expect("config should be valid");

    // Rider wants to go from Ground to Floor 3 (restricted).
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .expect("spawn should succeed");

    let mut all_events = Vec::new();
    for _ in 0..500 {
        sim.step();
        all_events.extend(sim.drain_events());
    }

    let rejected = all_events.iter().any(|e| {
        matches!(
            e,
            Event::RiderRejected {
                reason: RejectionReason::AccessDenied,
                ..
            }
        )
    });
    assert!(rejected, "rider should be rejected with AccessDenied");

    // Rider should NOT have arrived since the only elevator is restricted.
    assert!(
        !helpers::all_riders_arrived(&sim),
        "rider should not arrive when the only elevator is restricted"
    );
}

/// Rider rejected when their AccessControl does not include the destination.
#[test]
fn rider_rejected_by_rider_access_control() {
    let config = helpers::default_config();
    let mut sim =
        crate::sim::Simulation::new(&config, helpers::scan()).expect("config should be valid");

    // Spawn rider to Floor 3.
    let rider = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .expect("spawn should succeed");

    // Set rider access to only allow Ground and Floor 2 — NOT Floor 3.
    let stop0 = sim.stop_entity(StopId(0)).expect("stop 0 exists");
    let stop1 = sim.stop_entity(StopId(1)).expect("stop 1 exists");
    sim.set_rider_access(rider, HashSet::from([stop0, stop1]))
        .expect("set_rider_access should succeed");

    let mut all_events = Vec::new();
    for _ in 0..500 {
        sim.step();
        all_events.extend(sim.drain_events());
    }

    let rejected = all_events.iter().any(|e| {
        matches!(
            e,
            Event::RiderRejected {
                reason: RejectionReason::AccessDenied,
                ..
            }
        )
    });
    assert!(
        rejected,
        "rider should be rejected with AccessDenied due to rider access control"
    );
}

/// Rider boards normally when no access restrictions exist.
#[test]
fn rider_boards_without_restrictions() {
    let config = helpers::default_config();
    let mut sim =
        crate::sim::Simulation::new(&config, helpers::scan()).expect("config should be valid");

    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .expect("spawn should succeed");

    for _ in 0..2000 {
        sim.step();
        if helpers::all_riders_arrived(&sim) {
            break;
        }
    }

    assert!(
        helpers::all_riders_arrived(&sim),
        "rider should arrive when no restrictions"
    );
}

/// Rider with AccessControl listing the destination boards normally.
#[test]
fn rider_boards_when_destination_in_allowed_stops() {
    let config = helpers::default_config();
    let mut sim =
        crate::sim::Simulation::new(&config, helpers::scan()).expect("config should be valid");

    let rider = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .expect("spawn should succeed");

    // Allow all three stops.
    let stop0 = sim.stop_entity(StopId(0)).expect("stop 0 exists");
    let stop1 = sim.stop_entity(StopId(1)).expect("stop 1 exists");
    let stop2 = sim.stop_entity(StopId(2)).expect("stop 2 exists");
    sim.set_rider_access(rider, HashSet::from([stop0, stop1, stop2]))
        .expect("set_rider_access should succeed");

    for _ in 0..2000 {
        sim.step();
        if helpers::all_riders_arrived(&sim) {
            break;
        }
    }

    assert!(
        helpers::all_riders_arrived(&sim),
        "rider should arrive when destination is in allowed_stops"
    );
}

/// Elevator restriction does not affect riders going to unrestricted stops.
#[test]
fn restriction_does_not_affect_unrestricted_destinations() {
    let mut config = helpers::default_config();
    // Restrict Floor 3 only.
    config.elevators[0].restricted_stops = vec![StopId(2)];

    let mut sim =
        crate::sim::Simulation::new(&config, helpers::scan()).expect("config should be valid");

    // Rider going to Floor 2 (not restricted).
    sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 70.0)
        .expect("spawn should succeed");

    for _ in 0..2000 {
        sim.step();
        if helpers::all_riders_arrived(&sim) {
            break;
        }
    }

    assert!(
        helpers::all_riders_arrived(&sim),
        "rider to unrestricted stop should arrive"
    );
}

/// Elevator restriction and rider access control work independently in the same sim.
///
/// Tests each restriction type in isolation (one rider per restriction) to avoid
/// the loading system's single-rejection-slot-per-tick behavior masking failures.
#[test]
fn both_restriction_types_work_in_same_sim() {
    let mut config = helpers::default_config();
    // Elevator restricts Floor 2.
    config.elevators[0].restricted_stops = vec![StopId(1)];

    let mut sim =
        crate::sim::Simulation::new(&config, helpers::scan()).expect("config should be valid");

    // Rider 1: going to Floor 2 (elevator-restricted). Test alone first.
    let rider1 = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(1), 70.0)
        .expect("spawn should succeed");

    let mut events_phase1 = Vec::new();
    for _ in 0..200 {
        sim.step();
        events_phase1.extend(sim.drain_events());
    }

    let rider1_rejected = events_phase1.iter().any(|e| {
        matches!(
            e,
            Event::RiderRejected {
                rider,
                reason: RejectionReason::AccessDenied,
                ..
            } if *rider == rider1
        )
    });
    assert!(
        rider1_rejected,
        "rider1 (elevator-restricted) should be rejected"
    );

    // Despawn rider1 so it doesn't monopolize the rejection slot.
    sim.despawn_rider(rider1).expect("despawn should succeed");

    // Rider 2: going to Floor 3 with access control that doesn't include Floor 3.
    let rider2 = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .expect("spawn should succeed");
    let stop0 = sim.stop_entity(StopId(0)).expect("stop 0 exists");
    let stop1 = sim.stop_entity(StopId(1)).expect("stop 1 exists");
    sim.set_rider_access(rider2, HashSet::from([stop0, stop1]))
        .expect("set_rider_access should succeed");

    let mut events_phase2 = Vec::new();
    for _ in 0..200 {
        sim.step();
        events_phase2.extend(sim.drain_events());
    }

    let rider2_rejected = events_phase2.iter().any(|e| {
        matches!(
            e,
            Event::RiderRejected {
                rider,
                reason: RejectionReason::AccessDenied,
                ..
            } if *rider == rider2
        )
    });
    assert!(
        rider2_rejected,
        "rider2 (access-control-restricted) should be rejected"
    );
}

/// RiderRejected event carries AccessDenied reason with None context.
#[test]
fn rejection_event_has_access_denied_reason() {
    let mut config = helpers::default_config();
    config.elevators[0].restricted_stops = vec![StopId(2)];

    let mut sim =
        crate::sim::Simulation::new(&config, helpers::scan()).expect("config should be valid");

    let rider = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .expect("spawn should succeed");

    let mut all_events = Vec::new();
    for _ in 0..500 {
        sim.step();
        all_events.extend(sim.drain_events());
    }

    let rejection = all_events.iter().find(|e| {
        matches!(
            e,
            Event::RiderRejected {
                reason: RejectionReason::AccessDenied,
                ..
            }
        )
    });

    assert!(rejection.is_some(), "should have AccessDenied rejection");
    if let Some(Event::RiderRejected {
        rider: rid,
        reason,
        context,
        ..
    }) = rejection
    {
        assert_eq!(*rid, rider);
        assert_eq!(*reason, RejectionReason::AccessDenied);
        assert!(context.is_none(), "AccessDenied should have no context");
    }
}

/// AccessControl component round-trips through serde.
#[test]
fn access_control_serde_roundtrip() {
    let stop_id = crate::entity::EntityId::default();
    let ac = AccessControl::new(HashSet::from([stop_id]));
    let serialized = ron::to_string(&ac).expect("serialize should succeed");
    let deserialized: AccessControl =
        ron::from_str(&serialized).expect("deserialize should succeed");
    assert!(deserialized.can_access(stop_id));
}

/// ElevatorConfig with restricted_stops round-trips through RON serde.
#[test]
fn config_restricted_stops_serde_roundtrip() {
    let mut config = helpers::default_config();
    config.elevators[0].restricted_stops = vec![StopId(1), StopId(2)];

    let serialized = ron::to_string(&config).expect("serialize should succeed");
    let deserialized: crate::config::SimConfig =
        ron::from_str(&serialized).expect("deserialize should succeed");
    assert_eq!(deserialized.elevators[0].restricted_stops.len(), 2);
    assert!(
        deserialized.elevators[0]
            .restricted_stops
            .contains(&StopId(1))
    );
    assert!(
        deserialized.elevators[0]
            .restricted_stops
            .contains(&StopId(2))
    );
}
