//! Using extension components for game-specific data.
#![allow(clippy::unwrap_used, clippy::missing_docs_in_private_items)]

use elevator_core::prelude::*;
use elevator_core::query::Ext;
use serde::{Deserialize, Serialize};

/// A custom VIP tag attached to riders.
#[derive(Debug, Clone, Serialize, Deserialize)]
struct VipTag {
    level: u32,
}

fn main() {
    let mut sim = SimulationBuilder::demo()
        .with_ext::<VipTag>()
        .build()
        .unwrap();

    // Spawn a rider and tag them as VIP.
    let rider = sim.spawn_rider(StopId(0), StopId(1), 70.0).unwrap();
    sim.world_mut().insert_ext(
        rider.entity(),
        VipTag { level: 5 },
        ExtKey::from_type_name(),
    );

    // Query extension components.
    for (id, vip) in sim.world().query::<(EntityId, &Ext<VipTag>)>().iter() {
        println!("Rider {id:?} is VIP level {}", vip.level);
    }

    // Mutate extension components.
    sim.world_mut()
        .query_ext_mut::<VipTag>()
        .for_each_mut(|id, tag| {
            tag.level += 1;
            println!("Upgraded rider {id:?} to VIP level {}", tag.level);
        });
}
