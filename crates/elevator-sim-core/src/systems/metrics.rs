//! Phase 6: update aggregate metrics from events emitted this tick.

use crate::events::{Event, EventBus};
use crate::metrics::Metrics;
use crate::world::World;

use super::PhaseContext;

/// Update metrics from events emitted this tick.
pub fn run(world: &World, events: &EventBus, metrics: &mut Metrics, ctx: &PhaseContext) {
    for event in events.peek() {
        match event {
            Event::RiderSpawned { .. } => {
                metrics.record_spawn();
            }
            Event::RiderBoarded {
                rider, tick, ..
            } => {
                if let Some(rd) = world.rider(*rider) {
                    let wait_ticks = tick.saturating_sub(rd.spawn_tick);
                    metrics.record_board(wait_ticks);
                }
            }
            Event::RiderAlighted {
                rider, tick, ..
            } => {
                if let Some(rd) = world.rider(*rider) {
                    let ride_ticks = rd
                        .board_tick
                        .map_or(0, |bt| tick.saturating_sub(bt));
                    metrics.record_delivery(ride_ticks, *tick);
                }
            }
            Event::RiderAbandoned { .. } => {
                metrics.record_abandonment();
            }
            _ => {}
        }
    }

    // Track elevator distance (skip disabled elevators).
    let mut total_dist = 0.0;
    for (eid, _pos, _car) in world.iter_elevators() {
        if world.is_disabled(eid) {
            continue;
        }
        if let Some(vel) = world.velocity(eid) {
            total_dist += vel.value.abs() * ctx.dt;
        }
    }
    if total_dist > 0.0 {
        metrics.record_distance(total_dist);
    }

    metrics.update_throughput(ctx.tick);
}
