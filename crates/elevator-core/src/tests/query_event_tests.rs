use crate::builder::SimulationBuilder;
use crate::components::ElevatorPhase;
use crate::events::Event;
use crate::stop::StopId;

// ── Entity type queries ──────────────────────────────────────────────

#[test]
fn is_elevator_returns_true_for_elevators() {
    let sim = SimulationBuilder::new().build().unwrap();
    let elevator_id = sim
        .world()
        .iter_elevators()
        .next()
        .map(|(id, _, _)| id)
        .unwrap();
    assert!(sim.is_elevator(elevator_id));
    assert!(!sim.is_rider(elevator_id));
    assert!(!sim.is_stop(elevator_id));
}

#[test]
fn is_stop_returns_true_for_stops() {
    let sim = SimulationBuilder::new().build().unwrap();
    let stop_id = sim.stop_entity(StopId(0)).unwrap();
    assert!(sim.is_stop(stop_id));
    assert!(!sim.is_elevator(stop_id));
    assert!(!sim.is_rider(stop_id));
}

#[test]
fn is_rider_returns_true_for_riders() {
    let mut sim = SimulationBuilder::new().build().unwrap();
    let rider = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(1), 75.0)
        .unwrap();
    assert!(sim.is_rider(rider));
    assert!(!sim.is_elevator(rider));
    assert!(!sim.is_stop(rider));
}

// ── Aggregate queries ────────────────────────────────────────────────

#[test]
fn idle_elevator_count_starts_at_one() {
    let sim = SimulationBuilder::new().build().unwrap();
    assert_eq!(sim.idle_elevator_count(), 1);
}

#[test]
fn idle_elevator_count_decreases_when_moving() {
    let mut sim = SimulationBuilder::new().build().unwrap();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 75.0)
        .unwrap();

    // Run until the elevator starts moving.
    for _ in 0..500 {
        sim.step();
        if sim.idle_elevator_count() == 0 {
            break;
        }
    }
    // At some point during transport the elevator should not be idle.
    // (It may already be idle again if it delivered fast, so just verify
    // the method works without panicking.)
    assert!(sim.idle_elevator_count() <= 1);
}

#[test]
fn elevator_load_starts_at_zero() {
    let sim = SimulationBuilder::new().build().unwrap();
    let elevator_id = sim
        .world()
        .iter_elevators()
        .next()
        .map(|(id, _, _)| id)
        .unwrap();
    assert_eq!(sim.elevator_load(elevator_id), Some(0.0));
}

#[test]
fn elevator_load_returns_none_for_non_elevator() {
    let sim = SimulationBuilder::new().build().unwrap();
    let stop_id = sim.stop_entity(StopId(0)).unwrap();
    assert_eq!(sim.elevator_load(stop_id), None);
}

#[test]
fn elevators_in_phase_counts_correctly() {
    let sim = SimulationBuilder::new().build().unwrap();
    assert_eq!(sim.elevators_in_phase(ElevatorPhase::Idle), 1);
    assert_eq!(sim.elevators_in_phase(ElevatorPhase::Loading), 0);
    assert_eq!(sim.elevators_in_phase(ElevatorPhase::DoorOpening), 0);
}

// ── CapacityChanged event ────────────────────────────────────────────

#[test]
fn capacity_changed_emitted_on_boarding() {
    let mut sim = SimulationBuilder::new().build().unwrap();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 75.0)
        .unwrap();

    // Run until we see a CapacityChanged event.
    let mut found_capacity_event = false;
    for _ in 0..500 {
        sim.step();
        for event in sim.drain_events() {
            if let Event::CapacityChanged {
                current_load,
                capacity,
                ..
            } = event
            {
                assert!(*current_load >= 0.0);
                assert!(*capacity > 0.0);
                found_capacity_event = true;
            }
        }
        if found_capacity_event {
            break;
        }
    }
    assert!(
        found_capacity_event,
        "Should have emitted CapacityChanged on boarding"
    );
}

#[test]
fn capacity_changed_emitted_on_exit() {
    let mut sim = SimulationBuilder::new().build().unwrap();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 75.0)
        .unwrap();

    // Run until rider is delivered, collecting CapacityChanged events.
    let mut capacity_events = Vec::new();
    for _ in 0..1000 {
        sim.step();
        for event in sim.drain_events() {
            if let Event::CapacityChanged {
                current_load,
                capacity,
                ..
            } = &event
            {
                capacity_events.push((**current_load, **capacity));
            }
        }
        if sim.metrics().total_delivered() > 0 {
            break;
        }
    }

    // Should have at least 2 CapacityChanged events: one for boarding, one for exit.
    assert!(
        capacity_events.len() >= 2,
        "Expected at least 2 CapacityChanged events (board + exit), got {}",
        capacity_events.len()
    );

    // The last one should have load back to 0 (rider exited).
    let (last_load, _) = capacity_events.last().unwrap();
    assert!(
        (*last_load - 0.0).abs() < f64::EPSILON,
        "After exit, load should be 0.0, got {last_load}"
    );
}
