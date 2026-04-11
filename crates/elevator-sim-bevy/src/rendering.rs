use bevy::prelude::*;
use elevator_sim_core::elevator::ElevatorId;
use elevator_sim_core::passenger::{PassengerId, PassengerState};
use elevator_sim_core::stop::StopId;

use crate::sim_bridge::SimulationRes;

/// Pixels per simulation distance unit.
const PPU: f32 = 40.0;
/// Shaft visual width in pixels.
const SHAFT_WIDTH: f32 = 60.0;
/// Elevator car visual dimensions.
const CAR_WIDTH: f32 = 50.0;
const CAR_HEIGHT: f32 = 30.0;
/// Passenger circle radius.
const PASSENGER_RADIUS: f32 = 6.0;
/// Horizontal offset for waiting passengers (left of shaft).
const WAITING_X_OFFSET: f32 = -60.0;

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
    let shaft_height = ((max_pos - min_pos) as f32 * PPU) + 80.0;
    let shaft_center_y = ((min_pos + max_pos) / 2.0) as f32 * PPU;

    // Shaft background.
    commands.spawn((
        Mesh2d(meshes.add(Rectangle::new(SHAFT_WIDTH, shaft_height))),
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
            Mesh2d(meshes.add(Rectangle::new(SHAFT_WIDTH + 20.0, 2.0))),
            MeshMaterial2d(stop_line_material.clone()),
            Transform::from_xyz(0.0, y, 0.1),
            StopVisual { stop_id: stop.id },
        ));

        // Stop name label.
        commands.spawn((
            Text2d::new(&stop.name),
            TextFont {
                font_size: 14.0,
                ..default()
            },
            Transform::from_xyz(SHAFT_WIDTH / 2.0 + 50.0, y, 0.1),
            StopLabel { stop_id: stop.id },
        ));
    }

    // Elevator car(s).
    let car_material = materials.add(Color::srgba(0.2, 0.5, 0.9, 1.0));
    for elevator in &sim.sim.elevators {
        let y = elevator.position as f32 * PPU;
        commands.spawn((
            Mesh2d(meshes.add(Rectangle::new(CAR_WIDTH, CAR_HEIGHT))),
            MeshMaterial2d(car_material.clone()),
            Transform::from_xyz(0.0, y, 0.5),
            ElevatorVisual {
                elevator_id: elevator.id,
            },
        ));
    }
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
    mut materials: ResMut<Assets<ColorMaterial>>,
    sim: Res<SimulationRes>,
    existing: Query<(Entity, &PassengerVisual)>,
) {
    let waiting_material = materials.add(Color::srgba(0.2, 0.8, 0.3, 1.0));
    let riding_material = materials.add(Color::srgba(0.9, 0.8, 0.2, 1.0));

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

        let (x, y, mat) = match passenger.state {
            PassengerState::Waiting => {
                let stop_y = sim
                    .sim
                    .stops
                    .iter()
                    .find(|s| s.id == passenger.origin)
                    .map(|s| s.position as f32 * PPU)
                    .unwrap_or(0.0);
                // Offset waiting passengers to the left, staggered by ID.
                let offset = WAITING_X_OFFSET - (passenger.id.0 % 5) as f32 * 14.0;
                (offset, stop_y, waiting_material.clone())
            }
            PassengerState::Riding(eid) | PassengerState::Boarding(eid) => {
                let elev_y = sim
                    .sim
                    .elevators
                    .iter()
                    .find(|e| e.id == eid)
                    .map(|e| e.position as f32 * PPU)
                    .unwrap_or(0.0);
                // Stack riders inside the car.
                let idx = sim
                    .sim
                    .elevators
                    .iter()
                    .find(|e| e.id == eid)
                    .and_then(|e| e.passengers.iter().position(|p| *p == passenger.id))
                    .unwrap_or(0);
                let x_offset = -15.0 + (idx as f32 % 3.0) * 14.0;
                (x_offset, elev_y, riding_material.clone())
            }
            _ => continue,
        };

        if existing_ids.contains(&passenger.id) {
            // Update existing visual position — need a separate query for transform.
            // We'll handle this below.
            continue;
        }

        // Spawn new visual.
        commands.spawn((
            Mesh2d(meshes.add(Circle::new(PASSENGER_RADIUS))),
            MeshMaterial2d(mat),
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
    mut materials: ResMut<Assets<ColorMaterial>>,
) {
    let waiting_color = Color::srgba(0.2, 0.8, 0.3, 1.0);
    let riding_color = Color::srgba(0.9, 0.8, 0.2, 1.0);

    for (vis, mut transform, mut mat_handle) in &mut query {
        let Some(passenger) = sim.sim.passengers.iter().find(|p| p.id == vis.passenger_id) else {
            continue;
        };

        match passenger.state {
            PassengerState::Waiting => {
                let stop_y = sim
                    .sim
                    .stops
                    .iter()
                    .find(|s| s.id == passenger.origin)
                    .map(|s| s.position as f32 * PPU)
                    .unwrap_or(0.0);
                let offset = WAITING_X_OFFSET - (passenger.id.0 % 5) as f32 * 14.0;
                transform.translation.x = offset;
                transform.translation.y = stop_y;
                *mat_handle = MeshMaterial2d(materials.add(waiting_color));
            }
            PassengerState::Riding(eid) | PassengerState::Boarding(eid) => {
                let elev_y = sim
                    .sim
                    .elevators
                    .iter()
                    .find(|e| e.id == eid)
                    .map(|e| e.position as f32 * PPU)
                    .unwrap_or(0.0);
                let idx = sim
                    .sim
                    .elevators
                    .iter()
                    .find(|e| e.id == eid)
                    .and_then(|e| e.passengers.iter().position(|p| *p == passenger.id))
                    .unwrap_or(0);
                let x_offset = -15.0 + (idx as f32 % 3.0) * 14.0;
                transform.translation.x = x_offset;
                transform.translation.y = elev_y;
                *mat_handle = MeshMaterial2d(materials.add(riding_color));
            }
            _ => {}
        }
    }
}
