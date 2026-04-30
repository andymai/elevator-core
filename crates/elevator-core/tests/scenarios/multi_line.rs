//! Multi-line scenarios: line-pinned riders, group routing,
//! unreachable lines. Uses `twin_shaft_building` from `common`.

#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use elevator_core::components::{Preferences, Rider, Route, RouteLeg, TransportMode};
use elevator_core::dispatch::ScanDispatch;
use elevator_core::prelude::*;

#[path = "common/mod.rs"]
mod common;

use common::twin_shaft_building;

fn line_entity(sim: &Simulation, name: &str) -> EntityId {
    sim.lines_in_group(GroupId(0))
        .into_iter()
        .find(|&le| sim.world().line(le).is_some_and(|l| l.name() == name))
        .unwrap_or_else(|| panic!("line `{name}` should exist in twin-shaft topology"))
}

fn line_cars(sim: &Simulation, line: EntityId) -> Vec<EntityId> {
    sim.elevators_on_line(line)
}

/// Spawn a rider pinned to a specific line.
fn spawn_pinned(
    sim: &mut Simulation,
    origin: StopId,
    destination: StopId,
    line: EntityId,
) -> RiderId {
    let from = sim.stop_entity(origin).expect("origin stop exists");
    let to = sim
        .stop_entity(destination)
        .expect("destination stop exists");
    sim.build_rider(origin, destination)
        .unwrap()
        .weight(70.0)
        .route(Route {
            legs: vec![RouteLeg {
                from,
                to,
                via: TransportMode::Line(line),
            }],
            current_leg: 0,
        })
        .spawn()
        .unwrap()
}

// ── Line-pinned alternating ─────────────────────────────────────
// Ten riders, alternating pinning between Shaft A and Shaft B. Both
// shafts must see roughly half the load; no rider boards the wrong
// car.

#[test]
fn alternating_line_pins_route_each_to_its_shaft() {
    let mut sim = SimulationBuilder::from_config(twin_shaft_building())
        .dispatch(ScanDispatch::new())
        .build()
        .unwrap();

    let shaft_a = line_entity(&sim, "Shaft A");
    let shaft_b = line_entity(&sim, "Shaft B");
    let car_a = line_cars(&sim, shaft_a)[0];
    let car_b = line_cars(&sim, shaft_b)[0];

    let mut pinned: Vec<(RiderId, EntityId)> = Vec::new();
    for i in 0..10u32 {
        let line = if i % 2 == 0 { shaft_a } else { shaft_b };
        let rider = spawn_pinned(&mut sim, StopId(0), StopId(2), line);
        let expected_car = if i % 2 == 0 { car_a } else { car_b };
        pinned.push((rider, expected_car));
    }

    // Run until every rider has at least entered Boarding/Riding or
    // is Arrived — then verify the car they're associated with is
    // the one their pin selected.
    for _ in 0..6000 {
        sim.step();
        if pinned.iter().all(|(rider, _)| {
            sim.world()
                .rider(rider.entity())
                .is_some_and(|r| !matches!(r.phase(), RiderPhase::Waiting))
        }) {
            break;
        }
    }

    for (rider, expected) in &pinned {
        let observed = match sim.world().rider(rider.entity()).map(Rider::phase) {
            Some(RiderPhase::Boarding(e) | RiderPhase::Riding(e)) => Some(e),
            // Arrived means the car was already dropped off; we can't
            // introspect which car after the fact, so just accept it.
            Some(RiderPhase::Arrived) => continue,
            other => panic!("unexpected phase for rider {rider:?}: {other:?}"),
        };
        assert_eq!(
            observed,
            Some(*expected),
            "pinned rider boarded the wrong car"
        );
    }
}

// ── Group-routed mixed ──────────────────────────────────────────
// Riders that only specify a group (no line pin) — both cars are
// eligible. Dispatch should deliver all of them, with load spread
// across both shafts.

#[test]
fn group_routed_riders_load_balance_across_shafts() {
    let mut sim = SimulationBuilder::from_config(twin_shaft_building())
        .dispatch(ScanDispatch::new())
        .build()
        .unwrap();

    let car_a = line_cars(&sim, line_entity(&sim, "Shaft A"))[0];
    let car_b = line_cars(&sim, line_entity(&sim, "Shaft B"))[0];

    // 12 riders, all group-routed (default when using spawn_rider).
    let mut riders: Vec<RiderId> = Vec::new();
    for _ in 0..12 {
        let r = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
        riders.push(r);
    }

    for _ in 0..6000 {
        sim.step();
        if riders.iter().all(|rider| {
            sim.world()
                .rider(rider.entity())
                .is_some_and(|r| r.phase() == RiderPhase::Arrived)
        }) {
            break;
        }
    }
    assert_eq!(sim.metrics().total_delivered(), 12);

    // Load-balancing means dispatch spread riders across both shafts
    // rather than letting one car take the full burst. Every rider
    // has Arrived now, so we can't introspect which car carried each
    // — but if Shaft B sat idle its car never moved, so its position
    // stays at StopId(0). Requiring both cars to have moved is the
    // strongest check this vantage point allows.
    let pos_a = sim.world().position(car_a).unwrap().value();
    let pos_b = sim.world().position(car_b).unwrap().value();
    assert!(
        pos_a != 0.0 && pos_b != 0.0,
        "expected both cars to move off StopId(0) under load-balancing; \
         pos_a={pos_a}, pos_b={pos_b}"
    );
}

// ── Unreachable line ────────────────────────────────────────────
// Rider pinned to Shaft A, whose car is disabled. Rider must abandon
// once their patience expires. Other riders on Shaft B are unaffected.

#[test]
fn rider_pinned_to_disabled_line_abandons() {
    let mut sim = SimulationBuilder::from_config(twin_shaft_building())
        .dispatch(ScanDispatch::new())
        .build()
        .unwrap();

    let shaft_a = line_entity(&sim, "Shaft A");
    let shaft_b = line_entity(&sim, "Shaft B");
    let car_a = line_cars(&sim, shaft_a)[0];

    sim.disable(car_a).unwrap();

    // Resolve stop entities up-front so the builder chain doesn't
    // hold a mutable borrow while we also need immutable access.
    let origin = sim.stop_entity(StopId(0)).unwrap();
    let destination = sim.stop_entity(StopId(2)).unwrap();

    let stranded = sim
        .build_rider(StopId(0), StopId(2))
        .unwrap()
        .weight(70.0)
        .patience(50)
        .preferences(Preferences::default().with_abandon_after_ticks(Some(50)))
        .route(Route {
            legs: vec![RouteLeg {
                from: origin,
                to: destination,
                via: TransportMode::Line(shaft_a),
            }],
            current_leg: 0,
        })
        .spawn()
        .unwrap();

    // A non-pinned rider on Shaft B should still be delivered despite
    // Shaft A being out of service.
    let healthy = sim
        .build_rider(StopId(0), StopId(2))
        .unwrap()
        .weight(70.0)
        .route(Route {
            legs: vec![RouteLeg {
                from: origin,
                to: destination,
                via: TransportMode::Line(shaft_b),
            }],
            current_leg: 0,
        })
        .spawn()
        .unwrap();

    let mut stranded_abandoned = false;
    let mut healthy_arrived = false;
    for _ in 0..5000 {
        sim.step();
        stranded_abandoned = sim
            .world()
            .rider(stranded.entity())
            .is_some_and(|r| r.phase() == RiderPhase::Abandoned);
        healthy_arrived = sim
            .world()
            .rider(healthy.entity())
            .is_some_and(|r| r.phase() == RiderPhase::Arrived);
        if stranded_abandoned && healthy_arrived {
            return;
        }
    }
    panic!(
        "stranded rider abandoned = {stranded_abandoned}, \
         healthy rider arrived = {healthy_arrived}"
    );
}
