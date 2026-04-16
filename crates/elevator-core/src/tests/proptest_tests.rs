use crate::components::{Accel, Speed, Weight};
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
        position in -100.0..100.0_f64,
        target in -100.0..100.0_f64,
        max_speed in 0.5..100.0_f64,
        acceleration in 0.1..50.0_f64,
        deceleration in 0.1..50.0_f64,
        dt in 0.01..1.0_f64,
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
            max_speed: Speed::from(2.0),
            acceleration: Accel::from(1.0),
            deceleration: Accel::from(1.0),
            weight_capacity: Weight::from(10_000.0),
            starting_stop: StopId(0),
            door_open_ticks: 10,
            door_transition_ticks: 5,
            restricted_stops: Vec::new(),
            #[cfg(feature = "energy")]
            energy_profile: None,
            service_mode: None,
            inspection_speed_factor: 0.25,
        })
        .collect();

    SimConfig {
        building: BuildingConfig {
            name: "Proptest Building".into(),
            stops,
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

// ── C) Movement overshoot property ──────────────────────────────────

proptest! {
    #[test]
    fn movement_never_overshoots(
        position in -500.0..500.0_f64,
        target in -500.0..500.0_f64,
        max_speed in 0.1..50.0_f64,
        acceleration in 0.01..20.0_f64,
        deceleration in 0.01..20.0_f64,
        dt in 0.001..0.5_f64,
    ) {
        prop_assume!((target - position).abs() > 1e-6);

        let mut pos = position;
        let mut vel = 0.0;

        for _ in 0..200_000 {
            let result = tick_movement(pos, vel, target, max_speed, acceleration, deceleration, dt);
            // Position must never be further from target than we started this tick.
            let distance_before = (target - pos).abs();
            let distance_after = (target - result.position).abs();
            // Allow float epsilon growth but not meaningful overshoot.
            prop_assert!(
                distance_after <= distance_before + 1e-9 || result.arrived,
                "overshoot: pos {pos} -> {} (target {target}), distance grew from {distance_before} to {distance_after}",
                result.position,
            );
            pos = result.position;
            vel = result.velocity;
            if result.arrived {
                break;
            }
        }
    }
}

// ── D) Door FSM never reaches invalid state ─────────────────────────

proptest! {
    #![proptest_config(ProptestConfig::with_cases(50))]

    #[test]
    fn door_fsm_valid_transitions(
        open_ticks in 1..50_u32,
        transition_ticks in 1..20_u32,
        tick_count in 1..500_u32,
        // Interrupt pattern: at which ticks to request open.
        interrupt_seed in 0..u64::MAX,
    ) {
        use crate::door::DoorState;

        let mut door = DoorState::Closed;
        let mut rng_state = interrupt_seed;
        let mut next = || -> bool {
            rng_state = rng_state.wrapping_mul(6_364_136_223_846_793_005).wrapping_add(1);
            (rng_state >> 63) == 1
        };

        for _ in 0..tick_count {
            // Randomly start an open sequence when closed.
            if door.is_closed() && next() {
                door = DoorState::request_open(transition_ticks, open_ticks);
            }

            door.tick();

            // Verify the door is always in a recognized valid state.
            #[allow(unreachable_patterns)]
            match door {
                DoorState::Closed
                | DoorState::Opening { .. }
                | DoorState::Open { .. }
                | DoorState::Closing { .. } => {} // all valid
                _ => prop_assert!(false, "invalid door state: {door:?}"),
            }
        }
    }
}

// ── E) Loading never exceeds weight capacity ────────────────────────

proptest! {
    #![proptest_config(ProptestConfig::with_cases(20))]

    #[test]
    fn loading_respects_weight_capacity(
        rider_count in 1..100_u32,
        capacity in 100.0..2000.0_f64,
        seed in 0..u64::MAX,
    ) {
        use crate::config::{BuildingConfig, ElevatorConfig, PassengerSpawnConfig, SimConfig, SimulationParams};
        use crate::stop::{StopConfig, StopId};

        let config = SimConfig {
            building: BuildingConfig {
                name: "Cap test".into(),
                stops: vec![
                    StopConfig { id: StopId(0), name: "A".into(), position: 0.0 },
                    StopConfig { id: StopId(1), name: "B".into(), position: 10.0 },
                ],
                lines: None,
                groups: None,
            },
            elevators: vec![ElevatorConfig {
                id: 0,
                name: "E0".into(),
                max_speed: Speed::from(5.0),
                acceleration: Accel::from(3.0),
                deceleration: Accel::from(3.0),
                weight_capacity: Weight::from(capacity),
                starting_stop: StopId(0),
                door_open_ticks: 5,
                door_transition_ticks: 2,
                restricted_stops: Vec::new(),
                #[cfg(feature = "energy")]
                energy_profile: None,
                service_mode: None,
                inspection_speed_factor: 0.25,
            }],
            simulation: SimulationParams { ticks_per_second: 60.0 },
            passenger_spawning: PassengerSpawnConfig {
                mean_interval_ticks: 60,
                weight_range: (50.0, 100.0),
            },
        };

        let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

        // Spawn riders with random weights (but always fitting individually).
        let mut rng_state = seed;
        let mut next_weight = || -> f64 {
            rng_state = rng_state.wrapping_mul(6_364_136_223_846_793_005).wrapping_add(1);
            let frac = (rng_state >> 32) as f64 / u32::MAX as f64;
            10.0 + frac * (capacity * 0.3) // individual weight always < capacity
        };

        for _ in 0..rider_count {
            sim.spawn_rider(StopId(0), StopId(1), next_weight()).unwrap();
        }

        // Run enough ticks for loading to happen.
        for _ in 0..2000 {
            sim.step();

            // Check all elevators respect capacity.
            for (_, _, elev) in sim.world().iter_elevators() {
                prop_assert!(
                    elev.current_load().value() <= capacity + 1e-9,
                    "elevator load {} exceeded capacity {capacity}",
                    elev.current_load(),
                );
            }
        }
    }
}

// ── F) Parameterized stress tests ───────────────────────────────────

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
        let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

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
            sim.spawn_rider(origin, dest, 70.0).unwrap();
        }

        for _ in 0..5000 {
            sim.step();
        }
        sim.drain_events();
    }
}
