//! Snapshot serialization roundtrip integration test.

#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use elevator_core::arrival_log::{ArrivalLog, DestinationLog};
use elevator_core::dispatch::BuiltinReposition;
use elevator_core::dispatch::reposition::{AdaptiveParking, ReturnToLobby};
use elevator_core::ids::GroupId;
use elevator_core::prelude::*;
use elevator_core::snapshot::WorldSnapshot;
use elevator_core::traffic_detector::TrafficDetector;

#[test]
fn snapshot_roundtrip_preserves_state() {
    let mut sim = SimulationBuilder::demo().build().unwrap();

    // Spawn riders and run for a while.
    for _ in 0..3 {
        sim.spawn_rider(StopId(0), StopId(1), 70.0).unwrap();
    }
    for _ in 0..100 {
        sim.step();
    }

    let original_tick = sim.current_tick();
    let original_delivered = sim.metrics().total_delivered();

    // Snapshot and restore.
    let snap = sim.snapshot();
    let ron_str = ron::to_string(&snap).unwrap();
    let snap2: WorldSnapshot = ron::from_str(&ron_str).unwrap();
    let restored = snap2.restore(None).unwrap();

    assert_eq!(restored.current_tick(), original_tick);
    assert_eq!(restored.metrics().total_delivered(), original_delivered);

    // Entity counts should match.
    let orig_riders = sim.world().iter_riders().count();
    let rest_riders = restored.world().iter_riders().count();
    assert_eq!(orig_riders, rest_riders);
}

#[test]
fn snapshot_roundtrip_remaps_repositioning_phase() {
    // Build a sim with a reposition strategy so the elevator enters
    // Repositioning(_) when idle — the new phase variant must survive
    // the serialize / EntityId-remap / deserialize cycle.
    let mut sim = SimulationBuilder::demo()
        .reposition(ReturnToLobby::new(), BuiltinReposition::ReturnToLobby)
        .build()
        .unwrap();

    // Send the elevator to the top, then wait for it to reposition back.
    sim.spawn_rider(StopId(0), StopId(1), 70.0).unwrap();
    // Run until the elevator is in Repositioning phase.
    let elev = sim.world().elevator_ids()[0];
    let mut saw_repositioning = false;
    for _ in 0..2000 {
        sim.step();
        if let Some(car) = sim.world().elevator(elev)
            && matches!(car.phase(), ElevatorPhase::Repositioning(_))
        {
            saw_repositioning = true;
            break;
        }
    }
    assert!(
        saw_repositioning,
        "fixture must actually enter Repositioning for this test to be meaningful"
    );

    // Snapshot mid-reposition and restore.
    let snap = sim.snapshot();
    let ron_str = ron::to_string(&snap).unwrap();
    let snap2: WorldSnapshot = ron::from_str(&ron_str).unwrap();
    let restored = snap2.restore(None).unwrap();

    // The elevator must still be in Repositioning, and its target stop
    // entity must resolve to a real stop in the restored world.
    let elev_restored = restored.world().elevator_ids()[0];
    let restored_phase = restored.world().elevator(elev_restored).unwrap().phase();
    match restored_phase {
        ElevatorPhase::Repositioning(target) => {
            assert!(
                restored.world().stop(target).is_some(),
                "remapped Repositioning target must reference a valid stop"
            );
        }
        other => panic!("expected Repositioning after restore, got {other:?}"),
    }
}

/// Snapshot restore must carry the reposition *strategy discriminant*
/// forward — `Simulation::from_parts` initialises with empty
/// repositioners and relies on the snapshot restore to re-install
/// them from the serialised `BuiltinReposition` ids. Without this
/// pin, a silent regression in that restore loop (snapshot.rs
/// `set_reposition` calls) would leave the restored sim with no
/// reposition strategy despite the snapshot carrying one.
#[test]
fn snapshot_roundtrip_preserves_adaptive_repositioner() {
    let sim = SimulationBuilder::demo()
        .reposition(AdaptiveParking::new(), BuiltinReposition::Adaptive)
        .build()
        .unwrap();
    assert_eq!(
        sim.reposition_id(GroupId(0)),
        Some(&BuiltinReposition::Adaptive),
        "fixture must start with Adaptive — guards against a test that \
         passes vacuously"
    );

    let snap = sim.snapshot();
    let ron_str = ron::to_string(&snap).unwrap();
    let snap2: WorldSnapshot = ron::from_str(&ron_str).unwrap();
    let restored = snap2.restore(None).unwrap();

    assert_eq!(
        restored.reposition_id(GroupId(0)),
        Some(&BuiltinReposition::Adaptive),
        "restored sim must carry the same reposition id as the snapshot"
    );
}

/// Snapshot must carry both logs forward. Before this pin,
/// `DestinationLog` was written to the snapshot write path but never
/// listed in the payload — round-trip silently reset it to empty,
/// blanking the down-peak signal until enough new arrivals refilled
/// the window.
#[test]
fn snapshot_roundtrip_preserves_arrival_and_destination_logs() {
    let mut sim = SimulationBuilder::demo().build().unwrap();
    for _ in 0..5 {
        sim.spawn_rider(StopId(0), StopId(1), 70.0).unwrap();
    }
    // Tick once to let the metrics phase process the spawns, but the
    // logs themselves are populated synchronously in spawn.
    sim.step();

    let orig_arrivals = sim.world().resource::<ArrivalLog>().unwrap().len();
    let orig_destinations = sim.world().resource::<DestinationLog>().unwrap().len();
    assert!(
        orig_arrivals > 0,
        "fixture must have arrivals to be meaningful"
    );
    assert!(
        orig_destinations > 0,
        "fixture must have destinations to be meaningful"
    );

    let snap = sim.snapshot();
    let ron_str = ron::to_string(&snap).unwrap();
    let snap2: WorldSnapshot = ron::from_str(&ron_str).unwrap();
    let restored = snap2.restore(None).unwrap();

    assert_eq!(
        restored.world().resource::<ArrivalLog>().unwrap().len(),
        orig_arrivals,
        "arrival log size must survive round-trip"
    );
    assert_eq!(
        restored.world().resource::<DestinationLog>().unwrap().len(),
        orig_destinations,
        "destination log size must survive round-trip"
    );
}

/// The classified `TrafficMode` and thresholds must survive a
/// snapshot. Otherwise a sim snapshotted mid-peak restores into
/// `Idle` (the default) and immediately branches into the wrong
/// reposition path until the metrics phase reclassifies.
#[test]
fn snapshot_roundtrip_preserves_traffic_detector_state() {
    let mut sim = SimulationBuilder::demo().build().unwrap();
    for _ in 0..8 {
        sim.spawn_rider(StopId(0), StopId(1), 70.0).unwrap();
    }
    // Run long enough for the detector to classify at least once.
    for _ in 0..200 {
        sim.step();
    }
    let orig_detector = sim.world().resource::<TrafficDetector>().unwrap();
    let orig_mode = orig_detector.current_mode();
    let orig_last_update = orig_detector.last_update_tick();

    let snap = sim.snapshot();
    let ron_str = ron::to_string(&snap).unwrap();
    let snap2: WorldSnapshot = ron::from_str(&ron_str).unwrap();
    let restored = snap2.restore(None).unwrap();

    let restored_detector = restored.world().resource::<TrafficDetector>().unwrap();
    assert_eq!(
        restored_detector.current_mode(),
        orig_mode,
        "classified mode must carry across snapshot"
    );
    assert_eq!(
        restored_detector.last_update_tick(),
        orig_last_update,
        "last_update_tick must carry across snapshot"
    );
}
