//! Boundary-mutation coverage for `EtdDispatch::compute_cost` (#659) —
//! the highest-concentration mutation hotspot in `mutants.out` (~39
//! survivors clustered around the comparators and arithmetic in lines
//! 269-363 of `dispatch/etd.rs`).
//!
//! Each test isolates one boundary so a surviving mutation says
//! exactly which comparator/constant flipped:
//!
//! - speed-zero `>` 0.0 returns INFINITY guard (lines 281, 325)
//! - intervening-stops band `> lo + 1e-9 && < hi - 1e-9` (line 313)
//! - detour `(detour - direct).max(0.0)` non-negativity clamp (line 324)
//! - direction bonus `moving_up = ctp > elev_pos` (line 337)
//! - direction bonus moving-up `target > elev && target <= ctp` (line 339)
//! - direction bonus moving-down `target < elev && target >= ctp` (line 341)
//! - direction bonus magnitude constants `0.5` (moving) / `0.3` (idle)
//! - final `raw.max(0.0)` clamp guarding non-negative cost (line 362)
//! - rank-side `wait_squared_weight > 0.0` / `age_linear_weight > 0.0`
//!
//! The tests here are pure f64-in/f64-out wherever possible so a
//! mutation point straight through, rather than getting smoothed by
//! the surrounding sim. For cases needing rider routes or the
//! direction-bonus phase machinery we set up the minimum World state
//! and call `rank` through `RankContext`.

use crate::components::{Accel, Elevator, ElevatorPhase, Position, Speed, Stop, Velocity, Weight};
use crate::dispatch::etd::EtdDispatch;
use crate::dispatch::{
    DispatchManifest, DispatchStrategy, ElevatorGroup, LineInfo, RankContext, RiderInfo,
};
use crate::door::DoorState;
use crate::entity::EntityId;
use crate::ids::GroupId;
use crate::world::World;
use std::collections::HashSet;

// ===== Helpers =====

fn world_with_stops(positions: &[f64]) -> (World, Vec<EntityId>) {
    let mut world = World::new();
    let stops = positions
        .iter()
        .enumerate()
        .map(|(i, &p)| {
            let eid = world.spawn();
            world.set_stop(
                eid,
                Stop {
                    name: format!("Stop {i}"),
                    position: p,
                },
            );
            eid
        })
        .collect();
    (world, stops)
}

fn idle_elevator(world: &mut World, position: f64, max_speed: f64) -> EntityId {
    let eid = world.spawn();
    world.set_position(eid, Position { value: position });
    world.set_velocity(eid, Velocity { value: 0.0 });
    world.set_elevator(
        eid,
        Elevator {
            phase: ElevatorPhase::Idle,
            door: DoorState::Closed,
            max_speed: Speed::from(max_speed),
            acceleration: Accel::from(1.5),
            deceleration: Accel::from(2.0),
            weight_capacity: Weight::from(800.0),
            current_load: Weight::from(0.0),
            riders: vec![],
            target_stop: None,
            // 0 door ticks isolates the door-overhead term so we can
            // pin compute_cost contributions without door noise.
            door_transition_ticks: 0,
            door_open_ticks: 0,
            line: EntityId::default(),
            repositioning: false,
            restricted_stops: HashSet::new(),
            inspection_speed_factor: 0.25,
            going_up: true,
            going_down: true,
            move_count: 0,
            door_command_queue: Vec::new(),
            manual_target_velocity: None,
            bypass_load_up_pct: None,
            bypass_load_down_pct: None,
            home_stop: None,
        },
    );
    eid
}

fn group(stops: &[EntityId], elevators: Vec<EntityId>) -> ElevatorGroup {
    ElevatorGroup::new(
        GroupId(0),
        "test".into(),
        vec![LineInfo::new(
            EntityId::default(),
            elevators,
            stops.to_vec(),
        )],
    )
}

// ===== Speed=0 INFINITY guard (line 281) =====
//
// `let travel_time = if car.max_speed.value() > 0.0 { ... } else { return INFINITY; }`.
// The boundary mutation `> 0.0` → `>= 0.0` would let speed=0 pass
// through and divide by zero, producing NaN/INFINITY without the
// explicit early return — observable difference: the rank path's
// `is_finite()` check at the end of `rank` would not produce a clean
// `None`. Pin both sides.

#[test]
fn compute_cost_speed_zero_returns_infinity() {
    let (mut world, stops) = world_with_stops(&[0.0, 10.0]);
    let elev = idle_elevator(&mut world, 0.0, /* zero speed */ 0.0);
    let etd = EtdDispatch::new();
    let cost = etd.compute_cost(elev, 0.0, 10.0, &world);
    assert_eq!(
        cost,
        f64::INFINITY,
        "zero max_speed must return INFINITY (the `> 0.0` guard, not `>= 0.0`)"
    );
    let _ = stops; // silence unused
}

#[test]
fn compute_cost_speed_just_above_zero_is_finite() {
    let (mut world, stops) = world_with_stops(&[0.0, 10.0]);
    // Tiny but non-zero speed — must take the finite branch.
    let elev = idle_elevator(&mut world, 0.0, 1e-9);
    let etd = EtdDispatch::new();
    let cost = etd.compute_cost(elev, 0.0, 10.0, &world);
    assert!(
        cost.is_finite(),
        "any positive max_speed must take the finite branch; got {cost}"
    );
    let _ = stops;
}

#[test]
fn compute_cost_missing_elevator_returns_infinity() {
    // The `let Some(car) = world.elevator(elev_eid) else { return INFINITY }`
    // guard at line 276 — pins the early-return so a mutation that
    // skipped it would touch uninitialized state.
    let world = World::new();
    let etd = EtdDispatch::new();
    let cost = etd.compute_cost(EntityId::default(), 0.0, 10.0, &world);
    assert_eq!(cost, f64::INFINITY);
}

// ===== Distance is absolute value =====
//
// `let distance = (elev_pos - target_pos).abs()` (line 280) — pins the
// abs vs signed-difference mutation. With speed=1.0 and zero direction
// bonus (we use a non-idle car later), travel_time = distance.

#[test]
fn compute_cost_distance_is_symmetric_in_position_order() {
    let (mut world, stops) = world_with_stops(&[]);
    // Non-Idle, non-moving phase so the direction bonus collapses to
    // the `_ => 0.0` arm of the match, isolating the travel-time term.
    let elev = idle_elevator(&mut world, 5.0, 1.0);
    {
        let mut e = world.elevator(elev).unwrap().clone();
        e.phase = ElevatorPhase::Stopped;
        world.set_elevator(elev, e);
    }
    let etd = EtdDispatch::new();
    let up = etd.compute_cost(elev, 5.0, 15.0, &world);
    let down = etd.compute_cost(elev, 5.0, -5.0, &world);
    assert!(
        (up - down).abs() < 1e-12,
        "distance is |elev - target|, not signed; up={up}, down={down}"
    );
    let _ = stops;
}

// ===== Direction bonus: idle-phase arm (`-travel_time * 0.3`) =====

#[test]
fn compute_cost_idle_car_gets_negative_direction_bonus() {
    // Idle, no moving target → match arm: `None if Idle => -travel_time * 0.3`.
    // The default `wait_weight = 1.0`, so raw = travel + (-0.3·travel) =
    // 0.7·travel. Pinning this against a mutated bonus of zero would
    // give 1.0·travel; with travel=10 (distance 10, speed 1), the gap
    // is 7.0 vs 10.0 — well outside any float epsilon.
    let (mut world, _stops) = world_with_stops(&[]);
    let elev = idle_elevator(&mut world, 0.0, 1.0);
    let etd = EtdDispatch::new();
    let cost = etd.compute_cost(elev, 0.0, 10.0, &world);
    assert!(
        (cost - 7.0).abs() < 1e-9,
        "idle car: cost = travel - 0.3*travel = 0.7*travel = 7.0; got {cost}"
    );
}

#[test]
fn compute_cost_non_idle_non_moving_no_direction_bonus() {
    // Phase = Boarding (non-Idle, no moving_target) — falls to the
    // `_ => 0.0` arm. Cost = 1.0·travel = 10.0 exactly.
    let (mut world, _stops) = world_with_stops(&[]);
    let elev = idle_elevator(&mut world, 0.0, 1.0);
    {
        let mut e = world.elevator(elev).unwrap().clone();
        e.phase = ElevatorPhase::Stopped;
        world.set_elevator(elev, e);
    }
    let etd = EtdDispatch::new();
    let cost = etd.compute_cost(elev, 0.0, 10.0, &world);
    assert!(
        (cost - 10.0).abs() < 1e-9,
        "non-idle non-moving: cost = travel only = 10.0; got {cost}"
    );
}

// ===== Direction bonus magnitude split: idle 0.3 vs moving 0.5 =====
//
// The two arms of the match return different magnitudes. Mutations
// that swap the constants (`0.5` ↔ `0.3`, or either to `0.0`) all
// observably diverge between the idle and moving cases.

#[test]
fn compute_cost_moving_target_ahead_uses_half_bonus() {
    let (mut world, stops) = world_with_stops(&[0.0, 5.0, 10.0]);
    let elev = idle_elevator(&mut world, 0.0, 1.0);
    // Phase = MovingToStop(stops[2]) — current_target above the car at
    // stops[2] (pos 10.0). For a candidate target at stops[1] (pos 5.0):
    // moving_up = 10 > 0 = true; target_is_ahead = (5 > 0 && 5 <= 10) = true.
    // → bonus = -travel · 0.5 = -2.5; cost = travel + bonus = 5 - 2.5 = 2.5.
    {
        let mut e = world.elevator(elev).unwrap().clone();
        e.phase = ElevatorPhase::MovingToStop(stops[2]);
        world.set_elevator(elev, e);
    }
    let etd = EtdDispatch::new();
    let cost = etd.compute_cost(elev, 0.0, 5.0, &world);
    assert!(
        (cost - 2.5).abs() < 1e-9,
        "moving with target ahead: cost = 5 + (-5*0.5) = 2.5; got {cost}"
    );
}

#[test]
fn compute_cost_moving_target_behind_no_bonus() {
    // Same setup but candidate target at stops[0] (pos 0.0, equal to
    // car). moving_up=true, target_is_ahead = (0 > 0 && _) = false.
    // → bonus = 0.0; cost = travel = 0 (target at car position).
    let (mut world, stops) = world_with_stops(&[0.0, 5.0, 10.0]);
    let elev = idle_elevator(&mut world, 5.0, 1.0);
    {
        let mut e = world.elevator(elev).unwrap().clone();
        e.phase = ElevatorPhase::MovingToStop(stops[2]); // moving toward 10.0
        world.set_elevator(elev, e);
    }
    // Candidate target = stops[0] at 0.0 — *behind* the car (5.0).
    // moving_up=true, but 0.0 > 5.0 is false → target_is_ahead=false → bonus=0.
    let etd = EtdDispatch::new();
    let cost = etd.compute_cost(elev, 5.0, 0.0, &world);
    assert!(
        (cost - 5.0).abs() < 1e-9,
        "moving with target behind: cost = travel only = 5.0; got {cost}"
    );
}

#[test]
fn compute_cost_moving_target_past_current_target_no_bonus() {
    // Pin the upper bound `target_pos <= ctp`. Car at 0, current_target
    // at 5; candidate at 10 is past current_target → bonus = 0.
    // moving_up=true, target_is_ahead = (10 > 0 && 10 <= 5) = false.
    let (mut world, stops) = world_with_stops(&[0.0, 5.0, 10.0]);
    let elev = idle_elevator(&mut world, 0.0, 1.0);
    {
        let mut e = world.elevator(elev).unwrap().clone();
        e.phase = ElevatorPhase::MovingToStop(stops[1]); // moving toward 5.0
        world.set_elevator(elev, e);
    }
    let etd = EtdDispatch::new();
    let cost = etd.compute_cost(elev, 0.0, 10.0, &world);
    assert!(
        (cost - 10.0).abs() < 1e-9,
        "candidate past current_target: cost = travel only = 10.0; got {cost}"
    );
}

#[test]
fn compute_cost_moving_target_exactly_at_current_target_gets_bonus() {
    // Pin the `<=` (not `<`) boundary on line 339. Candidate equal to
    // current_target should still count as "ahead". Car at 0, current
    // target at 5; candidate target at exactly 5.
    let (mut world, stops) = world_with_stops(&[0.0, 5.0, 10.0]);
    let elev = idle_elevator(&mut world, 0.0, 1.0);
    {
        let mut e = world.elevator(elev).unwrap().clone();
        e.phase = ElevatorPhase::MovingToStop(stops[1]); // moving toward 5.0
        world.set_elevator(elev, e);
    }
    let etd = EtdDispatch::new();
    let cost = etd.compute_cost(elev, 0.0, 5.0, &world);
    // travel=5, bonus=-2.5, raw=2.5
    assert!(
        (cost - 2.5).abs() < 1e-9,
        "candidate exactly at current_target must still get the half-bonus (`<=`, not `<`); got {cost}"
    );
}

#[test]
fn compute_cost_moving_down_target_ahead_uses_half_bonus() {
    // Mirror of moving-up: car at 10, current_target at 0 (moving down),
    // candidate at 5 — target_is_ahead = (5 < 10 && 5 >= 0) = true.
    let (mut world, stops) = world_with_stops(&[0.0, 5.0, 10.0]);
    let elev = idle_elevator(&mut world, 10.0, 1.0);
    {
        let mut e = world.elevator(elev).unwrap().clone();
        e.phase = ElevatorPhase::MovingToStop(stops[0]); // moving toward 0.0
        world.set_elevator(elev, e);
    }
    let etd = EtdDispatch::new();
    let cost = etd.compute_cost(elev, 10.0, 5.0, &world);
    // travel=5, bonus=-2.5, raw=2.5
    assert!(
        (cost - 2.5).abs() < 1e-9,
        "moving down with target ahead: cost = 2.5; got {cost}"
    );
}

#[test]
fn compute_cost_moving_down_target_at_current_target_gets_bonus() {
    // Pin `>= ctp` boundary (line 341). Car at 10, current_target at 0;
    // candidate at exactly 0 — must still rank as "ahead".
    let (mut world, stops) = world_with_stops(&[0.0, 5.0, 10.0]);
    let elev = idle_elevator(&mut world, 10.0, 1.0);
    {
        let mut e = world.elevator(elev).unwrap().clone();
        e.phase = ElevatorPhase::MovingToStop(stops[0]);
        world.set_elevator(elev, e);
    }
    let etd = EtdDispatch::new();
    let cost = etd.compute_cost(elev, 10.0, 0.0, &world);
    // travel=10, bonus=-5.0, raw=5.0
    assert!(
        (cost - 5.0).abs() < 1e-9,
        "candidate exactly at current_target (down): expected 5.0; got {cost}"
    );
}

// ===== Final clamp `raw.max(0.0)` (line 362) =====
//
// Direction bonus can drive `raw` negative when the bonus magnitude
// exceeds the travel/delay/door sum (e.g. wait_weight = 0). The clamp
// must coerce to 0.0 — pin it.

#[test]
fn compute_cost_negative_raw_clamped_to_zero() {
    // wait_weight = 0 zeroes the travel-time term; the only term left
    // is the negative idle direction bonus → raw = -0.3·travel < 0.
    // The clamp at line 362 must pull it to 0.0.
    let (mut world, _stops) = world_with_stops(&[]);
    let elev = idle_elevator(&mut world, 0.0, 1.0);
    let mut etd = EtdDispatch::new();
    etd.wait_weight = 0.0;
    let cost = etd.compute_cost(elev, 0.0, 10.0, &world);
    assert_eq!(
        cost, 0.0,
        "negative raw cost must be clamped to 0.0; got {cost}"
    );
}

// ===== Wait-squared / age-linear weight guards in `rank` =====
//
// `if self.wait_squared_weight > 0.0 { … }` (line 225). The mutation
// `> 0.0` → `>= 0.0` would still take the branch when the weight is
// exactly zero (no-op, since 0·anything = 0) — observable only when a
// mutation also alters the body. Still, exercise both branches so the
// mutator's "delete if-block" survivor doesn't slip through silently.

fn manifest_with_aging_demand(
    world: &mut World,
    stop: EntityId,
    wait_ticks: u64,
) -> DispatchManifest {
    let mut m = DispatchManifest::default();
    let dummy = world.spawn();
    m.waiting_at_stop.entry(stop).or_default().push(RiderInfo {
        id: dummy,
        destination: None,
        weight: Weight::from(70.0),
        wait_ticks,
    });
    m
}

#[test]
fn rank_age_linear_weight_subtracts_from_cost_when_active() {
    // age_linear_weight active → cost reduced by weight · Σwait_ticks.
    // Setup: travel only (Boarding phase, no door, no riders), one
    // waiting rider with wait_ticks=1000, age_linear_weight=0.001.
    // Expected reduction = 0.001 * 1000 = 1.0; raw travel cost is 10.0
    // (distance 10, speed 1) → final cost ≈ 9.0.
    let (mut world, stops) = world_with_stops(&[0.0, 10.0]);
    let elev = idle_elevator(&mut world, 0.0, 1.0);
    {
        let mut e = world.elevator(elev).unwrap().clone();
        e.phase = ElevatorPhase::Stopped;
        world.set_elevator(elev, e);
    }
    let g = group(&stops, vec![elev]);
    let m = manifest_with_aging_demand(&mut world, stops[1], 1000);

    let mut etd = EtdDispatch::new();
    etd.age_linear_weight = 0.001;
    etd.pre_dispatch(&g, &m, &mut world);

    let ctx = RankContext {
        car: elev,
        car_position: 0.0,
        stop: stops[1],
        stop_position: 10.0,
        group: &g,
        manifest: &m,
        world: &world,
    };
    let cost = etd.rank(&ctx).expect("finite cost");
    assert!(
        (cost - 9.0).abs() < 1e-9,
        "rank with age_linear_weight·1000 should reduce 10.0 by 1.0 to 9.0; got {cost}"
    );
}

#[test]
fn rank_zero_age_weight_skips_the_subtraction() {
    // With age_linear_weight = 0.0, the `> 0.0` guard skips the entire
    // wait-aggregate loop. Cost = raw travel = 10.0 exactly.
    let (mut world, stops) = world_with_stops(&[0.0, 10.0]);
    let elev = idle_elevator(&mut world, 0.0, 1.0);
    {
        let mut e = world.elevator(elev).unwrap().clone();
        e.phase = ElevatorPhase::Stopped;
        world.set_elevator(elev, e);
    }
    let g = group(&stops, vec![elev]);
    let m = manifest_with_aging_demand(&mut world, stops[1], 1000);

    let mut etd = EtdDispatch::new();
    // age_linear_weight stays at the new() default of 0.0
    etd.pre_dispatch(&g, &m, &mut world);

    let ctx = RankContext {
        car: elev,
        car_position: 0.0,
        stop: stops[1],
        stop_position: 10.0,
        group: &g,
        manifest: &m,
        world: &world,
    };
    let cost = etd.rank(&ctx).expect("finite cost");
    assert!(
        (cost - 10.0).abs() < 1e-9,
        "rank with zero age weight ignores wait_ticks; got {cost}"
    );
}

#[test]
fn rank_wait_squared_weight_subtracts_quadratically() {
    // wait_squared_weight = 0.001, two riders waiting 50 ticks each →
    // Σwait² = 2·50² = 5000. Reduction = 0.001·5000 = 5.0.
    // Raw cost = 10.0; final ≈ 5.0.
    let (mut world, stops) = world_with_stops(&[0.0, 10.0]);
    let elev = idle_elevator(&mut world, 0.0, 1.0);
    {
        let mut e = world.elevator(elev).unwrap().clone();
        e.phase = ElevatorPhase::Stopped;
        world.set_elevator(elev, e);
    }
    let g = group(&stops, vec![elev]);
    let mut m = DispatchManifest::default();
    for _ in 0..2 {
        let dummy = world.spawn();
        m.waiting_at_stop
            .entry(stops[1])
            .or_default()
            .push(RiderInfo {
                id: dummy,
                destination: None,
                weight: Weight::from(70.0),
                wait_ticks: 50,
            });
    }

    let mut etd = EtdDispatch::new();
    etd.wait_squared_weight = 0.001;
    etd.pre_dispatch(&g, &m, &mut world);

    let ctx = RankContext {
        car: elev,
        car_position: 0.0,
        stop: stops[1],
        stop_position: 10.0,
        group: &g,
        manifest: &m,
        world: &world,
    };
    let cost = etd.rank(&ctx).expect("finite cost");
    assert!(
        (cost - 5.0).abs() < 1e-9,
        "rank with wait_squared_weight·5000 should reduce 10.0 by 5.0 to 5.0; got {cost}"
    );
}

// ===== `cost.is_finite()` rank guard (line 246) =====

#[test]
fn rank_returns_none_when_compute_cost_returns_infinity() {
    // Zero max_speed → compute_cost returns INFINITY → is_finite() check
    // produces None.
    let (mut world, stops) = world_with_stops(&[0.0, 10.0]);
    let elev = idle_elevator(&mut world, 0.0, /* zero speed */ 0.0);
    let g = group(&stops, vec![elev]);
    let dummy = world.spawn();
    let mut m = DispatchManifest::default();
    m.waiting_at_stop
        .entry(stops[1])
        .or_default()
        .push(RiderInfo {
            id: dummy,
            destination: Some(stops[0]),
            weight: Weight::from(70.0),
            wait_ticks: 0,
        });
    let mut etd = EtdDispatch::new();
    etd.pre_dispatch(&g, &m, &mut world);
    let ctx = RankContext {
        car: elev,
        car_position: 0.0,
        stop: stops[1],
        stop_position: 10.0,
        group: &g,
        manifest: &m,
        world: &world,
    };
    assert_eq!(
        etd.rank(&ctx),
        None,
        "infinity from compute_cost must surface as None at the rank boundary"
    );
}
