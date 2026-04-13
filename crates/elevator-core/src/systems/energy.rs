//! Energy system: compute per-tick energy consumption and regeneration.

use crate::components::ElevatorPhase;
use crate::energy::compute_tick_energy;
use crate::entity::EntityId;
use crate::events::{Event, EventBus};
use crate::world::World;

use super::PhaseContext;

/// Iterate elevators with an [`EnergyProfile`](crate::energy::EnergyProfile),
/// compute tick energy, update [`EnergyMetrics`](crate::energy::EnergyMetrics),
/// and emit [`Event::EnergyConsumed`] events.
pub fn run(
    world: &mut World,
    events: &mut EventBus,
    ctx: &PhaseContext,
    elevator_ids: &[EntityId],
) {
    for &eid in elevator_ids {
        if world.is_disabled(eid) {
            continue;
        }

        // Skip elevators without an energy profile.
        let Some(profile) = world.energy_profile(eid).cloned() else {
            continue;
        };

        let is_moving = world
            .elevator(eid)
            .is_some_and(|c| matches!(c.phase, ElevatorPhase::MovingToStop(_)));
        let current_load = world.elevator(eid).map_or(0.0, |c| c.current_load);
        let velocity = world.velocity(eid).map_or(0.0, |v| v.value);

        let (consumed, regenerated) =
            compute_tick_energy(&profile, is_moving, current_load, velocity);

        // Auto-initialize metrics if a profile exists but metrics weren't set.
        if world.energy_metrics(eid).is_none() {
            world.set_energy_metrics(eid, crate::energy::EnergyMetrics::default());
        }
        if let Some(metrics) = world.energy_metrics_mut(eid) {
            metrics.record(consumed, regenerated);
        }

        if consumed > 0.0 || regenerated > 0.0 {
            events.emit(Event::EnergyConsumed {
                elevator: eid,
                consumed: consumed.into(),
                regenerated: regenerated.into(),
                tick: ctx.tick,
            });
        }
    }
}
