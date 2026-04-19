//! Behavioural tests for [`crate::dispatch::rsr::RsrDispatch`].
//!
//! Follows the `etd_mutant_tests` pattern: each term of the additive
//! cost stack gets a focused test that asserts the term's presence by
//! observing which elevator wins the Hungarian assignment.

use super::dispatch_tests::{
    add_demand, decide_all, decide_one, spawn_elevator, test_group, test_world,
};
use crate::components::{CarCall, ElevatorPhase};
use crate::dispatch::rsr::RsrDispatch;
use crate::dispatch::{BuiltinStrategy, DispatchDecision, DispatchManifest};
use crate::entity::EntityId;

// ── Defaults ────────────────────────────────────────────────────────

#[test]
fn default_weights_match_nearest_car_baseline() {
    // eta_weight = 1.0, all penalties/bonuses disabled. With one car
    // and one stop, the car must go to the stop (no other options).
    let (mut world, stops) = test_world();
    let elev = spawn_elevator(&mut world, 0.0);
    let group = test_group(&stops, vec![elev]);
    let mut manifest = DispatchManifest::default();
    add_demand(&mut manifest, &mut world, stops[2], 70.0);

    let mut rsr = RsrDispatch::new();
    let decision = decide_one(&mut rsr, elev, 0.0, &group, &manifest, &mut world);
    assert_eq!(decision, DispatchDecision::GoToStop(stops[2]));
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

// ── Sanity: _elev unused suppresses dead-code warning ──────────────
#[allow(dead_code)]
fn _touch(_elev: EntityId) {}
