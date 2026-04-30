use crate::components::{RiderPhase, Route};
use crate::entity::RiderId;
use crate::error::SimError;
use crate::events::Event;
use crate::ids::GroupId;
use crate::sim::Simulation;
use crate::stop::StopId;

use super::helpers::{default_config, scan};

/// Run until the given rider reaches Arrived, or panic after max ticks.
fn run_until_arrived(sim: &mut Simulation, rider_id: RiderId) {
    for _ in 0..10_000 {
        sim.step();
        if let Some(r) = sim.world().rider(rider_id.entity())
            && r.phase() == RiderPhase::Arrived
        {
            return;
        }
    }
    panic!("rider did not arrive within 10,000 ticks");
}

/// Run until the given rider reaches Abandoned, or panic after max ticks.
fn run_until_abandoned(sim: &mut Simulation, rider_id: RiderId) {
    for _ in 0..10_000 {
        sim.step();
        if let Some(r) = sim.world().rider(rider_id.entity())
            && r.phase() == RiderPhase::Abandoned
        {
            return;
        }
    }
    panic!("rider did not abandon within 10,000 ticks");
}

#[test]
fn settle_from_arrived() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    run_until_arrived(&mut sim, rider);

    // Settle the rider.
    sim.settle_rider(rider).unwrap();

    let r = sim.world().rider(rider.entity()).unwrap();
    assert_eq!(r.phase(), RiderPhase::Resident);
    assert!(r.current_stop().is_some());

    let stop = r.current_stop().unwrap();
    assert!(sim.residents_at(stop).any(|id| id == rider.entity()));
    assert_eq!(sim.resident_count_at(stop), 1);

    // Check event was emitted.
    let events = sim.drain_events();
    assert!(
        events
            .iter()
            .any(|e| matches!(e, Event::RiderSettled { rider: r, .. } if *r == rider.entity()))
    );
}

#[test]
fn settle_from_abandoned() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    // Give very short patience so rider abandons.
    sim.world_mut().set_patience(
        rider.entity(),
        crate::components::Patience {
            max_wait_ticks: 1,
            waited_ticks: 0,
        },
    );

    run_until_abandoned(&mut sim, rider);

    sim.settle_rider(rider).unwrap();

    let r = sim.world().rider(rider.entity()).unwrap();
    assert_eq!(r.phase(), RiderPhase::Resident);

    let stop = r.current_stop().unwrap();
    assert!(sim.residents_at(stop).any(|id| id == rider.entity()));
    // Should no longer be in abandoned index.
    assert!(!sim.abandoned_at(stop).any(|id| id == rider.entity()));
}

#[test]
fn settle_wrong_phase_returns_error() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    // Rider is Waiting — should fail.
    let result = sim.settle_rider(rider);
    assert!(matches!(result, Err(SimError::WrongRiderPhase { .. })));
}

#[test]
fn reroute_resident_to_waiting() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    run_until_arrived(&mut sim, rider);
    sim.settle_rider(rider).unwrap();
    sim.drain_events(); // Clear events from settlement.

    let stop = sim
        .world()
        .rider(rider.entity())
        .unwrap()
        .current_stop()
        .unwrap();

    // Resolve StopId(0) to EntityId for the route.
    let dest = sim.stop_entity(StopId(0)).unwrap();
    let route = Route::direct(stop, dest, GroupId(0));
    sim.reroute(rider, route).unwrap();

    let r = sim.world().rider(rider.entity()).unwrap();
    assert_eq!(r.phase(), RiderPhase::Waiting);

    // Rider should be in waiting index, not resident index.
    assert!(sim.waiting_at(stop).any(|id| id == rider.entity()));
    assert!(!sim.residents_at(stop).any(|id| id == rider.entity()));

    // Check event was emitted.
    let events = sim.drain_events();
    assert!(
        events
            .iter()
            .any(|e| matches!(e, Event::RiderRerouted { rider: r, .. } if *r == rider.entity()))
    );
}

/// `reroute` accepts both `Waiting` and `Resident` riders by design (it
/// dispatches on phase). Phases that aren't either of those return
/// `WrongRiderPhase`. Pin both the success path on Waiting and the
/// rejection on a non-Waiting/non-Resident phase.
#[test]
fn reroute_rejects_aboard_phases() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    let dest = sim.stop_entity(StopId(2)).unwrap();
    let origin = sim.stop_entity(StopId(0)).unwrap();

    // Waiting -> reroute is allowed under the unified API; the route is
    // replaced in place. (Pre-refactor `reroute_rider` rejected this.)
    let route = Route::direct(origin, dest, GroupId(0));
    sim.reroute(rider, route).unwrap();

    // Drive the rider into Riding so we can hit the rejection path.
    for _ in 0..500 {
        sim.step();
        if matches!(
            sim.world().rider(rider.entity()).unwrap().phase,
            crate::components::RiderPhase::Riding(_)
        ) {
            break;
        }
    }

    let route = Route::direct(origin, dest, GroupId(0));
    let result = sim.reroute(rider, route);
    let phase = sim.world().rider(rider.entity()).unwrap().phase;
    if !matches!(
        phase,
        crate::components::RiderPhase::Waiting | crate::components::RiderPhase::Resident
    ) {
        assert!(
            matches!(result, Err(SimError::WrongRiderPhase { .. })),
            "expected WrongRiderPhase, got {result:?}"
        );
    }
}

#[test]
fn despawn_rider_removes_from_world_and_index() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    run_until_arrived(&mut sim, rider);
    sim.settle_rider(rider).unwrap();

    let stop = sim
        .world()
        .rider(rider.entity())
        .unwrap()
        .current_stop()
        .unwrap();
    assert_eq!(sim.resident_count_at(stop), 1);

    sim.drain_events();
    sim.despawn_rider(rider).unwrap();

    // Entity gone.
    assert!(!sim.world().is_alive(rider.entity()));
    // Index clean.
    assert_eq!(sim.resident_count_at(stop), 0);

    // Event emitted.
    let events = sim.drain_events();
    assert!(
        events
            .iter()
            .any(|e| matches!(e, Event::RiderDespawned { rider: r, .. } if *r == rider.entity()))
    );
}

#[test]
fn despawn_riding_rider_cleans_elevator() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    // Run until rider is Riding.
    for _ in 0..10_000 {
        sim.step();
        if let Some(r) = sim.world().rider(rider.entity())
            && matches!(r.phase(), RiderPhase::Riding(_))
        {
            break;
        }
    }

    let riding_eid = match sim.world().rider(rider.entity()).unwrap().phase() {
        RiderPhase::Riding(eid) => eid,
        other => panic!("expected Riding, got {other}"),
    };

    // Confirm rider is in elevator's list.
    assert!(
        sim.world()
            .elevator(riding_eid)
            .unwrap()
            .riders()
            .contains(&rider.entity())
    );

    sim.despawn_rider(rider).unwrap();

    // Elevator should no longer reference the rider.
    assert!(
        !sim.world()
            .elevator(riding_eid)
            .unwrap()
            .riders()
            .contains(&rider.entity())
    );
}

#[test]
fn full_lifecycle_spawn_ride_settle_reroute_ride_despawn() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    // Trip 1: Ground → Floor 3.
    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    let origin = sim.stop_entity(StopId(0)).unwrap();
    assert!(sim.waiting_at(origin).any(|id| id == rider.entity()));

    run_until_arrived(&mut sim, rider);

    // Settle at Floor 3.
    sim.settle_rider(rider).unwrap();
    let floor3 = sim
        .world()
        .rider(rider.entity())
        .unwrap()
        .current_stop()
        .unwrap();
    assert!(sim.residents_at(floor3).any(|id| id == rider.entity()));
    assert_eq!(sim.metrics().total_settled(), 1);

    // Reroute back to Ground.
    let ground = sim.stop_entity(StopId(0)).unwrap();
    let route = Route::direct(floor3, ground, GroupId(0));
    sim.reroute(rider, route).unwrap();
    assert_eq!(sim.metrics().total_rerouted(), 1);

    assert!(sim.waiting_at(floor3).any(|id| id == rider.entity()));
    assert!(!sim.residents_at(floor3).any(|id| id == rider.entity()));

    // Trip 2: ride back to Ground.
    run_until_arrived(&mut sim, rider);

    // Despawn.
    sim.despawn_rider(rider).unwrap();
    assert!(!sim.world().is_alive(rider.entity()));
}

#[test]
fn resident_invisible_to_loading_system() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    // Spawn rider Ground → Floor 3, run until arrived, settle.
    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    run_until_arrived(&mut sim, rider);
    sim.settle_rider(rider).unwrap();
    sim.drain_events();

    // Run many more ticks — resident should NOT board any elevator.
    for _ in 0..1000 {
        sim.step();
    }

    let r = sim.world().rider(rider.entity()).unwrap();
    assert_eq!(
        r.phase(),
        RiderPhase::Resident,
        "Resident should not have boarded"
    );
}

#[test]
fn dispatch_manifest_includes_resident_counts() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    // Spawn and deliver 2 riders to Floor 3.
    let r1 = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    run_until_arrived(&mut sim, r1);
    sim.settle_rider(r1).unwrap();

    let r2 = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    run_until_arrived(&mut sim, r2);
    sim.settle_rider(r2).unwrap();

    let floor3 = sim
        .world()
        .rider(r1.entity())
        .unwrap()
        .current_stop()
        .unwrap();
    assert_eq!(sim.resident_count_at(floor3), 2);
}

#[test]
fn patience_reset_on_reroute() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.world_mut().set_patience(
        rider.entity(),
        crate::components::Patience {
            max_wait_ticks: 1000,
            waited_ticks: 500,
        },
    );

    run_until_arrived(&mut sim, rider);
    sim.settle_rider(rider).unwrap();

    let stop = sim
        .world()
        .rider(rider.entity())
        .unwrap()
        .current_stop()
        .unwrap();
    let dest = sim.stop_entity(StopId(0)).unwrap();
    let route = Route::direct(stop, dest, GroupId(0));
    sim.reroute(rider, route).unwrap();

    // Patience should be reset.
    let patience = sim.world().patience(rider.entity()).unwrap();
    assert_eq!(patience.waited_ticks, 0);
}

#[test]
fn snapshot_roundtrip_preserves_residents() {
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    run_until_arrived(&mut sim, rider);
    sim.settle_rider(rider).unwrap();

    let stop = sim
        .world()
        .rider(rider.entity())
        .unwrap()
        .current_stop()
        .unwrap();
    assert_eq!(sim.resident_count_at(stop), 1);

    // Snapshot and restore.
    let snapshot = sim.snapshot();
    let restored = snapshot.restore(None).unwrap();

    // Verify residents are in the index after restore.
    // Entity IDs may be remapped, so find the resident rider.
    let resident_riders: Vec<_> = restored
        .world()
        .iter_riders()
        .filter(|(_, r)| r.phase() == RiderPhase::Resident)
        .collect();
    assert_eq!(resident_riders.len(), 1);

    let (new_rider_id, r) = resident_riders[0];
    let new_stop = r.current_stop().unwrap();
    assert_eq!(restored.resident_count_at(new_stop), 1);
    assert!(restored.residents_at(new_stop).any(|id| id == new_rider_id));
}
