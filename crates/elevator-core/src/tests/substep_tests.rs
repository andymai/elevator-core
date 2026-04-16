use crate::events::Event;
use crate::stop::StopId;

use super::helpers::{default_config, scan};

#[test]
fn per_phase_methods_equivalent_to_step() {
    let config = default_config();

    // Sim A: use step()
    let mut sim_a = crate::sim::Simulation::new(&config, scan()).unwrap();
    sim_a.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    for _ in 0..100 {
        sim_a.step();
    }

    // Sim B: use individual phases
    let mut sim_b = crate::sim::Simulation::new(&config, scan()).unwrap();
    sim_b.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    for _ in 0..100 {
        sim_b.run_advance_transient();
        sim_b.run_dispatch();
        sim_b.run_movement();
        sim_b.run_doors();
        sim_b.run_loading();
        sim_b.run_metrics();
        sim_b.advance_tick();
    }

    // Both should be at the same tick.
    assert_eq!(sim_a.current_tick(), sim_b.current_tick());

    // Both should have the same metrics.
    assert_eq!(
        sim_a.metrics().total_delivered,
        sim_b.metrics().total_delivered
    );
    assert_eq!(sim_a.metrics().total_spawned, sim_b.metrics().total_spawned);
}

#[test]
fn advance_tick_increments_tick() {
    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();
    assert_eq!(sim.current_tick(), 0);
    sim.advance_tick();
    assert_eq!(sim.current_tick(), 1);
    sim.advance_tick();
    assert_eq!(sim.current_tick(), 2);
}

#[test]
fn phase_context_reflects_current_tick() {
    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();
    let ctx = sim.phase_context();
    assert_eq!(ctx.tick, 0);

    sim.advance_tick();
    let ctx = sim.phase_context();
    assert_eq!(ctx.tick, 1);
}

#[test]
fn elevator_assigned_event_emitted() {
    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();

    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.drain_events(); // clear spawn event

    sim.run_advance_transient();
    sim.run_dispatch();

    let events = sim.drain_events();
    assert!(
        events
            .iter()
            .any(|e| matches!(e, Event::ElevatorAssigned { .. }))
    );
}

#[test]
fn events_mut_allows_custom_emission() {
    let config = default_config();
    let mut sim = crate::sim::Simulation::new(&config, scan()).unwrap();

    // Games can emit custom sim events through events_mut.
    let elev = sim.world().elevator_ids()[0];
    let stop = sim.stop_entity(StopId(0)).unwrap();
    sim.events_mut().emit(Event::ElevatorDeparted {
        elevator: elev,
        from_stop: stop,
        tick: 999,
    });

    let events = sim.drain_events();
    assert!(
        events
            .iter()
            .any(|e| matches!(e, Event::ElevatorDeparted { tick: 999, .. }))
    );
}
