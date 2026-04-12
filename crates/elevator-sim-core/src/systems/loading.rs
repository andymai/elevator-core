use crate::components::{ElevatorState, RiderState, Route};
use crate::entity::EntityId;
use crate::events::{EventBus, SimEvent};
use crate::world::World;

use super::PhaseContext;

/// Intermediate action collected in the read-only pass, applied in the mutation pass.
enum LoadAction {
    /// A rider exits the elevator at a stop.
    Alight {
        /// Rider entity leaving.
        rider: EntityId,
        /// Elevator entity being exited.
        elevator: EntityId,
        /// Stop entity where alighting occurs.
        stop: EntityId,
    },
    /// A rider enters the elevator.
    Board {
        /// Rider entity boarding.
        rider: EntityId,
        /// Elevator entity being boarded.
        elevator: EntityId,
        /// Weight the rider adds.
        weight: f64,
    },
    /// A rider is rejected (overweight).
    Reject {
        /// Rider entity rejected.
        rider: EntityId,
        /// Elevator entity that rejected the rider.
        elevator: EntityId,
    },
}

/// One rider boards or exits per tick per elevator.
#[allow(clippy::too_many_lines)] // Two-pass collect-then-apply pattern; splitting harms readability.
pub fn run(world: &mut World, events: &mut EventBus, ctx: &PhaseContext) {
    let mut actions: Vec<LoadAction> = Vec::new();

    // Pass 1: collect actions (read-only over world)
    let elevator_ids: Vec<EntityId> = world.elevator_cars.keys().collect();

    for &eid in &elevator_ids {
        let Some(car) = world.elevator_cars.get(eid) else {
            continue;
        };
        if car.state != ElevatorState::Loading {
            continue;
        }

        let pos = world.positions.get(eid).map_or(0.0, |p| p.value);
        let Some(current_stop) = world.find_stop_at_position(pos) else {
            continue;
        };

        // Try to alight one rider whose route destination matches the current stop.
        let alight_rider = car
            .riders
            .iter()
            .find(|rid| {
                world
                    .routes
                    .get(**rid)
                    .and_then(Route::current_destination) == Some(current_stop)
            })
            .copied();

        if let Some(rid) = alight_rider {
            actions.push(LoadAction::Alight {
                rider: rid,
                elevator: eid,
                stop: current_stop,
            });
            continue;
        }

        // Try to board one waiting rider at this stop (first that fits by weight).
        let remaining_capacity = car.weight_capacity - car.current_load;

        let board_rider = world
            .rider_data
            .iter()
            .find(|(rid, rider)| {
                rider.state == RiderState::Waiting
                    && rider.current_stop == Some(current_stop)
                    && rider.weight <= remaining_capacity
                    // Must want to depart from this stop (check route leg origin).
                    && world.routes.get(*rid).is_none_or(|route| {
                        route.current().is_none_or(|leg| leg.from == current_stop)
                    })
            })
            .map(|(rid, rider)| (rid, rider.weight));

        if let Some((rid, weight)) = board_rider {
            actions.push(LoadAction::Board {
                rider: rid,
                elevator: eid,
                weight,
            });
            continue;
        }

        // Check if anyone is waiting but can't fit — emit a rejection event.
        let rejected_rider = world.rider_data.iter().find(|(_, rider)| {
            rider.state == RiderState::Waiting && rider.current_stop == Some(current_stop)
        });

        if let Some((rid, _)) = rejected_rider {
            actions.push(LoadAction::Reject {
                rider: rid,
                elevator: eid,
            });
        }
    }

    // Pass 2: apply actions
    for action in actions {
        match action {
            LoadAction::Alight {
                rider,
                elevator,
                stop,
            } => {
                if let Some(car) = world.elevator_cars.get_mut(elevator) {
                    car.riders.retain(|r| *r != rider);
                    if let Some(rd) = world.rider_data.get(rider) {
                        car.current_load -= rd.weight;
                    }
                }
                if let Some(rd) = world.rider_data.get_mut(rider) {
                    rd.state = RiderState::Alighting(elevator);
                    rd.current_stop = Some(stop);
                }
                events.emit(SimEvent::RiderAlighted {
                    rider,
                    elevator,
                    stop,
                    tick: ctx.tick,
                });
            }
            LoadAction::Board {
                rider,
                elevator,
                weight,
            } => {
                if let Some(car) = world.elevator_cars.get_mut(elevator) {
                    car.current_load += weight;
                    car.riders.push(rider);
                }
                if let Some(rd) = world.rider_data.get_mut(rider) {
                    rd.state = RiderState::Boarding(elevator);
                    rd.board_tick = Some(ctx.tick);
                    rd.current_stop = None;
                }
                events.emit(SimEvent::RiderBoarded {
                    rider,
                    elevator,
                    tick: ctx.tick,
                });
            }
            LoadAction::Reject { rider, elevator } => {
                events.emit(SimEvent::RiderRejected {
                    rider,
                    elevator,
                    reason: "overweight".to_string(),
                    tick: ctx.tick,
                });
            }
        }
    }
}
