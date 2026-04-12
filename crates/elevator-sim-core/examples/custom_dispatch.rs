//! Implementing a custom dispatch strategy.
#![allow(
    clippy::unwrap_used,
    clippy::missing_docs_in_private_items,
    clippy::missing_const_for_fn
)]

use elevator_sim_core::dispatch::{
    DispatchDecision, DispatchManifest, DispatchStrategy, ElevatorGroup,
};
use elevator_sim_core::entity::EntityId;
use elevator_sim_core::prelude::*;
use elevator_sim_core::world::World;

/// A simple round-robin dispatch strategy.
///
/// Cycles through stops with demand, assigning each idle elevator
/// to the next stop in sequence.
struct RoundRobinDispatch {
    next_index: usize,
}

impl RoundRobinDispatch {
    fn new() -> Self {
        Self { next_index: 0 }
    }
}

impl DispatchStrategy for RoundRobinDispatch {
    fn decide(
        &mut self,
        _elevator: EntityId,
        _elevator_position: f64,
        _group: &ElevatorGroup,
        manifest: &DispatchManifest,
        _world: &World,
    ) -> DispatchDecision {
        let stops_with_demand: Vec<_> = manifest.waiting_at_stop.keys().copied().collect();

        if stops_with_demand.is_empty() {
            return DispatchDecision::Idle;
        }

        let stop = stops_with_demand[self.next_index % stops_with_demand.len()];
        self.next_index += 1;
        DispatchDecision::GoToStop(stop)
    }
}

fn main() {
    let mut sim = SimulationBuilder::new()
        .dispatch(RoundRobinDispatch::new())
        .build()
        .unwrap();

    sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 70.0)
        .unwrap();

    for _ in 0..500 {
        sim.step();
    }

    println!("Delivered: {}", sim.metrics().total_delivered());
}
