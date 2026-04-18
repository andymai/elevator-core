//! Tests for `Simulation::waiting_direction_counts_at`.
//!
//! The method partitions waiting riders by route direction (up vs. down
//! relative to each rider's current stop). Rendering code uses it to draw
//! split up/down queues without digging into hall calls.

use crate::sim::Simulation;
use crate::stop::StopId;

use super::helpers::{default_config, scan};

#[test]
fn empty_stop_reports_zero_zero() {
    let config = default_config();
    let sim = Simulation::new(&config, scan()).unwrap();
    let ground = sim.stop_entity(StopId(0)).unwrap();
    assert_eq!(sim.waiting_direction_counts_at(ground), (0, 0));
}

#[test]
fn unknown_stop_reports_zero_zero() {
    let config = default_config();
    let sim = Simulation::new(&config, scan()).unwrap();
    // An unspawned entity id is a valid-looking `EntityId` the sim has never
    // seen — `stop(id)` returns `None`, so we should get `(0, 0)` rather
    // than panicking.
    let bogus = crate::entity::EntityId::default();
    assert_eq!(sim.waiting_direction_counts_at(bogus), (0, 0));
}

#[test]
fn partitions_by_route_direction() {
    // Lobby → Floor 3 is up. Floor 3 → Lobby is down. Helpers' default
    // config stops them at positions 0.0, 4.0, 8.0 — so one rider goes
    // up, one goes down.
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    let ground = sim.stop_entity(StopId(0)).unwrap();
    let top = sim.stop_entity(StopId(2)).unwrap();

    // Two riders going up from the lobby, one rider going down from the top.
    sim.spawn_rider(StopId(0), StopId(1), 70.0).unwrap();
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.spawn_rider(StopId(2), StopId(0), 70.0).unwrap();

    assert_eq!(sim.waiting_direction_counts_at(ground), (2, 0));
    assert_eq!(sim.waiting_direction_counts_at(top), (0, 1));
}

#[test]
fn sum_does_not_exceed_total_waiting() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    let ground = sim.stop_entity(StopId(0)).unwrap();

    for _ in 0..5 {
        sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    }
    for _ in 0..3 {
        sim.spawn_rider(StopId(0), StopId(1), 70.0).unwrap();
    }

    let (up, down) = sim.waiting_direction_counts_at(ground);
    assert_eq!(up + down, sim.waiting_count_at(ground));
    assert_eq!(up, 8);
    assert_eq!(down, 0);
}
