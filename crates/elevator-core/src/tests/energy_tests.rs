#![cfg(feature = "energy")]

use crate::config::*;
use crate::energy::EnergyProfile;
use crate::events::Event;
use crate::stop::StopId;
use crate::tests::helpers;

/// Build a config whose first elevator has the given energy profile.
fn config_with_energy(profile: EnergyProfile) -> SimConfig {
    let mut cfg = helpers::default_config();
    cfg.elevators[0].energy_profile = Some(profile);
    cfg
}

/// Default energy profile for tests.
fn default_profile() -> EnergyProfile {
    EnergyProfile::new(1.0, 5.0, 0.1, 0.3)
}

#[test]
fn idle_energy_consumption() {
    let cfg = config_with_energy(default_profile());
    let mut sim = crate::sim::Simulation::new(&cfg, helpers::scan()).unwrap();

    for _ in 0..100 {
        sim.step();
    }

    let elevator_ids = sim.world().elevator_ids();
    let eid = elevator_ids[0];
    let metrics = sim.world().energy_metrics(eid).unwrap();

    // 100 ticks idle at 1.0 per tick = 100.0 consumed
    let expected_consumed = 100.0 * default_profile().idle_cost_per_tick;
    assert!(
        (metrics.total_consumed() - expected_consumed).abs() < 1e-6,
        "expected consumed ~{expected_consumed}, got {}",
        metrics.total_consumed()
    );
    assert!(
        metrics.total_regenerated().abs() < 1e-6,
        "expected zero regen while idle, got {}",
        metrics.total_regenerated()
    );
}

#[test]
fn moving_energy_includes_weight_factor() {
    let cfg = config_with_energy(default_profile());
    let mut sim = crate::sim::Simulation::new(&cfg, helpers::scan()).unwrap();

    // Spawn a rider going up so the elevator moves.
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 75.0)
        .unwrap();

    // Run enough ticks for the elevator to start moving.
    let mut found_moving_energy = false;
    for _ in 0..500 {
        sim.step();
        for event in sim.drain_events() {
            if let Event::EnergyConsumed { consumed, .. } = &event {
                let c: f64 = (*consumed).into();
                if c > default_profile().idle_cost_per_tick + 0.01 {
                    found_moving_energy = true;
                }
            }
        }
    }

    assert!(
        found_moving_energy,
        "expected at least one tick with consumed > idle_cost (elevator should move with load)"
    );
}

#[test]
fn regen_on_descent() {
    // Elevator starts at top stop (Floor 3), rider goes down to Ground.
    let profile = EnergyProfile::new(1.0, 5.0, 0.1, 0.3);
    let mut cfg = helpers::default_config();
    cfg.elevators[0].starting_stop = StopId(2); // Start at top
    cfg.elevators[0].energy_profile = Some(profile);

    let mut sim = crate::sim::Simulation::new(&cfg, helpers::scan()).unwrap();

    // Spawn rider going down.
    sim.spawn_rider_by_stop_id(StopId(2), StopId(0), 75.0)
        .unwrap();

    let mut total_regen = 0.0;
    for _ in 0..500 {
        sim.step();
        for event in sim.drain_events() {
            if let Event::EnergyConsumed { regenerated, .. } = &event {
                let r: f64 = (*regenerated).into();
                total_regen += r;
            }
        }
    }

    assert!(
        total_regen > 0.0,
        "expected regeneration on descent, got {total_regen}"
    );
}

#[test]
fn regen_factor_zero_no_regen() {
    let profile = EnergyProfile::new(1.0, 5.0, 0.1, 0.0); // regen_factor = 0
    let mut cfg = helpers::default_config();
    cfg.elevators[0].starting_stop = StopId(2);
    cfg.elevators[0].energy_profile = Some(profile);

    let mut sim = crate::sim::Simulation::new(&cfg, helpers::scan()).unwrap();

    sim.spawn_rider_by_stop_id(StopId(2), StopId(0), 75.0)
        .unwrap();

    for _ in 0..500 {
        sim.step();
    }

    let elevator_ids = sim.world().elevator_ids();
    let eid = elevator_ids[0];
    let metrics = sim.world().energy_metrics(eid).unwrap();

    assert!(
        metrics.total_regenerated().abs() < 1e-6,
        "expected zero regen with regen_factor=0, got {}",
        metrics.total_regenerated()
    );
}

#[test]
fn no_profile_no_metrics() {
    // Default config without energy profile.
    let cfg = helpers::default_config();
    let sim = crate::sim::Simulation::new(&cfg, helpers::scan()).unwrap();

    let elevator_ids = sim.world().elevator_ids();
    let eid = elevator_ids[0];

    assert!(
        sim.world().energy_profile(eid).is_none(),
        "should have no energy profile"
    );
    assert!(
        sim.world().energy_metrics(eid).is_none(),
        "should have no energy metrics"
    );
}

#[test]
fn aggregate_metrics_match() {
    let cfg = config_with_energy(default_profile());
    let mut sim = crate::sim::Simulation::new(&cfg, helpers::scan()).unwrap();

    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 75.0)
        .unwrap();

    for _ in 0..300 {
        sim.step();
    }

    let elevator_ids = sim.world().elevator_ids();
    let eid = elevator_ids[0];
    let per_elev = sim.world().energy_metrics(eid).unwrap();

    let global = sim.metrics();
    assert!(
        (global.total_energy_consumed() - per_elev.total_consumed()).abs() < 1e-6,
        "global consumed {} != per-elevator consumed {}",
        global.total_energy_consumed(),
        per_elev.total_consumed()
    );
    assert!(
        (global.total_energy_regenerated() - per_elev.total_regenerated()).abs() < 1e-6,
        "global regenerated {} != per-elevator regenerated {}",
        global.total_energy_regenerated(),
        per_elev.total_regenerated()
    );
}

#[test]
fn energy_consumed_events_emitted() {
    let cfg = config_with_energy(default_profile());
    let mut sim = crate::sim::Simulation::new(&cfg, helpers::scan()).unwrap();

    sim.step();
    let events = sim.drain_events();
    let energy_events: Vec<_> = events
        .iter()
        .filter(|e| matches!(e, Event::EnergyConsumed { .. }))
        .collect();

    assert!(
        !energy_events.is_empty(),
        "expected at least one EnergyConsumed event per tick"
    );
}
