//! Phase 6: update aggregate metrics from events emitted this tick.

use crate::dispatch::ElevatorGroup;
use crate::events::{Event, EventBus};
use crate::metrics::Metrics;
use crate::tagged_metrics::MetricTags;
use crate::world::World;

use super::PhaseContext;

/// Update metrics from events emitted this tick.
pub fn run(
    world: &mut World,
    events: &EventBus,
    metrics: &mut Metrics,
    ctx: &PhaseContext,
    groups: &[ElevatorGroup],
) {
    // Collect rider-level tag updates deferred until after event processing,
    // because `world` is borrowed immutably inside the event loop.
    let mut tag_spawns: Vec<crate::entity::EntityId> = Vec::new();
    let mut tag_boards: Vec<(crate::entity::EntityId, u64)> = Vec::new();
    let mut tag_terminals: Vec<(crate::entity::EntityId, bool)> = Vec::new(); // (rider, is_delivery)

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
            Event::RiderExited { rider, tick, .. } => {
                if let Some(rd) = world.rider(*rider) {
                    let ride_ticks = rd.board_tick.map_or(0, |bt| tick.saturating_sub(bt));
                    metrics.record_delivery(ride_ticks, *tick);
                    tag_terminals.push((*rider, true));
                }
            }
            Event::RiderAbandoned { rider, .. } => {
                metrics.record_abandonment();
                tag_terminals.push((*rider, false));
            }
            #[cfg(feature = "energy")]
            Event::EnergyConsumed {
                consumed,
                regenerated,
                ..
            } => {
                metrics.record_energy((*consumed).into(), (*regenerated).into());
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
        for (rider, is_delivery) in tag_terminals {
            if is_delivery {
                tags.record_delivery(rider);
            } else {
                tags.record_abandonment(rider);
            }
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

    // Compute per-group utilization (fraction of elevators currently moving).
    for group in groups {
        let mut total = 0u64;
        let mut moving = 0u64;
        for &eid in group.elevator_entities() {
            if world.is_disabled(eid) {
                continue;
            }
            if let Some(car) = world.elevator(eid) {
                total += 1;
                if car.phase.is_moving() {
                    moving += 1;
                }
            }
        }
        #[allow(clippy::cast_precision_loss)]
        let util = if total > 0 {
            moving as f64 / total as f64
        } else {
            0.0
        };
        metrics
            .utilization_by_group
            .insert(group.name().to_owned(), util);
    }

    metrics.update_throughput(ctx.tick);
}
