//! Subscribe to the event stream and react to riders boarding and arriving.
//!
//! Every call to [`Simulation::step`] produces zero or more
//! [`Event`](elevator_core::events::Event) records describing what happened
//! during that tick. Drain them with [`Simulation::drain_events`] after each
//! step (or batch a few first — events are buffered until drained).
//!
//! This example sets up a small three-stop building, spawns three riders, and
//! pattern-matches over the event stream to print a short narrative. Run with:
//!
//! ```text
//! cargo run --example events_loop -p elevator-core
//! ```
#![allow(clippy::unwrap_used, clippy::missing_docs_in_private_items)]

use elevator_core::events::Event;
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
                name: "Rooftop".into(),
                position: 8.0,
            },
        ])
        .build()
        .unwrap();

    sim.spawn_rider(StopId(0), StopId(2), 75.0).unwrap();
    sim.spawn_rider(StopId(0), StopId(1), 70.0).unwrap();
    sim.spawn_rider(StopId(1), StopId(2), 65.0).unwrap();

    let mut delivered = 0u32;

    for _ in 0..2000 {
        sim.step();

        for event in sim.drain_events() {
            match event {
                Event::RiderBoarded {
                    rider,
                    elevator,
                    tick,
                    ..
                } => {
                    println!("[t={tick:>4}] rider {rider:?} boarded car {elevator:?}");
                }
                Event::RiderExited {
                    rider, stop, tick, ..
                } => {
                    println!("[t={tick:>4}] rider {rider:?} exited at stop {stop:?}");
                    delivered += 1;
                }
                Event::DoorOpened { elevator, tick, .. } => {
                    println!("[t={tick:>4}] doors opened on car {elevator:?}");
                }
                _ => {}
            }
        }

        if delivered >= 3 {
            break;
        }
    }

    let m = sim.metrics();
    println!(
        "delivered={} avg_wait={:.1} avg_ride={:.1}",
        m.total_delivered(),
        m.avg_wait_time(),
        m.avg_ride_time(),
    );
}
