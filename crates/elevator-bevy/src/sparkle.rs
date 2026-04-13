//! Arrival sparkle particles — tiny expanding/fading bursts when riders reach their destination.

use bevy::prelude::*;
use rand::Rng;
use std::collections::HashSet;
use std::hash::{Hash, Hasher};

use crate::palette;
use crate::rendering::{LineLayout, PPU, SharedMeshes, StopRegistry, TRANSFER_STOP_INDEX};
use crate::sim_bridge::SimulationRes;
use elevator_core::components::{ElevatorPhase, RiderPhase};
use elevator_core::entity::EntityId;

/// Expanding, fading sparkle particle spawned on rider arrival.
#[derive(Component)]
pub struct Sparkle {
    /// Remaining lifetime in seconds.
    remaining: f32,
    /// Outward velocity in world pixels per second.
    velocity: Vec2,
}

/// Tracks which riders were in `Arrived` phase on the previous frame,
/// so we can detect new arrivals.
#[derive(Resource, Default)]
pub struct PreviousArrivals {
    /// Set of rider entity IDs that were `Arrived` last frame.
    ids: HashSet<EntityId>,
}

/// Tracks which riders were `Waiting` at the transfer stop on the previous frame,
/// so we can detect new transfer arrivals.
#[derive(Resource, Default)]
pub struct PreviousTransferWaiters {
    /// Set of rider entity IDs that were `Waiting` at the transfer stop last frame.
    ids: HashSet<EntityId>,
}

/// Tracks elevator phases from the previous frame to detect phase transitions.
#[derive(Resource, Default)]
pub struct PreviousPhases {
    /// Elevator entity ID to previous phase mapping.
    phases: std::collections::HashMap<EntityId, ElevatorPhase>,
}

/// A particle that arcs horizontally between shaft groups at the transfer floor.
#[derive(Component)]
pub struct TransferArc {
    /// Starting x-position (arriving shaft group).
    start_x: f32,
    /// Ending x-position (departing shaft group).
    end_x: f32,
    /// Base y-position (transfer floor).
    y: f32,
    /// Remaining lifetime in seconds.
    remaining: f32,
    /// Total lifetime in seconds.
    total: f32,
    /// Color of the arriving group.
    start_color: Color,
    /// Color of the departing group.
    end_color: Color,
}

/// An expanding ring spawned when an elevator arrives at a floor (doors opening).
#[derive(Component)]
pub struct ArrivalRing {
    /// Remaining lifetime in seconds.
    remaining: f32,
    /// Total lifetime in seconds.
    total: f32,
}

/// Detect newly arrived riders and spawn sparkle particles at their last position.
#[allow(clippy::needless_pass_by_value)]
pub fn spawn_sparkles(
    mut commands: Commands,
    mut materials: ResMut<Assets<ColorMaterial>>,
    sim: Res<SimulationRes>,
    mut prev: ResMut<PreviousArrivals>,
    _registry: Res<StopRegistry>,
    layout: Res<LineLayout>,
    shared_meshes: Res<SharedMeshes>,
) {
    let w = sim.sim.world();

    let current_arrived: HashSet<EntityId> = w
        .iter_riders()
        .filter(|(_, r)| r.phase() == RiderPhase::Arrived)
        .map(|(eid, _)| eid)
        .collect();

    let mut rng = rand::rng();

    for &rider_eid in &current_arrived {
        if prev.ids.contains(&rider_eid) {
            continue;
        }

        // Determine position: use the rider's destination stop position.
        let Some(rider) = w.rider(rider_eid) else {
            continue;
        };

        let stop_y = rider
            .current_stop()
            .and_then(|s| w.stop_position(s))
            .unwrap_or(0.0) as f32
            * PPU;

        // Determine x position: use the first line serving this stop.
        let shaft_x = rider.current_stop().map_or(0.0, |stop| {
            let lines = sim.sim.lines_serving_stop(stop);
            lines
                .first()
                .map_or(0.0, |line_eid| layout.x_for_line(*line_eid))
        });

        // Determine color based on which group the rider arrived in.
        // Use a hash-based heuristic: check if the stop is served by express.
        let is_express = rider.current_stop().is_some_and(|stop| {
            let lines = sim.sim.lines_serving_stop(stop);
            lines.iter().any(|l| layout.is_express(*l))
        });

        // Use a deterministic hash to pick color — cyan for local-area stops, amber for express.
        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        rider_eid.hash(&mut hasher);
        let hash = hasher.finish();
        let use_express_color = is_express && hash.is_multiple_of(3);

        let sparkle_color = if use_express_color {
            palette::CAR_CORE_EXPRESS
        } else {
            palette::CAR_CORE_LOCAL
        };

        // Spawn 4-6 sparkle particles.
        let count = rng.random_range(4u32..=6);
        for _ in 0..count {
            let angle = rng.random_range(0.0f32..std::f32::consts::TAU);
            let speed = rng.random_range(20.0f32..60.0);
            let velocity = Vec2::new(angle.cos() * speed, angle.sin() * speed);

            // Slightly varied alpha.
            let alpha_var = rng.random_range(0.6f32..1.0);
            let lin = sparkle_color.to_linear();
            let color = Color::linear_rgba(lin.red, lin.green, lin.blue, lin.alpha * alpha_var);

            commands.spawn((
                Mesh2d(shared_meshes.sparkle.clone()),
                MeshMaterial2d(materials.add(ColorMaterial::from_color(color))),
                Transform::from_xyz(shaft_x, stop_y, 1.5),
                Sparkle {
                    remaining: 0.5,
                    velocity,
                },
            ));
        }
    }

    prev.ids = current_arrived;
}

/// Update sparkle particles: expand, fade, and despawn.
#[allow(clippy::needless_pass_by_value)]
pub fn update_sparkles(
    mut commands: Commands,
    time: Res<Time>,
    mut query: Query<(
        Entity,
        &mut Sparkle,
        &mut Transform,
        &MeshMaterial2d<ColorMaterial>,
    )>,
    mut materials: ResMut<Assets<ColorMaterial>>,
) {
    let dt = time.delta_secs();

    for (entity, mut sparkle, mut transform, mat_handle) in &mut query {
        sparkle.remaining -= dt;

        if sparkle.remaining <= 0.0 {
            commands.entity(entity).despawn();
            continue;
        }

        // Move outward.
        transform.translation.x += sparkle.velocity.x * dt;
        transform.translation.y += sparkle.velocity.y * dt;

        // Expand scale over lifetime (1.0 -> 2.0).
        let life_frac = sparkle.remaining / 0.5;
        let scale = 2.0 - life_frac; // starts at 1.0, ends at 2.0
        transform.scale = Vec3::splat(scale);

        // Fade alpha.
        if let Some(mat) = materials.get_mut(mat_handle.id()) {
            let lin = mat.color.to_linear();
            mat.color = Color::linear_rgba(lin.red, lin.green, lin.blue, lin.alpha * life_frac);
        }
    }
}

// ── Transfer Arc Systems ──

/// Detect riders at the transfer floor who just entered Waiting phase (arriving
/// from one group to transfer to another) and spawn arc particles.
#[allow(clippy::needless_pass_by_value, clippy::too_many_arguments)]
pub fn spawn_transfer_arcs(
    mut commands: Commands,
    mut materials: ResMut<Assets<ColorMaterial>>,
    sim: Res<SimulationRes>,
    mut prev_waiters: ResMut<PreviousTransferWaiters>,
    registry: Res<StopRegistry>,
    layout: Res<LineLayout>,
    shared_meshes: Res<SharedMeshes>,
) {
    let w = sim.sim.world();

    // Get the transfer stop entity ID.
    let Some((transfer_stop_eid, transfer_y, _)) = registry.stops.get(TRANSFER_STOP_INDEX) else {
        return;
    };
    let transfer_y_px = *transfer_y * PPU;

    // Find current waiters at transfer stop.
    let current_waiters: HashSet<EntityId> = w
        .iter_riders()
        .filter(|(_, r)| {
            r.phase() == RiderPhase::Waiting
                && r.current_stop().is_some_and(|s| s == *transfer_stop_eid)
        })
        .map(|(eid, _)| eid)
        .collect();

    // Detect new arrivals at transfer stop.
    let mut rng = rand::rng();
    for &rider_eid in &current_waiters {
        if prev_waiters.ids.contains(&rider_eid) {
            continue;
        }

        // Get groups serving this stop to determine arc endpoints.
        let groups = sim.sim.groups_serving_stop(*transfer_stop_eid);
        if groups.len() < 2 {
            continue;
        }

        // Get representative x positions for each group.
        let mut group_xs: Vec<(f32, bool)> = Vec::new();
        for group in &groups {
            let lines = sim.sim.lines_in_group(*group);
            if let Some(first_line) = lines.first() {
                let x = layout.x_for_line(*first_line);
                let is_express = layout.is_express(*first_line);
                group_xs.push((x, is_express));
            }
        }

        if group_xs.len() < 2 {
            continue;
        }

        // Arc from first group to second (and vice versa alternating by hash).
        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        rider_eid.hash(&mut hasher);
        let hash = hasher.finish();
        let (from_idx, to_idx) = if hash.is_multiple_of(2) {
            (0, 1)
        } else {
            (1, 0)
        };

        let (start_x, start_is_express) = group_xs[from_idx];
        let (end_x, end_is_express) = group_xs[to_idx];

        let start_color = if start_is_express {
            palette::CAR_CORE_EXPRESS
        } else {
            palette::CAR_CORE_LOCAL
        };
        let end_color = if end_is_express {
            palette::CAR_CORE_EXPRESS
        } else {
            palette::CAR_CORE_LOCAL
        };

        // Spawn 3-4 arc particles.
        let count = 3 + (hash % 2) as u32;
        for i in 0..count {
            let offset_y = (i as f32 - 1.5) * 3.0;
            let start_lin = start_color.to_linear();
            let color = Color::linear_rgba(
                start_lin.red,
                start_lin.green,
                start_lin.blue,
                0.6 + rng.random_range(-0.1f32..0.1),
            );

            commands.spawn((
                Mesh2d(shared_meshes.transfer_arc.clone()),
                MeshMaterial2d(materials.add(ColorMaterial::from_color(color))),
                Transform::from_xyz(start_x, transfer_y_px + offset_y, 1.5),
                TransferArc {
                    start_x,
                    end_x,
                    y: transfer_y_px + offset_y,
                    remaining: 0.8,
                    total: 0.8,
                    start_color,
                    end_color,
                },
            ));
        }
    }

    prev_waiters.ids = current_waiters;
}

/// Update transfer arc particles: lerp position, blend color, fade, and despawn.
#[allow(clippy::needless_pass_by_value)]
pub fn update_transfer_arcs(
    mut commands: Commands,
    time: Res<Time>,
    mut query: Query<(
        Entity,
        &mut TransferArc,
        &mut Transform,
        &MeshMaterial2d<ColorMaterial>,
    )>,
    mut materials: ResMut<Assets<ColorMaterial>>,
) {
    let dt = time.delta_secs();

    for (entity, mut arc, mut transform, mat_handle) in &mut query {
        arc.remaining -= dt;

        if arc.remaining <= 0.0 {
            commands.entity(entity).despawn();
            continue;
        }

        let progress = 1.0 - (arc.remaining / arc.total);
        // Smoothstep easing.
        let eased = progress * progress * 2.0f32.mul_add(-progress, 3.0);

        // Lerp x position.
        transform.translation.x = (arc.end_x - arc.start_x).mul_add(eased, arc.start_x);

        // Parabolic y arc: peak at midpoint.
        transform.translation.y = (progress * std::f32::consts::PI).sin().mul_add(15.0, arc.y);

        // Blend color from start to end, fading alpha.
        let life_frac = arc.remaining / arc.total;
        let start = arc.start_color.to_linear();
        let end = arc.end_color.to_linear();
        if let Some(mat) = materials.get_mut(mat_handle.id()) {
            mat.color = Color::linear_rgba(
                (end.red - start.red).mul_add(eased, start.red),
                (end.green - start.green).mul_add(eased, start.green),
                (end.blue - start.blue).mul_add(eased, start.blue),
                life_frac * 0.6,
            );
        }
    }
}

// ── Arrival Ring Systems ──

/// Detect elevator phase transitions to `DoorOpening` and spawn expanding rings.
#[allow(clippy::needless_pass_by_value)]
pub fn spawn_arrival_rings(
    mut commands: Commands,
    mut materials: ResMut<Assets<ColorMaterial>>,
    sim: Res<SimulationRes>,
    mut prev_phases: ResMut<PreviousPhases>,
    layout: Res<LineLayout>,
    shared_meshes: Res<SharedMeshes>,
) {
    let w = sim.sim.world();

    for (eid, pos, elev) in w.iter_elevators() {
        let current_phase = elev.phase();
        let prev_phase = prev_phases.phases.get(&eid).copied();

        // Detect transition to DoorOpening.
        let is_new_opening = matches!(current_phase, ElevatorPhase::DoorOpening)
            && !matches!(prev_phase, Some(ElevatorPhase::DoorOpening));

        if is_new_opening {
            let y = pos.value() as f32 * PPU;
            let line_eid = sim.sim.line_for_elevator(eid);
            let x = line_eid.map_or(0.0, |l| layout.x_for_line(l));
            let is_express = line_eid.is_some_and(|l| layout.is_express(l));

            let ring_color = if is_express {
                let lin = palette::CAR_CORE_EXPRESS.to_linear();
                Color::linear_rgba(lin.red, lin.green, lin.blue, 0.25)
            } else {
                let lin = palette::CAR_CORE_LOCAL.to_linear();
                Color::linear_rgba(lin.red, lin.green, lin.blue, 0.25)
            };

            commands.spawn((
                Mesh2d(shared_meshes.arrival_ring.clone()),
                MeshMaterial2d(materials.add(ColorMaterial::from_color(ring_color))),
                Transform::from_xyz(x, y, 0.45),
                ArrivalRing {
                    remaining: 0.6,
                    total: 0.6,
                },
            ));
        }

        prev_phases.phases.insert(eid, current_phase);
    }
}

/// Update arrival rings: expand scale, fade alpha, and despawn.
#[allow(clippy::needless_pass_by_value)]
pub fn update_arrival_rings(
    mut commands: Commands,
    time: Res<Time>,
    mut query: Query<(
        Entity,
        &mut ArrivalRing,
        &mut Transform,
        &MeshMaterial2d<ColorMaterial>,
    )>,
    mut materials: ResMut<Assets<ColorMaterial>>,
) {
    let dt = time.delta_secs();

    for (entity, mut ring, mut transform, mat_handle) in &mut query {
        ring.remaining -= dt;

        if ring.remaining <= 0.0 {
            commands.entity(entity).despawn();
            continue;
        }

        let progress = 1.0 - (ring.remaining / ring.total);
        // Expand from 0 to 25px radius.
        let radius = progress * 25.0;
        transform.scale = Vec3::splat(radius);

        // Fade alpha from 0.25 to 0.0.
        let alpha = 0.25 * (ring.remaining / ring.total);
        if let Some(mat) = materials.get_mut(mat_handle.id()) {
            let lin = mat.color.to_linear();
            mat.color = Color::linear_rgba(lin.red, lin.green, lin.blue, alpha);
        }
    }
}
