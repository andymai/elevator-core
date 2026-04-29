//! Per-elevator hard-pinned home stop.
//!
//! `set_elevator_home_stop` is a runtime override: when a car has a
//! pinned home stop, the reposition phase routes it there directly,
//! bypassing the group's reposition strategy. These tests pin the
//! contract end-to-end via `Simulation::step` so the override layer in
//! `systems::reposition::run` is exercised, not just the raw setter.

use crate::components::{Accel, ElevatorPhase, Speed, Weight};
use crate::config::{
    BuildingConfig, ElevatorConfig, GroupConfig, LineConfig, PassengerSpawnConfig, SimConfig,
    SimulationParams,
};
use crate::dispatch::reposition::{ReturnToLobby, SpreadEvenly};
use crate::dispatch::{BuiltinReposition, BuiltinStrategy};
use crate::entity::{ElevatorId, EntityId};
use crate::error::SimError;
use crate::ids::GroupId;
use crate::sim::Simulation;
use crate::stop::{StopConfig, StopId};
use crate::tests::helpers::{default_config, scan};

fn first_elevator(sim: &Simulation) -> ElevatorId {
    ElevatorId::from(sim.world().iter_elevators().next().unwrap().0)
}

/// Resolve [`StopId(idx)`] → [`EntityId`] via insertion order. Test
/// configs in this file always insert stops in id order, so the index
/// equals the `StopId` numeric value.
fn stop_entity(sim: &Simulation, id: StopId) -> EntityId {
    let idx = id.0 as usize;
    sim.world()
        .iter_stops()
        .nth(idx)
        .expect("stop index out of range")
        .0
}

#[test]
fn set_get_clear_round_trip() {
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    let elev = first_elevator(&sim);

    assert_eq!(sim.elevator_home_stop(elev).unwrap(), None);

    sim.set_elevator_home_stop(elev, StopId(2)).unwrap();
    let target = stop_entity(&sim, StopId(2));
    assert_eq!(sim.elevator_home_stop(elev).unwrap(), Some(target));

    sim.clear_elevator_home_stop(elev).unwrap();
    assert_eq!(sim.elevator_home_stop(elev).unwrap(), None);
}

#[test]
fn clear_is_idempotent_when_no_pin_set() {
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    let elev = first_elevator(&sim);

    // Two clears in a row, both Ok.
    sim.clear_elevator_home_stop(elev).unwrap();
    sim.clear_elevator_home_stop(elev).unwrap();
    assert_eq!(sim.elevator_home_stop(elev).unwrap(), None);
}

#[test]
fn pin_to_unknown_stop_id_returns_stop_not_found() {
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    let elev = first_elevator(&sim);

    let result = sim.set_elevator_home_stop(elev, StopId(99));
    assert!(matches!(result, Err(SimError::StopNotFound(_))));
}

#[test]
fn elevator_home_stop_errors_on_non_elevator_entity() {
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    // Use a stop entity id wrapped as an ElevatorId — this is the
    // exact misuse a buggy adapter could trigger.
    let stop_eid = stop_entity(&sim, StopId(0));
    let bogus = ElevatorId::from(stop_eid);

    assert!(matches!(
        sim.elevator_home_stop(bogus),
        Err(SimError::NotAnElevator(_))
    ));
    assert!(matches!(
        sim.set_elevator_home_stop(bogus, StopId(0)),
        Err(SimError::NotAnElevator(_))
    ));
    assert!(matches!(
        sim.clear_elevator_home_stop(bogus),
        Err(SimError::NotAnElevator(_))
    ));
}

#[test]
fn pin_to_stop_not_served_by_line_returns_invalid_config() {
    // Two lines: Low (stops 0+1), High (stops 1+2). Pinning the Low
    // car to stop 2 (High-only) must fail loudly — silently dropping
    // the request would let a buggy adapter strand cars at stops they
    // can't physically reach.
    let config = two_line_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    // L1 is on the Low line; pin it to stop 2 (High-only).
    let l1 = sim
        .world()
        .iter_elevators()
        .map(|(eid, _, _)| ElevatorId::from(eid))
        .next()
        .unwrap();

    let err = sim.set_elevator_home_stop(l1, StopId(2)).unwrap_err();
    let SimError::InvalidConfig { field, .. } = err else {
        panic!("expected InvalidConfig, got {err:?}");
    };
    assert_eq!(field, "home_stop");
}

#[test]
fn pinned_idle_car_routes_home_each_tick() {
    // 3 stops, 1 car, Span strategy = SpreadEvenly. Without a pin,
    // SpreadEvenly might park the car at index 1 (middle). Pin it to
    // stop 2 and run until idle — it must end up there.
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    sim.set_reposition(
        GroupId(0),
        Box::new(SpreadEvenly),
        BuiltinReposition::SpreadEvenly,
    );

    let elev = first_elevator(&sim);
    let target = stop_entity(&sim, StopId(2));
    sim.set_elevator_home_stop(elev, StopId(2)).unwrap();

    // Run enough ticks for the reposition phase to act and the car
    // to physically reach the home stop. 3-stop demo at 60Hz with
    // max_speed 2.0 needs roughly 120 ticks for an 8-unit trip.
    for _ in 0..400 {
        sim.step();
    }

    let car_pos = sim
        .world()
        .position(elev.entity())
        .map(|p| p.value)
        .unwrap();
    let home_pos = sim.world().stop_position(target).unwrap();
    assert!(
        (car_pos - home_pos).abs() < 1e-3,
        "pinned car should park at home stop ({home_pos}); got {car_pos}"
    );
}

#[test]
fn pin_overrides_strategy_decision() {
    // ReturnToLobby would send everyone to stop 0; pin the car to
    // stop 1 and assert the override beats the strategy.
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    sim.set_reposition(
        GroupId(0),
        Box::new(ReturnToLobby::new()),
        BuiltinReposition::ReturnToLobby,
    );

    let elev = first_elevator(&sim);
    sim.set_elevator_home_stop(elev, StopId(1)).unwrap();

    for _ in 0..400 {
        sim.step();
    }

    let car_pos = sim
        .world()
        .position(elev.entity())
        .map(|p| p.value)
        .unwrap();
    let s1 = stop_entity(&sim, StopId(1));
    let pinned_pos = sim.world().stop_position(s1).unwrap();
    assert!(
        (car_pos - pinned_pos).abs() < 1e-3,
        "pin must beat ReturnToLobby; expected pos {pinned_pos}, got {car_pos}"
    );
}

#[test]
fn clearing_pin_returns_strategy_control() {
    // With ReturnToLobby and no pin, the car returns to stop 0.
    // Pin to stop 2, clear, then verify the strategy retakes
    // control and parks the car at stop 0.
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    sim.set_reposition(
        GroupId(0),
        Box::new(ReturnToLobby::new()),
        BuiltinReposition::ReturnToLobby,
    );

    let elev = first_elevator(&sim);
    sim.set_elevator_home_stop(elev, StopId(2)).unwrap();
    // 400 ticks: enough time for the car to actually reach stop 2.
    // Clearing the pin mid-flight wouldn't prove the override is
    // gone — the in-flight reposition continues to its target. We
    // need the car to settle at home first, then clear, then watch
    // the strategy retake control.
    for _ in 0..400 {
        sim.step();
    }
    sim.clear_elevator_home_stop(elev).unwrap();
    // Now ReturnToLobby kicks in next reposition pass and pulls the
    // car all the way back to stop 0. 600 more ticks gives plenty of
    // runway for the round-trip.
    for _ in 0..600 {
        sim.step();
    }

    let car_pos = sim
        .world()
        .position(elev.entity())
        .map(|p| p.value)
        .unwrap();
    let s0 = stop_entity(&sim, StopId(0));
    let lobby_pos = sim.world().stop_position(s0).unwrap();
    assert!(
        (car_pos - lobby_pos).abs() < 1e-3,
        "after clearing pin, ReturnToLobby should retake control; \
         expected {lobby_pos}, got {car_pos}"
    );
}

#[test]
fn unpinned_cars_still_use_strategy_when_one_car_is_pinned() {
    // Two cars on one line. Pin one, leave the other under SpreadEvenly.
    // The unpinned car must still get a strategy decision (otherwise the
    // override pool surgery accidentally hides the rest of the cars).
    let config = two_car_one_line_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    // ReturnToLobby is fully deterministic — it will send any
    // unpinned car to stop 0. So the load-bearing fact is "the
    // unpinned car still gets routed home by the strategy" while the
    // pinned car ignores ReturnToLobby and sits at stop 2. Without
    // the strategy_pool surgery in `systems::reposition::run`, the
    // unpinned car would either be pinned by accident or never get
    // a strategy decision.
    sim.set_reposition(
        GroupId(0),
        Box::new(ReturnToLobby::new()),
        BuiltinReposition::ReturnToLobby,
    );

    let elev_eids: Vec<EntityId> = sim
        .world()
        .iter_elevators()
        .map(|(eid, _, _)| eid)
        .collect();
    let car_a = ElevatorId::from(elev_eids[0]);
    let car_b = ElevatorId::from(elev_eids[1]);

    sim.set_elevator_home_stop(car_a, StopId(2)).unwrap();
    let s0 = stop_entity(&sim, StopId(0));
    let s2 = stop_entity(&sim, StopId(2));
    let s0_pos = sim.world().stop_position(s0).unwrap();
    let s2_pos = sim.world().stop_position(s2).unwrap();

    for _ in 0..600 {
        sim.step();
    }

    let pos_a = sim.world().position(car_a.entity()).unwrap().value;
    let pos_b = sim.world().position(car_b.entity()).unwrap().value;

    assert!(
        (pos_a - s2_pos).abs() < 1e-3,
        "pinned car A should be at stop 2 ({s2_pos}); got {pos_a}"
    );
    assert!(
        (pos_b - s0_pos).abs() < 1e-3,
        "unpinned car B should be at the strategy's lobby ({s0_pos}); \
         got {pos_b}. If this is car A's home (8.0), the override pool \
         surgery accidentally hid car B from the strategy."
    );
}

#[test]
fn home_stop_survives_snapshot_round_trip() {
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    let elev = first_elevator(&sim);
    sim.set_elevator_home_stop(elev, StopId(2)).unwrap();
    let target = stop_entity(&sim, StopId(2));

    let bytes = sim.snapshot_bytes().expect("snapshot");
    let restored = Simulation::restore_bytes(&bytes, None).expect("restore");

    assert_eq!(restored.elevator_home_stop(elev).unwrap(), Some(target));
}

#[test]
fn already_at_home_does_not_reposition_redundantly() {
    // Pin a car to stop 0 (its starting stop). The override should
    // not emit a reposition decision — the car is already there. This
    // is the 1e-6 epsilon path; without it we'd churn a cycle every
    // reposition tick.
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    let elev = first_elevator(&sim);
    sim.set_elevator_home_stop(elev, StopId(0)).unwrap();

    // One reposition pass. After this the car should still be Idle
    // (not Repositioning), proving no redundant decision was emitted.
    for _ in 0..30 {
        sim.step();
    }
    let phase = sim.world().elevator(elev.entity()).unwrap().phase();
    assert_eq!(
        phase,
        ElevatorPhase::Idle,
        "car already at home must not be redirected back; got phase {phase:?}"
    );
}

// ── Multi-line config helpers ────────────────────────────────────────

/// Two lines: Low (stops 0+1), High (stops 1+2). One car per line in
/// distinct dispatch groups. Used to test cross-line pin rejection.
fn two_line_config() -> SimConfig {
    SimConfig {
        building: BuildingConfig {
            name: "Two Lines".into(),
            stops: vec![
                StopConfig {
                    id: StopId(0),
                    name: "Ground".into(),
                    position: 0.0,
                },
                StopConfig {
                    id: StopId(1),
                    name: "Transfer".into(),
                    position: 4.0,
                },
                StopConfig {
                    id: StopId(2),
                    name: "Top".into(),
                    position: 8.0,
                },
            ],
            lines: Some(vec![
                LineConfig {
                    id: 1,
                    name: "Low".into(),
                    serves: vec![StopId(0), StopId(1)],
                    elevators: vec![bare_elevator(1, "L1", StopId(0))],
                    ..Default::default()
                },
                LineConfig {
                    id: 2,
                    name: "High".into(),
                    serves: vec![StopId(1), StopId(2)],
                    elevators: vec![bare_elevator(2, "H1", StopId(1))],
                    ..Default::default()
                },
            ]),
            groups: Some(vec![
                GroupConfig {
                    id: 0,
                    name: "Low Rise".into(),
                    lines: vec![1],
                    dispatch: BuiltinStrategy::Scan,
                    reposition: Some(BuiltinReposition::SpreadEvenly),
                    hall_call_mode: None,
                    ack_latency_ticks: None,
                },
                GroupConfig {
                    id: 1,
                    name: "High Rise".into(),
                    lines: vec![2],
                    dispatch: BuiltinStrategy::Scan,
                    reposition: Some(BuiltinReposition::SpreadEvenly),
                    hall_call_mode: None,
                    ack_latency_ticks: None,
                },
            ]),
        },
        elevators: vec![],
        simulation: SimulationParams {
            ticks_per_second: 60.0,
        },
        passenger_spawning: PassengerSpawnConfig {
            mean_interval_ticks: 120,
            weight_range: (50.0, 100.0),
        },
    }
}

/// Three stops on one line, two cars in the same group. Used to test
/// that the unpinned car still receives a strategy decision when one
/// car is pinned.
fn two_car_one_line_config() -> SimConfig {
    SimConfig {
        building: BuildingConfig {
            name: "Two Cars".into(),
            stops: vec![
                StopConfig {
                    id: StopId(0),
                    name: "Ground".into(),
                    position: 0.0,
                },
                StopConfig {
                    id: StopId(1),
                    name: "Mid".into(),
                    position: 4.0,
                },
                StopConfig {
                    id: StopId(2),
                    name: "Top".into(),
                    position: 8.0,
                },
            ],
            lines: None,
            groups: None,
        },
        elevators: vec![
            bare_elevator(1, "A", StopId(0)),
            bare_elevator(2, "B", StopId(1)),
        ],
        simulation: SimulationParams {
            ticks_per_second: 60.0,
        },
        passenger_spawning: PassengerSpawnConfig {
            mean_interval_ticks: 120,
            weight_range: (50.0, 100.0),
        },
    }
}

fn bare_elevator(id: u32, name: &str, starting: StopId) -> ElevatorConfig {
    ElevatorConfig {
        id,
        name: name.into(),
        max_speed: Speed::from(2.0),
        acceleration: Accel::from(1.5),
        deceleration: Accel::from(2.0),
        weight_capacity: Weight::from(800.0),
        starting_stop: starting,
        door_open_ticks: 10,
        door_transition_ticks: 5,
        restricted_stops: Vec::new(),
        #[cfg(feature = "energy")]
        energy_profile: None,
        service_mode: None,
        inspection_speed_factor: 0.25,
        bypass_load_up_pct: None,
        bypass_load_down_pct: None,
    }
}
