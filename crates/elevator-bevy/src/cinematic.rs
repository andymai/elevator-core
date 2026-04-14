//! Scripted cinematic camera driven by the simulation tick counter.
//!
//! The [`ShotTimeline`] resource holds an ordered list of shots — each a
//! camera target (x, y, zoom scale) with a start/end tick. The active shot
//! is the one whose `[start_tick, end_tick)` range contains the current
//! simulation tick; camera position/scale blend smoothly between
//! consecutive shots with ease-in-out during the overlap.
//!
//! Because the timeline is tick-indexed rather than wall-clock, the
//! recorded GIF is perfectly reproducible: a given seed + config produces
//! the same camera moves every run.

use bevy::prelude::*;

use crate::sim_bridge::SimulationRes;

/// One shot in the cinematic timeline.
#[derive(Clone, Debug)]
pub struct Shot {
    /// Simulation tick at which this shot becomes dominant.
    pub start_tick: u64,
    /// Ticks over which the camera blends from the previous shot into this one.
    pub blend_ticks: u32,
    /// Target camera center x in world pixels.
    pub target_x: f32,
    /// Target camera center y in world pixels.
    pub target_y: f32,
    /// Target orthographic scale (smaller = more zoomed in).
    pub scale: f32,
}

/// Scripted list of shots.
#[derive(Resource, Default, Clone)]
pub struct ShotTimeline {
    /// Ordered by `start_tick`.
    pub shots: Vec<Shot>,
}

impl ShotTimeline {
    /// Create from a list of shots; sorts by `start_tick`.
    #[must_use]
    pub fn new(mut shots: Vec<Shot>) -> Self {
        shots.sort_by_key(|s| s.start_tick);
        Self { shots }
    }

    /// Compute the (x, y, scale) the camera should be at for a given tick.
    #[must_use]
    pub fn sample(&self, tick: u64) -> Option<(f32, f32, f32)> {
        if self.shots.is_empty() {
            return None;
        }

        // Find the latest shot whose start_tick <= tick.
        let mut active_idx: usize = 0;
        for (i, s) in self.shots.iter().enumerate() {
            if s.start_tick <= tick {
                active_idx = i;
            } else {
                break;
            }
        }

        let current = &self.shots[active_idx];

        // Are we in the blend window of the *next* shot?
        if active_idx + 1 < self.shots.len() {
            let next = &self.shots[active_idx + 1];
            let blend_start = next.start_tick.saturating_sub(u64::from(next.blend_ticks));
            if tick >= blend_start && next.blend_ticks > 0 {
                let t = (tick - blend_start) as f32 / next.blend_ticks as f32;
                let t = ease_in_out(t.clamp(0.0, 1.0));
                return Some((
                    lerp(current.target_x, next.target_x, t),
                    lerp(current.target_y, next.target_y, t),
                    lerp(current.scale, next.scale, t),
                ));
            }
        }

        Some((current.target_x, current.target_y, current.scale))
    }
}

/// Linear interpolation between `a` and `b`.
fn lerp(a: f32, b: f32, t: f32) -> f32 {
    t.mul_add(b - a, a)
}

/// Smoothstep easing: `3t² − 2t³`, zero slope at `t=0` and `t=1`.
fn ease_in_out(t: f32) -> f32 {
    t * t * 2.0f32.mul_add(-t, 3.0)
}

/// System that updates the camera from the timeline. Runs in `Update`.
#[allow(clippy::needless_pass_by_value)]
pub fn apply_cinematic_camera(
    sim: Res<SimulationRes>,
    timeline: Res<ShotTimeline>,
    mut cam: Query<(&mut Transform, &mut Projection), With<Camera2d>>,
) {
    let tick = sim.sim.current_tick();
    let Some((x, y, scale)) = timeline.sample(tick) else {
        return;
    };

    for (mut transform, mut proj) in &mut cam {
        transform.translation.x = x;
        transform.translation.y = y;
        if let Projection::Orthographic(o) = proj.as_mut() {
            o.scale = scale;
        }
    }
}
