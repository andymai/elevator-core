use bevy::prelude::*;
use elevator_sim_core::elevator::ElevatorId;
use elevator_sim_core::passenger::{PassengerId, PassengerState};
use elevator_sim_core::stop::StopId;

use crate::sim_bridge::SimulationRes;

/// Pixels per simulation distance unit.
pub const PPU: f32 = 40.0;

/// Holds computed visual sizes that scale with the shaft height.
#[derive(Resource)]
pub struct VisualScale {
    pub shaft_width: f32,
    pub car_width: f32,
    pub car_height: f32,
    pub passenger_radius: f32,
    pub waiting_x_offset: f32,
    pub stop_line_width: f32,
    pub stop_line_thickness: f32,
    pub label_offset_x: f32,
    pub font_size: f32,
    pub rider_spacing: f32,
}

impl VisualScale {
    fn from_shaft_span(span: f32) -> Self {
        // Base sizes designed for a ~15-unit shaft (600px world height).
        // Scale factor grows with shaft size so elements remain visible.
        let base_height = 15.0 * PPU; // 600px
        let actual_height = span * PPU;
        let s = (actual_height / base_height).max(1.0);

        VisualScale {
            shaft_width: 10.0 * s,
            car_width: 80.0 * s,
            car_height: 30.0 * s,
            passenger_radius: 6.0 * s,
            waiting_x_offset: -60.0 * s,
            stop_line_width: 100.0 * s,
            stop_line_thickness: 2.0 * s,
            label_offset_x: 70.0 * s,
            font_size: 14.0 * s,
            rider_spacing: 14.0 * s,
        }
    }
}

/// Marker for the elevator shaft background.
#[derive(Component)]
pub struct ShaftVisual;

/// Marker for an elevator car visual.
#[derive(Component)]
pub struct ElevatorVisual {
    pub elevator_id: ElevatorId,
}

/// Marker for a stop indicator line.
#[derive(Component)]
pub struct StopVisual {
    pub stop_id: StopId,
}

/// Marker for stop label text.
#[derive(Component)]
pub struct StopLabel {
    pub stop_id: StopId,
}

/// Marker for a passenger visual.
#[derive(Component)]
pub struct PassengerVisual {
    pub passenger_id: PassengerId,
}

/// Pre-allocated material handles for each passenger state, avoiding per-frame allocations.
#[derive(Resource)]
pub struct PassengerMaterials {
    pub waiting: Handle<ColorMaterial>,
    pub boarding: Handle<ColorMaterial>,
    pub riding: Handle<ColorMaterial>,
    pub alighting: Handle<ColorMaterial>,
}

/// Spawn the building visuals: shaft, stop indicators, stop labels, and elevator car.
pub fn spawn_building_visuals(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<ColorMaterial>>,
    sim: Res<SimulationRes>,
) {
    let stops = &sim.sim.stops;
    if stops.is_empty() {
        return;
    }

    let min_pos = stops.iter().map(|s| s.position).fold(f64::INFINITY, f64::min);
    let max_pos = stops.iter().map(|s| s.position).fold(f64::NEG_INFINITY, f64::max);
    let span = (max_pos - min_pos) as f32;
    let vs = VisualScale::from_shaft_span(span);

    let shaft_height = (span * PPU) + vs.car_height * 2.0;
    let shaft_center_y = ((min_pos + max_pos) / 2.0) as f32 * PPU;

    // Shaft background (tether/cable).
    commands.spawn((
        Mesh2d(meshes.add(Rectangle::new(vs.shaft_width, shaft_height))),
        MeshMaterial2d(materials.add(Color::srgba(0.2, 0.2, 0.25, 1.0))),
        Transform::from_xyz(0.0, shaft_center_y, 0.0),
        ShaftVisual,
    ));

    // Stop indicators and labels.
    let stop_line_material = materials.add(Color::srgba(0.5, 0.5, 0.5, 1.0));
    for stop in stops {
        let y = stop.position as f32 * PPU;

        // Horizontal line at each stop.
        commands.spawn((
            Mesh2d(meshes.add(Rectangle::new(vs.stop_line_width, vs.stop_line_thickness))),
            MeshMaterial2d(stop_line_material.clone()),
            Transform::from_xyz(0.0, y, 0.1),
            StopVisual { stop_id: stop.id },
        ));

        // Stop name label.
        commands.spawn((
            Text2d::new(&stop.name),
            TextFont {
                font_size: vs.font_size,
                ..default()
            },
            Transform::from_xyz(vs.label_offset_x, y, 0.1),
            StopLabel { stop_id: stop.id },
        ));
    }

    // Elevator car(s).
    let car_material = materials.add(Color::srgba(0.2, 0.5, 0.9, 1.0));
    for elevator in &sim.sim.elevators {
        let y = elevator.position as f32 * PPU;
        commands.spawn((
            Mesh2d(meshes.add(Rectangle::new(vs.car_width, vs.car_height))),
            MeshMaterial2d(car_material.clone()),
            Transform::from_xyz(0.0, y, 0.5),
            ElevatorVisual {
                elevator_id: elevator.id,
            },
        ));
    }

    let passenger_mats = PassengerMaterials {
        waiting: materials.add(Color::srgba(0.2, 0.8, 0.3, 1.0)),
        boarding: materials.add(Color::srgba(0.3, 0.9, 0.9, 1.0)),
        riding: materials.add(Color::srgba(0.9, 0.8, 0.2, 1.0)),
        alighting: materials.add(Color::srgba(0.9, 0.4, 0.2, 1.0)),
    };
    commands.insert_resource(passenger_mats);

    commands.insert_resource(vs);
}

/// Update elevator car positions to match simulation state.
pub fn sync_elevator_visuals(
    sim: Res<SimulationRes>,
    mut query: Query<(&ElevatorVisual, &mut Transform)>,
) {
    for (vis, mut transform) in &mut query {
        if let Some(elevator) = sim.sim.elevators.iter().find(|e| e.id == vis.elevator_id) {
            transform.translation.y = elevator.position as f32 * PPU;
        }
    }
}

/// Spawn, update, and despawn passenger visuals.
pub fn sync_passenger_visuals(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    sim: Res<SimulationRes>,
    existing: Query<(Entity, &PassengerVisual)>,
    vs: Res<VisualScale>,
    passenger_mats: Res<PassengerMaterials>,
) {
    // Track which passenger IDs still exist in the sim.
    let active_ids: std::collections::HashSet<PassengerId> = sim
        .sim
        .passengers
        .iter()
        .filter(|p| p.state != PassengerState::Arrived)
        .map(|p| p.id)
        .collect();

    // Despawn visuals for arrived passengers.
    for (entity, vis) in &existing {
        if !active_ids.contains(&vis.passenger_id) {
            commands.entity(entity).despawn();
        }
    }

    let existing_ids: std::collections::HashSet<PassengerId> =
        existing.iter().map(|(_, v)| v.passenger_id).collect();

    for passenger in &sim.sim.passengers {
        if passenger.state == PassengerState::Arrived {
            continue;
        }

        let (x, y, mat_handle) = match passenger.state {
            PassengerState::Waiting => {
                let stop_y = sim
                    .sim
                    .stops
                    .iter()
                    .find(|s| s.id == passenger.origin)
                    .map(|s| s.position as f32 * PPU)
                    .unwrap_or(0.0);
                let offset =
                    vs.waiting_x_offset - (passenger.id.0 % 5) as f32 * vs.rider_spacing;
                (offset, stop_y, passenger_mats.waiting.clone())
            }
            PassengerState::Boarding(eid) => {
                let elev_y = sim.sim.elevators.iter()
                    .find(|e| e.id == eid)
                    .map(|e| e.position as f32 * PPU)
                    .unwrap_or(0.0);
                (vs.waiting_x_offset * 0.5, elev_y, passenger_mats.boarding.clone())
            }
            PassengerState::Riding(eid) => {
                let elev_y = sim.sim.elevators.iter()
                    .find(|e| e.id == eid)
                    .map(|e| e.position as f32 * PPU)
                    .unwrap_or(0.0);
                let idx = sim.sim.elevators.iter()
                    .find(|e| e.id == eid)
                    .and_then(|e| e.passengers.iter().position(|p| *p == passenger.id))
                    .unwrap_or(0);
                let x_offset = -vs.rider_spacing + (idx as f32 % 3.0) * vs.rider_spacing;
                (x_offset, elev_y, passenger_mats.riding.clone())
            }
            PassengerState::Alighting(eid) => {
                let elev_y = sim.sim.elevators.iter()
                    .find(|e| e.id == eid)
                    .map(|e| e.position as f32 * PPU)
                    .unwrap_or(0.0);
                (vs.waiting_x_offset * 0.5, elev_y, passenger_mats.alighting.clone())
            }
            PassengerState::Arrived => continue,
        };

        if existing_ids.contains(&passenger.id) {
            continue;
        }

        // Spawn new visual.
        commands.spawn((
            Mesh2d(meshes.add(Circle::new(vs.passenger_radius))),
            MeshMaterial2d(mat_handle),
            Transform::from_xyz(x, y, 1.0),
            PassengerVisual {
                passenger_id: passenger.id,
            },
        ));
    }
}

/// Update positions of existing passenger visuals.
pub fn update_passenger_positions(
    sim: Res<SimulationRes>,
    mut query: Query<(&PassengerVisual, &mut Transform, &mut MeshMaterial2d<ColorMaterial>)>,
    passenger_mats: Res<PassengerMaterials>,
    vs: Res<VisualScale>,
) {
    for (vis, mut transform, mut mat_handle) in &mut query {
        let Some(passenger) = sim.sim.passengers.iter().find(|p| p.id == vis.passenger_id) else {
            continue;
        };

        let (x, y, handle) = match passenger.state {
            PassengerState::Waiting => {
                let stop_y = sim.sim.stops.iter()
                    .find(|s| s.id == passenger.origin)
                    .map(|s| s.position as f32 * PPU)
                    .unwrap_or(0.0);
                let offset = vs.waiting_x_offset - (passenger.id.0 % 5) as f32 * vs.rider_spacing;
                (offset, stop_y, passenger_mats.waiting.clone())
            }
            PassengerState::Boarding(eid) => {
                let elev_y = sim.sim.elevators.iter()
                    .find(|e| e.id == eid)
                    .map(|e| e.position as f32 * PPU)
                    .unwrap_or(0.0);
                (vs.waiting_x_offset * 0.5, elev_y, passenger_mats.boarding.clone())
            }
            PassengerState::Riding(eid) => {
                let elev_y = sim.sim.elevators.iter()
                    .find(|e| e.id == eid)
                    .map(|e| e.position as f32 * PPU)
                    .unwrap_or(0.0);
                let idx = sim.sim.elevators.iter()
                    .find(|e| e.id == eid)
                    .and_then(|e| e.passengers.iter().position(|p| *p == passenger.id))
                    .unwrap_or(0);
                let x_offset = -vs.rider_spacing + (idx as f32 % 3.0) * vs.rider_spacing;
                (x_offset, elev_y, passenger_mats.riding.clone())
            }
            PassengerState::Alighting(eid) => {
                let elev_y = sim.sim.elevators.iter()
                    .find(|e| e.id == eid)
                    .map(|e| e.position as f32 * PPU)
                    .unwrap_or(0.0);
                (vs.waiting_x_offset * 0.5, elev_y, passenger_mats.alighting.clone())
            }
            PassengerState::Arrived => continue,
        };

        transform.translation.x = x;
        transform.translation.y = y;
        *mat_handle = MeshMaterial2d(handle);
    }
}
