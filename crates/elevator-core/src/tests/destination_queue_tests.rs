//! Tests for the per-elevator `DestinationQueue` component and its
//! imperative push/clear API.

use crate::builder::SimulationBuilder;
use crate::components::ElevatorPhase;
use crate::dispatch::scan::ScanDispatch;
use crate::entity::ElevatorId;
use crate::error::SimError;
use crate::events::Event;
use crate::stop::StopId;

use super::helpers::default_config;

fn build_sim() -> crate::sim::Simulation {
    SimulationBuilder::from_config(default_config())
        .dispatch(ScanDispatch::new())
        .build()
        .unwrap()
}

fn first_elevator(sim: &crate::sim::Simulation) -> crate::entity::ElevatorId {
    crate::entity::ElevatorId::from(sim.world().elevator_ids()[0])
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
    sim.spawn_rider(StopId(1), StopId(2), 75.0).unwrap();
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
    sim.spawn_rider(StopId(0), StopId(2), 75.0).unwrap();
    // Run enough ticks for the elevator to reach stop 2.
    for _ in 0..2000 {
        sim.step();
        let elev = first_elevator(&sim);
        let car = sim.world().elevator(elev.entity()).unwrap();
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
                && elevator == elev.entity()
                && at_stop == s2
            {
                arrived = true;
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
                && elevator == elev.entity()
            {
                arrived_at = Some(at_stop);
                break;
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
    sim.spawn_rider(StopId(1), StopId(2), 75.0).unwrap();
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
    let restored = snapshot.restore(None).unwrap();
    let new_elev = ElevatorId::from(restored.world().elevator_ids()[0]);

    let restored_queue = restored.destination_queue(new_elev).unwrap();
    assert_eq!(restored_queue.len(), 3);
}

// 14
#[test]
fn push_destination_errors_on_non_elevator() {
    let mut sim = build_sim();
    let s1 = sim.stop_entity(StopId(1)).unwrap();
    // Spawn a rider entity — not an elevator.
    let rider = sim.spawn_rider(StopId(0), StopId(2), 75.0).unwrap();
    let result = sim.push_destination(ElevatorId::from(rider.entity()), s1);
    assert!(matches!(result, Err(SimError::NotAnElevator(_))));
}

// 15
#[test]
fn push_destination_errors_on_non_stop() {
    let mut sim = build_sim();
    let elev = first_elevator(&sim);
    // Use the elevator entity as the target — not a stop.
    let result = sim.push_destination(elev, elev.entity());
    assert!(matches!(result, Err(SimError::NotAStop(_))));
}

// Regression for greptile P1: when `advance_queue` redirects a moving
// elevator via `push_destination_front`, the direction indicators used
// by loading.rs to gate boarding must be updated — otherwise downward
// riders get silently rejected by a physically-descending car still
// flagged as going up.
#[test]
fn redirect_via_push_front_updates_direction_indicators() {
    let mut sim = build_sim();
    let elev = first_elevator(&sim);

    // Dispatch sends the elevator upward toward stop 2.
    sim.spawn_rider(StopId(1), StopId(2), 75.0).unwrap();
    // Let dispatch push to the queue and the elevator begin moving up.
    for _ in 0..20 {
        sim.step();
        if matches!(
            sim.world()
                .elevator(elev.entity())
                .map(crate::components::Elevator::phase),
            Some(ElevatorPhase::MovingToStop(_))
        ) {
            break;
        }
    }
    assert_eq!(sim.elevator_going_up(elev), Some(true));
    assert_eq!(sim.elevator_going_down(elev), Some(false));

    // Game imperatively redirects to a stop below the current position.
    let stop_0 = sim.stop_entity(StopId(0)).unwrap();
    sim.push_destination_front(elev, stop_0).unwrap();
    // One step of advance_queue flips the target and must refresh the lamps.
    sim.step();

    assert_eq!(
        sim.elevator_going_up(elev),
        Some(false),
        "push_destination_front to a lower stop must clear going_up",
    );
    assert_eq!(sim.elevator_going_down(elev), Some(true));
}

// ── recall_to ──────────────────────────────────────────────────────

/// `recall_to` clears the queue and sets a single target.
#[test]
fn recall_to_clears_queue_and_sets_target() {
    let mut sim = SimulationBuilder::demo().build().unwrap();
    let elev = ElevatorId::from(sim.world().elevator_ids()[0]);

    // Queue a destination, then recall to the other stop.
    sim.push_destination(elev, StopId(1)).unwrap();
    sim.recall_to(elev, StopId(0)).unwrap();

    let q = sim.destination_queue(elev).unwrap();
    assert_eq!(q.len(), 1, "queue should contain only the recall target");
    assert_eq!(q[0], sim.stop_entity(StopId(0)).unwrap());
}

/// `recall_to` emits an `ElevatorRecalled` event.
#[test]
fn recall_to_emits_event() {
    let mut sim = SimulationBuilder::demo().build().unwrap();
    let elev = ElevatorId::from(sim.world().elevator_ids()[0]);
    sim.drain_events();

    sim.recall_to(elev, StopId(1)).unwrap();

    let recall_events: Vec<_> = sim
        .drain_events()
        .into_iter()
        .filter(|e| matches!(e, Event::ElevatorRecalled { .. }))
        .collect();
    assert_eq!(recall_events.len(), 1);
    if let Event::ElevatorRecalled {
        elevator, to_stop, ..
    } = &recall_events[0]
    {
        assert_eq!(*elevator, elev.entity());
        assert_eq!(*to_stop, sim.stop_entity(StopId(1)).unwrap());
    }
}

/// `recall_to` on an idle car at a different stop causes it to depart.
#[test]
fn recall_idle_car_to_distant_stop() {
    let mut sim = SimulationBuilder::demo().build().unwrap();
    let elev = ElevatorId::from(sim.world().elevator_ids()[0]);

    sim.recall_to(elev, StopId(1)).unwrap();

    let target_pos = sim
        .world()
        .stop(sim.stop_entity(StopId(1)).unwrap())
        .unwrap()
        .position();
    let mut arrived = false;
    for _ in 0..2000 {
        sim.step();
        let pos = sim.world().position(elev.entity()).unwrap().value;
        if (pos - target_pos).abs() < 0.01 {
            arrived = true;
            break;
        }
    }
    assert!(arrived, "car should have arrived at the recall stop");
}

/// `recall_to` on a car already at the recall stop triggers a door cycle.
#[test]
fn recall_to_current_stop_opens_doors() {
    let mut sim = SimulationBuilder::demo().build().unwrap();
    let elev = ElevatorId::from(sim.world().elevator_ids()[0]);

    // Car starts at stop 0 (default). Recall to stop 0.
    sim.recall_to(elev, StopId(0)).unwrap();

    // Track whether doors opened during the cycle.
    let mut saw_open = false;
    for _ in 0..30 {
        sim.step();
        let car = sim.world().elevator(elev.entity()).unwrap();
        if car.door().is_open() {
            saw_open = true;
            break;
        }
    }
    assert!(saw_open, "doors should open when recalled to current stop");
}

/// `recall_to` works on dispatch-excluded (`Independent`) cars.
#[test]
fn recall_works_on_independent_car() {
    let mut sim = SimulationBuilder::demo().build().unwrap();
    let elev = ElevatorId::from(sim.world().elevator_ids()[0]);

    sim.set_service_mode(elev.entity(), crate::components::ServiceMode::Independent)
        .unwrap();

    sim.recall_to(elev, StopId(1)).unwrap();

    let target_pos = sim
        .world()
        .stop(sim.stop_entity(StopId(1)).unwrap())
        .unwrap()
        .position();
    let mut arrived = false;
    for _ in 0..2000 {
        sim.step();
        let pos = sim.world().position(elev.entity()).unwrap().value;
        if (pos - target_pos).abs() < 0.01 {
            arrived = true;
            break;
        }
    }
    assert!(arrived, "Independent car should still respond to recall_to");
}

/// `recall_to` errors on invalid entities.
#[test]
fn recall_to_validates_entities() {
    let mut sim = SimulationBuilder::demo().build().unwrap();
    let elev = ElevatorId::from(sim.world().elevator_ids()[0]);
    let stop_entity = sim.stop_entity(StopId(0)).unwrap();

    // Not an elevator.
    assert!(matches!(
        sim.recall_to(ElevatorId::from(stop_entity), StopId(0)),
        Err(SimError::NotAnElevator(_))
    ));

    // Not a stop.
    assert!(sim.recall_to(elev, StopId(99)).is_err());
}

/// `recall_to` mid-flight redirects the car to the recall stop.
#[test]
fn recall_mid_flight_redirects() {
    let mut sim = SimulationBuilder::demo().build().unwrap();
    let elev = ElevatorId::from(sim.world().elevator_ids()[0]);

    // Send car toward stop 1.
    sim.push_destination(elev, StopId(1)).unwrap();

    // Wait until car is actually moving.
    for _ in 0..10 {
        sim.step();
        if sim
            .world()
            .elevator(elev.entity())
            .unwrap()
            .phase()
            .is_moving()
        {
            break;
        }
    }
    assert!(
        sim.world()
            .elevator(elev.entity())
            .unwrap()
            .phase()
            .is_moving(),
        "car should be in flight"
    );

    // Recall back to stop 0 mid-flight.
    sim.recall_to(elev, StopId(0)).unwrap();

    // Car should eventually return to stop 0.
    let stop0_pos = sim
        .world()
        .stop(sim.stop_entity(StopId(0)).unwrap())
        .unwrap()
        .position();
    let mut returned = false;
    for _ in 0..2000 {
        sim.step();
        let pos = sim.world().position(elev.entity()).unwrap().value;
        let phase = sim.world().elevator(elev.entity()).unwrap().phase();
        if (pos - stop0_pos).abs() < 0.01 && !phase.is_moving() {
            returned = true;
            break;
        }
    }
    assert!(
        returned,
        "car should return to stop 0 after mid-flight recall"
    );
}

/// Disabling a stop scrubs it from all elevator destination queues.
#[test]
fn disable_stop_scrubs_destination_queues() {
    let mut sim = build_sim();
    let elev = first_elevator(&sim);

    sim.push_destination(elev, StopId(1)).unwrap();
    sim.push_destination(elev, StopId(2)).unwrap();

    let stop1_entity = sim.stop_entity(StopId(1)).unwrap();
    sim.disable(stop1_entity).unwrap();

    let q = sim.destination_queue(elev).unwrap();
    assert!(
        !q.contains(&stop1_entity),
        "disabled stop should be scrubbed from destination queue"
    );
    assert_eq!(q.len(), 1, "only the non-disabled stop should remain");
}

/// Disabling a stop that a car is actively targeting resets the car to `Idle`.
#[test]
fn disable_stop_resets_inflight_car() {
    let mut sim = build_sim();
    let elev = first_elevator(&sim);

    // Send car toward stop 2.
    sim.push_destination(elev, StopId(2)).unwrap();

    // Advance until the car is in flight (target popped from queue).
    for _ in 0..10 {
        sim.step();
        if sim
            .world()
            .elevator(elev.entity())
            .unwrap()
            .phase()
            .is_moving()
        {
            break;
        }
    }
    assert!(
        sim.world()
            .elevator(elev.entity())
            .unwrap()
            .phase()
            .is_moving(),
        "car should be in flight"
    );

    // Disable the target stop while car is en route.
    let stop2_entity = sim.stop_entity(StopId(2)).unwrap();
    sim.disable(stop2_entity).unwrap();

    // Car should be reset to Idle — no longer targeting the disabled stop.
    let car = sim.world().elevator(elev.entity()).unwrap();
    assert_eq!(
        car.phase(),
        ElevatorPhase::Idle,
        "car targeting a disabled stop should be reset to Idle"
    );
    assert_eq!(
        car.target_stop(),
        None,
        "target_stop should be cleared for the disabled stop"
    );
}
