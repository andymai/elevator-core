use crate::components::RiderPhase;
use crate::stop::StopId;
use crate::tests::helpers;
use serde::{Deserialize, Serialize};

#[test]
fn snapshot_roundtrip_preserves_tick() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    // Advance 100 ticks.
    for _ in 0..100 {
        sim.step();
    }

    let snap = sim.snapshot();
    assert_eq!(snap.tick, 100);

    let restored = snap.restore(None);
    assert_eq!(restored.current_tick(), 100);
}

#[test]
fn snapshot_roundtrip_preserves_riders() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    // Spawn 3 riders.
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 80.0)
        .unwrap();
    sim.spawn_rider_by_stop_id(StopId(1), StopId(0), 60.0)
        .unwrap();

    // Advance a few ticks.
    for _ in 0..10 {
        sim.step();
    }

    let snap = sim.snapshot();
    let restored = snap.restore(None);

    // Rider count should match.
    let original_count = sim.world().iter_riders().count();
    let restored_count = restored.world().iter_riders().count();
    assert_eq!(original_count, restored_count);
}

#[test]
fn snapshot_roundtrip_preserves_stop_lookup() {
    let config = helpers::default_config();
    let sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    let snap = sim.snapshot();
    let restored = snap.restore(None);

    // All stop IDs should resolve.
    assert!(restored.stop_entity(StopId(0)).is_some());
    assert!(restored.stop_entity(StopId(1)).is_some());
    assert!(restored.stop_entity(StopId(2)).is_some());
}

#[test]
fn snapshot_roundtrip_preserves_metrics() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    for _ in 0..500 {
        sim.step();
    }

    let original_delivered = sim.metrics().total_delivered();
    let snap = sim.snapshot();
    let restored = snap.restore(None);

    assert_eq!(restored.metrics().total_delivered(), original_delivered);
}

#[test]
fn snapshot_serializes_to_ron() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    for _ in 0..10 {
        sim.step();
    }

    let snap = sim.snapshot();
    let ron_str = ron::to_string(&snap).expect("snapshot should serialize to RON");
    assert!(!ron_str.is_empty());

    // Deserialize back.
    let deserialized: crate::snapshot::WorldSnapshot =
        ron::from_str(&ron_str).expect("snapshot should deserialize from RON");
    assert_eq!(deserialized.tick, 10);
}

#[test]
fn restored_sim_can_continue_stepping() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    for _ in 0..50 {
        sim.step();
    }

    let snap = sim.snapshot();
    let mut restored = snap.restore(None);

    // Should be able to keep stepping without panics.
    for _ in 0..200 {
        restored.step();
    }

    assert_eq!(restored.current_tick(), 250);
}

#[test]
fn snapshot_remaps_entity_ids_for_mid_route_riders() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    // Spawn riders and advance just a few ticks so some are still Waiting.
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 80.0)
        .unwrap();
    for _ in 0..5 {
        sim.step();
    }

    let snap = sim.snapshot();
    let mut restored = snap.restore(None);

    // Riders should still have valid routes pointing to real stops.
    for (_, rider) in restored.world().iter_riders() {
        if let Some(stop) = rider.current_stop {
            assert!(
                restored.world().stop(stop).is_some(),
                "rider's current_stop should reference a valid stop after restore"
            );
        }
    }

    // Run to completion — riders should eventually deliver.
    for _ in 0..2000 {
        restored.step();
    }

    let delivered = restored
        .world()
        .iter_riders()
        .filter(|(_, r)| r.phase == RiderPhase::Arrived)
        .count();
    assert!(
        delivered > 0,
        "at least one rider should deliver after restored snapshot"
    );
}

#[test]
fn snapshot_roundtrip_via_ron_preserves_cross_references() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    for _ in 0..3 {
        sim.step();
    }

    // Full RON roundtrip.
    let snap = sim.snapshot();
    let ron_str = ron::to_string(&snap).unwrap();
    let deserialized: crate::snapshot::WorldSnapshot = ron::from_str(&ron_str).unwrap();
    let mut restored = deserialized.restore(None);

    // Should complete without panics and deliver riders.
    for _ in 0..2000 {
        restored.step();
    }

    assert!(restored.metrics().total_delivered() > 0);
}

#[test]
fn snapshot_preserves_metric_tags() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    // Tag stop 0 and spawn a rider.
    let stop0 = sim.stop_entity(StopId(0)).unwrap();
    sim.tag_entity(stop0, "zone:lobby");
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    for _ in 0..500 {
        sim.step();
    }

    let original_spawned = sim
        .metrics_for_tag("zone:lobby")
        .map_or(0, crate::tagged_metrics::TaggedMetric::total_spawned);
    assert!(original_spawned > 0);

    let snap = sim.snapshot();
    let restored = snap.restore(None);

    let restored_spawned = restored
        .metrics_for_tag("zone:lobby")
        .map_or(0, crate::tagged_metrics::TaggedMetric::total_spawned);
    assert_eq!(restored_spawned, original_spawned);
}

#[test]
fn snapshot_preserves_extension_components() {
    #[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
    struct VipTag {
        level: u32,
    }

    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    // Attach extension component to a rider.
    let rider = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    sim.world_mut()
        .insert_ext(rider, VipTag { level: 5 }, "vip_tag");

    let snap = sim.snapshot();
    let mut restored = snap.restore(None);

    // Register the extension type on the restored world, then load.
    restored.world_mut().register_ext::<VipTag>("vip_tag");
    restored.load_extensions();

    // Find the rider in the restored world and check the extension.
    let mut found = false;
    for (rid, _) in restored.world().iter_riders() {
        if let Some(tag) = restored.world().get_ext::<VipTag>(rid) {
            assert_eq!(tag.level, 5);
            found = true;
        }
    }
    assert!(found, "VipTag extension should survive snapshot roundtrip");
}

#[test]
fn snapshot_bytes_roundtrip() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    for _ in 0..50 {
        sim.step();
    }

    let bytes = sim.snapshot_bytes().unwrap();
    assert!(!bytes.is_empty());
    let restored = crate::sim::Simulation::restore_bytes(&bytes, None).unwrap();
    assert_eq!(restored.current_tick(), sim.current_tick());
    assert_eq!(
        restored.metrics().total_delivered(),
        sim.metrics().total_delivered(),
    );
}

#[test]
fn snapshot_bytes_rejects_wrong_magic() {
    let config = helpers::default_config();
    let sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();
    let mut bytes = sim.snapshot_bytes().unwrap();
    // The magic is serialized first — flip a byte inside the first 8.
    bytes[0] ^= 0xFF;
    let err = crate::sim::Simulation::restore_bytes(&bytes, None).unwrap_err();
    assert!(
        matches!(err, crate::error::SimError::SnapshotFormat(_)),
        "expected SnapshotFormat, got {err:?}",
    );
}

#[derive(Serialize)]
struct FakeEnvelope {
    magic: [u8; 8],
    version: String,
    payload: crate::snapshot::WorldSnapshot,
}

#[test]
fn snapshot_bytes_rejects_wrong_version() {
    let config = helpers::default_config();
    let sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();
    let real = sim.snapshot();

    let fake = FakeEnvelope {
        magic: *b"ELEVSNAP",
        version: "0.0.0-definitely-not-real".to_owned(),
        payload: real,
    };
    let bytes = bincode::serde::encode_to_vec(&fake, bincode::config::standard()).unwrap();

    let err = crate::sim::Simulation::restore_bytes(&bytes, None).unwrap_err();
    match err {
        crate::error::SimError::SnapshotVersion { saved, current } => {
            assert_eq!(saved, "0.0.0-definitely-not-real");
            assert_eq!(current, env!("CARGO_PKG_VERSION"));
        }
        other => panic!("expected SnapshotVersion, got {other:?}"),
    }
}

#[test]
fn snapshot_bytes_rejects_trailing_bytes() {
    // A valid blob with extra bytes appended must not decode silently —
    // a framed-protocol or fixed-buffer caller would otherwise think the
    // snapshot was fine and ignore the trailer.
    let config = helpers::default_config();
    let sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();
    let mut bytes = sim.snapshot_bytes().unwrap();
    bytes.extend_from_slice(&[0xDE, 0xAD, 0xBE, 0xEF]);
    let err = crate::sim::Simulation::restore_bytes(&bytes, None).unwrap_err();
    match err {
        crate::error::SimError::SnapshotFormat(msg) => {
            assert!(
                msg.contains("trailing"),
                "message should mention trailing: {msg}"
            );
        }
        other => panic!("expected SnapshotFormat, got {other:?}"),
    }
}

#[test]
fn snapshot_bytes_rejects_garbage() {
    let err = crate::sim::Simulation::restore_bytes(&[1, 2, 3, 4], None).unwrap_err();
    assert!(matches!(err, crate::error::SimError::SnapshotFormat(_)));
}

#[test]
fn snapshot_bytes_midrun_determinism() {
    // Snapshot at tick N, restore, step to 2N. A fresh sim stepped
    // straight to 2N should produce identical metrics. This proves
    // that (a) the snapshot captures all state the movement/loading
    // systems read, and (b) restoration doesn't introduce divergence.
    let config = helpers::default_config();

    let mut fresh = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();
    fresh
        .spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    fresh
        .spawn_rider_by_stop_id(StopId(1), StopId(0), 80.0)
        .unwrap();

    let mut via_snapshot = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();
    via_snapshot
        .spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    via_snapshot
        .spawn_rider_by_stop_id(StopId(1), StopId(0), 80.0)
        .unwrap();

    for _ in 0..250 {
        fresh.step();
        via_snapshot.step();
    }
    let bytes = via_snapshot.snapshot_bytes().unwrap();
    let mut via_snapshot = crate::sim::Simulation::restore_bytes(&bytes, None).unwrap();

    for _ in 0..250 {
        fresh.step();
        via_snapshot.step();
    }

    assert_eq!(fresh.current_tick(), via_snapshot.current_tick());
    assert_eq!(
        fresh.metrics().total_delivered(),
        via_snapshot.metrics().total_delivered(),
    );
    assert_eq!(
        fresh.metrics().total_moves(),
        via_snapshot.metrics().total_moves(),
    );
}
