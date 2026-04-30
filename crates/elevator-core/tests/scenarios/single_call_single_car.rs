//! Regression test for the "all cars converge on one rider" bug.
//!
//! Before the fix: when a car arrived at a pickup stop, its phase
//! transitioned to `DoorOpening` (out of the dispatch pool). The rider
//! hadn't yet boarded — riders only transition `Waiting → Boarding`
//! in the Loading phase, one tick later — so
//! `DispatchManifest::has_demand` still flagged the stop as pending
//! and the next dispatch tick pulled a second car toward the same
//! call. With three cars and one rider, the visible result in the
//! playground was two or three cars converging on a single rider.
//!
//! The fix filters `pending_stops` inside `dispatch::assign` so a
//! stop is excluded when an elevator is already at it in any door
//! phase AND can absorb every waiting rider there. This test locks
//! in that invariant under the skyscraper-like setup (3 cars on a
//! 13-stop shaft with ETD) that surfaced the bug.

#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use elevator_core::components::{Accel, Route, Speed, Weight};
use elevator_core::dispatch::{
    BuiltinReposition, DispatchStrategy, EtdDispatch, LookDispatch, NearestCarDispatch,
    ScanDispatch,
};
use elevator_core::prelude::*;
use elevator_core::stop::StopConfig;

fn three_car_sim_with<D: DispatchStrategy + 'static>(dispatch: D) -> Simulation {
    let stops: Vec<StopConfig> = (0..13)
        .map(|i| StopConfig {
            id: StopId(i),
            name: format!("Floor {i}"),
            position: f64::from(i) * 4.0,
        })
        .collect();
    let elevators: Vec<ElevatorConfig> = [0u32, 6, 12]
        .into_iter()
        .enumerate()
        .map(|(idx, start)| ElevatorConfig {
            id: u32::try_from(idx).unwrap(),
            name: format!("Car {}", char::from(b'A' + u8::try_from(idx).unwrap())),
            max_speed: Speed::from(4.0),
            acceleration: Accel::from(2.0),
            deceleration: Accel::from(2.5),
            weight_capacity: Weight::from(1200.0),
            starting_stop: StopId(start),
            door_open_ticks: 300,
            door_transition_ticks: 72,
            ..ElevatorConfig::default()
        })
        .collect();
    let mut sim = SimulationBuilder::new()
        .stops(stops)
        .elevators(elevators)
        .dispatch(dispatch)
        .reposition(
            elevator_core::dispatch::reposition::SpreadEvenly,
            BuiltinReposition::SpreadEvenly,
        )
        .build()
        .unwrap();
    // Warm up so SpreadEvenly has a tick to settle any starting-position drift.
    for _ in 0..60 {
        sim.step();
    }
    sim
}

fn cars_targeting(sim: &Simulation, expected_stop: StopId) -> usize {
    let expected_eid = sim.stop_entity(expected_stop).unwrap();
    sim.world()
        .iter_elevators()
        .filter(|(_, _, car)| car.target_stop() == Some(expected_eid))
        .count()
}

/// Run the single-rider repro under `dispatch`, assert the invariant
/// (one car at a time targets the pickup) AND that the rider was
/// actually delivered — otherwise the invariant could pass vacuously
/// if the sim never progresses.
fn run_single_rider_invariant<D: DispatchStrategy + 'static>(dispatch: D, dispatch_label: &str) {
    let mut sim = three_car_sim_with(dispatch);
    sim.spawn_rider(StopId(5), StopId(10), 70.0).unwrap();

    let mut max_concurrent = 0;
    let mut delivered = false;
    // 5000 ticks = ~83 sim-seconds at 60 Hz. Generous enough for the
    // scenario's 300-tick door dwell + 72-tick transitions + ~5-stop
    // journey across every dispatch strategy.
    for _ in 0..5000 {
        sim.step();
        max_concurrent = max_concurrent.max(cars_targeting(&sim, StopId(5)));
        if sim
            .world()
            .iter_riders()
            .all(|(_, r)| r.phase() == RiderPhase::Arrived)
        {
            delivered = true;
            break;
        }
    }

    assert!(
        max_concurrent <= 1,
        "[{dispatch_label}] at most one car should ever target the single-rider pickup stop at the same time; saw {max_concurrent}"
    );
    assert!(
        delivered,
        "[{dispatch_label}] rider should have been delivered within the tick budget — a vacuous pass would hide a regression that stalls the sim entirely"
    );
}

#[test]
fn single_rider_pulls_exactly_one_car_under_etd() {
    run_single_rider_invariant(EtdDispatch::new(), "ETD");
}

#[test]
fn single_rider_pulls_exactly_one_car_under_scan() {
    run_single_rider_invariant(ScanDispatch::new(), "SCAN");
}

#[test]
fn single_rider_pulls_exactly_one_car_under_look() {
    run_single_rider_invariant(LookDispatch::new(), "LOOK");
}

#[test]
fn single_rider_pulls_exactly_one_car_under_nearest() {
    run_single_rider_invariant(NearestCarDispatch::new(), "NEAREST");
}

/// Capacity overflow: spawn more weight than one car can hold at a
/// single stop. Coverage should fail (demand not absorbed), so a
/// second car gets dispatched to clear the excess — without this the
/// spillover riders would sit through an unnecessary door-cycle
/// roundtrip waiting for the first car to depart.
fn burst_invariant<D: DispatchStrategy + 'static>(dispatch: D, label: &str) {
    let mut sim = three_car_sim_with(dispatch);
    // 1200 kg capacity; 20 × 70 kg = 1400 kg total weight spawned at floor 5.
    for _ in 0..20 {
        sim.spawn_rider(StopId(5), StopId(10), 70.0).unwrap();
    }

    // Walk forward until one car reaches floor 5 in a door phase AND
    // a second car is en-route to the same stop. Capacity-gap fix
    // keeps floor 5 in pending for the excess weight.
    let floor5 = sim.stop_entity(StopId(5)).unwrap();
    let mut saw_two_targeting = false;
    for _ in 0..5000 {
        sim.step();
        let door_cycling = sim.world().iter_elevators().any(|(_, _, c)| {
            matches!(
                c.phase(),
                ElevatorPhase::DoorOpening | ElevatorPhase::Loading | ElevatorPhase::DoorClosing
            ) && c.target_stop() == Some(floor5)
        });
        let targeting = sim
            .world()
            .iter_elevators()
            .filter(|(_, _, c)| c.target_stop() == Some(floor5))
            .count();
        if door_cycling && targeting >= 2 {
            saw_two_targeting = true;
            break;
        }
    }
    assert!(
        saw_two_targeting,
        "[{label}] with 1400 kg of demand at a 1200 kg-capacity stop, a second car should target the same stop during the first car's door cycle"
    );
}

#[test]
fn burst_exceeding_capacity_dispatches_a_second_car_under_etd() {
    burst_invariant(EtdDispatch::new(), "ETD");
}

#[test]
fn burst_exceeding_capacity_dispatches_a_second_car_under_nearest() {
    burst_invariant(NearestCarDispatch::new(), "NEAREST");
}

/// Build a twin-shaft sim (one car per shaft, 2 stops, SCAN).
fn twin_shaft_sim() -> Simulation {
    use elevator_core::components::Orientation;
    use elevator_core::config::{
        BuildingConfig, GroupConfig, LineConfig, PassengerSpawnConfig, SimulationParams,
    };
    use elevator_core::dispatch::BuiltinStrategy;

    let car = |id: u32, name: &str| ElevatorConfig {
        id,
        name: name.into(),
        max_speed: Speed::from(2.0),
        acceleration: Accel::from(1.5),
        deceleration: Accel::from(2.0),
        weight_capacity: Weight::from(800.0),
        starting_stop: StopId(0),
        door_open_ticks: 30,
        door_transition_ticks: 10,
        ..ElevatorConfig::default()
    };
    let line = |id: u32, name: &str, car: ElevatorConfig| LineConfig {
        id,
        name: name.into(),
        serves: vec![StopId(0), StopId(1)],
        elevators: vec![car],
        orientation: Orientation::Vertical,
        position: None,
        min_position: None,
        max_position: None,
        max_cars: None,
    };
    let config = SimConfig {
        building: BuildingConfig {
            name: "Twin Shaft".into(),
            stops: vec![
                StopConfig {
                    id: StopId(0),
                    name: "Lobby".into(),
                    position: 0.0,
                },
                StopConfig {
                    id: StopId(1),
                    name: "Sky".into(),
                    position: 20.0,
                },
            ],
            lines: Some(vec![
                line(1, "Shaft A", car(1, "A")),
                line(2, "Shaft B", car(2, "B")),
            ]),
            groups: Some(vec![GroupConfig {
                id: 0,
                name: "All Shafts".into(),
                lines: vec![1, 2],
                dispatch: BuiltinStrategy::Scan,
                reposition: None,
                hall_call_mode: None,
                ack_latency_ticks: None,
            }]),
        },
        elevators: vec![],
        simulation: SimulationParams {
            ticks_per_second: 60.0,
        },
        passenger_spawning: PassengerSpawnConfig {
            mean_interval_ticks: 120,
            weight_range: (50.0, 100.0),
        },
    };
    Simulation::new(&config, ScanDispatch::new()).unwrap()
}

/// Line-pinning: two shafts, rider pinned to Shaft B. When Shaft A's
/// car happens to be door-cycling at the pickup stop, the filter must
/// NOT treat the stop as covered (Shaft A can't absorb a Shaft-B-
/// pinned rider). The correct car on Shaft B must still be dispatched
/// so the rider eventually boards it — not Shaft A.
///
/// Exercises the `TransportMode::Line(required) != car_line` branch in
/// `is_covered` that the dispatch fix specifically introduced.
#[test]
fn line_pinned_rider_not_absorbed_by_other_shaft_door_cycle() {
    use elevator_core::components::{RouteLeg, TransportMode};
    use elevator_core::ids::GroupId;

    let mut sim = twin_shaft_sim();

    // Discover Shaft B's line entity by name so the rider's route
    // pins to it regardless of EntityId assignment order.
    let shaft_b_line = sim
        .lines_in_group(GroupId(0))
        .into_iter()
        .find(|&le| sim.world().line(le).is_some_and(|l| l.name() == "Shaft B"))
        .expect("Shaft B line should exist");
    let shaft_b_car = sim.elevators_on_line(shaft_b_line)[0];

    let lobby = sim.stop_entity(StopId(0)).unwrap();
    let sky = sim.stop_entity(StopId(1)).unwrap();
    let rider = sim
        .build_rider(lobby, sky)
        .unwrap()
        .weight(70.0)
        .route(Route {
            legs: vec![RouteLeg {
                from: lobby,
                to: sky,
                via: TransportMode::Line(shaft_b_line),
            }],
            current_leg: 0,
        })
        .spawn()
        .unwrap();

    let mut boarded_by = None;
    for _ in 0..3000 {
        sim.step();
        if let Some(r) = sim.world().rider(rider.entity())
            && let RiderPhase::Boarding(eid) | RiderPhase::Riding(eid) = r.phase()
        {
            boarded_by = Some(eid);
            break;
        }
    }
    assert_eq!(
        boarded_by,
        Some(shaft_b_car),
        "line-pinned rider must board Shaft B's car, never Shaft A's — `is_covered` must not mark the stop covered while the wrong-line car is door-cycling"
    );
}
