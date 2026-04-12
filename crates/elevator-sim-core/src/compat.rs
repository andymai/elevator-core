use crate::elevator::Elevator;
use crate::passenger::{Cargo, Passenger};
use crate::sim::Simulation;
use crate::stop::StopConfig;

/// Compatibility facade for accessing simulation state.
/// These methods reconstruct legacy types from the internal state.
/// For now they just delegate to the old Vec fields.
impl Simulation {
    /// Get all stops (compat).
    pub fn get_stops(&self) -> &[StopConfig] {
        &self.stops
    }

    /// Get all elevators (compat).
    pub fn get_elevators(&self) -> &[Elevator] {
        &self.elevators
    }

    /// Get all passengers (compat).
    pub fn get_passengers(&self) -> &[Passenger] {
        &self.passengers
    }

    /// Get all cargo (compat).
    pub fn get_cargo(&self) -> &[Cargo] {
        &self.cargo
    }
}
