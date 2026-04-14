//! Visual rendering of elevator shafts, cars, stops, and riders.
//!
//! Layout: elevators are drawn in column order from `iter_elevators()` —
//! shaft `i` sits at `x = (i - (n-1)/2) * shaft_spacing_units * PPU`.
//! Waiting riders queue to the left of shaft 0.

use bevy::prelude::*;
use elevator_core::components::{ElevatorPhase, Position, Rider, RiderPhase};
use elevator_core::door::DoorState;
use elevator_core::entity::EntityId;
use elevator_core::world::World;
use std::collections::HashMap;
use std::f32::consts::PI;

use crate::sim_bridge::SimulationRes;
use crate::style::VisualStyle;

/// Fraction of the distance to the target a rider covers each render frame
/// (exponential approach). Higher = snappier, lower = softer.
const RIDER_LERP_ALPHA: f32 = 0.28;
/// Idle bob amplitude (pixels) for waiting riders.
const IDLE_BOB_PX: f32 = 1.6;
/// Idle bob angular frequency (radians per sim tick).
const IDLE_BOB_FREQ: f32 = 0.14;

/// Pixels per simulation distance unit.
pub const PPU: f32 = 40.0;

/// Fallback close duration (ticks) used when `DoorState::Closing` arrives
/// from a snapshot written before the variant carried `total_duration`.
/// Matches the historical `door_transition_ticks` default in `ElevatorConfig`.
const CLOSING_FALLBACK_TICKS: f32 = 30.0;

/// One cable segment's position and length.
struct CableSeg {
    /// Y offset from the shaft center.
    offset: f32,
    /// Dash length in pixels.
    len: f32,
}

/// Compute dash offsets + lengths for a vertical cable of `total_height`
/// pixels, alternating between `dash` and `gap`. Returns one entry per dash.
fn cable_segments(total_height: f32, dash: f32, gap: f32) -> Vec<CableSeg> {
    let period = dash + gap;
    let count = (total_height / period).floor() as i32;
    let start = (-total_height).mul_add(0.5, dash * 0.5);
    (0..count)
        .map(|i| CableSeg {
            offset: (i as f32).mul_add(period, start),
            len: dash,
        })
        .collect()
}

/// Centre x coordinates for horizontal dashes across `total_width`, with
/// `dash`-long segments separated by `gap`-wide empty space.
fn segment_positions(total_width: f32, dash: f32, gap: f32) -> Vec<f32> {
    let period = dash + gap;
    let count = (total_width / period).floor() as i32;
    let start = (-total_width).mul_add(0.5, dash * 0.5);
    (0..count)
        .map(|i| (i as f32).mul_add(period, start))
        .collect()
}

/// Computed per-scene visual sizes.
#[derive(Resource)]
pub struct VisualScale {
    /// Width of the shaft background rectangle.
    pub shaft_width: f32,
    /// Width of each elevator car rectangle.
    pub car_width: f32,
    /// Height of each elevator car rectangle.
    pub car_height: f32,
    /// Radius of rider "head" circles / plain-circle riders.
    pub rider_radius: f32,
    /// Horizontal offset (pixels) for waiting riders from shaft 0 center.
    pub waiting_x_offset: f32,
    /// Thickness of the horizontal stop indicator lines.
    pub stop_line_thickness: f32,
    /// Horizontal offset for stop name labels from the leftmost shaft.
    pub label_offset_x: f32,
    /// Font size for stop labels and text.
    pub font_size: f32,
    /// Spacing between rider circles.
    pub rider_spacing: f32,
    /// Horizontal distance between shafts, in pixels.
    pub shaft_spacing_px: f32,
    /// Number of elevator shafts.
    pub shaft_count: u32,
}

impl VisualScale {
    /// Compute visual scale factors from the total shaft span (in sim units)
    /// and elevator count.
    fn from_scene(span: f32, shaft_count: u32, style: &VisualStyle) -> Self {
        let base_height = 15.0 * PPU;
        let actual_height = span * PPU;
        let s = (actual_height / base_height).max(1.0);

        Self {
            shaft_width: 10.0 * s,
            car_width: 80.0 * s,
            car_height: 30.0 * s,
            rider_radius: 6.0 * s,
            // Queue starts close to the leftmost shaft and grows leftward
            // as more riders arrive — labels live further out at
            // `label_offset_x` so the two never collide.
            waiting_x_offset: -25.0 * s,
            stop_line_thickness: 2.0 * s,
            label_offset_x: 200.0 * s,
            font_size: 14.0 * s,
            rider_spacing: 12.0 * s,
            shaft_spacing_px: style.shaft_spacing_units * PPU,
            shaft_count,
        }
    }

    /// Compute the center-x of shaft `index` (0-based).
    #[must_use]
    pub fn shaft_x(&self, index: u32) -> f32 {
        let n = self.shaft_count.max(1) as f32;
        let half = (n - 1.0) * 0.5;
        (index as f32 - half) * self.shaft_spacing_px
    }

    /// Total horizontal extent of the bank of shafts (pixels), edge to edge.
    #[must_use]
    pub fn bank_width(&self) -> f32 {
        if self.shaft_count <= 1 {
            self.shaft_width
        } else {
            (self.shaft_count as f32 - 1.0).mul_add(self.shaft_spacing_px, self.shaft_width)
        }
    }

    /// The x of the leftmost shaft center.
    #[must_use]
    pub fn leftmost_x(&self) -> f32 {
        self.shaft_x(0)
    }
}

/// Maps an elevator entity to its visual shaft index (0..n).
#[derive(Resource, Default)]
pub struct ElevatorShaftIndex(pub HashMap<EntityId, u32>);

/// Per-stop queue slot index for each waiting rider.
///
/// Rebuilt each frame. Slots are assigned by sorted-by-`EntityId` order so
/// when a rider boards, everyone behind them shifts deterministically
/// one slot forward.
#[derive(Resource, Default)]
pub struct QueueSlots(pub HashMap<EntityId, usize>);

/// Per-rider bob phase offset so waiting riders don't all bob in sync.
#[derive(Component)]
pub struct BobPhase(pub f32);

/// Scale-based lifecycle fade for rider visuals.
///
/// `current` drifts toward `target` at `FADE_STEP` per frame; when both
/// are below a small threshold the entity is despawned.
#[derive(Component)]
pub struct RiderFade {
    /// Current scale (0 = invisible, 1 = full size).
    pub current: f32,
    /// Target scale the component is easing toward.
    pub target: f32,
}

/// Per-frame change in rider scale during spawn-in / fade-out (~6 frames to reach 1).
const FADE_STEP: f32 = 1.0 / 6.0;

/// Maximum queue depth that's actually drawn; later slots overflow onto
/// the last column. The chip on the right shows the true count.
const MAX_QUEUE_COLS: usize = 6;

/// Marker for shaft background visuals.
#[derive(Component)]
pub struct ShaftVisual;

/// Marker linking a Bevy entity to a simulation elevator (and its shaft index).
#[derive(Component)]
pub struct ElevatorVisual {
    /// The simulation entity ID of this elevator.
    pub entity_id: EntityId,
    /// Zero-based shaft index (column).
    pub shaft_index: u32,
}

/// Marker for stop-line visuals.
#[derive(Component)]
pub struct StopVisual;

/// Marker for stop labels.
#[derive(Component)]
pub struct StopLabel;

/// Marker linking a Bevy entity to a simulation rider.
#[derive(Component)]
pub struct RiderVisual {
    /// The simulation entity ID of this rider.
    pub entity_id: EntityId,
}

/// Marker for a child "head" mesh inside a humanoid rider.
#[derive(Component)]
pub struct RiderHead;

/// A door panel: child of an elevator car, translating in local X.
#[derive(Component)]
pub struct DoorPanel {
    /// Which side — `-1.0` for left, `+1.0` for right.
    pub side: f32,
    /// Elevator entity this panel belongs to.
    pub elevator: EntityId,
    /// Panel half-travel in pixels (from closed center to fully-open edge).
    pub travel: f32,
}

/// Small triangle on the elevator car that points in the travel direction.
/// Visible only while the elevator is moving on a dispatched or
/// repositioning trip; hidden during dwell/Idle.
#[derive(Component)]
pub struct DirectionArrow {
    /// The elevator this arrow tracks.
    pub elevator: EntityId,
}

/// Pre-allocated rider materials.
#[derive(Resource)]
pub struct RiderMaterials {
    /// Up-bound rider (destination above origin).
    pub up: Handle<ColorMaterial>,
    /// Down-bound rider (destination below origin).
    pub down: Handle<ColorMaterial>,
    /// Rider in Boarding phase.
    pub boarding: Handle<ColorMaterial>,
    /// Rider in Exiting phase.
    pub exiting: Handle<ColorMaterial>,
}

/// Spawn building visuals.
#[allow(clippy::needless_pass_by_value, clippy::too_many_lines)]
pub fn spawn_building_visuals(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<ColorMaterial>>,
    sim: Res<SimulationRes>,
    style: Res<VisualStyle>,
    mut clear_color: ResMut<ClearColor>,
) {
    clear_color.0 = style.background;

    let w = sim.sim.world();
    let stop_positions: Vec<(EntityId, f64, String)> = w
        .iter_stops()
        .map(|(eid, s)| (eid, s.position(), s.name().to_owned()))
        .collect();

    if stop_positions.is_empty() {
        return;
    }

    let min_pos = stop_positions
        .iter()
        .map(|s| s.1)
        .fold(f64::INFINITY, f64::min);
    let max_pos = stop_positions
        .iter()
        .map(|s| s.1)
        .fold(f64::NEG_INFINITY, f64::max);
    let span = (max_pos - min_pos) as f32;

    let elevators: Vec<(EntityId, f64)> = w
        .iter_elevators()
        .map(|(eid, pos, _)| (eid, pos.value()))
        .collect();
    let shaft_count = elevators.len().max(1) as u32;

    let vs = VisualScale::from_scene(span, shaft_count, &style);

    let shaft_height = span.mul_add(PPU, vs.car_height * 2.0);
    let shaft_center_y = f64::midpoint(min_pos, max_pos) as f32 * PPU;

    // Optional building-exterior backdrop drawn behind everything.
    if let Some(backdrop) = style.building_backdrop {
        let backdrop_mat = materials.add(backdrop);
        let pad_x = vs.label_offset_x * 1.1;
        let pad_y = vs.car_height * 1.5;
        let backdrop_w = vs.bank_width() + pad_x * 2.0;
        let backdrop_h = shaft_height + pad_y * 2.0;
        commands.spawn((
            Mesh2d(meshes.add(Rectangle::new(backdrop_w, backdrop_h))),
            MeshMaterial2d(backdrop_mat),
            Transform::from_xyz(0.0, shaft_center_y, -0.2),
        ));

        // Optional alternating floor bands inside the backdrop.
        if let Some((odd, even)) = style.floor_band {
            let mut sorted_y: Vec<f32> = stop_positions
                .iter()
                .map(|(_, p, _)| *p as f32 * PPU)
                .collect();
            sorted_y.sort_by(f32::total_cmp);
            for (i, ys) in sorted_y.windows(2).enumerate() {
                let (y0, y1) = (ys[0], ys[1]);
                let mid = f32::midpoint(y0, y1);
                let height = (y1 - y0).abs();
                let mat = materials.add(if i % 2 == 0 { odd } else { even });
                commands.spawn((
                    Mesh2d(meshes.add(Rectangle::new(backdrop_w, height))),
                    MeshMaterial2d(mat),
                    Transform::from_xyz(0.0, mid, -0.15),
                ));
            }
        }
    }

    let shaft_mat = materials.add(style.shaft);
    let cable_mat = materials.add(style.stop_line.with_alpha(0.35));
    for i in 0..shaft_count {
        commands.spawn((
            Mesh2d(meshes.add(Rectangle::new(vs.shaft_width, shaft_height))),
            MeshMaterial2d(shaft_mat.clone()),
            Transform::from_xyz(vs.shaft_x(i), shaft_center_y, 0.0),
            ShaftVisual,
        ));

        if style.shaft_cables {
            // Thin dashed vertical cable drawn just in front of the shaft
            // background — gives the empty shaft a bit of technical detail.
            let cable_width = (vs.shaft_width * 0.1).max(1.0);
            for seg in cable_segments(shaft_height, 16.0, 10.0) {
                commands.spawn((
                    Mesh2d(meshes.add(Rectangle::new(cable_width, seg.len))),
                    MeshMaterial2d(cable_mat.clone()),
                    Transform::from_xyz(vs.shaft_x(i), shaft_center_y + seg.offset, 0.05),
                ));
            }
        }
    }

    // Stop indicators + labels.
    let stop_line_material = materials.add(style.stop_line);
    let total_line_width = if style.stop_lines_span_all_shafts {
        vs.bank_width() + vs.shaft_width
    } else {
        vs.shaft_width * 5.0
    };
    let label_x = vs.leftmost_x() - vs.label_offset_x;
    for (_eid, pos, name) in &stop_positions {
        let y = *pos as f32 * PPU;

        if style.dashed_stop_lines {
            // Short dashes separated by small gaps across the full span.
            let dash_len = 14.0;
            let gap_len = 9.0;
            let segments = segment_positions(total_line_width, dash_len, gap_len);
            for seg_x in segments {
                commands.spawn((
                    Mesh2d(meshes.add(Rectangle::new(dash_len, vs.stop_line_thickness))),
                    MeshMaterial2d(stop_line_material.clone()),
                    Transform::from_xyz(seg_x, y, 0.1),
                    StopVisual,
                ));
            }
        } else {
            commands.spawn((
                Mesh2d(meshes.add(Rectangle::new(total_line_width, vs.stop_line_thickness))),
                MeshMaterial2d(stop_line_material.clone()),
                Transform::from_xyz(0.0, y, 0.1),
                StopVisual,
            ));
        }

        commands.spawn((
            Text2d::new(name.clone()),
            TextFont {
                font_size: vs.font_size,
                ..default()
            },
            TextColor(style.text),
            Transform::from_xyz(label_x, y, 0.1),
            StopLabel,
        ));
    }

    // Elevator cars (with optional door panels as children). Each car
    // pulls its body color from `car_palette` so they read as distinct
    // vehicles; if the palette is empty we fall back to `style.car`.
    let door_mat = materials.add(style.door_panel);
    let car_mesh = meshes.add(Rectangle::new(vs.car_width, vs.car_height));
    // Door panels occupy the central horizontal band of the car so the
    // colored body stays visible at top and bottom even when closed.
    let panel_mesh = meshes.add(Rectangle::new(vs.car_width * 0.5, vs.car_height * 0.65));
    let car_color = |idx: usize| -> Color {
        if style.car_palette.is_empty() {
            style.car
        } else {
            style.car_palette[idx % style.car_palette.len()]
        }
    };

    let mut shaft_index_map: HashMap<EntityId, u32> = HashMap::new();
    for (i, (eid, pos)) in elevators.iter().enumerate() {
        let idx = i as u32;
        shaft_index_map.insert(*eid, idx);
        let x = vs.shaft_x(idx);
        let y = *pos as f32 * PPU;
        let car_mat = materials.add(car_color(i));

        let mut car = commands.spawn((
            Mesh2d(car_mesh.clone()),
            MeshMaterial2d(car_mat),
            Transform::from_xyz(x, y, 0.5),
            ElevatorVisual {
                entity_id: *eid,
                shaft_index: idx,
            },
        ));

        if style.sliding_doors {
            // Panels drawn *in front of* the car on z=0.6.
            // Travel = car_width/4 from closed center to fully open.
            let travel = vs.car_width * 0.25;
            let arrow_mesh = meshes.add(RegularPolygon::new(vs.rider_radius * 0.9, 3));
            let arrow_mat = materials.add(style.text);
            car.with_children(|parent| {
                for side in [-1.0_f32, 1.0_f32] {
                    parent.spawn((
                        Mesh2d(panel_mesh.clone()),
                        MeshMaterial2d(door_mat.clone()),
                        Transform::from_xyz(side * vs.car_width * 0.25, 0.0, 0.1),
                        DoorPanel {
                            side,
                            elevator: *eid,
                            travel,
                        },
                    ));
                }
                // Direction arrow (hidden by default; sync system toggles).
                parent.spawn((
                    Mesh2d(arrow_mesh),
                    MeshMaterial2d(arrow_mat),
                    Transform::from_xyz(0.0, 0.0, 0.2),
                    Visibility::Hidden,
                    DirectionArrow { elevator: *eid },
                ));
            });
        }
    }

    let rider_mats = RiderMaterials {
        up: materials.add(style.rider_up),
        down: materials.add(style.rider_down),
        boarding: materials.add(style.rider_boarding),
        exiting: materials.add(style.rider_exiting),
    };
    commands.insert_resource(rider_mats);
    commands.insert_resource(ElevatorShaftIndex(shaft_index_map));
    commands.insert_resource(QueueSlots::default());
    commands.insert_resource(vs);
}

/// Rebuild [`QueueSlots`] from the current waiting-rider population.
///
/// Riders at each stop are sorted by their `EntityId` — stable within a
/// scene — and assigned slot indices `0..`. When a rider boards, everyone
/// else shifts up one slot naturally.
#[allow(clippy::needless_pass_by_value)]
pub fn compute_queue_slots(sim: Res<SimulationRes>, mut slots: ResMut<QueueSlots>) {
    let w = sim.sim.world();

    // Bucket waiting rider ids by stop, then sort each bucket for determinism.
    let mut buckets: HashMap<EntityId, Vec<EntityId>> = HashMap::new();
    for (eid, r) in w.iter_riders() {
        if r.phase() != RiderPhase::Waiting {
            continue;
        }
        if let Some(stop) = r.current_stop() {
            buckets.entry(stop).or_default().push(eid);
        }
    }

    slots.0.clear();
    for bucket in buckets.values_mut() {
        bucket.sort_unstable();
        for (i, eid) in bucket.iter().enumerate() {
            slots.0.insert(*eid, i);
        }
    }
}

/// Update elevator car positions.
#[allow(clippy::needless_pass_by_value)]
pub fn sync_elevator_visuals(
    sim: Res<SimulationRes>,
    mut query: Query<(&ElevatorVisual, &mut Transform)>,
) {
    for (vis, mut transform) in &mut query {
        if let Some(pos) = sim.sim.world().position(vis.entity_id) {
            transform.translation.y = pos.value() as f32 * PPU;
        }
    }
}

/// Show/hide and orient each car's direction arrow.
///
/// Arrow points up for ascending trips, down for descending, and is
/// hidden while the car is idle, loading, or its doors are operating.
#[allow(clippy::needless_pass_by_value)]
pub fn sync_direction_arrows(
    sim: Res<SimulationRes>,
    mut arrows: Query<(&DirectionArrow, &mut Visibility, &mut Transform)>,
) {
    let w = sim.sim.world();
    for (arrow, mut vis, mut tf) in &mut arrows {
        let Some(car) = w.elevator(arrow.elevator) else {
            *vis = Visibility::Hidden;
            continue;
        };
        let target = match car.phase() {
            ElevatorPhase::MovingToStop(target) | ElevatorPhase::Repositioning(target) => {
                Some(target)
            }
            _ => None,
        };
        let Some(target_stop) = target else {
            *vis = Visibility::Hidden;
            continue;
        };
        let (Some(car_pos), Some(target_pos)) =
            (w.position(arrow.elevator), w.stop_position(target_stop))
        else {
            *vis = Visibility::Hidden;
            continue;
        };
        let going_up = target_pos > car_pos.value();
        *vis = Visibility::Visible;
        // RegularPolygon(sides=3) points up by default; rotate 180° to point down.
        tf.rotation = if going_up {
            Quat::IDENTITY
        } else {
            Quat::from_rotation_z(PI)
        };
    }
}

/// Update door-panel child transforms from the core `DoorState`.
#[allow(clippy::needless_pass_by_value)]
pub fn sync_door_panels(sim: Res<SimulationRes>, mut query: Query<(&DoorPanel, &mut Transform)>) {
    let w = sim.sim.world();
    for (panel, mut t) in &mut query {
        let Some(car) = w.elevator(panel.elevator) else {
            continue;
        };
        let frac = door_open_fraction(*car.door());
        let half_closed = panel.travel;
        let offset = frac.mul_add(panel.travel, half_closed);
        t.translation.x = panel.side * offset;
    }
}

/// Compute the "open fraction" (0 = closed, 1 = fully open) for a door state.
fn door_open_fraction(state: DoorState) -> f32 {
    match state {
        DoorState::Opening {
            ticks_remaining,
            close_duration,
            ..
        } => {
            if close_duration == 0 {
                1.0
            } else {
                1.0 - (ticks_remaining as f32 / close_duration as f32).clamp(0.0, 1.0)
            }
        }
        DoorState::Open { .. } => 1.0,
        DoorState::Closing {
            ticks_remaining,
            total_duration,
        } => {
            // total_duration == 0 means a pre-field snapshot; use the
            // historical default so the panels still animate plausibly.
            let total = if total_duration == 0 {
                CLOSING_FALLBACK_TICKS
            } else {
                total_duration as f32
            };
            (ticks_remaining as f32 / total).clamp(0.0, 1.0)
        }
        _ => 0.0, // Closed and any future non-exhaustive variants.
    }
}

/// Spawn visuals for newly-appeared riders and mark gone ones for
/// fade-out ([`tick_rider_fades`] despawns them once they've shrunk to 0).
#[allow(clippy::needless_pass_by_value, clippy::too_many_arguments)]
pub fn sync_rider_visuals(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    sim: Res<SimulationRes>,
    mut existing: Query<(Entity, &RiderVisual, &mut RiderFade)>,
    vs: Res<VisualScale>,
    rider_mats: Res<RiderMaterials>,
    style: Res<VisualStyle>,
    shaft_idx: Res<ElevatorShaftIndex>,
    slots: Res<QueueSlots>,
) {
    let w = sim.sim.world();

    let active_ids: std::collections::HashSet<EntityId> = w
        .iter_riders()
        .filter(|(_, r)| !matches!(r.phase(), RiderPhase::Arrived | RiderPhase::Abandoned))
        .map(|(eid, _)| eid)
        .collect();

    for (_entity, vis, mut fade) in &mut existing {
        if !active_ids.contains(&vis.entity_id) && fade.target > 0.0 {
            fade.target = 0.0;
        }
    }

    let existing_ids: std::collections::HashSet<EntityId> =
        existing.iter().map(|(_, v, _)| v.entity_id).collect();

    for (rider_eid, rider) in w.iter_riders() {
        if matches!(rider.phase(), RiderPhase::Arrived | RiderPhase::Abandoned) {
            continue;
        }
        if existing_ids.contains(&rider_eid) {
            continue;
        }

        let (x, y, mat) =
            rider_visual_params(rider_eid, rider, w, &vs, &rider_mats, &shaft_idx, &slots);
        let phase = bob_phase_for(rider_eid);
        let mut initial_tf = Transform::from_xyz(x, y, 1.0);
        initial_tf.scale = Vec3::splat(FADE_STEP);

        if style.humanoid_riders {
            // Body (pill) on z=1.0, head (circle) on z=1.1 as child.
            let body_w = vs.rider_radius * 1.4;
            let body_h = vs.rider_radius * 2.4;
            let head_r = vs.rider_radius * 0.75;
            commands
                .spawn((
                    Mesh2d(meshes.add(Rectangle::new(body_w, body_h))),
                    MeshMaterial2d(mat.clone()),
                    initial_tf,
                    RiderVisual {
                        entity_id: rider_eid,
                    },
                    BobPhase(phase),
                    RiderFade {
                        current: FADE_STEP,
                        target: 1.0,
                    },
                ))
                .with_children(|parent| {
                    parent.spawn((
                        Mesh2d(meshes.add(Circle::new(head_r))),
                        MeshMaterial2d(mat.clone()),
                        Transform::from_xyz(0.0, head_r.mul_add(0.7, body_h * 0.5), 0.05),
                        RiderHead,
                    ));
                });
        } else {
            commands.spawn((
                Mesh2d(meshes.add(Circle::new(vs.rider_radius))),
                MeshMaterial2d(mat),
                initial_tf,
                RiderVisual {
                    entity_id: rider_eid,
                },
                BobPhase(phase),
                RiderFade {
                    current: FADE_STEP,
                    target: 1.0,
                },
            ));
        }
    }
}

/// Ease [`RiderFade::current`] toward `target` and apply it to the
/// rider's Transform scale. Despawns once shrunken to ~0.
#[allow(clippy::needless_pass_by_value)]
pub fn tick_rider_fades(
    mut commands: Commands,
    mut query: Query<(Entity, &mut RiderFade, &mut Transform)>,
) {
    for (entity, mut fade, mut tf) in &mut query {
        let delta = fade.target - fade.current;
        if delta.abs() > FADE_STEP * 0.5 {
            fade.current += delta.signum() * FADE_STEP;
        } else {
            fade.current = fade.target;
        }
        fade.current = fade.current.clamp(0.0, 1.0);
        tf.scale = Vec3::splat(fade.current);

        if fade.target <= 0.01 && fade.current <= 0.01 {
            commands.entity(entity).despawn();
        }
    }
}

/// Derive a deterministic bob-phase offset (radians) from the rider id so
/// everyone bobs out of sync — prevents the crowd from breathing as one.
fn bob_phase_for(eid: EntityId) -> f32 {
    use std::hash::{Hash, Hasher};
    let mut h = std::collections::hash_map::DefaultHasher::new();
    eid.hash(&mut h);
    (h.finish() % 6283) as f32 / 1000.0
}

/// Update positions and colors of existing rider visuals.
///
/// Positions interpolate toward the target with exponential damping
/// (`RIDER_LERP_ALPHA`) so boarding/exiting doesn't snap. Waiting riders
/// get a small sinusoidal bob keyed on sim tick + per-rider phase, so the
/// queue feels alive without anyone moving in lockstep.
#[allow(clippy::needless_pass_by_value, clippy::too_many_arguments)]
pub fn update_rider_positions(
    sim: Res<SimulationRes>,
    mut query: Query<(
        &RiderVisual,
        &BobPhase,
        &mut Transform,
        &mut MeshMaterial2d<ColorMaterial>,
        &Children,
    )>,
    mut child_mats: Query<
        &mut MeshMaterial2d<ColorMaterial>,
        (With<RiderHead>, Without<RiderVisual>),
    >,
    rider_mats: Res<RiderMaterials>,
    vs: Res<VisualScale>,
    shaft_idx: Res<ElevatorShaftIndex>,
    slots: Res<QueueSlots>,
) {
    let w = sim.sim.world();
    let tick_f = sim.sim.current_tick() as f32;

    for (vis, bob, mut transform, mut mat_handle, children) in &mut query {
        let Some(rider) = w.rider(vis.entity_id) else {
            continue;
        };
        if matches!(rider.phase(), RiderPhase::Arrived | RiderPhase::Abandoned) {
            continue;
        }

        let (x, target_y, handle) = rider_visual_params(
            vis.entity_id,
            rider,
            w,
            &vs,
            &rider_mats,
            &shaft_idx,
            &slots,
        );

        let y = if rider.phase() == RiderPhase::Waiting {
            tick_f
                .mul_add(IDLE_BOB_FREQ, bob.0)
                .sin()
                .mul_add(IDLE_BOB_PX, target_y)
        } else {
            target_y
        };

        let t = RIDER_LERP_ALPHA;
        transform.translation.x = (x - transform.translation.x).mul_add(t, transform.translation.x);
        transform.translation.y = (y - transform.translation.y).mul_add(t, transform.translation.y);
        *mat_handle = MeshMaterial2d(handle.clone());

        // Keep the head color in sync.
        for child in children.iter() {
            if let Ok(mut head_mat) = child_mats.get_mut(child) {
                *head_mat = MeshMaterial2d(handle.clone());
            }
        }
    }
}

/// Compute (x, y, material) for a rider visual based on its phase.
fn rider_visual_params(
    rider_eid: EntityId,
    rider: &Rider,
    w: &World,
    vs: &VisualScale,
    mats: &RiderMaterials,
    shaft_idx: &ElevatorShaftIndex,
    slots: &QueueSlots,
) -> (f32, f32, Handle<ColorMaterial>) {
    match rider.phase() {
        RiderPhase::Waiting => {
            let stop_y = rider
                .current_stop()
                .and_then(|s| w.stop_position(s))
                .unwrap_or(0.0);
            let slot = slots.0.get(&rider_eid).copied().unwrap_or(0);
            let col = slot.min(MAX_QUEUE_COLS - 1) as f32;
            let x = vs.leftmost_x() + vs.waiting_x_offset - col * vs.rider_spacing;
            (
                x,
                stop_y as f32 * PPU,
                direction_material(rider_eid, rider, w, mats),
            )
        }
        RiderPhase::Boarding(elev_eid) => {
            let elev_y = w.position(elev_eid).map_or(0.0, Position::value);
            let x = shaft_idx
                .0
                .get(&elev_eid)
                .map_or(0.0, |i| vs.rider_radius.mul_add(-2.0, vs.shaft_x(*i)));
            (x, elev_y as f32 * PPU, mats.boarding.clone())
        }
        RiderPhase::Riding(elev_eid) => {
            let elev_y = w.position(elev_eid).map_or(0.0, Position::value);
            let shaft_x = shaft_idx.0.get(&elev_eid).map_or(0.0, |i| vs.shaft_x(*i));
            let idx = w
                .elevator(elev_eid)
                .and_then(|car| car.riders().iter().position(|r| *r == rider_eid))
                .unwrap_or(0);
            let x_offset = (idx as f32 % 3.0 - 1.0) * vs.rider_spacing * 0.6;
            (
                shaft_x + x_offset,
                elev_y as f32 * PPU,
                direction_material(rider_eid, rider, w, mats),
            )
        }
        RiderPhase::Exiting(elev_eid) => {
            let elev_y = w.position(elev_eid).map_or(0.0, Position::value);
            let x = shaft_idx
                .0
                .get(&elev_eid)
                .map_or(0.0, |i| vs.rider_radius.mul_add(2.0, vs.shaft_x(*i)));
            (x, elev_y as f32 * PPU, mats.exiting.clone())
        }
        _ => (0.0, 0.0, mats.up.clone()),
    }
}

/// Material for a rider based on travel direction (up = destination above origin).
fn direction_material(
    rider_eid: EntityId,
    rider: &Rider,
    w: &World,
    mats: &RiderMaterials,
) -> Handle<ColorMaterial> {
    let origin_y = rider
        .current_stop()
        .and_then(|s| w.stop_position(s))
        .unwrap_or(0.0);
    let dest_y = w
        .route(rider_eid)
        .and_then(elevator_core::components::Route::final_destination)
        .and_then(|s| w.stop_position(s))
        .unwrap_or(origin_y);
    if dest_y >= origin_y {
        mats.up.clone()
    } else {
        mats.down.clone()
    }
}
