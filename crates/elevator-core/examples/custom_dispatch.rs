//! Writing a custom `DispatchStrategy`.
//!
//! This example walks through all three trait methods:
//!
//! * [`DispatchStrategy::decide`] — per-elevator, required.
//! * [`DispatchStrategy::decide_all`] — per-group coordination, optional.
//! * [`DispatchStrategy::notify_removed`] — per-elevator state cleanup,
//!   optional but required if the strategy carries a `HashMap<EntityId, _>`.
//!
//! Run with:
//! ```sh
//! cargo run --example custom_dispatch
//! ```
//!
//! See [`docs/src/custom-dispatch.md`](../../../docs/src/custom-dispatch.md)
//! for the narrative tutorial.
#![allow(
    clippy::unwrap_used,
    clippy::missing_docs_in_private_items,
    clippy::missing_const_for_fn
)]

use std::collections::HashMap;

use elevator_core::dispatch::{
    BuiltinStrategy, DispatchDecision, DispatchManifest, DispatchStrategy, ElevatorGroup,
};
use elevator_core::entity::EntityId;
use elevator_core::ids::GroupId;
use elevator_core::prelude::*;
use elevator_core::stop::StopConfig;
use elevator_core::world::World;

/// Round-robin across stops with demand, coordinating across idle cars
/// so two elevators never get pointed at the same stop in one tick.
///
/// This strategy carries one piece of per-instance state (the next-stop
/// index) and one piece of per-elevator state (last-served tick, for
/// observability only), which makes it a good vehicle for demonstrating
/// `notify_removed`.
#[derive(Default)]
struct RoundRobin {
    /// Cycles through the group's demand list so every stop gets a
    /// chance eventually, regardless of waiting count.
    next_index: usize,

    /// Per-elevator last-served tick. Not used by `decide` here — it
    /// just demonstrates the `notify_removed` contract.
    last_served_tick: HashMap<EntityId, u64>,
}

impl DispatchStrategy for RoundRobin {
    fn decide(
        &mut self,
        _elevator: EntityId,
        _elevator_position: f64,
        _group: &ElevatorGroup,
        _manifest: &DispatchManifest,
        _world: &World,
    ) -> DispatchDecision {
        // Required by the trait. When `decide_all` is overridden, the
        // default trait impl routes through `decide_all` so this method
        // is unreachable on the dispatch hot path — returning `Idle`
        // here is a belt-and-suspenders default.
        DispatchDecision::Idle
    }

    /// Coordinate across all idle elevators so each stop with demand is
    /// served by at most one car per tick.
    fn decide_all(
        &mut self,
        elevators: &[(EntityId, f64)],
        group: &ElevatorGroup,
        manifest: &DispatchManifest,
        _world: &World,
    ) -> Vec<(EntityId, DispatchDecision)> {
        // Collect stops with demand, in the group's canonical order.
        let demand_stops: Vec<EntityId> = group
            .stop_entities()
            .iter()
            .copied()
            .filter(|&s| manifest.has_demand(s))
            .collect();

        // Pair each idle elevator with a unique stop from the rotation.
        // `next_index` advances once per *call*, not once per elevator —
        // so over time every stop gets picked first even under uneven
        // demand. Elevators beyond the demand list go idle.
        let mut results = Vec::with_capacity(elevators.len());
        for (i, &(eid, _)) in elevators.iter().enumerate() {
            let decision = if demand_stops.is_empty() {
                DispatchDecision::Idle
            } else {
                let stop = demand_stops[(self.next_index + i) % demand_stops.len()];
                DispatchDecision::GoToStop(stop)
            };
            results.push((eid, decision));
        }
        if !demand_stops.is_empty() {
            self.next_index = (self.next_index + 1) % demand_stops.len();
        }
        results
    }

    /// CRITICAL: the framework calls this when an elevator is removed
    /// from the group (either via `Simulation::remove_elevator` or by
    /// cross-group reassignment). Without the cleanup, the
    /// `last_served_tick` map would grow unbounded over long runs.
    fn notify_removed(&mut self, elevator: EntityId) {
        self.last_served_tick.remove(&elevator);
    }
}

fn main() {
    // Build a simulation with three stops and two elevators so the
    // `decide_all` coordination has something to chew on.
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
                name: "Roof".into(),
                position: 8.0,
            },
        ])
        .build()
        .unwrap();

    // Install the custom strategy *after* build via `set_dispatch`,
    // which takes both the boxed strategy and the `BuiltinStrategy`
    // id used for snapshot serialization. Use a stable name — changing
    // it breaks previously-saved snapshots.
    sim.set_dispatch(
        GroupId(0),
        Box::new(RoundRobin::default()),
        BuiltinStrategy::Custom("round_robin".into()),
    );

    // Give each stop a rider going to a different stop so the round-
    // robin has demand on every axis.
    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    sim.spawn_rider_by_stop_id(StopId(1), StopId(0), 72.0)
        .unwrap();
    sim.spawn_rider_by_stop_id(StopId(2), StopId(1), 80.0)
        .unwrap();

    // Run long enough for everyone to arrive under the round-robin —
    // it's deliberately inefficient (stops are served in cycle order
    // regardless of demand volume), so it takes more ticks than
    // `ScanDispatch` would.
    for _ in 0..5000 {
        sim.step();
    }

    let m = sim.metrics();
    println!("Delivered:     {}", m.total_delivered());
    println!("Avg wait:      {:.1} ticks", m.avg_wait_time());
    println!("Avg ride:      {:.1} ticks", m.avg_ride_time());
    println!("Total dist:    {:.1} units", m.total_distance());

    // Strategy identity persists for snapshots.
    match sim.strategy_id(GroupId(0)) {
        Some(BuiltinStrategy::Custom(name)) => {
            println!("Strategy name: {name} (will round-trip through snapshots)");
        }
        other => println!("Strategy name: {other:?}"),
    }
}
