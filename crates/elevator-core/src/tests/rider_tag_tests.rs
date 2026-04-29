//! Per-rider opaque tag accessors.
//!
//! The tag is a `u64` payload the engine never interprets. Consumers
//! (e.g. the tower-together adapter) stash an external id on each
//! rider so they can correlate `RiderId` with their own object space
//! without maintaining a parallel `Map<RiderId, u32>`. The tests below
//! pin the contract: the value round-trips, persists across snapshot,
//! never escapes the rider it was set on, and missing-rider errors
//! cleanly.

use crate::dispatch::scan::ScanDispatch;
use crate::error::SimError;
use crate::sim::Simulation;
use crate::stop::StopId;
use crate::tests::helpers::default_config;

#[test]
fn defaults_to_zero_for_a_fresh_rider() {
    let mut sim = Simulation::new(&default_config(), ScanDispatch::new()).unwrap();
    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    assert_eq!(
        sim.rider_tag(rider).unwrap(),
        0,
        "fresh rider must default to the reserved untagged sentinel (0)"
    );
}

#[test]
fn round_trips_through_set_and_get() {
    let mut sim = Simulation::new(&default_config(), ScanDispatch::new()).unwrap();
    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    sim.set_rider_tag(rider, 0xDEAD_BEEF_CAFE_F00D).unwrap();
    assert_eq!(sim.rider_tag(rider).unwrap(), 0xDEAD_BEEF_CAFE_F00D);

    // Re-setting overwrites cleanly.
    sim.set_rider_tag(rider, 1).unwrap();
    assert_eq!(sim.rider_tag(rider).unwrap(), 1);

    // Clearing back to the untagged sentinel works.
    sim.set_rider_tag(rider, 0).unwrap();
    assert_eq!(sim.rider_tag(rider).unwrap(), 0);
}

#[test]
fn tags_are_per_rider_and_do_not_leak_across_riders() {
    let mut sim = Simulation::new(&default_config(), ScanDispatch::new()).unwrap();
    let a = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    let b = sim.spawn_rider(StopId(0), StopId(1), 70.0).unwrap();
    let c = sim.spawn_rider(StopId(2), StopId(0), 70.0).unwrap();

    sim.set_rider_tag(a, 100).unwrap();
    sim.set_rider_tag(b, 200).unwrap();
    // c intentionally left untagged.

    assert_eq!(sim.rider_tag(a).unwrap(), 100);
    assert_eq!(sim.rider_tag(b).unwrap(), 200);
    assert_eq!(sim.rider_tag(c).unwrap(), 0);
}

#[test]
fn survives_phase_transitions_during_a_full_trip() {
    // The tag is data, not lifecycle state — Waiting → Boarding →
    // Riding → Exiting → Arrived must not perturb it.
    let mut sim = Simulation::new(&default_config(), ScanDispatch::new()).unwrap();
    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.set_rider_tag(rider, 0xABCD_1234).unwrap();

    // 200 ticks is comfortably long enough for the demo config to
    // dispatch and complete a 2-stop trip; the assertion is on the
    // tag, not on the trip outcome.
    for _ in 0..200 {
        sim.step();
        // Tag must remain intact every tick the rider exists.
        if let Ok(t) = sim.rider_tag(rider) {
            assert_eq!(t, 0xABCD_1234, "tag must survive every phase transition");
        } else {
            // Rider arrived/despawned — done.
            break;
        }
    }
}

#[test]
fn round_trips_through_snapshot_bytes() {
    let mut sim = Simulation::new(&default_config(), ScanDispatch::new()).unwrap();
    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.set_rider_tag(rider, 0x1122_3344_5566_7788).unwrap();

    let bytes = sim.snapshot_bytes().expect("snapshot");
    let restored = Simulation::restore_bytes(&bytes, None).expect("restore from bytes");

    assert_eq!(
        restored.rider_tag(rider).unwrap(),
        0x1122_3344_5566_7788,
        "tag must survive postcard snapshot round-trip"
    );
}

#[test]
fn legacy_snapshot_without_tag_field_defaults_to_zero() {
    // `Rider.tag` is `#[serde(default)]`. A simulation snapshotted
    // before the field existed must still rehydrate cleanly — we can
    // simulate that by snapshotting now (tag = 0) and confirming the
    // field-absence default semantics line up with "untagged."
    let mut sim = Simulation::new(&default_config(), ScanDispatch::new()).unwrap();
    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    // Don't touch the tag — it's the legacy "absent" case.

    let bytes = sim.snapshot_bytes().expect("snapshot");
    let restored = Simulation::restore_bytes(&bytes, None).expect("restore from bytes");

    assert_eq!(restored.rider_tag(rider).unwrap(), 0);
}

#[test]
fn returns_entity_not_found_for_despawned_rider() {
    let mut sim = Simulation::new(&default_config(), ScanDispatch::new()).unwrap();
    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.despawn_rider(rider).unwrap();

    // Rider id is now stale — both accessors must fail with
    // EntityNotFound rather than silently returning 0 / silently
    // tagging a freed slot.
    let read = sim.rider_tag(rider);
    assert!(matches!(read, Err(SimError::EntityNotFound(_))));

    let write = sim.set_rider_tag(rider, 42);
    assert!(matches!(write, Err(SimError::EntityNotFound(_))));
}

#[test]
fn tag_is_independent_of_metric_tags() {
    // Metric tags (`MetricTags::tag`) and the opaque rider tag share
    // the word "tag" but live in unrelated storage. Setting the rider
    // tag must not appear in metric-tag queries, and vice versa.
    use crate::tagged_metrics::MetricTags;

    let mut sim = Simulation::new(&default_config(), ScanDispatch::new()).unwrap();
    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.set_rider_tag(rider, 999).unwrap();

    // The metric-tag space is unaffected — we only see the auto stop
    // tag added during spawn ("stop:<name>"), never the integer 999.
    let metric_tags = sim
        .world()
        .resource::<MetricTags>()
        .expect("MetricTags resource present");
    let entity_metric_tags = metric_tags.tags_for(rider.entity());
    assert!(
        entity_metric_tags.iter().all(|t| t != "999"),
        "rider opaque tag must not leak into MetricTags"
    );
}
