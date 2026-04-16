//! Writing a custom `DispatchStrategy`, and composing it with the
//! hall-call layer (scripted presses and pinned assignments).
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
//! …plus how the strategy interacts with the hall-call API:
//! `Simulation::press_hall_button` registers scripted presses, and
//! `Simulation::pin_assignment` forces a specific car to service a call
//! regardless of the strategy's ranking. Pinned calls bypass the
//! Hungarian solver entirely — a critical escape hatch for games that
//! need deterministic overrides (building scripts, cutscenes,
//! DCS lobby kiosks).
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

use elevator_core::components::CallDirection;
use elevator_core::dispatch::{
    BuiltinStrategy, DispatchManifest, DispatchStrategy, ElevatorGroup, RankContext,
};
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
    /// Idle ticks resolved once per car in `prepare_car` and read by `rank`.
    /// Keeping mutation out of `rank` keeps the cost matrix order-independent.
    idle_for: HashMap<EntityId, f64>,
    /// Current tick, refreshed once per group pass via `pre_dispatch`.
    tick: u64,
}

impl DispatchStrategy for IdlePenaltyDispatch {
    /// Refresh the tick counter once per group pass.
    fn pre_dispatch(
        &mut self,
        _group: &ElevatorGroup,
        _manifest: &DispatchManifest,
        _world: &mut World,
    ) {
        self.tick = self.tick.saturating_add(1);
    }

    /// Record how long this car has been idle, once, before the `rank`
    /// loop. The `last_served` bookkeeping updates here too, so `rank`
    /// is a pure read.
    fn prepare_car(
        &mut self,
        car: EntityId,
        _car_position: f64,
        _group: &ElevatorGroup,
        _manifest: &DispatchManifest,
        _world: &World,
    ) {
        let last = self.last_served_tick.get(&car).copied().unwrap_or(0);
        let idle = self.tick.saturating_sub(last) as f64;
        self.idle_for.insert(car, idle);
        self.last_served_tick.insert(car, self.tick);
    }

    /// Cost is distance minus a small bonus for cars that haven't been
    /// used recently. Returning `None` would exclude a `(car, stop)`
    /// pair entirely — useful for capacity limits or restricted stops.
    fn rank(&mut self, ctx: &RankContext<'_>) -> Option<f64> {
        let distance = (ctx.car_position - ctx.stop_position).abs();
        let idle_for = self.idle_for.get(&ctx.car).copied().unwrap_or(0.0);
        // Bias toward long-idle cars; clamp so cost stays non-negative.
        Some(0.01f64.mul_add(-idle_for, distance).max(0.0))
    }

    /// The framework calls this when an elevator leaves the group — via
    /// `Simulation::remove_elevator` or cross-group reassignment. Drop
    /// per-elevator state here to prevent unbounded growth.
    fn notify_removed(&mut self, elevator: EntityId) {
        self.last_served_tick.remove(&elevator);
        self.idle_for.remove(&elevator);
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

    sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.spawn_rider(StopId(1), StopId(0), 72.0).unwrap();
    sim.spawn_rider(StopId(2), StopId(1), 80.0).unwrap();

    // Hall-call layer demo: script a phantom hall-call press with no
    // spawned rider behind it — the kind of event a building-sim
    // might emit when an off-screen NPC presses a button. Choose a
    // (stop, direction) pair none of the three riders above touches
    // (Mezzanine UP; riders 1–3 press Lobby-UP, Mezzanine-DOWN,
    // Roof-DOWN respectively). Then pin the lobby car to it.
    //
    // The pin bypasses the Hungarian solver entirely — the custom
    // strategy's ranks do not decide this one, the scripted policy
    // does. That's the escape hatch games use to compose custom
    // dispatch with building scripts, cutscenes, or DCS overrides.
    let mezzanine = sim.stop_entity(StopId(1)).unwrap();
    let lobby_car = ElevatorId::from(sim.world().elevator_ids()[0]);
    sim.press_hall_button(mezzanine, CallDirection::Up).unwrap();
    sim.pin_assignment(lobby_car, mezzanine, CallDirection::Up)
        .unwrap();
    println!(
        "Pinned car {:?} to mezzanine up-call. Active hall calls now: {}",
        lobby_car,
        sim.hall_calls().count(),
    );

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
