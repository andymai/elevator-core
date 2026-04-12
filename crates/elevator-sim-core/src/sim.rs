use crate::components::{
    ElevatorCar as ElevatorCarComp, ElevatorState as NewElevatorState, Position, StopData, Velocity,
};
use crate::config::SimConfig;
use crate::dispatch::{DispatchDecision, DispatchStrategy, WaitingManifest};
use crate::door::DoorState;
use crate::elevator::{Elevator, ElevatorId, ElevatorState};
use crate::entity::EntityId;
use crate::events::{EventBus, SimEvent};
use crate::ids::GroupId;
use crate::movement::tick_movement;
use crate::passenger::{
    Cargo, CargoId, CargoPriority, CargoState, Passenger, PassengerId, PassengerState,
};
use crate::stop::{StopConfig, StopId};
use crate::world::World;
use std::collections::HashMap;

/// The core simulation state, advanced by calling `tick()`.
pub struct Simulation {
    pub tick: u64,
    pub dt: f64,
    pub stops: Vec<StopConfig>,
    pub elevators: Vec<Elevator>,
    pub passengers: Vec<Passenger>,
    pub cargo: Vec<Cargo>,
    pub events: EventBus,
    pub world: World,
    /// Legacy StopId → EntityId mapping.
    pub stop_entities: HashMap<StopId, EntityId>,
    /// Legacy ElevatorId → EntityId mapping.
    pub elevator_entities: HashMap<ElevatorId, EntityId>,
    dispatch: Box<dyn DispatchStrategy>,
    next_passenger_id: u64,
    next_cargo_id: u64,
}

impl Simulation {
    pub fn new(config: SimConfig, dispatch: Box<dyn DispatchStrategy>) -> Self {
        let stops = config.building.stops;
        let elevators: Vec<Elevator> = config
            .elevators
            .iter()
            .map(|ec| {
                let start_pos = stops
                    .iter()
                    .find(|s| s.id == ec.starting_stop)
                    .map(|s| s.position)
                    .unwrap_or(0.0);
                Elevator {
                    id: ElevatorId(ec.id),
                    position: start_pos,
                    velocity: 0.0,
                    state: ElevatorState::Idle,
                    door: DoorState::Closed,
                    max_speed: ec.max_speed,
                    acceleration: ec.acceleration,
                    deceleration: ec.deceleration,
                    weight_capacity: ec.weight_capacity,
                    current_load: 0.0,
                    passengers: Vec::new(),
                    cargo: Vec::new(),
                    target_stop: None,
                    door_transition_ticks: ec.door_transition_ticks,
                    door_open_ticks: ec.door_open_ticks,
                }
            })
            .collect();

        let dt = 1.0 / config.simulation.ticks_per_second;

        // Populate ECS World alongside legacy Vecs.
        let mut world = World::new();
        let mut stop_entities = HashMap::new();

        for stop_config in &stops {
            let eid = world.spawn();
            world.stop_data.insert(
                eid,
                StopData {
                    name: stop_config.name.clone(),
                    position: stop_config.position,
                },
            );
            stop_entities.insert(stop_config.id, eid);
        }

        let mut elevator_entities = HashMap::new();
        for elev in elevators.iter() {
            let eid = world.spawn();
            let elev_pos = elev.position;
            world.positions.insert(eid, Position { value: elev_pos });
            world.velocities.insert(eid, Velocity { value: 0.0 });
            world.elevator_cars.insert(
                eid,
                ElevatorCarComp {
                    state: NewElevatorState::Idle,
                    door: DoorState::Closed,
                    max_speed: elev.max_speed,
                    acceleration: elev.acceleration,
                    deceleration: elev.deceleration,
                    weight_capacity: elev.weight_capacity,
                    current_load: 0.0,
                    riders: vec![],
                    target_stop: None,
                    door_transition_ticks: elev.door_transition_ticks,
                    door_open_ticks: elev.door_open_ticks,
                    group: GroupId(0),
                },
            );
            elevator_entities.insert(elev.id, eid);
        }

        Simulation {
            tick: 0,
            dt,
            stops,
            elevators,
            passengers: Vec::new(),
            cargo: Vec::new(),
            events: EventBus::default(),
            world,
            stop_entities,
            elevator_entities,
            dispatch,
            next_passenger_id: 0,
            next_cargo_id: 0,
        }
    }

    /// Spawn a passenger at the given origin, headed to destination.
    pub fn spawn_passenger(
        &mut self,
        origin: StopId,
        destination: StopId,
        weight: f64,
    ) -> PassengerId {
        let id = PassengerId(self.next_passenger_id);
        self.next_passenger_id += 1;
        self.passengers.push(Passenger {
            id,
            weight,
            origin,
            destination,
            spawn_tick: self.tick,
            state: PassengerState::Waiting,
        });
        self.events.emit(SimEvent::PassengerSpawned {
            passenger: id,
            origin,
            destination,
            tick: self.tick,
        });
        id
    }

    /// Spawn a cargo item at the given origin, headed to destination.
    pub fn spawn_cargo(
        &mut self,
        origin: StopId,
        destination: StopId,
        weight: f64,
        priority: CargoPriority,
    ) -> CargoId {
        let id = CargoId(self.next_cargo_id);
        self.next_cargo_id += 1;
        self.cargo.push(Cargo {
            id,
            weight,
            origin,
            destination,
            priority,
            state: CargoState::Waiting,
        });
        id
    }

    /// Drain all pending events.
    pub fn drain_events(&mut self) -> Vec<SimEvent> {
        self.events.drain()
    }

    /// Advance the simulation by one tick.
    pub fn tick(&mut self) {
        self.phase_advance_transient();
        self.phase_dispatch();
        self.phase_movement();
        self.phase_doors();
        self.phase_loading();
        self.tick += 1;
    }

    /// Phase 1: Dispatch — assign idle/stopped elevators to stops.
    fn phase_dispatch(&mut self) {
        for i in 0..self.elevators.len() {
            let needs_dispatch = matches!(
                self.elevators[i].state,
                ElevatorState::Idle | ElevatorState::Stopped
            );
            if !needs_dispatch {
                continue;
            }

            let manifest = self.build_waiting_manifest(i);
            let elevator_snapshot = self.elevators[i].clone();
            let decision = self.dispatch.decide(&elevator_snapshot, &self.stops, &manifest);

            match decision {
                DispatchDecision::GoToStop(stop_id) => {
                    // Find the stop we're currently at (if any) for the departure event.
                    let current_stop = self.find_stop_at_position(self.elevators[i].position);
                    self.elevators[i].state = ElevatorState::MovingToStop(stop_id);
                    self.elevators[i].target_stop = Some(stop_id);
                    if let Some(from) = current_stop {
                        self.events.emit(SimEvent::ElevatorDeparted {
                            elevator: self.elevators[i].id,
                            from_stop: from,
                            tick: self.tick,
                        });
                    }
                }
                DispatchDecision::Idle => {
                    self.elevators[i].state = ElevatorState::Idle;
                }
            }
        }
    }

    /// Phase 2: Movement — update position/velocity for moving elevators.
    fn phase_movement(&mut self) {
        for elevator in &mut self.elevators {
            if let ElevatorState::MovingToStop(target_id) = elevator.state {
                let target_pos = self
                    .stops
                    .iter()
                    .find(|s| s.id == target_id)
                    .map(|s| s.position)
                    .unwrap_or(elevator.position);

                let result = tick_movement(
                    elevator.position,
                    elevator.velocity,
                    target_pos,
                    elevator.max_speed,
                    elevator.acceleration,
                    elevator.deceleration,
                    self.dt,
                );

                elevator.position = result.position;
                elevator.velocity = result.velocity;

                if result.arrived {
                    elevator.state = ElevatorState::DoorOpening;
                    elevator.door = DoorState::request_open(
                        elevator.door_transition_ticks,
                        elevator.door_open_ticks,
                    );
                    self.events.emit(SimEvent::ElevatorArrived {
                        elevator: elevator.id,
                        at_stop: target_id,
                        tick: self.tick,
                    });
                }
            }
        }
    }

    /// Phase 3: Doors — tick door FSM, handle transitions.
    fn phase_doors(&mut self) {
        for elevator in &mut self.elevators {
            // Only tick doors for elevators that have doors in motion.
            if elevator.door.is_closed() && elevator.state != ElevatorState::DoorOpening {
                continue;
            }

            let transition = elevator.door.tick();

            match transition {
                crate::door::DoorTransition::FinishedOpening => {
                    elevator.state = ElevatorState::Loading;
                    self.events.emit(SimEvent::DoorOpened {
                        elevator: elevator.id,
                        tick: self.tick,
                    });
                }
                crate::door::DoorTransition::FinishedOpen => {
                    elevator.state = ElevatorState::DoorClosing;
                }
                crate::door::DoorTransition::FinishedClosing => {
                    elevator.state = ElevatorState::Stopped;
                    elevator.target_stop = None;
                    self.events.emit(SimEvent::DoorClosed {
                        elevator: elevator.id,
                        tick: self.tick,
                    });
                }
                crate::door::DoorTransition::None => {}
            }
        }
    }

    /// Phase 4: Loading/Unloading — one passenger/cargo boards or exits per tick.
    ///
    /// Processing one at a time makes boarding/alighting visible in the
    /// visualization and gives a more realistic loading cadence.
    fn phase_loading(&mut self) {
        for ei in 0..self.elevators.len() {
            if self.elevators[ei].state != ElevatorState::Loading {
                continue;
            }

            let current_stop = match self.find_stop_at_position(self.elevators[ei].position) {
                Some(id) => id,
                None => continue,
            };
            let elevator_id = self.elevators[ei].id;

            // --- Unload one passenger whose destination is this stop ---
            let alight_pid = self.elevators[ei]
                .passengers
                .iter()
                .find(|pid| {
                    self.passengers
                        .iter()
                        .any(|p| p.id == **pid && p.destination == current_stop)
                })
                .copied();

            if let Some(pid) = alight_pid {
                self.elevators[ei].passengers.retain(|p| *p != pid);
                if let Some(p) = self.passengers.iter_mut().find(|p| p.id == pid) {
                    let weight = p.weight;
                    p.state = PassengerState::Alighting(elevator_id);
                    self.elevators[ei].current_load -= weight;
                    self.events.emit(SimEvent::PassengerAlighted {
                        passenger: pid,
                        elevator: elevator_id,
                        stop: current_stop,
                        tick: self.tick,
                    });
                }
                // Only one transfer per tick — return early.
                continue;
            }

            // --- Unload one cargo whose destination is this stop ---
            let unload_cid = self.elevators[ei]
                .cargo
                .iter()
                .find(|cid| {
                    self.cargo
                        .iter()
                        .any(|c| c.id == **cid && c.destination == current_stop)
                })
                .copied();

            if let Some(cid) = unload_cid {
                self.elevators[ei].cargo.retain(|c| *c != cid);
                if let Some(c) = self.cargo.iter_mut().find(|c| c.id == cid) {
                    let weight = c.weight;
                    c.state = CargoState::Arrived;
                    self.elevators[ei].current_load -= weight;
                    self.events.emit(SimEvent::CargoUnloaded {
                        cargo: cid,
                        elevator: elevator_id,
                        stop: current_stop,
                        tick: self.tick,
                    });
                }
                continue;
            }

            // --- Load one waiting passenger at this stop ---
            let board_pid = self
                .passengers
                .iter()
                .find(|p| p.state == PassengerState::Waiting && p.origin == current_stop)
                .map(|p| (p.id, p.weight));

            if let Some((pid, weight)) = board_pid {
                if self.elevators[ei].current_load + weight > self.elevators[ei].weight_capacity {
                    self.events.emit(SimEvent::OverweightRejected {
                        entity_kind: "passenger".to_string(),
                        elevator: elevator_id,
                        tick: self.tick,
                    });
                    // Don't block — try cargo next tick, or skip.
                } else {
                    self.elevators[ei].current_load += weight;
                    self.elevators[ei].passengers.push(pid);
                    if let Some(p) = self.passengers.iter_mut().find(|p| p.id == pid) {
                        p.state = PassengerState::Boarding(elevator_id);
                    }
                    self.events.emit(SimEvent::PassengerBoarded {
                        passenger: pid,
                        elevator: elevator_id,
                        tick: self.tick,
                    });
                    continue;
                }
            }

            // --- Load one waiting cargo at this stop ---
            let load_cid = self
                .cargo
                .iter()
                .find(|c| c.state == CargoState::Waiting && c.origin == current_stop)
                .map(|c| (c.id, c.weight));

            if let Some((cid, weight)) = load_cid {
                if self.elevators[ei].current_load + weight > self.elevators[ei].weight_capacity {
                    self.events.emit(SimEvent::OverweightRejected {
                        entity_kind: "cargo".to_string(),
                        elevator: elevator_id,
                        tick: self.tick,
                    });
                } else {
                    self.elevators[ei].current_load += weight;
                    self.elevators[ei].cargo.push(cid);
                    if let Some(c) = self.cargo.iter_mut().find(|c| c.id == cid) {
                        c.state = CargoState::Loaded(elevator_id);
                    }
                    self.events.emit(SimEvent::CargoLoaded {
                        cargo: cid,
                        elevator: elevator_id,
                        tick: self.tick,
                    });
                }
            }
        }
    }

    /// Phase 5: Advance transient passenger states.
    ///
    /// Boarding → Riding, Alighting → Arrived after one tick so they're
    /// visible for exactly one frame in the visualization.
    fn phase_advance_transient(&mut self) {
        for p in &mut self.passengers {
            match p.state {
                PassengerState::Boarding(eid) => p.state = PassengerState::Riding(eid),
                PassengerState::Alighting(_) => p.state = PassengerState::Arrived,
                _ => {}
            }
        }
    }

    /// Build an owned WaitingManifest for dispatch decisions.
    fn build_waiting_manifest(&self, _elevator_idx: usize) -> WaitingManifest {
        let mut waiting_at_stop: HashMap<StopId, Vec<PassengerId>> = HashMap::new();
        let mut passenger_destinations: HashMap<PassengerId, StopId> = HashMap::new();

        for p in &self.passengers {
            passenger_destinations.insert(p.id, p.destination);
            if p.state == PassengerState::Waiting {
                waiting_at_stop.entry(p.origin).or_default().push(p.id);
            }
        }

        // Also include cargo destinations for riders.
        for c in &self.cargo {
            if let CargoState::Loaded(eid) = c.state
                && eid == self.elevators[_elevator_idx].id
            {
                // Cargo on this elevator — treat destination as a rider destination.
                passenger_destinations.insert(
                    PassengerId(c.id.0), // Reuse the ID space for manifest purposes.
                    c.destination,
                );
            }
        }

        let riders = self.elevators[_elevator_idx].passengers.clone();

        WaitingManifest {
            waiting_at_stop,
            riders,
            passenger_destinations,
        }
    }

    /// Find the stop at a given position (within epsilon).
    fn find_stop_at_position(&self, position: f64) -> Option<StopId> {
        const EPSILON: f64 = 1e-6;
        self.stops
            .iter()
            .find(|s| (s.position - position).abs() < EPSILON)
            .map(|s| s.id)
    }
}
