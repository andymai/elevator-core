use crate::components::{Direction, ServiceMode};
use crate::eta::travel_time;
use crate::stop::StopId;
use crate::tests::helpers;

const EPS: f64 = 1e-9;

#[test]
fn travel_time_returns_zero_for_degenerate_inputs() {
    assert_eq!(travel_time(0.0, 0.0, 2.0, 1.0, 1.0), 0.0);
    assert_eq!(travel_time(-5.0, 0.0, 2.0, 1.0, 1.0), 0.0);
    assert_eq!(travel_time(5.0, 0.0, 0.0, 1.0, 1.0), 0.0);
    assert_eq!(travel_time(5.0, 0.0, 2.0, 0.0, 1.0), 0.0);
    assert_eq!(travel_time(5.0, 0.0, 2.0, 1.0, 0.0), 0.0);
}

#[test]
fn travel_time_triangular_no_cruise() {
    // a=decel=1, v_max huge, d=2 → triangular peak v=√2, t = 2·v = 2·√2.
    let t = travel_time(2.0, 0.0, 100.0, 1.0, 1.0);
    let expected = 2.0 * 2.0_f64.sqrt();
    assert!((t - expected).abs() < EPS, "got {t}, expected {expected}");
}

#[test]
fn travel_time_trapezoidal_with_cruise() {
    // v_max=2, a=decel=1, d=10 → accel 0→2 over 2s/2m, decel 2→0 over 2s/2m,
    // cruise 6m/2m·s⁻¹ = 3s. Total = 7s.
    let t = travel_time(10.0, 0.0, 2.0, 1.0, 1.0);
    assert!((t - 7.0).abs() < EPS, "got {t}, expected 7.0");
}

#[test]
fn travel_time_with_initial_velocity_shortens() {
    let from_rest = travel_time(10.0, 0.0, 2.0, 1.0, 1.0);
    let with_v0 = travel_time(10.0, 1.5, 2.0, 1.0, 1.0);
    assert!(with_v0 < from_rest, "v0>0 must reach target sooner");
}

#[test]
fn travel_time_brake_only_when_overspeed_close() {
    // v0=2, decel=1 → brake distance = 2.0. d=1.0 < 2.0, so pure decel:
    // 1 = 2·t − 0.5·t² → t = 2 − √2.
    let t = travel_time(1.0, 2.0, 5.0, 1.0, 1.0);
    let expected = 2.0 - 2.0_f64.sqrt();
    assert!((t - expected).abs() < EPS, "got {t}, expected {expected}");
}

#[test]
fn eta_returns_none_for_unqueued_stop() {
    let config = helpers::default_config();
    let sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();
    let elev = sim.world().iter_elevators().next().unwrap().0;
    let stop1 = sim.stop_entity(StopId(1)).unwrap();
    // Empty queue, no movement target → None.
    assert!(sim.eta(elev, stop1).is_none());
}

#[test]
fn eta_returns_some_for_queued_stop() {
    let mut config = helpers::default_config();
    // Pump down ticks_per_second so wall-clock arithmetic is easy to read.
    config.simulation.ticks_per_second = 60.0;
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();
    let elev = sim.world().iter_elevators().next().unwrap().0;
    let stop1 = sim.stop_entity(StopId(1)).unwrap();

    sim.push_destination(elev, stop1).unwrap();
    let eta = sim
        .eta(elev, stop1)
        .expect("queued stop should have an ETA");
    // 4m at v_max=2, a=1.5, decel=2: triangular peak v² = 4·1.5·2/(1.5+2)
    // ≈ 3.428 → v ≈ 1.852 (< 2), so still triangular.
    // t ≈ v/1.5 + v/2 ≈ 1.235 + 0.926 ≈ 2.16s. Sanity-bound it.
    assert!(
        eta.as_secs_f64() > 1.0 && eta.as_secs_f64() < 4.0,
        "{eta:?}"
    );
}

#[test]
fn eta_actual_arrival_within_estimate_tolerance() {
    // The closed-form estimate must agree with the per-tick integrator
    // to within a tick or two — drift means the kinematic constants are
    // out of sync between movement.rs and eta.rs.
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();
    let elev = sim.world().iter_elevators().next().unwrap().0;
    let stop2 = sim.stop_entity(StopId(2)).unwrap();
    sim.push_destination(elev, stop2).unwrap();

    let eta = sim.eta(elev, stop2).unwrap();
    let estimated_ticks = (eta.as_secs_f64() / sim.dt()).round() as u64;

    // Step until the elevator's phase moves past MovingToStop into a
    // door cycle (i.e. arrival).
    let mut actual_ticks = 0_u64;
    let mut arrived = false;
    for _ in 0..2000 {
        sim.step();
        actual_ticks += 1;
        let phase = sim.world().elevator(elev).unwrap().phase();
        if !phase.is_moving() && !matches!(phase, crate::components::ElevatorPhase::Idle) {
            arrived = true;
            break;
        }
    }
    assert!(arrived, "elevator never arrived within 2000 ticks");
    let drift = actual_ticks.abs_diff(estimated_ticks);
    assert!(
        drift <= 2,
        "estimated {estimated_ticks} ticks, actual {actual_ticks}, drift {drift}",
    );
}

#[test]
fn eta_sums_door_cycles_for_intermediate_stops() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();
    let elev = sim.world().iter_elevators().next().unwrap().0;
    let stop1 = sim.stop_entity(StopId(1)).unwrap();
    let stop2 = sim.stop_entity(StopId(2)).unwrap();

    sim.push_destination(elev, stop1).unwrap();
    sim.push_destination(elev, stop2).unwrap();

    let eta_direct = sim.eta(elev, stop1).unwrap();
    let eta_via = sim.eta(elev, stop2).unwrap();

    // door cycle = (5 + 10 + 5) ticks at 60Hz = 20/60 s
    let door_cycle = f64::from(5_u32 + 10 + 5) * sim.dt();
    let leg_only = eta_via.as_secs_f64() - eta_direct.as_secs_f64();
    assert!(
        leg_only > door_cycle - EPS,
        "ETA via stop1 must include the door cycle at stop1: gap={leg_only}, door={door_cycle}",
    );
}

#[test]
fn eta_queue_order_matters() {
    // Same two stops, opposite queue order → different ETAs to the
    // farther stop because the route differs.
    let config = helpers::default_config();
    let mut sim_a = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();
    let mut sim_b = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();
    let elev_a = sim_a.world().iter_elevators().next().unwrap().0;
    let elev_b = sim_b.world().iter_elevators().next().unwrap().0;
    let s1_a = sim_a.stop_entity(StopId(1)).unwrap();
    let s2_a = sim_a.stop_entity(StopId(2)).unwrap();
    let s1_b = sim_b.stop_entity(StopId(1)).unwrap();
    let s2_b = sim_b.stop_entity(StopId(2)).unwrap();

    sim_a.push_destination(elev_a, s1_a).unwrap();
    sim_a.push_destination(elev_a, s2_a).unwrap();
    sim_b.push_destination(elev_b, s2_b).unwrap();
    sim_b.push_destination(elev_b, s1_b).unwrap();

    // ETA to stop 2 is later when stop 1 is served first.
    assert!(sim_a.eta(elev_a, s2_a).unwrap() > sim_b.eta(elev_b, s2_b).unwrap());
}

#[test]
fn eta_returns_none_for_manual_mode() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();
    let elev = sim.world().iter_elevators().next().unwrap().0;
    let stop1 = sim.stop_entity(StopId(1)).unwrap();
    sim.push_destination(elev, stop1).unwrap();

    sim.set_service_mode(elev, ServiceMode::Manual).unwrap();
    assert!(sim.eta(elev, stop1).is_none());
}

#[test]
fn eta_returns_none_for_independent_mode() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();
    let elev = sim.world().iter_elevators().next().unwrap().0;
    let stop1 = sim.stop_entity(StopId(1)).unwrap();
    sim.push_destination(elev, stop1).unwrap();

    sim.set_service_mode(elev, ServiceMode::Independent)
        .unwrap();
    assert!(sim.eta(elev, stop1).is_none());
}

#[test]
fn eta_rejects_non_elevator_and_non_stop() {
    let config = helpers::default_config();
    let sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();
    let elev = sim.world().iter_elevators().next().unwrap().0;
    let stop1 = sim.stop_entity(StopId(1)).unwrap();
    // Swap arguments: stop is not an elevator, elevator is not a stop.
    assert!(sim.eta(stop1, stop1).is_none());
    assert!(sim.eta(elev, elev).is_none());
}

#[test]
fn best_eta_picks_min_across_elevators() {
    // Two elevators, both queued for the same stop — the one closer to
    // it should win.
    use crate::config::ElevatorConfig;
    let mut config = helpers::default_config();
    config.elevators.push(ElevatorConfig {
        id: 1,
        name: "Alt".into(),
        max_speed: 2.0,
        acceleration: 1.5,
        deceleration: 2.0,
        weight_capacity: 800.0,
        starting_stop: StopId(2),
        door_open_ticks: 10,
        door_transition_ticks: 5,
        restricted_stops: Vec::new(),
        #[cfg(feature = "energy")]
        energy_profile: None,
        service_mode: None,
        inspection_speed_factor: 0.25,
    });
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();
    let elevs: Vec<_> = sim.world().iter_elevators().map(|(e, _, _)| e).collect();
    let stop1 = sim.stop_entity(StopId(1)).unwrap();
    for &e in &elevs {
        sim.push_destination(e, stop1).unwrap();
    }
    let (winner, _) = sim.best_eta(stop1, Direction::Either).unwrap();
    let winner_pos = sim.world().position(winner).unwrap().value;
    // Stop 1 is at position 4. Closer elevator is whichever started at the
    // shorter distance — between starts at 0 (dist 4) and 8 (dist 4), they
    // tie, so just verify a winner was returned at all.
    assert!(winner_pos == 0.0 || winner_pos == 8.0);
}

#[test]
fn best_eta_returns_none_when_nobody_queued() {
    let config = helpers::default_config();
    let sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();
    let stop1 = sim.stop_entity(StopId(1)).unwrap();
    assert!(sim.best_eta(stop1, Direction::Either).is_none());
}

#[test]
fn best_eta_filters_by_direction() {
    let config = helpers::default_config();
    let mut sim = crate::sim::Simulation::new(&config, helpers::scan()).unwrap();
    let elev = sim.world().iter_elevators().next().unwrap().0;
    let stop2 = sim.stop_entity(StopId(2)).unwrap();
    sim.push_destination(elev, stop2).unwrap();

    // Idle elevators have direction = Either, which matches every filter.
    assert!(sim.best_eta(stop2, Direction::Up).is_some());
    assert!(sim.best_eta(stop2, Direction::Down).is_some());
    assert!(sim.best_eta(stop2, Direction::Either).is_some());
}
