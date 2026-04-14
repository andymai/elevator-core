//! Optional decorative layer: live occupancy chips + call-lamp indicators
//! beside each stop, and an arrival-flash outline on each car when its
//! doors finish opening.
//!
//! Enabled by the showcase example — the default plugin leaves these
//! systems unregistered so the binary stays minimal. Stop *names* are
//! already drawn by [`crate::rendering`], so this module adds only the
//! live data chrome.

use bevy::prelude::*;
use elevator_core::components::RiderPhase;
use elevator_core::entity::EntityId;
use elevator_core::events::Event;

use crate::rendering::{ElevatorVisual, VisualScale};
use crate::sim_bridge::{EventWrapper, SimulationRes};
use crate::style::VisualStyle;

/// Occupancy chip ("N") on the right of a stop, tied to `stop_id`.
#[derive(Component)]
pub struct OccupancyChip {
    /// The stop this chip reports on.
    pub stop_id: EntityId,
}

/// Small "someone is waiting" lamp beside a stop — visible iff
/// `waiting_at(stop) > 0`.
#[derive(Component)]
pub struct CallLamp {
    /// The stop this lamp is attached to.
    pub stop_id: EntityId,
}

/// Outline pulse child of an elevator car; alpha ramps down from 1.0 over
/// `ARRIVAL_FLASH_TICKS` when the car's doors finish opening.
#[derive(Component)]
pub struct ArrivalFlash {
    /// The elevator whose arrival this outline is tracking.
    pub elevator: EntityId,
    /// Ticks remaining in the current flash (0 = invisible).
    pub ticks_remaining: u32,
    /// Total duration the flash runs for, used to compute alpha.
    pub duration: u32,
}

/// Ticks the arrival-flash outline stays visible after `DoorOpened`.
const ARRIVAL_FLASH_TICKS: u32 = 36;

/// Spawn the decor layer. Runs in Startup; expects [`VisualScale`] and
/// [`VisualStyle`] already inserted by the rendering layer.
#[allow(clippy::needless_pass_by_value)]
pub fn spawn_decor(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<ColorMaterial>>,
    sim: Res<SimulationRes>,
    vs: Res<VisualScale>,
    style: Res<VisualStyle>,
    cars: Query<(Entity, &ElevatorVisual)>,
) {
    let w = sim.sim.world();

    let lamp_mat = materials.add(style.rider_up);
    let chip_color = muted_text(style.text);

    let chip_x = vs.bank_width().mul_add(0.5, vs.shaft_width) + 14.0;
    let lamp_x = vs.rider_radius.mul_add(1.8, chip_x);

    for (stop_eid, stop) in w.iter_stops() {
        let y = stop.position() as f32 * crate::rendering::PPU;

        commands.spawn((
            Text2d::new(String::new()),
            TextFont {
                font_size: vs.font_size * 0.85,
                ..default()
            },
            TextColor(chip_color),
            Transform::from_xyz(chip_x, y, 0.15),
            OccupancyChip { stop_id: stop_eid },
        ));

        commands.spawn((
            Mesh2d(meshes.add(Circle::new(vs.rider_radius * 0.5))),
            MeshMaterial2d(lamp_mat.clone()),
            Transform::from_xyz(lamp_x, y, 0.2),
            Visibility::Hidden,
            CallLamp { stop_id: stop_eid },
        ));
    }

    // Arrival-flash outline: a rectangle slightly larger than the car,
    // drawn behind the door panels (z = -0.05 relative to car).
    let outline = meshes.add(Rectangle::new(vs.car_width * 1.12, vs.car_height * 1.24));
    let flash_mat = materials.add(Color::srgba(0.0, 0.0, 0.0, 0.0));
    for (car_entity, vis) in &cars {
        commands.entity(car_entity).with_children(|parent| {
            parent.spawn((
                Mesh2d(outline.clone()),
                MeshMaterial2d(flash_mat.clone()),
                Transform::from_xyz(0.0, 0.0, -0.05),
                ArrivalFlash {
                    elevator: vis.entity_id,
                    ticks_remaining: 0,
                    duration: ARRIVAL_FLASH_TICKS,
                },
            ));
        });
    }
}

/// Toggle call lamp visibility based on waiting count at each stop.
#[allow(clippy::needless_pass_by_value)]
pub fn sync_call_lamps(sim: Res<SimulationRes>, mut lamps: Query<(&CallLamp, &mut Visibility)>) {
    let w = sim.sim.world();
    for (lamp, mut vis) in &mut lamps {
        let any_waiting = w.iter_riders().any(|(_, r)| {
            r.phase() == RiderPhase::Waiting && r.current_stop() == Some(lamp.stop_id)
        });
        *vis = if any_waiting {
            Visibility::Visible
        } else {
            Visibility::Hidden
        };
    }
}

/// Update occupancy chip text from the live waiting-rider count.
#[allow(clippy::needless_pass_by_value)]
pub fn sync_occupancy_chips(
    sim: Res<SimulationRes>,
    mut chips: Query<(&OccupancyChip, &mut Text2d)>,
) {
    let w = sim.sim.world();
    for (chip, mut text) in &mut chips {
        let count = w
            .iter_riders()
            .filter(|(_, r)| {
                r.phase() == RiderPhase::Waiting && r.current_stop() == Some(chip.stop_id)
            })
            .count();
        let new_text = if count == 0 {
            String::new()
        } else {
            count.to_string()
        };
        if text.0 != new_text {
            text.0 = new_text;
        }
    }
}

/// Trigger flash on `DoorOpened` events and ramp alpha down each tick.
#[allow(clippy::needless_pass_by_value)]
pub fn tick_arrival_flash(
    mut events: MessageReader<EventWrapper>,
    mut flashes: Query<(&mut ArrivalFlash, &MeshMaterial2d<ColorMaterial>)>,
    mut materials: ResMut<Assets<ColorMaterial>>,
    style: Res<VisualStyle>,
) {
    let highlight = style.rider_up;

    for ev in events.read() {
        if let Event::DoorOpened { elevator, .. } = ev.0 {
            for (mut flash, _) in &mut flashes {
                if flash.elevator == elevator {
                    flash.ticks_remaining = flash.duration;
                }
            }
        }
    }

    for (mut flash, mat_handle) in &mut flashes {
        if flash.ticks_remaining == 0 {
            if let Some(mat) = materials.get_mut(&mat_handle.0) {
                mat.color = Color::srgba(0.0, 0.0, 0.0, 0.0);
            }
            continue;
        }
        let alpha = f32::from(u16::try_from(flash.ticks_remaining).unwrap_or(u16::MAX))
            / f32::from(u16::try_from(flash.duration).unwrap_or(1));
        flash.ticks_remaining = flash.ticks_remaining.saturating_sub(1);
        if let Some(mat) = materials.get_mut(&mat_handle.0) {
            let l = highlight.to_linear();
            mat.color = Color::linear_rgba(l.red, l.green, l.blue, alpha * 0.7);
        }
    }
}

/// Mute a color by 40% toward background-agnostic midpoint (shared with ui.rs).
fn muted_text(c: Color) -> Color {
    let l = c.to_linear();
    Color::linear_rgba(
        l.red.mul_add(0.55, 0.22),
        l.green.mul_add(0.55, 0.22),
        l.blue.mul_add(0.55, 0.22),
        l.alpha,
    )
}
