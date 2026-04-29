//! Direct unit tests for the `RiderIndex` reverse-population index.
//!
//! These exercise the partition methods against their own invariants rather
//! than through the tick loop, so a mutation that turns `insert_abandoned`
//! into `()` or swaps a count accessor's return flips an assertion
//! immediately. Written to pin down rider-index behavior against the
//! mutation coverage gaps in `src/rider_index.rs`.

use crate::components::{Rider, RiderPhase, Stop, Weight};
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
            weight: Weight::from(70.0),
            phase,
            current_stop: Some(at),
            spawn_tick: 0,
            tag: 0,
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

/// Integration test: run a full simulation with riders going through various
/// lifecycle phases (boarding, exiting, abandonment, settlement) and verify
/// the live rider index matches a from-scratch rebuild after every tick.
#[test]
fn rider_index_consistent_through_tick_cycles() {
    use crate::components::Patience;
    use crate::dispatch::scan::ScanDispatch;
    use crate::sim::Simulation;
    use crate::stop::StopId;
    use crate::tests::helpers::default_config;

    let config = default_config(); // 3 stops, 1 elevator
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    // Spawn several riders: some will board, ride, exit (arrive), and one
    // will abandon due to low patience.
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.spawn_rider(StopId(0), StopId(1), 60.0).unwrap();
    sim.spawn_rider(StopId(2), StopId(0), 80.0).unwrap();

    // A rider with very low patience that will abandon.
    let impatient = sim.spawn_rider(StopId(2), StopId(0), 50.0).unwrap();
    sim.world_mut().set_patience(
        impatient.entity(),
        Patience {
            max_wait_ticks: 5,
            waited_ticks: 0,
        },
    );

    // Collect all stop entity IDs for querying.
    let stop_entities: Vec<EntityId> = sim.world().iter_stops().map(|(eid, _)| eid).collect();

    for tick in 0..500 {
        sim.step();

        // Build a fresh index from world state and compare against the live index.
        let mut fresh = RiderIndex::default();
        fresh.rebuild(sim.world());

        for &stop in &stop_entities {
            let live_waiting = sim.waiting_count_at(stop);
            let fresh_waiting = fresh.waiting_count_at(stop);
            assert_eq!(
                live_waiting, fresh_waiting,
                "tick {tick}: waiting count mismatch at {stop:?}: live={live_waiting}, rebuilt={fresh_waiting}"
            );

            let live_residents = sim.resident_count_at(stop);
            let fresh_residents = fresh.resident_count_at(stop);
            assert_eq!(
                live_residents, fresh_residents,
                "tick {tick}: resident count mismatch at {stop:?}: live={live_residents}, rebuilt={fresh_residents}"
            );

            let live_abandoned = sim.abandoned_count_at(stop);
            let fresh_abandoned = fresh.abandoned_count_at(stop);
            assert_eq!(
                live_abandoned, fresh_abandoned,
                "tick {tick}: abandoned count mismatch at {stop:?}: live={live_abandoned}, rebuilt={fresh_abandoned}"
            );
        }
    }
}
