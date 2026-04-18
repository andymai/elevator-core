//! Tests for [`crate::arrival_log::ArrivalLog`] and its exposure through
//! [`DispatchManifest::arrivals_at`].
//!
//! Real elevator controllers observe recent arrival rates per floor to
//! switch modes (up-peak, down-peak) and to pre-position idle cars
//! (predictive parking). This module pins the core data structure that
//! surfaces that signal to strategies.

use crate::arrival_log::ArrivalLog;
use crate::sim::Simulation;
use crate::stop::StopId;
use crate::world::World;

use super::helpers::{default_config, scan};

#[test]
fn arrival_log_counts_events_within_window() {
    let mut world = World::new();
    let stop_a = world.spawn();
    let stop_b = world.spawn();

    let mut log = ArrivalLog::default();
    log.record(100, stop_a);
    log.record(150, stop_a);
    log.record(200, stop_b);
    log.record(300, stop_a);

    // Window of 200 ticks ending at tick 300 covers [100, 300].
    assert_eq!(log.arrivals_in_window(stop_a, 300, 200), 3);
    assert_eq!(log.arrivals_in_window(stop_b, 300, 200), 1);

    // Narrow window of 150 ticks ending at tick 300 covers [150, 300].
    assert_eq!(log.arrivals_in_window(stop_a, 300, 150), 2);

    // Window of 0 → empty.
    assert_eq!(log.arrivals_in_window(stop_a, 300, 0), 0);
}

#[test]
fn arrival_log_prunes_old_events() {
    let mut world = World::new();
    let stop = world.spawn();

    let mut log = ArrivalLog::default();
    for tick in 0..1_000u64 {
        log.record(tick, stop);
    }
    log.prune_before(900);

    // After pruning everything before tick 900, only [900, 999] remain.
    assert_eq!(log.arrivals_in_window(stop, 999, 1_000), 100);
    assert_eq!(log.arrivals_in_window(stop, 999, 200), 100);
}

#[test]
fn simulation_records_spawns_in_arrival_log() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    let origin = sim.stop_entity(StopId(0)).unwrap();
    let _ = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    let _ = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    // Both spawns land at tick 0 → a generous window centered on the
    // current tick must find them both.
    let count = sim
        .world()
        .resource::<ArrivalLog>()
        .expect("ArrivalLog resource must be registered at construction")
        .arrivals_in_window(origin, sim.current_tick(), 60);
    assert_eq!(count, 2);
}

#[test]
fn dispatch_manifest_exposes_recent_arrivals() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    let origin = sim.stop_entity(StopId(0)).unwrap();
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    // Advance a few ticks so the sim builds its own manifest.
    for _ in 0..5 {
        sim.step();
    }

    // Peek the manifest the dispatch phase would see this tick.
    let manifest = sim.peek_dispatch_manifest();
    assert_eq!(
        manifest.arrivals_at(origin),
        2,
        "manifest must surface recent-arrival counts for strategies"
    );
    // A stop with no spawns reports zero (not missing / not panic).
    let other = sim.stop_entity(StopId(2)).unwrap();
    assert_eq!(manifest.arrivals_at(other), 0);
}
