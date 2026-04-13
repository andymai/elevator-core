use crate::components::RiderPhase;
use crate::config::*;
use crate::dispatch::scan::ScanDispatch;
use crate::sim::Simulation;
use crate::stop::{StopConfig, StopId};

/// Standard 3-stop, 1-elevator test config.
pub fn default_config() -> SimConfig {
    SimConfig {
        building: BuildingConfig {
            name: "Test Building".into(),
            stops: vec![
                StopConfig {
                    id: StopId(0),
                    name: "Ground".into(),
                    position: 0.0,
                },
                StopConfig {
                    id: StopId(1),
                    name: "Floor 2".into(),
                    position: 4.0,
                },
                StopConfig {
                    id: StopId(2),
                    name: "Floor 3".into(),
                    position: 8.0,
                },
            ],
            lines: None,
            groups: None,
        },
        elevators: vec![ElevatorConfig {
            id: 0,
            name: "Main".into(),
            max_speed: 2.0,
            acceleration: 1.5,
            deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 10,
            door_transition_ticks: 5,
            restricted_stops: Vec::new(),
            #[cfg(feature = "energy")]
            energy_profile: None,
        }],
        simulation: SimulationParams {
            ticks_per_second: 60.0,
        },
        passenger_spawning: PassengerSpawnConfig {
            mean_interval_ticks: 120,
            weight_range: (50.0, 100.0),
        },
    }
}

/// Check if all riders in the sim have arrived.
pub fn all_riders_arrived(sim: &Simulation) -> bool {
    sim.world()
        .iter_riders()
        .all(|(_, r)| r.phase == RiderPhase::Arrived)
}

/// Create a SCAN dispatch strategy.
pub fn scan() -> ScanDispatch {
    ScanDispatch::new()
}
