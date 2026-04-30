//! "Player-as-elevator" demo — direct velocity control via
//! [`ServiceMode::Manual`](elevator_core::components::ServiceMode::Manual).
//!
//! The sim is placed into Manual mode; the "driver" commands ascent,
//! cruises, then triggers an emergency stop. Each tick we print the
//! current position and velocity so you can see the trapezoidal
//! acceleration/deceleration clamped to the elevator's kinematic caps.
//!
//! Run with:
//!
//! ```text
//! cargo run -p elevator-core --example manual_driver --release
//! ```
#![allow(clippy::unwrap_used, clippy::missing_docs_in_private_items)]

use elevator_core::components::ServiceMode;
use elevator_core::prelude::*;

fn main() {
    let mut sim = SimulationBuilder::demo().build().unwrap();
    let elev = ElevatorId::from(sim.world().iter_elevators().next().unwrap().0);

    sim.set_service_mode(elev.entity(), ServiceMode::Manual)
        .unwrap();

    // Phase 1: command full ascent.
    sim.set_target_velocity(elev, 2.0).unwrap();

    println!("tick  phase        pos     vel");
    println!("----  -----------  ------  -----");

    for t in 0..180 {
        // Halfway through, slam the emergency brake.
        if t == 90 {
            sim.emergency_stop(elev).unwrap();
        }
        sim.step();

        let pos = sim.world().position(elev.entity()).unwrap().value();
        let vel = sim.velocity(elev.entity()).unwrap();
        let phase = if t < 90 { "ascending " } else { "e-stopping" };
        println!("{t:>4}  {phase}  {pos:>5.2}m  {vel:>5.2}");

        if t > 90 && vel.abs() < 1e-6 {
            println!("\nCar stopped at {pos:.2}m after {t} ticks.");
            break;
        }
    }
}
