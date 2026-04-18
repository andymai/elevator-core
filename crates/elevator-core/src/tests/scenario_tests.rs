use crate::components::RiderPhase;
use crate::components::Weight;
use crate::dispatch::DispatchStrategy;
use crate::dispatch::etd::EtdDispatch;
use crate::dispatch::look::LookDispatch;
use crate::dispatch::nearest_car::NearestCarDispatch;
use crate::dispatch::scan::ScanDispatch;
use crate::events::Event;
use crate::sim::Simulation;
use crate::stop::StopId;

use super::helpers::{all_riders_arrived, default_config, scan};

#[test]
fn single_rider_delivery() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    let max_ticks = 10_000;
    for _ in 0..max_ticks {
        sim.step();
        if all_riders_arrived(&sim) {
            break;
        }
    }

    assert!(all_riders_arrived(&sim));
    assert!(
        sim.current_tick() < max_ticks,
        "Should complete before timeout"
    );
}

#[test]
fn two_riders_opposite_directions() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.spawn_rider(StopId(2), StopId(0), 80.0).unwrap();

    let max_ticks = 20_000;
    for _ in 0..max_ticks {
        sim.step();
        if all_riders_arrived(&sim) {
            break;
        }
    }

    assert!(
        all_riders_arrived(&sim),
        "All riders should arrive. Phases: {:?}",
        sim.world()
            .iter_riders()
            .map(|(_, r)| r.phase)
            .collect::<Vec<_>>()
    );
    assert!(
        sim.current_tick() < max_ticks,
        "Should complete before timeout"
    );
}

#[test]
fn two_riders_exceeding_capacity_delivered_in_two_trips() {
    let mut config = default_config();
    config.elevators[0].weight_capacity = Weight::from(100.0);

    let mut sim = Simulation::new(&config, scan()).unwrap();
    sim.spawn_rider(StopId(0), StopId(1), 70.0).unwrap();
    sim.spawn_rider(StopId(0), StopId(1), 70.0).unwrap();

    let max_ticks = 20_000;
    for _ in 0..max_ticks {
        sim.step();
        sim.drain_events();
        if all_riders_arrived(&sim) {
            break;
        }
    }

    assert!(
        all_riders_arrived(&sim),
        "All riders should eventually arrive"
    );
}

#[test]
fn overweight_rider_rejected() {
    let mut config = default_config();
    config.elevators[0].weight_capacity = Weight::from(50.0);

    let mut sim = Simulation::new(&config, scan()).unwrap();
    let light = sim.spawn_rider(StopId(0), StopId(1), 40.0).unwrap();
    sim.spawn_rider(StopId(0), StopId(1), 60.0).unwrap();

    let mut all_events = Vec::new();
    let max_ticks = 20_000;
    for _ in 0..max_ticks {
        sim.step();
        all_events.extend(sim.drain_events());
        if sim.world().rider(light.entity()).map(|r| r.phase) == Some(RiderPhase::Arrived) {
            break;
        }
    }

    assert_eq!(
        sim.world().rider(light.entity()).map(|r| r.phase),
        Some(RiderPhase::Arrived)
    );

    let has_rejection = all_events
        .iter()
        .any(|e| matches!(e, Event::RiderRejected { .. }));
    assert!(
        has_rejection,
        "Should have at least one rejection for the 60kg rider"
    );
}

#[test]
fn events_are_emitted_in_order() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    sim.spawn_rider(StopId(0), StopId(1), 70.0).unwrap();

    let mut all_events = Vec::new();
    let max_ticks = 10_000;
    for _ in 0..max_ticks {
        sim.step();
        all_events.extend(sim.drain_events());
        if all_riders_arrived(&sim) {
            break;
        }
    }

    let event_names: Vec<&str> = all_events
        .iter()
        .map(|e| match e {
            Event::RiderSpawned { .. } => "spawned",
            Event::ElevatorDeparted { .. } => "departed",
            Event::ElevatorArrived { .. } => "arrived",
            Event::DoorOpened { .. } => "door_opened",
            Event::DoorClosed { .. } => "door_closed",
            Event::RiderBoarded { .. } => "boarded",
            Event::RiderExited { .. } => "exited",
            _ => "other",
        })
        .collect();

    assert!(event_names.contains(&"spawned"));
    assert!(event_names.contains(&"departed"));
    assert!(event_names.contains(&"arrived"));
    assert!(event_names.contains(&"door_opened"));
    assert!(event_names.contains(&"boarded"));
    assert!(event_names.contains(&"exited"));
    assert!(event_names.contains(&"door_closed"));

    let spawned_idx = event_names.iter().position(|e| *e == "spawned").unwrap();
    let boarded_idx = event_names.iter().position(|e| *e == "boarded").unwrap();
    assert!(
        spawned_idx < boarded_idx,
        "Spawned should come before boarded"
    );
}

/// Documented invariant (metrics-and-events.md): for any given rider,
/// `RiderBoarded` always fires before `RiderExited`. Exercised with multiple
/// riders so per-rider ordering is the actual thing being tested (a global
/// "any boarded before any exited" check would be weaker).
#[test]
fn rider_boarded_precedes_rider_exited_per_rider() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    let r1 = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    let r2 = sim.spawn_rider(StopId(2), StopId(0), 60.0).unwrap();
    let r3 = sim.spawn_rider(StopId(1), StopId(2), 65.0).unwrap();

    let mut boarded_at: std::collections::HashMap<_, usize> = std::collections::HashMap::new();
    let mut exited_at: std::collections::HashMap<_, usize> = std::collections::HashMap::new();
    let mut idx = 0usize;

    for _ in 0..20_000 {
        sim.step();
        for ev in sim.drain_events() {
            match ev {
                Event::RiderBoarded { rider, .. } => {
                    boarded_at.entry(rider).or_insert(idx);
                }
                Event::RiderExited { rider, .. } => {
                    exited_at.insert(rider, idx);
                }
                _ => {}
            }
            idx += 1;
        }
        if all_riders_arrived(&sim) {
            break;
        }
    }

    for rid in [r1, r2, r3] {
        let b = boarded_at
            .get(&rid.entity())
            .unwrap_or_else(|| panic!("rider {rid:?} never boarded"));
        let e = exited_at
            .get(&rid.entity())
            .unwrap_or_else(|| panic!("rider {rid:?} never exited"));
        assert!(
            b < e,
            "RiderBoarded (idx {b}) must precede RiderExited (idx {e}) for {rid:?}",
        );
    }
}

/// Documented invariant (metrics-and-events.md): for a given elevator visit
/// to a stop, `DoorOpened` always precedes the matching `DoorClosed`. Locks
/// this pairing down so future refactors can't silently violate it.
#[test]
fn door_opened_precedes_door_closed() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.spawn_rider(StopId(2), StopId(0), 60.0).unwrap();

    // Per-elevator open/close sequence; pairs must alternate open→close.
    let mut per_elevator: std::collections::HashMap<_, Vec<&'static str>> =
        std::collections::HashMap::new();

    for _ in 0..20_000 {
        sim.step();
        for ev in sim.drain_events() {
            match ev {
                Event::DoorOpened { elevator, .. } => {
                    per_elevator.entry(elevator).or_default().push("open");
                }
                Event::DoorClosed { elevator, .. } => {
                    per_elevator.entry(elevator).or_default().push("close");
                }
                _ => {}
            }
        }
        if all_riders_arrived(&sim) {
            break;
        }
    }

    assert!(!per_elevator.is_empty(), "expected at least one door event");
    for (eid, seq) in per_elevator {
        // Every even index must be "open", every odd "close" — strict pairing.
        for (i, kind) in seq.iter().enumerate() {
            let expected = if i % 2 == 0 { "open" } else { "close" };
            assert_eq!(
                *kind, expected,
                "elevator {eid:?} door sequence violated at index {i}: {seq:?}",
            );
        }
    }
}

#[test]
fn deterministic_replay() {
    let config = default_config();

    let mut sim1 = Simulation::new(&config, scan()).unwrap();
    sim1.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim1.spawn_rider(StopId(1), StopId(0), 60.0).unwrap();

    let mut ticks1 = 0u64;
    for _ in 0..20_000 {
        sim1.step();
        ticks1 += 1;
        if all_riders_arrived(&sim1) {
            break;
        }
    }

    let mut sim2 = Simulation::new(&config, scan()).unwrap();
    sim2.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim2.spawn_rider(StopId(1), StopId(0), 60.0).unwrap();

    let mut ticks2 = 0u64;
    for _ in 0..20_000 {
        sim2.step();
        ticks2 += 1;
        if all_riders_arrived(&sim2) {
            break;
        }
    }

    assert_eq!(
        ticks1, ticks2,
        "Deterministic simulation should take identical tick counts"
    );
}

// ── ETD full-car stall regression ───────────────────────────────────────────

/// Pre-fix, ETD would send a full car to any pickup stop whose only
/// demand it couldn't serve — and if that stop happened to be the car's
/// current position, the cost collapsed to zero and dispatch re-selected
/// it forever. The car would cycle `(door-open, reject, door-close)`,
/// never carrying its aboard rider to the destination.
///
/// Repro: small-capacity car, one rider it does carry, a second rider
/// waiting on-the-way whose weight exceeds remaining capacity. With the
/// bug the car parks at the pickup stop and never reaches the target.
#[test]
fn etd_full_car_delivers_aboard_rider_despite_unservable_pickup() {
    let mut config = default_config();
    // Capacity fits exactly one 70 kg rider.
    config.elevators[0].weight_capacity = Weight::from(100.0);

    let mut sim = Simulation::new(&config, EtdDispatch::new()).unwrap();
    // Rider A at stops[0] → stops[2]. Will board and fill the car.
    let a = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    // Rider B at stops[1] → stops[2]. Won't fit once A is aboard; the
    // call at stops[1] stays active until the car comes back empty.
    sim.spawn_rider(StopId(1), StopId(2), 70.0).unwrap();

    let max_ticks = 20_000;
    for _ in 0..max_ticks {
        sim.step();
        sim.drain_events();
        if sim.world().rider(a.entity()).map(|r| r.phase) == Some(RiderPhase::Arrived) {
            break;
        }
    }

    assert_eq!(
        sim.world().rider(a.entity()).map(|r| r.phase),
        Some(RiderPhase::Arrived),
        "aboard rider must reach their destination; ETD cannot stall the car \
         at a pickup stop it lacks capacity to serve"
    );
}

// ── Cross-strategy delivery safety ──────────────────────────────────────────

/// Delivery guarantee: in a traffic mix that *exposes* the full-car
/// self-assign stall (one 70 kg rider boards and saturates a 100 kg car,
/// then a 70 kg rider waits at every other floor), every built-in
/// strategy must still deliver both riders within a bounded tick count.
///
/// Runs SCAN, LOOK, `NearestCar`, and ETD through the same scenario so a
/// regression in any one of them shows up as a test failure at the
/// strategy that broke — not as a flaky timeout only hitting whichever
/// strategy happens to be default.
#[test]
fn every_builtin_strategy_eventually_delivers_all_riders() {
    fn run_with<S: DispatchStrategy + 'static>(name: &str, strategy: S) {
        let mut config = default_config();
        config.elevators[0].weight_capacity = Weight::from(100.0);
        let mut sim = Simulation::new(&config, strategy).unwrap();
        sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
        sim.spawn_rider(StopId(1), StopId(2), 70.0).unwrap();

        let max_ticks = 20_000;
        for _ in 0..max_ticks {
            sim.step();
            sim.drain_events();
            if all_riders_arrived(&sim) {
                break;
            }
        }

        assert!(
            all_riders_arrived(&sim),
            "{name} must deliver both riders; phases: {:?}",
            sim.world()
                .iter_riders()
                .map(|(_, r)| r.phase)
                .collect::<Vec<_>>()
        );
    }

    run_with("SCAN", ScanDispatch::new());
    run_with("LOOK", LookDispatch::new());
    run_with("NearestCar", NearestCarDispatch::new());
    run_with("ETD", EtdDispatch::new());
}

// ── ScenarioRunner — spawn ordering (#271) ───────────────────────────────────

/// `ScenarioRunner::new` must sort spawns by tick. Pre-fix, the cursor
/// advance in `tick()` would gate an earlier-tick spawn behind a
/// later-tick predecessor declared first in the vec, silently moving
/// the earlier rider to the later tick (#271).
#[test]
fn scenario_runner_sorts_out_of_order_spawns() {
    use crate::scenario::{Scenario, ScenarioRunner, TimedSpawn};

    let scenario = Scenario {
        name: "out-of-order".into(),
        config: default_config(),
        spawns: vec![
            TimedSpawn {
                tick: 10,
                origin: StopId(0),
                destination: StopId(2),
                weight: 70.0,
            },
            TimedSpawn {
                tick: 5,
                origin: StopId(0),
                destination: StopId(1),
                weight: 70.0,
            },
        ],
        conditions: vec![],
        max_ticks: 100,
    };

    let mut runner = ScenarioRunner::new(scenario, scan()).unwrap();

    // Step through to tick 5. Only the tick=5 spawn should have fired.
    for _ in 0..6 {
        runner.tick();
    }
    assert_eq!(
        runner.sim().metrics().total_spawned(),
        1,
        "only the tick=5 spawn should have happened by tick 5"
    );

    // Step to tick 10. Now the tick=10 spawn fires too.
    for _ in 0..5 {
        runner.tick();
    }
    assert_eq!(
        runner.sim().metrics().total_spawned(),
        2,
        "both spawns should have happened by tick 10"
    );

    let _ = Weight::from(70.0); // suppress unused-import warning
    let _: Option<Event> = None;
}
