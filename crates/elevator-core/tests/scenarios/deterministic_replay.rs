//! Deterministic replay tests.
//!
//! The crate documents itself as a "deterministic fixed-timestep simulation".
//! This test exercises that promise end-to-end: build an identical scenario
//! twice, run identical inputs, and assert the full event stream and metrics
//! match byte-for-byte. A regression that slips `HashMap` into an iteration
//! path, or any other non-deterministic order, will fail here.
//!
//! Avoids the `traffic` feature — riders are spawned at hard-coded ticks
//! so the test is independent of `rand`.

#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use elevator_core::components::{Accel, Speed, Weight};
use elevator_core::config::ElevatorConfig;
use elevator_core::dispatch::etd::EtdDispatch;
use elevator_core::prelude::*;

/// A rider spawn scheduled at a specific tick.
struct ScheduledSpawn {
    tick: u64,
    origin: StopId,
    destination: StopId,
    weight: f64,
}

/// The fixed spawn schedule both runs use.
fn schedule() -> Vec<ScheduledSpawn> {
    vec![
        ScheduledSpawn {
            tick: 0,
            origin: StopId(0),
            destination: StopId(2),
            weight: 72.0,
        },
        ScheduledSpawn {
            tick: 0,
            origin: StopId(0),
            destination: StopId(1),
            weight: 85.0,
        },
        ScheduledSpawn {
            tick: 15,
            origin: StopId(2),
            destination: StopId(0),
            weight: 68.0,
        },
        ScheduledSpawn {
            tick: 60,
            origin: StopId(1),
            destination: StopId(2),
            weight: 90.0,
        },
        ScheduledSpawn {
            tick: 120,
            origin: StopId(0),
            destination: StopId(2),
            weight: 75.0,
        },
        ScheduledSpawn {
            tick: 240,
            origin: StopId(2),
            destination: StopId(1),
            weight: 65.0,
        },
        ScheduledSpawn {
            tick: 500,
            origin: StopId(0),
            destination: StopId(2),
            weight: 80.0,
        },
        ScheduledSpawn {
            tick: 900,
            origin: StopId(1),
            destination: StopId(0),
            weight: 70.0,
        },
        ScheduledSpawn {
            tick: 1500,
            origin: StopId(2),
            destination: StopId(0),
            weight: 88.0,
        },
        ScheduledSpawn {
            tick: 2100,
            origin: StopId(0),
            destination: StopId(1),
            weight: 62.0,
        },
    ]
}

/// Build an identical simulation from scratch.
///
/// Three stops, two elevators in one group using ETD dispatch — meaningful
/// enough that a divergence in iteration order would produce different
/// assignments.
fn build_sim() -> Simulation {
    let car = |id: u32, name: &str| ElevatorConfig {
        id,
        name: name.into(),
        max_speed: Speed::from(2.0),
        acceleration: Accel::from(1.5),
        deceleration: Accel::from(2.0),
        weight_capacity: Weight::from(800.0),
        starting_stop: StopId(0),
        door_open_ticks: 10,
        door_transition_ticks: 5,
        restricted_stops: Vec::new(),
        #[cfg(feature = "energy")]
        energy_profile: None,
        service_mode: None,
        inspection_speed_factor: 0.25,

        bypass_load_up_pct: None,

        bypass_load_down_pct: None,
    };

    SimulationBuilder::new()
        .stops(vec![
            elevator_core::stop::StopConfig {
                id: StopId(0),
                name: "Ground".into(),
                position: 0.0,
            },
            elevator_core::stop::StopConfig {
                id: StopId(1),
                name: "Mezzanine".into(),
                position: 6.0,
            },
            elevator_core::stop::StopConfig {
                id: StopId(2),
                name: "Roof".into(),
                position: 18.0,
            },
        ])
        .elevators(vec![car(0, "East"), car(1, "West")])
        .dispatch(EtdDispatch::new())
        .build()
        .unwrap()
}

/// Outcome of running the scheduled scenario once.
///
/// `snapshot_bytes` is the postcard-serialised world state at the
/// final tick — the broadest determinism surface we can compare. The
/// event stream and scalar metrics catch most divergence, but any
/// world state that doesn't make it into an event (e.g. internal
/// `RiderIndex` ordering, dispatcher scratch, queued destinations)
/// only shows up here.
struct RunOutcome {
    events: Vec<Event>,
    metrics: Metrics,
    snapshot_bytes: Vec<u8>,
}

/// Run the scheduled scenario for `total_ticks` and collect all events,
/// the final metrics, and the final serialised snapshot.
fn run(total_ticks: u64) -> RunOutcome {
    let mut sim = build_sim();
    let mut schedule = schedule();
    schedule.sort_by_key(|s| s.tick); // deterministic ordering

    let mut collected: Vec<Event> = Vec::new();

    for tick in 0..total_ticks {
        // Spawn all riders whose scheduled tick is this tick.
        for spawn in schedule.iter().filter(|s| s.tick == tick) {
            sim.spawn_rider(spawn.origin, spawn.destination, spawn.weight)
                .unwrap();
        }

        sim.step();
        collected.extend(sim.drain_events());
    }

    let snapshot_bytes = sim
        .snapshot_bytes()
        .expect("snapshot_bytes must succeed on a quiescent sim");

    RunOutcome {
        events: collected,
        metrics: sim.metrics().clone(),
        snapshot_bytes,
    }
}

#[test]
fn event_stream_is_deterministic_across_runs() {
    let RunOutcome {
        events: events_a,
        metrics: metrics_a,
        ..
    } = run(5_000);
    let RunOutcome {
        events: events_b,
        metrics: metrics_b,
        ..
    } = run(5_000);

    assert_eq!(
        events_a.len(),
        events_b.len(),
        "event count diverged between runs (A={}, B={})",
        events_a.len(),
        events_b.len(),
    );

    // Compare element-by-element so any divergence pins down the offending
    // tick/event rather than just reporting "vectors unequal".
    for (idx, (a, b)) in events_a.iter().zip(events_b.iter()).enumerate() {
        assert_eq!(a, b, "event at index {idx} diverged: {a:?} vs {b:?}");
    }

    assert_eq!(
        metrics_a.total_delivered(),
        metrics_b.total_delivered(),
        "total_delivered diverged"
    );
    assert_eq!(
        metrics_a.total_abandoned(),
        metrics_b.total_abandoned(),
        "total_abandoned diverged"
    );
    assert_eq!(
        metrics_a.total_moves(),
        metrics_b.total_moves(),
        "total_moves diverged"
    );
    assert_eq!(
        metrics_a.max_wait_time(),
        metrics_b.max_wait_time(),
        "max_wait_time diverged"
    );
    // Distance is an f64 accumulator; exact equality is the right check for
    // determinism because both runs execute the same additions in the same order.
    assert_eq!(
        metrics_a.total_distance().to_bits(),
        metrics_b.total_distance().to_bits(),
        "total_distance diverged"
    );
    assert_eq!(
        metrics_a.avg_wait_time().to_bits(),
        metrics_b.avg_wait_time().to_bits(),
        "avg_wait_time diverged"
    );
}

#[test]
fn scenario_actually_exercises_the_sim() {
    // Sanity-check that the fixture isn't vacuously deterministic — we need
    // boards, deliveries, and movement to actually happen for the above
    // test to be meaningful.
    let RunOutcome {
        events, metrics, ..
    } = run(5_000);

    assert!(
        events
            .iter()
            .any(|e| matches!(e, Event::RiderBoarded { .. })),
        "expected at least one RiderBoarded event"
    );
    assert!(
        events
            .iter()
            .any(|e| matches!(e, Event::RiderExited { .. })),
        "expected at least one RiderExited event"
    );
    assert!(
        metrics.total_delivered() >= 8,
        "expected at least 8 deliveries, got {}",
        metrics.total_delivered()
    );
    assert!(metrics.total_distance() > 0.0, "expected elevators to move");
}

#[test]
fn snapshot_bytes_are_deterministic_across_runs() {
    // The strongest determinism assertion we can make in-process: two
    // independent runs of the same scenario produce byte-identical
    // postcard-serialised snapshots. This catches divergence in any
    // serialised field the per-event / scalar-metric checks above
    // would miss — internal map iteration order, dispatcher scratch,
    // destination queues, hall-call assignment tables, etc.
    //
    // If this fires but `event_stream_is_deterministic_across_runs`
    // passes, the bug is in something that round-trips through
    // `snapshot()` but never emits an `Event` — start by diffing the
    // two byte streams to locate the first diverging field.
    let a = run(5_000);
    let b = run(5_000);

    assert_eq!(
        a.snapshot_bytes.len(),
        b.snapshot_bytes.len(),
        "snapshot byte length diverged (A={}, B={})",
        a.snapshot_bytes.len(),
        b.snapshot_bytes.len(),
    );
    assert_eq!(
        a.snapshot_bytes, b.snapshot_bytes,
        "snapshot bytes diverged between two runs of the same scenario",
    );
}
