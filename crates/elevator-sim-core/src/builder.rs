//! Fluent builder for constructing a [`Simulation`] programmatically.

use serde::{Serialize, de::DeserializeOwned};

use crate::config::{
    BuildingConfig, ElevatorConfig, PassengerSpawnConfig, SimConfig, SimulationParams,
};
use crate::dispatch::DispatchStrategy;
use crate::dispatch::scan::ScanDispatch;
use crate::error::SimError;
use crate::hooks::{Phase, PhaseHooks};
use crate::ids::GroupId;
use crate::sim::Simulation;
use crate::stop::{StopConfig, StopId};
use crate::world::World;
use std::collections::BTreeMap;

/// A deferred extension registration closure.
type ExtRegistration = Box<dyn FnOnce(&mut World) + Send>;

/// Fluent builder for constructing a [`Simulation`].
///
/// Builds a [`SimConfig`] internally and delegates to [`Simulation::new()`].
/// Provides a more ergonomic API for programmatic construction compared to
/// assembling a config struct manually.
///
/// # Default configuration
///
/// `SimulationBuilder::new()` starts with a minimal valid config:
/// - 2 stops at positions 0.0 and 10.0
/// - 1 elevator with reasonable defaults
/// - `ScanDispatch` strategy
/// - 60 ticks per second
pub struct SimulationBuilder {
    /// Simulation configuration (stops, elevators, timing).
    config: SimConfig,
    /// Per-group dispatch strategies.
    dispatchers: BTreeMap<GroupId, Box<dyn DispatchStrategy>>,
    /// Lifecycle hooks for before/after each tick phase.
    hooks: PhaseHooks,
    /// Deferred extension registrations (applied after build).
    ext_registrations: Vec<ExtRegistration>,
}

impl Default for SimulationBuilder {
    fn default() -> Self {
        Self::new()
    }
}

impl SimulationBuilder {
    /// Create a builder with a minimal valid default configuration.
    #[must_use]
    pub fn new() -> Self {
        let config = SimConfig {
            building: BuildingConfig {
                name: "Default".into(),
                stops: vec![
                    StopConfig {
                        id: StopId(0),
                        name: "Ground".into(),
                        position: 0.0,
                    },
                    StopConfig {
                        id: StopId(1),
                        name: "Top".into(),
                        position: 10.0,
                    },
                ],
            },
            elevators: vec![ElevatorConfig {
                id: 0,
                name: "Elevator 1".into(),
                max_speed: 2.0,
                acceleration: 1.5,
                deceleration: 2.0,
                weight_capacity: 800.0,
                starting_stop: StopId(0),
                door_open_ticks: 10,
                door_transition_ticks: 5,
            }],
            simulation: SimulationParams {
                ticks_per_second: 60.0,
            },
            passenger_spawning: PassengerSpawnConfig {
                mean_interval_ticks: 120,
                weight_range: (50.0, 100.0),
            },
        };

        let mut dispatchers = BTreeMap::new();
        dispatchers.insert(
            GroupId(0),
            Box::new(ScanDispatch::new()) as Box<dyn DispatchStrategy>,
        );

        Self {
            config,
            dispatchers,
            hooks: PhaseHooks::default(),
            ext_registrations: Vec::new(),
        }
    }

    /// Create a builder from an existing [`SimConfig`].
    ///
    /// Uses `ScanDispatch` as the default strategy. Call [`.dispatch()`](Self::dispatch)
    /// to override.
    #[must_use]
    pub fn from_config(config: SimConfig) -> Self {
        let mut dispatchers = BTreeMap::new();
        dispatchers.insert(
            GroupId(0),
            Box::new(ScanDispatch::new()) as Box<dyn DispatchStrategy>,
        );

        Self {
            config,
            dispatchers,
            hooks: PhaseHooks::default(),
            ext_registrations: Vec::new(),
        }
    }

    /// Replace all stops with the given list.
    ///
    /// Clears any previously added stops.
    #[must_use]
    pub fn stops(mut self, stops: Vec<StopConfig>) -> Self {
        self.config.building.stops = stops;
        self
    }

    /// Add a single stop to the building.
    #[must_use]
    pub fn stop(mut self, id: StopId, name: impl Into<String>, position: f64) -> Self {
        self.config.building.stops.push(StopConfig {
            id,
            name: name.into(),
            position,
        });
        self
    }

    /// Replace all elevators with the given list.
    ///
    /// Clears any previously added elevators.
    #[must_use]
    pub fn elevators(mut self, elevators: Vec<ElevatorConfig>) -> Self {
        self.config.elevators = elevators;
        self
    }

    /// Add a single elevator configuration.
    #[must_use]
    pub fn elevator(mut self, config: ElevatorConfig) -> Self {
        self.config.elevators.push(config);
        self
    }

    /// Set the simulation tick rate (ticks per second).
    #[must_use]
    pub const fn ticks_per_second(mut self, tps: f64) -> Self {
        self.config.simulation.ticks_per_second = tps;
        self
    }

    /// Set the building name.
    #[must_use]
    pub fn building_name(mut self, name: impl Into<String>) -> Self {
        self.config.building.name = name.into();
        self
    }

    /// Set the default dispatch strategy for the default group.
    #[must_use]
    pub fn dispatch(mut self, strategy: impl DispatchStrategy + 'static) -> Self {
        self.dispatchers.insert(GroupId(0), Box::new(strategy));
        self
    }

    /// Set a dispatch strategy for a specific group.
    #[must_use]
    pub fn dispatch_for_group(
        mut self,
        group: GroupId,
        strategy: impl DispatchStrategy + 'static,
    ) -> Self {
        self.dispatchers.insert(group, Box::new(strategy));
        self
    }

    /// Register a hook to run before a simulation phase.
    #[must_use]
    pub fn before(
        mut self,
        phase: Phase,
        hook: impl Fn(&mut World) + Send + Sync + 'static,
    ) -> Self {
        self.hooks.add_before(phase, Box::new(hook));
        self
    }

    /// Register a hook to run after a simulation phase.
    #[must_use]
    pub fn after(
        mut self,
        phase: Phase,
        hook: impl Fn(&mut World) + Send + Sync + 'static,
    ) -> Self {
        self.hooks.add_after(phase, Box::new(hook));
        self
    }

    /// Pre-register an extension type for snapshot deserialization.
    ///
    /// Extensions registered here will be available immediately after [`build()`](Self::build)
    /// without needing to call `register_ext` manually.
    #[must_use]
    pub fn with_ext<T: 'static + Send + Sync + Serialize + DeserializeOwned>(
        mut self,
        name: &str,
    ) -> Self {
        let name = name.to_owned();
        self.ext_registrations
            .push(Box::new(move |world: &mut World| {
                world.register_ext::<T>(&name);
            }));
        self
    }

    /// Build the simulation, validating the configuration.
    ///
    /// Returns `Err(SimError)` if the configuration is invalid.
    pub fn build(self) -> Result<Simulation, SimError> {
        let default_dispatch = self
            .dispatchers
            .into_values()
            .next()
            .unwrap_or_else(|| Box::new(ScanDispatch::new()));

        let mut sim = Simulation::new_with_hooks(&self.config, default_dispatch, self.hooks)?;

        for register in self.ext_registrations {
            register(sim.world_mut());
        }

        Ok(sim)
    }
}
