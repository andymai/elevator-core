use crate::components::Stop;
use crate::traffic::{TrafficPattern, TrafficSchedule};
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
        if let Some((o, _)) = schedule.sample(200, &stops, &mut rng) {
            if o == lobby {
                lobby_origins_fallback += 1;
            }
        }
    }
    let fallback_ratio = lobby_origins_fallback as f64 / total as f64;
    // Uniform with 10 stops should give ~10% lobby origins, definitely <50%.
    assert!(
        fallback_ratio < 0.5,
        "Fallback (Uniform) should not bias to lobby, got {fallback_ratio:.2}"
    );
}
