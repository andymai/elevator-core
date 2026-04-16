//! The `ElevatorSim` Godot node — wraps the core simulation.

use godot::prelude::*;
use slotmap::Key;

use elevator_core::config::SimConfig;
use elevator_core::dispatch::BuiltinStrategy;
use elevator_core::dispatch::scan::ScanDispatch;
use elevator_core::sim::Simulation;

/// Elevator simulation node.
///
/// Attach to your scene tree and configure via exported properties.
/// On `_ready`, loads a RON config and creates the simulation.
/// On `_process`, steps the sim and auto-spawns riders if enabled.
#[derive(GodotClass)]
#[class(base=Node)]
pub struct ElevatorSim {
    base: Base<Node>,

    /// Simulation instance (created on `_ready`).
    sim: Option<Simulation>,

    /// Path to the RON config file (filesystem path, not res://).
    #[export]
    config_path: GString,

    /// Simulation steps per frame. 0 = paused, 1 = normal, 2 = 2x, etc.
    #[export]
    speed_multiplier: i32,

    /// Whether to auto-spawn riders at random stops.
    #[export]
    auto_spawn: bool,

    /// Mean interval (in ticks) between auto-spawned riders.
    #[export]
    spawn_interval_ticks: i32,

    /// Minimum rider weight for auto-spawn.
    #[export]
    weight_min: f64,

    /// Maximum rider weight for auto-spawn.
    #[export]
    weight_max: f64,

    /// Ticks remaining until next auto-spawn.
    ticks_until_spawn: u32,
}

#[godot_api]
impl INode for ElevatorSim {
    fn init(base: Base<Node>) -> Self {
        Self {
            base,
            sim: None,
            config_path: GString::new(),
            speed_multiplier: 1,
            auto_spawn: true,
            spawn_interval_ticks: 120,
            weight_min: 50.0,
            weight_max: 100.0,
            ticks_until_spawn: 120,
        }
    }

    fn ready(&mut self) {
        let path = self.config_path.to_string();
        if path.is_empty() {
            godot_error!("ElevatorSim: config_path is empty");
            return;
        }
        let ron_str = match std::fs::read_to_string(&path) {
            Ok(s) => s,
            Err(e) => {
                godot_error!("ElevatorSim: failed to read {path}: {e}");
                return;
            }
        };
        let config: SimConfig = match ron::from_str(&ron_str) {
            Ok(c) => c,
            Err(e) => {
                godot_error!("ElevatorSim: failed to parse {path}: {e}");
                return;
            }
        };

        // Extract spawn config before consuming config.
        self.spawn_interval_ticks =
            i32::try_from(config.passenger_spawning.mean_interval_ticks).unwrap_or(120);
        self.weight_min = config.passenger_spawning.weight_range.0;
        self.weight_max = config.passenger_spawning.weight_range.1;
        self.ticks_until_spawn = config.passenger_spawning.mean_interval_ticks;

        match Simulation::new(&config, ScanDispatch::new()) {
            Ok(sim) => self.sim = Some(sim),
            Err(e) => godot_error!("ElevatorSim: simulation build failed: {e}"),
        }
    }

    fn process(&mut self, _delta: f64) {
        let Some(sim) = self.sim.as_mut() else {
            return;
        };

        let steps = self.speed_multiplier.max(0) as u32;

        // Auto-spawn riders.
        if self.auto_spawn && steps > 0 {
            Self::maybe_spawn_rider(
                sim,
                &mut self.ticks_until_spawn,
                self.spawn_interval_ticks.max(1) as u32,
                self.weight_min,
                self.weight_max,
                steps,
            );
        }

        // Step the simulation.
        for _ in 0..steps {
            sim.step();
        }
    }
}

#[godot_api]
impl ElevatorSim {
    // ── Rider management ────────────────────────────────────────────

    /// Spawn a rider with default preferences. Returns the rider entity
    /// ID (as i64 for GDScript compatibility), or -1 on failure.
    #[func]
    fn spawn_rider(&mut self, origin_stop_index: i32, dest_stop_index: i32, weight: f64) -> i64 {
        let Some(sim) = self.sim.as_mut() else {
            return -1;
        };
        let stops: Vec<_> = sim.world().stop_ids();
        let Some(&origin) = stops.get(origin_stop_index as usize) else {
            return -1;
        };
        let Some(&dest) = stops.get(dest_stop_index as usize) else {
            return -1;
        };
        match sim.spawn_rider(origin, dest, weight) {
            Ok(id) => id.entity().data().as_ffi() as i64,
            Err(_) => -1,
        }
    }

    /// Spawn a rider with full preferences and patience.
    /// Returns the rider entity ID (i64), or -1 on failure.
    /// Pass `max_wait_ticks < 0` to skip attaching a Patience component
    /// (the rider uses default patience behavior).
    #[func]
    fn spawn_rider_ex(
        &mut self,
        origin_stop_index: i32,
        dest_stop_index: i32,
        weight: f64,
        skip_full: bool,
        max_crowding: f64,
        abandon_after_ticks: i32,
        abandon_on_full: bool,
        max_wait_ticks: i64,
    ) -> i64 {
        let Some(sim) = self.sim.as_mut() else {
            return -1;
        };
        let stops: Vec<_> = sim.world().stop_ids();
        let Some(&origin) = stops.get(origin_stop_index as usize) else {
            return -1;
        };
        let Some(&dest) = stops.get(dest_stop_index as usize) else {
            return -1;
        };

        let prefs = elevator_core::components::Preferences::default()
            .with_skip_full_elevator(skip_full)
            .with_max_crowding_factor(max_crowding)
            .with_abandon_after_ticks(u32::try_from(abandon_after_ticks).ok())
            .with_abandon_on_full(abandon_on_full);

        let mut builder = match sim.build_rider(origin, dest) {
            Ok(b) => b,
            Err(_) => return -1,
        };
        builder = builder.weight(weight).preferences(prefs);
        if let Ok(ticks) = u64::try_from(max_wait_ticks) {
            builder = builder.patience(ticks);
        }
        match builder.spawn() {
            Ok(id) => id.entity().data().as_ffi() as i64,
            Err(_) => -1,
        }
    }

    /// Remove a rider from the simulation.
    /// Pass the entity ID returned by spawn_rider; negative IDs are rejected.
    #[func]
    fn despawn_rider(&mut self, rider_entity_id: i64) -> bool {
        if rider_entity_id < 0 {
            return false;
        }
        let Some(sim) = self.sim.as_mut() else {
            return false;
        };
        let kd = slotmap::KeyData::from_ffi(rider_entity_id as u64);
        let eid = elevator_core::entity::EntityId::from(kd);
        let rid = elevator_core::entity::RiderId::from(eid);
        sim.despawn_rider(rid).is_ok()
    }

    // ── Strategy ────────────────────────────────────────────────────

    /// Set the dispatch strategy for a group.
    /// strategy: 0=Scan, 1=Look, 2=NearestCar, 3=Etd.
    #[func]
    fn set_strategy(&mut self, group_id: i32, strategy: i32) {
        let Some(sim) = self.sim.as_mut() else {
            return;
        };
        let gid = elevator_core::ids::GroupId(group_id as u32);
        let (strat, id): (
            Box<dyn elevator_core::dispatch::DispatchStrategy>,
            BuiltinStrategy,
        ) = match strategy {
            0 => (Box::new(ScanDispatch::new()), BuiltinStrategy::Scan),
            1 => (
                Box::new(elevator_core::dispatch::look::LookDispatch::new()),
                BuiltinStrategy::Look,
            ),
            2 => (
                Box::new(elevator_core::dispatch::nearest_car::NearestCarDispatch::new()),
                BuiltinStrategy::NearestCar,
            ),
            3 => (
                Box::new(elevator_core::dispatch::etd::EtdDispatch::new()),
                BuiltinStrategy::Etd,
            ),
            _ => return,
        };
        sim.set_dispatch(gid, strat, id);
    }

    // ── Frame data ──────────────────────────────────────────────────

    /// Get the current simulation tick.
    #[func]
    fn current_tick(&self) -> i64 {
        self.sim.as_ref().map_or(0, |s| s.current_tick() as i64)
    }

    /// Get the number of stops.
    #[func]
    fn stop_count(&self) -> i32 {
        self.sim
            .as_ref()
            .map_or(0, |s| s.world().stop_ids().len() as i32)
    }

    /// Get the number of elevators.
    #[func]
    fn elevator_count(&self) -> i32 {
        self.sim
            .as_ref()
            .map_or(0, |s| s.world().elevator_ids().len() as i32)
    }

    /// Get stop data as a Dictionary.
    #[func]
    fn get_stop(&self, index: i32) -> Dictionary<Variant, Variant> {
        let Some(sim) = self.sim.as_ref() else {
            return Dictionary::new();
        };
        let stop_ids = sim.world().stop_ids();
        let Some(&eid) = stop_ids.get(index as usize) else {
            return Dictionary::new();
        };
        let Some(stop) = sim.world().stop(eid) else {
            return Dictionary::new();
        };
        let waiting = sim.waiting_at(eid).count();
        let residents = sim.residents_at(eid).count();
        let abandoned = sim.abandoned_at(eid).count();

        // Look up the config-time StopId for this entity.
        let stop_id = sim
            .stop_lookup_iter()
            .find(|(_, e)| **e == eid)
            .map_or(0i64, |(sid, _)| i64::from(sid.0));

        dict! {
            "entity_id" => eid.data().as_ffi() as i64,
            "stop_id" => stop_id,
            "position" => stop.position(),
            "name" => stop.name(),
            "waiting" => waiting as i64,
            "residents" => residents as i64,
            "abandoned" => abandoned as i64,
        }
    }

    /// Get elevator data as a Dictionary.
    #[func]
    fn get_elevator(&self, index: i32) -> Dictionary<Variant, Variant> {
        let Some(sim) = self.sim.as_ref() else {
            return Dictionary::new();
        };
        let elev_ids = sim.world().elevator_ids();
        let Some(&eid) = elev_ids.get(index as usize) else {
            return Dictionary::new();
        };
        let w = sim.world();
        let Some(elev) = w.elevator(eid) else {
            return Dictionary::new();
        };
        let pos = w
            .position(eid)
            .map_or(0.0, elevator_core::components::Position::value);
        let vel = w
            .velocity(eid)
            .map_or(0.0, elevator_core::components::Velocity::value);
        let phase_str = format!("{:?}", elev.phase());

        dict! {
            "entity_id" => eid.data().as_ffi() as i64,
            "phase" => phase_str.as_str(),
            "position" => pos,
            "velocity" => vel,
            "occupancy" => elev.riders().len() as i64,
            "capacity_kg" => elev.weight_capacity().value(),
            "current_load_kg" => elev.current_load().value(),
        }
    }

    /// Get rider data as a Dictionary.
    #[func]
    fn get_rider(&self, index: i32) -> Dictionary<Variant, Variant> {
        let Some(sim) = self.sim.as_ref() else {
            return Dictionary::new();
        };
        let rider_ids: Vec<_> = sim.world().rider_ids();
        let Some(&eid) = rider_ids.get(index as usize) else {
            return Dictionary::new();
        };
        let Some(rider) = sim.world().rider(eid) else {
            return Dictionary::new();
        };
        let phase_tag: i32 = match rider.phase() {
            elevator_core::components::RiderPhase::Waiting => 0,
            elevator_core::components::RiderPhase::Boarding(_) => 1,
            elevator_core::components::RiderPhase::Riding(_) => 2,
            elevator_core::components::RiderPhase::Exiting(_) => 3,
            elevator_core::components::RiderPhase::Walking => 4,
            elevator_core::components::RiderPhase::Arrived => 5,
            elevator_core::components::RiderPhase::Abandoned => 6,
            elevator_core::components::RiderPhase::Resident => 7,
            _ => -1,
        };
        let current_stop = rider
            .current_stop()
            .map_or(0i64, |s| s.data().as_ffi() as i64);

        dict! {
            "entity_id" => eid.data().as_ffi() as i64,
            "phase" => phase_tag,
            "current_stop" => current_stop,
        }
    }

    /// Get the number of riders currently in the simulation.
    #[func]
    fn rider_count(&self) -> i32 {
        self.sim
            .as_ref()
            .map_or(0, |s| s.world().rider_ids().len() as i32)
    }

    /// Get aggregate metrics as a Dictionary.
    #[func]
    fn get_metrics(&self) -> Dictionary<Variant, Variant> {
        let Some(sim) = self.sim.as_ref() else {
            return Dictionary::new();
        };
        let m = sim.metrics();
        dict! {
            "total_spawned" => m.total_spawned() as i64,
            "total_delivered" => m.total_delivered() as i64,
            "total_abandoned" => m.total_abandoned() as i64,
            "avg_wait_seconds" => m.avg_wait_time(),
            "avg_ride_seconds" => m.avg_ride_time(),
        }
    }

    /// Drain all pending events as an Array of Dictionaries.
    /// Each dict has: { kind, tick, rider, elevator, stop }.
    #[func]
    fn drain_events(&mut self) -> Array<Dictionary<Variant, Variant>> {
        let Some(sim) = self.sim.as_mut() else {
            return Array::new();
        };
        let events = sim.drain_events();
        let mut arr = Array::new();
        for event in events {
            use elevator_core::events::Event;
            let d = match event {
                Event::RiderSpawned {
                    rider,
                    origin,
                    destination,
                    tick,
                } => dict! {
                    "kind" => "RiderSpawned",
                    "tick" => tick as i64,
                    "rider" => rider.data().as_ffi() as i64,
                    "stop" => origin.data().as_ffi() as i64,
                    "destination" => destination.data().as_ffi() as i64,
                },
                Event::RiderBoarded {
                    rider,
                    elevator,
                    tick,
                } => dict! {
                    "kind" => "RiderBoarded",
                    "tick" => tick as i64,
                    "rider" => rider.data().as_ffi() as i64,
                    "elevator" => elevator.data().as_ffi() as i64,
                },
                Event::RiderExited {
                    rider,
                    elevator,
                    stop,
                    tick,
                } => dict! {
                    "kind" => "RiderExited",
                    "tick" => tick as i64,
                    "rider" => rider.data().as_ffi() as i64,
                    "elevator" => elevator.data().as_ffi() as i64,
                    "stop" => stop.data().as_ffi() as i64,
                },
                Event::RiderAbandoned { rider, stop, tick } => dict! {
                    "kind" => "RiderAbandoned",
                    "tick" => tick as i64,
                    "rider" => rider.data().as_ffi() as i64,
                    "stop" => stop.data().as_ffi() as i64,
                },
                Event::RiderSkipped {
                    rider,
                    elevator,
                    at_stop,
                    tick,
                } => dict! {
                    "kind" => "RiderSkipped",
                    "tick" => tick as i64,
                    "rider" => rider.data().as_ffi() as i64,
                    "elevator" => elevator.data().as_ffi() as i64,
                    "stop" => at_stop.data().as_ffi() as i64,
                },
                Event::HallButtonPressed { stop, tick, .. } => dict! {
                    "kind" => "HallButtonPressed",
                    "tick" => tick as i64,
                    "stop" => stop.data().as_ffi() as i64,
                },
                Event::ElevatorAssigned {
                    elevator,
                    stop,
                    tick,
                    ..
                } => dict! {
                    "kind" => "ElevatorAssigned",
                    "tick" => tick as i64,
                    "elevator" => elevator.data().as_ffi() as i64,
                    "stop" => stop.data().as_ffi() as i64,
                },
                _ => continue,
            };
            arr.push(&d);
        }
        arr
    }
}

impl ElevatorSim {
    /// Poisson-style spawn timer matching the Bevy `passenger_ai.rs` logic.
    fn maybe_spawn_rider(
        sim: &mut Simulation,
        ticks_until_spawn: &mut u32,
        mean_interval: u32,
        weight_min: f64,
        weight_max: f64,
        steps: u32,
    ) {
        use rand::RngExt;

        let stop_ids: Vec<_> = sim.world().stop_ids();
        if stop_ids.len() < 2 {
            return;
        }
        let mut rng = rand::rng();
        let mut remaining = steps;

        loop {
            if *ticks_until_spawn <= remaining {
                remaining -= *ticks_until_spawn;

                let origin_idx = rng.random_range(0..stop_ids.len());
                let mut dest_idx = rng.random_range(0..stop_ids.len());
                while dest_idx == origin_idx {
                    dest_idx = rng.random_range(0..stop_ids.len());
                }
                let weight = rng.random_range(weight_min..weight_max);
                let _ = sim.spawn_rider(stop_ids[origin_idx], stop_ids[dest_idx], weight);

                let jitter = rng.random_range(0.5f64..1.5);
                *ticks_until_spawn = (f64::from(mean_interval) * jitter) as u32;
            } else {
                *ticks_until_spawn -= remaining;
                break;
            }
        }
    }
}
