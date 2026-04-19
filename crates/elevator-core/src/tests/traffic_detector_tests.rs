//! Unit + integration tests for [`crate::traffic_detector::TrafficDetector`].

use crate::arrival_log::ArrivalLog;
use crate::entity::EntityId;
use crate::traffic_detector::{TrafficDetector, TrafficMode};
use crate::world::World;

use super::helpers::{default_config, run_until_done, scan};
use crate::sim::Simulation;
use crate::stop::StopId;

/// Spawn three anonymous entities in a scratch world. Stable order —
/// the returned `[lobby, f2, f3]` layout matches the detector's
/// "lobby-is-first" expectation.
fn fake_stops() -> (World, Vec<EntityId>) {
    let mut world = World::new();
    let lobby = world.spawn();
    let f2 = world.spawn();
    let f3 = world.spawn();
    (world, vec![lobby, f2, f3])
}

// ── Classifier — direct unit tests ──────────────────────────────────

#[test]
fn default_mode_is_idle() {
    let d = TrafficDetector::new();
    assert_eq!(d.current_mode(), TrafficMode::Idle);
}

/// An empty arrival log at any tick keeps the detector idle — no
/// demand means no mode to claim.
#[test]
fn empty_log_stays_idle() {
    let mut d = TrafficDetector::new();
    let log = ArrivalLog::default();
    let (_w, stops) = fake_stops();
    d.update(&log, 60 * 60 * 10, &stops);
    assert_eq!(d.current_mode(), TrafficMode::Idle);
}

/// Classifier flips to `UpPeak` once ≥60% of arrivals are at the
/// lobby over the window.
#[test]
fn up_peak_trips_on_lobby_fraction() {
    let mut d = TrafficDetector::new().with_window_ticks(3_600);
    let mut log = ArrivalLog::default();
    let (_w, stops) = fake_stops();
    let lobby = stops[0];
    let f2 = stops[1];
    let f3 = stops[2];
    // 70 arrivals at lobby, 30 spread across upper floors → 70% lobby.
    for t in 0..70u64 {
        log.record(t * 50, lobby);
    }
    for t in 0..15u64 {
        log.record(t * 50, f2);
        log.record(t * 50, f3);
    }
    d.update(&log, 3_500, &[lobby, f2, f3]);
    assert_eq!(d.current_mode(), TrafficMode::UpPeak);
}

/// Evenly distributed arrivals at a sustained rate classify as
/// `InterFloor`, not up-peak.
#[test]
fn inter_floor_uniform_distribution() {
    let mut d = TrafficDetector::new().with_window_ticks(3_600);
    let mut log = ArrivalLog::default();
    let (_w, stops) = fake_stops();
    for t in 0..60u64 {
        for &s in &stops {
            log.record(t * 10, s);
        }
    }
    d.update(&log, 3_500, &stops);
    assert_eq!(d.current_mode(), TrafficMode::InterFloor);
}

/// Below the idle-rate threshold the classifier returns `Idle`
/// regardless of the lobby fraction — a trickle of lobby-only
/// arrivals during overnight hours isn't "up-peak."
#[test]
fn idle_rate_overrides_lobby_fraction() {
    let mut d = TrafficDetector::new().with_window_ticks(3_600);
    let mut log = ArrivalLog::default();
    let (_w, stops) = fake_stops();
    let lobby = stops[0];
    let f2 = stops[1];
    // 1 lobby arrival over the 3600-tick window = rate 1/3600 ≈
    // 0.00028/tick, under the 2/3600 ≈ 0.00056 default threshold.
    // Total rate is what the classifier checks first.
    log.record(100, lobby);
    d.update(&log, 3_500, &[lobby, f2]);
    assert_eq!(d.current_mode(), TrafficMode::Idle);
}

/// Zero stops → Idle (no lobby to compare against).
#[test]
fn no_stops_is_idle() {
    let mut d = TrafficDetector::new();
    d.update(&ArrivalLog::default(), 1_000, &[]);
    assert_eq!(d.current_mode(), TrafficMode::Idle);
}

/// An empty arrival window with `idle_rate_threshold = 0.0` must
/// still classify as `Idle` — the docstring promises "min rate to
/// leave Idle," which a zero threshold trivially satisfies, but the
/// strict `<` in the rate comparison wouldn't on its own (0 < 0 is
/// false). Greptile regression pin for the #361 review.
#[test]
fn zero_threshold_with_empty_window_stays_idle() {
    let mut d = TrafficDetector::new().with_idle_rate_threshold(0.0);
    let (_w, stops) = fake_stops();
    d.update(&ArrivalLog::default(), 3_600, &stops);
    assert_eq!(d.current_mode(), TrafficMode::Idle);
}

#[test]
#[should_panic(expected = "TrafficDetector::with_window_ticks requires a positive window")]
fn zero_window_panics() {
    let _ = TrafficDetector::new().with_window_ticks(0);
}

#[test]
#[should_panic(expected = "up_peak_fraction must be finite and in [0, 1]")]
fn out_of_range_up_peak_fraction_panics() {
    let _ = TrafficDetector::new().with_up_peak_fraction(1.5);
}

#[test]
#[should_panic(expected = "idle_rate_threshold must be finite and non-negative")]
fn nan_idle_rate_panics() {
    let _ = TrafficDetector::new().with_idle_rate_threshold(f64::NAN);
}

// ── Integration: Simulation auto-installs + auto-updates ────────────

/// `Simulation::new` must install a `TrafficDetector` as a world
/// resource so downstream strategies can read it without manual
/// plumbing.
#[test]
fn simulation_installs_traffic_detector_resource() {
    let sim = Simulation::new(&default_config(), scan()).unwrap();
    let present = sim.world().resource::<TrafficDetector>().is_some();
    assert!(
        present,
        "Simulation::new must insert a TrafficDetector resource by default"
    );
}

/// The metrics phase must refresh the detector each tick. After a
/// burst of lobby-spawns and enough sim time for the window to fill,
/// the detector's `last_update_tick` must be recent relative to the
/// current tick (within one tick — the metrics phase runs with
/// `ctx.tick` reflecting the just-completed tick, which trails
/// `sim.current_tick()` by at most 1).
#[test]
fn metrics_phase_refreshes_detector_last_update_tick() {
    let mut sim = Simulation::new(&default_config(), scan()).unwrap();
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    let _ = run_until_done(&mut sim, 20_000);
    let now = sim.current_tick();
    let detector = sim
        .world()
        .resource::<TrafficDetector>()
        .unwrap_or_else(|| panic!("detector installed"));
    let delta = now.saturating_sub(detector.last_update_tick());
    assert!(
        delta <= 1,
        "metrics phase must refresh the detector every tick (delta={delta}, now={now})"
    );
    assert!(
        detector.last_update_tick() > 0,
        "detector was never updated"
    );
}
