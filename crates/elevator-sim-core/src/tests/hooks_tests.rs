use crate::hooks::Phase;
use crate::tests::helpers;
use std::sync::{Arc, Mutex};

#[test]
fn before_hook_fires_before_phase() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    let log = Arc::new(Mutex::new(Vec::<&str>::new()));
    let log_clone = Arc::clone(&log);

    sim.add_before_hook(Phase::Movement, move |_world| {
        log_clone.lock().unwrap().push("before_movement");
    });

    sim.step();

    let entries = log.lock().unwrap();
    assert!(entries.contains(&"before_movement"));
}

#[test]
fn after_hook_fires_after_phase() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    let log = Arc::new(Mutex::new(Vec::<&str>::new()));
    let log_clone = Arc::clone(&log);

    sim.add_after_hook(Phase::Loading, move |_world| {
        log_clone.lock().unwrap().push("after_loading");
    });

    sim.step();

    let entries = log.lock().unwrap();
    assert!(entries.contains(&"after_loading"));
}

#[test]
fn multiple_hooks_fire_in_registration_order() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    let log = Arc::new(Mutex::new(Vec::<u32>::new()));
    let log1 = Arc::clone(&log);
    let log2 = Arc::clone(&log);
    let log3 = Arc::clone(&log);

    sim.add_before_hook(Phase::Dispatch, move |_| {
        log1.lock().unwrap().push(1);
    });
    sim.add_before_hook(Phase::Dispatch, move |_| {
        log2.lock().unwrap().push(2);
    });
    sim.add_before_hook(Phase::Dispatch, move |_| {
        log3.lock().unwrap().push(3);
    });

    sim.step();

    let entries = log.lock().unwrap();
    assert_eq!(&*entries, &[1, 2, 3]);
}

#[test]
fn hooks_can_mutate_world() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    // Use a hook to spawn a new entity before dispatch.
    sim.add_before_hook(Phase::Dispatch, |world| {
        world.spawn();
    });

    let entity_count_before = sim.world().entity_count();
    sim.step();
    let entity_count_after = sim.world().entity_count();

    assert_eq!(entity_count_after, entity_count_before + 1);
}

#[test]
fn hooks_fire_every_tick() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    let count = Arc::new(Mutex::new(0u32));
    let count_clone = Arc::clone(&count);

    sim.add_after_hook(Phase::Metrics, move |_| {
        *count_clone.lock().unwrap() += 1;
    });

    for _ in 0..5 {
        sim.step();
    }

    assert_eq!(*count.lock().unwrap(), 5);
}

#[test]
fn hooks_on_all_phases() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();

    let log = Arc::new(Mutex::new(Vec::<String>::new()));

    let phases = [
        Phase::AdvanceTransient,
        Phase::Dispatch,
        Phase::Movement,
        Phase::Doors,
        Phase::Loading,
        Phase::Metrics,
    ];

    for phase in phases {
        let log_clone = Arc::clone(&log);
        sim.add_before_hook(phase, move |_| {
            log_clone.lock().unwrap().push(format!("before_{phase:?}"));
        });
        let log_clone = Arc::clone(&log);
        sim.add_after_hook(phase, move |_| {
            log_clone.lock().unwrap().push(format!("after_{phase:?}"));
        });
    }

    sim.step();

    let entries = log.lock().unwrap();
    // Should have 12 entries: before + after for each of 6 phases.
    assert_eq!(entries.len(), 12);
    // Verify ordering: before_X always comes before after_X for each phase.
    assert_eq!(entries[0], "before_AdvanceTransient");
    assert_eq!(entries[1], "after_AdvanceTransient");
    assert_eq!(entries[2], "before_Dispatch");
    assert_eq!(entries[3], "after_Dispatch");
}
