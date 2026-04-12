use proptest::prelude::*;

use crate::config::{
    BuildingConfig, ElevatorConfig, PassengerSpawnConfig, SimConfig, SimulationParams,
};
use crate::dispatch::scan::ScanDispatch;
use crate::movement::tick_movement;
use crate::sim::Simulation;
use crate::stop::{StopConfig, StopId};

// ── A) tick_movement invariants ─────────────────────────────────────

proptest! {
    #[test]
    fn tick_movement_single_tick_invariants(
        position in -1000.0..1000.0_f64,
        target in -1000.0..1000.0_f64,
        max_speed in 0.1..100.0_f64,
        acceleration in 0.01..50.0_f64,
        deceleration in 0.01..50.0_f64,
        dt in 0.001..1.0_f64,
    ) {
        // Filter out cases where position ~= target.
        prop_assume!((target - position).abs() > 1e-6);

        let result = tick_movement(position, 0.0, target, max_speed, acceleration, deceleration, dt);

        // 1. If arrived, position must equal target (within epsilon).
        if result.arrived {
            prop_assert!(
                (result.position - target).abs() < 1e-6,
                "arrived but position {} != target {}",
                result.position,
                target,
            );
        }

        // 2. Velocity must never exceed max_speed (with float epsilon).
        prop_assert!(
            result.velocity.abs() <= max_speed + 1e-6,
            "velocity {} exceeded max_speed {}",
            result.velocity,
            max_speed,
        );

        // 3. If not arrived, position must be between start and target (no overshoot).
        if !result.arrived {
            let min = position.min(target);
            let max = position.max(target);
            prop_assert!(
                result.position >= min - 1e-9 && result.position <= max + 1e-9,
                "position {} overshot range [{}, {}]",
                result.position,
                min,
                max,
            );
        }
    }

    #[test]
    fn tick_movement_convergence(
        position in -1000.0..1000.0_f64,
        target in -1000.0..1000.0_f64,
        max_speed in 0.1..100.0_f64,
        acceleration in 0.01..50.0_f64,
        deceleration in 0.01..50.0_f64,
        dt in 0.001..1.0_f64,
    ) {
        prop_assume!((target - position).abs() > 1e-6);

        let mut pos = position;
        let mut vel = 0.0;
        let mut arrived = false;

        for _ in 0..100_000 {
            let result = tick_movement(pos, vel, target, max_speed, acceleration, deceleration, dt);
            pos = result.position;
            vel = result.velocity;
            if result.arrived {
                arrived = true;
                break;
            }
        }

        prop_assert!(
            arrived,
            "did not converge after 100k ticks: pos={pos}, vel={vel}, target={target}",
        );
    }
}

// ── B) Parameterized stress tests ───────────────────────────────────

/// Build a `SimConfig` with evenly spaced stops.
fn make_config(stop_count: u32, elevator_count: u32) -> SimConfig {
    let stops: Vec<StopConfig> = (0..stop_count)
        .map(|i| StopConfig {
            id: StopId(i),
            name: format!("Stop {i}"),
            position: f64::from(i) * 10.0,
        })
        .collect();

    let elevators: Vec<ElevatorConfig> = (0..elevator_count)
        .map(|i| ElevatorConfig {
            id: i,
            name: format!("Elevator {i}"),
            max_speed: 2.0,
            acceleration: 1.0,
            deceleration: 1.0,
            weight_capacity: 10_000.0,
            starting_stop: StopId(0),
            door_open_ticks: 10,
            door_transition_ticks: 5,
        })
        .collect();

    SimConfig {
        building: BuildingConfig {
            name: "Proptest Building".into(),
            stops,
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

proptest! {
    #![proptest_config(ProptestConfig::with_cases(20))]

    #[test]
    fn stress_no_panics(
        stop_count in 2..50_u32,
        elevator_count in 1..20_u32,
        rider_count in 1..500_u32,
        // Seed for deterministic rider stop selection.
        seed in 0..u64::MAX,
    ) {
        let config = make_config(stop_count, elevator_count);
        let mut sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();

        // Simple LCG for deterministic pseudo-random stop pairs.
        let mut rng_state = seed;
        let mut next = || -> u32 {
            rng_state = rng_state.wrapping_mul(6_364_136_223_846_793_005).wrapping_add(1);
            (rng_state >> 33) as u32
        };

        for _ in 0..rider_count {
            let origin = StopId(next() % stop_count);
            let mut dest = StopId(next() % stop_count);
            // Ensure origin != destination.
            if dest == origin {
                dest = StopId((origin.0 + 1) % stop_count);
            }
            sim.spawn_rider_by_stop_id(origin, dest, 70.0).unwrap();
        }

        for _ in 0..5000 {
            sim.step();
        }
        sim.drain_events();
    }
}
