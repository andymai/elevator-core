//! Direct unit tests for the `RiderIndex` reverse-population index.
//!
//! These exercise the partition methods against their own invariants rather
//! than through the tick loop, so a mutation that turns `insert_abandoned`
//! into `()` or swaps a count accessor's return flips an assertion
//! immediately. Written to pin down rider-index behavior against the
//! mutation coverage gaps in `src/rider_index.rs`.

use crate::components::{Rider, RiderPhase, Stop};
use crate::entity::EntityId;
use crate::rider_index::RiderIndex;
use crate::world::World;

/// Spawn an entity to use as a stop id in unit-level index tests.
fn fresh_stop(world: &mut World) -> EntityId {
    let eid = world.spawn();
    world.set_stop(
        eid,
        Stop {
            name: "s".into(),
            position: 0.0,
        },
    );
    eid
}

/// Make a rider entity in a given phase with a current-stop so
/// `rebuild()` picks it up into the corresponding partition.
fn rider_in_phase(world: &mut World, at: EntityId, phase: RiderPhase) -> EntityId {
    let r = world.spawn();
    world.set_rider(
        r,
        Rider {
            weight: 70.0,
            phase,
            current_stop: Some(at),
            spawn_tick: 0,
            board_tick: None,
        },
    );
    r
}

#[test]
fn insert_and_query_waiting_matches_count() {
    let mut world = World::new();
    let stop = fresh_stop(&mut world);
    let r1 = world.spawn();
    let r2 = world.spawn();

    let mut idx = RiderIndex::default();
    idx.insert_waiting(stop, r1);
    idx.insert_waiting(stop, r2);

    assert_eq!(idx.waiting_count_at(stop), 2);
    let set = idx.waiting_at(stop);
    assert!(set.contains(&r1));
    assert!(set.contains(&r2));
}

#[test]
fn insert_abandoned_is_observable() {
    let mut world = World::new();
    let stop = fresh_stop(&mut world);
    let rider = world.spawn();

    let mut idx = RiderIndex::default();
    idx.insert_abandoned(stop, rider);

    // Kills the `replace RiderIndex::insert_abandoned with ()` mutant:
    // if insert was a no-op, the count and the set would be empty.
    assert_eq!(idx.abandoned_count_at(stop), 1);
    assert!(idx.abandoned_at(stop).contains(&rider));
}

#[test]
fn remove_waiting_drops_the_entry() {
    let mut world = World::new();
    let stop = fresh_stop(&mut world);
    let r1 = world.spawn();
    let r2 = world.spawn();

    let mut idx = RiderIndex::default();
    idx.insert_waiting(stop, r1);
    idx.insert_waiting(stop, r2);
    assert_eq!(idx.waiting_count_at(stop), 2);

    idx.remove_waiting(stop, r1);

    // Kills the `replace RiderIndex::remove_waiting with ()` mutant.
    assert_eq!(idx.waiting_count_at(stop), 1);
    assert!(!idx.waiting_at(stop).contains(&r1));
    assert!(idx.waiting_at(stop).contains(&r2));
}

#[test]
fn empty_stop_returns_count_zero_and_empty_set() {
    let mut world = World::new();
    let stop = fresh_stop(&mut world);
    let other = world.spawn();

    let idx = RiderIndex::default();

    // Kills `replace ...count_at -> usize with 0/1` — but importantly the
    // `with 1` variant is killed by this assert on an empty stop.
    assert_eq!(idx.waiting_count_at(stop), 0);
    assert_eq!(idx.resident_count_at(stop), 0);
    assert_eq!(idx.abandoned_count_at(stop), 0);
    assert!(idx.waiting_at(stop).is_empty());
    assert!(idx.residents_at(stop).is_empty());
    assert!(idx.abandoned_at(other).is_empty());
}

#[test]
fn populated_stop_returns_count_one() {
    let mut world = World::new();
    let stop = fresh_stop(&mut world);
    let rider = world.spawn();

    let mut idx = RiderIndex::default();
    idx.insert_resident(stop, rider);

    // Kills `...count_at -> usize with 0` — if it always returned 0, this
    // would fail.
    assert_eq!(idx.resident_count_at(stop), 1);
}

#[test]
fn rebuild_populates_waiting_partition() {
    let mut world = World::new();
    let stop = fresh_stop(&mut world);
    let rider = rider_in_phase(&mut world, stop, RiderPhase::Waiting);

    let mut idx = RiderIndex::default();
    idx.rebuild(&world);

    // Kills `delete match arm RiderPhase::Waiting in RiderIndex::rebuild`.
    assert!(
        idx.waiting_at(stop).contains(&rider),
        "rebuild must add Waiting riders to the waiting partition"
    );
    assert_eq!(idx.waiting_count_at(stop), 1);
}

#[test]
fn rebuild_populates_abandoned_partition() {
    let mut world = World::new();
    let stop = fresh_stop(&mut world);
    let rider = rider_in_phase(&mut world, stop, RiderPhase::Abandoned);

    let mut idx = RiderIndex::default();
    idx.rebuild(&world);

    // Kills `delete match arm RiderPhase::Abandoned in RiderIndex::rebuild`.
    assert!(
        idx.abandoned_at(stop).contains(&rider),
        "rebuild must add Abandoned riders to the abandoned partition"
    );
    assert_eq!(idx.abandoned_count_at(stop), 1);
}

#[test]
fn rebuild_clears_stale_entries() {
    let mut world = World::new();
    let stop = fresh_stop(&mut world);

    // Pre-populate the index with a rider that is NOT in world state.
    let ghost = world.spawn();
    let mut idx = RiderIndex::default();
    idx.insert_waiting(stop, ghost);
    assert_eq!(idx.waiting_count_at(stop), 1);

    idx.rebuild(&world);

    // After rebuild, the ghost should be gone — world has no rider component
    // for it, so rebuild skips it.
    assert_eq!(idx.waiting_count_at(stop), 0);
}

#[test]
fn rider_index_phases_are_independent() {
    // A rider id can only live in one partition at a time in practice, but
    // the index does not enforce that; it just keeps the partitions disjoint
    // by phase. Verify the partitions don't alias.
    let mut world = World::new();
    let stop = fresh_stop(&mut world);
    let w = world.spawn();
    let r = world.spawn();
    let a = world.spawn();

    let mut idx = RiderIndex::default();
    idx.insert_waiting(stop, w);
    idx.insert_resident(stop, r);
    idx.insert_abandoned(stop, a);

    assert_eq!(idx.waiting_count_at(stop), 1);
    assert_eq!(idx.resident_count_at(stop), 1);
    assert_eq!(idx.abandoned_count_at(stop), 1);
    assert!(idx.waiting_at(stop).contains(&w));
    assert!(idx.residents_at(stop).contains(&r));
    assert!(idx.abandoned_at(stop).contains(&a));
    assert!(!idx.waiting_at(stop).contains(&r));
    assert!(!idx.residents_at(stop).contains(&a));
    assert!(!idx.abandoned_at(stop).contains(&w));
}
