use crate::traffic::TrafficPattern;
use crate::world::World;

fn make_stops(world: &mut World, count: usize) -> Vec<crate::entity::EntityId> {
    (0..count).map(|i| {
        let eid = world.spawn();
        world.stop_data.insert(eid, crate::components::StopData {
            name: format!("Stop {i}"),
            position: i as f64 * 4.0,
        });
        eid
    }).collect()
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
        if o == lobby { lobby_origins += 1; }
    }

    let ratio = lobby_origins as f64 / total as f64;
    assert!(ratio > 0.5, "UpPeak should have >50% origins from lobby, got {ratio:.2}");
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
        if d == lobby { lobby_dests += 1; }
    }

    let ratio = lobby_dests as f64 / total as f64;
    assert!(ratio > 0.5, "DownPeak should have >50% destinations to lobby, got {ratio:.2}");
}

#[test]
fn too_few_stops_returns_none() {
    let mut world = World::new();
    let stops = make_stops(&mut world, 1);
    let mut rng = rand::rng();
    assert!(TrafficPattern::Uniform.sample(&stops, &mut rng).is_none());
}
