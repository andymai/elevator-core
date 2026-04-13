use crate::components::{RiderPhase, ServiceMode};
use crate::events::Event;
use crate::stop::StopId;

use super::helpers::{default_config, scan};

/// 1. Default mode is Normal -- dispatch assigns elevator, rider arrives.
#[test]
fn default_mode_is_normal() {
    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();

    let elev = sim.world().elevator_ids()[0];
    assert_eq!(sim.service_mode(elev), ServiceMode::Normal);

    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 75.0)
        .unwrap();

    for _ in 0..1000 {
        sim.step();
    }

    assert!(sim.metrics().total_delivered() > 0);
}

/// 2. Independent mode -- elevator excluded from dispatch, rider stays Waiting.
#[test]
fn independent_skips_dispatch() {
    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();

    let elev = sim.world().elevator_ids()[0];
    sim.set_service_mode(elev, ServiceMode::Independent)
        .unwrap();

    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 75.0)
        .unwrap();

    for _ in 0..500 {
        sim.step();
    }

    // Rider should still be waiting since the elevator is independent.
    let waiting: Vec<_> = sim
        .world()
        .iter_riders()
        .filter(|(_, r)| r.phase() == RiderPhase::Waiting)
        .collect();
    assert!(
        !waiting.is_empty(),
        "rider should still be waiting with Independent elevator"
    );
    assert_eq!(sim.metrics().total_delivered(), 0);
}

/// 3. Inspection mode -- reduced speed, travel time is significantly longer.
///
/// We measure movement time only (not door cycles) by switching to Inspection
/// mode after the elevator departs. The 0.25 speed factor means movement
/// takes roughly 4x longer.
#[test]
fn inspection_reduced_speed() {
    use crate::components::ElevatorPhase;

    // Helper: run a sim, spawn rider 0->2, switch to `mode` once elevator is moving,
    // return tick count when elevator arrives at stop 2.
    fn measure_travel(mode: ServiceMode) -> u64 {
        let config = default_config();
        let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();
        let elev = sim.world().elevator_ids()[0];

        sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 75.0)
            .unwrap();

        let mut mode_set = false;
        let mut depart_tick: Option<u64> = None;

        for _ in 0..10000 {
            sim.step();

            // Once the elevator starts moving, switch to the target mode.
            if !mode_set {
                let car = sim.world().elevator(elev).unwrap();
                if matches!(car.phase(), ElevatorPhase::MovingToStop(_)) {
                    sim.set_service_mode(elev, mode).unwrap();
                    mode_set = true;
                    depart_tick = Some(sim.current_tick());
                }
            }

            // Detect arrival at any stop while moving.
            if mode_set && depart_tick.is_some() {
                let car = sim.world().elevator(elev).unwrap();
                if !matches!(car.phase(), ElevatorPhase::MovingToStop(_))
                    && sim.current_tick() > depart_tick.unwrap()
                {
                    return sim.current_tick() - depart_tick.unwrap();
                }
            }
        }
        panic!("elevator never arrived in {mode} mode");
    }

    let normal_ticks = measure_travel(ServiceMode::Normal);
    let inspect_ticks = measure_travel(ServiceMode::Inspection);

    assert!(
        inspect_ticks > normal_ticks * 3,
        "inspection should be at least 3x slower: normal={normal_ticks}, inspection={inspect_ticks}"
    );
}

/// 4. Inspection mode -- doors hold open indefinitely.
#[test]
fn inspection_doors_hold_open() {
    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();

    let elev = sim.world().elevator_ids()[0];
    sim.set_service_mode(elev, ServiceMode::Inspection).unwrap();

    // Spawn a rider so the elevator gets dispatched and eventually opens doors.
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 75.0)
        .unwrap();

    // The elevator starts at stop 0, so dispatch should open doors immediately.
    // Run until doors are open.
    let mut doors_opened = false;
    for _ in 0..200 {
        sim.step();
        let car = sim.world().elevator(elev).unwrap();
        if car.door().is_open() {
            doors_opened = true;
            break;
        }
    }
    assert!(doors_opened, "doors should open at some point");

    // Now run many more ticks -- doors should stay open.
    // Normal door_open_ticks is 10, transition is 5, so 100 ticks is well past close time.
    for _ in 0..100 {
        sim.step();
    }

    let car = sim.world().elevator(elev).unwrap();
    assert!(
        car.door().is_open(),
        "doors should remain open in Inspection mode, but state is: {}",
        car.door()
    );
}

/// 5. ServiceModeChanged event is emitted on mode change.
#[test]
fn service_mode_changed_event() {
    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();

    let elev = sim.world().elevator_ids()[0];
    sim.drain_events(); // clear init events

    sim.set_service_mode(elev, ServiceMode::Independent)
        .unwrap();

    let events = sim.drain_events();
    let mode_events: Vec<_> = events
        .iter()
        .filter(|e| matches!(e, Event::ServiceModeChanged { .. }))
        .collect();

    assert_eq!(mode_events.len(), 1);
    match &mode_events[0] {
        Event::ServiceModeChanged {
            elevator, from, to, ..
        } => {
            assert_eq!(*elevator, elev);
            assert_eq!(*from, ServiceMode::Normal);
            assert_eq!(*to, ServiceMode::Independent);
        }
        _ => panic!("expected ServiceModeChanged"),
    }
}

/// 6. No-op mode change produces no event.
#[test]
fn noop_mode_change_no_event() {
    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();

    let elev = sim.world().elevator_ids()[0];
    sim.drain_events();

    // Set to Normal when already Normal.
    sim.set_service_mode(elev, ServiceMode::Normal).unwrap();

    let events = sim.drain_events();
    let mode_events: Vec<_> = events
        .iter()
        .filter(|e| matches!(e, Event::ServiceModeChanged { .. }))
        .collect();
    assert!(
        mode_events.is_empty(),
        "no event should be emitted for no-op mode change"
    );
}

/// 7. Independent mode excludes elevator from repositioning.
#[test]
fn independent_excluded_from_reposition() {
    use crate::builder::SimulationBuilder;
    use crate::dispatch::BuiltinReposition;
    use crate::dispatch::reposition::ReturnToLobby;
    use crate::stop::StopConfig;

    let mut sim = SimulationBuilder::new()
        .stops(vec![
            StopConfig {
                id: StopId(0),
                name: "Ground".into(),
                position: 0.0,
            },
            StopConfig {
                id: StopId(1),
                name: "Floor 2".into(),
                position: 10.0,
            },
            StopConfig {
                id: StopId(2),
                name: "Floor 3".into(),
                position: 20.0,
            },
        ])
        .reposition(ReturnToLobby::new(), BuiltinReposition::ReturnToLobby)
        .build()
        .unwrap();

    let elev = sim.world().elevator_ids()[0];

    // First, get the elevator to a non-lobby stop by sending a rider.
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 75.0)
        .unwrap();
    for _ in 0..1000 {
        sim.step();
    }
    assert!(sim.metrics().total_delivered() > 0);

    // Elevator should now be at or near stop 2 (or repositioning to lobby).
    // Set Independent mode.
    sim.set_service_mode(elev, ServiceMode::Independent)
        .unwrap();

    // Wait for any current movement to finish, then verify it stays put.
    // First, let current movement finish if any.
    for _ in 0..500 {
        sim.step();
    }

    let pos_before = sim.world().position(elev).unwrap().value;

    // Run more ticks -- elevator should not move since it's Independent.
    for _ in 0..500 {
        sim.step();
    }

    let pos_after = sim.world().position(elev).unwrap().value;
    let phase = sim.world().elevator(elev).unwrap().phase();

    // If the elevator is idle and independent, it should not have been repositioned.
    // It should stay at the same position.
    assert!(
        (pos_before - pos_after).abs() < 1e-9,
        "independent elevator should not be repositioned: before={pos_before}, after={pos_after}, phase={phase}"
    );
}
