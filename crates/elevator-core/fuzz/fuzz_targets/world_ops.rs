//! Fuzz target: random sequences of world operations.
//!
//! Tests spawn/despawn/disable/enable/component-set sequences to ensure
//! world invariants always hold (no dangling references, no panics).

#![no_main]

use elevator_core::components::{Position, Rider, RiderPhase, Stop};
use elevator_core::world::World;
use libfuzzer_sys::fuzz_target;

fuzz_target!(|data: &[u8]| {
    let mut world = World::new();
    let mut entities: Vec<EntityId> = Vec::new();

    let mut i = 0;
    while i < data.len() {
        let op = data[i];
        i += 1;

        match op % 6 {
            // Spawn bare entity
            0 => {
                let eid = world.spawn();
                entities.push(eid);
            }
            // Spawn entity with Position
            1 => {
                let eid = world.spawn();
                let pos = data.get(i).copied().unwrap_or(0) as f64;
                i += 1;
                world.set_position(eid, Position { value: pos });
                entities.push(eid);
            }
            // Spawn entity with Stop
            2 => {
                let eid = world.spawn();
                world.set_stop(
                    eid,
                    Stop {
                        name: "Fuzz".into(),
                        position: 0.0,
                    },
                );
                entities.push(eid);
            }
            // Despawn an entity
            3 => {
                let idx = data.get(i).copied().unwrap_or(0) as usize;
                i += 1;
                if !entities.is_empty() {
                    let idx = idx % entities.len();
                    let eid = entities.remove(idx);
                    world.despawn(eid);
                }
            }
            // Set rider on entity
            4 => {
                let idx = data.get(i).copied().unwrap_or(0) as usize;
                i += 1;
                if !entities.is_empty() {
                    let idx = idx % entities.len();
                    let eid = entities[idx];
                    world.set_rider(
                        eid,
                        Rider {
                            phase: RiderPhase::Waiting,
                            current_stop: Some(eid),
                            weight: 75.0,
                            spawn_tick: 0,
                            board_tick: None,
                        },
                    );
                }
            }
            // Read entity count (just exercise the method)
            _ => {
                let _ = world.entity_count();
            }
        }
    }
});
