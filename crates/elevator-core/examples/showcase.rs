//! # elevator-core Showcase
//!
//! A comprehensive example demonstrating the major features of elevator-core.
//! Run with: `cargo run --example showcase -p elevator-core`

// Examples are standalone binaries — suppress lint noise that doesn't apply.
#![allow(
    clippy::unwrap_used,
    clippy::expect_used,
    clippy::missing_docs_in_private_items,
    missing_docs,
    clippy::must_use_candidate
)]

use elevator_core::config::{
    BuildingConfig, ElevatorConfig, PassengerSpawnConfig, SimConfig, SimulationParams,
};
use elevator_core::dispatch::etd::EtdDispatch;
use elevator_core::prelude::*;
use elevator_core::stop::StopConfig;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};

fn main() {
    part1_basic_simulation();
    part2_custom_dispatch();
    part3_extensions();
    part4_lifecycle_hooks();
    part5_metrics_deep_dive();
    part6_configuration();
}

// ────────────────────────────────────────────────────────────────────────────
// Part 1: Basic Simulation
// ────────────────────────────────────────────────────────────────────────────

fn part1_basic_simulation() {
    println!("=== Part 1: Basic Simulation ===\n");

    // Build a simple 3-stop building with one elevator.
    // `stops()` replaces the builder's default stops entirely.
    let mut sim = SimulationBuilder::new()
        .stops(vec![
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
        ])
        .build()
        .unwrap();

    // Spawn a rider at Ground heading to Floor 3, weighing 75 kg.
    let rider_id = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(2), 75.0)
        .unwrap();
    println!("Spawned rider: {rider_id:?}");

    // Step the simulation until the rider is delivered (or a safety cap).
    for _ in 0..600 {
        sim.step();
    }

    // Drain all events that occurred during the run.
    let events = sim.drain_events();
    println!("Total events emitted: {}", events.len());

    // Show a few interesting ones.
    for event in &events {
        match event {
            Event::RiderBoarded {
                rider, elevator, ..
            } => {
                println!("  Rider {rider:?} boarded elevator {elevator:?}");
            }
            Event::RiderExited {
                rider,
                elevator,
                stop,
                ..
            } => {
                println!("  Rider {rider:?} exited elevator {elevator:?} at stop {stop:?}");
            }
            Event::ElevatorArrived {
                elevator, at_stop, ..
            } => {
                println!("  Elevator {elevator:?} arrived at stop {at_stop:?}");
            }
            _ => {}
        }
    }

    // Query aggregate metrics.
    let m = sim.metrics();
    println!("\nMetrics after {} ticks:", sim.current_tick());
    println!("  Total spawned:   {}", m.total_spawned());
    println!("  Total delivered: {}", m.total_delivered());
    println!("  Avg wait time:   {:.1} ticks", m.avg_wait_time());
    println!("  Avg ride time:   {:.1} ticks", m.avg_ride_time());
    println!("  Max wait time:   {} ticks", m.max_wait_time());
    println!("  Throughput:      {}", m.throughput());
    println!();
}

// ────────────────────────────────────────────────────────────────────────────
// Part 2: Custom Dispatch
// ────────────────────────────────────────────────────────────────────────────

fn part2_custom_dispatch() {
    println!("=== Part 2: Custom Dispatch (ETD) ===\n");

    // The ETD (Estimated Time to Destination) algorithm minimizes the total
    // cost of serving new riders while considering delay to existing ones.
    let mut sim = SimulationBuilder::new()
        .stops(vec![
            StopConfig {
                id: StopId(0),
                name: "Lobby".into(),
                position: 0.0,
            },
            StopConfig {
                id: StopId(1),
                name: "Sky Lobby".into(),
                position: 5.0,
            },
            StopConfig {
                id: StopId(2),
                name: "Penthouse".into(),
                position: 10.0,
            },
        ])
        .dispatch(EtdDispatch::with_delay_weight(1.5))
        .build()
        .unwrap();

    // Spawn several riders to see ETD in action.
    let _ = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    let _ = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(1), 80.0)
        .unwrap();
    let _ = sim
        .spawn_rider_by_stop_id(StopId(2), StopId(0), 65.0)
        .unwrap();

    // Run for enough ticks for the elevator to make full round trips.
    for _ in 0..900 {
        sim.step();
    }

    let events = sim.drain_events();

    // Count event types to see dispatch decisions at work.
    let assigned_count = events
        .iter()
        .filter(|e| matches!(e, Event::ElevatorAssigned { .. }))
        .count();
    let boarded_count = events
        .iter()
        .filter(|e| matches!(e, Event::RiderBoarded { .. }))
        .count();
    let delivered_count = events
        .iter()
        .filter(|e| matches!(e, Event::RiderExited { .. }))
        .count();

    println!("ETD dispatch results over {} ticks:", sim.current_tick());
    println!("  Elevator assignments: {assigned_count}");
    println!("  Riders boarded:       {boarded_count}");
    println!("  Riders delivered:     {delivered_count}");
    println!(
        "  Avg wait time:        {:.1} ticks",
        sim.metrics().avg_wait_time()
    );
    println!();
}

// ────────────────────────────────────────────────────────────────────────────
// Part 3: Extensions
// ────────────────────────────────────────────────────────────────────────────

/// A custom extension component: marks a rider as VIP.
#[derive(Clone, Debug, Serialize, Deserialize)]
struct VipTag {
    /// VIP priority level (higher = more important).
    level: u32,
}

fn part3_extensions() {
    println!("=== Part 3: Extensions ===\n");

    // Register the extension type at build time for snapshot support.
    let mut sim = SimulationBuilder::new()
        .stops(vec![
            StopConfig {
                id: StopId(0),
                name: "Ground".into(),
                position: 0.0,
            },
            StopConfig {
                id: StopId(1),
                name: "Executive".into(),
                position: 12.0,
            },
        ])
        .with_ext::<VipTag>("vip_tag")
        .build()
        .unwrap();

    // Spawn a rider and attach the VIP extension.
    let rider = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(1), 70.0)
        .unwrap();
    sim.world_mut()
        .insert_ext::<VipTag>(rider, VipTag { level: 3 }, "vip_tag");

    // Read the extension back.
    let vip: Option<VipTag> = sim.world().get_ext::<VipTag>(rider);
    println!("Rider {rider:?} VIP tag: {vip:?}");

    // Extensions are arbitrary typed data — useful for game-specific components
    // like priority tiers, cargo manifests, or NPC traits without modifying
    // the core library.
    println!();
}

// ────────────────────────────────────────────────────────────────────────────
// Part 4: Lifecycle Hooks
// ────────────────────────────────────────────────────────────────────────────

fn part4_lifecycle_hooks() {
    println!("=== Part 4: Lifecycle Hooks ===\n");

    // Hooks run before or after simulation phases. They receive &mut World,
    // letting you inspect or modify entity state each tick.
    //
    // Here we add an after-loading hook that prints whenever a rider finishes
    // boarding (transitions to Riding phase).
    let boarding_count = Arc::new(AtomicU64::new(0));
    let boarding_count_hook = Arc::clone(&boarding_count);

    let mut sim = SimulationBuilder::new()
        .stops(vec![
            StopConfig {
                id: StopId(0),
                name: "Ground".into(),
                position: 0.0,
            },
            StopConfig {
                id: StopId(1),
                name: "Upper".into(),
                position: 5.0,
            },
        ])
        .after(Phase::Loading, move |world| {
            // Count how many riders are currently in Riding phase.
            let riding = world
                .iter_riders()
                .filter(|(_, r)| matches!(r.phase(), RiderPhase::Riding(_)))
                .count();
            if riding > 0 {
                boarding_count_hook.fetch_add(1, Ordering::Relaxed);
            }
        })
        .build()
        .unwrap();

    let _ = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(1), 60.0)
        .unwrap();

    for _ in 0..300 {
        sim.step();
    }

    println!(
        "After-loading hook fired with riding riders {} times",
        boarding_count.load(Ordering::Relaxed)
    );
    println!("Delivered: {}", sim.metrics().total_delivered());
    println!();
}

// ────────────────────────────────────────────────────────────────────────────
// Part 5: Metrics Deep Dive
// ────────────────────────────────────────────────────────────────────────────

fn part5_metrics_deep_dive() {
    println!("=== Part 5: Metrics Deep Dive (Tags) ===\n");

    let mut sim = SimulationBuilder::new()
        .stops(vec![
            StopConfig {
                id: StopId(0),
                name: "Lobby".into(),
                position: 0.0,
            },
            StopConfig {
                id: StopId(1),
                name: "Office".into(),
                position: 4.0,
            },
            StopConfig {
                id: StopId(2),
                name: "Rooftop".into(),
                position: 10.0,
            },
        ])
        .build()
        .unwrap();

    // Tag the lobby stop — riders spawned there inherit the tag automatically.
    let lobby_entity = sim.stop_entity(StopId(0)).unwrap();
    sim.tag_entity(lobby_entity, "zone:lobby");

    // Spawn riders from the tagged lobby.
    for _ in 0..5 {
        let _ = sim
            .spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
            .unwrap();
    }

    // Tag a rider individually for a different dimension.
    let special = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(1), 60.0)
        .unwrap();
    sim.tag_entity(special, "priority:express");

    // Run enough ticks for deliveries.
    for _ in 0..600 {
        sim.step();
    }

    // Query per-tag metrics.
    if let Some(lobby_metrics) = sim.metrics_for_tag("zone:lobby") {
        println!("zone:lobby metrics:");
        println!("  Spawned:    {}", lobby_metrics.total_spawned());
        println!("  Delivered:  {}", lobby_metrics.total_delivered());
        println!("  Avg wait:   {:.1} ticks", lobby_metrics.avg_wait_time());
        println!("  Max wait:   {} ticks", lobby_metrics.max_wait_time());
    }

    if let Some(express_metrics) = sim.metrics_for_tag("priority:express") {
        println!("priority:express metrics:");
        println!("  Spawned:    {}", express_metrics.total_spawned());
        println!("  Delivered:  {}", express_metrics.total_delivered());
        println!("  Avg wait:   {:.1} ticks", express_metrics.avg_wait_time());
    }

    // List all registered tags.
    println!("\nAll registered tags: {:?}", sim.all_tags());
    println!();
}

// ────────────────────────────────────────────────────────────────────────────
// Part 6: Configuration
// ────────────────────────────────────────────────────────────────────────────

fn part6_configuration() {
    println!("=== Part 6: Programmatic Configuration ===\n");

    // Build a SimConfig entirely in code (no RON file needed).
    let config = SimConfig {
        building: BuildingConfig {
            name: "Space Needle".into(),
            stops: vec![
                StopConfig {
                    id: StopId(0),
                    name: "Ground Level".into(),
                    position: 0.0,
                },
                StopConfig {
                    id: StopId(1),
                    name: "Restaurant".into(),
                    position: 15.0,
                },
                StopConfig {
                    id: StopId(2),
                    name: "Observation Deck".into(),
                    position: 20.0,
                },
            ],
            lines: None,
            groups: None,
        },
        elevators: vec![
            ElevatorConfig {
                id: 0,
                name: "Express A".into(),
                max_speed: 5.0,
                acceleration: 2.5,
                deceleration: 3.0,
                weight_capacity: 1200.0,
                starting_stop: StopId(0),
                door_open_ticks: 15,
                door_transition_ticks: 8,
                restricted_stops: Vec::new(),
            },
            ElevatorConfig {
                id: 1,
                name: "Express B".into(),
                max_speed: 5.0,
                acceleration: 2.5,
                deceleration: 3.0,
                weight_capacity: 1200.0,
                starting_stop: StopId(0),
                door_open_ticks: 15,
                door_transition_ticks: 8,
                restricted_stops: Vec::new(),
            },
        ],
        simulation: SimulationParams {
            ticks_per_second: 60.0,
        },
        passenger_spawning: PassengerSpawnConfig {
            mean_interval_ticks: 90,
            weight_range: (50.0, 100.0),
        },
    };

    println!("Building: {}", config.building.name);
    println!("Stops:    {}", config.building.stops.len());
    println!("Elevators:{}", config.elevators.len());
    println!("TPS:      {}", config.simulation.ticks_per_second);

    // Construct simulation from the config, using ETD dispatch.
    let mut sim = SimulationBuilder::from_config(config)
        .dispatch(EtdDispatch::new())
        .build()
        .unwrap();

    // Spawn riders and simulate.
    let _ = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(1), 80.0)
        .unwrap();
    let _ = sim
        .spawn_rider_by_stop_id(StopId(0), StopId(2), 65.0)
        .unwrap();

    for _ in 0..1800 {
        sim.step();
    }

    let m = sim.metrics();
    println!(
        "\nAfter {} ticks ({:.1}s simulated):",
        sim.current_tick(),
        sim.current_tick() as f64 / 60.0
    );
    println!("  Delivered:     {}", m.total_delivered());
    println!("  Avg wait:      {:.1} ticks", m.avg_wait_time());
    println!("  Avg ride:      {:.1} ticks", m.avg_ride_time());
    println!("  Total distance:{:.1} units", m.total_distance());
    println!();
}
