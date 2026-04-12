use crate::elevator::{Elevator, ElevatorState};
use crate::events::{EventBus, SimEvent};
use crate::passenger::{Cargo, CargoState, Passenger, PassengerState};
use crate::stop::StopConfig;

/// One passenger/cargo boards or exits per tick per elevator.
#[allow(clippy::needless_range_loop)]
pub fn run(
    elevators: &mut [Elevator],
    passengers: &mut [Passenger],
    cargo: &mut [Cargo],
    stops: &[StopConfig],
    events: &mut EventBus,
    tick: u64,
) {
    for ei in 0..elevators.len() {
        if elevators[ei].state != ElevatorState::Loading {
            continue;
        }

        let current_stop = match find_stop_at_position(stops, elevators[ei].position) {
            Some(id) => id,
            None => continue,
        };
        let elevator_id = elevators[ei].id;

        // --- Unload one passenger whose destination is this stop ---
        let alight_pid = elevators[ei]
            .passengers
            .iter()
            .find(|pid| {
                passengers
                    .iter()
                    .any(|p| p.id == **pid && p.destination == current_stop)
            })
            .copied();

        if let Some(pid) = alight_pid {
            elevators[ei].passengers.retain(|p| *p != pid);
            if let Some(p) = passengers.iter_mut().find(|p| p.id == pid) {
                let weight = p.weight;
                p.state = PassengerState::Alighting(elevator_id);
                elevators[ei].current_load -= weight;
                events.emit(SimEvent::PassengerAlighted {
                    passenger: pid,
                    elevator: elevator_id,
                    stop: current_stop,
                    tick,
                });
            }
            continue;
        }

        // --- Unload one cargo whose destination is this stop ---
        let unload_cid = elevators[ei]
            .cargo
            .iter()
            .find(|cid| {
                cargo
                    .iter()
                    .any(|c| c.id == **cid && c.destination == current_stop)
            })
            .copied();

        if let Some(cid) = unload_cid {
            elevators[ei].cargo.retain(|c| *c != cid);
            if let Some(c) = cargo.iter_mut().find(|c| c.id == cid) {
                let weight = c.weight;
                c.state = CargoState::Arrived;
                elevators[ei].current_load -= weight;
                events.emit(SimEvent::CargoUnloaded {
                    cargo: cid,
                    elevator: elevator_id,
                    stop: current_stop,
                    tick,
                });
            }
            continue;
        }

        // --- Load one waiting passenger at this stop (first that fits) ---
        let board_pid = passengers
            .iter()
            .filter(|p| p.state == PassengerState::Waiting && p.origin == current_stop)
            .find(|p| elevators[ei].current_load + p.weight <= elevators[ei].weight_capacity)
            .map(|p| (p.id, p.weight));

        if let Some((pid, weight)) = board_pid {
            elevators[ei].current_load += weight;
            elevators[ei].passengers.push(pid);
            if let Some(p) = passengers.iter_mut().find(|p| p.id == pid) {
                p.state = PassengerState::Boarding(elevator_id);
            }
            events.emit(SimEvent::PassengerBoarded {
                passenger: pid,
                elevator: elevator_id,
                tick,
            });
            continue;
        }
        // If no passenger fits, emit one rejection for the first waiting (if any).
        if passengers.iter().any(|p| p.state == PassengerState::Waiting && p.origin == current_stop) {
            events.emit(SimEvent::OverweightRejected {
                entity_kind: "passenger".to_string(),
                elevator: elevator_id,
                tick,
            });
        }

        // --- Load one waiting cargo at this stop (first that fits) ---
        let load_cid = cargo
            .iter()
            .filter(|c| c.state == CargoState::Waiting && c.origin == current_stop)
            .find(|c| elevators[ei].current_load + c.weight <= elevators[ei].weight_capacity)
            .map(|c| (c.id, c.weight));

        if let Some((cid, weight)) = load_cid {
            elevators[ei].current_load += weight;
            elevators[ei].cargo.push(cid);
            if let Some(c) = cargo.iter_mut().find(|c| c.id == cid) {
                c.state = CargoState::Loaded(elevator_id);
            }
            events.emit(SimEvent::CargoLoaded {
                cargo: cid,
                elevator: elevator_id,
                tick,
            });
        }
    }
}

fn find_stop_at_position(
    stops: &[StopConfig],
    position: f64,
) -> Option<crate::stop::StopId> {
    const EPSILON: f64 = 1e-6;
    stops
        .iter()
        .find(|s| (s.position - position).abs() < EPSILON)
        .map(|s| s.id)
}
