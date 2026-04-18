//! Tests for the direction-filter stall fix.
//!
//! A car carrying riders with downward destinations has direction
//! indicator Down. At a waypoint where a waiting rider wants Up, the
//! loading phase silently direction-filters the rider and no boarding
//! happens. Pre-fix, `pair_can_do_work` looked only at weight fit and
//! approved the pair — cost collapsed to 0 at the self-pair, the
//! Hungarian picked it every tick, doors cycled open → filter →
//! close forever, and aboard riders never reached their destinations.

use super::dispatch_tests::{spawn_elevator, test_group, test_world};
use crate::components::{ElevatorPhase, Route, Weight};
use crate::dispatch::etd::EtdDispatch;
use crate::dispatch::nearest_car::NearestCarDispatch;
use crate::dispatch::{self, DispatchDecision, DispatchManifest, DispatchStrategy, RiderInfo};

#[test]
fn etd_skips_pickup_whose_riders_are_all_direction_filtered() {
    let (mut world, stops) = test_world();
    // Car at stops[2] (pos 8), going down to serve an aboard rider
    // whose destination is stops[0] (pos 0).
    let elev = spawn_elevator(&mut world, 8.0);
    {
        let car = world.elevator_mut(elev).unwrap();
        car.going_up = false;
        car.going_down = true;
        car.phase = ElevatorPhase::MovingToStop(stops[0]);
    }
    let aboard = world.spawn();
    world.elevator_mut(elev).unwrap().riders.push(aboard);
    world.set_route(
        aboard,
        Route::direct(stops[3], stops[0], crate::ids::GroupId(0)),
    );

    let group = test_group(&stops, vec![elev]);
    let mut manifest = DispatchManifest::default();

    // A waiting rider at the car's current stop — but they want to go
    // *up* to stops[3] (pos 12). Direction-filter in loading will
    // reject their boarding while the car is committed downward.
    let up_waiter = world.spawn();
    manifest
        .waiting_at_stop
        .entry(stops[2])
        .or_default()
        .push(RiderInfo {
            id: up_waiter,
            destination: Some(stops[3]),
            weight: Weight::from(70.0),
            wait_ticks: 0,
        });
    // Aboard rider's own destination demand (mirrors what
    // `build_manifest` produces under normal operation).
    manifest
        .riding_to_stop
        .entry(stops[0])
        .or_default()
        .push(RiderInfo {
            id: aboard,
            destination: Some(stops[0]),
            weight: Weight::from(70.0),
            wait_ticks: 0,
        });

    let mut etd = EtdDispatch::new();
    etd.pre_dispatch(&group, &manifest, &mut world);
    let decisions = dispatch::assign(&mut etd, &[(elev, 8.0)], &group, &manifest, &world).decisions;
    assert_eq!(
        decisions[0].1,
        DispatchDecision::GoToStop(stops[0]),
        "car must continue to the aboard rider's destination, not self-assign to a \
         waypoint whose only waiting rider is direction-filtered"
    );
}

/// Same scenario on `NearestCar` — the `pair_can_do_work` guard is
/// shared, so the fix must apply uniformly.
#[test]
fn nearest_car_skips_pickup_whose_riders_are_all_direction_filtered() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 8.0);
    {
        let car = world.elevator_mut(elev).unwrap();
        car.going_up = false;
        car.going_down = true;
        car.phase = ElevatorPhase::MovingToStop(stops[0]);
    }
    let aboard = world.spawn();
    world.elevator_mut(elev).unwrap().riders.push(aboard);
    world.set_route(
        aboard,
        Route::direct(stops[3], stops[0], crate::ids::GroupId(0)),
    );

    let group = test_group(&stops, vec![elev]);
    let mut manifest = DispatchManifest::default();
    let up_waiter = world.spawn();
    manifest
        .waiting_at_stop
        .entry(stops[2])
        .or_default()
        .push(RiderInfo {
            id: up_waiter,
            destination: Some(stops[3]),
            weight: Weight::from(70.0),
            wait_ticks: 0,
        });
    manifest
        .riding_to_stop
        .entry(stops[0])
        .or_default()
        .push(RiderInfo {
            id: aboard,
            destination: Some(stops[0]),
            weight: Weight::from(70.0),
            wait_ticks: 0,
        });

    let mut nc = NearestCarDispatch::new();
    nc.pre_dispatch(&group, &manifest, &mut world);
    let decisions = dispatch::assign(&mut nc, &[(elev, 8.0)], &group, &manifest, &world).decisions;
    assert_eq!(
        decisions[0].1,
        DispatchDecision::GoToStop(stops[0]),
        "NearestCar must honor the direction filter too"
    );
}

/// Direction filter doesn't block riders going the same way as the car.
/// Regression guard against over-zealous filtering — a down-going car
/// at a waypoint must still consider a down-going waiting rider.
#[test]
fn pickup_of_matching_direction_rider_still_passes() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 8.0);
    {
        let car = world.elevator_mut(elev).unwrap();
        car.going_up = false;
        car.going_down = true;
        car.phase = ElevatorPhase::MovingToStop(stops[0]);
    }
    let aboard = world.spawn();
    world.elevator_mut(elev).unwrap().riders.push(aboard);
    world.set_route(
        aboard,
        Route::direct(stops[3], stops[0], crate::ids::GroupId(0)),
    );

    let group = test_group(&stops, vec![elev]);
    let mut manifest = DispatchManifest::default();
    let down_waiter = world.spawn();
    // Down-going waiting rider at the car's stop — direction matches,
    // board is allowed.
    manifest
        .waiting_at_stop
        .entry(stops[2])
        .or_default()
        .push(RiderInfo {
            id: down_waiter,
            destination: Some(stops[1]),
            weight: Weight::from(70.0),
            wait_ticks: 0,
        });
    manifest
        .riding_to_stop
        .entry(stops[0])
        .or_default()
        .push(RiderInfo {
            id: aboard,
            destination: Some(stops[0]),
            weight: Weight::from(70.0),
            wait_ticks: 0,
        });

    let mut etd = EtdDispatch::new();
    etd.pre_dispatch(&group, &manifest, &mut world);
    let decisions = dispatch::assign(&mut etd, &[(elev, 8.0)], &group, &manifest, &world).decisions;
    // With a valid same-direction waiter at the car's stop, ETD is
    // free to route either to the pickup or straight to the aboard
    // destination; either is correct. The invariant we pin here is
    // that the decision is *not* `Idle` — the pair must remain
    // serviceable, unlike the filtered case above.
    assert!(
        matches!(decisions[0].1, DispatchDecision::GoToStop(_)),
        "a same-direction waiter must not be spuriously filtered; got {:?}",
        decisions[0].1
    );
}

/// Stall class that slipped past #322: `has_demand(stop)` is true because
/// *another* car is mid-flight toward the stop with aboard riders whose
/// destination matches. The idle car parked at that stop had no waiters
/// to board and no aboard riders of its own to exit — yet the old
/// `waiting.is_empty() || ...` clause approved the pair, collapsing cost
/// to zero. Hungarian then picked the self-pair every tick, doors cycled
/// open/close indefinitely while the other car finished its trip, and
/// all the while the idle car was unavailable to serve real demand
/// elsewhere in the group.
#[test]
fn etd_skips_self_pair_when_only_demand_is_another_cars_riding() {
    let (mut world, stops) = test_world();
    // Car A: idle at stops[2] (pos 8), no riders, no direction commitment.
    let car_a = spawn_elevator(&mut world, 8.0);
    // Car B: moving up toward stops[2] with an aboard rider heading there.
    let car_b = spawn_elevator(&mut world, 0.0);
    {
        let b = world.elevator_mut(car_b).unwrap();
        b.going_up = true;
        b.going_down = false;
        b.phase = ElevatorPhase::MovingToStop(stops[2]);
    }
    let riding = world.spawn();
    world.elevator_mut(car_b).unwrap().riders.push(riding);
    world.set_route(
        riding,
        Route::direct(stops[0], stops[2], crate::ids::GroupId(0)),
    );

    let group = test_group(&stops, vec![car_a, car_b]);
    let mut manifest = DispatchManifest::default();
    // Only demand at stops[2] is Car B's aboard rider — no waiters, no
    // rider-less hall call. This mirrors what `build_manifest` produces
    // under normal operation for a group carrying in-flight demand.
    manifest
        .riding_to_stop
        .entry(stops[2])
        .or_default()
        .push(RiderInfo {
            id: riding,
            destination: Some(stops[2]),
            weight: Weight::from(70.0),
            wait_ticks: 0,
        });

    let mut etd = EtdDispatch::new();
    etd.pre_dispatch(&group, &manifest, &mut world);
    // Only Car A is in the idle pool — Car B is mid-flight with riders
    // and ineligible for dispatch reassignment. The assertion: A must
    // not be assigned to its own stop (the zero-cost self-pair trap).
    let decisions =
        dispatch::assign(&mut etd, &[(car_a, 8.0)], &group, &manifest, &world).decisions;
    assert_eq!(
        decisions[0].1,
        DispatchDecision::Idle,
        "idle car must not self-assign to a stop whose only demand is \
         another car's riding_to_stop — otherwise doors cycle at that \
         stop while the other car delivers"
    );
}

/// A rider-less hall call is real work for any car in the group — the
/// button is lit and someone needs a pickup, even though no rider entity
/// is attached (e.g., placed via `press_hall_button` directly, or the
/// riders were fulfilled/abandoned and the call wasn't cleared yet).
/// Guard against the fix being over-aggressive: the self-pair must still
/// be approved when a rider-less call is the demand source.
#[test]
fn etd_approves_self_pair_for_riderless_hall_call() {
    use crate::components::{CallDirection, HallCall};

    let (mut world, stops) = test_world();
    let car = spawn_elevator(&mut world, 8.0);
    let group = test_group(&stops, vec![car]);
    let mut manifest = DispatchManifest::default();
    // No waiters, no aboard riders — only a rider-less hall call at the
    // car's current stop.
    let mut call = HallCall::new(stops[2], CallDirection::Up, 0);
    call.pending_riders.clear();
    manifest
        .hall_calls_at_stop
        .entry(stops[2])
        .or_default()
        .push(call);

    let mut etd = EtdDispatch::new();
    etd.pre_dispatch(&group, &manifest, &mut world);
    let decisions = dispatch::assign(&mut etd, &[(car, 8.0)], &group, &manifest, &world).decisions;
    assert_eq!(
        decisions[0].1,
        DispatchDecision::GoToStop(stops[2]),
        "rider-less hall call is a valid reason to open doors — the \
         fix must not filter it out along with cross-car riding demand"
    );
}
