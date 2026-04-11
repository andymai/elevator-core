use crate::config::SimConfig;
use crate::dispatch::DispatchStrategy;
use crate::elevator::Elevator;
use crate::events::EventBus;
use crate::passenger::{Cargo, Passenger};
use crate::stop::StopConfig;

/// The core simulation state, advanced by calling `tick()`.
pub struct Simulation {
    pub tick: u64,
    pub dt: f64,
    pub stops: Vec<StopConfig>,
    pub elevators: Vec<Elevator>,
    pub passengers: Vec<Passenger>,
    pub cargo: Vec<Cargo>,
    pub events: EventBus,
    dispatch: Box<dyn DispatchStrategy>,
    next_passenger_id: u64,
    next_cargo_id: u64,
}
