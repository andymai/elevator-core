//! Tests for the elevator direction indicator lamps (`going_up`/`going_down`).

use crate::components::{ElevatorPhase, RiderPhase};
use crate::events::Event;
use crate::sim::Simulation;
use crate::stop::StopId;

use super::helpers::{all_riders_arrived, default_config, scan};

/// Grab the first (and usually only) elevator in a sim.
fn first_elevator(sim: &Simulation) -> crate::entity::EntityId {
    sim.world().elevator_ids()[0]
}

#[test]
fn default_indicators_both_true() {
    let config = default_config();
    let sim = Simulation::new(&config, scan()).unwrap();
    let elev = first_elevator(&sim);

    assert_eq!(sim.elevator_going_up(elev), Some(true));
    assert_eq!(sim.elevator_going_down(elev), Some(true));
}

#[test]
fn dispatch_upward_sets_going_up_only() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();

    // Step until the elevator is moving upward.
    let elev = first_elevator(&sim);
    let mut saw_moving = false;
    for _ in 0..1_000 {
        sim.step();
        if let Some(car) = sim.world().elevator(elev)
            && matches!(car.phase(), ElevatorPhase::MovingToStop(_))
        {
            saw_moving = true;
            break;
        }
    }
    assert!(saw_moving, "elevator should start moving within 1000 ticks");
    assert_eq!(sim.elevator_going_up(elev), Some(true));
    assert_eq!(sim.elevator_going_down(elev), Some(false));
}

#[test]
fn dispatch_downward_sets_going_down_only() {
    // Start the elevator at the top (stop 2) and spawn a rider who wants to go down.
    let mut config = default_config();
    config.elevators[0].starting_stop = StopId(2);

    let mut sim = Simulation::new(&config, scan()).unwrap();
    sim.spawn_rider_by_stop_id(StopId(2), StopId(0), 70.0)
        .unwrap();

    let elev = first_elevator(&sim);
    let mut saw_moving = false;
    for _ in 0..1_000 {
        sim.step();
        if let Some(car) = sim.world().elevator(elev)
            && matches!(car.phase(), ElevatorPhase::MovingToStop(_))
        {
            saw_moving = true;
            break;
        }
    }
    assert!(saw_moving, "elevator should start moving within 1000 ticks");
    assert_eq!(sim.elevator_going_up(elev), Some(false));
    assert_eq!(sim.elevator_going_down(elev), Some(true));
}

#[test]
fn becoming_idle_resets_both_true() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();

    for _ in 0..10_000 {
        sim.step();
        if all_riders_arrived(&sim) {
            break;
        }
    }
    assert!(all_riders_arrived(&sim));

    // Step a few more ticks so dispatch runs with no pending work → Idle.
    for _ in 0..60 {
        sim.step();
    }

    let elev = first_elevator(&sim);
    assert_eq!(sim.elevator_going_up(elev), Some(true));
    assert_eq!(sim.elevator_going_down(elev), Some(true));
}

#[test]
fn direction_indicator_changed_event_fires_on_change() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();

    let mut all_events = Vec::new();
    for _ in 0..10_000 {
        sim.step();
        all_events.extend(sim.drain_events());
        if all_riders_arrived(&sim) {
            break;
        }
    }

    let changes: Vec<_> = all_events
        .iter()
        .filter_map(|e| match e {
            Event::DirectionIndicatorChanged {
                going_up,
                going_down,
                ..
            } => Some((*going_up, *going_down)),
            _ => None,
        })
        .collect();

    assert!(
        !changes.is_empty(),
        "expected at least one DirectionIndicatorChanged event"
    );
    // The first change should reflect the upward trip.
    assert_eq!(changes[0], (true, false));
}

#[test]
fn direction_indicator_event_does_not_spam() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();

    let mut all_events = Vec::new();
    for _ in 0..10_000 {
        sim.step();
        all_events.extend(sim.drain_events());
        if all_riders_arrived(&sim) {
            break;
        }
    }
    // A few extra ticks so we catch the Idle-reset.
    for _ in 0..60 {
        sim.step();
        all_events.extend(sim.drain_events());
    }

    let count = all_events
        .iter()
        .filter(|e| matches!(e, Event::DirectionIndicatorChanged { .. }))
        .count();

    assert!(
        count <= 4,
        "DirectionIndicatorChanged should fire at most a few times for a single trip, got {count}"
    );
}

#[test]
fn rider_going_up_skips_down_only_car() {
    // Scenario: car starts at top (stop 2), a rider at stop 2 wants to go to
    // stop 0 (down). When the car passes stop 1 on its way down, a rider at
    // stop 1 wanting to go up (stop 1 → stop 2) must NOT board during that
    // downward trip.
    let mut config = default_config();
    config.elevators[0].starting_stop = StopId(2);

    let mut sim = Simulation::new(&config, scan()).unwrap();
    let down_rider = sim
        .spawn_rider_by_stop_id(StopId(2), StopId(0), 70.0)
        .unwrap();
    let up_rider = sim
        .spawn_rider_by_stop_id(StopId(1), StopId(2), 70.0)
        .unwrap();

    let mut all_events = Vec::new();
    // Run until the downward rider arrives at stop 0.
    for _ in 0..20_000 {
        sim.step();
        all_events.extend(sim.drain_events());
        if sim.world().rider(down_rider).map(|r| r.phase) == Some(RiderPhase::Arrived) {
            break;
        }
    }
    assert_eq!(
        sim.world().rider(down_rider).map(|r| r.phase),
        Some(RiderPhase::Arrived)
    );

    // During the downward trip, the up-rider should NOT have boarded.
    let up_rider_boarded_during_down = all_events.iter().any(|e| {
        matches!(
            e,
            Event::RiderBoarded { rider, .. } if *rider == up_rider
        )
    });
    assert!(
        !up_rider_boarded_during_down,
        "rider going up must not board a car committed to a downward trip"
    );
    // And must not have been rejected either — just left waiting.
    let up_rider_rejected = all_events.iter().any(|e| {
        matches!(
            e,
            Event::RiderRejected { rider, .. } if *rider == up_rider
        )
    });
    assert!(
        !up_rider_rejected,
        "direction-filtered riders are not rejected, just left waiting"
    );

    // Now run until the up-rider arrives — the car should turn around and pick them up.
    for _ in 0..20_000 {
        sim.step();
        if sim.world().rider(up_rider).map(|r| r.phase) == Some(RiderPhase::Arrived) {
            break;
        }
    }
    assert_eq!(
        sim.world().rider(up_rider).map(|r| r.phase),
        Some(RiderPhase::Arrived),
        "up-rider should eventually be picked up on the return trip"
    );
}

#[test]
fn idle_car_boards_riders_either_direction() {
    // Elevator sits at stop 1 (the middle). A rider wanting to go up and a
    // rider wanting to go down both appear at stop 1 — an idle car
    // (indicators both true) should board whichever one dispatch picks first.
    let mut config = default_config();
    config.elevators[0].starting_stop = StopId(1);

    // First rider: up-bound.
    let mut sim = Simulation::new(&config, scan()).unwrap();
    let up_rider = sim
        .spawn_rider_by_stop_id(StopId(1), StopId(2), 70.0)
        .unwrap();
    for _ in 0..20_000 {
        sim.step();
        if sim.world().rider(up_rider).map(|r| r.phase) == Some(RiderPhase::Arrived) {
            break;
        }
    }
    assert_eq!(
        sim.world().rider(up_rider).map(|r| r.phase),
        Some(RiderPhase::Arrived)
    );

    // Second rider in the same sim: down-bound from the middle.
    // (Elevator is at stop 2 now; let it return to Idle first.)
    for _ in 0..60 {
        sim.step();
    }
    let down_rider = sim
        .spawn_rider_by_stop_id(StopId(1), StopId(0), 70.0)
        .unwrap();
    for _ in 0..20_000 {
        sim.step();
        if sim.world().rider(down_rider).map(|r| r.phase) == Some(RiderPhase::Arrived) {
            break;
        }
    }
    assert_eq!(
        sim.world().rider(down_rider).map(|r| r.phase),
        Some(RiderPhase::Arrived)
    );
}

#[test]
fn snapshot_roundtrip_preserves_indicators() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();

    let elev = first_elevator(&sim);

    // Step until indicators are (true, false) — upward-only.
    for _ in 0..1_000 {
        sim.step();
        if sim.elevator_going_up(elev) == Some(true) && sim.elevator_going_down(elev) == Some(false)
        {
            break;
        }
    }
    assert_eq!(sim.elevator_going_up(elev), Some(true));
    assert_eq!(sim.elevator_going_down(elev), Some(false));

    let snap = sim.snapshot();
    let restored = snap.restore(None);
    let restored_elev = restored.world().elevator_ids()[0];

    assert_eq!(restored.elevator_going_up(restored_elev), Some(true));
    assert_eq!(restored.elevator_going_down(restored_elev), Some(false));
}
