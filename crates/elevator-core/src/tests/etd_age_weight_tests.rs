//! Tests for [`crate::dispatch::etd::EtdDispatch::age_linear_weight`] —
//! the linear waiting-age fairness term (Lim 1983 / Barney–dos Santos
//! 1985 CGC). Mirrors the existing `wait_squared_weight` test shape in
//! [`super::etd_mutant_tests`] so the two fairness terms can be
//! diff-compared by reviewers.

use super::dispatch_tests::{decide_one, spawn_elevator, test_group, test_world};
use crate::components::Weight;
use crate::dispatch::etd::EtdDispatch;
use crate::dispatch::{DispatchDecision, DispatchManifest, RiderInfo};

/// All three constructors default `age_linear_weight` to `0.0`, keeping
/// ETD's pre-existing behaviour unchanged for callers that don't opt in.
#[test]
fn age_linear_weight_default_is_zero() {
    assert_eq!(EtdDispatch::new().age_linear_weight, 0.0);
    assert_eq!(EtdDispatch::with_delay_weight(1.5).age_linear_weight, 0.0);
    assert_eq!(
        EtdDispatch::with_weights(1.0, 1.0, 0.5).age_linear_weight,
        0.0
    );
}

/// With a positive `age_linear_weight`, two equidistant pickups break
/// the tie in favor of the stop hosting the older waiter. Counterpart
/// to `etd_squared_wait_prefers_older_waiting_rider` for the linear
/// fairness term.
#[test]
fn age_linear_weight_prefers_older_waiting_rider() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 4.0); // at stops[1] (pos 4)

    let group = test_group(&stops, vec![elev]);
    let mut manifest = DispatchManifest::default();
    // Stop at pos 0 — rider waiting 1000 ticks.
    let old_waiter = world.spawn();
    manifest
        .waiting_at_stop
        .entry(stops[0])
        .or_default()
        .push(RiderInfo {
            id: old_waiter,
            destination: None,
            weight: Weight::from(70.0),
            wait_ticks: 1000,
        });
    // Stop at pos 8 — rider waiting only 1 tick.
    let new_waiter = world.spawn();
    manifest
        .waiting_at_stop
        .entry(stops[2])
        .or_default()
        .push(RiderInfo {
            id: new_waiter,
            destination: None,
            weight: Weight::from(70.0),
            wait_ticks: 1,
        });

    let mut etd = EtdDispatch::new().with_age_linear_weight(1.0);
    let decision = decide_one(&mut etd, elev, 4.0, &group, &manifest, &mut world);
    assert_eq!(
        decision,
        DispatchDecision::GoToStop(stops[0]),
        "positive `age_linear_weight` must bias ETD toward the stop with an older waiter"
    );
}

/// A modest `age_linear_weight` must not flip travel-time dominance
/// when the far stop's extra wait isn't large enough to justify the
/// detour. Regression guard against too-aggressive bias scales.
/// Counterpart to `etd_squared_wait_does_not_override_travel_time`.
#[test]
fn age_linear_weight_does_not_override_travel_time() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 0.0);

    let group = test_group(&stops, vec![elev]);
    let mut manifest = DispatchManifest::default();
    let new_waiter = world.spawn();
    manifest
        .waiting_at_stop
        .entry(stops[1])
        .or_default()
        .push(RiderInfo {
            id: new_waiter,
            destination: None,
            weight: Weight::from(70.0),
            wait_ticks: 5,
        });
    let older = world.spawn();
    manifest
        .waiting_at_stop
        .entry(stops[3])
        .or_default()
        .push(RiderInfo {
            id: older,
            destination: None,
            weight: Weight::from(70.0),
            wait_ticks: 20,
        });

    let mut etd = EtdDispatch::new().with_age_linear_weight(0.001);
    let decision = decide_one(&mut etd, elev, 0.0, &group, &manifest, &mut world);
    assert_eq!(
        decision,
        DispatchDecision::GoToStop(stops[1]),
        "modest age_linear_weight must not reverse travel-time dominance"
    );
}

#[test]
#[should_panic(expected = "age_linear_weight must be finite and non-negative")]
fn age_linear_weight_rejects_nan() {
    let _ = EtdDispatch::new().with_age_linear_weight(f64::NAN);
}

#[test]
#[should_panic(expected = "age_linear_weight must be finite and non-negative")]
fn age_linear_weight_rejects_negative() {
    let _ = EtdDispatch::new().with_age_linear_weight(-1.0);
}
