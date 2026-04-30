//! Service-mode scenarios: Independent, Inspection, Manual, toggle
//! mid-run. Drive the sim manually so we can call `set_service_mode`
//! between ticks — `ScenarioRunner` doesn't own mode transitions.

#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use elevator_core::components::{Rider, RiderPhase, ServiceMode};
use elevator_core::dispatch::{EtdDispatch, ScanDispatch};
use elevator_core::entity::EntityId;
use elevator_core::events::Event;
use elevator_core::prelude::*;

#[path = "common/mod.rs"]
mod common;

use common::{canonical_building, compact_building};

fn only_elevator(sim: &Simulation) -> EntityId {
    sim.world()
        .iter_elevators()
        .next()
        .map(|(id, _, _)| id)
        .expect("at least one elevator")
}

// ── Independent mid-run ─────────────────────────────────────────
// A rider spawned while the only car is in `Independent` must not be
// boarded until the car returns to `Normal`. Verifies dispatch respects
// the mode immediately (not after the next tick's pass).

#[test]
fn independent_mode_blocks_dispatch_until_restored() {
    let mut sim = SimulationBuilder::from_config(compact_building())
        .dispatch(EtdDispatch::new())
        .build()
        .unwrap();

    let car = only_elevator(&sim);
    sim.set_service_mode(car, ServiceMode::Independent).unwrap();

    let rider = sim
        .build_rider(StopId(0), StopId(2))
        .unwrap()
        .weight(70.0)
        .spawn()
        .unwrap();

    // 300 ticks with the car in Independent → rider still Waiting.
    for _ in 0..300 {
        sim.step();
    }
    let phase = sim.world().rider(rider.entity()).map(Rider::phase);
    assert_eq!(
        phase,
        Some(RiderPhase::Waiting),
        "Independent car should not have picked up the rider"
    );

    // Restore normal service; rider must be delivered within a
    // generous budget.
    sim.set_service_mode(car, ServiceMode::Normal).unwrap();
    for _ in 0..2000 {
        sim.step();
        if sim
            .world()
            .rider(rider.entity())
            .is_some_and(|r| r.phase() == RiderPhase::Arrived)
        {
            return;
        }
    }
    panic!("rider not delivered after restoring Normal service mode");
}

// ── Inspection slows the car ────────────────────────────────────
// Inspection caps max_speed at `inspection_speed_factor × max_speed`
// (default 0.25×) and holds doors open indefinitely once opened. The
// delivery-level assertion doesn't work because doors never close —
// compare raw travel distance over a fixed window before the car
// reaches a stop.

#[test]
fn inspection_mode_reduces_travel_speed() {
    fn distance_over(service_mode: ServiceMode, ticks: u64) -> f64 {
        let mut sim = SimulationBuilder::from_config(compact_building())
            .dispatch(EtdDispatch::new())
            .build()
            .unwrap();
        let car_entity = only_elevator(&sim);
        let car_id = ElevatorId::from(car_entity);
        sim.set_service_mode(car_entity, service_mode).unwrap();
        // Command the car directly so no rider/door cycle is needed.
        sim.push_destination(car_id, StopId(2)).unwrap();
        let start = sim.world().position(car_entity).unwrap().value();
        for _ in 0..ticks {
            sim.step();
        }
        sim.world().position(car_entity).unwrap().value() - start
    }

    // 200 ticks (~3.3s at 60 tps) is long enough that Normal has
    // finished its 1.3s acceleration ramp and is cruising, so the
    // ratio reflects steady-state `inspection_speed_factor` (0.25x)
    // rather than a ramp-phase artefact where both modes accelerate
    // at the same rate. Still short enough that Inspection hasn't
    // reached the destination.
    let normal = distance_over(ServiceMode::Normal, 200);
    let inspection = distance_over(ServiceMode::Inspection, 200);
    assert!(
        inspection > 0.0,
        "Inspection car should still move, just slower (got {inspection:.3})"
    );
    assert!(
        inspection < normal * 0.45,
        "Inspection distance ({inspection:.3}) should be well below half \
         of Normal ({normal:.3}); ratio = {:.2}",
        inspection / normal
    );
}

// ── Manual mode bypasses dispatch ───────────────────────────────
// A car in Manual isn't assigned by dispatch, so when it's the only
// car, hall calls go unserved. The rider must stay Waiting — a
// secondary Normal car would rescue them, but there isn't one.

#[test]
fn manual_mode_excludes_car_from_dispatch() {
    let mut sim = SimulationBuilder::from_config(compact_building())
        .dispatch(EtdDispatch::new())
        .build()
        .unwrap();

    let car = only_elevator(&sim);
    sim.set_service_mode(car, ServiceMode::Manual).unwrap();

    let rider = sim
        .build_rider(StopId(0), StopId(2))
        .unwrap()
        .weight(70.0)
        .spawn()
        .unwrap();

    for _ in 0..500 {
        sim.step();
    }

    let phase = sim.world().rider(rider.entity()).map(Rider::phase);
    assert_eq!(
        phase,
        Some(RiderPhase::Waiting),
        "Manual car must not be auto-assigned to a hall call"
    );
}

// ── Toggle mid-run ──────────────────────────────────────────────
// Normal → Independent → Normal over the span of a busy run. No
// riders are lost, metrics stay coherent, and `ServiceModeChanged`
// events fire exactly on the transitions we triggered.

#[test]
fn toggle_preserves_metrics_and_emits_events() {
    let mut sim = SimulationBuilder::from_config(canonical_building())
        .dispatch(ScanDispatch::new())
        .build()
        .unwrap();

    // Five riders split across two floors, both going up.
    for _ in 0..3 {
        sim.spawn_rider(StopId(0), StopId(8), 70.0).unwrap();
    }
    for _ in 0..2 {
        sim.spawn_rider(StopId(2), StopId(9), 70.0).unwrap();
    }

    // Collect all ServiceModeChanged events seen across the run.
    let mut observed_changes: Vec<(ServiceMode, ServiceMode)> = Vec::new();

    // Pick the middle car to toggle.
    let middle_car = sim
        .world()
        .iter_elevators()
        .nth(1)
        .map(|(id, _, _)| id)
        .expect("canonical_building has 3 cars");

    for tick in 0..4000 {
        sim.step();
        for ev in sim.drain_events() {
            if let Event::ServiceModeChanged { from, to, .. } = ev {
                observed_changes.push((from, to));
            }
        }
        if tick == 30 {
            sim.set_service_mode(middle_car, ServiceMode::Independent)
                .unwrap();
        }
        if tick == 120 {
            sim.set_service_mode(middle_car, ServiceMode::Normal)
                .unwrap();
        }
        if sim
            .world()
            .iter_riders()
            .all(|(_, r)| matches!(r.phase(), RiderPhase::Arrived | RiderPhase::Abandoned))
        {
            break;
        }
    }

    // All 5 delivered.
    assert_eq!(sim.metrics().total_delivered(), 5);
    assert_eq!(sim.metrics().total_abandoned(), 0);

    // Exactly two ServiceModeChanged events, in the right order.
    assert_eq!(
        observed_changes,
        vec![
            (ServiceMode::Normal, ServiceMode::Independent),
            (ServiceMode::Independent, ServiceMode::Normal),
        ],
        "expected the two deliberate transitions only; saw {observed_changes:?}"
    );
}

// ── Redundant set is a no-op ────────────────────────────────────
// Per `Simulation::set_service_mode` — repeating the current mode
// returns Ok but emits no event. Regression guard: if someone flips
// that to always-emit, this catches it.

#[test]
fn redundant_mode_set_emits_no_event() {
    let mut sim = SimulationBuilder::from_config(compact_building())
        .dispatch(EtdDispatch::new())
        .build()
        .unwrap();

    let car = only_elevator(&sim);
    // Already Normal by default; this is a no-op.
    sim.set_service_mode(car, ServiceMode::Normal).unwrap();

    let events: Vec<Event> = sim.drain_events();
    let mode_events = events
        .iter()
        .filter(|e| matches!(e, Event::ServiceModeChanged { .. }))
        .count();
    assert_eq!(
        mode_events, 0,
        "Setting the same mode must not emit an event"
    );
}
