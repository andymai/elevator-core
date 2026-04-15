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

    let rider = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    sim.world_mut().set_patience(
        rider,
        Patience {
            max_wait_ticks: 0,
            waited_ticks: 0,
        },
    );

    // After 1 step, rider should abandon (max_wait_ticks=0 means abandon on first patience check).
    sim.step();

    let phase = sim.world().rider(rider).map(|r| r.phase);
    assert_eq!(
        phase,
        Some(RiderPhase::Abandoned),
        "rider with max_wait_ticks=0 should abandon immediately"
    );
}

#[test]
fn patience_one_abandons_after_one_tick() {
    let config = default_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let rider = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    sim.world_mut().set_patience(
        rider,
        Patience {
            max_wait_ticks: 1,
            waited_ticks: 0,
        },
    );

    sim.step();

    let phase = sim.world().rider(rider).map(|r| r.phase);
    assert_eq!(
        phase,
        Some(RiderPhase::Abandoned),
        "rider with max_wait_ticks=1 should abandon after 1 tick"
    );
}

#[test]
fn patience_max_never_overflows() {
    let config = default_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let rider = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    sim.world_mut().set_patience(
        rider,
        Patience {
            max_wait_ticks: u64::MAX,
            waited_ticks: u64::MAX - 1,
        },
    );

    // Should not panic or overflow.
    sim.step();

    let phase = sim.world().rider(rider).map(|r| r.phase);
    // With waited=MAX-1 and max=MAX, after increment waited becomes MAX,
    // which triggers abandon (waited >= max.saturating_sub(1) = MAX-1).
    assert_eq!(phase, Some(RiderPhase::Abandoned));
}

#[test]
fn preferences_zero_crowding_rejects_any_load() {
    let config = default_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    // Spawn first rider to create some load.
    let r1 = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();

    // Spawn second rider with max_crowding_factor=0.0.
    let r2 = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    sim.world_mut().set_preferences(
        r2,
        Preferences {
            skip_full_elevator: true,
            max_crowding_factor: 0.0,
            balk_threshold_ticks: None,
            rebalk_on_full: false,
        },
    );

    // Run until first rider boards.
    for _ in 0..500 {
        sim.step();
        if let Some(r) = sim.world().rider(r1)
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
            } if *rider == r2 && *reason == crate::error::RejectionReason::PreferenceBased
        )
    });

    // If r1 boarded first, r2 should have been rejected due to crowding factor 0.0.
    // (Any non-zero load triggers rejection.)
    if sim
        .world()
        .rider(r1)
        .is_some_and(|r| matches!(r.phase, RiderPhase::Riding(_) | RiderPhase::Arrived))
    {
        assert!(
            preference_rejections,
            "rider with max_crowding_factor=0.0 should be rejected when elevator has any load"
        );
    }
}

#[test]
fn weight_exactly_at_capacity_boards() {
    let config = default_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    // The default config has weight_capacity=800. Spawn a rider weighing exactly 800.
    let rider = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(2), 800.0)
        .unwrap();

    // Run until rider boards or times out.
    let mut boarded = false;
    for _ in 0..500 {
        sim.step();
        if let Some(r) = sim.world().rider(rider)
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
