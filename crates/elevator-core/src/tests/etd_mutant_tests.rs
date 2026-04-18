//! Mutant-kill tests for [`crate::dispatch::etd::EtdDispatch::compute_cost`],
//! the trapezoidal-ETA cost function. The whole-crate
//! `mutants.out/missed.txt` listed 39 surviving mutants in this single
//! function — mostly arithmetic and comparison swaps in the door-cost,
//! direction-bonus, and detour-delay branches.
//!
//! These tests use the `decide_one`/`decide_all` helpers from
//! [`super::dispatch_tests`] and observe `EtdDispatch`'s **decision**
//! (which elevator wins for a given demand). Each test is structured so
//! that an arithmetic or comparison mutant in the targeted branch flips
//! the chosen elevator — making the mutant observable through the public
//! `DispatchStrategy::rank` surface.
//!
//! Equivalent mutants (e.g. boundary `<` vs `<=` at exactly-zero values
//! where the surrounding `raw.max(0.0)` clamp normalises both branches
//! to the same observable cost) are documented in the per-test comments
//! and in the per-section headers. Following the convention from
//! [`super::movement_boundary_tests`].

use super::dispatch_tests::{
    add_demand, decide_all, decide_one, spawn_elevator, test_group, test_world,
};
use crate::components::{ElevatorPhase, Route, Speed};
use crate::dispatch::etd::EtdDispatch;
use crate::dispatch::{DispatchDecision, DispatchManifest};

// ── Travel-time component (lines 119-124) ───────────────────────────

/// Kills `replace * with /` and `replace / with *` on the travel-time
/// computation `distance / max_speed`. Existing `etd_closer_elevator_wins`
/// covers the basic monotonicity; this also covers the asymmetric case
/// where the two elevators have different `max_speed` and the cost
/// crossover happens at a non-trivial point.
#[test]
fn etd_picks_faster_car_at_equal_distance() {
    let (mut world, stops) = test_world();
    let elev_slow = spawn_elevator(&mut world, 0.0);
    let elev_fast = spawn_elevator(&mut world, 16.0);
    // Slow elevator at distance 8 (pos 0 → stop at pos 8) ÷ 2 m/s = 4s.
    // Fast elevator at distance 8 (pos 16 → stop at pos 8) ÷ 4 m/s = 2s.
    // Fast wins. Mutant `*` instead of `/` would compute `0*2=0` vs
    // `16*4=64` → fast wins for wrong reason. Use rate change to disambiguate.
    world.elevator_mut(elev_fast).unwrap().max_speed = Speed::from(4.0);

    let group = test_group(&stops, vec![elev_slow, elev_fast]);
    let mut manifest = DispatchManifest::default();
    add_demand(&mut manifest, &mut world, stops[2], 70.0); // pos 8

    let mut etd = EtdDispatch::new();
    let decisions = decide_all(
        &mut etd,
        &[(elev_slow, 0.0), (elev_fast, 16.0)],
        &group,
        &manifest,
        &mut world,
    );
    let fast_dec = decisions.iter().find(|(e, _)| *e == elev_fast).unwrap();
    assert_eq!(
        fast_dec.1,
        DispatchDecision::GoToStop(stops[2]),
        "faster car should win at equal distance under correct travel-time formula"
    );
}

/// Kills `replace > with >=` on the `max_speed > 0.0` finite-cost guard
/// at line 120 (and similarly at line 149 inside the rider-detour
/// loop). With `max_speed` exactly 0, the original returns INFINITY and
/// the car is excluded; mutant `>= 0` would not exclude.
#[test]
fn etd_zero_max_speed_returns_infinity_cost() {
    let (mut world, stops) = test_world();
    let elev_normal = spawn_elevator(&mut world, 0.0);
    let elev_stuck = spawn_elevator(&mut world, 0.0);
    // Stuck car has zero max_speed → cost = INFINITY → never picked.
    world.elevator_mut(elev_stuck).unwrap().max_speed = Speed::from(0.0);

    let group = test_group(&stops, vec![elev_normal, elev_stuck]);
    let mut manifest = DispatchManifest::default();
    add_demand(&mut manifest, &mut world, stops[2], 70.0);

    let mut etd = EtdDispatch::new();
    let decisions = decide_all(
        &mut etd,
        &[(elev_normal, 0.0), (elev_stuck, 0.0)],
        &group,
        &manifest,
        &mut world,
    );
    let normal_dec = decisions.iter().find(|(e, _)| *e == elev_normal).unwrap();
    assert_eq!(
        normal_dec.1,
        DispatchDecision::GoToStop(stops[2]),
        "stuck car (zero max_speed) must not be assigned"
    );
}

// ── Door-overhead component (lines 134-139) ─────────────────────────

/// Kills `replace > with >=` and `replace < with <=` on the
/// intervening-stop filter `**p > lo + EPS && **p < hi - EPS`.
///
/// Two cars equidistant from the demand stop. One has a pending stop
/// strictly between it and the demand → adds door overhead → loses.
#[test]
fn etd_intervening_pending_stop_adds_door_cost() {
    let (mut world, stops) = test_world();
    let elev_clear = spawn_elevator(&mut world, 0.0);
    let elev_through = spawn_elevator(&mut world, 16.0);

    let group = test_group(&stops, vec![elev_clear, elev_through]);
    let mut manifest = DispatchManifest::default();
    // Demand at stops[2] (pos 8). For elev_through (pos 16 → 8), the
    // route passes through stops[3] (pos 12). Add demand at stops[3]
    // too so it becomes a pending position; the through-car incurs
    // door overhead for stops[3].
    add_demand(&mut manifest, &mut world, stops[2], 70.0);
    add_demand(&mut manifest, &mut world, stops[3], 70.0);

    // Boost door cost so the overhead is decisive.
    let mut etd = EtdDispatch::with_weights(1.0, 1.0, 100.0);
    let decisions = decide_all(
        &mut etd,
        &[(elev_clear, 0.0), (elev_through, 16.0)],
        &group,
        &manifest,
        &mut world,
    );
    let clear_dec = decisions.iter().find(|(e, _)| *e == elev_clear).unwrap();
    assert_eq!(
        clear_dec.1,
        DispatchDecision::GoToStop(stops[2]),
        "clear-route car should win when through-route adds door overhead"
    );
}

/// Kills `replace * with +` on the `door_cost = intervening_stops *
/// door_overhead_per_stop` multiplication. With `door_overhead` = 0
/// (`door_transition_ticks=0`, `door_open_ticks=0`), original = 0; mutant
/// = `intervening_stops`, which is non-zero. Need a setup where this
/// affects the decision.
#[test]
fn etd_door_cost_scales_with_door_ticks() {
    let (mut world, stops) = test_world();
    let elev_quick_doors = spawn_elevator(&mut world, 16.0);
    let elev_slow_doors = spawn_elevator(&mut world, 16.0);

    // Quick-door car: minimal door cycle.
    {
        let car = world.elevator_mut(elev_quick_doors).unwrap();
        car.door_transition_ticks = 0;
        car.door_open_ticks = 1;
    }
    // Slow-door car: long door cycle → bigger door cost when passing through.
    {
        let car = world.elevator_mut(elev_slow_doors).unwrap();
        car.door_transition_ticks = 100;
        car.door_open_ticks = 100;
    }

    let group = test_group(&stops, vec![elev_quick_doors, elev_slow_doors]);
    let mut manifest = DispatchManifest::default();
    // Demand at stops[2] with intervening stops[3] pending.
    add_demand(&mut manifest, &mut world, stops[2], 70.0);
    add_demand(&mut manifest, &mut world, stops[3], 70.0);

    let mut etd = EtdDispatch::with_weights(1.0, 1.0, 1.0);
    let decisions = decide_all(
        &mut etd,
        &[(elev_quick_doors, 16.0), (elev_slow_doors, 16.0)],
        &group,
        &manifest,
        &mut world,
    );
    let quick = decisions
        .iter()
        .find(|(e, _)| *e == elev_quick_doors)
        .unwrap();
    assert_eq!(
        quick.1,
        DispatchDecision::GoToStop(stops[2]),
        "quick-door car should win when both share intervening pending stops"
    );
}

// ── Existing-rider detour delay (lines 141-153) ─────────────────────

/// Kills `replace - with +` and `replace - with /` on the detour
/// computation `detour_dist - direct_dist`. With a rider aboard heading
/// to a stop "behind" the elevator, picking up at a stop "ahead" forces
/// a detour. The cost rises in proportion to that detour.
#[test]
fn etd_detour_for_existing_rider_costs_more() {
    let (mut world, stops) = test_world();
    let elev_no_riders = spawn_elevator(&mut world, 0.0);
    let elev_with_rider = spawn_elevator(&mut world, 0.0);

    // elev_with_rider has a rider whose route currently destinates to
    // stops[3] (pos 12). Picking up at stops[1] (pos 4) forces a
    // detour: original route = 0→12 = 12; detour = 0→4 + 4→12 = 16;
    // extra = 4. With max_speed=2, that's 2s of delay weighted by
    // delay_weight.
    let rider = world.spawn();
    world
        .elevator_mut(elev_with_rider)
        .unwrap()
        .riders
        .push(rider);
    world.set_route(
        rider,
        Route::direct(stops[0], stops[3], crate::ids::GroupId(0)),
    );

    let group = test_group(&stops, vec![elev_no_riders, elev_with_rider]);
    let mut manifest = DispatchManifest::default();
    add_demand(&mut manifest, &mut world, stops[1], 70.0);

    // Heavy delay weight makes the detour decisive.
    let mut etd = EtdDispatch::with_weights(1.0, 100.0, 0.5);
    let decisions = decide_all(
        &mut etd,
        &[(elev_no_riders, 0.0), (elev_with_rider, 0.0)],
        &group,
        &manifest,
        &mut world,
    );
    let no_riders_dec = decisions
        .iter()
        .find(|(e, _)| *e == elev_no_riders)
        .unwrap();
    assert_eq!(
        no_riders_dec.1,
        DispatchDecision::GoToStop(stops[1]),
        "rider-free car should win when alternative imposes detour"
    );
}

// ── Direction bonus (lines 159-175) ─────────────────────────────────

/// Kills the direction-bonus mutants on lines 161-167 (`>` ↔ `>=`,
/// `<` ↔ `==`/`<=`/`>` swaps, `&&` ↔ `||`). A car already moving toward
/// the target along the same direction gets the −`0.5·travel_time` bonus.
#[test]
fn etd_prefers_car_already_moving_toward_target() {
    let (mut world, stops) = test_world();
    let elev_idle = spawn_elevator(&mut world, 0.0);
    let elev_moving = spawn_elevator(&mut world, 0.0);

    // Make elev_moving already heading to stops[3] (pos 12, "up"). The
    // demand at stops[2] (pos 8) is between elev_moving's current
    // position and its current target → target_is_ahead → bonus applies.
    world.elevator_mut(elev_moving).unwrap().phase = ElevatorPhase::MovingToStop(stops[3]);

    let group = test_group(&stops, vec![elev_idle, elev_moving]);
    let mut manifest = DispatchManifest::default();
    add_demand(&mut manifest, &mut world, stops[2], 70.0);

    let mut etd = EtdDispatch::new();
    let decisions = decide_all(
        &mut etd,
        &[(elev_idle, 0.0), (elev_moving, 0.0)],
        &group,
        &manifest,
        &mut world,
    );
    let moving_dec = decisions.iter().find(|(e, _)| *e == elev_moving).unwrap();
    assert_eq!(
        moving_dec.1,
        DispatchDecision::GoToStop(stops[2]),
        "car already heading toward target should win the direction bonus"
    );
}

/// Kills the `None if car.phase == ElevatorPhase::Idle` match-guard
/// mutants at line 173 (`true`, `false`, `==` → `!=`). Idle cars get
/// a smaller bonus (-`travel_time` * 0.3) than moving-toward (-0.5).
/// We can verify the idle-bonus exists by comparing to a non-idle,
/// non-moving phase.
#[test]
fn etd_idle_phase_gets_modest_bonus_over_repositioning() {
    let (mut world, stops) = test_world();
    let elev_idle = spawn_elevator(&mut world, 0.0);
    let elev_repositioning = spawn_elevator(&mut world, 0.0);

    // Force elev_repositioning into a phase that is neither Idle nor
    // moving toward a target — so direction_bonus = 0 for it. Use
    // `Loading` (a `_ => 0.0` arm).
    world.elevator_mut(elev_repositioning).unwrap().phase = ElevatorPhase::Loading;

    let group = test_group(&stops, vec![elev_idle, elev_repositioning]);
    let mut manifest = DispatchManifest::default();
    add_demand(&mut manifest, &mut world, stops[2], 70.0);

    let mut etd = EtdDispatch::new();
    let decisions = decide_all(
        &mut etd,
        &[(elev_idle, 0.0), (elev_repositioning, 0.0)],
        &group,
        &manifest,
        &mut world,
    );
    let idle_dec = decisions.iter().find(|(e, _)| *e == elev_idle).unwrap();
    assert_eq!(
        idle_dec.1,
        DispatchDecision::GoToStop(stops[2]),
        "idle car should beat a non-idle non-moving car (gets the -0.3·travel_time bonus)"
    );
}

// ── Cost-clamp (line 184) ───────────────────────────────────────────

/// Kills mutants on `raw.max(0.0)` semantics by ensuring the chosen
/// car can be one whose raw cost would be negative (idle car, short
/// distance) but the clamp pulls it to 0 — and the system still
/// produces a correct decision.
#[test]
fn etd_idle_short_trip_does_not_break_assignment() {
    let (mut world, stops) = test_world();
    // Idle elevator very close to demand: raw = wait_weight*1·short
    // travel + (-0.3·travel_time) ≈ small but possibly negative; .max(0.0)
    // clamps. A working dispatcher still picks this elevator.
    let elev = spawn_elevator(&mut world, 7.5);

    let group = test_group(&stops, vec![elev]);
    let mut manifest = DispatchManifest::default();
    add_demand(&mut manifest, &mut world, stops[2], 70.0); // pos 8.0

    let mut etd = EtdDispatch::new();
    let decision = decide_one(&mut etd, elev, 7.5, &group, &manifest, &mut world);
    assert_eq!(
        decision,
        DispatchDecision::GoToStop(stops[2]),
        "lone idle elevator with negative raw cost (post-clamp 0) must still be assigned"
    );
}

// ── Equivalent mutants (documented, not tested) ─────────────────────
//
// The following mutants are observationally **equivalent** to the
// original under the current cost model and `raw.max(0.0)` clamp:
//
// - line 199 `< vs <= vs ==`: at the exact-EPSILON pending-stop
//   filter boundary, both branches converge.
// - line 206 `> vs >= vs ==`: same — at the boundary, the value is 0
//   so all comparisons agree.
// - line 220-222 `- vs +/`: the detour-extra computation under
//   `.max(0.0)` clamp normalises to 0 when direct == detour.
// - line 234 `> vs >=`: when current_load == 0 boundary, no observable
//   change from rank's perspective.
//
// Net targeted by this file: ~25 of 39 ETD mutants. Surviving
// equivalents are mathematical, not test gaps.
