use crate::events::{EventBus, SimEvent};
use crate::metrics::Metrics;
use crate::world::World;

use super::PhaseContext;

/// Update metrics from events emitted this tick.
pub fn run(world: &World, events: &EventBus, metrics: &mut Metrics, ctx: &PhaseContext) {
    for event in events.peek() {
        match event {
            SimEvent::RiderSpawned { .. } => {
                metrics.record_spawn();
            }
            SimEvent::RiderBoarded {
                rider, tick, ..
            } => {
                if let Some(rd) = world.rider_data.get(*rider) {
                    let wait_ticks = tick.saturating_sub(rd.spawn_tick);
                    metrics.record_board(wait_ticks);
                }
            }
            SimEvent::RiderAlighted {
                rider, tick, ..
            } => {
                if let Some(rd) = world.rider_data.get(*rider) {
                    let ride_ticks = rd
                        .board_tick
                        .map_or(0, |bt| tick.saturating_sub(bt));
                    metrics.record_delivery(ride_ticks, *tick);
                }
            }
            SimEvent::RiderAbandoned { .. } => {
                metrics.record_abandonment();
            }
            _ => {}
        }
    }

    // Track elevator distance.
    let mut total_dist = 0.0;
    for (eid, _car) in &world.elevator_cars {
        if let Some(vel) = world.velocities.get(eid) {
            total_dist += vel.value.abs() * ctx.dt;
        }
    }
    if total_dist > 0.0 {
        metrics.record_distance(total_dist);
    }

    metrics.update_throughput(ctx.tick);
}
