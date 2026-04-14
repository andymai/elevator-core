//! Snapshot serialization roundtrip integration test.

#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use elevator_core::dispatch::BuiltinReposition;
use elevator_core::dispatch::reposition::ReturnToLobby;
use elevator_core::prelude::*;
use elevator_core::snapshot::WorldSnapshot;

#[test]
fn snapshot_roundtrip_preserves_state() {
    let mut sim = SimulationBuilder::demo().build().unwrap();

    // Spawn riders and run for a while.
    for _ in 0..3 {
        sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 70.0)
            .unwrap();
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
    let restored = snap2.restore(None);

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
    sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 70.0)
        .unwrap();
    // Run until the elevator is in Repositioning phase.
    let elev = sim.world().elevator_ids()[0];
    let mut saw_repositioning = false;
    for _ in 0..2000 {
        sim.step();
        if let Some(car) = sim.world().elevator(elev) {
            if matches!(car.phase(), ElevatorPhase::Repositioning(_)) {
                saw_repositioning = true;
                break;
            }
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
    let restored = snap2.restore(None);

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
