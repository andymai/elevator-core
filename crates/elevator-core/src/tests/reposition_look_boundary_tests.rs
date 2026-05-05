//! Boundary-mutation coverage for the reposition strategies and the
//! sweep helper that backs SCAN/LOOK dispatch (#660).
//!
//! Targets the boundary operators (`>`, `>=`, `<`, `<=`) and the
//! EPSILON-band tolerance checks that the existing strategy tests
//! traverse but don't pin down. Each test name encodes the boundary
//! condition it isolates so a surviving mutation says exactly which
//! comparison flipped.
//!
//! Hotspots from `mutants.out` covered here:
//! - `dispatch/reposition.rs:36-228` — `RepositionCooldowns`,
//!   `SpreadEvenly`, `ReturnToLobby`, into `DemandWeighted`.
//! - `dispatch/look.rs:91-92` — degenerate request shapes that exercise
//!   `pair_is_useful` + `sweep::rank`.

use crate::components::{Accel, Elevator, ElevatorPhase, Position, Speed, Stop, Velocity, Weight};
use crate::dispatch::reposition::{
    DEFAULT_REPOSITION_COOLDOWN_TICKS, RepositionCooldowns, ReturnToLobby, SpreadEvenly,
};
use crate::dispatch::sweep::{self, EPSILON, SweepDirection, SweepMode};
use crate::dispatch::{
    DispatchManifest, DispatchStrategy, ElevatorGroup, LineInfo, RankContext, RepositionStrategy,
    look::LookDispatch,
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

fn idle_elevator_at(world: &mut World, position: f64) -> EntityId {
    let eid = world.spawn();
    world.set_position(eid, Position { value: position });
    world.set_velocity(eid, Velocity { value: 0.0 });
    world.set_elevator(
        eid,
        Elevator {
            phase: ElevatorPhase::Idle,
            door: DoorState::Closed,
            max_speed: Speed::from(2.0),
            acceleration: Accel::from(1.5),
            deceleration: Accel::from(2.0),
            weight_capacity: Weight::from(800.0),
            current_load: Weight::from(0.0),
            riders: vec![],
            target_stop: None,
            door_transition_ticks: 5,
            door_open_ticks: 10,
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

// ===== RepositionCooldowns boundary =====
//
// `is_cooling_down` uses `tick < eligible`. The boundary mutation that
// flips `<` to `<=` would let a tick equal to `eligible` count as still
// cooling down — these three cases pin every comparator.

#[test]
fn cooldown_one_tick_before_eligible_is_cooling_down() {
    let mut cd = RepositionCooldowns::default();
    let car = EntityId::default();
    cd.record_arrival(car, 0);
    let eligible = DEFAULT_REPOSITION_COOLDOWN_TICKS;
    assert!(
        cd.is_cooling_down(car, eligible - 1),
        "tick = eligible - 1 must still be cooling down (`<` boundary)"
    );
}

#[test]
fn cooldown_at_exact_eligible_tick_is_no_longer_cooling_down() {
    let mut cd = RepositionCooldowns::default();
    let car = EntityId::default();
    cd.record_arrival(car, 0);
    let eligible = DEFAULT_REPOSITION_COOLDOWN_TICKS;
    assert!(
        !cd.is_cooling_down(car, eligible),
        "tick == eligible must NOT be cooling down (strict `<`, not `<=`)"
    );
}

#[test]
fn cooldown_one_tick_after_eligible_is_no_longer_cooling_down() {
    let mut cd = RepositionCooldowns::default();
    let car = EntityId::default();
    cd.record_arrival(car, 0);
    let eligible = DEFAULT_REPOSITION_COOLDOWN_TICKS;
    assert!(
        !cd.is_cooling_down(car, eligible + 1),
        "tick > eligible must not be cooling down"
    );
}

#[test]
fn cooldown_no_entry_is_never_cooling_down() {
    let cd = RepositionCooldowns::default();
    let car = EntityId::default();
    assert!(
        !cd.is_cooling_down(car, 0),
        "fresh state has no cooldown for any car"
    );
    assert!(
        !cd.is_cooling_down(car, u64::MAX),
        "fresh state stays cooldown-free at any tick"
    );
}

// ===== SpreadEvenly EPSILON-band: `(stop - elev).abs() > 1e-6` =====
//
// Lines 145, 206 of reposition.rs filter out moves where the elevator
// is already "essentially at" the stop. The mutation that flips `>` to
// `>=` (or to `<`) would either suppress legitimate moves or emit
// no-op moves to the car's current position. These tests pin both
// sides of the 1e-6 boundary.

#[test]
fn spread_evenly_omits_no_op_when_already_at_target_stop() {
    let (mut world, stops) = world_with_stops(&[0.0, 10.0]);
    let elev = idle_elevator_at(&mut world, 10.0);
    let g = group(&stops, vec![elev]);
    let stop_pos = vec![(stops[0], 0.0), (stops[1], 10.0)];
    let idle = vec![(elev, 10.0)];

    let mut out = Vec::new();
    SpreadEvenly.reposition(&idle, &stop_pos, &g, &world, &mut out);
    // With one car at stop[1] and stop[0] empty, the spread chooses
    // stop[0]; the car is exactly at stop[1] so any emitted move must
    // be to the *other* stop, never a no-op back to stop[1].
    for &(_, target) in &out {
        assert_ne!(
            target, stops[1],
            "must not emit no-op (car already at this stop); got move to itself"
        );
    }
}

#[test]
fn spread_evenly_within_epsilon_of_stop_omits_move() {
    // Distance just below the 1e-6 threshold — the car is "already
    // there" by the strategy's own definition.
    let (mut world, stops) = world_with_stops(&[0.0, 10.0]);
    // Single stop on the line so spread has only one candidate; the
    // sub-epsilon offset must still register as "already at" stop[0].
    let elev = idle_elevator_at(&mut world, 5e-7);
    let g = group(&stops[..1], vec![elev]);
    let stop_pos = vec![(stops[0], 0.0)];
    let idle = vec![(elev, 5e-7)];

    let mut out = Vec::new();
    SpreadEvenly.reposition(&idle, &stop_pos, &g, &world, &mut out);
    assert!(
        out.is_empty(),
        "elevator within EPSILON (5e-7 < 1e-6) of stop must not emit a move; got {out:?}"
    );
}

#[test]
fn spread_evenly_just_past_epsilon_emits_move() {
    // Distance just past the 1e-6 threshold — the car must move.
    let (mut world, stops) = world_with_stops(&[0.0, 10.0]);
    let elev = idle_elevator_at(&mut world, 2e-6);
    let g = group(&stops[..1], vec![elev]);
    let stop_pos = vec![(stops[0], 0.0)];
    let idle = vec![(elev, 2e-6)];

    let mut out = Vec::new();
    SpreadEvenly.reposition(&idle, &stop_pos, &g, &world, &mut out);
    assert_eq!(
        out.len(),
        1,
        "elevator 2e-6 from stop (> 1e-6 boundary) must emit one move; got {out:?}"
    );
    assert_eq!(out[0], (elev, stops[0]));
}

// ===== ReturnToLobby epsilon: `(pos - home_pos).abs() > 1e-6` =====

#[test]
fn return_to_lobby_within_epsilon_of_home_omits_move() {
    let (mut world, stops) = world_with_stops(&[0.0, 10.0]);
    let elev = idle_elevator_at(&mut world, 5e-7);
    let g = group(&stops, vec![elev]);
    let stop_pos = vec![(stops[0], 0.0), (stops[1], 10.0)];
    let idle = vec![(elev, 5e-7)];

    let mut out = Vec::new();
    ReturnToLobby::new().reposition(&idle, &stop_pos, &g, &world, &mut out);
    assert!(
        out.is_empty(),
        "car within 1e-6 of home stop must not be repositioned; got {out:?}"
    );
}

#[test]
fn return_to_lobby_just_past_epsilon_emits_move() {
    let (mut world, stops) = world_with_stops(&[0.0, 10.0]);
    let elev = idle_elevator_at(&mut world, 2e-6);
    let g = group(&stops, vec![elev]);
    let stop_pos = vec![(stops[0], 0.0), (stops[1], 10.0)];
    let idle = vec![(elev, 2e-6)];

    let mut out = Vec::new();
    ReturnToLobby::new().reposition(&idle, &stop_pos, &g, &world, &mut out);
    assert_eq!(out, vec![(elev, stops[0])]);
}

// ===== Empty / single-stop input shapes (acceptance criteria) =====

#[test]
fn spread_evenly_empty_idle_returns_empty() {
    let (world, stops) = world_with_stops(&[0.0, 10.0]);
    let g = group(&stops, vec![]);
    let stop_pos = vec![(stops[0], 0.0), (stops[1], 10.0)];

    let mut out = Vec::new();
    SpreadEvenly.reposition(&[], &stop_pos, &g, &world, &mut out);
    assert!(out.is_empty());
}

#[test]
fn spread_evenly_empty_stops_returns_empty() {
    let (mut world, _stops) = world_with_stops(&[]);
    let elev = idle_elevator_at(&mut world, 0.0);
    let g = group(&[], vec![elev]);
    let idle = vec![(elev, 0.0)];

    let mut out = Vec::new();
    SpreadEvenly.reposition(&idle, &[], &g, &world, &mut out);
    assert!(out.is_empty(), "no stops means no targets");
}

// ===== sweep::rank boundary =====
//
// Pins every arm of the (mode, direction) match against the EPSILON
// band so a flipped `>` / `<` or a perturbed `EPSILON` is caught.
//
// Recall:
//   Strict  + Up   ⇒ stop > car + EPSILON
//   Strict  + Down ⇒ stop < car - EPSILON
//   Lenient + Up   ⇒ stop > car - EPSILON
//   Lenient + Down ⇒ stop < car + EPSILON

#[test]
fn sweep_rank_strict_up_rejects_at_or_within_epsilon() {
    let car = 10.0;
    assert!(
        sweep::rank(SweepMode::Strict, SweepDirection::Up, car, car).is_none(),
        "Strict Up rejects stop == car"
    );
    assert!(
        sweep::rank(
            SweepMode::Strict,
            SweepDirection::Up,
            car,
            car + EPSILON / 2.0
        )
        .is_none(),
        "Strict Up rejects stop within EPSILON of car"
    );
}

#[test]
fn sweep_rank_strict_up_accepts_just_past_epsilon() {
    let car = 10.0;
    let stop = EPSILON.mul_add(2.0, car);
    let cost = sweep::rank(SweepMode::Strict, SweepDirection::Up, car, stop)
        .expect("Strict Up accepts stop > car + EPSILON");
    assert!((cost - (stop - car)).abs() < EPSILON);
}

#[test]
fn sweep_rank_strict_down_rejects_at_or_within_epsilon() {
    let car = 10.0;
    assert!(sweep::rank(SweepMode::Strict, SweepDirection::Down, car, car).is_none());
    assert!(
        sweep::rank(
            SweepMode::Strict,
            SweepDirection::Down,
            car,
            car - EPSILON / 2.0
        )
        .is_none()
    );
}

#[test]
fn sweep_rank_strict_down_accepts_just_past_epsilon() {
    let car = 10.0;
    let stop = EPSILON.mul_add(-2.0, car);
    let cost = sweep::rank(SweepMode::Strict, SweepDirection::Down, car, stop)
        .expect("Strict Down accepts stop < car - EPSILON");
    assert!((cost - (car - stop)).abs() < EPSILON);
}

#[test]
fn sweep_rank_lenient_up_accepts_just_below_car() {
    // Lenient Up accepts the half-sweep including just-behind-car.
    let car = 10.0;
    let stop = car - EPSILON / 2.0;
    assert!(
        sweep::rank(SweepMode::Lenient, SweepDirection::Up, car, stop).is_some(),
        "Lenient Up accepts stop > car - EPSILON (i.e. inclusive of car position)"
    );
}

#[test]
fn sweep_rank_lenient_up_rejects_well_below_car() {
    let car = 10.0;
    let stop = car - 1.0; // far below — outside the lenient half-sweep
    assert!(sweep::rank(SweepMode::Lenient, SweepDirection::Up, car, stop).is_none());
}

#[test]
fn sweep_rank_lenient_down_accepts_just_above_car() {
    let car = 10.0;
    let stop = car + EPSILON / 2.0;
    assert!(sweep::rank(SweepMode::Lenient, SweepDirection::Down, car, stop).is_some());
}

#[test]
fn sweep_rank_cost_is_absolute_distance_regardless_of_direction() {
    // Cost is `(car - stop).abs()` in all four arms — pins the abs vs
    // signed difference mutation.
    let car = 10.0;
    let stop_above = 15.0;
    let stop_below = 5.0;

    let up_cost =
        sweep::rank(SweepMode::Strict, SweepDirection::Up, car, stop_above).expect("up accepts");
    let down_cost = sweep::rank(SweepMode::Strict, SweepDirection::Down, car, stop_below)
        .expect("down accepts");
    assert!((up_cost - 5.0).abs() < EPSILON);
    assert!((down_cost - 5.0).abs() < EPSILON);
}

// ===== strict_demand_ahead boundary =====

fn manifest_with_demand(world: &mut World, stops: &[EntityId]) -> DispatchManifest {
    use crate::components::Weight;
    use crate::dispatch::RiderInfo;
    let mut m = DispatchManifest::default();
    for &s in stops {
        let dummy = world.spawn();
        m.waiting_at_stop.entry(s).or_default().push(RiderInfo {
            id: dummy,
            destination: None,
            weight: Weight::from(70.0),
            wait_ticks: 0,
        });
    }
    m
}

#[test]
fn strict_demand_ahead_up_stop_at_car_position_is_not_ahead() {
    // Demand exactly at the car position must not count as "strictly
    // ahead" in either direction — pins the EPSILON-band mutation on
    // line 59/60 of sweep.rs.
    let (mut world, stops) = world_with_stops(&[10.0]);
    let elev = idle_elevator_at(&mut world, 10.0);
    let g = group(&stops, vec![elev]);
    let m = manifest_with_demand(&mut world, &stops);

    assert!(!sweep::strict_demand_ahead(
        SweepDirection::Up,
        10.0,
        &g,
        &m,
        &world
    ));
    assert!(!sweep::strict_demand_ahead(
        SweepDirection::Down,
        10.0,
        &g,
        &m,
        &world
    ));
}

#[test]
fn strict_demand_ahead_up_rejects_demand_below_car() {
    let (mut world, stops) = world_with_stops(&[5.0]);
    let elev = idle_elevator_at(&mut world, 10.0);
    let g = group(&stops, vec![elev]);
    let m = manifest_with_demand(&mut world, &stops);

    assert!(!sweep::strict_demand_ahead(
        SweepDirection::Up,
        10.0,
        &g,
        &m,
        &world
    ));
    assert!(sweep::strict_demand_ahead(
        SweepDirection::Down,
        10.0,
        &g,
        &m,
        &world
    ));
}

#[test]
fn strict_demand_ahead_up_accepts_demand_strictly_above_car() {
    let (mut world, stops) = world_with_stops(&[15.0]);
    let elev = idle_elevator_at(&mut world, 10.0);
    let g = group(&stops, vec![elev]);
    let m = manifest_with_demand(&mut world, &stops);

    assert!(sweep::strict_demand_ahead(
        SweepDirection::Up,
        10.0,
        &g,
        &m,
        &world
    ));
    assert!(!sweep::strict_demand_ahead(
        SweepDirection::Down,
        10.0,
        &g,
        &m,
        &world
    ));
}

// ===== LookDispatch degenerate request shapes =====

#[allow(
    clippy::too_many_arguments,
    reason = "test helper threading rank context"
)]
fn rank_via_look(
    look: &mut LookDispatch,
    car: EntityId,
    car_pos: f64,
    stop: EntityId,
    stop_pos: f64,
    g: &ElevatorGroup,
    m: &DispatchManifest,
    world: &World,
) -> Option<f64> {
    let ctx = RankContext {
        car,
        car_position: car_pos,
        stop,
        stop_position: stop_pos,
        group: g,
        manifest: m,
        world,
    };
    look.rank(&ctx)
}

#[test]
fn look_all_demand_strictly_above_car_keeps_up_sweep() {
    let (mut world, stops) = world_with_stops(&[15.0, 20.0, 25.0]);
    let elev = idle_elevator_at(&mut world, 10.0);
    let g = group(&stops, vec![elev]);
    let m = manifest_with_demand(&mut world, &stops);

    let mut look = LookDispatch::new();
    look.prepare_car(elev, 10.0, &g, &m, &world);
    // Sweep stays Up: a stop above the car must rank, the (synthetic)
    // self-stop at the car's position must not.
    let above = rank_via_look(&mut look, elev, 10.0, stops[0], 15.0, &g, &m, &world);
    assert!(above.is_some(), "Up sweep accepts stop above car");
}

#[test]
fn look_all_demand_strictly_below_car_reverses_to_down() {
    let (mut world, stops) = world_with_stops(&[0.0, 5.0]);
    let elev = idle_elevator_at(&mut world, 10.0);
    let g = group(&stops, vec![elev]);
    let m = manifest_with_demand(&mut world, &stops);

    let mut look = LookDispatch::new();
    // Default direction is Up but no demand is up → prepare_car
    // reverses to Down + Lenient.
    look.prepare_car(elev, 10.0, &g, &m, &world);
    let below = rank_via_look(&mut look, elev, 10.0, stops[0], 0.0, &g, &m, &world);
    assert!(
        below.is_some(),
        "after reversal, a stop below the car must rank (Down sweep accepts it)"
    );
}

#[test]
fn look_repeated_stops_at_same_position_all_rank_equally() {
    // Degenerate "all stops collocated" — each must produce the same
    // cost (boundary mutation that swapped which stop is preferred
    // would split the cost).
    let (mut world, stops) = world_with_stops(&[20.0, 20.0, 20.0]);
    let elev = idle_elevator_at(&mut world, 10.0);
    let g = group(&stops, vec![elev]);
    let m = manifest_with_demand(&mut world, &stops);

    let mut look = LookDispatch::new();
    look.prepare_car(elev, 10.0, &g, &m, &world);

    let costs: Vec<_> = stops
        .iter()
        .map(|&s| rank_via_look(&mut look, elev, 10.0, s, 20.0, &g, &m, &world))
        .collect();
    assert!(costs.iter().all(Option::is_some));
    let first = costs[0].unwrap();
    for c in &costs[1..] {
        assert!((c.unwrap() - first).abs() < EPSILON);
    }
}
