//! Snapshot serialization roundtrip integration test.

#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use elevator_core::prelude::*;
use elevator_core::snapshot::WorldSnapshot;

#[test]
fn snapshot_roundtrip_preserves_state() {
    let mut sim = SimulationBuilder::new().build().unwrap();

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
