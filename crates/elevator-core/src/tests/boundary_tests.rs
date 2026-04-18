//! Boundary-value tests for edge cases.

use crate::components::{Patience, Preferences, RiderPhase};
use crate::dispatch::scan::ScanDispatch;
use crate::events::Event;
use crate::sim::Simulation;
use crate::stop::StopId;
use crate::tests::helpers::default_config;

#[test]
fn patience_zero_abandons_immediately() {
    let config = default_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.world_mut().set_patience(
        rider.entity(),
        Patience {
            max_wait_ticks: 0,
            waited_ticks: 0,
        },
    );

    // After 1 step, rider should abandon (max_wait_ticks=0 means abandon on first patience check).
    sim.step();

    let phase = sim.world().rider(rider.entity()).map(|r| r.phase);
    assert_eq!(
        phase,
        Some(RiderPhase::Abandoned),
        "rider with max_wait_ticks=0 should abandon immediately"
    );
}

#[test]
fn patience_one_survives_first_tick_then_abandons() {
    // `max_wait_ticks=N` means "tolerate N ticks of waiting, then abandon."
    // `waited_ticks` is incremented after the abandon check, so the rider
    // survives the first tick (waited=0) and abandons on the second
    // (waited=1, which equals max=1).
    let config = default_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.world_mut().set_patience(
        rider.entity(),
        Patience {
            max_wait_ticks: 1,
            waited_ticks: 0,
        },
    );

    sim.step();
    assert_eq!(
        sim.world().rider(rider.entity()).map(|r| r.phase),
        Some(RiderPhase::Waiting),
        "rider with max_wait_ticks=1 should survive the first tick"
    );

    sim.step();
    assert_eq!(
        sim.world().rider(rider.entity()).map(|r| r.phase),
        Some(RiderPhase::Abandoned),
        "rider with max_wait_ticks=1 should abandon after one tick of waiting"
    );
}

#[test]
fn patience_two_survives_two_ticks_then_abandons() {
    // max_wait_ticks=2 → tolerate two ticks of waiting (waited reaches 2), then abandon.
    let config = default_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.world_mut().set_patience(
        rider.entity(),
        Patience {
            max_wait_ticks: 2,
            waited_ticks: 0,
        },
    );

    for tick in 0..2 {
        sim.step();
        assert_eq!(
            sim.world().rider(rider.entity()).map(|r| r.phase),
            Some(RiderPhase::Waiting),
            "rider with max_wait_ticks=2 should survive tick {tick}"
        );
    }

    sim.step();
    assert_eq!(
        sim.world().rider(rider.entity()).map(|r| r.phase),
        Some(RiderPhase::Abandoned),
        "rider with max_wait_ticks=2 should abandon on the third tick"
    );
}

#[test]
fn patience_max_never_overflows() {
    // Pre-load `waited_ticks` to the limit so the abandon predicate fires on
    // the first step. Exercises the saturating increment on the path that
    // doesn't trigger abandonment in the same tick.
    let config = default_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.world_mut().set_patience(
        rider.entity(),
        Patience {
            max_wait_ticks: u64::MAX,
            waited_ticks: u64::MAX,
        },
    );

    // waited=max → predicate true → abandon on first step.
    sim.step();

    assert_eq!(
        sim.world().rider(rider.entity()).map(|r| r.phase),
        Some(RiderPhase::Abandoned)
    );
}

#[test]
fn preferences_zero_crowding_rejects_any_load() {
    let config = default_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    // Spawn first rider to create some load.
    let r1 = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    // Spawn second rider with max_crowding_factor=0.0.
    let r2 = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.world_mut().set_preferences(
        r2.entity(),
        Preferences {
            skip_full_elevator: true,
            max_crowding_factor: 0.0,
            abandon_after_ticks: None,
            abandon_on_full: false,
        },
    );

    // Run until first rider boards.
    for _ in 0..500 {
        sim.step();
        if let Some(r) = sim.world().rider(r1.entity())
            && matches!(r.phase, RiderPhase::Riding(_) | RiderPhase::Arrived)
        {
            break;
        }
    }

    // Check for preference rejection events for r2.
    let events = sim.drain_events();
    let preference_rejections = events.iter().any(|e| {
        matches!(
            e,
            Event::RiderRejected {
                rider,
                reason,
                ..
            } if *rider == r2.entity() && *reason == crate::error::RejectionReason::PreferenceBased
        )
    });

    // If r1 boarded first, r2 should have been rejected due to crowding factor 0.0.
    // (Any non-zero load triggers rejection.)
    if sim
        .world()
        .rider(r1.entity())
        .is_some_and(|r| matches!(r.phase, RiderPhase::Riding(_) | RiderPhase::Arrived))
    {
        assert!(
            preference_rejections,
            "rider with max_crowding_factor=0.0 should be rejected when elevator has any load"
        );
    }
}

#[test]
fn weight_exactly_at_capacity_after_partial_load_boards() {
    // Load the elevator partway, then try a rider whose weight exactly fills the
    // remaining capacity. Verifies the `<=` check at the boundary.
    let config = default_config(); // capacity = 800
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    // First rider: 500 kg. Leaves 300 kg remaining.
    let r1 = sim.spawn_rider(StopId(0), StopId(2), 500.0).unwrap();
    // Second rider: exactly 300 kg (fills remaining capacity to the byte).
    let r2 = sim.spawn_rider(StopId(0), StopId(2), 300.0).unwrap();

    let mut both_boarded = false;
    for _ in 0..1000 {
        sim.step();
        let r1_riding = sim.world().rider(r1.entity()).is_some_and(|r| {
            matches!(
                r.phase,
                RiderPhase::Boarding(_) | RiderPhase::Riding(_) | RiderPhase::Arrived
            )
        });
        let r2_riding = sim.world().rider(r2.entity()).is_some_and(|r| {
            matches!(
                r.phase,
                RiderPhase::Boarding(_) | RiderPhase::Riding(_) | RiderPhase::Arrived
            )
        });
        if r1_riding && r2_riding {
            both_boarded = true;
            break;
        }
    }
    assert!(
        both_boarded,
        "rider weighing exactly the remaining capacity (500+300=800) should board"
    );
}

#[test]
fn weight_exceeds_capacity_by_epsilon_rejects() {
    let config = default_config(); // capacity = 800
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let r1 = sim.spawn_rider(StopId(0), StopId(2), 799.5).unwrap();
    let r2 = sim.spawn_rider(StopId(0), StopId(2), 0.500_001).unwrap();

    // Run until r1 is aboard.
    for _ in 0..100 {
        sim.step();
        if sim
            .world()
            .rider(r1.entity())
            .is_some_and(|r| matches!(r.phase, RiderPhase::Riding(_)))
        {
            break;
        }
    }

    assert!(
        sim.world()
            .rider(r1.entity())
            .is_some_and(|r| matches!(r.phase, RiderPhase::Riding(_))),
        "r1 should be riding by now"
    );

    let rejected = sim
        .drain_events()
        .into_iter()
        .any(|e| matches!(e, Event::RiderRejected { rider, .. } if rider == r2.entity()));
    assert!(
        rejected,
        "r2 (0.500001 kg) should be rejected while remaining capacity is 0.5 kg"
    );
}

#[test]
fn weight_exactly_at_capacity_boards() {
    let config = default_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    // The default config has weight_capacity=800. Spawn a rider weighing exactly 800.
    let rider = sim.spawn_rider(StopId(0), StopId(2), 800.0).unwrap();

    // Run until rider boards or times out.
    let mut boarded = false;
    for _ in 0..500 {
        sim.step();
        if let Some(r) = sim.world().rider(rider.entity())
            && matches!(
                r.phase,
                RiderPhase::Boarding(_) | RiderPhase::Riding(_) | RiderPhase::Arrived
            )
        {
            boarded = true;
            break;
        }
    }

    assert!(
        boarded,
        "rider weighing exactly capacity should be able to board"
    );
}
