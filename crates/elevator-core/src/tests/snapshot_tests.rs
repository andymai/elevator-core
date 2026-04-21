use crate::components::RiderPhase;
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
        .assigned_car
        .expect("assigned_car must round-trip through restore");
    assert!(
        restored.world().elevator(assigned).is_some(),
        "assigned_car must point to a live elevator in the restored \
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
/// round-trip exactly.
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

    // Peek at the restored dispatcher's snapshot_config — if the
    // weights round-tripped, a freshly-serialized copy equals the
    // original's serialized form. This also confirms we didn't
    // silently fall back to `EtdDispatch::new()` defaults.
    let dispatcher = restored
        .dispatchers()
        .values()
        .next()
        .expect("one dispatcher after restore");
    let restored_config = dispatcher
        .snapshot_config()
        .expect("EtdDispatch overrides snapshot_config");
    assert!(
        restored_config.contains("wait_squared_weight:0.25"),
        "expected tuned wait_squared_weight=0.25 in restored config, got {restored_config}"
    );
    assert!(
        restored_config.contains("age_linear_weight:0.1"),
        "expected tuned age_linear_weight=0.1 in restored config, got {restored_config}"
    );
}

/// Same regression, `RsrDispatch` flavour.
#[test]
fn rsr_tuned_weights_survive_snapshot_round_trip() {
    use crate::dispatch::rsr::RsrDispatch;

    let tuned = RsrDispatch::new()
        .with_wrong_direction_penalty(15.0)
        .with_load_penalty_coeff(2.5)
        .with_peak_direction_multiplier(3.0);
    let mut sim =
        crate::sim::Simulation::new(&helpers::default_config(), tuned).expect("build sim");
    for _ in 0..10 {
        sim.step();
    }

    let snap = sim.snapshot();
    let restored = snap.restore(None).expect("restore");
    let dispatcher = restored.dispatchers().values().next().unwrap();
    let restored_config = dispatcher.snapshot_config().unwrap();
    assert!(
        restored_config.contains("wrong_direction_penalty:15"),
        "{restored_config}",
    );
    assert!(
        restored_config.contains("load_penalty_coeff:2.5"),
        "{restored_config}",
    );
    assert!(
        restored_config.contains("peak_direction_multiplier:3"),
        "{restored_config}",
    );
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
    let restored_config = dispatcher.snapshot_config().unwrap();
    assert!(
        restored_config.contains("Some(12.5)"),
        "expected stop_penalty=Some(12.5) in restored config, got {restored_config}"
    );
    assert!(
        restored_config.contains("Some(240)"),
        "expected commitment_window_ticks=Some(240) in restored config, got {restored_config}"
    );
}
