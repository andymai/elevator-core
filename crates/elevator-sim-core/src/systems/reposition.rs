//! Optional system: reposition idle elevators for better coverage.

use crate::components::ElevatorPhase;
use crate::dispatch::ElevatorGroup;
use crate::entity::EntityId;
use crate::events::{Event, EventBus};
use crate::world::World;

use super::PhaseContext;

/// Reposition idle elevators to minimize expected wait time.
///
/// Strategy: distribute idle elevators evenly across the group's stops.
/// When an elevator has been idle, send it to the stop that maximizes
/// coverage (farthest from any other elevator in the group).
///
/// This is an optional system — games register it if they want repositioning.
pub fn run(
    world: &mut World,
    events: &mut EventBus,
    ctx: &PhaseContext,
    groups: &[ElevatorGroup],
    _idle_threshold_ticks: u64,
) {
    for group in groups {
        // Collect positions of all non-idle elevators in this group.
        let occupied_positions: Vec<f64> = group
            .elevator_entities
            .iter()
            .filter_map(|&eid| {
                if world.is_disabled(eid) {
                    return None;
                }
                let car = world.elevator(eid)?;
                if car.phase == ElevatorPhase::Idle {
                    None
                } else {
                    world.position(eid).map(|p| p.value)
                }
            })
            .collect();

        // Collect idle elevators.
        let idle_elevators: Vec<(EntityId, f64)> = group
            .elevator_entities
            .iter()
            .filter_map(|&eid| {
                if world.is_disabled(eid) {
                    return None;
                }
                let car = world.elevator(eid)?;
                if car.phase == ElevatorPhase::Idle {
                    let pos = world.position(eid)?.value;
                    Some((eid, pos))
                } else {
                    None
                }
            })
            .collect();

        if idle_elevators.is_empty() {
            continue;
        }

        // Stop positions in this group.
        let stop_positions: Vec<(EntityId, f64)> = group
            .stop_entities
            .iter()
            .filter_map(|&sid| world.stop_position(sid).map(|p| (sid, p)))
            .collect();

        if stop_positions.is_empty() {
            continue;
        }

        // For each idle elevator, find the stop that maximizes minimum
        // distance from all other (non-idle) elevators and already-
        // assigned idle elevators. This spreads them out.
        let mut assigned_positions = occupied_positions.clone();

        for (elev_eid, elev_pos) in &idle_elevators {
            // Find the stop position farthest from all assigned positions.
            let best_stop = stop_positions.iter().max_by(|a, b| {
                let min_dist_a = min_distance_to(a.1, &assigned_positions);
                let min_dist_b = min_distance_to(b.1, &assigned_positions);
                min_dist_a.total_cmp(&min_dist_b)
            });

            if let Some((stop_eid, stop_pos)) = best_stop {
                // Only reposition if we're not already at this stop.
                if (*stop_pos - elev_pos).abs() > 1e-6 {
                    if let Some(car) = world.elevator_mut(*elev_eid) {
                        car.phase = ElevatorPhase::MovingToStop(*stop_eid);
                        car.target_stop = Some(*stop_eid);
                    }

                    let current_stop = world.find_stop_at_position(*elev_pos);
                    if let Some(from) = current_stop {
                        events.emit(Event::ElevatorDeparted {
                            elevator: *elev_eid,
                            from_stop: from,
                            tick: ctx.tick,
                        });
                    }
                }
                assigned_positions.push(*stop_pos);
            }
        }
    }
}

/// Minimum distance from `pos` to any value in `others`.
fn min_distance_to(pos: f64, others: &[f64]) -> f64 {
    if others.is_empty() {
        return f64::INFINITY;
    }
    others.iter().map(|&o| (pos - o).abs()).fold(f64::INFINITY, f64::min)
}
