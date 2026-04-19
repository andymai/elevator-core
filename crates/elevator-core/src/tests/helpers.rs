use crate::components::{Accel, RiderPhase, Speed, Weight};
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
            max_speed: Speed::from(2.0),
            acceleration: Accel::from(1.5),
            deceleration: Accel::from(2.0),
            weight_capacity: Weight::from(800.0),
            starting_stop: StopId(0),
            door_open_ticks: 10,
            door_transition_ticks: 5,
            restricted_stops: Vec::new(),
            #[cfg(feature = "energy")]
            energy_profile: None,
            service_mode: None,
            inspection_speed_factor: 0.25,
            bypass_load_up_pct: None,
            bypass_load_down_pct: None,
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

/// Multi-stop, multi-elevator test config. Stops are uniformly spaced
/// `4.0` units apart starting at `0.0`; all elevators share the same
/// physics as [`default_config`] and start at stop index 0.
///
/// Used by canonical benchmark scenarios that need more than the
/// 3-stop/1-elevator default (up-peak sweeps, down-peak mirror,
/// full-load cycle, etc.).
///
/// # Panics
/// Panics if `stops < 2` or `cars < 1` — both are preconditions
/// for building a valid [`SimConfig`].
pub fn multi_floor_config(stops: usize, cars: usize) -> SimConfig {
    assert!(stops >= 2, "multi_floor_config requires at least 2 stops");
    assert!(cars >= 1, "multi_floor_config requires at least 1 car");
    let stop_configs: Vec<StopConfig> = (0..stops)
        .map(|i| StopConfig {
            id: StopId(i as u32),
            name: format!("Floor {i}"),
            position: i as f64 * 4.0,
        })
        .collect();
    let elevators: Vec<ElevatorConfig> = (0..cars)
        .map(|i| ElevatorConfig {
            id: i as u32,
            name: format!("Car {i}"),
            max_speed: Speed::from(2.0),
            acceleration: Accel::from(1.5),
            deceleration: Accel::from(2.0),
            weight_capacity: Weight::from(800.0),
            starting_stop: StopId(0),
            door_open_ticks: 10,
            door_transition_ticks: 5,
            restricted_stops: Vec::new(),
            #[cfg(feature = "energy")]
            energy_profile: None,
            service_mode: None,
            inspection_speed_factor: 0.25,
            bypass_load_up_pct: None,
            bypass_load_down_pct: None,
        })
        .collect();
    SimConfig {
        building: BuildingConfig {
            name: format!("{stops}-stop test building"),
            stops: stop_configs,
            lines: None,
            groups: None,
        },
        elevators,
        simulation: SimulationParams {
            ticks_per_second: 60.0,
        },
        passenger_spawning: PassengerSpawnConfig {
            mean_interval_ticks: 120,
            weight_range: (50.0, 100.0),
        },
    }
}

/// Step the simulation until all riders reach a terminal state
/// (`Arrived` or `Abandoned`) or `max_ticks` elapse. Drains events
/// each tick so event-driven metrics stay up to date.
///
/// Returns `true` if the sim drained before the timeout. Canonical
/// scenarios assert on the return value to fail fast on a stuck sim
/// rather than silently accepting a partial result.
pub fn run_until_done(sim: &mut Simulation, max_ticks: u64) -> bool {
    for _ in 0..max_ticks {
        sim.step();
        sim.drain_events();
        let all_terminal = sim
            .world()
            .iter_riders()
            .all(|(_, r)| matches!(r.phase, RiderPhase::Arrived | RiderPhase::Abandoned));
        if all_terminal {
            return true;
        }
    }
    false
}

/// Assert the sim's p95 wait time is strictly below `ticks`, with a
/// failure message that surfaces the observed p95 and sample count.
/// Scenario tests use this instead of inlining `assert!` so the
/// message shape is uniform across the canonical benchmark suite.
///
/// # Panics
/// Panics if [`Metrics::p95_wait_time`](crate::metrics::Metrics::p95_wait_time)
/// is at or above `ticks`.
pub fn assert_p95_wait_under(sim: &Simulation, ticks: u64) {
    let m = sim.metrics();
    let observed = m.p95_wait_time();
    assert!(
        observed < ticks,
        "expected p95 wait < {ticks} ticks, observed {observed} (samples: {})",
        m.wait_sample_count(),
    );
}
