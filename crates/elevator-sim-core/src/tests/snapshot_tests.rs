use crate::components::RiderPhase;
use crate::dispatch::scan::ScanDispatch;
use crate::dispatch::DispatchStrategy;
use crate::ids::GroupId;
use crate::stop::StopId;
use crate::tests::helpers;
use std::collections::BTreeMap;

fn default_dispatchers() -> BTreeMap<GroupId, Box<dyn DispatchStrategy>> {
    let mut m = BTreeMap::new();
    m.insert(GroupId(0), Box::new(ScanDispatch::new()) as Box<dyn DispatchStrategy>);
    m
}

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

    let restored = snap.restore(default_dispatchers());
    assert_eq!(restored.current_tick(), 100);
}

#[test]
fn snapshot_roundtrip_preserves_riders() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    // Spawn 3 riders.
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0).unwrap();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 80.0).unwrap();
    sim.spawn_rider_by_stop_id(StopId(1), StopId(0), 60.0).unwrap();

    // Advance a few ticks.
    for _ in 0..10 {
        sim.step();
    }

    let snap = sim.snapshot();
    let restored = snap.restore(default_dispatchers());

    // Rider count should match.
    let original_riders: Vec<_> = sim.world().iter_riders().collect();
    let restored_riders: Vec<_> = restored.world().iter_riders().collect();
    assert_eq!(original_riders.len(), restored_riders.len());
}

#[test]
fn snapshot_roundtrip_preserves_stop_lookup() {
    let config = helpers::default_config();
    let sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    let snap = sim.snapshot();
    let restored = snap.restore(default_dispatchers());

    // All stop IDs should resolve.
    assert!(restored.stop_entity(StopId(0)).is_some());
    assert!(restored.stop_entity(StopId(1)).is_some());
    assert!(restored.stop_entity(StopId(2)).is_some());
}

#[test]
fn snapshot_roundtrip_preserves_metrics() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0).unwrap();
    for _ in 0..500 {
        sim.step();
    }

    let original_delivered = sim.metrics().total_delivered();
    let snap = sim.snapshot();
    let restored = snap.restore(default_dispatchers());

    assert_eq!(restored.metrics().total_delivered(), original_delivered);
}

#[test]
fn snapshot_serializes_to_ron() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0).unwrap();
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

    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0).unwrap();
    for _ in 0..50 {
        sim.step();
    }

    let snap = sim.snapshot();
    let mut restored = snap.restore(default_dispatchers());

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
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0).unwrap();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 80.0).unwrap();
    for _ in 0..5 {
        sim.step();
    }

    let snap = sim.snapshot();
    let mut restored = snap.restore(default_dispatchers());

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
    assert!(delivered > 0, "at least one rider should deliver after restored snapshot");
}

#[test]
fn snapshot_roundtrip_via_ron_preserves_cross_references() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0).unwrap();
    for _ in 0..3 {
        sim.step();
    }

    // Full RON roundtrip.
    let snap = sim.snapshot();
    let ron_str = ron::to_string(&snap).unwrap();
    let deserialized: crate::snapshot::WorldSnapshot = ron::from_str(&ron_str).unwrap();
    let mut restored = deserialized.restore(default_dispatchers());

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
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0).unwrap();
    for _ in 0..500 {
        sim.step();
    }

    let original_spawned = sim
        .metrics_for_tag("zone:lobby")
        .map(|m| m.total_spawned())
        .unwrap_or(0);
    assert!(original_spawned > 0);

    let snap = sim.snapshot();
    let restored = snap.restore(default_dispatchers());

    let restored_spawned = restored
        .metrics_for_tag("zone:lobby")
        .map(|m| m.total_spawned())
        .unwrap_or(0);
    assert_eq!(restored_spawned, original_spawned);
}
