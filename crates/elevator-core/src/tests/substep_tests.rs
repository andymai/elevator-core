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

// ── Strict phase-order guard ───────────────────────────────────────

#[test]
fn strict_phase_order_default_off() {
    let sim = crate::sim::Simulation::new(&default_config(), scan()).unwrap();
    assert!(!sim.is_strict_phase_order());
}

#[test]
fn strict_phase_order_step_passes_check() {
    // step() walks the canonical order, so strict mode is a no-op
    // from the consumer's perspective — never panics.
    let mut sim = crate::sim::Simulation::new(&default_config(), scan()).unwrap();
    sim.set_strict_phase_order(true);
    assert!(sim.is_strict_phase_order());
    for _ in 0..50 {
        sim.step();
    }
}

#[test]
fn strict_phase_order_full_substep_cycle_passes() {
    // Every public substep method in canonical order, with strict on.
    let mut sim = crate::sim::Simulation::new(&default_config(), scan()).unwrap();
    sim.set_strict_phase_order(true);
    for _ in 0..10 {
        sim.run_advance_transient();
        sim.run_dispatch();
        sim.run_reposition();
        sim.run_advance_queue();
        sim.run_movement();
        sim.run_doors();
        sim.run_loading();
        sim.run_metrics();
        sim.advance_tick();
    }
    assert_eq!(sim.current_tick(), 10);
}

#[test]
fn strict_phase_order_can_be_toggled_off() {
    // Toggling off restores the pre-existing tolerant behaviour, so
    // hosts that skip phases (e.g. the original
    // `per_phase_methods_equivalent_to_step` test) still work after
    // experimenting with strict mode.
    let mut sim = crate::sim::Simulation::new(&default_config(), scan()).unwrap();
    sim.set_strict_phase_order(true);
    sim.set_strict_phase_order(false);
    // This call skips run_reposition + run_advance_queue and would
    // panic if strict were still on.
    sim.run_advance_transient();
    sim.run_dispatch();
    sim.run_movement();
}

#[test]
#[should_panic(expected = "substep phase order violated")]
fn strict_phase_order_rejects_out_of_order_call() {
    let mut sim = crate::sim::Simulation::new(&default_config(), scan()).unwrap();
    sim.set_strict_phase_order(true);
    // Skip straight to dispatch without advance_transient — should panic.
    sim.run_dispatch();
}

#[test]
#[should_panic(expected = "substep phase order violated")]
fn strict_phase_order_rejects_skipped_phase() {
    let mut sim = crate::sim::Simulation::new(&default_config(), scan()).unwrap();
    sim.set_strict_phase_order(true);
    sim.run_advance_transient();
    // Skip dispatch + reposition + advance_queue — straight to movement.
    sim.run_movement();
}

#[test]
#[should_panic(expected = "advance_tick() must run before the next cycle")]
fn strict_phase_order_rejects_run_before_advance_tick() {
    // Complete one full cycle, then start the next without
    // advance_tick(). The AwaitingTick state should reject it.
    let mut sim = crate::sim::Simulation::new(&default_config(), scan()).unwrap();
    sim.set_strict_phase_order(true);
    sim.run_advance_transient();
    sim.run_dispatch();
    sim.run_reposition();
    sim.run_advance_queue();
    sim.run_movement();
    sim.run_doors();
    sim.run_loading();
    sim.run_metrics();
    // Missing advance_tick() here — next call must panic.
    sim.run_advance_transient();
}

#[test]
#[should_panic(expected = "advance_tick() called mid-tick")]
fn strict_phase_order_rejects_premature_advance_tick() {
    // advance_tick() called before run_metrics — should panic in strict mode.
    let mut sim = crate::sim::Simulation::new(&default_config(), scan()).unwrap();
    sim.set_strict_phase_order(true);
    sim.run_advance_transient();
    sim.run_dispatch();
    // Skip the rest — advance_tick should reject.
    sim.advance_tick();
}

#[test]
#[should_panic(expected = "advance_tick() called with zero phases")]
fn strict_phase_order_rejects_zero_phase_advance_tick() {
    // advance_tick() right after enabling strict mode, with no run_*
    // calls in this cycle. Without this guard, the tick counter
    // would silently bump on an empty cycle.
    let mut sim = crate::sim::Simulation::new(&default_config(), scan()).unwrap();
    sim.set_strict_phase_order(true);
    sim.advance_tick();
}

#[test]
#[should_panic(expected = "advance_tick()")]
fn strict_phase_order_redundant_enable_preserves_awaiting_tick() {
    // Greptile #859 finding: a second `set_strict_phase_order(true)`
    // mid-cycle used to unconditionally reset to
    // Expecting(AdvanceTransient), silently erasing the AwaitingTick
    // marker after `run_metrics()`. That would let the consumer call
    // `run_advance_transient()` without `advance_tick()` between
    // ticks — skipping the tick-counter increment and event flush.
    //
    // The setter is now idempotent on `enabled == true`: redundant
    // enable preserves the existing state, so the AwaitingTick
    // requirement survives and the next `run_advance_transient()`
    // panics as expected.
    let mut sim = crate::sim::Simulation::new(&default_config(), scan()).unwrap();
    sim.set_strict_phase_order(true);
    sim.run_advance_transient();
    sim.run_dispatch();
    sim.run_reposition();
    sim.run_advance_queue();
    sim.run_movement();
    sim.run_doors();
    sim.run_loading();
    sim.run_metrics();
    // Redundant enable — must NOT reset the AwaitingTick state.
    sim.set_strict_phase_order(true);
    // Without advance_tick(), this should still panic.
    sim.run_advance_transient();
}

#[test]
fn strict_phase_order_toggle_off_then_on_resets_to_start_of_cycle() {
    // Toggling off then on IS a reset — the consumer explicitly
    // disabled and re-enabled, which should land at the start of a
    // fresh cycle regardless of where mid-cycle they were.
    let mut sim = crate::sim::Simulation::new(&default_config(), scan()).unwrap();
    sim.set_strict_phase_order(true);
    sim.run_advance_transient();
    sim.run_dispatch();
    // Disable mid-cycle, then re-enable. State is now
    // Expecting(AdvanceTransient) so a fresh canonical cycle works.
    sim.set_strict_phase_order(false);
    sim.set_strict_phase_order(true);
    sim.run_advance_transient();
    sim.run_dispatch();
    sim.run_reposition();
    sim.run_advance_queue();
    sim.run_movement();
    sim.run_doors();
    sim.run_loading();
    sim.run_metrics();
    sim.advance_tick();
}

#[test]
#[should_panic(expected = "advance_tick() called with zero phases")]
fn strict_phase_order_rejects_back_to_back_advance_tick() {
    // After a complete canonical cycle plus advance_tick(), a second
    // advance_tick() with no intervening run_*'s is also zero-phase.
    let mut sim = crate::sim::Simulation::new(&default_config(), scan()).unwrap();
    sim.set_strict_phase_order(true);
    sim.run_advance_transient();
    sim.run_dispatch();
    sim.run_reposition();
    sim.run_advance_queue();
    sim.run_movement();
    sim.run_doors();
    sim.run_loading();
    sim.run_metrics();
    sim.advance_tick(); // first one is fine
    sim.advance_tick(); // second one with no run_*'s — should panic
}
