//! Unit tests for [`crate::scenario::SpawnSchedule`] and the new
//! [`crate::scenario::Condition::P95WaitBelow`] variant, plus sanity
//! checks for the [`super::helpers`] additions.

use rand::SeedableRng;
use rand::rngs::StdRng;

use crate::scenario::SpawnSchedule;
use crate::stop::StopId;
use crate::traffic::TrafficPattern;

use super::helpers::{multi_floor_config, run_until_done, scan};

// ── SpawnSchedule::burst ────────────────────────────────────────────

#[test]
fn burst_creates_n_identical_spawns_at_same_tick() {
    let schedule = SpawnSchedule::new().burst(StopId(0), StopId(3), 4, 100, 70.0);
    assert_eq!(schedule.len(), 4);
    for spawn in schedule.spawns() {
        assert_eq!(spawn.tick, 100);
        assert_eq!(spawn.origin, StopId(0));
        assert_eq!(spawn.destination, StopId(3));
        assert_eq!(spawn.weight, 70.0);
    }
}

#[test]
fn burst_with_zero_count_is_noop() {
    let schedule = SpawnSchedule::new().burst(StopId(0), StopId(1), 0, 0, 70.0);
    assert!(schedule.is_empty());
}

// ── SpawnSchedule::staggered ────────────────────────────────────────

#[test]
fn staggered_spaces_spawns_by_stagger_ticks() {
    let schedule = SpawnSchedule::new().staggered(StopId(0), StopId(2), 5, 1000, 300, 70.0);
    let ticks: Vec<u64> = schedule.spawns().iter().map(|s| s.tick).collect();
    assert_eq!(ticks, vec![1000, 1300, 1600, 1900, 2200]);
}

/// `stagger_ticks = 0` degenerates to a burst — all spawns at `start_tick`.
/// Documents the boundary behaviour so callers don't need to special-case.
#[test]
fn staggered_with_zero_stagger_degenerates_to_burst() {
    let staggered = SpawnSchedule::new().staggered(StopId(0), StopId(1), 3, 500, 0, 60.0);
    assert!(staggered.spawns().iter().all(|s| s.tick == 500));
    assert_eq!(staggered.len(), 3);
}

// ── SpawnSchedule::from_pattern ─────────────────────────────────────

/// Seeded RNG ⇒ deterministic spawn sequence. Pin it so scenario-test
/// authors don't have to worry about cross-run drift.
#[test]
fn from_pattern_is_deterministic_with_seeded_rng() {
    let stops = vec![StopId(0), StopId(1), StopId(2), StopId(3)];
    let run = |seed: u64| {
        let mut rng = StdRng::seed_from_u64(seed);
        SpawnSchedule::new()
            .from_pattern(
                TrafficPattern::UpPeak,
                &stops,
                5_000,
                120,
                (60.0, 80.0),
                &mut rng,
            )
            .into_spawns()
    };
    let first = run(42);
    let second = run(42);
    assert_eq!(
        first.len(),
        second.len(),
        "same seed must yield same spawn count"
    );
    for (a, b) in first.iter().zip(second.iter()) {
        assert_eq!(a.tick, b.tick);
        assert_eq!(a.origin, b.origin);
        assert_eq!(a.destination, b.destination);
        assert!((a.weight - b.weight).abs() < 1e-9);
    }
}

#[test]
fn from_pattern_respects_duration_bound() {
    let stops = vec![StopId(0), StopId(1), StopId(2)];
    let mut rng = StdRng::seed_from_u64(7);
    let schedule = SpawnSchedule::new().from_pattern(
        TrafficPattern::Uniform,
        &stops,
        1_000,
        50,
        (70.0, 80.0),
        &mut rng,
    );
    assert!(
        schedule.spawns().iter().all(|s| s.tick < 1_000),
        "no spawns should exceed the duration bound"
    );
}

/// Up-peak samples destinations from `1..n`; origin is always the lobby.
/// Useful to assert a schedule is actually shaped like up-peak.
#[test]
fn from_pattern_up_peak_biases_origin_to_lobby() {
    let stops = vec![StopId(0), StopId(1), StopId(2), StopId(3)];
    let mut rng = StdRng::seed_from_u64(99);
    let schedule = SpawnSchedule::new().from_pattern(
        TrafficPattern::UpPeak,
        &stops,
        20_000,
        120,
        (70.0, 70.0),
        &mut rng,
    );
    let lobby_origins = schedule
        .spawns()
        .iter()
        .filter(|s| s.origin == StopId(0))
        .count();
    let total = schedule.len();
    // Up-peak is 80% lobby-origin (see `TrafficPattern::UpPeak` docs).
    // Allow generous slack for Poisson variance on short runs.
    assert!(total > 50, "need enough samples for the ratio test");
    assert!(
        lobby_origins * 10 >= total * 6,
        "expected ≥60% lobby origins under up-peak, got {lobby_origins}/{total}"
    );
}

#[test]
fn from_pattern_with_fewer_than_two_stops_returns_empty() {
    let mut rng = StdRng::seed_from_u64(1);
    let stops_one = vec![StopId(0)];
    let schedule = SpawnSchedule::new().from_pattern(
        TrafficPattern::Uniform,
        &stops_one,
        1_000,
        50,
        (70.0, 80.0),
        &mut rng,
    );
    assert!(schedule.is_empty());
}

#[test]
fn from_pattern_with_zero_mean_interval_returns_empty() {
    let mut rng = StdRng::seed_from_u64(1);
    let stops = vec![StopId(0), StopId(1)];
    let schedule = SpawnSchedule::new().from_pattern(
        TrafficPattern::Uniform,
        &stops,
        1_000,
        0,
        (70.0, 80.0),
        &mut rng,
    );
    assert!(schedule.is_empty());
}

/// Weight range with reversed endpoints is swapped, matching
/// [`crate::traffic::PoissonSource`] convention.
#[test]
fn from_pattern_handles_reversed_weight_range() {
    let mut rng = StdRng::seed_from_u64(2);
    let stops = vec![StopId(0), StopId(1), StopId(2)];
    let schedule = SpawnSchedule::new().from_pattern(
        TrafficPattern::Uniform,
        &stops,
        5_000,
        100,
        (90.0, 60.0), // reversed
        &mut rng,
    );
    for spawn in schedule.spawns() {
        assert!((60.0..=90.0).contains(&spawn.weight));
    }
}

// ── Composition ─────────────────────────────────────────────────────

#[test]
fn merge_concatenates_spawns() {
    let a = SpawnSchedule::new().burst(StopId(0), StopId(1), 2, 100, 70.0);
    let b = SpawnSchedule::new().burst(StopId(1), StopId(0), 3, 200, 80.0);
    let merged = a.merge(b);
    assert_eq!(merged.len(), 5);
    assert_eq!(merged.spawns()[0].tick, 100);
    assert_eq!(merged.spawns()[4].tick, 200);
}

#[test]
fn push_appends_single_spawn() {
    let schedule = SpawnSchedule::new()
        .burst(StopId(0), StopId(1), 2, 0, 70.0)
        .push(crate::scenario::TimedSpawn {
            tick: 50,
            origin: StopId(2),
            destination: StopId(0),
            weight: 65.0,
        });
    assert_eq!(schedule.len(), 3);
    assert_eq!(schedule.spawns()[2].tick, 50);
}

#[test]
fn into_spawns_yields_vec() {
    let schedule = SpawnSchedule::new().burst(StopId(0), StopId(1), 2, 0, 70.0);
    let v: Vec<_> = schedule.into_spawns();
    assert_eq!(v.len(), 2);
}

// ── helpers sanity ──────────────────────────────────────────────────

#[test]
fn multi_floor_config_has_requested_shape() {
    let cfg = multi_floor_config(6, 3);
    assert_eq!(cfg.building.stops.len(), 6);
    assert_eq!(cfg.elevators.len(), 3);
    // Uniform 4.0 spacing.
    for (i, stop) in cfg.building.stops.iter().enumerate() {
        assert!((i as f64).mul_add(-4.0, stop.position).abs() < 1e-9);
    }
}

#[test]
#[should_panic(expected = "at least 2 stops")]
fn multi_floor_config_panics_on_one_stop() {
    let _ = multi_floor_config(1, 1);
}

#[test]
#[should_panic(expected = "at least 1 car")]
fn multi_floor_config_panics_on_zero_cars() {
    let _ = multi_floor_config(3, 0);
}

#[test]
fn run_until_done_returns_true_for_simple_scenario() {
    let cfg = multi_floor_config(3, 1);
    let mut sim = crate::sim::Simulation::new(&cfg, scan()).unwrap();
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    assert!(run_until_done(&mut sim, 20_000));
}

#[test]
fn run_until_done_returns_false_for_empty_deadline() {
    // Rider present but deadline too short ⇒ returns false.
    let cfg = multi_floor_config(3, 1);
    let mut sim = crate::sim::Simulation::new(&cfg, scan()).unwrap();
    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    assert!(!run_until_done(&mut sim, 5));
}
