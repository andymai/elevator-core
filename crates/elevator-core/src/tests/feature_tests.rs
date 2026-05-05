use crate::components::{
    Accel, Elevator, ElevatorPhase, Patience, Position, Preferences, Rider, RiderPhase, Route,
    Speed, Stop, Velocity, Weight,
};
use crate::door::DoorState;
use crate::entity::{ElevatorId, EntityId};
use crate::events::Event;
use crate::ids::GroupId;
use crate::stop::StopId;
use crate::world::World;
use std::collections::HashSet;

use super::helpers::{default_config, scan};

// ── 1. Patience abandonment ──────────────────────────────────────────────────

#[test]
fn patience_abandonment_sets_abandoned_phase() {
    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();

    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    // Attach a short patience: abandon after 5 ticks.
    sim.world_mut().set_patience(
        rider.entity(),
        Patience {
            max_wait_ticks: 5,
            waited_ticks: 0,
        },
    );

    // Disable the elevator so the rider is never served.
    let elev = ElevatorId::from(sim.world().elevator_ids()[0]);
    sim.disable(elev.entity()).unwrap();
    sim.drain_events();

    // Step enough ticks that the patience limit is exceeded.
    let mut all_events: Vec<Event> = Vec::new();
    for _ in 0..10 {
        sim.step();
        all_events.extend(sim.drain_events());
    }

    assert_eq!(
        sim.world().rider(rider.entity()).map(|r| r.phase),
        Some(RiderPhase::Abandoned),
        "rider should reach Abandoned phase after patience expires"
    );

    assert!(
        all_events
            .iter()
            .any(|e| matches!(e, Event::RiderAbandoned { rider: r, .. } if *r == rider.entity())),
        "RiderAbandoned event should be emitted for the patience-expired rider"
    );
}

#[test]
fn patience_abandonment_does_not_fire_before_limit() {
    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();

    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    sim.world_mut().set_patience(
        rider.entity(),
        Patience {
            max_wait_ticks: 100,
            waited_ticks: 0,
        },
    );

    // Disable elevator so dispatch never picks the rider up.
    let elev = ElevatorId::from(sim.world().elevator_ids()[0]);
    sim.disable(elev.entity()).unwrap();
    sim.drain_events();

    // Step only a handful of ticks — well under the patience limit.
    for _ in 0..5 {
        sim.step();
        sim.drain_events();
    }

    assert_eq!(
        sim.world().rider(rider.entity()).map(|r| r.phase),
        Some(RiderPhase::Waiting),
        "rider should still be Waiting when patience has not expired"
    );
}

#[test]
fn waited_ticks_increments_each_step() {
    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();

    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    sim.world_mut().set_patience(
        rider.entity(),
        Patience {
            max_wait_ticks: 1000,
            waited_ticks: 0,
        },
    );

    let elev = ElevatorId::from(sim.world().elevator_ids()[0]);
    sim.disable(elev.entity()).unwrap();
    sim.drain_events();

    for _ in 0..3 {
        sim.step();
        sim.drain_events();
    }

    let waited = sim.world().patience(rider.entity()).map(|p| p.waited_ticks);
    assert_eq!(
        waited,
        Some(3),
        "waited_ticks should be incremented once per tick while Waiting"
    );
}

// ── 2. Preferences: skip crowded elevator ───────────────────────────────────

#[test]
fn preferences_skip_crowded_elevator_prevents_boarding() {
    let mut config = default_config();
    // 100 kg capacity, so we can load it to just over half.
    config.elevators[0].weight_capacity = Weight::from(100.0);

    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();

    // Spawn a "ballast" rider that will fill the elevator to > 50 % capacity.
    // 60 kg / 100 kg = 0.60 load ratio — above our crowding threshold.
    let ballast = sim.spawn_rider(StopId(0), StopId(2), 60.0).unwrap();

    // Run until the ballast has boarded (is Riding).
    let max_ticks = 5_000;
    for _ in 0..max_ticks {
        sim.step();
        sim.drain_events();
        if sim.world().rider(ballast.entity()).map(|r| r.phase)
            == Some(RiderPhase::Riding(sim.world().elevator_ids()[0]))
        {
            break;
        }
    }
    assert!(
        matches!(
            sim.world().rider(ballast.entity()).map(|r| r.phase),
            Some(RiderPhase::Riding(_))
        ),
        "ballast rider should be riding before the test begins"
    );

    // Now spawn the picky rider with skip_full_elevator = true and a strict factor.
    let picky = sim.spawn_rider(StopId(0), StopId(2), 30.0).unwrap();
    sim.world_mut().set_preferences(
        picky.entity(),
        Preferences {
            skip_full_elevator: true,
            max_crowding_factor: 0.5, // will skip if load > 50 %
            abandon_after_ticks: None,
            abandon_on_full: false,
        },
    );

    // Bring the elevator back to stop 0 so loading can happen.
    // Instead of waiting for a full round-trip we directly manipulate the
    // elevator to be in Loading phase at stop 0 with the ballast already aboard,
    // then run only the loading phase once to observe the skip.
    //
    // Find the elevator entity and the stop-0 entity.
    let elev = ElevatorId::from(sim.world().elevator_ids()[0]);
    let stop0 = sim.stop_entity(StopId(0)).unwrap();
    let stop0_pos = sim.world().stop(stop0).unwrap().position;

    // Force elevator to stop 0, Loading phase, with ballast load.
    {
        let w = sim.world_mut();
        if let Some(pos) = w.position_mut(elev.entity()) {
            pos.value = stop0_pos;
        }
        if let Some(vel) = w.velocity_mut(elev.entity()) {
            vel.value = 0.0;
        }
        if let Some(car) = w.elevator_mut(elev.entity()) {
            car.phase = ElevatorPhase::Loading;
            car.current_load = Weight::from(60.0); // ballast weight
            car.target_stop = None;
        }
    }

    // Run only the loading phase once.
    sim.run_loading();
    sim.advance_tick();
    sim.drain_events();

    // The picky rider should still be Waiting — not Boarding or Riding.
    assert_eq!(
        sim.world().rider(picky.entity()).map(|r| r.phase),
        Some(RiderPhase::Waiting),
        "picky rider should remain Waiting when elevator exceeds max_crowding_factor"
    );
}

#[test]
fn preferences_boards_when_elevator_not_too_crowded() {
    let mut config = default_config();
    config.elevators[0].weight_capacity = Weight::from(100.0);

    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();

    let rider = sim.spawn_rider(StopId(0), StopId(2), 30.0).unwrap();

    // max_crowding_factor 0.5: current_load 0.0 / 100.0 = 0.0 — well below.
    sim.world_mut().set_preferences(
        rider.entity(),
        Preferences {
            skip_full_elevator: true,
            max_crowding_factor: 0.5,
            abandon_after_ticks: None,
            abandon_on_full: false,
        },
    );

    let elev = ElevatorId::from(sim.world().elevator_ids()[0]);
    let stop0 = sim.stop_entity(StopId(0)).unwrap();
    let stop0_pos = sim.world().stop(stop0).unwrap().position;

    {
        let w = sim.world_mut();
        if let Some(pos) = w.position_mut(elev.entity()) {
            pos.value = stop0_pos;
        }
        if let Some(vel) = w.velocity_mut(elev.entity()) {
            vel.value = 0.0;
        }
        if let Some(car) = w.elevator_mut(elev.entity()) {
            car.phase = ElevatorPhase::Loading;
            car.current_load = Weight::from(0.0);
            car.target_stop = None;
        }
    }

    sim.run_loading();
    sim.advance_tick();
    sim.drain_events();

    assert!(
        matches!(
            sim.world().rider(rider.entity()).map(|r| r.phase),
            Some(RiderPhase::Boarding(_))
        ),
        "rider should board when elevator is below max_crowding_factor"
    );
}

// ── 3. find_nearest_stop ─────────────────────────────────────────────────────

#[test]
fn find_nearest_stop_returns_closest_by_distance() {
    let mut world = World::new();

    let s0 = world.spawn();
    world.set_stop(
        s0,
        Stop {
            name: "S0".into(),
            position: 0.0,
        },
    );
    world.set_position(s0, Position { value: 0.0 });

    let s1 = world.spawn();
    world.set_stop(
        s1,
        Stop {
            name: "S1".into(),
            position: 4.0,
        },
    );
    world.set_position(s1, Position { value: 4.0 });

    let s2 = world.spawn();
    world.set_stop(
        s2,
        Stop {
            name: "S2".into(),
            position: 8.0,
        },
    );
    world.set_position(s2, Position { value: 8.0 });

    // 3.0 is equidistant from 0.0 (dist 3) and 4.0 (dist 1) — nearest is s1.
    assert_eq!(
        world.find_nearest_stop(3.0),
        Some(s1),
        "position 3.0 should resolve to stop at 4.0 (distance 1.0)"
    );

    // 6.5 is equidistant: dist to 4.0 = 2.5, dist to 8.0 = 1.5 — nearest is s2.
    assert_eq!(
        world.find_nearest_stop(6.5),
        Some(s2),
        "position 6.5 should resolve to stop at 8.0 (distance 1.5)"
    );
}

#[test]
fn find_nearest_stop_with_single_stop() {
    let mut world = World::new();

    let s = world.spawn();
    world.set_stop(
        s,
        Stop {
            name: "Only".into(),
            position: 10.0,
        },
    );

    // Any position should map to the only stop.
    assert_eq!(world.find_nearest_stop(999.0), Some(s));
    assert_eq!(world.find_nearest_stop(-500.0), Some(s));
}

#[test]
fn find_nearest_stop_empty_world_returns_none() {
    let world = World::new();
    assert_eq!(world.find_nearest_stop(0.0), None);
}

// ── 4. Double-board guard ────────────────────────────────────────────────────

#[test]
fn double_board_guard_rider_appears_in_exactly_one_elevator() {
    // Use a two-elevator config to create a scenario where two elevators
    // are both Loading at the same stop in the same tick. The apply_actions
    // guard ensures a rider is only boarded once.
    use crate::sim::ElevatorParams;

    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();

    // Add a second elevator at stop 0.
    let params = ElevatorParams {
        max_speed: Speed::from(2.0),
        acceleration: Accel::from(1.5),
        deceleration: Accel::from(2.0),
        weight_capacity: Weight::from(800.0),
        door_transition_ticks: 5,
        door_open_ticks: 10,
        restricted_stops: HashSet::new(),
        inspection_speed_factor: 0.25,

        bypass_load_up_pct: None,

        bypass_load_down_pct: None,
    };
    let line = sim.lines_in_group(GroupId(0))[0];
    let elev2 = ElevatorId::from(sim.add_elevator(&params, line, 0.0).unwrap());
    sim.drain_events();

    let elev1 = ElevatorId::from(sim.world().elevator_ids()[0]);
    let stop0 = sim.stop_entity(StopId(0)).unwrap();
    let stop0_pos = sim.world().stop(stop0).unwrap().position;
    let stop2 = sim.stop_entity(StopId(2)).unwrap();

    // Spawn a single rider at stop 0 heading to stop 2.
    let rider = sim.spawn_rider(stop0, stop2, 70.0).unwrap();
    sim.drain_events();

    // Force both elevators to Loading at stop 0 simultaneously.
    {
        let w = sim.world_mut();
        for &eid in &[elev1, elev2] {
            if let Some(pos) = w.position_mut(eid.entity()) {
                pos.value = stop0_pos;
            }
            if let Some(vel) = w.velocity_mut(eid.entity()) {
                vel.value = 0.0;
            }
            if let Some(car) = w.elevator_mut(eid.entity()) {
                car.phase = ElevatorPhase::Loading;
                car.riders.clear();
                car.current_load = Weight::from(0.0);
                car.target_stop = None;
            }
        }
    }

    // Run the loading phase once — both elevators process in the same call.
    sim.run_loading();
    sim.advance_tick();
    sim.drain_events();

    // Count how many elevators list this rider.
    let elev_ids = sim.world().elevator_ids();
    let boarding_count = elev_ids
        .iter()
        .filter(|&&eid| {
            sim.world()
                .elevator(eid)
                .is_some_and(|car| car.riders.contains(&rider.entity()))
        })
        .count();

    assert_eq!(
        boarding_count, 1,
        "rider should appear in exactly one elevator's riders list after double-board attempt"
    );
}

// ── 5. Disable ejects riders ─────────────────────────────────────────────────

#[test]
fn disable_elevator_ejects_riding_passenger_to_waiting() {
    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();

    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    // Run until the rider is Riding.
    let max_ticks = 5_000;
    for _ in 0..max_ticks {
        sim.step();
        sim.drain_events();
        if matches!(
            sim.world().rider(rider.entity()).map(|r| r.phase),
            Some(RiderPhase::Riding(_))
        ) {
            break;
        }
    }

    assert!(
        matches!(
            sim.world().rider(rider.entity()).map(|r| r.phase),
            Some(RiderPhase::Riding(_))
        ),
        "rider should be Riding before we disable the elevator"
    );

    // Disable the elevator.
    let elev = ElevatorId::from(sim.world().elevator_ids()[0]);
    sim.disable(elev.entity()).unwrap();
    let events = sim.drain_events();

    // Rider should now be Waiting.
    assert_eq!(
        sim.world().rider(rider.entity()).map(|r| r.phase),
        Some(RiderPhase::Waiting),
        "ejected rider should be in Waiting phase"
    );

    // Rider should be at a valid stop.
    let current_stop = sim
        .world()
        .rider(rider.entity())
        .and_then(|r| r.current_stop);
    assert!(
        current_stop.is_some(),
        "ejected rider should have a current_stop"
    );
    assert!(
        sim.world().is_alive(current_stop.unwrap()),
        "current_stop should be a live entity"
    );
    assert!(
        sim.world().stop(current_stop.unwrap()).is_some(),
        "current_stop should have a Stop component"
    );

    // RiderEjected event should have been emitted.
    assert!(
        events.iter().any(
            |e| matches!(e, Event::RiderEjected { rider: r, elevator: e, .. }
                if *r == rider.entity() && *e == elev.entity())
        ),
        "RiderEjected event should be emitted when elevator is disabled"
    );
}

#[test]
fn disable_elevator_clears_its_rider_list() {
    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();

    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    let elev = ElevatorId::from(sim.world().elevator_ids()[0]);

    // Wait until the elevator has boarded the rider.
    for _ in 0..5_000 {
        sim.step();
        sim.drain_events();
        if sim
            .world()
            .elevator(elev.entity())
            .is_some_and(|c| !c.riders.is_empty())
        {
            break;
        }
    }

    sim.disable(elev.entity()).unwrap();
    sim.drain_events();

    let car = sim.world().elevator(elev.entity()).unwrap();
    assert!(
        car.riders.is_empty(),
        "elevator riders list should be empty after disable"
    );
    assert!(
        car.current_load.value().abs() < f64::EPSILON,
        "current_load should be zeroed after disable"
    );
}

/// `disable(elevator)` wipes the car's pressed floor buttons. Without
/// the clear, a re-enabled car would re-surface button presses from
/// its prior (now-ejected) riders, and dispatch would plan against
/// those stale destinations.
#[test]
fn disable_elevator_clears_car_calls() {
    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();

    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    let elev = ElevatorId::from(sim.world().elevator_ids()[0]);

    // Let the rider board and press their floor button.
    for _ in 0..5_000 {
        sim.step();
        sim.drain_events();
        if !sim.world().car_calls(elev.entity()).is_empty() {
            break;
        }
    }
    assert!(
        !sim.world().car_calls(elev.entity()).is_empty(),
        "car should have a pressed floor button before disable"
    );

    sim.disable(elev.entity()).unwrap();
    assert!(
        sim.world().car_calls(elev.entity()).is_empty(),
        "disable must wipe car_calls so re-enable doesn't inherit stale presses"
    );
}

/// `disable(elevator)` notifies the group's dispatcher of the removal
/// so strategies with per-car state (SCAN/LOOK direction tracking)
/// clear it. Parallel to `remove_elevator` / `reassign_elevator_to_line`,
/// which already do this — `disable` was the odd one out.
#[test]
fn disable_elevator_notifies_dispatcher() {
    use crate::dispatch::{DispatchDecision, DispatchStrategy, RankContext};
    use std::sync::Arc;
    use std::sync::atomic::{AtomicUsize, Ordering};

    struct Counter {
        removed: Arc<AtomicUsize>,
    }
    impl DispatchStrategy for Counter {
        fn rank(&mut self, ctx: &RankContext<'_>) -> Option<f64> {
            Some((ctx.car_position - ctx.stop_position).abs())
        }
        fn notify_removed(&mut self, _elevator: EntityId) {
            self.removed.fetch_add(1, Ordering::Relaxed);
        }
        fn fallback(
            &mut self,
            _car: EntityId,
            _pos: f64,
            _group: &crate::dispatch::ElevatorGroup,
            _manifest: &crate::dispatch::DispatchManifest,
            _world: &crate::world::World,
        ) -> DispatchDecision {
            DispatchDecision::Idle
        }
    }

    let removed = Arc::new(AtomicUsize::new(0));
    let strategy = Counter {
        removed: Arc::clone(&removed),
    };
    let mut sim = crate::sim::Simulation::new(&default_config(), strategy).unwrap();
    let elev = ElevatorId::from(sim.world().elevator_ids()[0]);

    sim.disable(elev.entity()).unwrap();

    assert_eq!(
        removed.load(Ordering::Relaxed),
        1,
        "disable(elevator) must call DispatchStrategy::notify_removed exactly once"
    );
}

/// `remove_elevator` must call `notify_removed` exactly once, even
/// though it also invokes `disable()` as a subroutine. Pre-fix, the
/// notify hook would fire twice — once from `disable`, once from
/// `remove_elevator`'s own explicit call — which is safe for the
/// idempotent built-in strategies but violates the contract for
/// counting custom strategies.
#[test]
fn remove_elevator_notifies_dispatcher_exactly_once() {
    use crate::dispatch::{DispatchDecision, DispatchStrategy, RankContext};
    use std::sync::Arc;
    use std::sync::atomic::{AtomicUsize, Ordering};

    struct Counter {
        removed: Arc<AtomicUsize>,
    }
    impl DispatchStrategy for Counter {
        fn rank(&mut self, ctx: &RankContext<'_>) -> Option<f64> {
            Some((ctx.car_position - ctx.stop_position).abs())
        }
        fn notify_removed(&mut self, _elevator: EntityId) {
            self.removed.fetch_add(1, Ordering::Relaxed);
        }
        fn fallback(
            &mut self,
            _car: EntityId,
            _pos: f64,
            _group: &crate::dispatch::ElevatorGroup,
            _manifest: &crate::dispatch::DispatchManifest,
            _world: &crate::world::World,
        ) -> DispatchDecision {
            DispatchDecision::Idle
        }
    }

    let removed = Arc::new(AtomicUsize::new(0));
    let strategy = Counter {
        removed: Arc::clone(&removed),
    };
    let mut sim = crate::sim::Simulation::new(&default_config(), strategy).unwrap();
    let elev = ElevatorId::from(sim.world().elevator_ids()[0]);

    sim.remove_elevator(elev.entity()).unwrap();

    assert_eq!(
        removed.load(Ordering::Relaxed),
        1,
        "remove_elevator must call notify_removed exactly once despite invoking disable internally"
    );
}

// ── 6. Despawn cleanup ───────────────────────────────────────────────────────

/// `World::despawn` is now a low-level entity removal: it does not transition
/// aboard riders. Callers that despawn an elevator with riders aboard must
/// transition them first (via `Simulation::disable` / `remove_elevator`,
/// which route through the transition gateway). This test pins down that
/// new contract — the elevator entity is removed and the rider's stale
/// `Riding(eid)` reference points at a dead `EntityId`, but no silent
/// rider-phase rewrite happens behind the caller's back. The previous
/// behaviour (set rider to Waiting + nearest stop) couldn't keep
/// `RiderIndex` consistent, so it produced "ghost" riders. See
/// `api_surface_tests::remove_elevator_keeps_rider_index_coherent` for the
/// proper full-stack flow.
#[test]
fn despawn_elevator_does_not_silently_reset_aboard_riders() {
    let mut world = World::new();

    let stop = world.spawn();
    world.set_stop(
        stop,
        Stop {
            name: "Ground".into(),
            position: 0.0,
        },
    );
    world.set_position(stop, Position { value: 0.0 });

    let elev = world.spawn();
    world.set_position(elev, Position { value: 0.0 });
    world.set_velocity(elev, Velocity { value: 0.0 });
    world.set_elevator(
        elev,
        Elevator {
            phase: ElevatorPhase::Loading,
            door: DoorState::Closed,
            max_speed: Speed::from(2.0),
            acceleration: Accel::from(1.5),
            deceleration: Accel::from(2.0),
            weight_capacity: Weight::from(800.0),
            current_load: Weight::from(70.0),
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

    let rider = world.spawn();
    world.set_rider(
        rider,
        Rider {
            weight: Weight::from(70.0),
            phase: RiderPhase::Riding(elev),
            current_stop: None,
            spawn_tick: 0,
            tag: 0,
            board_tick: Some(1),
        },
    );
    world.elevator_mut(elev).unwrap().riders.push(rider);

    world.despawn(elev);

    assert!(!world.is_alive(elev));

    // The rider's phase is *not* silently rewritten by `World::despawn`;
    // it still says Riding(elev) (now a dead EntityId). The rider is
    // alive — only the elevator was removed. Cleaning this up is
    // `Simulation::remove_elevator`'s job, not `World::despawn`'s.
    assert_eq!(
        world.rider(rider).map(|r| r.phase),
        Some(RiderPhase::Riding(elev)),
        "World::despawn must not silently rewrite rider phase"
    );
    assert_eq!(world.rider(rider).and_then(|r| r.current_stop), None);
}

#[test]
fn despawn_rider_mid_transit_removes_from_elevator_load() {
    let mut world = World::new();

    let stop = world.spawn();
    world.set_stop(
        stop,
        Stop {
            name: "Ground".into(),
            position: 0.0,
        },
    );

    let elev = world.spawn();
    world.set_position(elev, Position { value: 0.0 });
    world.set_velocity(elev, Velocity { value: 0.0 });
    world.set_elevator(
        elev,
        Elevator {
            phase: ElevatorPhase::Loading,
            door: DoorState::Closed,
            max_speed: Speed::from(2.0),
            acceleration: Accel::from(1.5),
            deceleration: Accel::from(2.0),
            weight_capacity: Weight::from(800.0),
            current_load: Weight::from(70.0),
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

    let rider = world.spawn();
    world.set_rider(
        rider,
        Rider {
            weight: Weight::from(70.0),
            phase: RiderPhase::Riding(elev),
            current_stop: None,
            spawn_tick: 0,
            tag: 0,
            board_tick: Some(1),
        },
    );
    world.elevator_mut(elev).unwrap().riders.push(rider);

    // Despawn the rider.
    world.despawn(rider);

    let car = world.elevator(elev).unwrap();
    assert!(
        !car.riders.contains(&rider),
        "rider should be removed from elevator's riders list on despawn"
    );
    assert!(
        car.current_load.value().abs() < f64::EPSILON,
        "elevator current_load should decrease when rider despawns"
    );
}

// ── Route accessors used in preference test ──────────────────────────────────
// (verifies Route::direct exists and is usable, exercising the route component)

#[test]
fn route_direct_current_returns_single_leg() {
    let mut world = World::new();

    let from = world.spawn();
    world.set_stop(
        from,
        Stop {
            name: "A".into(),
            position: 0.0,
        },
    );

    let to = world.spawn();
    world.set_stop(
        to,
        Stop {
            name: "B".into(),
            position: 4.0,
        },
    );

    let rider = world.spawn();
    world.set_rider(
        rider,
        Rider {
            weight: Weight::from(60.0),
            phase: RiderPhase::Waiting,
            current_stop: Some(from),
            spawn_tick: 0,
            tag: 0,
            board_tick: None,
        },
    );
    world.set_route(rider, Route::direct(from, to, GroupId(0)));

    let route = world.route(rider).unwrap();
    assert_eq!(route.current_destination(), Some(to));
    assert!(!route.is_complete());
}

/// Verify weight-based rejection: riders over capacity are rejected, not boarded.
#[test]
fn weight_rejection_boundary() {
    use crate::events::Event;

    // 2 stops, 1 elevator with capacity 100.0.
    let config = crate::config::SimConfig {
        schema_version: crate::config::CURRENT_CONFIG_SCHEMA_VERSION,
        building: crate::config::BuildingConfig {
            name: "WeightTest".into(),
            stops: vec![
                crate::stop::StopConfig {
                    id: crate::stop::StopId(0),
                    name: "A".into(),
                    position: 0.0,
                },
                crate::stop::StopConfig {
                    id: crate::stop::StopId(1),
                    name: "B".into(),
                    position: 10.0,
                },
            ],
            lines: None,
            groups: None,
        },
        elevators: vec![crate::config::ElevatorConfig {
            id: 0,
            name: "E0".into(),
            max_speed: Speed::from(5.0),
            acceleration: Accel::from(3.0),
            deceleration: Accel::from(3.0),
            weight_capacity: Weight::from(100.0),
            starting_stop: crate::stop::StopId(0),
            door_open_ticks: 10,
            door_transition_ticks: 3,
            restricted_stops: Vec::new(),
            #[cfg(feature = "energy")]
            energy_profile: None,
            service_mode: None,
            inspection_speed_factor: 0.25,

            bypass_load_up_pct: None,

            bypass_load_down_pct: None,
        }],
        simulation: crate::config::SimulationParams {
            ticks_per_second: 60.0,
        },
        passenger_spawning: crate::config::PassengerSpawnConfig {
            mean_interval_ticks: 120,
            weight_range: (50.0, 100.0),
        },
    };

    let mut sim =
        crate::sim::Simulation::new(&config, crate::dispatch::scan::ScanDispatch::new()).unwrap();

    // Spawn rider1 (weight 60) and rider2 (weight 60) at stop 0 → stop 1.
    // Combined = 120, exceeds capacity 100. Only one should board.
    sim.spawn_rider(crate::stop::StopId(0), crate::stop::StopId(1), 60.0)
        .unwrap();
    sim.spawn_rider(crate::stop::StopId(0), crate::stop::StopId(1), 60.0)
        .unwrap();

    // Run enough ticks for loading to happen.
    for _ in 0..500 {
        sim.step();
    }

    let events = sim.drain_events();
    let has_rejection = events
        .iter()
        .any(|e| matches!(e, Event::RiderRejected { .. }));

    // At least one rider should be rejected due to weight.
    assert!(
        has_rejection,
        "Expected at least 1 rejection event due to weight capacity"
    );
}

/// Verify `PassingFloor` events are emitted when an elevator passes through stops.
#[test]
fn passing_floor_events_emitted() {
    use crate::events::Event;

    // Setup: 5 stops, elevator going from stop 0 (pos 0) to stop 4 (pos 40).
    // Should pass through stops 1-3 along the way.
    let config = crate::config::SimConfig {
        schema_version: crate::config::CURRENT_CONFIG_SCHEMA_VERSION,
        building: crate::config::BuildingConfig {
            name: "PassFloor".into(),
            stops: vec![
                crate::stop::StopConfig {
                    id: crate::stop::StopId(0),
                    name: "S0".into(),
                    position: 0.0,
                },
                crate::stop::StopConfig {
                    id: crate::stop::StopId(1),
                    name: "S1".into(),
                    position: 10.0,
                },
                crate::stop::StopConfig {
                    id: crate::stop::StopId(2),
                    name: "S2".into(),
                    position: 20.0,
                },
                crate::stop::StopConfig {
                    id: crate::stop::StopId(3),
                    name: "S3".into(),
                    position: 30.0,
                },
                crate::stop::StopConfig {
                    id: crate::stop::StopId(4),
                    name: "S4".into(),
                    position: 40.0,
                },
            ],
            lines: None,
            groups: None,
        },
        elevators: vec![crate::config::ElevatorConfig {
            id: 0,
            name: "E0".into(),
            max_speed: Speed::from(5.0),
            acceleration: Accel::from(2.0),
            deceleration: Accel::from(2.0),
            weight_capacity: Weight::from(800.0),
            starting_stop: crate::stop::StopId(0),
            door_open_ticks: 5,
            door_transition_ticks: 3,
            restricted_stops: Vec::new(),
            #[cfg(feature = "energy")]
            energy_profile: None,
            service_mode: None,
            inspection_speed_factor: 0.25,

            bypass_load_up_pct: None,

            bypass_load_down_pct: None,
        }],
        simulation: crate::config::SimulationParams {
            ticks_per_second: 60.0,
        },
        passenger_spawning: crate::config::PassengerSpawnConfig {
            mean_interval_ticks: 120,
            weight_range: (50.0, 100.0),
        },
    };

    let mut sim =
        crate::sim::Simulation::new(&config, crate::dispatch::scan::ScanDispatch::new()).unwrap();

    // Spawn a rider from stop 0 to stop 4 to trigger dispatch.
    sim.spawn_rider(crate::stop::StopId(0), crate::stop::StopId(4), 70.0)
        .unwrap();

    // Run enough ticks for the elevator to reach the destination.
    for _ in 0..2000 {
        sim.step();
    }

    let events = sim.drain_events();
    let passing_events: Vec<_> = events
        .iter()
        .filter(|e| matches!(e, Event::PassingFloor { .. }))
        .collect();

    // Should have passing events for stops 1, 2, 3 (the intermediate stops).
    assert!(
        passing_events.len() >= 3,
        "Expected at least 3 PassingFloor events, got {}",
        passing_events.len()
    );

    // Verify they're all moving_up = true.
    for event in &passing_events {
        if let Event::PassingFloor { moving_up, .. } = event {
            assert!(*moving_up, "Elevator should be moving up");
        }
    }
}
