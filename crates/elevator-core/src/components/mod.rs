//! Entity components — the data attached to simulation entities.

/// Access control for restricting rider stop access.
pub mod access;
/// Floor buttons pressed from inside a cab.
pub mod car_call;
/// Per-elevator ordered destination queue.
pub mod destination_queue;
/// Elevator state and properties.
pub mod elevator;
/// Hall calls: the up/down buttons at each stop.
pub mod hall_call;
/// Line (physical path) — shaft, tether, track.
pub mod line;
/// Rider patience and boarding preferences.
pub mod patience;
/// Position and velocity along the shaft axis.
pub mod position;
/// Rider (passenger/cargo) core data.
pub mod rider;
/// Multi-leg route planning.
pub mod route;
/// Service mode component for elevator operational modes.
pub mod service_mode;
/// Stop (floor/station) data.
pub mod stop;

pub use access::AccessControl;
pub use car_call::CarCall;
pub use destination_queue::DestinationQueue;
pub use elevator::{DOOR_COMMAND_QUEUE_CAP, Direction, Elevator, ElevatorPhase};
pub use hall_call::{CallDirection, HallCall};
pub use line::{FloorPosition, Line, Orientation};
pub use patience::{Patience, Preferences};
pub use position::{Position, Velocity};
pub use rider::{Rider, RiderPhase};
pub use route::{Route, RouteLeg, TransportMode};
pub use service_mode::ServiceMode;
pub use stop::Stop;
