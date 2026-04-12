//! Tests that verify event payloads contain correct data.

use crate::components::RiderPhase;
use crate::dispatch::scan::ScanDispatch;
use crate::events::Event;
use crate::sim::Simulation;
use crate::stop::StopId;
use crate::tests::helpers::default_config;

#[test]
fn rider_boarded_event_has_correct_elevator() {
    let config = default_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();
    let rider = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();

    // Run until we get a RiderBoarded event.
    let mut boarded_event = None;
    for _ in 0..500 {
        sim.step();
        let events = sim.drain_events();
        for e in &events {
            if let Event::RiderBoarded {
                rider: r, elevator, ..
            } = e
            {
                if *r == rider {
                    boarded_event = Some(*elevator);
                }
            }
        }
        if boarded_event.is_some() {
            break;
        }
    }

    let elevator_id = boarded_event.expect("should have received RiderBoarded event");

    // Verify the rider is riding (or has already ridden) this elevator.
    // By the time we drain the event the rider may have progressed past Riding.
    let rider_data = sim.world().rider(rider).expect("rider should exist");
    let phase_ok = matches!(
        rider_data.phase,
        RiderPhase::Boarding(e) | RiderPhase::Riding(e) | RiderPhase::Alighting(e) if e == elevator_id
    ) || rider_data.phase == RiderPhase::Arrived;
    assert!(
        phase_ok,
        "rider should be boarding/riding/alighting/arrived, got {:?}",
        rider_data.phase,
    );
}

#[test]
fn rider_alighted_event_has_correct_stop() {
    let config = default_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();
    let _rider = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();

    // Run until we get a RiderAlighted event.
    let mut alighted_event = None;
    for _ in 0..2000 {
        sim.step();
        let events = sim.drain_events();
        for e in &events {
            if let Event::RiderAlighted { stop, .. } = e {
                alighted_event = Some(*stop);
            }
        }
        if alighted_event.is_some() {
            break;
        }
    }

    let stop_id = alighted_event.expect("should have received RiderAlighted event");

    // Verify the stop entity actually exists.
    let stop = sim.world().stop(stop_id);
    assert!(stop.is_some(), "alighted stop entity should exist");
}

/// Extract the tick from an event, if it has one.
fn event_tick(e: &Event) -> Option<u64> {
    #[allow(unreachable_patterns)]
    match e {
        Event::ElevatorDeparted { tick, .. }
        | Event::ElevatorArrived { tick, .. }
        | Event::DoorOpened { tick, .. }
        | Event::DoorClosed { tick, .. }
        | Event::PassingFloor { tick, .. }
        | Event::RiderSpawned { tick, .. }
        | Event::RiderBoarded { tick, .. }
        | Event::RiderAlighted { tick, .. }
        | Event::RiderRejected { tick, .. }
        | Event::RiderAbandoned { tick, .. }
        | Event::RiderEjected { tick, .. }
        | Event::ElevatorAssigned { tick, .. }
        | Event::StopAdded { tick, .. }
        | Event::ElevatorAdded { tick, .. }
        | Event::EntityDisabled { tick, .. }
        | Event::EntityEnabled { tick, .. }
        | Event::RouteInvalidated { tick, .. }
        | Event::RiderRerouted { tick, .. } => Some(*tick),
        _ => None,
    }
}

#[test]
fn event_ticks_are_monotonically_increasing() {
    let config = default_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    // Spawn riders to generate events.
    for _ in 0..3 {
        sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
            .unwrap();
    }

    let mut last_tick = 0u64;
    for _ in 0..500 {
        sim.step();
        let events = sim.drain_events();
        for e in &events {
            if let Some(tick) = event_tick(e) {
                assert!(
                    tick >= last_tick,
                    "event tick {tick} should be >= last tick {last_tick}"
                );
                last_tick = tick;
            }
        }
    }
}
