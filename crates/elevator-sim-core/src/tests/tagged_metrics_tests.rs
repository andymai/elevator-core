use crate::tests::helpers;
use crate::stop::StopId;

#[test]
fn tagged_stop_metrics_track_riders() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    // Tag stop 0 (Ground) with "zone:lobby".
    let stop0 = sim.stop_entity(StopId(0)).unwrap();
    sim.tag_entity(stop0, "zone:lobby");

    // Spawn riders from stop 0 → stop 2 (they inherit "zone:lobby" tag).
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0).unwrap();
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0).unwrap();

    // Run simulation until riders are delivered.
    for _ in 0..2000 {
        sim.step();
    }

    let tag_metric = sim.metrics_for_tag("zone:lobby");
    assert!(tag_metric.is_some(), "zone:lobby tag should have metrics");

    let m = tag_metric.unwrap();
    assert_eq!(m.total_spawned(), 2, "should have 2 spawned riders");
    assert!(m.total_delivered() > 0, "at least one rider should be delivered");
}

#[test]
fn untagged_riders_dont_affect_tagged_metrics() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    // Only tag stop 0.
    let stop0 = sim.stop_entity(StopId(0)).unwrap();
    sim.tag_entity(stop0, "zone:ground");

    // Spawn a rider from stop 1 (not tagged).
    sim.spawn_rider_by_stop_id(StopId(1), StopId(2), 70.0).unwrap();

    for _ in 0..500 {
        sim.step();
    }

    let m = sim.metrics_for_tag("zone:ground");
    assert!(m.is_some());
    assert_eq!(m.unwrap().total_spawned(), 0, "untagged rider shouldn't count");
}

#[test]
fn multiple_tags_per_entity() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    let stop0 = sim.stop_entity(StopId(0)).unwrap();
    sim.tag_entity(stop0, "zone:lobby");
    sim.tag_entity(stop0, "floor:ground");

    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0).unwrap();

    for _ in 0..500 {
        sim.step();
    }

    // Both tags should have recorded the spawn.
    let lobby = sim.metrics_for_tag("zone:lobby").unwrap();
    let ground = sim.metrics_for_tag("floor:ground").unwrap();
    assert_eq!(lobby.total_spawned(), 1);
    assert_eq!(ground.total_spawned(), 1);
}

#[test]
fn all_tags_lists_registered_tags() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    let stop0 = sim.stop_entity(StopId(0)).unwrap();
    sim.tag_entity(stop0, "alpha");
    sim.tag_entity(stop0, "beta");

    let tags = sim.all_tags();
    assert!(tags.contains(&"alpha"));
    assert!(tags.contains(&"beta"));
}
