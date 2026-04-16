//! Manual door control — hold the doors for a boarding friend, then
//! force them closed when ready.
//!
//! Demonstrates the
//! [`Simulation::open_door`](elevator_core::sim::Simulation::open_door),
//! [`Simulation::hold_door`](elevator_core::sim::Simulation::hold_door),
//! and [`Simulation::close_door`](elevator_core::sim::Simulation::close_door)
//! setters. A first rider boards at the lobby; the "player" holds the
//! doors for a friend who spawns a moment later; once both are aboard
//! the player forces the doors closed early.
//!
//! Run with:
//!
//! ```text
//! cargo run -p elevator-core --example door_commands --release
//! ```
#![allow(clippy::unwrap_used, clippy::missing_docs_in_private_items)]

use elevator_core::door::DoorCommand;
use elevator_core::prelude::*;
use elevator_core::stop::StopConfig;

fn main() {
    let mut sim = SimulationBuilder::demo()
        .stops(vec![
            StopConfig {
                id: StopId(0),
                name: "Lobby".into(),
                position: 0.0,
            },
            StopConfig {
                id: StopId(1),
                name: "Mezzanine".into(),
                position: 4.0,
            },
            StopConfig {
                id: StopId(2),
                name: "Penthouse".into(),
                position: 12.0,
            },
        ])
        .build()
        .unwrap();

    let elev = sim.world().iter_elevators().next().unwrap().0;

    // First rider heading up from the lobby.
    let first = sim.spawn_rider(StopId(0), StopId(2), 75.0).unwrap();

    let mut held = false;
    let mut friend: Option<EntityId> = None;
    let mut forced_close = false;

    for tick in 0..400 {
        sim.step();

        // The moment the first rider is aboard, hold the doors for a friend.
        if !held
            && matches!(
                sim.world().rider(first).unwrap().phase(),
                RiderPhase::Boarding(_) | RiderPhase::Riding(_)
            )
        {
            println!("[t={tick:>3}] First rider aboard — holding doors for a friend (+60 ticks)");
            sim.hold_door(elev, 60).unwrap();
            held = true;
            // Spawn the friend at the lobby.
            let f = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
            println!("[t={tick:>3}] Friend spawned at lobby");
            friend = Some(f);
        }

        // Once friend is aboard too, force the doors shut.
        if !forced_close
            && let Some(f) = friend
            && matches!(sim.world().rider(f).unwrap().phase(), RiderPhase::Riding(_))
        {
            println!("[t={tick:>3}] Both aboard — forcing doors closed");
            sim.close_door(elev).unwrap();
            forced_close = true;
        }

        if forced_close
            && matches!(
                sim.world().elevator(elev).unwrap().phase(),
                ElevatorPhase::MovingToStop(_)
            )
        {
            println!("[t={tick:>3}] Car departing for Penthouse");
            break;
        }
    }

    println!();
    println!("==== event log (door-related) ====");
    for ev in sim.drain_events() {
        match ev {
            Event::DoorCommandQueued { command, tick, .. } => {
                println!("  t={tick:>3} queued   {}", fmt_cmd(command));
            }
            Event::DoorCommandApplied { command, tick, .. } => {
                println!("  t={tick:>3} applied  {}", fmt_cmd(command));
            }
            Event::DoorOpened { tick, .. } => println!("  t={tick:>3} doors fully OPEN"),
            Event::DoorClosed { tick, .. } => println!("  t={tick:>3} doors fully CLOSED"),
            _ => {}
        }
    }
}

fn fmt_cmd(c: DoorCommand) -> String {
    match c {
        DoorCommand::Open => "Open".into(),
        DoorCommand::Close => "Close".into(),
        DoorCommand::HoldOpen { ticks } => format!("HoldOpen({ticks})"),
        DoorCommand::CancelHold => "CancelHold".into(),
        _ => format!("{c:?}"),
    }
}
