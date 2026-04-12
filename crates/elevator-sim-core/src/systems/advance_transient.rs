use crate::components::RiderState;
use crate::events::EventBus;
use crate::world::World;

use super::PhaseContext;

/// Advance transient rider states.
///
/// Boarding → Riding, Alighting → Arrived after one tick so they're
/// visible for exactly one frame in the visualization.
pub fn run(world: &mut World, _events: &mut EventBus, _ctx: &PhaseContext) {
    for (_id, rider) in &mut world.rider_data {
        match rider.state {
            RiderState::Boarding(eid) => rider.state = RiderState::Riding(eid),
            RiderState::Alighting(_) => rider.state = RiderState::Arrived,
            _ => {}
        }
    }
}
