//! Repro for "cars arrive at the top floor and don't pick up down-riders".
//!
//! The direction-indicator filter in `loading.rs` silently excludes
//! riders going the opposite direction from the car's lamps. On arrival
//! after an up-trip the lamps read `(up=true, down=false)`; a rider at
//! the penthouse waiting to go down is filtered out. The
//! `ResetIndicators` mechanism should relight both lamps when the car
//! is empty, letting the down-rider board on the next tick.

#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use elevator_core::components::{Accel, RiderPhase, Speed, Weight};
use elevator_core::config::{ElevatorConfig, SimConfig};
use elevator_core::dispatch::nearest_car::NearestCarDispatch;
use elevator_core::sim::Simulation;
use elevator_core::stop::{StopConfig, StopId};

fn tower_config(stops: u32, door_open_ticks: u32) -> SimConfig {
    multi_car_tower_config(stops, door_open_ticks, 1)
}

fn multi_car_tower_config(stops: u32, door_open_ticks: u32, cars: u32) -> SimConfig {
    let mut cfg = SimConfig::default();
    cfg.building.stops = (0..stops)
        .map(|i| StopConfig {
            id: StopId(i),
            name: format!("F{i}"),
            position: f64::from(i) * 4.0,
        })
        .collect();
    cfg.elevators = (0..cars)
        .map(|i| ElevatorConfig {
            id: i,
            name: format!("Car {}", char::from(b'A' + u8::try_from(i).unwrap())),
            max_speed: Speed::from(4.0),
            acceleration: Accel::from(2.0),
            deceleration: Accel::from(2.5),
            weight_capacity: Weight::from(1000.0),
            starting_stop: StopId(0),
            door_open_ticks,
            door_transition_ticks: 60,
            ..ElevatorConfig::default()
        })
        .collect();
    cfg
}

#[test]
fn down_rider_at_penthouse_boards_empty_arriving_car() {
    let cfg = tower_config(10, 300);
    let mut sim = Simulation::new(&cfg, NearestCarDispatch::new()).unwrap();

    let rider = sim.spawn_rider(StopId(9), StopId(0), 70.0).unwrap();

    for _ in 0..4000 {
        sim.step();
        if sim
            .world()
            .rider(rider.entity())
            .is_some_and(|r| matches!(r.phase(), RiderPhase::Arrived))
        {
            return;
        }
    }
    let r = sim.world().rider(rider.entity()).unwrap();
    panic!(
        "penthouse down-rider not delivered in 4000 ticks: phase={:?}",
        r.phase()
    );
}

/// Now the wrinkle the user is seeing in the playground: several riders
/// arrive together in one tick at the top, the car is mid-Loading with
/// others still aboard heading to other stops below. When the car
/// eventually empties, does `ResetIndicators` fire in time for all
/// down-riders to board before the doors close?
#[test]
fn multiple_down_riders_at_penthouse_all_board() {
    let cfg = tower_config(10, 300);
    let mut sim = Simulation::new(&cfg, NearestCarDispatch::new()).unwrap();

    // Five down-riders all waiting at the top simultaneously.
    let riders: Vec<_> = (0..5)
        .map(|_| sim.spawn_rider(StopId(9), StopId(0), 70.0).unwrap())
        .collect();

    for _ in 0..8000 {
        sim.step();
        let all_arrived = riders.iter().all(|r| {
            sim.world()
                .rider(r.entity())
                .is_some_and(|rider| matches!(rider.phase(), RiderPhase::Arrived))
        });
        if all_arrived {
            return;
        }
    }
    let phases: Vec<_> = riders
        .iter()
        .map(|r| {
            sim.world()
                .rider(r.entity())
                .map(elevator_core::components::Rider::phase)
        })
        .collect();
    panic!("not all penthouse down-riders delivered: phases={phases:?}");
}

/// **The actual playground bug.** A car arrives at the penthouse with
/// an aboard rider whose destination is somewhere below (car is
/// semantically going down, but the travel-leg direction is up).
/// Before the fix, `ResetIndicators` was suppressed by the non-empty
/// `car.riders`, leaving the lamps at `(up=true, down=false)`. Every
/// down-rider waiting at the penthouse was silently filtered out by
/// the direction filter.
///
/// Construction: a rider boarding at floor 2 bound for the lobby
/// (aboard, going down) stays aboard while the car is dispatched up
/// to the penthouse to pick up other down-riders. Arrival at the top
/// must relight `going_down` based on the aboard rider's destination,
/// so the waiting penthouse riders can board immediately.
#[test]
fn penthouse_boards_down_riders_when_aboard_rider_also_going_down() {
    use elevator_core::entity::ElevatorId;

    let cfg = tower_config(10, 300);
    let mut sim = Simulation::new(&cfg, NearestCarDispatch::new()).unwrap();

    // Rider A boards at floor 2, bound for the lobby.
    let rider_a = sim.spawn_rider(StopId(2), StopId(0), 70.0).unwrap();
    for _ in 0..600 {
        sim.step();
        if sim
            .world()
            .rider(rider_a.entity())
            .is_some_and(|r| matches!(r.phase(), RiderPhase::Riding(_)))
        {
            break;
        }
    }
    assert!(
        matches!(
            sim.world()
                .rider(rider_a.entity())
                .map(elevator_core::components::Rider::phase),
            Some(RiderPhase::Riding(_))
        ),
        "precondition: rider A must be aboard"
    );

    // Spawn penthouse down-riders.
    let penthouse_riders: Vec<_> = (0..3)
        .map(|_| sim.spawn_rider(StopId(9), StopId(0), 70.0).unwrap())
        .collect();

    // Force the car to detour up to the penthouse before dropping
    // rider A at the lobby.
    let car_ids = sim.world().elevator_ids();
    let car_id = car_ids[0];
    let penthouse = sim.stop_entity(StopId(9)).unwrap();
    sim.push_destination_front(ElevatorId::from(car_id), penthouse)
        .unwrap();

    // Tight assertion: by the time rider A is delivered to the lobby
    // (the single committed trip sequence penthouse → lobby), every
    // penthouse rider must have boarded that same trip. Without the
    // arrival-time indicator refresh, the filter rejects them while
    // A blocks ResetIndicators, so A arrives at the lobby alone and
    // the penthouse riders are still Waiting.
    for _ in 0..5000 {
        sim.step();
        let a_arrived = sim
            .world()
            .rider(rider_a.entity())
            .is_some_and(|r| matches!(r.phase(), RiderPhase::Arrived));
        if a_arrived {
            let still_waiting: Vec<_> = penthouse_riders
                .iter()
                .filter(|r| {
                    sim.world()
                        .rider(r.entity())
                        .is_some_and(|rider| matches!(rider.phase(), RiderPhase::Waiting))
                })
                .collect();
            assert!(
                still_waiting.is_empty(),
                "{} penthouse rider(s) were stranded on the first visit — the car arrived with \
                 aboard rider A, indicator filter rejected the down-riders, and A blocked \
                 ResetIndicators. Arrival must relight lamps from remaining work.",
                still_waiting.len()
            );
            return;
        }
    }
    panic!("rider A never reached the lobby in 5000 ticks — scenario broken");
}
