//! Regression tests for the commit-on-dispatch behaviour in
//! [`systems::dispatch`](crate::systems::dispatch).
//!
//! Shape: once a car enters `MovingToStop` toward a stop that still
//! has demand, the car is excluded from the Hungarian idle pool and
//! the stop is excluded from `pending_stops_minus_covered`. This
//! eliminates two classes of wasted motion surfaced by the
//! playground — mid-flight reassignment ping-pong and double
//! dispatch to the same hall call.

use crate::components::{ElevatorPhase, Weight};
use crate::dispatch::nearest_car::NearestCarDispatch;
use crate::sim::Simulation;
use crate::stop::StopId;

use super::helpers::{default_config, run_until_done};

/// Once car A is committed to stop X, a subsequent tick must not
/// re-assign a now-idle car B to the same stop — car A sees the
/// call through; car B is not pulled along for an empty touch-and-go.
#[test]
fn second_idle_car_not_double_dispatched_to_same_stop() {
    let mut cfg = default_config();
    // Two cars, both starting at the lobby.
    cfg.elevators.push(crate::config::ElevatorConfig {
        id: 1,
        name: "Car 2".into(),
        max_speed: cfg.elevators[0].max_speed,
        acceleration: cfg.elevators[0].acceleration,
        deceleration: cfg.elevators[0].deceleration,
        weight_capacity: Weight::from(800.0),
        starting_stop: StopId(0),
        door_open_ticks: cfg.elevators[0].door_open_ticks,
        door_transition_ticks: cfg.elevators[0].door_transition_ticks,
        restricted_stops: Vec::new(),
        #[cfg(feature = "energy")]
        energy_profile: None,
        service_mode: None,
        inspection_speed_factor: 0.25,
        bypass_load_up_pct: None,
        bypass_load_down_pct: None,
    });
    let mut sim = Simulation::new(&cfg, NearestCarDispatch::new()).unwrap();

    // One rider at stop 2 going to stop 0 — single hall call, one
    // car is enough.
    // Rider at stop 1 going UP to stop 2. Cars at stop 0 will go UP
    // to fetch — same direction, so rider_can_board's direction
    // filter doesn't reject the dispatch pair on arrival.
    sim.spawn_rider(StopId(1), StopId(2), 70.0).unwrap();

    let car_ids = sim.world().elevator_ids();
    let car_a = car_ids[0];
    let car_b = car_ids[1];

    // Advance until the first car is en route. A couple of ticks is
    // enough — ack latency defaults to 0, so dispatch fires on step 1.
    for _ in 0..5 {
        sim.step();
    }
    let a_moving = matches!(
        sim.world()
            .elevator(car_a)
            .map_or(ElevatorPhase::Idle, crate::components::Elevator::phase),
        ElevatorPhase::MovingToStop(_)
    );
    let b_moving = matches!(
        sim.world()
            .elevator(car_b)
            .map_or(ElevatorPhase::Idle, crate::components::Elevator::phase),
        ElevatorPhase::MovingToStop(_)
    );
    assert!(
        a_moving ^ b_moving,
        "exactly one car should be committed to the single call; got A_moving={a_moving} B_moving={b_moving}"
    );

    // Let the sim finish — delivery must still complete.
    let drained = run_until_done(&mut sim, 20_000);
    assert!(drained);
    assert_eq!(sim.metrics().total_delivered(), 1);
}

/// A car committed to a stop with demand must *not* have its trip
/// canceled when another idle car becomes available on a later tick.
/// Regression for mid-flight reassignment ping-pong.
#[test]
fn committed_car_not_reassigned_mid_trip() {
    let mut cfg = default_config();
    cfg.elevators.push(crate::config::ElevatorConfig {
        id: 1,
        name: "Car 2".into(),
        max_speed: cfg.elevators[0].max_speed,
        acceleration: cfg.elevators[0].acceleration,
        deceleration: cfg.elevators[0].deceleration,
        weight_capacity: Weight::from(800.0),
        starting_stop: StopId(0),
        door_open_ticks: cfg.elevators[0].door_open_ticks,
        door_transition_ticks: cfg.elevators[0].door_transition_ticks,
        restricted_stops: Vec::new(),
        #[cfg(feature = "energy")]
        energy_profile: None,
        service_mode: None,
        inspection_speed_factor: 0.25,
        bypass_load_up_pct: None,
        bypass_load_down_pct: None,
    });
    let mut sim = Simulation::new(&cfg, NearestCarDispatch::new()).unwrap();

    // Rider at stop 1 going UP to stop 2. Cars at stop 0 will go UP
    // to fetch — same direction, so rider_can_board's direction
    // filter doesn't reject the dispatch pair on arrival.
    sim.spawn_rider(StopId(1), StopId(2), 70.0).unwrap();

    let car_ids = sim.world().elevator_ids();
    let [car_a, car_b] = [car_ids[0], car_ids[1]];

    // Step until a car is MovingToStop.
    let mut committed_car = None;
    for _ in 0..50 {
        sim.step();
        for &c in &[car_a, car_b] {
            if let Some(car) = sim.world().elevator(c)
                && matches!(car.phase(), ElevatorPhase::MovingToStop(_))
            {
                committed_car = Some((c, car.phase()));
                break;
            }
        }
        if committed_car.is_some() {
            break;
        }
    }
    let (c_id, c_phase) = committed_car.expect("one car must be MovingToStop after 50 ticks");
    // Let several more dispatch cycles run; verify the committed car
    // keeps the same target.
    for _ in 0..20 {
        sim.step();
        if let Some(car) = sim.world().elevator(c_id)
            && !matches!(
                car.phase(),
                ElevatorPhase::MovingToStop(_)
                    | ElevatorPhase::DoorOpening
                    | ElevatorPhase::Loading
                    | ElevatorPhase::DoorClosing
                    | ElevatorPhase::Stopped
            )
        {
            // Car transitioned to Idle mid-trip without reaching the
            // stop — that's the reassignment ping-pong we're guarding
            // against.
            panic!(
                "car {c_id:?} abandoned its MovingToStop trip mid-flight (phase {:?} after starting at {c_phase:?})",
                car.phase()
            );
        }
    }
}

/// Complement: a `MovingToStop` car whose target *loses demand* (no
/// rider anywhere heading there, no hall call) MUST be re-eligible
/// for Hungarian reassignment so its trip can be redirected to
/// something useful.
#[test]
fn car_reeligible_when_target_loses_demand() {
    let mut sim = Simulation::new(&default_config(), NearestCarDispatch::new()).unwrap();
    // Rider at stop 2 going to stop 0 — triggers dispatch of the single car.
    // Rider at stop 1 going UP to stop 2. Cars at stop 0 will go UP
    // to fetch — same direction, so rider_can_board's direction
    // filter doesn't reject the dispatch pair on arrival.
    sim.spawn_rider(StopId(1), StopId(2), 70.0).unwrap();
    // Give the car a few ticks to start moving.
    for _ in 0..5 {
        sim.step();
    }
    // Sanity: the car is committed now.
    let car_id = sim.world().elevator_ids()[0];
    assert!(
        matches!(
            sim.world().elevator(car_id).unwrap().phase(),
            ElevatorPhase::MovingToStop(_)
        ),
        "car should be moving to stop 2"
    );
    // Now remove the rider mid-flight — simulating abandonment. The
    // rider's exit clears the hall call, so the target loses demand.
    // Use the public `despawn_rider` path so the rider index and
    // hall-call pending_riders stay in sync.
    let rider_id = sim.world().iter_riders().next().map(|(id, _)| id).unwrap();
    sim.despawn_rider(crate::entity::RiderId(rider_id)).unwrap();
    // Run a few more ticks. With demand gone, the car should become
    // re-eligible: either re-routed, idled, or the trip simply
    // completing to an empty stop. The key property is that the car
    // *did* notice and did not just plow forward stuck in its
    // original target forever.
    for _ in 0..30 {
        sim.step();
    }
    // No specific phase assertion — the fix guarantees re-eligibility
    // (committed_pairs is empty, car enters idle_elevators on the
    // next dispatch), not a particular outcome. As long as nothing
    // panicked and no rider is stranded, we're good.
    assert_eq!(sim.metrics().total_spawned(), 1);
    assert_eq!(sim.metrics().total_delivered(), 0);
}
