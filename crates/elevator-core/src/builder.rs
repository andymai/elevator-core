//! Fluent builder for constructing a [`Simulation`] programmatically.

use serde::{Serialize, de::DeserializeOwned};

use crate::config::{
    BuildingConfig, ElevatorConfig, GroupConfig, LineConfig, PassengerSpawnConfig, SimConfig,
    SimulationParams,
};
use crate::dispatch::scan::ScanDispatch;
use crate::dispatch::{BuiltinReposition, DispatchStrategy, RepositionStrategy};
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
/// # Constructors
///
/// - [`SimulationBuilder::new`] — empty builder. You must add at least one
///   stop and at least one elevator before `.build()`, or it errors.
///   `ScanDispatch` is the default strategy, 60 ticks/s the default rate.
/// - [`SimulationBuilder::demo`] — pre-populated with two stops (Ground at
///   0.0, Top at 10.0) and one elevator, for doctests and quick
///   prototyping. Override any piece with the fluent methods.
pub struct SimulationBuilder {
    /// Simulation configuration (stops, elevators, timing).
    config: SimConfig,
    /// Per-group dispatch strategies.
    dispatchers: BTreeMap<GroupId, Box<dyn DispatchStrategy>>,
    /// Per-group reposition strategies.
    repositioners: Vec<(GroupId, Box<dyn RepositionStrategy>, BuiltinReposition)>,
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
    /// Create an empty builder — no stops, no elevators, `ScanDispatch` as
    /// the default strategy, and 60 ticks per second.
    ///
    /// You must add at least one stop and at least one elevator (via
    /// [`stops`](Self::stops) / [`stop`](Self::stop) and
    /// [`elevators`](Self::elevators) / [`elevator`](Self::elevator))
    /// before [`build`](Self::build), or the build fails with
    /// [`SimError::InvalidConfig`](crate::error::SimError::InvalidConfig).
    ///
    /// If you want a quick, already-valid sim for prototyping or examples,
    /// use [`demo`](Self::demo).
    ///
    /// ```
    /// use elevator_core::prelude::*;
    /// use elevator_core::config::ElevatorConfig;
    /// use elevator_core::stop::StopConfig;
    ///
    /// // An empty builder errors on build — you must configure it first.
    /// assert!(SimulationBuilder::new().build().is_err());
    ///
    /// // Minimum valid configuration: at least one stop and one elevator.
    /// let sim = SimulationBuilder::new()
    ///     .stops(vec![
    ///         StopConfig { id: StopId(0), name: "Ground".into(), position: 0.0 },
    ///         StopConfig { id: StopId(1), name: "Top".into(), position: 10.0 },
    ///     ])
    ///     .elevator(ElevatorConfig {
    ///         id: 0,
    ///         name: "Main".into(),
    ///         max_speed: 2.0,
    ///         acceleration: 1.5,
    ///         deceleration: 2.0,
    ///         weight_capacity: 800.0,
    ///         starting_stop: StopId(0),
    ///         door_open_ticks: 10,
    ///         door_transition_ticks: 5,
    ///         restricted_stops: Vec::new(),
    ///         # #[cfg(feature = "energy")]
    ///         # energy_profile: None,
    ///         service_mode: None,
    ///         inspection_speed_factor: 0.25,
    ///     })
    ///     .build()
    ///     .unwrap();
    /// assert_eq!(sim.current_tick(), 0);
    /// ```
    #[must_use]
    pub fn new() -> Self {
        let config = SimConfig {
            building: BuildingConfig {
                name: "Untitled".into(),
                stops: Vec::new(),
                lines: None,
                groups: None,
            },
            elevators: Vec::new(),
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
            repositioners: Vec::new(),
            hooks: PhaseHooks::default(),
            ext_registrations: Vec::new(),
        }
    }

    /// Create a pre-populated builder suitable for doctests, examples, and
    /// quick prototyping.
    ///
    /// Provides two stops (Ground at 0.0, Top at 10.0) and one elevator
    /// with SCAN dispatch. Override any piece with the fluent methods
    /// before [`build`](Self::build). For a blank slate, use
    /// [`new`](Self::new).
    ///
    /// ```
    /// use elevator_core::prelude::*;
    ///
    /// let sim = SimulationBuilder::demo().build().unwrap();
    /// assert_eq!(sim.current_tick(), 0);
    /// ```
    #[must_use]
    pub fn demo() -> Self {
        let mut b = Self::new();
        b.config.building.name = "Demo".into();
        b.config.building.stops = vec![
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
        ];
        b.config.elevators = vec![ElevatorConfig {
            id: 0,
            name: "Elevator 1".into(),
            max_speed: 2.0,
            acceleration: 1.5,
            deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 10,
            door_transition_ticks: 5,
            restricted_stops: Vec::new(),
            #[cfg(feature = "energy")]
            energy_profile: None,
            service_mode: None,
            inspection_speed_factor: 0.25,
        }];
        b
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
            repositioners: Vec::new(),
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

    /// Add a single line configuration.
    ///
    /// Switches from legacy flat-elevator mode to explicit topology.
    #[must_use]
    pub fn line(mut self, config: LineConfig) -> Self {
        self.config
            .building
            .lines
            .get_or_insert_with(Vec::new)
            .push(config);
        self
    }

    /// Replace all lines with the given list.
    ///
    /// Switches from legacy flat-elevator mode to explicit topology.
    #[must_use]
    pub fn lines(mut self, lines: Vec<LineConfig>) -> Self {
        self.config.building.lines = Some(lines);
        self
    }

    /// Add a single group configuration.
    #[must_use]
    pub fn group(mut self, config: GroupConfig) -> Self {
        self.config
            .building
            .groups
            .get_or_insert_with(Vec::new)
            .push(config);
        self
    }

    /// Replace all groups with the given list.
    #[must_use]
    pub fn groups(mut self, groups: Vec<GroupConfig>) -> Self {
        self.config.building.groups = Some(groups);
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

    /// Register a hook to run before a phase for a specific group.
    #[must_use]
    pub fn before_group(
        mut self,
        phase: Phase,
        group: GroupId,
        hook: impl Fn(&mut World) + Send + Sync + 'static,
    ) -> Self {
        self.hooks.add_before_group(phase, group, Box::new(hook));
        self
    }

    /// Register a hook to run after a phase for a specific group.
    #[must_use]
    pub fn after_group(
        mut self,
        phase: Phase,
        group: GroupId,
        hook: impl Fn(&mut World) + Send + Sync + 'static,
    ) -> Self {
        self.hooks.add_after_group(phase, group, Box::new(hook));
        self
    }

    /// Set a reposition strategy for the default group.
    ///
    /// Enables the reposition phase, which runs after dispatch to
    /// move idle elevators for better coverage.
    #[must_use]
    pub fn reposition(
        self,
        strategy: impl RepositionStrategy + 'static,
        id: BuiltinReposition,
    ) -> Self {
        self.reposition_for_group(GroupId(0), strategy, id)
    }

    /// Set a reposition strategy for a specific group.
    #[must_use]
    pub fn reposition_for_group(
        mut self,
        group: GroupId,
        strategy: impl RepositionStrategy + 'static,
        id: BuiltinReposition,
    ) -> Self {
        self.repositioners.push((group, Box::new(strategy), id));
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

    /// Validate the configuration without building the simulation.
    ///
    /// Runs the same validation as [`build()`](Self::build) but does not
    /// allocate entities or construct the simulation. Useful for CLI tools,
    /// config editors, and dry-run checks.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::InvalidConfig`] if the configuration is invalid.
    pub fn validate(&self) -> Result<(), SimError> {
        Simulation::validate_config(&self.config)
    }

    /// Build the simulation, validating the configuration.
    ///
    /// Returns `Err(SimError)` if the configuration is invalid.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::InvalidConfig`] if the assembled configuration is invalid.
    ///
    /// # Examples
    ///
    /// ```
    /// use elevator_core::prelude::*;
    /// use elevator_core::stop::StopConfig;
    ///
    /// let mut sim = SimulationBuilder::demo()
    ///     .stops(vec![
    ///         StopConfig { id: StopId(0), name: "Lobby".into(), position: 0.0 },
    ///         StopConfig { id: StopId(1), name: "Roof".into(), position: 20.0 },
    ///     ])
    ///     .build()
    ///     .unwrap();
    ///
    /// sim.spawn_rider_by_stop_id(StopId(0), StopId(1), 75.0).unwrap();
    ///
    /// for _ in 0..1000 {
    ///     sim.step();
    /// }
    ///
    /// assert!(sim.metrics().total_delivered() > 0);
    /// ```
    pub fn build(self) -> Result<Simulation, SimError> {
        let mut sim = Simulation::new_with_hooks(&self.config, self.dispatchers, self.hooks)?;

        for (group, strategy, id) in self.repositioners {
            sim.set_reposition(group, strategy, id);
        }

        for register in self.ext_registrations {
            register(sim.world_mut());
        }

        Ok(sim)
    }
}
