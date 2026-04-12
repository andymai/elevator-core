//! Entity components — the data attached to simulation entities.

/// Elevator car state and properties.
pub mod elevator_car;
/// Rider patience and boarding preferences.
pub mod patience;
/// Position and velocity along the shaft axis.
pub mod position;
/// Rider (passenger/cargo) core data.
pub mod rider_data;
/// Multi-leg route planning.
pub mod route;
/// Stop (floor/station) data.
pub mod stop_data;
/// Group/zone membership.
pub mod zone_data;

#[allow(clippy::wildcard_imports)]
pub use elevator_car::*;
#[allow(clippy::wildcard_imports)]
pub use patience::*;
#[allow(clippy::wildcard_imports)]
pub use position::*;
#[allow(clippy::wildcard_imports)]
pub use rider_data::*;
#[allow(clippy::wildcard_imports)]
pub use route::*;
#[allow(clippy::wildcard_imports)]
pub use stop_data::*;
#[allow(clippy::wildcard_imports)]
pub use zone_data::*;
