//! Behavioural tests for [`crate::dispatch::rsr::RsrDispatch`].
//!
//! Follows the `etd_mutant_tests` pattern: each term of the additive
//! cost stack gets a focused test that asserts the term's presence by
//! observing which elevator wins the Hungarian assignment.

use super::dispatch_tests::{
    add_demand, decide_all, decide_one, spawn_elevator, test_group, test_world,
};
use crate::components::{CarCall, ElevatorPhase, Route, Weight};
use crate::dispatch::rsr::RsrDispatch;
use crate::dispatch::{BuiltinStrategy, DispatchDecision, DispatchManifest, RiderInfo};
use crate::entity::EntityId;
use crate::ids::GroupId;

// ── Defaults ────────────────────────────────────────────────────────

#[test]
fn new_is_nearest_car_zero_baseline() {
    // eta_weight = 1.0, all penalties/bonuses disabled. With one car
    // and one stop, the car must go to the stop (no other options).
    // This contract is load-bearing for additive-composition tests
    // like `wrong_direction_penalty_steers_away_from_reversing_car`
    // which set weights via `new().with_*`.
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 0.0);
    let group = test_group(&stops, vec![elev]);
    let mut manifest = DispatchManifest::default();
    add_demand(&mut manifest, &mut world, stops[2], 70.0);

    let mut rsr = RsrDispatch::new();
    let decision = decide_one(&mut rsr, elev, 0.0, &group, &manifest, &mut world);
    assert_eq!(decision, DispatchDecision::GoToStop(stops[2]));

    // Field-level invariant: every penalty/bonus is off at `new()`.
    let baseline = RsrDispatch::new();
    assert_eq!(baseline.wrong_direction_penalty, 0.0);
    assert_eq!(baseline.coincident_car_call_bonus, 0.0);
    assert_eq!(baseline.load_penalty_coeff, 0.0);
    assert!((baseline.peak_direction_multiplier - 1.0).abs() < 1e-12);
    assert_eq!(baseline.age_linear_weight, 0.0);
}

/// `tuned()` and `Default::default()` ship the opinionated stack — every
/// term turned on with calibrated weights. This is what
/// [`BuiltinStrategy::Rsr.instantiate`] returns, so picking RSR in the
/// playground actually exercises RSR, not a `NearestCar` equivalent.
#[test]
fn tuned_turns_on_every_penalty_and_bonus() {
    let t = RsrDispatch::tuned();
    assert!(
        t.wrong_direction_penalty > 0.0,
        "wrong_direction_penalty must be active"
    );
    assert!(
        t.coincident_car_call_bonus > 0.0,
        "coincident_car_call_bonus must be active"
    );
    assert!(
        t.load_penalty_coeff > 0.0,
        "load_penalty_coeff must be active"
    );
    assert!(
        t.peak_direction_multiplier > 1.0,
        "peak_direction_multiplier must scale up during peaks"
    );
    assert!(
        t.age_linear_weight > 0.0,
        "age_linear_weight must be active so the max-wait tail stays bounded"
    );

    // `Default::default()` must equal `tuned()` — this ties the
    // Builtin-strategy dropdown to the tuned shape so nobody "fixes"
    // `default()` back to `new()` by accident.
    let d = RsrDispatch::default();
    assert_eq!(d.eta_weight, t.eta_weight);
    assert_eq!(d.wrong_direction_penalty, t.wrong_direction_penalty);
    assert_eq!(d.coincident_car_call_bonus, t.coincident_car_call_bonus);
    assert_eq!(d.load_penalty_coeff, t.load_penalty_coeff);
    assert_eq!(d.peak_direction_multiplier, t.peak_direction_multiplier);
    assert_eq!(d.age_linear_weight, t.age_linear_weight);
}

/// End-to-end effect of the tuned default: a committed-up car
/// refuses a below pickup when there's an idle alternative, even
/// without any manual `with_wrong_direction_penalty` call.
/// Pre-tuning, `RsrDispatch::default()` reduced to pure ETA and would
/// pick whichever car was closest — reproducing the "wrong direction
/// is free" bug in the out-of-the-box configuration.
#[test]
fn tuned_default_deflects_committed_car_from_backtrack_pickup() {
    let (mut world, stops) = test_world();
    let committed_up = spawn_elevator(&mut world, 6.0);
    let idle_far = spawn_elevator(&mut world, 16.0);
    world.elevator_mut(committed_up).unwrap().phase = ElevatorPhase::MovingToStop(stops[3]);

    let group = test_group(&stops, vec![committed_up, idle_far]);
    let mut manifest = DispatchManifest::default();
    add_demand(&mut manifest, &mut world, stops[0], 70.0);

    // Using `default()`, NOT `new().with_*` — the tuned wrong-direction
    // penalty must fire automatically.
    let mut rsr = RsrDispatch::default();
    let decisions = decide_all(
        &mut rsr,
        &[(committed_up, 6.0), (idle_far, 16.0)],
        &group,
        &manifest,
        &mut world,
    );
    let idle_dec = decisions.iter().find(|(e, _)| *e == idle_far).unwrap();
    assert_eq!(
        idle_dec.1,
        DispatchDecision::GoToStop(stops[0]),
        "tuned default must route the idle car, not the committed-up one \
         forced to backtrack — the whole point of shipping non-zero weights"
    );
}

#[test]
fn closer_car_wins_on_pure_eta() {
    let (mut world, stops) = test_world();
    let near = spawn_elevator(&mut world, 6.0); // closer to stops[2] (pos 8)
    let far = spawn_elevator(&mut world, 0.0);
    let group = test_group(&stops, vec![near, far]);
    let mut manifest = DispatchManifest::default();
    add_demand(&mut manifest, &mut world, stops[2], 70.0);

    let mut rsr = RsrDispatch::new();
    let decisions = decide_all(
        &mut rsr,
        &[(near, 6.0), (far, 0.0)],
        &group,
        &manifest,
        &mut world,
    );
    let near_dec = decisions.iter().find(|(e, _)| *e == near).unwrap();
    assert_eq!(near_dec.1, DispatchDecision::GoToStop(stops[2]));
}

// ── Wrong-direction penalty ─────────────────────────────────────────

/// A car committed upward has the penalty applied to a stop below it.
/// With a large enough penalty, the other (idle) car wins even at
/// greater distance.
#[test]
fn wrong_direction_penalty_steers_away_from_reversing_car() {
    let (mut world, stops) = test_world();
    let committed_up = spawn_elevator(&mut world, 6.0);
    let idle_far = spawn_elevator(&mut world, 16.0);
    // Commit `committed_up` to stops[3] (pos 12) — travel direction up.
    world.elevator_mut(committed_up).unwrap().phase = ElevatorPhase::MovingToStop(stops[3]);

    let group = test_group(&stops, vec![committed_up, idle_far]);
    let mut manifest = DispatchManifest::default();
    // Demand at stops[0] (pos 0) — below `committed_up`, so it's a
    // wrong-direction candidate for that car.
    add_demand(&mut manifest, &mut world, stops[0], 70.0);

    let mut rsr = RsrDispatch::new().with_wrong_direction_penalty(1_000.0);
    let decisions = decide_all(
        &mut rsr,
        &[(committed_up, 6.0), (idle_far, 16.0)],
        &group,
        &manifest,
        &mut world,
    );
    let idle_dec = decisions.iter().find(|(e, _)| *e == idle_far).unwrap();
    assert_eq!(
        idle_dec.1,
        DispatchDecision::GoToStop(stops[0]),
        "large wrong-direction penalty must route the idle car, not the committed-up one"
    );
}

/// An idle car has no committed direction, so the wrong-direction
/// penalty must not fire — otherwise an all-idle-fleet would refuse
/// every down-from-top pickup after a single up trip.
#[test]
fn wrong_direction_penalty_does_not_fire_for_idle_car() {
    let (mut world, stops) = test_world();
    let idle = spawn_elevator(&mut world, 12.0);
    world.elevator_mut(idle).unwrap().phase = ElevatorPhase::Idle;

    let group = test_group(&stops, vec![idle]);
    let mut manifest = DispatchManifest::default();
    add_demand(&mut manifest, &mut world, stops[0], 70.0);

    let mut rsr = RsrDispatch::new().with_wrong_direction_penalty(1_000_000.0);
    let decision = decide_one(&mut rsr, idle, 12.0, &group, &manifest, &mut world);
    assert_eq!(
        decision,
        DispatchDecision::GoToStop(stops[0]),
        "idle car must accept any candidate; the penalty targets committed cars only"
    );
}

// ── Coincident car-call bonus ───────────────────────────────────────

/// With two cars equidistant, the one whose car-call matches the
/// candidate stop wins — merging pickup with existing dropoff is
/// cheaper than spawning a separate trip.
#[test]
fn coincident_car_call_bonus_prefers_car_with_matching_destination() {
    let (mut world, stops) = test_world();
    let car_with_call = spawn_elevator(&mut world, 0.0);
    let car_without = spawn_elevator(&mut world, 16.0);
    let group = test_group(&stops, vec![car_with_call, car_without]);
    let mut manifest = DispatchManifest::default();
    add_demand(&mut manifest, &mut world, stops[2], 70.0);
    // Attribute a car-call at stops[2] to `car_with_call`.
    manifest
        .car_calls_by_car
        .entry(car_with_call)
        .or_default()
        .push(CarCall::new(car_with_call, stops[2], 0));

    let mut rsr = RsrDispatch::new().with_coincident_car_call_bonus(100.0);
    let decisions = decide_all(
        &mut rsr,
        &[(car_with_call, 0.0), (car_without, 16.0)],
        &group,
        &manifest,
        &mut world,
    );
    let winner = decisions
        .iter()
        .find(|(_, d)| matches!(d, DispatchDecision::GoToStop(s) if *s == stops[2]))
        .unwrap();
    assert_eq!(
        winner.0, car_with_call,
        "car with a matching car-call must win when the coincident bonus is active"
    );
}

// ── Load-fraction penalty ───────────────────────────────────────────

/// Two cars, same distance, one half-loaded. A positive load penalty
/// sends the empty car to the pickup so the half-loaded one can
/// finish its current trip unperturbed.
#[test]
fn load_penalty_prefers_emptier_car() {
    let (mut world, stops) = test_world();
    let empty = spawn_elevator(&mut world, 0.0);
    let half_loaded = spawn_elevator(&mut world, 16.0);
    // Put a phantom aboard-rider in `half_loaded` via a direct load push.
    {
        let e = world.elevator_mut(half_loaded).unwrap();
        e.phase = ElevatorPhase::Idle;
        e.current_load = crate::components::Weight::from(400.0);
    }
    world.elevator_mut(empty).unwrap().phase = ElevatorPhase::Idle;

    let group = test_group(&stops, vec![empty, half_loaded]);
    let mut manifest = DispatchManifest::default();
    // Pickup at stops[1] (pos 4) — 4 units from each car.
    add_demand(&mut manifest, &mut world, stops[1], 70.0);

    let mut rsr = RsrDispatch::new().with_load_penalty_coeff(10.0);
    let decisions = decide_all(
        &mut rsr,
        &[(empty, 0.0), (half_loaded, 16.0)],
        &group,
        &manifest,
        &mut world,
    );
    let empty_dec = decisions.iter().find(|(e, _)| *e == empty).unwrap();
    assert_eq!(
        empty_dec.1,
        DispatchDecision::GoToStop(stops[1]),
        "empty car must win over half-loaded one under the load penalty"
    );
}

// ── Age-linear fairness term ───────────────────────────────────────

/// A positive `age_linear_weight` breaks a travel-time tie toward the
/// stop hosting the older waiter. Mirrors the ETD counterpart in
/// `etd_age_weight_tests::age_linear_weight_prefers_older_waiting_rider`.
#[test]
fn age_linear_weight_prefers_older_waiting_rider() {
    use crate::components::Weight;
    use crate::dispatch::RiderInfo;

    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 4.0); // at stops[1] (pos 4)

    let group = test_group(&stops, vec![elev]);
    let mut manifest = DispatchManifest::default();
    // stops[0] at pos 0 — rider waiting 1000 ticks.
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
    // stops[2] at pos 8 — rider waiting only 1 tick.
    let fresh_waiter = world.spawn();
    manifest
        .waiting_at_stop
        .entry(stops[2])
        .or_default()
        .push(RiderInfo {
            id: fresh_waiter,
            destination: None,
            weight: Weight::from(70.0),
            wait_ticks: 1,
        });

    let mut rsr = RsrDispatch::new().with_age_linear_weight(1.0);
    let decision = decide_one(&mut rsr, elev, 4.0, &group, &manifest, &mut world);
    assert_eq!(
        decision,
        DispatchDecision::GoToStop(stops[0]),
        "positive age_linear_weight must bias RSR toward the older waiter"
    );
}

/// A modest `age_linear_weight` must not flip travel-time dominance
/// when the far stop's extra wait isn't large enough to justify the
/// detour. Regression guard against too-aggressive bias scales at the
/// tuned default.
#[test]
fn age_linear_weight_does_not_override_travel_time() {
    use crate::components::Weight;
    use crate::dispatch::RiderInfo;

    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 0.0);

    let group = test_group(&stops, vec![elev]);
    let mut manifest = DispatchManifest::default();
    // Near waiter — young.
    let near_waiter = world.spawn();
    manifest
        .waiting_at_stop
        .entry(stops[1])
        .or_default()
        .push(RiderInfo {
            id: near_waiter,
            destination: None,
            weight: Weight::from(70.0),
            wait_ticks: 5,
        });
    // Far waiter — older, but not so much older that the tuned default
    // should deflect the car past three intervening floors.
    let far_waiter = world.spawn();
    manifest
        .waiting_at_stop
        .entry(stops[3])
        .or_default()
        .push(RiderInfo {
            id: far_waiter,
            destination: None,
            weight: Weight::from(70.0),
            wait_ticks: 20,
        });

    // Tuned default (age_linear_weight = 0.002). Per-stop age bonus at
    // the older stop: 0.002 × 20 = 0.04s — far smaller than the ~4s ETA
    // gap at max_speed = 2.0.
    let mut rsr = RsrDispatch::default();
    let decision = decide_one(&mut rsr, elev, 0.0, &group, &manifest, &mut world);
    assert_eq!(
        decision,
        DispatchDecision::GoToStop(stops[1]),
        "tuned default age bonus must not reverse travel-time dominance on small age gaps"
    );
}

// ── BuiltinStrategy round-trip ──────────────────────────────────────

#[test]
fn builtin_rsr_variant_instantiates() {
    let boxed = BuiltinStrategy::Rsr.instantiate();
    assert!(boxed.is_some(), "BuiltinStrategy::Rsr must instantiate");
}

#[test]
fn builtin_rsr_variant_display() {
    assert_eq!(BuiltinStrategy::Rsr.to_string(), "Rsr");
}

/// Serde round-trip — snapshots referencing `Rsr` must survive
/// deserialize-then-reserialize unchanged.
#[test]
fn builtin_rsr_variant_serde_roundtrip() {
    let v = BuiltinStrategy::Rsr;
    let s = ron::to_string(&v).unwrap();
    let back: BuiltinStrategy = ron::from_str(&s).unwrap();
    assert_eq!(v, back);
}

// ── Weight-validation panics ────────────────────────────────────────

#[test]
#[should_panic(expected = "wrong_direction_penalty must be finite and non-negative")]
fn wrong_direction_penalty_rejects_nan() {
    let _ = RsrDispatch::new().with_wrong_direction_penalty(f64::NAN);
}

#[test]
#[should_panic(expected = "wrong_direction_penalty must be finite and non-negative")]
fn wrong_direction_penalty_rejects_negative() {
    let _ = RsrDispatch::new().with_wrong_direction_penalty(-1.0);
}

#[test]
#[should_panic(expected = "coincident_car_call_bonus must be finite and non-negative")]
fn coincident_bonus_rejects_negative() {
    let _ = RsrDispatch::new().with_coincident_car_call_bonus(-1.0);
}

#[test]
#[should_panic(expected = "load_penalty_coeff must be finite and non-negative")]
fn load_penalty_rejects_nan() {
    let _ = RsrDispatch::new().with_load_penalty_coeff(f64::NAN);
}

#[test]
#[should_panic(expected = "eta_weight must be finite and non-negative")]
fn eta_weight_rejects_negative() {
    let _ = RsrDispatch::new().with_eta_weight(-0.5);
}

#[test]
#[should_panic(expected = "peak_direction_multiplier must be finite and ≥ 1.0")]
fn peak_direction_multiplier_rejects_below_one() {
    let _ = RsrDispatch::new().with_peak_direction_multiplier(0.5);
}

#[test]
#[should_panic(expected = "peak_direction_multiplier must be finite and ≥ 1.0")]
fn peak_direction_multiplier_rejects_nan() {
    let _ = RsrDispatch::new().with_peak_direction_multiplier(f64::NAN);
}

#[test]
#[should_panic(expected = "age_linear_weight must be finite and non-negative")]
fn age_linear_weight_rejects_nan() {
    let _ = RsrDispatch::new().with_age_linear_weight(f64::NAN);
}

#[test]
#[should_panic(expected = "age_linear_weight must be finite and non-negative")]
fn age_linear_weight_rejects_negative() {
    let _ = RsrDispatch::new().with_age_linear_weight(-1.0);
}

// ── Peak-direction multiplier ───────────────────────────────────────

/// During `UpPeak` the multiplier amplifies the wrong-direction
/// penalty. A base penalty that's small enough to lose on distance
/// alone wins with the peak multiplier applied.
#[test]
fn peak_direction_multiplier_strengthens_penalty_in_up_peak() {
    use crate::arrival_log::ArrivalLog;
    use crate::traffic_detector::{TrafficDetector, TrafficMode};

    let (mut world, stops) = test_world();
    let committed_up = spawn_elevator(&mut world, 6.0);
    let idle_far = spawn_elevator(&mut world, 16.0);
    world.elevator_mut(committed_up).unwrap().phase =
        crate::components::ElevatorPhase::MovingToStop(stops[3]);

    // Seed a detector that classifies as UpPeak. Using the classifier's
    // own path here instead of reaching into private fields keeps the
    // test coupled to the public invariant, not the storage shape.
    let mut detector = TrafficDetector::new().with_window_ticks(3_600);
    let mut log = ArrivalLog::default();
    let lobby = stops[0];
    for t in 0..70u64 {
        log.record(t * 50, lobby);
    }
    detector.update(
        &log,
        &crate::arrival_log::DestinationLog::default(),
        3_500,
        &stops,
    );
    assert_eq!(detector.current_mode(), TrafficMode::UpPeak);
    world.insert_resource(detector);

    let group = test_group(&stops, vec![committed_up, idle_far]);
    let mut manifest = DispatchManifest::default();
    // Demand at stops[0] (below committed_up, above idle_far's dist).
    add_demand(&mut manifest, &mut world, stops[0], 70.0);

    // Base penalty too small to swing the assignment on its own (car
    // at pos 6 vs pos 16; ETAs ~6 and ~16 for stops[0] at pos 0). Peak
    // multiplier of 3× turns 5.0 into 15.0, enough to dominate the
    // 10-unit ETA advantage.
    let mut rsr = RsrDispatch::new()
        .with_wrong_direction_penalty(5.0)
        .with_peak_direction_multiplier(3.0);
    let decisions = decide_all(
        &mut rsr,
        &[(committed_up, 6.0), (idle_far, 16.0)],
        &group,
        &manifest,
        &mut world,
    );
    let idle_dec = decisions.iter().find(|(e, _)| *e == idle_far).unwrap();
    assert_eq!(
        idle_dec.1,
        DispatchDecision::GoToStop(stops[0]),
        "peak multiplier must strengthen direction penalty enough to reroute"
    );
}

/// Mirror of `peak_direction_multiplier_strengthens_penalty_in_up_peak`
/// for `DownPeak`. The `match` arm treats both peaks symmetrically;
/// this test guards against a future split that might scale only one.
#[test]
fn peak_direction_multiplier_strengthens_penalty_in_down_peak() {
    use crate::arrival_log::{ArrivalLog, DestinationLog};
    use crate::traffic_detector::{TrafficDetector, TrafficMode};

    let (mut world, stops) = test_world();
    let committed_up = spawn_elevator(&mut world, 6.0);
    let idle_far = spawn_elevator(&mut world, 16.0);
    world.elevator_mut(committed_up).unwrap().phase = ElevatorPhase::MovingToStop(stops[3]);

    // Seed a DownPeak classification: sparse origins across upper
    // floors, dominant destination at the lobby.
    let mut detector = TrafficDetector::new().with_window_ticks(3_600);
    let mut arrivals = ArrivalLog::default();
    let mut destinations = DestinationLog::default();
    let lobby = stops[0];
    for t in 0..30u64 {
        for &s in &stops[1..] {
            arrivals.record(t * 50, s);
        }
    }
    for t in 0..60u64 {
        destinations.record(t * 25, lobby);
    }
    detector.update(&arrivals, &destinations, 3_500, &stops);
    assert_eq!(detector.current_mode(), TrafficMode::DownPeak);
    world.insert_resource(detector);

    let group = test_group(&stops, vec![committed_up, idle_far]);
    let mut manifest = DispatchManifest::default();
    add_demand(&mut manifest, &mut world, stops[0], 70.0);

    let mut rsr = RsrDispatch::new()
        .with_wrong_direction_penalty(5.0)
        .with_peak_direction_multiplier(3.0);
    let decisions = decide_all(
        &mut rsr,
        &[(committed_up, 6.0), (idle_far, 16.0)],
        &group,
        &manifest,
        &mut world,
    );
    let idle_dec = decisions.iter().find(|(e, _)| *e == idle_far).unwrap();
    assert_eq!(
        idle_dec.1,
        DispatchDecision::GoToStop(stops[0]),
        "DownPeak multiplier must strengthen direction penalty symmetrically with UpPeak"
    );
}

/// Off-peak (`InterFloor`) the multiplier is a no-op: the same 5.0 base
/// penalty that flipped the decision under `UpPeak` stays too small, so
/// distance wins and the committed-up car takes the job.
#[test]
fn peak_direction_multiplier_is_noop_off_peak() {
    use crate::arrival_log::ArrivalLog;
    use crate::traffic_detector::{TrafficDetector, TrafficMode};

    let (mut world, stops) = test_world();
    let committed_up = spawn_elevator(&mut world, 6.0);
    let idle_far = spawn_elevator(&mut world, 16.0);
    world.elevator_mut(committed_up).unwrap().phase =
        crate::components::ElevatorPhase::MovingToStop(stops[3]);

    // Uniform arrivals → InterFloor, not UpPeak.
    let mut detector = TrafficDetector::new().with_window_ticks(3_600);
    let mut log = ArrivalLog::default();
    for t in 0..60u64 {
        for &s in &stops {
            log.record(t * 10, s);
        }
    }
    detector.update(
        &log,
        &crate::arrival_log::DestinationLog::default(),
        3_500,
        &stops,
    );
    assert_eq!(detector.current_mode(), TrafficMode::InterFloor);
    world.insert_resource(detector);

    let group = test_group(&stops, vec![committed_up, idle_far]);
    let mut manifest = DispatchManifest::default();
    add_demand(&mut manifest, &mut world, stops[0], 70.0);

    let mut rsr = RsrDispatch::new()
        .with_wrong_direction_penalty(5.0)
        .with_peak_direction_multiplier(3.0);
    let decisions = decide_all(
        &mut rsr,
        &[(committed_up, 6.0), (idle_far, 16.0)],
        &group,
        &manifest,
        &mut world,
    );
    let committed_dec = decisions.iter().find(|(e, _)| *e == committed_up).unwrap();
    assert_eq!(
        committed_dec.1,
        DispatchDecision::GoToStop(stops[0]),
        "off-peak must leave the base penalty unscaled — closer car wins"
    );
}

/// Missing `TrafficDetector` resource (e.g. a test that bypasses
/// `Simulation::new`) silently reduces to the base penalty — strategies
/// must not panic on absent detector.
#[test]
fn peak_direction_multiplier_tolerates_missing_detector() {
    let (mut world, stops) = test_world();
    let committed_up = spawn_elevator(&mut world, 6.0);
    let idle_far = spawn_elevator(&mut world, 16.0);
    world.elevator_mut(committed_up).unwrap().phase =
        crate::components::ElevatorPhase::MovingToStop(stops[3]);

    let group = test_group(&stops, vec![committed_up, idle_far]);
    let mut manifest = DispatchManifest::default();
    add_demand(&mut manifest, &mut world, stops[0], 70.0);

    let mut rsr = RsrDispatch::new()
        .with_wrong_direction_penalty(5.0)
        .with_peak_direction_multiplier(3.0);
    // Same assertion as off-peak: without detector, no scaling applies.
    let decisions = decide_all(
        &mut rsr,
        &[(committed_up, 6.0), (idle_far, 16.0)],
        &group,
        &manifest,
        &mut world,
    );
    let committed_dec = decisions.iter().find(|(e, _)| *e == committed_up).unwrap();
    assert_eq!(committed_dec.1, DispatchDecision::GoToStop(stops[0]));
}

// ── Aboard-rider path guard ─────────────────────────────────────────
//
// These two tests lock in the correctness fix routing RSR through
// `pair_is_useful` (the shared NearestCar path guard). With only
// `pair_can_do_work`, an unconfigured RSR (all weights at their
// `new()` defaults — i.e. effectively NearestCar) would be pulled off
// its aboard riders' path by closer pickups, indefinitely deferring
// delivery. Tests mirror `nearest_car_*` regression tests so any
// future drift shows up on both strategies simultaneously.

/// Full-car self-pair: a saturated RSR car parked at a pickup stop
/// whose only waiter it cannot board must still be dispatched to its
/// aboard rider's destination, not re-selected to its own stop.
#[test]
fn rsr_full_car_at_pickup_stop_prefers_rider_destination() {
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 4.0); // at stops[1]
    {
        let car = world.elevator_mut(elev).unwrap();
        car.current_load = car.weight_capacity;
    }
    let aboard = world.spawn();
    world.elevator_mut(elev).unwrap().riders.push(aboard);
    world.set_route(aboard, Route::direct(stops[0], stops[3], GroupId(0)));

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

    let mut rsr = RsrDispatch::new();
    let decision = decide_one(&mut rsr, elev, 4.0, &group, &manifest, &mut world);
    assert_eq!(
        decision,
        DispatchDecision::GoToStop(stops[3]),
        "full car must be routed to its aboard rider's destination, not \
         the un-serveable pickup at its current position"
    );
}

/// Backward pickup with rider aboard: a car carrying a rider bound
/// *up* must reject a closer-but-below pickup even on default RSR
/// weights (where `wrong_direction_penalty = 0.0` means direction
/// cost alone can't deflect the assignment).
#[test]
fn rsr_skips_backward_pickup_when_rider_aboard() {
    let (mut world, stops) = test_world();
    // Car at stops[2] (pos 8), rider aboard going *up* to stops[3] (pos 12).
    let elev = spawn_elevator(&mut world, 8.0);
    let aboard = world.spawn();
    world.elevator_mut(elev).unwrap().riders.push(aboard);
    world.set_route(aboard, Route::direct(stops[0], stops[3], GroupId(0)));

    let group = test_group(&stops, vec![elev]);
    let mut manifest = DispatchManifest::default();
    // Pickup below the car — closer in raw distance but opposite direction.
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

    let mut rsr = RsrDispatch::new();
    let decision = decide_one(&mut rsr, elev, 8.0, &group, &manifest, &mut world);
    assert_eq!(
        decision,
        DispatchDecision::GoToStop(stops[3]),
        "backward pickup must not preempt an aboard rider's forward destination"
    );
}

// ── Sanity: _elev unused suppresses dead-code warning ──────────────
#[allow(dead_code)]
fn _touch(_elev: EntityId) {}
