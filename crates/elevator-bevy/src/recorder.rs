//! Frame capture: dumps PNG frames at a fixed sim-tick interval, then
//! exits once the target count is reached. Used by the showcase example
//! to produce deterministic footage for the demo GIF.
//!
//! Recording is driven by *simulation ticks*, not wall clock, so identical
//! seeds always produce identical frame sequences.

use std::path::PathBuf;

use bevy::app::AppExit;
use bevy::prelude::*;
use bevy::render::view::screenshot::{Screenshot, save_to_disk};

use crate::sim_bridge::SimulationRes;

/// Recording configuration + running state.
#[derive(Resource)]
pub struct Recorder {
    /// Directory where PNG frames are written.
    pub out_dir: PathBuf,
    /// Capture one frame every `ticks_per_frame` simulation ticks.
    pub ticks_per_frame: u32,
    /// Total number of frames to capture before exiting.
    pub total_frames: u32,
    /// Frames captured so far.
    pub captured: u32,
    /// Last tick at which a frame was captured (to avoid duplicates when
    /// multiple sim ticks elapse in one render frame).
    pub last_capture_tick: Option<u64>,
    /// Sim tick at which capture starts (to skip any warm-up).
    pub start_tick: u64,
    /// Exit the app after the final frame is captured.
    pub exit_when_done: bool,
}

impl Recorder {
    /// Create a recorder that captures at 20 fps source rate
    /// (60 ticks/s ÷ 3 ticks/frame); ffmpeg can resample to any output rate.
    #[must_use]
    pub const fn new(out_dir: PathBuf, total_frames: u32) -> Self {
        Self {
            out_dir,
            ticks_per_frame: 3,
            total_frames,
            captured: 0,
            last_capture_tick: None,
            start_tick: 0,
            exit_when_done: true,
        }
    }
}

/// System that captures one screenshot per `ticks_per_frame` sim ticks.
#[allow(clippy::needless_pass_by_value)]
pub fn capture_frames(
    mut commands: Commands,
    sim: Res<SimulationRes>,
    mut recorder: ResMut<Recorder>,
    mut exit: MessageWriter<AppExit>,
) {
    if recorder.captured >= recorder.total_frames {
        if recorder.exit_when_done {
            exit.write(AppExit::Success);
        }
        return;
    }

    let tick = sim.sim.current_tick();
    if tick < recorder.start_tick {
        return;
    }

    // Need at least `ticks_per_frame` ticks since the last capture.
    let should_capture = match recorder.last_capture_tick {
        None => true,
        Some(prev) => tick.saturating_sub(prev) >= u64::from(recorder.ticks_per_frame),
    };
    if !should_capture {
        return;
    }

    let frame = recorder.captured;
    let path = recorder.out_dir.join(format!("frame_{frame:05}.png"));

    commands
        .spawn(Screenshot::primary_window())
        .observe(save_to_disk(path));

    recorder.captured += 1;
    recorder.last_capture_tick = Some(tick);
}
