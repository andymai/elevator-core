use crate::passenger::{Passenger, PassengerState};

/// Advance transient passenger states.
///
/// Boarding → Riding, Alighting → Arrived after one tick so they're
/// visible for exactly one frame in the visualization.
pub fn run(passengers: &mut [Passenger]) {
    for p in passengers {
        match p.state {
            PassengerState::Boarding(eid) => p.state = PassengerState::Riding(eid),
            PassengerState::Alighting(_) => p.state = PassengerState::Arrived,
            _ => {}
        }
    }
}
