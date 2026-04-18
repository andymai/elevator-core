use crate::components::Stop;
use crate::stop::StopId;
use crate::traffic::{PoissonSource, SpawnRequest, TrafficPattern, TrafficSchedule, TrafficSource};
use crate::world::World;

fn make_stops(world: &mut World, count: usize) -> Vec<crate::entity::EntityId> {
    (0..count)
        .map(|i| {
            let eid = world.spawn();
            world.set_stop(
                eid,
                Stop {
                    name: format!("Stop {i}"),
                    position: i as f64 * 4.0,
                },
            );
            eid
        })
        .collect()
}

#[test]
fn uniform_produces_different_pairs() {
    let mut world = World::new();
    let stops = make_stops(&mut world, 5);
    let mut rng = rand::rng();

    let mut origins = std::collections::HashSet::new();
    for _ in 0..100 {
        let (o, d) = TrafficPattern::Uniform.sample(&stops, &mut rng).unwrap();
        assert_ne!(o, d, "Origin and destination should differ");
        origins.insert(o);
    }
    assert!(origins.len() > 1, "Should produce varied origins");
}

#[test]
fn up_peak_biases_to_lobby() {
    let mut world = World::new();
    let stops = make_stops(&mut world, 10);
    let lobby = stops[0];
    let mut rng = rand::rng();

    let mut lobby_origins = 0;
    let total = 1000;
    for _ in 0..total {
        let (o, _) = TrafficPattern::UpPeak.sample(&stops, &mut rng).unwrap();
        if o == lobby {
            lobby_origins += 1;
        }
    }

    let ratio = lobby_origins as f64 / total as f64;
    assert!(
        ratio > 0.5,
        "UpPeak should have >50% origins from lobby, got {ratio:.2}"
    );
}

#[test]
fn down_peak_biases_dest_to_lobby() {
    let mut world = World::new();
    let stops = make_stops(&mut world, 10);
    let lobby = stops[0];
    let mut rng = rand::rng();

    let mut lobby_dests = 0;
    let total = 1000;
    for _ in 0..total {
        let (_, d) = TrafficPattern::DownPeak.sample(&stops, &mut rng).unwrap();
        if d == lobby {
            lobby_dests += 1;
        }
    }

    let ratio = lobby_dests as f64 / total as f64;
    assert!(
        ratio > 0.5,
        "DownPeak should have >50% destinations to lobby, got {ratio:.2}"
    );
}

#[test]
fn too_few_stops_returns_none() {
    let mut world = World::new();
    let stops = make_stops(&mut world, 1);
    let mut rng = rand::rng();
    assert!(TrafficPattern::Uniform.sample(&stops, &mut rng).is_none());
}

// ── TrafficSchedule ──────────────────────────────────────────────────

#[test]
fn schedule_pattern_at_returns_correct_segment() {
    let schedule = TrafficSchedule::new(vec![
        (0..100, TrafficPattern::UpPeak),
        (100..200, TrafficPattern::DownPeak),
        (200..300, TrafficPattern::Lunchtime),
    ]);

    assert_eq!(schedule.pattern_at(0), &TrafficPattern::UpPeak);
    assert_eq!(schedule.pattern_at(50), &TrafficPattern::UpPeak);
    assert_eq!(schedule.pattern_at(99), &TrafficPattern::UpPeak);
    assert_eq!(schedule.pattern_at(100), &TrafficPattern::DownPeak);
    assert_eq!(schedule.pattern_at(199), &TrafficPattern::DownPeak);
    assert_eq!(schedule.pattern_at(250), &TrafficPattern::Lunchtime);
}

#[test]
fn schedule_fallback_when_outside_segments() {
    let schedule = TrafficSchedule::new(vec![(10..20, TrafficPattern::UpPeak)]);

    // Before, after, and at boundary should all return fallback (Uniform).
    assert_eq!(schedule.pattern_at(0), &TrafficPattern::Uniform);
    assert_eq!(schedule.pattern_at(5), &TrafficPattern::Uniform);
    assert_eq!(schedule.pattern_at(20), &TrafficPattern::Uniform);
    assert_eq!(schedule.pattern_at(1000), &TrafficPattern::Uniform);
}

#[test]
fn schedule_custom_fallback() {
    let schedule = TrafficSchedule::new(vec![(0..10, TrafficPattern::UpPeak)])
        .with_fallback(TrafficPattern::Mixed);

    assert_eq!(schedule.pattern_at(5), &TrafficPattern::UpPeak);
    assert_eq!(schedule.pattern_at(10), &TrafficPattern::Mixed);
    assert_eq!(schedule.pattern_at(999), &TrafficPattern::Mixed);
}

#[test]
fn schedule_office_day_segments() {
    let tph = 100;
    let schedule = TrafficSchedule::office_day(tph);

    assert_eq!(schedule.pattern_at(0), &TrafficPattern::UpPeak);
    assert_eq!(schedule.pattern_at(99), &TrafficPattern::UpPeak);
    assert_eq!(schedule.pattern_at(100), &TrafficPattern::Uniform);
    assert_eq!(schedule.pattern_at(399), &TrafficPattern::Uniform);
    assert_eq!(schedule.pattern_at(400), &TrafficPattern::Lunchtime);
    assert_eq!(schedule.pattern_at(499), &TrafficPattern::Lunchtime);
    assert_eq!(schedule.pattern_at(500), &TrafficPattern::Uniform);
    assert_eq!(schedule.pattern_at(799), &TrafficPattern::Uniform);
    assert_eq!(schedule.pattern_at(800), &TrafficPattern::DownPeak);
    assert_eq!(schedule.pattern_at(899), &TrafficPattern::DownPeak);
    // After hour 9 → fallback (Uniform).
    assert_eq!(schedule.pattern_at(900), &TrafficPattern::Uniform);
}

#[test]
fn schedule_sample_delegates_to_active_pattern() {
    let mut world = World::new();
    let stops = make_stops(&mut world, 10);
    let lobby = stops[0];
    let mut rng = rand::rng();

    // Up-peak segment at tick 0..100, then uniform.
    let schedule = TrafficSchedule::new(vec![(0..100, TrafficPattern::UpPeak)]);

    // Sample during up-peak — expect bias toward lobby origin.
    let mut lobby_origins = 0;
    let total = 500;
    for _ in 0..total {
        if let Some((o, d)) = schedule.sample(50, &stops, &mut rng) {
            assert_ne!(o, d);
            if o == lobby {
                lobby_origins += 1;
            }
        }
    }
    let ratio = lobby_origins as f64 / total as f64;
    assert!(
        ratio > 0.5,
        "Up-peak schedule segment should bias origins to lobby, got {ratio:.2}"
    );

    // Sample outside segment — should use fallback (Uniform), less lobby bias.
    let mut lobby_origins_fallback = 0;
    for _ in 0..total {
        if let Some((o, _)) = schedule.sample(200, &stops, &mut rng)
            && o == lobby
        {
            lobby_origins_fallback += 1;
        }
    }
    let fallback_ratio = lobby_origins_fallback as f64 / total as f64;
    // Uniform with 10 stops should give ~10% lobby origins, definitely <50%.
    assert!(
        fallback_ratio < 0.5,
        "Fallback (Uniform) should not bias to lobby, got {fallback_ratio:.2}"
    );
}

// ── sample_stop_ids ──────────────────────────────────────────────────

#[test]
fn sample_stop_ids_uniform() {
    let stops: Vec<StopId> = (0..5).map(StopId).collect();
    let mut rng = rand::rng();

    let mut origins = std::collections::HashSet::new();
    for _ in 0..100 {
        let (o, d) = TrafficPattern::Uniform
            .sample_stop_ids(&stops, &mut rng)
            .unwrap();
        assert_ne!(o, d);
        origins.insert(o);
    }
    assert!(origins.len() > 1);
}

#[test]
fn sample_stop_ids_up_peak_biases_lobby() {
    let stops: Vec<StopId> = (0..10).map(StopId).collect();
    let lobby = StopId(0);
    let mut rng = rand::rng();

    let total = 1000;
    let lobby_origins = (0..total)
        .filter(|_| {
            TrafficPattern::UpPeak
                .sample_stop_ids(&stops, &mut rng)
                .unwrap()
                .0
                == lobby
        })
        .count();

    let ratio = lobby_origins as f64 / total as f64;
    assert!(ratio > 0.5, "UpPeak should bias to lobby, got {ratio:.2}");
}

#[test]
fn sample_stop_ids_too_few_stops() {
    let stops = vec![StopId(0)];
    let mut rng = rand::rng();
    assert!(
        TrafficPattern::Uniform
            .sample_stop_ids(&stops, &mut rng)
            .is_none()
    );
}

// ── TrafficSchedule::sample_stop_ids ─────────────────────────────────

#[test]
fn schedule_sample_stop_ids() {
    let stops: Vec<StopId> = (0..5).map(StopId).collect();
    let mut rng = rand::rng();
    let schedule = TrafficSchedule::new(vec![(0..100, TrafficPattern::UpPeak)]);

    let (o, d) = schedule.sample_stop_ids(50, &stops, &mut rng).unwrap();
    assert_ne!(o, d);
}

// ── TrafficSchedule::constant ────────────────────────────────────────

#[test]
fn schedule_constant_always_returns_same_pattern() {
    let schedule = TrafficSchedule::constant(TrafficPattern::DownPeak);
    assert_eq!(schedule.pattern_at(0), &TrafficPattern::DownPeak);
    assert_eq!(schedule.pattern_at(999_999), &TrafficPattern::DownPeak);
}

// ── SpawnRequest ─────────────────────────────────────────────────────

#[test]
fn spawn_request_fields() {
    let req = SpawnRequest {
        origin: StopId(0),
        destination: StopId(3),
        weight: 75.0,
    };
    assert_eq!(req.origin, StopId(0));
    assert_eq!(req.destination, StopId(3));
    assert!((req.weight - 75.0).abs() < f64::EPSILON);
}

// ── PoissonSource ────────────────────────────────────────────────────

#[test]
fn poisson_source_generates_riders() {
    let stops: Vec<StopId> = (0..5).map(StopId).collect();
    let mut source = PoissonSource::new(
        stops.clone(),
        TrafficSchedule::constant(TrafficPattern::Uniform),
        10, // mean 10 ticks between arrivals
        (60.0, 90.0),
    );

    let mut total_spawned = 0;
    for tick in 0..10_000 {
        let requests = source.generate(tick);
        for req in &requests {
            assert_ne!(req.origin, req.destination);
            assert!(req.weight >= 60.0 && req.weight <= 90.0);
            assert!(stops.contains(&req.origin));
            assert!(stops.contains(&req.destination));
        }
        total_spawned += requests.len();
    }

    // With mean interval 10, expect ~1000 arrivals in 10000 ticks.
    // Allow wide range due to randomness.
    assert!(
        total_spawned > 500 && total_spawned < 2000,
        "Expected ~1000 arrivals, got {total_spawned}"
    );
}

#[test]
fn poisson_source_respects_schedule() {
    let stops: Vec<StopId> = (0..10).map(StopId).collect();
    let lobby = StopId(0);
    let schedule = TrafficSchedule::new(vec![(0..5000, TrafficPattern::UpPeak)]);

    let mut source = PoissonSource::new(stops, schedule, 5, (70.0, 80.0));

    let mut lobby_origins = 0;
    let mut total = 0;
    // Only sample in the up-peak range.
    for tick in 0..5000 {
        for req in source.generate(tick) {
            if req.origin == lobby {
                lobby_origins += 1;
            }
            total += 1;
        }
    }

    if total > 50 {
        let ratio = lobby_origins as f64 / total as f64;
        assert!(
            ratio > 0.5,
            "Up-peak schedule should bias origins to lobby, got {ratio:.2} ({lobby_origins}/{total})"
        );
    }
}

#[test]
fn poisson_source_no_arrivals_with_huge_interval() {
    let stops: Vec<StopId> = (0..3).map(StopId).collect();
    let mut source = PoissonSource::new(
        stops,
        TrafficSchedule::constant(TrafficPattern::Uniform),
        1_000_000, // very large interval
        (70.0, 80.0),
    );

    let mut total = 0;
    for tick in 0..100 {
        total += source.generate(tick).len();
    }
    // With mean interval 1M, extremely unlikely to get more than a couple.
    assert!(total < 5, "Expected near-zero arrivals, got {total}");
}

#[test]
fn poisson_source_from_config() {
    use crate::builder::SimulationBuilder;

    let sim = SimulationBuilder::demo().build().unwrap();
    // SimulationBuilder doesn't store config, but we can build a source manually
    // using the same defaults.
    let stops: Vec<StopId> = sim.stop_lookup_iter().map(|(id, _)| *id).collect();
    let mut source = PoissonSource::new(
        stops,
        TrafficSchedule::constant(TrafficPattern::Uniform),
        120,
        (50.0, 100.0),
    );

    // Just verify it doesn't panic and produces valid requests.
    for tick in 0..500 {
        for req in source.generate(tick) {
            assert_ne!(req.origin, req.destination);
        }
    }
}

#[test]
fn poisson_source_integration_with_simulation() {
    use crate::builder::SimulationBuilder;

    let mut sim = SimulationBuilder::demo().build().unwrap();
    let stops: Vec<StopId> = sim.stop_lookup_iter().map(|(id, _)| *id).collect();

    let mut source = PoissonSource::new(
        stops,
        TrafficSchedule::constant(TrafficPattern::Uniform),
        20,
        (60.0, 80.0),
    );

    for _ in 0..500 {
        let tick = sim.current_tick();
        for req in source.generate(tick) {
            let _ = sim.spawn_rider(req.origin, req.destination, req.weight);
        }
        sim.step();
    }

    assert!(
        sim.metrics().total_spawned() > 0,
        "Should have spawned at least one rider"
    );
}

#[test]
fn poisson_source_builder_methods() {
    let stops: Vec<StopId> = (0..3).map(StopId).collect();
    let source = PoissonSource::new(
        stops,
        TrafficSchedule::constant(TrafficPattern::Uniform),
        100,
        (50.0, 100.0),
    )
    .with_schedule(TrafficSchedule::office_day(3600))
    .with_mean_interval(50)
    .with_weight_range((65.0, 85.0));

    // Verify debug doesn't panic.
    let debug = format!("{source:?}");
    assert!(debug.contains("PoissonSource"));
}

// ── TrafficSource trait ──────────────────────────────────────────────

#[test]
fn custom_traffic_source() {
    /// A deterministic traffic source for testing.
    struct FixedSource {
        stop_a: StopId,
        stop_b: StopId,
        interval: u64,
    }

    impl TrafficSource for FixedSource {
        fn generate(&mut self, tick: u64) -> Vec<SpawnRequest> {
            if tick.is_multiple_of(self.interval) {
                vec![SpawnRequest {
                    origin: self.stop_a,
                    destination: self.stop_b,
                    weight: 75.0,
                }]
            } else {
                vec![]
            }
        }
    }

    let mut source = FixedSource {
        stop_a: StopId(0),
        stop_b: StopId(1),
        interval: 10,
    };

    assert_eq!(source.generate(0).len(), 1);
    assert_eq!(source.generate(1).len(), 0);
    assert_eq!(source.generate(10).len(), 1);
    assert_eq!(source.generate(20).len(), 1);
}

// ── Serde round-trip ─────────────────────────────────────────────────

#[test]
fn traffic_pattern_serde_roundtrip() {
    let patterns = [
        TrafficPattern::Uniform,
        TrafficPattern::UpPeak,
        TrafficPattern::DownPeak,
        TrafficPattern::Lunchtime,
        TrafficPattern::Mixed,
    ];
    for pattern in &patterns {
        let serialized = ron::to_string(pattern).unwrap();
        let deserialized: TrafficPattern = ron::from_str(&serialized).unwrap();
        assert_eq!(*pattern, deserialized);
    }
}

#[test]
fn traffic_schedule_serde_roundtrip() {
    let schedule = TrafficSchedule::new(vec![
        (0..100, TrafficPattern::UpPeak),
        (100..200, TrafficPattern::DownPeak),
    ])
    .with_fallback(TrafficPattern::Mixed);

    let serialized = ron::to_string(&schedule).unwrap();
    let deserialized: TrafficSchedule = ron::from_str(&serialized).unwrap();

    // Verify behavior matches after roundtrip.
    assert_eq!(deserialized.pattern_at(50), &TrafficPattern::UpPeak);
    assert_eq!(deserialized.pattern_at(150), &TrafficPattern::DownPeak);
    assert_eq!(deserialized.pattern_at(999), &TrafficPattern::Mixed);
}

/// `with_rng` at construction time must reset the schedule anchor so
/// the seeded RNG drives sampling — pre-fix, the OS-RNG-sampled
/// `next_arrival_tick` from `new()` polluted the deterministic schedule
/// (#268). Two sources built with the same seed must produce identical
/// `next_arrival_tick` values.
#[test]
fn with_rng_at_construction_is_deterministic() {
    use rand::SeedableRng;

    let make = || {
        PoissonSource::new(
            vec![StopId(0), StopId(1)],
            TrafficSchedule::constant(TrafficPattern::Uniform),
            120,
            (60.0, 90.0),
        )
        .with_rng(rand::rngs::StdRng::seed_from_u64(42))
    };

    let a = make().next_arrival_tick();
    let b = make().next_arrival_tick();
    assert_eq!(a, b, "with_rng at construction must be deterministic");
}

/// Mid-simulation `with_rng` (after `generate` has advanced the schedule)
/// must NOT rewind the anchor — that would cause a catch-up burst of
/// every backlogged arrival on the next `generate(t)`.
#[test]
fn with_rng_mid_simulation_keeps_anchor() {
    use rand::SeedableRng;

    let mut source = PoissonSource::new(
        vec![StopId(0), StopId(1)],
        TrafficSchedule::constant(TrafficPattern::Uniform),
        100,
        (60.0, 90.0),
    )
    .with_rng(rand::rngs::StdRng::seed_from_u64(1));

    // Advance the schedule to tick 1000.
    let _ = source.generate(1000);
    let anchor_before = source.next_arrival_tick();
    assert!(
        anchor_before > 1000,
        "after generate(1000), next_arrival should be in the future"
    );

    // Swap RNG mid-simulation. The new anchor must be >= anchor_before
    // (sampled forward from current), not < 1000 (which would burst).
    let source = source.with_rng(rand::rngs::StdRng::seed_from_u64(2));
    let anchor_after = source.next_arrival_tick();
    assert!(
        anchor_after >= anchor_before,
        "mid-sim with_rng must not rewind the anchor: before={anchor_before}, after={anchor_after}"
    );
}

/// `with_mean_interval` must resample `next_arrival_tick` so the builder
/// chain `PoissonSource::new(..., tiny_mean, ...).with_mean_interval(big_mean)`
/// does not leak the tick-0 arrival drawn from `tiny_mean`.
///
/// Pre-fix, building with `mean=1` then shifting to `mean=10_000` kept
/// the `mean=1` draw (`next_arrival` <= ~10). Post-fix, the draw is
/// redone at the new mean on the builder call.
#[test]
fn with_mean_interval_resamples_next_arrival() {
    use rand::SeedableRng;

    let stops = vec![StopId(0), StopId(1)];
    let seeded = rand::rngs::StdRng::seed_from_u64(0xD1E7);

    let source = PoissonSource::new(
        stops,
        TrafficSchedule::constant(TrafficPattern::Uniform),
        1, // tiny mean at construction
        (60.0, 90.0),
    )
    .with_rng(seeded) // deterministic resample sequence
    .with_mean_interval(10_000); // shift to a mean where first draw >> 10

    let first = source.next_arrival_tick();
    assert!(
        first > 100,
        "pre-fix bug: first arrival should reflect the new mean=10_000 \
         (draw should be well over 100), got {first}"
    );
}
