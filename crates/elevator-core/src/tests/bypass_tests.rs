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
use super::helpers::default_config;
use crate::components::{ElevatorPhase, Route, Weight};
use crate::dispatch::etd::EtdDispatch;
use crate::dispatch::nearest_car::NearestCarDispatch;
use crate::dispatch::{DispatchDecision, DispatchManifest, RiderInfo};
use crate::sim::Simulation;

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

/// Multi-car regression: per-car thresholds must be isolated. Car A
/// is above its up-bypass threshold, car B below — a pickup above
/// both must be ranked only by B, not silently by both. Without
/// per-car gating a refactor could make the bypass group-wide.
#[test]
fn bypass_is_per_car_not_group_wide() {
    let (mut world, stops) = test_world();
    let elev_full = spawn_elevator(&mut world, 0.0);
    let elev_empty = spawn_elevator(&mut world, 4.0);
    {
        let car = world.elevator_mut(elev_full).unwrap();
        car.current_load = Weight::from(car.weight_capacity.value() * 0.9);
        car.set_bypass_load_up_pct(Some(0.80));
        car.phase = ElevatorPhase::MovingToStop(stops[3]);
    }
    {
        let car = world.elevator_mut(elev_empty).unwrap();
        car.set_bypass_load_up_pct(Some(0.80));
        car.phase = ElevatorPhase::MovingToStop(stops[3]);
    }
    // Aboard rider on the loaded car to pin direction.
    let aboard = world.spawn();
    world.elevator_mut(elev_full).unwrap().riders.push(aboard);
    world.set_route(
        aboard,
        Route::direct(stops[0], stops[3], crate::ids::GroupId(0)),
    );

    let group = test_group(&stops, vec![elev_full, elev_empty]);
    let mut manifest = DispatchManifest::default();
    // Pickup above both cars — above the loaded car's threshold so
    // the loaded one bypasses, but the empty one must still take it.
    add_demand(&mut manifest, &mut world, stops[2], 70.0);
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
    let decisions = decide_all(
        &mut etd,
        &[(elev_full, 0.0), (elev_empty, 4.0)],
        &group,
        &manifest,
        &mut world,
    );
    let empty_dec = decisions.iter().find(|(e, _)| *e == elev_empty).unwrap();
    assert_eq!(
        empty_dec.1,
        DispatchDecision::GoToStop(stops[2]),
        "the below-threshold car must take the pickup even when a peer bypasses"
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

/// `(0.0, 1.0]` is the only valid range. Reject NaN / negative / zero
/// / >1 at construction time so the rank-time guard can trust the
/// stored threshold. Covers both directions — the validator is
/// symmetric, a regression touching only one branch should still fail.
#[test]
fn bypass_pct_out_of_range_rejected_at_construction() {
    for bad in [f64::NAN, -0.1, 0.0, 1.01, f64::INFINITY] {
        for (field_name, up, down) in [
            ("bypass_load_up_pct", Some(bad), None),
            ("bypass_load_down_pct", None, Some(bad)),
        ] {
            let mut config = default_config();
            config.elevators[0].bypass_load_up_pct = up;
            config.elevators[0].bypass_load_down_pct = down;
            let err = Simulation::new(&config, crate::dispatch::scan::ScanDispatch::new())
                .expect_err(&format!("Simulation::new must reject {field_name} = {bad}"));
            assert!(
                matches!(&err, crate::error::SimError::InvalidConfig { field, .. } if field.contains(field_name)),
                "expected InvalidConfig on {field_name} for {bad}, got {err:?}"
            );
        }
    }
}

#[test]
#[should_panic(expected = "wait_squared_weight must be finite and non-negative")]
fn etd_wait_squared_weight_rejects_nan() {
    let _ = EtdDispatch::new().with_wait_squared_weight(f64::NAN);
}

#[test]
#[should_panic(expected = "wait_squared_weight must be finite and non-negative")]
fn etd_wait_squared_weight_rejects_negative() {
    let _ = EtdDispatch::new().with_wait_squared_weight(-1.0);
}

#[test]
#[should_panic(expected = "PredictiveParking::with_window_ticks requires a positive window")]
fn predictive_parking_rejects_zero_window() {
    let _ = crate::dispatch::reposition::PredictiveParking::with_window_ticks(0);
}
