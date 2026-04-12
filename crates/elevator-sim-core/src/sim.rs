use crate::components::{
    ElevatorCar as ElevatorCarComp, ElevatorState as NewElevatorState, Position, StopData, Velocity,
};
use crate::config::SimConfig;
use crate::dispatch::DispatchStrategy;
use crate::door::DoorState;
use crate::elevator::{Elevator, ElevatorId, ElevatorState};
use crate::entity::EntityId;
use crate::events::{EventBus, SimEvent};
use crate::ids::GroupId;
use crate::passenger::{Cargo, CargoId, CargoPriority, CargoState, Passenger, PassengerId, PassengerState};
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
        crate::systems::advance_transient::run(&mut self.passengers);
        crate::systems::dispatch::run(
            &mut self.elevators,
            &self.stops,
            &self.passengers,
            &self.cargo,
            self.dispatch.as_mut(),
            &mut self.events,
            self.tick,
        );
        crate::systems::movement::run(
            &mut self.elevators,
            &self.stops,
            self.dt,
            &mut self.events,
            self.tick,
        );
        crate::systems::doors::run(&mut self.elevators, &mut self.events, self.tick);
        crate::systems::loading::run(
            &mut self.elevators,
            &mut self.passengers,
            &mut self.cargo,
            &self.stops,
            &mut self.events,
            self.tick,
        );
        self.tick += 1;
    }
}
