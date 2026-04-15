//! Writing a custom `DispatchStrategy`.
//!
//! This example walks through the score-based trait:
//!
//! * [`DispatchStrategy::rank`] — cost of sending a car to a stop; required.
//! * [`DispatchStrategy::fallback`] — policy for unassigned cars; optional.
//! * [`DispatchStrategy::prepare_car`] — per-car state setup; optional.
//! * [`DispatchStrategy::pre_dispatch`] — per-group world-mutation hook;
//!   optional, used by sticky strategies like destination dispatch.
//! * [`DispatchStrategy::notify_removed`] — per-elevator state cleanup,
//!   required if the strategy carries a `HashMap<EntityId, _>`.
//!
//! Run with:
//! ```sh
//! cargo run --example custom_dispatch
//! ```
#![allow(
    clippy::unwrap_used,
    clippy::missing_docs_in_private_items,
    clippy::missing_const_for_fn
)]

use std::collections::HashMap;

use elevator_core::dispatch::{BuiltinStrategy, DispatchManifest, DispatchStrategy, ElevatorGroup};
use elevator_core::entity::EntityId;
use elevator_core::ids::GroupId;
use elevator_core::prelude::*;
use elevator_core::stop::StopConfig;
use elevator_core::world::World;

/// Weighted nearest-car: distance plus a penalty proportional to how
/// many ticks this car has been idle since it last served a call.
///
/// The library's [Hungarian assignment](elevator_core::dispatch) combines
/// every car's ranks and picks the globally minimum-total-cost matching,
/// so two cars are never sent to the same hall call.
#[derive(Default)]
struct IdlePenaltyDispatch {
    /// Tick of the last call each car was assigned to. Used to penalize
    /// cars that have sat unused for a while so the fleet rotates fairly.
    last_served_tick: HashMap<EntityId, u64>,
    /// Current tick, refreshed once per group pass via `pre_dispatch`.
    tick: u64,
}

impl DispatchStrategy for IdlePenaltyDispatch {
    /// Refresh the tick counter once per group pass. A no-op here would
    /// be fine too — we only use tick for the idle-penalty scoring.
    fn pre_dispatch(
        &mut self,
        _group: &ElevatorGroup,
        _manifest: &DispatchManifest,
        _world: &mut World,
    ) {
        self.tick = self.tick.saturating_add(1);
    }

    /// Cost is distance minus a small bonus for cars that haven't been
    /// used recently. Returning `None` would exclude a `(car, stop)`
    /// pair entirely — useful for capacity limits or restricted stops.
    fn rank(
        &mut self,
        car: EntityId,
        car_position: f64,
        _stop: EntityId,
        stop_position: f64,
        _group: &ElevatorGroup,
        _manifest: &DispatchManifest,
        _world: &World,
    ) -> Option<f64> {
        let distance = (car_position - stop_position).abs();
        let last_served = self.last_served_tick.get(&car).copied().unwrap_or(0);
        let idle_for = self.tick.saturating_sub(last_served) as f64;
        // Bias toward long-idle cars; clamp so cost stays non-negative.
        let cost = 0.01f64.mul_add(-idle_for, distance).max(0.0);
        // Record the intended service tick so the penalty decays after use.
        self.last_served_tick.insert(car, self.tick);
        Some(cost)
    }

    /// The framework calls this when an elevator leaves the group — via
    /// `Simulation::remove_elevator` or cross-group reassignment. Drop
    /// per-elevator state here to prevent unbounded growth.
    fn notify_removed(&mut self, elevator: EntityId) {
        self.last_served_tick.remove(&elevator);
    }
}

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
                name: "Roof".into(),
                position: 8.0,
            },
        ])
        .build()
        .unwrap();

    // Install the custom strategy after build. `BuiltinStrategy::Custom`
    // gives it a stable name for snapshot serialization — changing the
    // name breaks previously-saved snapshots.
    sim.set_dispatch(
        GroupId(0),
        Box::new(IdlePenaltyDispatch::default()),
        BuiltinStrategy::Custom("idle_penalty".into()),
    );

    sim.spawn_rider_by_stop_id(StopId(0), StopId(2), 70.0)
        .unwrap();
    sim.spawn_rider_by_stop_id(StopId(1), StopId(0), 72.0)
        .unwrap();
    sim.spawn_rider_by_stop_id(StopId(2), StopId(1), 80.0)
        .unwrap();

    for _ in 0..5000 {
        sim.step();
    }

    let m = sim.metrics();
    println!("Delivered:     {}", m.total_delivered());
    println!("Avg wait:      {:.1} ticks", m.avg_wait_time());
    println!("Avg ride:      {:.1} ticks", m.avg_ride_time());
    println!("Total dist:    {:.1} units", m.total_distance());

    match sim.strategy_id(GroupId(0)) {
        Some(BuiltinStrategy::Custom(name)) => {
            println!("Strategy name: {name} (will round-trip through snapshots)");
        }
        other => println!("Strategy name: {other:?}"),
    }
}
