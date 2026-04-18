//! Tests for the direction-dependent full-load bypass
//! (see `Elevator::bypass_load_up_pct` / `bypass_load_down_pct`).
//!
//! Commercial controllers skip hall-call pickups in the current travel
//! direction once the car exceeds a load threshold — typically ~80 %
//! going up, ~50 % going down (Otis Elevonic 411, patent US5490580A).
//! Aboard riders are still delivered; only pickup ranking is affected.

use super::dispatch_tests::{
    add_demand, decide_all, decide_one, spawn_elevator, test_group, test_world,
};
use crate::components::{ElevatorPhase, Route, Weight};
use crate::dispatch::etd::EtdDispatch;
use crate::dispatch::nearest_car::NearestCarDispatch;
use crate::dispatch::{DispatchDecision, DispatchManifest, RiderInfo};

#[test]
fn etd_upward_bypass_skips_pickup_above_threshold() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 0.0);
    {
        let car = world.elevator_mut(elev).unwrap();
        // Load the car to 90 % capacity and set an 80 % up-bypass threshold.
        car.current_load = Weight::from(car.weight_capacity.value() * 0.9);
        car.set_bypass_load_up_pct(Some(0.80));
        // The car is committed to travelling up (MovingToStop aimed at
        // a higher stop). Required so the bypass check can pick a direction.
        car.phase = ElevatorPhase::MovingToStop(stops[3]);
    }
    // An aboard rider bound for stops[3] keeps the car's ranks finite
    // for the exit stop and pins down the travel direction.
    let aboard = world.spawn();
    world.elevator_mut(elev).unwrap().riders.push(aboard);
    world.set_route(
        aboard,
        Route::direct(stops[0], stops[3], crate::ids::GroupId(0)),
    );

    let group = test_group(&stops, vec![elev]);
    let mut manifest = DispatchManifest::default();
    // Pickup stop between the car and the aboard rider's destination.
    add_demand(&mut manifest, &mut world, stops[1], 70.0);
    // Aboard-rider destination demand, as the production builder produces.
    manifest
        .riding_to_stop
        .entry(stops[3])
        .or_default()
        .push(RiderInfo {
            id: aboard,
            destination: Some(stops[3]),
            weight: Weight::from(70.0),
            wait_ticks: 0,
        });

    let mut etd = EtdDispatch::new();
    let decision = decide_one(&mut etd, elev, 0.0, &group, &manifest, &mut world);
    assert_eq!(
        decision,
        DispatchDecision::GoToStop(stops[3]),
        "a car above the up-bypass threshold must skip pickups and head to the aboard \
         rider's destination"
    );
}

#[test]
fn nearest_car_downward_bypass_skips_pickup_above_threshold() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 12.0);
    {
        let car = world.elevator_mut(elev).unwrap();
        car.current_load = Weight::from(car.weight_capacity.value() * 0.6);
        // Down-bypass at 50 % — 60 % load exceeds it, but up-bypass is
        // unset so an upward pickup would still be fair game.
        car.set_bypass_load_down_pct(Some(0.50));
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
    // Pickup below the car — same direction as travel, above threshold,
    // must be skipped.
    add_demand(&mut manifest, &mut world, stops[1], 70.0);
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
    let decision = decide_one(&mut nc, elev, 12.0, &group, &manifest, &mut world);
    assert_eq!(
        decision,
        DispatchDecision::GoToStop(stops[0]),
        "a downward-moving car above its down-bypass threshold must not detour for a pickup"
    );
}

#[test]
fn bypass_below_threshold_still_picks_up() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 0.0);
    {
        let car = world.elevator_mut(elev).unwrap();
        // Loaded only 50 %, threshold at 80 %: pickup allowed.
        car.current_load = Weight::from(car.weight_capacity.value() * 0.5);
        car.set_bypass_load_up_pct(Some(0.80));
        car.phase = ElevatorPhase::MovingToStop(stops[3]);
    }
    let aboard = world.spawn();
    world.elevator_mut(elev).unwrap().riders.push(aboard);
    world.set_route(
        aboard,
        Route::direct(stops[0], stops[3], crate::ids::GroupId(0)),
    );

    let group = test_group(&stops, vec![elev]);
    let mut manifest = DispatchManifest::default();
    add_demand(&mut manifest, &mut world, stops[1], 70.0);
    manifest
        .riding_to_stop
        .entry(stops[3])
        .or_default()
        .push(RiderInfo {
            id: aboard,
            destination: Some(stops[3]),
            weight: Weight::from(70.0),
            wait_ticks: 0,
        });

    let mut etd = EtdDispatch::new();
    let decisions = decide_all(&mut etd, &[(elev, 0.0)], &group, &manifest, &mut world);
    // On-the-way pickup is closer, so under a normal ETD rank the car
    // should visit it before continuing to the aboard destination.
    assert_eq!(
        decisions[0].1,
        DispatchDecision::GoToStop(stops[1]),
        "below-threshold car must still honor on-the-way pickups"
    );
}

#[test]
fn bypass_never_blocks_aboard_exit() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 0.0);
    {
        let car = world.elevator_mut(elev).unwrap();
        // Fully loaded, aggressive thresholds.
        car.current_load = car.weight_capacity;
        car.set_bypass_load_up_pct(Some(0.10));
        car.set_bypass_load_down_pct(Some(0.10));
        car.phase = ElevatorPhase::MovingToStop(stops[2]);
    }
    let aboard = world.spawn();
    world.elevator_mut(elev).unwrap().riders.push(aboard);
    world.set_route(
        aboard,
        Route::direct(stops[0], stops[2], crate::ids::GroupId(0)),
    );

    let group = test_group(&stops, vec![elev]);
    let mut manifest = DispatchManifest::default();
    manifest
        .riding_to_stop
        .entry(stops[2])
        .or_default()
        .push(RiderInfo {
            id: aboard,
            destination: Some(stops[2]),
            weight: Weight::from(70.0),
            wait_ticks: 0,
        });

    let mut etd = EtdDispatch::new();
    let decision = decide_one(&mut etd, elev, 0.0, &group, &manifest, &mut world);
    assert_eq!(
        decision,
        DispatchDecision::GoToStop(stops[2]),
        "bypass must never prevent the car from reaching an aboard rider's destination"
    );
}
