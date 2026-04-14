//! Tests for the per-elevator `DestinationQueue` component and its
//! imperative push/clear API (inspired by elevator-saga's `destinationQueue`).

use crate::builder::SimulationBuilder;
use crate::components::ElevatorPhase;
use crate::dispatch::scan::ScanDispatch;
use crate::events::Event;
use crate::stop::StopId;

use super::helpers::default_config;

fn build_sim() -> crate::sim::Simulation {
    SimulationBuilder::from_config(default_config())
        .dispatch(ScanDispatch::new())
        .build()
        .unwrap()
}

fn first_elevator(sim: &crate::sim::Simulation) -> crate::entity::EntityId {
    sim.world().elevator_ids()[0]
}

// 1
#[test]
fn fresh_queue_is_empty() {
    let sim = build_sim();
    let elev = first_elevator(&sim);
    assert_eq!(sim.destination_queue(elev), Some(&[][..]));
}

// 2
#[test]
fn dispatch_populates_queue() {
    let mut sim = build_sim();
    // Spawn rider traveling from stop 1 (not elevator's start) to stop 2,
    // so dispatch has to send the car somewhere — triggering a queue push.
    sim.spawn_rider_by_stop_id(StopId(1), StopId(2), 75.0)
        .unwrap();
    sim.step();
    let elev = first_elevator(&sim);
    let queue = sim.destination_queue(elev).unwrap();
    assert!(
        !queue.is_empty(),
        "queue should contain the dispatched target (got {queue:?})"
    );
}

// 3
#[test]
fn queue_pops_on_arrival() {
    let mut sim = build_sim();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 75.0)
        .unwrap();
    // Run enough ticks for the elevator to reach stop 2.
    for _ in 0..2000 {
        sim.step();
        let elev = first_elevator(&sim);
        let car = sim.world().elevator(elev).unwrap();
        if !matches!(car.phase(), ElevatorPhase::MovingToStop(_))
            && sim.destination_queue(elev).is_some_and(<[_]>::is_empty)
        {
            break;
        }
    }
    let elev = first_elevator(&sim);
    // After arrival, the queue should be empty.
    assert!(sim.destination_queue(elev).unwrap().is_empty());
}

// 4
#[test]
fn push_destination_adds_to_back() {
    let mut sim = build_sim();
    let elev = first_elevator(&sim);
    let s1 = sim.stop_entity(StopId(1)).unwrap();
    sim.push_destination(elev, s1).unwrap();
    assert_eq!(sim.destination_queue(elev).unwrap(), &[s1]);
}

// 5
#[test]
fn push_destination_adjacent_dedup_back() {
    let mut sim = build_sim();
    let elev = first_elevator(&sim);
    let s1 = sim.stop_entity(StopId(1)).unwrap();
    sim.push_destination(elev, s1).unwrap();
    sim.push_destination(elev, s1).unwrap();
    assert_eq!(sim.destination_queue(elev).unwrap(), &[s1]);
}

// 6
#[test]
fn push_destination_front_inserts_at_index_0() {
    let mut sim = build_sim();
    let elev = first_elevator(&sim);
    let s1 = sim.stop_entity(StopId(1)).unwrap();
    let s2 = sim.stop_entity(StopId(2)).unwrap();
    sim.push_destination(elev, s1).unwrap();
    sim.push_destination_front(elev, s2).unwrap();
    assert_eq!(sim.destination_queue(elev).unwrap(), &[s2, s1]);
}

// 7
#[test]
fn push_destination_front_adjacent_dedup() {
    let mut sim = build_sim();
    let elev = first_elevator(&sim);
    let s1 = sim.stop_entity(StopId(1)).unwrap();
    sim.push_destination_front(elev, s1).unwrap();
    sim.push_destination_front(elev, s1).unwrap();
    assert_eq!(sim.destination_queue(elev).unwrap(), &[s1]);
}

// 8
#[test]
fn clear_destinations_empties_queue() {
    let mut sim = build_sim();
    let elev = first_elevator(&sim);
    let s0 = sim.stop_entity(StopId(0)).unwrap();
    let s1 = sim.stop_entity(StopId(1)).unwrap();
    let s2 = sim.stop_entity(StopId(2)).unwrap();
    sim.push_destination(elev, s1).unwrap();
    sim.push_destination(elev, s2).unwrap();
    sim.push_destination(elev, s0).unwrap();
    sim.clear_destinations(elev).unwrap();
    assert!(sim.destination_queue(elev).unwrap().is_empty());
}

// 9
#[test]
fn imperative_push_drives_elevator() {
    let mut sim = build_sim();
    let elev = first_elevator(&sim);
    let s2 = sim.stop_entity(StopId(2)).unwrap();
    sim.push_destination(elev, s2).unwrap();

    let mut arrived = false;
    for _ in 0..2000 {
        sim.step();
        for ev in sim.drain_events() {
            if let Event::ElevatorArrived {
                elevator, at_stop, ..
            } = ev
            {
                if elevator == elev && at_stop == s2 {
                    arrived = true;
                }
            }
        }
        if arrived {
            break;
        }
    }
    assert!(
        arrived,
        "elevator should have arrived at stop 2 via imperative queue"
    );
}

// 10
#[test]
fn push_front_overrides_current_target() {
    let mut sim = build_sim();
    let elev = first_elevator(&sim);
    let s1 = sim.stop_entity(StopId(1)).unwrap();
    let s2 = sim.stop_entity(StopId(2)).unwrap();

    // First put s2 on the queue and get the elevator moving toward it.
    sim.push_destination(elev, s2).unwrap();
    sim.step(); // AdvanceQueue sets target to s2
    sim.step();

    // Now override: put s1 at the front.
    sim.push_destination_front(elev, s1).unwrap();

    let mut arrived_at = None;
    for _ in 0..2000 {
        sim.step();
        for ev in sim.drain_events() {
            if let Event::ElevatorArrived {
                elevator, at_stop, ..
            } = ev
            {
                if elevator == elev {
                    arrived_at = Some(at_stop);
                    break;
                }
            }
        }
        if arrived_at.is_some() {
            break;
        }
    }
    assert_eq!(
        arrived_at,
        Some(s1),
        "elevator should arrive at s1 first after push_front"
    );
}

// 11
#[test]
fn destination_queued_event_fires_on_push() {
    let mut sim = build_sim();
    let elev = first_elevator(&sim);
    let s2 = sim.stop_entity(StopId(2)).unwrap();

    // One push via sim helper (top stop — elevator is at stop 0).
    sim.push_destination(elev, s2).unwrap();
    // Second push via dispatch: rider at stop 1 triggers a GoToStop(s1) push.
    sim.spawn_rider_by_stop_id(StopId(1), StopId(2), 75.0)
        .unwrap();
    sim.step();

    let events = sim.drain_events();
    let count = events
        .iter()
        .filter(|e| matches!(e, Event::DestinationQueued { .. }))
        .count();
    // One from direct push (s2) + one from dispatch (s1).
    assert!(
        count >= 2,
        "expected at least 2 DestinationQueued events, got {count}"
    );
}

// 12
#[test]
fn destination_queued_event_suppressed_on_dedup() {
    let mut sim = build_sim();
    let elev = first_elevator(&sim);
    let s1 = sim.stop_entity(StopId(1)).unwrap();

    sim.push_destination(elev, s1).unwrap();
    sim.push_destination(elev, s1).unwrap(); // dedup

    let events = sim.drain_events();
    let count = events
        .iter()
        .filter(|e| matches!(e, Event::DestinationQueued { .. }))
        .count();
    assert_eq!(count, 1);
}

// 13
#[test]
fn snapshot_roundtrip_preserves_queue() {
    let mut sim = build_sim();
    let elev = first_elevator(&sim);
    let s0 = sim.stop_entity(StopId(0)).unwrap();
    let s1 = sim.stop_entity(StopId(1)).unwrap();
    let s2 = sim.stop_entity(StopId(2)).unwrap();

    sim.push_destination(elev, s1).unwrap();
    sim.push_destination(elev, s2).unwrap();
    sim.push_destination(elev, s0).unwrap();

    let snapshot = sim.snapshot();
    let restored = snapshot.restore(None);
    let new_elev = restored.world().elevator_ids()[0];

    let restored_queue = restored.destination_queue(new_elev).unwrap();
    assert_eq!(restored_queue.len(), 3);
}

// 14
#[test]
fn push_destination_errors_on_non_elevator() {
    let mut sim = build_sim();
    let s1 = sim.stop_entity(StopId(1)).unwrap();
    // Spawn a rider entity — not an elevator.
    let rider = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(2), 75.0)
        .unwrap();
    let result = sim.push_destination(rider, s1);
    assert!(result.is_err());
}

// 15
#[test]
fn push_destination_errors_on_non_stop() {
    let mut sim = build_sim();
    let elev = first_elevator(&sim);
    // Use the elevator entity as the target — not a stop.
    let result = sim.push_destination(elev, elev);
    assert!(result.is_err());
}
