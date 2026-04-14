//! Showcase scene: 3 elevators × 8 floors with a scripted cinematic camera
//! and blueprint palette — the scene recorded for the repository's demo GIF.
//!
//! Run it:
//! ```bash
//! cargo run --release --example showcase
//! ```
//!
//! Record 200 frames at 20 fps (~10s loop) into `.recording/`:
//! ```bash
//! cargo run --release --example showcase -- --record
//! ```
//!
//! See `scripts/record_gif.sh` for the ffmpeg pipeline that turns the PNGs
//! into `assets/demo.gif`.

#![allow(clippy::missing_docs_in_private_items, clippy::panic)]

use std::path::{Path, PathBuf};

use bevy::prelude::*;
use rand::{Rng, SeedableRng, rngs::StdRng};

use elevator_bevy::camera::setup_camera;
use elevator_bevy::cinematic::{Shot, ShotTimeline, apply_cinematic_camera};
use elevator_bevy::decor::{
    spawn_corner_marks, spawn_decor, sync_call_lamps, sync_occupancy_chips, tick_arrival_flash,
};
use elevator_bevy::recorder::{Recorder, capture_frames};
use elevator_bevy::rendering::{
    compute_queue_slots, spawn_building_visuals, sync_door_panels, sync_elevator_visuals,
    sync_rider_visuals, update_rider_positions,
};
use elevator_bevy::sim_bridge::{EventWrapper, SimSpeed, SimulationRes, tick_simulation};
use elevator_bevy::style::VisualStyle;
use elevator_bevy::ui::{ShowControlsHint, spawn_hud, update_hud};
use elevator_core::config::{
    BuildingConfig, ElevatorConfig, PassengerSpawnConfig, SimConfig, SimulationParams,
};
use elevator_core::dispatch::scan::ScanDispatch;
use elevator_core::sim::Simulation;
use elevator_core::stop::{StopConfig, StopId};

/// Window dimensions used by the showcase and recorder.
const WIDTH: u32 = 960;
const HEIGHT: u32 = 540;

/// Recording: 200 frames at 20 fps → 10-second loop.
const RECORD_FRAMES: u32 = 200;
const TICKS_PER_FRAME: u32 = 3; // 60 tps ÷ 20 fps
/// Sim ticks to run before capturing the first frame so the recording
/// opens on a busy state rather than an empty lobby. Also gives the
/// cinematic an anchor for its start/end wide shots, which is what lets
/// the GIF loop look continuous.
const WARMUP_TICKS: u64 = 90;
const RECORD_OUT_DIR: &str = ".recording";

fn main() {
    let record = std::env::args().any(|a| a == "--record");

    let mut app = App::new();
    app.add_plugins(DefaultPlugins.set(WindowPlugin {
        primary_window: Some(Window {
            title: "Elevator Simulator — Showcase".into(),
            resolution: (WIDTH, HEIGHT).into(),
            resizable: false,
            ..default()
        }),
        ..default()
    }));

    // Build the scene: 3 elevators × 8 floors.
    let config = build_showcase_config();
    let sim = Simulation::new(&config, ScanDispatch::new())
        .unwrap_or_else(|e| panic!("invalid showcase config: {e}"));

    // Showcase-only resources.
    app.insert_resource(VisualStyle::blueprint())
        .insert_resource(ShowControlsHint(!record))
        .insert_resource(SimulationRes { sim })
        .insert_resource(SimSpeed {
            multiplier: if record { TICKS_PER_FRAME } else { 1 },
        })
        .insert_resource(RushHourSpawner::new(record))
        .insert_resource(build_timeline(if record { WARMUP_TICKS } else { 0 }))
        .add_message::<EventWrapper>()
        .add_systems(
            Startup,
            (
                setup_camera,
                spawn_building_visuals,
                spawn_decor,
                spawn_corner_marks,
            )
                .chain(),
        )
        .add_systems(
            Update,
            (
                rush_hour_spawn,
                tick_simulation,
                sync_elevator_visuals,
                sync_door_panels,
                compute_queue_slots,
                sync_rider_visuals,
                update_rider_positions,
                sync_call_lamps,
                sync_occupancy_chips,
                tick_arrival_flash,
                apply_cinematic_camera,
            )
                .chain(),
        );

    // The interactive HUD is useful when running manually but chrome in a
    // 10s demo GIF, so skip spawning and updating it while recording.
    if !record {
        app.add_systems(Startup, spawn_hud)
            .add_systems(Update, update_hud);
    }

    if record {
        let out_dir = PathBuf::from(RECORD_OUT_DIR);
        prepare_record_dir(out_dir.as_path());
        let mut recorder = Recorder::new(out_dir, RECORD_FRAMES);
        recorder.start_tick = WARMUP_TICKS;
        app.insert_resource(recorder)
            .add_systems(Update, capture_frames);
    }

    app.run();
}

/// 3 elevators, 8 floors. Stops at 4m spacing = realistic office tower.
fn build_showcase_config() -> SimConfig {
    let stops = (0..8)
        .map(|i| StopConfig {
            id: StopId(i),
            name: if i == 0 {
                "L".into()
            } else {
                (i + 1).to_string()
            },
            position: f64::from(i) * 4.0,
        })
        .collect();

    let elevators = (0..3)
        .map(|i| ElevatorConfig {
            id: i,
            name: format!("Car {}", i + 1),
            max_speed: 3.0,
            acceleration: 1.8,
            deceleration: 2.2,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 45,
            door_transition_ticks: 12,
            ..Default::default()
        })
        .collect();

    SimConfig {
        building: BuildingConfig {
            name: "Showcase Tower".into(),
            stops,
            lines: None,
            groups: None,
        },
        elevators,
        simulation: SimulationParams {
            ticks_per_second: 60.0,
        },
        passenger_spawning: PassengerSpawnConfig {
            mean_interval_ticks: 12,
            weight_range: (55.0, 95.0),
        },
    }
}

/// Scripted camera for a clean 10-second loop (≤600 ticks relative to
/// `offset`). Start and end shots are identical wide shots — the loop
/// seam between the GIF's last and first frame is visually continuous so
/// long as the sim state is also comparable (guaranteed by the timeline
/// landing on the same wide shot for the first ~30 and last ~30 ticks).
///
/// `offset` shifts every shot's `start_tick` forward; used during
/// recording to skip the warm-up ticks while the timeline is authored in
/// relative ticks.
fn build_timeline(offset: u64) -> ShotTimeline {
    // Sim-pixel heights (PPU = 40, spacing 4 units): lobby=0, top=1120.
    let center_y = 560.0; // mid-tower and wide-shot share the same y.

    ShotTimeline::new(vec![
        // 0. Establishing wide on the full bank.
        Shot {
            start_tick: offset,
            blend_ticks: 0,
            target_x: 0.0,
            target_y: center_y,
            scale: 2.55,
        },
        // 1. Glide down to the lobby — watch the first pickups.
        Shot {
            start_tick: offset + 120,
            blend_ticks: 90,
            target_x: -40.0,
            target_y: 40.0,
            scale: 1.45,
        },
        // 2. Rise with the middle car to mid-tower.
        Shot {
            start_tick: offset + 260,
            blend_ticks: 120,
            target_x: 0.0,
            target_y: center_y,
            scale: 1.55,
        },
        // 3. Pull out to a wide finale for the loop.
        Shot {
            start_tick: offset + 430,
            blend_ticks: 120,
            target_x: 0.0,
            target_y: center_y,
            scale: 2.55,
        },
    ])
}

/// Deterministic rush-hour spawner: 70% of riders originate at the lobby
/// heading upward, 20% interfloor, 10% down-bound from upper floors.
#[derive(Resource)]
struct RushHourSpawner {
    rng: StdRng,
    ticks_until_spawn: u32,
    mean_interval: u32,
    preloaded: bool,
}

impl RushHourSpawner {
    fn new(record: bool) -> Self {
        // Fixed seed → deterministic recordings.
        let seed = if record { 424_242 } else { 0 };
        Self {
            rng: StdRng::seed_from_u64(seed),
            ticks_until_spawn: 8,
            mean_interval: 18,
            preloaded: false,
        }
    }
}

#[allow(clippy::needless_pass_by_value)]
fn rush_hour_spawn(
    mut sim: ResMut<SimulationRes>,
    mut spawner: ResMut<RushHourSpawner>,
    speed: Res<SimSpeed>,
) {
    if speed.multiplier == 0 {
        return;
    }

    let stop_ids: Vec<_> = sim.sim.world().stop_ids();
    if stop_ids.len() < 2 {
        return;
    }

    // Preload 12 waiting riders at the lobby so the opening shot has content.
    if !spawner.preloaded {
        for _ in 0..12 {
            let dest = stop_ids[spawner.rng.random_range(1..stop_ids.len())];
            let w = spawner.rng.random_range(55.0..95.0);
            let _ = sim.sim.spawn_rider(stop_ids[0], dest, w);
        }
        spawner.preloaded = true;
    }

    let ticks = speed.multiplier;
    if spawner.ticks_until_spawn > ticks {
        spawner.ticks_until_spawn -= ticks;
        return;
    }

    let roll: f64 = spawner.rng.random_range(0.0..1.0);
    let (origin_idx, dest_idx) = if roll < 0.70 {
        // Lobby → upper floor.
        (0usize, spawner.rng.random_range(1..stop_ids.len()))
    } else if roll < 0.90 {
        // Interfloor (any non-lobby to any other non-lobby).
        let o = spawner.rng.random_range(1..stop_ids.len());
        let mut d = spawner.rng.random_range(1..stop_ids.len());
        while d == o {
            d = spawner.rng.random_range(1..stop_ids.len());
        }
        (o, d)
    } else {
        // Down-bound: upper → lobby.
        (spawner.rng.random_range(1..stop_ids.len()), 0)
    };

    let weight = spawner.rng.random_range(55.0..95.0);
    let _ = sim
        .sim
        .spawn_rider(stop_ids[origin_idx], stop_ids[dest_idx], weight);

    let jitter: f64 = spawner.rng.random_range(0.6..1.4);
    spawner.ticks_until_spawn = ((f64::from(spawner.mean_interval) * jitter) as u32).max(1);
}

fn prepare_record_dir(dir: &Path) {
    if dir.exists() {
        // Best-effort cleanup of stale frames.
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let is_frame_png = entry
                    .path()
                    .extension()
                    .is_some_and(|e| e.eq_ignore_ascii_case("png"))
                    && entry
                        .file_name()
                        .to_str()
                        .is_some_and(|n| n.starts_with("frame_"));
                if is_frame_png {
                    let _ = std::fs::remove_file(entry.path());
                }
            }
        }
    } else if let Err(e) = std::fs::create_dir_all(dir) {
        eprintln!("failed to create recording dir {}: {e}", dir.display());
    }
}
