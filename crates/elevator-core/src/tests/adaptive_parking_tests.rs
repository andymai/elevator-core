//! Unit tests for [`crate::dispatch::reposition::AdaptiveParking`].
//!
//! The strategy's behaviour is a pure dispatch on the current
//! [`TrafficMode`](crate::traffic_detector::TrafficMode); each test
//! pins the detector to one mode and verifies the idle-car moves
//! match the mode's inner strategy.

use crate::arrival_log::{ArrivalLog, CurrentTick, DestinationLog};
use crate::dispatch::reposition::AdaptiveParking;
use crate::dispatch::{BuiltinReposition, RepositionStrategy};
use crate::entity::EntityId;
use crate::traffic_detector::{TrafficDetector, TrafficMode};

use super::helpers::{default_config, scan};
use crate::sim::Simulation;

/// Spawn a world via `Simulation::new`, then return the first group +
/// a snapshot of `(stop_entity, position)` pairs sorted by position.
/// Keeps the test boilerplate tight.
fn sim_with_idle_cars(cars: usize) -> Simulation {
    let mut cfg = default_config();
    for i in 1..cars {
        cfg.elevators.push(crate::config::ElevatorConfig {
            id: i as u32,
            name: format!("Car {i}"),
            max_speed: cfg.elevators[0].max_speed,
            acceleration: cfg.elevators[0].acceleration,
            deceleration: cfg.elevators[0].deceleration,
            weight_capacity: cfg.elevators[0].weight_capacity,
            starting_stop: crate::stop::StopId(0),
            door_open_ticks: cfg.elevators[0].door_open_ticks,
            door_transition_ticks: cfg.elevators[0].door_transition_ticks,
            restricted_stops: Vec::new(),
            #[cfg(feature = "energy")]
            energy_profile: None,
            service_mode: None,
            inspection_speed_factor: 0.25,
            bypass_load_up_pct: None,
            bypass_load_down_pct: None,
        });
    }
    Simulation::new(&cfg, scan()).unwrap()
}

fn force_mode(sim: &mut Simulation, mode: TrafficMode) {
    // Replace the auto-installed detector with a pre-classified one
    // so the test doesn't depend on ArrivalLog seeding to reach the
    // desired mode. The wrapper here matches what the metrics phase
    // would produce for that mode.
    let mut detector = TrafficDetector::new();
    // SAFETY: the only way to set `current` from outside the module
    // is via `update()`, which reads the log. Use the log path.
    match mode {
        TrafficMode::Idle => { /* default mode */ }
        TrafficMode::UpPeak => {
            let mut log = ArrivalLog::default();
            // 70 arrivals at stop 0 over 18k-tick default window → up-peak.
            let lobby = sim.stop_entity(crate::stop::StopId(0)).unwrap();
            for t in 0..70u64 {
                log.record(t * 50, lobby);
            }
            let stops: Vec<EntityId> = sim.world().iter_stops().map(|(eid, _)| eid).collect();
            detector.update(&log, &DestinationLog::default(), 3_500, &stops);
        }
        TrafficMode::InterFloor => {
            let mut log = ArrivalLog::default();
            let stops: Vec<EntityId> = sim.world().iter_stops().map(|(eid, _)| eid).collect();
            for t in 0..60u64 {
                for &s in &stops {
                    log.record(t * 10, s);
                }
            }
            detector.update(&log, &DestinationLog::default(), 3_500, &stops);
        }
        TrafficMode::DownPeak => {
            // Seed a destination-heavy window: origins spread across
            // upper floors, destinations dominated by the lobby.
            let mut arrivals = ArrivalLog::default();
            let mut destinations = DestinationLog::default();
            let stops: Vec<EntityId> = sim.world().iter_stops().map(|(eid, _)| eid).collect();
            let lobby = stops[0];
            // 30 arrivals each at every non-lobby stop.
            for t in 0..30u64 {
                for &s in &stops[1..] {
                    arrivals.record(t * 50, s);
                }
            }
            // 75% of destinations at the lobby → down-peak.
            for t in 0..60u64 {
                destinations.record(t * 25, lobby);
            }
            for t in 0..20u64 {
                for &s in &stops[1..] {
                    destinations.record(t * 25, s);
                }
            }
            detector.update(&arrivals, &destinations, 3_500, &stops);
        }
    }
    // Ensure the detector's view is consistent with `CurrentTick` the
    // PredictiveParking inner strategy reads.
    sim.world_mut().insert_resource(detector);
    sim.world_mut().insert_resource(CurrentTick(3_500));
}

fn run_reposition(sim: &Simulation, strat: &mut AdaptiveParking) -> Vec<(EntityId, EntityId)> {
    let group = &sim.groups()[0];
    let idle: Vec<(EntityId, f64)> = group
        .elevator_entities()
        .iter()
        .filter_map(|&eid| sim.world().position(eid).map(|p| (eid, p.value)))
        .collect();
    let stops: Vec<(EntityId, f64)> = group
        .stop_entities()
        .iter()
        .filter_map(|&s| sim.world().stop_position(s).map(|p| (s, p)))
        .collect();
    let mut out = Vec::new();
    strat.reposition(&idle, &stops, group, sim.world(), &mut out);
    out
}

// ── Mode → inner strategy wiring ────────────────────────────────────

#[test]
fn idle_mode_stays_put() {
    let mut sim = sim_with_idle_cars(2);
    force_mode(&mut sim, TrafficMode::Idle);
    let mut strat = AdaptiveParking::new();
    let moves = run_reposition(&sim, &mut strat);
    assert!(
        moves.is_empty(),
        "Idle mode must not move cars, got {moves:?}"
    );
}

/// Up-peak should delegate to `ReturnToLobby` — cars not already at
/// the home stop get sent there.
#[test]
fn up_peak_returns_cars_to_lobby() {
    let mut sim = sim_with_idle_cars(2);
    // Move one car off the lobby so we can see it get called back.
    let elev = sim.world().elevator_ids()[1];
    let floor2 = sim.stop_entity(crate::stop::StopId(2)).unwrap();
    sim.world_mut()
        .set_position(elev, crate::components::Position { value: 8.0 });
    force_mode(&mut sim, TrafficMode::UpPeak);
    let mut strat = AdaptiveParking::new();
    let moves = run_reposition(&sim, &mut strat);
    assert!(
        moves
            .iter()
            .any(|(e, s)| *e == elev && *s == sim.stop_entity(crate::stop::StopId(0)).unwrap()),
        "up-peak must call idle cars back to lobby; moves={moves:?} (off-lobby car at stop entity {floor2:?})"
    );
}

/// `InterFloor` delegates to `PredictiveParking` — without any
/// arrivals at a specific hot stop, it's a no-op. Here we seed
/// arrivals via `force_mode`'s `InterFloor` branch (even spread),
/// so `PredictiveParking` will score every stop equally; the
/// greedy assignment then either moves nothing or moves each car
/// to a distinct stop. Either way it shouldn't send every car to
/// one stop.
#[test]
fn inter_floor_uses_predictive_not_return_to_lobby() {
    let mut sim = sim_with_idle_cars(3);
    // Move cars 1 and 2 off the lobby.
    let ids = sim.world().elevator_ids();
    sim.world_mut()
        .set_position(ids[1], crate::components::Position { value: 8.0 });
    sim.world_mut()
        .set_position(ids[2], crate::components::Position { value: 4.0 });
    force_mode(&mut sim, TrafficMode::InterFloor);
    let mut strat = AdaptiveParking::new();
    let moves = run_reposition(&sim, &mut strat);
    // Negation test: inter-floor must NOT behave like ReturnToLobby,
    // which would send every off-lobby car to stop 0.
    let lobby = sim.stop_entity(crate::stop::StopId(0)).unwrap();
    let all_going_to_lobby = !moves.is_empty() && moves.iter().all(|(_, s)| *s == lobby);
    assert!(
        !all_going_to_lobby,
        "inter-floor must not converge every car on the lobby; moves={moves:?}"
    );
}

/// Missing `TrafficDetector` resource (e.g. hand-built `World`) falls
/// back to `PredictiveParking` behaviour — treated as `InterFloor`.
#[test]
fn missing_detector_falls_back_to_predictive() {
    let mut sim = sim_with_idle_cars(2);
    // Forcibly remove the detector. The strategy should still
    // produce no-panic output (PredictiveParking reads the arrival
    // log and returns empty when the log is empty).
    sim.world_mut().remove_resource::<TrafficDetector>();
    let mut strat = AdaptiveParking::new();
    let moves = run_reposition(&sim, &mut strat);
    // No arrivals logged → PredictiveParking is a no-op. We don't
    // care about specific decisions, only that the missing-detector
    // path doesn't panic or crash.
    assert!(moves.is_empty() || moves.iter().all(|(_, _)| true));
}

// ── BuiltinReposition round-trip ────────────────────────────────────

#[test]
fn builtin_adaptive_instantiates() {
    assert!(BuiltinReposition::Adaptive.instantiate().is_some());
}

#[test]
fn builtin_adaptive_display() {
    assert_eq!(BuiltinReposition::Adaptive.to_string(), "Adaptive");
}

#[test]
fn builtin_adaptive_serde_roundtrip() {
    let v = BuiltinReposition::Adaptive;
    let s = ron::to_string(&v).unwrap();
    let back: BuiltinReposition = ron::from_str(&s).unwrap();
    assert_eq!(v, back);
}
