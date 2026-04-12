use crate::components::{
    ElevatorCar, ElevatorState, Position, RiderData, RiderState, Route, StopData, Velocity,
};
use crate::config::SimConfig;
use crate::dispatch::{DispatchStrategy, ElevatorGroup};
use crate::door::DoorState;
use crate::entity::EntityId;
use crate::events::{EventBus, SimEvent};
use crate::ids::GroupId;
use crate::metrics::Metrics;
use crate::stop::StopId;
use crate::systems::PhaseContext;
use crate::world::World;
use std::collections::HashMap;

/// The core simulation state, advanced by calling `tick()`.
pub struct Simulation {
    /// The ECS world containing all entity data.
    pub world: World,
    /// Event bus for simulation events.
    pub events: EventBus,
    /// Current simulation tick.
    pub tick: u64,
    /// Time delta per tick (seconds).
    pub dt: f64,
    /// Elevator groups in this simulation.
    pub groups: Vec<ElevatorGroup>,
    /// Config `StopId` to `EntityId` mapping for spawn helpers.
    pub stop_lookup: HashMap<StopId, EntityId>,
    /// Dispatch strategies keyed by group.
    dispatchers: HashMap<GroupId, Box<dyn DispatchStrategy>>,
    /// Aggregated metrics.
    metrics: Metrics,
}

impl Simulation {
    /// Create a new simulation from config and a dispatch strategy.
    #[allow(clippy::needless_pass_by_value)]
    pub fn new(config: SimConfig, dispatch: Box<dyn DispatchStrategy>) -> Self {
        let mut world = World::new();

        // Create stop entities.
        let mut stop_lookup: HashMap<StopId, EntityId> = HashMap::new();
        for sc in &config.building.stops {
            let eid = world.spawn();
            world.stop_data.insert(
                eid,
                StopData {
                    name: sc.name.clone(),
                    position: sc.position,
                },
            );
            stop_lookup.insert(sc.id, eid);
        }

        // Create elevator entities.
        let mut elevator_entities = Vec::new();
        for ec in &config.elevators {
            let eid = world.spawn();
            let start_pos = config
                .building
                .stops
                .iter()
                .find(|s| s.id == ec.starting_stop)
                .map_or(0.0, |s| s.position);
            world.positions.insert(eid, Position { value: start_pos });
            world.velocities.insert(eid, Velocity { value: 0.0 });
            world.elevator_cars.insert(
                eid,
                ElevatorCar {
                    state: ElevatorState::Idle,
                    door: DoorState::Closed,
                    max_speed: ec.max_speed,
                    acceleration: ec.acceleration,
                    deceleration: ec.deceleration,
                    weight_capacity: ec.weight_capacity,
                    current_load: 0.0,
                    riders: Vec::new(),
                    target_stop: None,
                    door_transition_ticks: ec.door_transition_ticks,
                    door_open_ticks: ec.door_open_ticks,
                    group: GroupId(0),
                },
            );
            elevator_entities.push(eid);
        }

        let group = ElevatorGroup {
            id: GroupId(0),
            name: "Default".into(),
            elevator_entities,
            stop_entities: stop_lookup.values().copied().collect(),
        };

        let mut dispatchers = HashMap::new();
        dispatchers.insert(GroupId(0), dispatch);

        let dt = 1.0 / config.simulation.ticks_per_second;

        Self {
            world,
            events: EventBus::default(),
            tick: 0,
            dt,
            groups: vec![group],
            stop_lookup,
            dispatchers,
            metrics: Metrics::new(),
        }
    }

    /// Get current simulation metrics.
    pub const fn metrics(&self) -> &Metrics {
        &self.metrics
    }

    /// Spawn a rider at the given origin stop entity, headed to destination stop entity.
    pub fn spawn_rider(
        &mut self,
        origin: EntityId,
        destination: EntityId,
        weight: f64,
    ) -> EntityId {
        let eid = self.world.spawn();
        self.world.rider_data.insert(
            eid,
            RiderData {
                weight,
                state: RiderState::Waiting,
                current_stop: Some(origin),
                spawn_tick: self.tick,
                board_tick: None,
            },
        );
        self.world
            .routes
            .insert(eid, Route::direct(origin, destination, GroupId(0)));
        self.events.emit(SimEvent::RiderSpawned {
            rider: eid,
            origin,
            destination,
            tick: self.tick,
        });
        eid
    }

    /// Convenience: spawn a rider by config `StopId` (returns `None` if stop not found).
    pub fn spawn_rider_by_stop_id(
        &mut self,
        origin: StopId,
        destination: StopId,
        weight: f64,
    ) -> Option<EntityId> {
        let origin_eid = *self.stop_lookup.get(&origin)?;
        let dest_eid = *self.stop_lookup.get(&destination)?;
        Some(self.spawn_rider(origin_eid, dest_eid, weight))
    }

    /// Drain all pending events.
    pub fn drain_events(&mut self) -> Vec<SimEvent> {
        self.events.drain()
    }

    /// Advance the simulation by one tick.
    pub fn tick(&mut self) {
        let ctx = PhaseContext {
            tick: self.tick,
            dt: self.dt,
        };

        crate::systems::advance_transient::run(&mut self.world, &mut self.events, &ctx);
        crate::systems::dispatch::run(
            &mut self.world,
            &mut self.events,
            &ctx,
            &self.groups,
            &mut self.dispatchers,
        );
        crate::systems::movement::run(&mut self.world, &mut self.events, &ctx);
        crate::systems::doors::run(&mut self.world, &mut self.events, &ctx);
        crate::systems::loading::run(&mut self.world, &mut self.events, &ctx);
        crate::systems::metrics::run(&self.world, &self.events, &mut self.metrics, &ctx);

        self.tick += 1;
    }
}
