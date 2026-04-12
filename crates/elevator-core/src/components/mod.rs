//! Entity components — the data attached to simulation entities.

/// Elevator state and properties.
pub mod elevator;
/// Rider patience and boarding preferences.
pub mod patience;
/// Position and velocity along the shaft axis.
pub mod position;
/// Rider (passenger/cargo) core data.
pub mod rider;
/// Multi-leg route planning.
pub mod route;
/// Stop (floor/station) data.
pub mod stop;
/// Group/zone membership.
pub mod zone;

pub use elevator::{Elevator, ElevatorPhase};
pub use patience::{Patience, Preferences};
pub use position::{Position, Velocity};
pub use rider::{Rider, RiderPhase};
pub use route::{Route, RouteLeg, TransportMode};
pub use stop::Stop;
pub use zone::Zone;
