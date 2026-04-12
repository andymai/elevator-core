use slotmap::{SecondaryMap, SlotMap};

use crate::components::*;
use crate::entity::EntityId;

/// Central storage for all simulation entities and their components.
///
/// The `alive` SlotMap owns entity keys. All component storages are
/// `SecondaryMap`s keyed by the same `EntityId`, enabling independent
/// mutable borrows of different component types within the same function.
pub struct World {
    /// Primary key storage. An entity exists iff its key is here.
    alive: SlotMap<EntityId, ()>,

    // -- Component storages (SecondaryMap for shared keys) --
    pub positions: SecondaryMap<EntityId, Position>,
    pub velocities: SecondaryMap<EntityId, Velocity>,
    pub elevator_cars: SecondaryMap<EntityId, ElevatorCar>,
    pub passenger_data: SecondaryMap<EntityId, PassengerData>,
    pub cargo_data: SecondaryMap<EntityId, CargoData>,
    pub stop_data: SecondaryMap<EntityId, StopData>,
    pub zone_data: SecondaryMap<EntityId, ZoneData>,
    pub routes: SecondaryMap<EntityId, Route>,
    pub patience: SecondaryMap<EntityId, Patience>,
    pub preferences: SecondaryMap<EntityId, Preferences>,
}

impl World {
    pub fn new() -> Self {
        World {
            alive: SlotMap::with_key(),
            positions: SecondaryMap::new(),
            velocities: SecondaryMap::new(),
            elevator_cars: SecondaryMap::new(),
            passenger_data: SecondaryMap::new(),
            cargo_data: SecondaryMap::new(),
            stop_data: SecondaryMap::new(),
            zone_data: SecondaryMap::new(),
            routes: SecondaryMap::new(),
            patience: SecondaryMap::new(),
            preferences: SecondaryMap::new(),
        }
    }

    /// Allocate a new entity. Returns its id. No components attached yet.
    pub fn spawn(&mut self) -> EntityId {
        self.alive.insert(())
    }

    /// Remove an entity and all its components.
    pub fn despawn(&mut self, id: EntityId) {
        self.alive.remove(id);
        self.positions.remove(id);
        self.velocities.remove(id);
        self.elevator_cars.remove(id);
        self.passenger_data.remove(id);
        self.cargo_data.remove(id);
        self.stop_data.remove(id);
        self.zone_data.remove(id);
        self.routes.remove(id);
        self.patience.remove(id);
        self.preferences.remove(id);
    }

    /// Check if an entity is alive.
    pub fn is_alive(&self, id: EntityId) -> bool {
        self.alive.contains_key(id)
    }

    /// Number of live entities.
    pub fn entity_count(&self) -> usize {
        self.alive.len()
    }

    // -- Typed query helpers --

    /// Iterate all elevator entities (have ElevatorCar + Position).
    pub fn elevators(&self) -> impl Iterator<Item = (EntityId, &Position, &ElevatorCar)> {
        self.elevator_cars.iter().filter_map(|(id, car)| {
            self.positions.get(id).map(|pos| (id, pos, car))
        })
    }

    /// All elevator entity IDs.
    pub fn elevator_ids(&self) -> Vec<EntityId> {
        self.elevator_cars.keys().collect()
    }

    /// Iterate all passenger entities.
    pub fn passengers(&self) -> impl Iterator<Item = (EntityId, &PassengerData)> {
        self.passenger_data.iter()
    }

    /// All passenger entity IDs.
    pub fn passenger_ids(&self) -> Vec<EntityId> {
        self.passenger_data.keys().collect()
    }

    /// Iterate all cargo entities.
    pub fn cargo(&self) -> impl Iterator<Item = (EntityId, &CargoData)> {
        self.cargo_data.iter()
    }

    /// Iterate all stop entities.
    pub fn stops(&self) -> impl Iterator<Item = (EntityId, &StopData)> {
        self.stop_data.iter()
    }

    /// All stop entity IDs.
    pub fn stop_ids(&self) -> Vec<EntityId> {
        self.stop_data.keys().collect()
    }

    /// Find the stop entity at a given position (within epsilon).
    pub fn find_stop_at_position(&self, position: f64) -> Option<EntityId> {
        const EPSILON: f64 = 1e-6;
        self.stop_data.iter().find_map(|(id, stop)| {
            if (stop.position - position).abs() < EPSILON {
                Some(id)
            } else {
                None
            }
        })
    }

    /// Get a stop's position by entity id.
    pub fn stop_position(&self, id: EntityId) -> Option<f64> {
        self.stop_data.get(id).map(|s| s.position)
    }
}

impl Default for World {
    fn default() -> Self {
        Self::new()
    }
}
