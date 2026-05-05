use crate::components::RiderPhase;
use crate::dispatch::DispatchStrategy;
use crate::entity::ElevatorId;
use crate::stop::StopId;
use crate::tests::helpers;
use crate::world::ExtKey;
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

    let restored = snap.restore(None).unwrap();
    assert_eq!(restored.current_tick(), 100);
}

#[test]
fn snapshot_roundtrip_preserves_riders() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    // Spawn 3 riders.
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.spawn_rider(StopId(0), StopId(2), 80.0).unwrap();
    sim.spawn_rider(StopId(1), StopId(0), 60.0).unwrap();

    // Advance a few ticks.
    for _ in 0..10 {
        sim.step();
    }

    let snap = sim.snapshot();
    let restored = snap.restore(None).unwrap();

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
    let restored = snap.restore(None).unwrap();

    // All stop IDs should resolve.
    assert!(restored.stop_entity(StopId(0)).is_some());
    assert!(restored.stop_entity(StopId(1)).is_some());
    assert!(restored.stop_entity(StopId(2)).is_some());
}

#[test]
fn snapshot_roundtrip_preserves_metrics() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    for _ in 0..500 {
        sim.step();
    }

    let original_delivered = sim.metrics().total_delivered();
    let snap = sim.snapshot();
    let restored = snap.restore(None).unwrap();

    assert_eq!(restored.metrics().total_delivered(), original_delivered);
}

#[test]
fn snapshot_serializes_to_ron() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
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

    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    for _ in 0..50 {
        sim.step();
    }

    let snap = sim.snapshot();
    let mut restored = snap.restore(None).unwrap();

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
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.spawn_rider(StopId(0), StopId(2), 80.0).unwrap();
    for _ in 0..5 {
        sim.step();
    }

    let snap = sim.snapshot();
    let mut restored = snap.restore(None).unwrap();

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

    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    for _ in 0..3 {
        sim.step();
    }

    // Full RON roundtrip.
    let snap = sim.snapshot();
    let ron_str = ron::to_string(&snap).unwrap();
    let deserialized: crate::snapshot::WorldSnapshot = ron::from_str(&ron_str).unwrap();
    let mut restored = deserialized.restore(None).unwrap();

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
    sim.tag_entity(stop0, "zone:lobby").unwrap();
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    for _ in 0..500 {
        sim.step();
    }

    let original_spawned = sim
        .metrics_for_tag("zone:lobby")
        .map_or(0, crate::tagged_metrics::TaggedMetric::total_spawned);
    assert!(original_spawned > 0);

    let snap = sim.snapshot();
    let restored = snap.restore(None).unwrap();

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
    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.world_mut().insert_ext(
        rider.entity(),
        VipTag { level: 5 },
        ExtKey::from_type_name(),
    );

    let snap = sim.snapshot();
    let mut restored = snap.restore(None).unwrap();

    // Register the extension type on the restored world, then load.
    restored
        .world_mut()
        .register_ext::<VipTag>(ExtKey::from_type_name());
    let unregistered = restored.load_extensions();
    assert!(unregistered.is_empty());

    // Find the rider in the restored world and check the extension.
    let mut found = false;
    for (rid, _) in restored.world().iter_riders() {
        if let Some(tag) = restored.world().ext::<VipTag>(rid) {
            assert_eq!(tag.level, 5);
            found = true;
        }
    }
    assert!(found, "VipTag extension should survive snapshot roundtrip");
}

#[test]
fn load_extensions_with_convenience() {
    #[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
    struct VipTag {
        level: u32,
    }

    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();
    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.world_mut().insert_ext(
        rider.entity(),
        VipTag { level: 3 },
        ExtKey::from_type_name(),
    );

    let snap = sim.snapshot();
    let mut restored = snap.restore(None).unwrap();

    let unregistered = restored.load_extensions_with(|world| {
        world.register_ext::<VipTag>(ExtKey::from_type_name());
    });
    assert!(
        unregistered.is_empty(),
        "all extensions should be registered: {unregistered:?}"
    );

    let mut found = false;
    for (rid, _) in restored.world().iter_riders() {
        if let Some(tag) = restored.world().ext::<VipTag>(rid) {
            assert_eq!(tag.level, 3);
            found = true;
        }
    }
    assert!(
        found,
        "VipTag should survive load_extensions_with roundtrip"
    );
}

#[test]
fn load_extensions_reports_unregistered_types() {
    #[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
    struct VipTag {
        level: u32,
    }

    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();
    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.world_mut().insert_ext(
        rider.entity(),
        VipTag { level: 1 },
        ExtKey::from_type_name(),
    );

    let snap = sim.snapshot();
    let mut restored = snap.restore(None).unwrap();

    // Load without registering VipTag — should report it as unregistered.
    let unregistered = restored.load_extensions();
    assert_eq!(unregistered.len(), 1);
    assert!(unregistered[0].contains("VipTag"));
}

#[test]
fn snapshot_bytes_roundtrip() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
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
    let bytes = postcard::to_allocvec(&fake).unwrap();

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
    fresh.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    fresh.spawn_rider(StopId(1), StopId(0), 80.0).unwrap();

    let mut via_snapshot = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();
    via_snapshot
        .spawn_rider(StopId(0), StopId(2), 70.0)
        .unwrap();
    via_snapshot
        .spawn_rider(StopId(1), StopId(0), 80.0)
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

#[test]
fn snapshot_preserves_hall_calls_and_pinning() {
    use crate::components::CallDirection;

    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    let stop = sim.stop_entity(StopId(1)).unwrap();
    let car = ElevatorId::from(sim.world().elevator_ids()[0]);
    sim.press_hall_button(stop, CallDirection::Up).unwrap();
    sim.pin_assignment(car, stop, CallDirection::Up).unwrap();

    let snap = sim.snapshot();
    let restored = snap.restore(None).unwrap();

    let restored_stop = restored.stop_entity(StopId(1)).unwrap();
    let call = restored
        .world()
        .hall_call(restored_stop, CallDirection::Up)
        .expect("hall call should survive snapshot/restore");
    assert_eq!(call.direction, CallDirection::Up);
    assert!(call.pinned, "pinning flag must round-trip");
    let assigned = call
        .any_assigned_car()
        .expect("an assigned car must round-trip through restore");
    assert!(
        restored.world().elevator(assigned).is_some(),
        "assigned car must point to a live elevator in the restored \
         world — a dangling (un-remapped) EntityId would slip past an \
         is_some() check",
    );
}

#[test]
fn snapshot_preserves_car_calls() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    let car = ElevatorId::from(sim.world().elevator_ids()[0]);
    let floor = sim.stop_entity(StopId(2)).unwrap();
    sim.press_car_button(car, floor).unwrap();
    assert_eq!(sim.car_calls(car).len(), 1);

    let snap = sim.snapshot();
    let restored = snap.restore(None).unwrap();

    let restored_car = ElevatorId::from(restored.world().elevator_ids()[0]);
    let calls = restored.car_calls(restored_car);
    assert_eq!(calls.len(), 1, "car call must round-trip");
    // Floor reference must have been remapped to a valid stop entity.
    assert!(restored.world().stop(calls[0].floor).is_some());
}

#[test]
fn snapshot_preserves_group_hall_mode_and_ack_latency() {
    use crate::dispatch::HallCallMode;

    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();
    sim.groups_mut()[0].set_hall_call_mode(HallCallMode::Destination);
    sim.groups_mut()[0].set_ack_latency_ticks(12);

    let snap = sim.snapshot();
    let restored = snap.restore(None).unwrap();

    assert_eq!(
        restored.groups()[0].hall_call_mode(),
        HallCallMode::Destination,
    );
    assert_eq!(restored.groups()[0].ack_latency_ticks(), 12);
}

#[test]
fn snapshot_preserves_hall_call_ack_state_under_latency() {
    use crate::components::CallDirection;
    use crate::dispatch::HallCallMode;

    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();
    sim.groups_mut()[0].set_hall_call_mode(HallCallMode::Destination);
    sim.groups_mut()[0].set_ack_latency_ticks(10);

    let stop = sim.stop_entity(StopId(1)).unwrap();
    sim.press_hall_button(stop, CallDirection::Up).unwrap();
    // Advance a few ticks so the ack-latency counter has started ticking
    // but not yet expired — we must preserve the partial state.
    for _ in 0..3 {
        sim.step();
    }
    let original_press_tick = sim
        .world()
        .hall_call(stop, CallDirection::Up)
        .unwrap()
        .press_tick;

    let snap = sim.snapshot();
    let restored = snap.restore(None).unwrap();

    let restored_stop = restored.stop_entity(StopId(1)).unwrap();
    let call = restored
        .world()
        .hall_call(restored_stop, CallDirection::Up)
        .unwrap();
    assert_eq!(call.press_tick, original_press_tick);
    assert!(
        !call.is_acknowledged(),
        "call should still be pending ack after 3 of 10 latency ticks"
    );
    assert_eq!(call.ack_latency_ticks, 10);
}

/// `WorldSnapshot::restore` rejects a snapshot whose `version` differs
/// from the current schema. Pre-fix the RON/JSON path silently accepted
/// older snapshots and let `#[serde(default)]` fill new fields with
/// zeros — masking schema mismatches. (#295)
#[test]
fn restore_rejects_mismatched_schema_version() {
    use crate::error::SimError;

    let config = helpers::default_config();
    let sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();
    let mut snap = sim.snapshot();
    snap.version = u32::MAX;
    let result = snap.restore(None);
    assert!(
        matches!(result, Err(SimError::SnapshotVersion { .. })),
        "mismatched schema version must be rejected, got {result:?}"
    );
}

/// Legacy snapshots (`version = 0`, the `#[serde(default)]` fallback)
/// are also rejected — confirms the field is consulted on the RON/JSON
/// path even when missing from the source.
#[test]
fn restore_rejects_legacy_zero_version() {
    use crate::error::SimError;

    let config = helpers::default_config();
    let sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();
    let mut snap = sim.snapshot();
    snap.version = 0;
    let result = snap.restore(None);
    assert!(matches!(result, Err(SimError::SnapshotVersion { .. })));
}

/// Normal snapshot roundtrip should produce no `SnapshotDanglingReference` events.
#[test]
fn snapshot_roundtrip_emits_no_dangling_warnings() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    for _ in 0..50 {
        sim.step();
    }
    sim.drain_events();

    let snap = sim.snapshot();
    let mut restored = snap.restore(None).unwrap();
    let events = restored.drain_events();
    let dangling = events
        .iter()
        .filter(|e| matches!(e, crate::events::Event::SnapshotDanglingReference { .. }))
        .count();
    assert_eq!(
        dangling, 0,
        "normal snapshot should have no dangling references"
    );
}

/// `try_snapshot` rejects mid-tick captures so substep callers don't
/// silently lose in-flight `EventBus` state. `snapshot()` keeps the old
/// non-fallible signature for tick-boundary callers. (#297)
#[test]
fn try_snapshot_rejects_mid_tick() {
    use crate::error::SimError;

    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    // Start a tick via the substep API but don't call advance_tick.
    sim.run_advance_transient();

    let result = sim.try_snapshot();
    assert!(
        matches!(result, Err(SimError::MidTickSnapshot)),
        "mid-tick try_snapshot must error, got {result:?}"
    );

    // After advance_tick, try_snapshot succeeds again.
    sim.advance_tick();
    assert!(sim.try_snapshot().is_ok());
}

/// `snapshot_bytes` also enforces the mid-tick guard — bytes path is
/// the most common production use, so the constraint applies there too.
#[test]
fn snapshot_bytes_rejects_mid_tick() {
    use crate::error::SimError;

    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    sim.run_advance_transient();

    let result = sim.snapshot_bytes();
    assert!(matches!(result, Err(SimError::MidTickSnapshot)));
}

/// Snapshot bytes are stable within a process. The actual cross-process
/// determinism guarantee comes from the `BTreeMap` key-sort invariant
/// applied to `stop_lookup`, `extensions`, and `metric_tags` (#254) —
/// `HashMap`'s `RandomState` seed is fixed per-process, so this in-process
/// test would pass even with the old `HashMap` code. The cross-process
/// property is enforced by the type choice rather than a runtime test.
#[test]
fn snapshot_bytes_are_stable_in_process() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();
    let stop0 = sim.stop_entity(StopId(0)).unwrap();
    sim.tag_entity(stop0, "zone:lobby").unwrap();
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.spawn_rider(StopId(1), StopId(0), 60.0).unwrap();
    for _ in 0..10 {
        sim.step();
    }

    let bytes1 = sim.snapshot_bytes().unwrap();
    let bytes2 = sim.snapshot_bytes().unwrap();
    assert_eq!(
        bytes1, bytes2,
        "two snapshots of the same sim must be byte-identical"
    );
}

// ── Dispatch-config round-trip (regression for silent weight reset) ──

/// Pre-fix, `BuiltinStrategy::instantiate()` always called `::new()`
/// with default weights, so any `with_*` tuning on a built-in
/// dispatcher vanished silently through snapshot round-trip. With
/// `snapshot_config`/`restore_config` wired up, the weights
/// round-trip exactly. These tests parse the restored
/// `snapshot_config` output back into the concrete strategy type
/// and assert on typed fields — fragile-by-substring checks would
/// break the moment RON's float formatting changes (`0.25` vs
/// `0.2500`).
#[test]
fn etd_tuned_weights_survive_snapshot_round_trip() {
    use crate::dispatch::etd::EtdDispatch;

    let tuned = EtdDispatch::new()
        .with_wait_squared_weight(0.25)
        .with_age_linear_weight(0.10);
    let mut sim =
        crate::sim::Simulation::new(&helpers::default_config(), tuned).expect("build sim");

    // Walk the sim for a few ticks so any lazy scratch is primed.
    for _ in 0..10 {
        sim.step();
    }

    let snap = sim.snapshot();
    let restored = snap.restore(None).expect("restore");

    let dispatcher = restored
        .dispatchers()
        .values()
        .next()
        .expect("one dispatcher after restore");
    let serialized = dispatcher
        .snapshot_config()
        .expect("EtdDispatch overrides snapshot_config");
    let parsed: EtdDispatch = ron::from_str(&serialized).expect("round-trip parse");
    assert!(
        (parsed.wait_squared_weight - 0.25).abs() < f64::EPSILON,
        "wait_squared_weight drift: {}",
        parsed.wait_squared_weight,
    );
    assert!(
        (parsed.age_linear_weight - 0.10).abs() < f64::EPSILON,
        "age_linear_weight drift: {}",
        parsed.age_linear_weight,
    );
}

/// Same regression, `RsrDispatch` flavour.
#[test]
fn rsr_tuned_weights_survive_snapshot_round_trip() {
    use crate::dispatch::rsr::RsrDispatch;

    let tuned = RsrDispatch::new()
        .with_wrong_direction_penalty(15.0)
        .with_load_penalty_coeff(2.5)
        .with_peak_direction_multiplier(3.0)
        .with_age_linear_weight(0.007);
    let mut sim =
        crate::sim::Simulation::new(&helpers::default_config(), tuned).expect("build sim");
    for _ in 0..10 {
        sim.step();
    }

    let snap = sim.snapshot();
    let restored = snap.restore(None).expect("restore");
    let dispatcher = restored.dispatchers().values().next().unwrap();
    let serialized = dispatcher.snapshot_config().unwrap();
    let parsed: RsrDispatch = ron::from_str(&serialized).expect("round-trip parse");
    assert!(
        (parsed.wrong_direction_penalty - 15.0).abs() < f64::EPSILON,
        "wrong_direction_penalty drift: {}",
        parsed.wrong_direction_penalty,
    );
    assert!(
        (parsed.load_penalty_coeff - 2.5).abs() < f64::EPSILON,
        "load_penalty_coeff drift: {}",
        parsed.load_penalty_coeff,
    );
    assert!(
        (parsed.peak_direction_multiplier - 3.0).abs() < f64::EPSILON,
        "peak_direction_multiplier drift: {}",
        parsed.peak_direction_multiplier,
    );
    assert!(
        (parsed.age_linear_weight - 0.007).abs() < f64::EPSILON,
        "age_linear_weight drift: {}",
        parsed.age_linear_weight,
    );
}

/// Backward-compatibility: an old RON snapshot written before
/// `age_linear_weight` existed must still deserialize — the new field
/// has `#[serde(default)]` so missing values fall back to 0.0.
#[test]
fn rsr_old_snapshot_without_age_linear_weight_still_parses() {
    use crate::dispatch::rsr::RsrDispatch;
    // Pre-R4 RON shape — no `age_linear_weight` key.
    let old = "(eta_weight: 1.0, wrong_direction_penalty: 15.0, \
               coincident_car_call_bonus: 5.0, load_penalty_coeff: 3.0, \
               peak_direction_multiplier: 2.0)";
    let parsed: RsrDispatch = ron::from_str(old).expect("old snapshot must parse");
    assert_eq!(
        parsed.age_linear_weight, 0.0,
        "missing age_linear_weight must default to 0.0 under serde(default)"
    );
    // Sanity: the other fields round-tripped untouched.
    assert!((parsed.wrong_direction_penalty - 15.0).abs() < f64::EPSILON);
    assert!((parsed.load_penalty_coeff - 3.0).abs() < f64::EPSILON);
}

/// `DestinationDispatch` config survives too; `with_stop_penalty`
/// drives the fresh-stop cost term.
#[test]
fn destination_tuned_config_survives_snapshot_round_trip() {
    use crate::dispatch::destination::DestinationDispatch;

    let tuned = DestinationDispatch::new()
        .with_stop_penalty(12.5)
        .with_commitment_window_ticks(240);
    let mut sim =
        crate::sim::Simulation::new(&helpers::default_config(), tuned).expect("build sim");
    for _ in 0..10 {
        sim.step();
    }

    let snap = sim.snapshot();
    let restored = snap.restore(None).expect("restore");
    let dispatcher = restored.dispatchers().values().next().unwrap();
    let serialized = dispatcher.snapshot_config().unwrap();
    // DestinationDispatch's config fields are `pub(crate)`, so
    // parsing back through its serde shape and reading via
    // `snapshot_config` on the parsed instance gives us a stable
    // typed round-trip assertion without exposing internal fields
    // just for tests. If parsing the restored config and
    // re-serializing produces the same string as the original's
    // snapshot_config, every config field round-tripped.
    let parsed: DestinationDispatch = ron::from_str(&serialized).expect("round-trip parse");
    let re_serialized = parsed
        .snapshot_config()
        .expect("DestinationDispatch overrides snapshot_config");
    assert_eq!(
        serialized, re_serialized,
        "DestinationDispatch config should parse-then-serialize to the same bytes",
    );
    // And the re-serialized form must differ from defaults — prove
    // we didn't silently fall back to `DestinationDispatch::new()`.
    let defaults = DestinationDispatch::new()
        .snapshot_config()
        .expect("defaults also serialize");
    assert_ne!(
        serialized, defaults,
        "restored config matched defaults — tuning was lost: {serialized}",
    );
}

// ── Wire-format byte-stable regressions ─────────────────────────────────────
//
// The snapshot uses `BTreeMap` (not `HashMap`) throughout precisely so
// serialization is order-deterministic — see the `Determinism` note on
// `WorldSnapshot`. These tests pin that promise: once a snapshot is in
// memory, two consecutive serializations of it must produce identical
// bytes, and a deserialize-then-reserialize round-trip must also be
// byte-identical. This catches:
//
// - any future field that switches to a non-deterministic container
//   (e.g., a `HashMap` accidentally introduced through a derive),
// - any custom `Serialize` impl that emits state-dependent output (e.g.,
//   reading from an iterator with non-stable order),
// - any field whose deserialize path produces a value that re-serializes
//   differently than the original (a "drifting" round-trip).
//
// We exercise both the postcard binary path (`snapshot_bytes`) and the
// RON text path (used by snapshot tests, debugging, and external tools).

/// Build a fixture sim with riders in a mix of lifecycle phases.
///
/// The harder the snapshot is to round-trip, the more likely a future
/// regression surfaces here rather than in production. Diversifying the
/// rider phases exercises the most variant-rich field of the snapshot.
fn diverse_phase_sim() -> crate::sim::Simulation {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    // r1 will run all the way to Arrived, then settle as Resident.
    let r1 = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    // r2 will be aboard / mid-ride at snapshot time.
    let _r2 = sim.spawn_rider(StopId(0), StopId(2), 80.0).unwrap();
    // r3 spawns later so it's still Waiting.
    for _ in 0..200 {
        sim.step();
        if matches!(
            sim.world().rider(r1.entity()).map(|r| r.phase),
            Some(RiderPhase::Arrived)
        ) {
            break;
        }
    }
    if matches!(
        sim.world().rider(r1.entity()).map(|r| r.phase),
        Some(RiderPhase::Arrived)
    ) {
        sim.settle_rider(r1).unwrap();
    }
    let _r3 = sim.spawn_rider(StopId(1), StopId(2), 65.0).unwrap();
    // Step a couple more ticks so r2/r3 land in interesting phases
    // (Boarding/Riding/Waiting) and the metric counters have non-zero
    // values.
    for _ in 0..3 {
        sim.step();
    }
    sim
}

/// Two consecutive `snapshot_bytes()` calls on the same simulation must
/// produce identical bytes. If they don't, something in the snapshot
/// pipeline is reading a non-deterministic source.
#[test]
fn snapshot_bytes_serialization_is_deterministic() {
    let sim = diverse_phase_sim();
    let bytes_a = sim.snapshot_bytes().expect("snapshot_bytes A");
    let bytes_b = sim.snapshot_bytes().expect("snapshot_bytes B");
    assert_eq!(
        bytes_a.len(),
        bytes_b.len(),
        "two snapshots of the same sim must serialize to the same length"
    );
    assert_eq!(
        bytes_a, bytes_b,
        "two snapshots of the same sim must serialize to identical bytes"
    );
}

/// `snapshot_bytes -> restore_bytes -> snapshot_bytes` must round-trip
/// byte-identically. The version string (carried by the envelope) is
/// the same across both serializations since we're in the same process,
/// so version drift can't paper over a wire-format change.
#[test]
fn snapshot_bytes_roundtrip_is_byte_stable() {
    let sim = diverse_phase_sim();
    let bytes_before = sim.snapshot_bytes().expect("initial snapshot_bytes");

    let restored =
        crate::sim::Simulation::restore_bytes(&bytes_before, None).expect("restore_bytes");
    let bytes_after = restored
        .snapshot_bytes()
        .expect("post-restore snapshot_bytes");

    assert_eq!(
        bytes_before, bytes_after,
        "snapshot_bytes -> restore_bytes -> snapshot_bytes must be byte-stable; \
         a difference here means a field's serialize/deserialize pair has drifted"
    );
}

/// `RepositionCooldowns` must serialize identically regardless of the
/// order in which entries were inserted. With `HashMap`, insertion
/// order influenced bucket layout and thus iteration order, leaking
/// per-process hash-seed randomness into the postcard byte stream;
/// `BTreeMap` keys are walked in `Ord` order so two maps with the
/// same `(key, value)` set produce byte-identical output.
///
/// Regression guard for cross-process snapshot drift observed in the
/// contract harness: scenarios with ≥2 cars under cooldown produced
/// different `snapshot_bytes()` across runs, defeating golden-hash
/// equality even though the simulation state was logically identical.
#[test]
fn reposition_cooldowns_serialize_independent_of_insertion_order() {
    use crate::dispatch::reposition::RepositionCooldowns;
    use crate::entity::EntityId;

    // Use real allocated slotmap keys (not `EntityId::default()`,
    // which is the slotmap null sentinel that production never
    // produces) so the fixture mirrors the runtime shape.
    let mut sm = slotmap::SlotMap::<EntityId, ()>::with_key();
    let key_a = sm.insert(());
    let key_b = sm.insert(());

    let mut forward = RepositionCooldowns::default();
    forward.eligible_at.insert(key_a, 100);
    forward.eligible_at.insert(key_b, 200);

    let mut reverse = RepositionCooldowns::default();
    reverse.eligible_at.insert(key_b, 200);
    reverse.eligible_at.insert(key_a, 100);

    let bytes_forward = postcard::to_allocvec(&forward).unwrap();
    let bytes_reverse = postcard::to_allocvec(&reverse).unwrap();

    assert_eq!(
        bytes_forward, bytes_reverse,
        "RepositionCooldowns must serialize identically regardless of insertion order; \
         a difference here means iteration order leaks into the byte stream",
    );
}

/// Snapshot bytes must be stable across a `restore -> snapshot` cycle
/// even when reposition cooldowns are populated. The cooldowns map is
/// rebuilt from scratch on restore, so a non-deterministic container
/// (e.g. `HashMap`) would surface here as a byte mismatch — the fresh
/// hash seed picks a different bucket layout than the source map.
#[test]
fn snapshot_bytes_with_reposition_cooldowns_roundtrip_is_stable() {
    use crate::dispatch::reposition::RepositionCooldowns;

    // Need ≥2 elevators so the cooldowns map has multiple entries —
    // a single-entry map is trivially insertion-order-independent.
    let config = helpers::multi_floor_config(4, 3);
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();
    for _ in 0..50 {
        sim.step();
    }

    let elevators = sim.world().elevator_ids();
    assert!(elevators.len() >= 2, "fixture sim has ≥2 elevators");

    let mut cooldowns = RepositionCooldowns::default();
    cooldowns.eligible_at.insert(elevators[0], 100);
    cooldowns.eligible_at.insert(elevators[1], 200);
    cooldowns.eligible_at.insert(elevators[2], 300);
    sim.world_mut().insert_resource(cooldowns);

    let bytes_before = sim.snapshot_bytes().expect("initial snapshot_bytes");
    let restored =
        crate::sim::Simulation::restore_bytes(&bytes_before, None).expect("restore_bytes");
    let bytes_after = restored
        .snapshot_bytes()
        .expect("post-restore snapshot_bytes");

    assert_eq!(
        bytes_before, bytes_after,
        "snapshot bytes must be byte-stable across restore even with populated reposition cooldowns",
    );
}

/// RON text format must also be byte-stable across a deserialize +
/// reserialize cycle. RON has no envelope, so this isolates the
/// `WorldSnapshot` `Serialize` / `Deserialize` impls themselves —
/// catching drift the binary test would attribute to envelope changes.
#[test]
fn snapshot_ron_roundtrip_is_byte_stable() {
    let sim = diverse_phase_sim();
    let snap = sim.snapshot();

    let ron_a = ron::to_string(&snap).expect("RON serialize A");
    let parsed: crate::snapshot::WorldSnapshot = ron::from_str(&ron_a).expect("RON deserialize");
    let ron_b = ron::to_string(&parsed).expect("RON serialize B");

    assert_eq!(
        ron_a, ron_b,
        "WorldSnapshot RON: serialize -> deserialize -> serialize must be byte-stable"
    );
}
