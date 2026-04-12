//! Phase 6: update aggregate metrics from events emitted this tick.

use crate::events::{Event, EventBus};
use crate::metrics::Metrics;
use crate::tagged_metrics::MetricTags;
use crate::world::World;

use super::PhaseContext;

/// Update metrics from events emitted this tick.
pub fn run(world: &mut World, events: &EventBus, metrics: &mut Metrics, ctx: &PhaseContext) {
    // Collect tag updates to apply after event processing.
    let mut tag_spawns: Vec<crate::entity::EntityId> = Vec::new();
    let mut tag_boards: Vec<(crate::entity::EntityId, u64)> = Vec::new();
    let mut tag_deliveries: Vec<crate::entity::EntityId> = Vec::new();
    let mut tag_abandonments: Vec<crate::entity::EntityId> = Vec::new();

    for event in events.peek() {
        match event {
            Event::RiderSpawned { rider, .. } => {
                metrics.record_spawn();
                tag_spawns.push(*rider);
            }
            Event::RiderBoarded { rider, tick, .. } => {
                if let Some(rd) = world.rider(*rider) {
                    let wait_ticks = tick.saturating_sub(rd.spawn_tick);
                    metrics.record_board(wait_ticks);
                    tag_boards.push((*rider, wait_ticks));
                }
            }
            Event::RiderAlighted { rider, tick, .. } => {
                if let Some(rd) = world.rider(*rider) {
                    let ride_ticks = rd.board_tick.map_or(0, |bt| tick.saturating_sub(bt));
                    metrics.record_delivery(ride_ticks, *tick);
                    tag_deliveries.push(*rider);
                }
            }
            Event::RiderAbandoned { rider, .. } => {
                metrics.record_abandonment();
                tag_abandonments.push(*rider);
            }
            _ => {}
        }
    }

    // Update per-tag metrics and clean up terminal riders.
    if let Some(tags) = world.resource_mut::<MetricTags>() {
        for rider in tag_spawns {
            tags.record_spawn(rider);
        }
        for (rider, wait) in tag_boards {
            tags.record_board(rider, wait);
        }
        for rider in &tag_deliveries {
            tags.record_delivery(*rider);
        }
        for rider in &tag_abandonments {
            tags.record_abandonment(*rider);
        }
        // Remove tag entries for riders that reached terminal state.
        for rider in tag_deliveries {
            tags.remove_entity(rider);
        }
        for rider in tag_abandonments {
            tags.remove_entity(rider);
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
