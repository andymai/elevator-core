//! Behavioral glowing speck rider rendering.
//!
//! Riders are tiny emissive circles whose color shifts based on phase:
//! - Waiting: cool blue, drifting gently, warming to amber over time
//! - Boarding: cyan, streaming toward the car
//! - Riding: yellow, packed inside the car
//! - Exiting: warm, scattering outward

use bevy::prelude::*;
use elevator_core::components::{Position, Rider, RiderPhase};
use elevator_core::entity::EntityId;
use elevator_core::sim::Simulation;
use std::hash::{Hash, Hasher};

use super::{LineLayout, PPU, VisualScale};
use crate::palette;
use crate::sim_bridge::SimulationRes;

/// Marker component linking a Bevy entity to a simulation rider.
#[derive(Component)]
pub struct RiderVisual {
    /// The simulation entity ID of this rider.
    pub entity_id: EntityId,
}

/// Pre-allocated material handles per rider phase.
#[derive(Resource)]
pub struct RiderMaterials {
    /// Material for calm waiting riders.
    pub calm: Handle<ColorMaterial>,
    /// Material for impatient waiting riders.
    pub impatient: Handle<ColorMaterial>,
    /// Material for boarding riders.
    pub boarding: Handle<ColorMaterial>,
    /// Material for riding riders.
    pub riding: Handle<ColorMaterial>,
    /// Material for exiting riders.
    pub exiting: Handle<ColorMaterial>,
    /// Material for arrived riders (brief sparkle before despawn).
    #[allow(dead_code)]
    pub arrived: Handle<ColorMaterial>,
    /// Material for abandoned riders.
    #[allow(dead_code)]
    pub abandoned: Handle<ColorMaterial>,
}

/// Boost a color's RGB by 20% for emissive glow (Bloom will create the halo).
fn emissive_boost(color: Color) -> Color {
    let lin = color.to_linear();
    Color::linear_rgba(lin.red * 1.2, lin.green * 1.2, lin.blue * 1.2, lin.alpha)
}

/// Initialize rider material resources.
pub fn init_rider_materials(
    commands: &mut Commands,
    materials: &mut ResMut<Assets<ColorMaterial>>,
) {
    let mats = RiderMaterials {
        calm: materials.add(ColorMaterial::from_color(emissive_boost(
            palette::RIDER_CALM,
        ))),
        impatient: materials.add(ColorMaterial::from_color(emissive_boost(
            palette::RIDER_IMPATIENT,
        ))),
        boarding: materials.add(ColorMaterial::from_color(emissive_boost(
            palette::RIDER_BOARDING,
        ))),
        riding: materials.add(ColorMaterial::from_color(emissive_boost(
            palette::RIDER_RIDING,
        ))),
        exiting: materials.add(ColorMaterial::from_color(emissive_boost(
            palette::RIDER_EXITING,
        ))),
        arrived: materials.add(ColorMaterial::from_color(emissive_boost(
            palette::RIDER_ARRIVED,
        ))),
        abandoned: materials.add(ColorMaterial::from_color(emissive_boost(
            palette::RIDER_ABANDONED,
        ))),
    };
    commands.insert_resource(mats);
}

/// Ticks after which a waiting rider shifts from calm to impatient color.
const IMPATIENCE_THRESHOLD_TICKS: u64 = 300;

/// Spawn new rider visuals and despawn finished ones.
#[allow(clippy::needless_pass_by_value)]
pub fn sync_rider_visuals(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    sim: Res<SimulationRes>,
    existing: Query<(Entity, &RiderVisual)>,
    vs: Res<VisualScale>,
    rider_mats: Res<RiderMaterials>,
    layout: Res<LineLayout>,
) {
    let w = sim.sim.world();
    let current_tick = sim.sim.current_tick();

    // Active rider entity IDs (not arrived/abandoned).
    let active_ids: std::collections::HashSet<EntityId> = w
        .iter_riders()
        .filter(|(_, r)| !matches!(r.phase(), RiderPhase::Arrived | RiderPhase::Abandoned))
        .map(|(eid, _)| eid)
        .collect();

    // Despawn visuals for gone riders.
    for (entity, vis) in &existing {
        if !active_ids.contains(&vis.entity_id) {
            commands.entity(entity).despawn();
        }
    }

    let existing_ids: std::collections::HashSet<EntityId> =
        existing.iter().map(|(_, v)| v.entity_id).collect();

    for (rider_eid, rider) in w.iter_riders() {
        if matches!(rider.phase(), RiderPhase::Arrived | RiderPhase::Abandoned) {
            continue;
        }
        if existing_ids.contains(&rider_eid) {
            continue;
        }

        let (x, y, mat_handle) = rider_visual_params(
            rider_eid,
            rider,
            w,
            &sim.sim,
            &layout,
            &vs,
            &rider_mats,
            current_tick,
        );

        commands.spawn((
            Mesh2d(meshes.add(Circle::new(vs.rider_radius))),
            MeshMaterial2d(mat_handle),
            Transform::from_xyz(x, y, 1.0),
            RiderVisual {
                entity_id: rider_eid,
            },
        ));
    }
}

/// Update positions and materials of existing rider visuals.
#[allow(clippy::needless_pass_by_value)]
pub fn update_rider_positions(
    sim: Res<SimulationRes>,
    time: Res<Time>,
    mut query: Query<(
        &RiderVisual,
        &mut Transform,
        &mut MeshMaterial2d<ColorMaterial>,
    )>,
    rider_mats: Res<RiderMaterials>,
    vs: Res<VisualScale>,
    layout: Res<LineLayout>,
) {
    let w = sim.sim.world();
    let current_tick = sim.sim.current_tick();
    let t = time.elapsed_secs();

    for (vis, mut transform, mut mat_handle) in &mut query {
        let Some(rider) = w.rider(vis.entity_id) else {
            continue;
        };
        if matches!(rider.phase(), RiderPhase::Arrived | RiderPhase::Abandoned) {
            continue;
        }

        let (x, y, handle) = rider_visual_params(
            vis.entity_id,
            rider,
            w,
            &sim.sim,
            &layout,
            &vs,
            &rider_mats,
            current_tick,
        );

        // Add gentle drift for waiting riders (50% larger amplitude).
        let drift = if matches!(rider.phase(), RiderPhase::Waiting) {
            let mut hasher = std::collections::hash_map::DefaultHasher::new();
            vis.entity_id.hash(&mut hasher);
            let hash = hasher.finish();
            let phase_offset = (hash % 1000) as f32 * 0.001 * std::f32::consts::TAU;
            t.mul_add(0.5, phase_offset).sin() * 3.0
        } else {
            0.0
        };

        transform.translation.x = x + drift;
        transform.translation.y = y;
        *mat_handle = MeshMaterial2d(handle);

        // Impatient riders: size pulse for urgency.
        if matches!(rider.phase(), RiderPhase::Waiting) {
            let wait_ticks = current_tick.saturating_sub(rider.spawn_tick());
            if wait_ticks > IMPATIENCE_THRESHOLD_TICKS {
                let pulse = (t * 3.0).sin().mul_add(0.15, 1.0);
                transform.scale = Vec3::splat(pulse);
            } else {
                transform.scale = Vec3::ONE;
            }
        } else {
            transform.scale = Vec3::ONE;
        }
    }
}

/// Compute (x, y, material) for a rider visual based on its phase.
///
/// For waiting riders, position them near the leftmost line that serves their
/// stop. For boarding/riding/exiting riders, position at the elevator's line.
#[allow(clippy::too_many_arguments)]
fn rider_visual_params(
    rider_eid: EntityId,
    rider: &Rider,
    w: &elevator_core::world::World,
    sim: &Simulation,
    layout: &LineLayout,
    vs: &VisualScale,
    mats: &RiderMaterials,
    current_tick: u64,
) -> (f32, f32, Handle<ColorMaterial>) {
    match rider.phase() {
        RiderPhase::Waiting => {
            let stop_y = rider
                .current_stop()
                .and_then(|s| w.stop_position(s))
                .unwrap_or(0.0);

            // Find x-position: use the first line serving this stop.
            let shaft_x = rider.current_stop().map_or(0.0, |stop| {
                let lines = sim.lines_serving_stop(stop);
                lines
                    .first()
                    .map_or(0.0, |line_eid| layout.x_for_line(*line_eid))
            });

            let mut hasher = std::collections::hash_map::DefaultHasher::new();
            rider_eid.hash(&mut hasher);
            let hash = hasher.finish();
            let offset = ((hash % 8) as f32).mul_add(-vs.rider_spacing, vs.waiting_x_offset);

            // Color shifts from calm to impatient based on wait duration.
            let wait_ticks = current_tick.saturating_sub(rider.spawn_tick());
            let mat = if wait_ticks > IMPATIENCE_THRESHOLD_TICKS {
                mats.impatient.clone()
            } else {
                mats.calm.clone()
            };
            (shaft_x + offset, stop_y as f32 * PPU, mat)
        }
        RiderPhase::Boarding(elev_eid) => {
            let elev_y = w.position(elev_eid).map_or(0.0, Position::value);
            let shaft_x = sim
                .line_for_elevator(elev_eid)
                .map_or(0.0, |l| layout.x_for_line(l));
            (
                vs.waiting_x_offset.mul_add(0.3, shaft_x),
                elev_y as f32 * PPU,
                mats.boarding.clone(),
            )
        }
        RiderPhase::Riding(elev_eid) => {
            let elev_y = w.position(elev_eid).map_or(0.0, Position::value);
            let shaft_x = sim
                .line_for_elevator(elev_eid)
                .map_or(0.0, |l| layout.x_for_line(l));
            let idx = w
                .elevator(elev_eid)
                .and_then(|car| car.riders().iter().position(|r| *r == rider_eid))
                .unwrap_or(0);
            let x_offset = (idx as f32 % 4.0).mul_add(vs.rider_spacing, -vs.rider_spacing * 1.5);
            let y_offset = (idx as f32 / 4.0).floor() * vs.rider_spacing;
            (
                shaft_x + x_offset,
                (elev_y as f32).mul_add(PPU, y_offset),
                mats.riding.clone(),
            )
        }
        RiderPhase::Exiting(elev_eid) => {
            let elev_y = w.position(elev_eid).map_or(0.0, Position::value);
            let shaft_x = sim
                .line_for_elevator(elev_eid)
                .map_or(0.0, |l| layout.x_for_line(l));
            (
                vs.waiting_x_offset.mul_add(0.3, shaft_x),
                elev_y as f32 * PPU,
                mats.exiting.clone(),
            )
        }
        _ => (0.0, 0.0, mats.calm.clone()),
    }
}
