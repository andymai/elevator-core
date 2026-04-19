//! WASM bindings for `elevator-core`.
//!
//! This crate exposes a minimal `wasm-bindgen` surface designed for the browser
//! playground: construct a simulation from a RON config, step it forward, pull
//! back cheap snapshot DTOs for rendering, drain events, and swap the dispatch
//! strategy by name.
//!
//! The core crate stays engine-agnostic — all wasm-specific concerns (bindgen
//! macros, JS types, `getrandom/js`) live here.

#![allow(clippy::needless_pass_by_value)]

use elevator_core::config::SimConfig;
use elevator_core::dispatch::{
    BuiltinReposition, BuiltinStrategy, DestinationDispatch, EtdDispatch, LookDispatch,
    NearestCarDispatch, ScanDispatch,
};
use elevator_core::prelude::{Simulation, StopId};
use wasm_bindgen::prelude::*;

mod dto;

/// Map a JS-facing strategy name to its `BuiltinStrategy` variant. Used to tag
/// dispatcher instances so snapshots round-trip the active strategy id.
fn strategy_id(name: &str) -> Option<BuiltinStrategy> {
    match name {
        "scan" => Some(BuiltinStrategy::Scan),
        "look" => Some(BuiltinStrategy::Look),
        "nearest" => Some(BuiltinStrategy::NearestCar),
        "etd" => Some(BuiltinStrategy::Etd),
        "destination" => Some(BuiltinStrategy::Destination),
        _ => None,
    }
}

/// Construct a `Simulation` with a concrete dispatcher selected by name. We
/// instantiate the concrete strategy at the call site (instead of boxing first)
/// because `Simulation::new` takes `impl DispatchStrategy + 'static` — a trait
/// object would not satisfy that bound.
fn make_sim(
    config: &SimConfig,
    strategy: &str,
) -> Option<Result<Simulation, elevator_core::error::SimError>> {
    Some(match strategy {
        "scan" => Simulation::new(config, ScanDispatch::new()),
        "look" => Simulation::new(config, LookDispatch::new()),
        "nearest" => Simulation::new(config, NearestCarDispatch::new()),
        "etd" => Simulation::new(config, EtdDispatch::new()),
        "destination" => Simulation::new(config, DestinationDispatch::new()),
        _ => return None,
    })
}

/// Opaque simulation handle for JS.
#[wasm_bindgen]
pub struct WasmSim {
    inner: Simulation,
    strategy_name: String,
    traffic_rate: f64,
}

#[wasm_bindgen]
impl WasmSim {
    /// Construct a new simulation from a RON-encoded [`SimConfig`] and a
    /// dispatch strategy name (`"scan" | "look" | "nearest" | "etd" | "destination"`).
    ///
    /// # Errors
    ///
    /// Returns a JS error if the RON fails to parse, the config fails
    /// validation, or `strategy` is not a recognised built-in.
    #[wasm_bindgen(constructor)]
    pub fn new(config_ron: &str, strategy: &str) -> Result<Self, JsError> {
        let config: SimConfig =
            ron::from_str(config_ron).map_err(|e| JsError::new(&format!("config parse: {e}")))?;
        let mut inner = make_sim(&config, strategy)
            .ok_or_else(|| JsError::new(&format!("unknown strategy: {strategy}")))?
            .map_err(|e| JsError::new(&format!("sim build: {e}")))?;
        // Default to SpreadEvenly reposition *only* when the config didn't
        // pick one — scenarios with several cars on one line visibly benefit
        // from active repositioning, but an explicit RON choice must win so
        // downstream consumers (and future tests) aren't silently overridden.
        let groups_needing_default: Vec<_> = inner
            .groups()
            .iter()
            .map(elevator_core::dispatch::ElevatorGroup::id)
            .filter(|gid| inner.reposition_id(*gid).is_none())
            .collect();
        for gid in groups_needing_default {
            if let Some(strategy) = BuiltinReposition::SpreadEvenly.instantiate() {
                inner.set_reposition(gid, strategy, BuiltinReposition::SpreadEvenly);
            }
        }
        Ok(Self {
            inner,
            strategy_name: strategy.to_string(),
            traffic_rate: 0.0,
        })
    }

    /// Step the simulation forward `n` ticks.
    #[wasm_bindgen(js_name = stepMany)]
    pub fn step_many(&mut self, n: u32) {
        for _ in 0..n {
            self.inner.step();
        }
    }

    /// Tick duration in seconds.
    #[wasm_bindgen(js_name = dt)]
    pub fn dt(&self) -> f64 {
        self.inner.dt()
    }

    /// Current tick counter.
    #[wasm_bindgen(js_name = currentTick)]
    pub fn current_tick(&self) -> u64 {
        self.inner.current_tick()
    }

    /// Active strategy name.
    #[wasm_bindgen(js_name = strategyName)]
    pub fn strategy_name(&self) -> String {
        self.strategy_name.clone()
    }

    /// Swap the dispatch strategy by name. Returns `true` on success.
    ///
    /// State is preserved; only the assignment policy changes. Unknown names
    /// return `false` so the UI can round-trip arbitrary dropdown values
    /// without panicking.
    #[wasm_bindgen(js_name = setStrategy)]
    pub fn set_strategy(&mut self, name: &str) -> bool {
        // Validate the name up front so we either swap every group or none —
        // a partial swap would desync strategy state across groups and leave
        // `strategy_name` ambiguous.
        let Some(id) = strategy_id(name) else {
            return false;
        };
        // Each group owns its own dispatcher instance because strategies carry
        // per-group state (e.g. the sweep direction in SCAN/LOOK). Routing
        // through `set_dispatch` keeps `strategy_id` bookkeeping in sync for
        // snapshot round-trips and downstream consumers.
        let group_ids: Vec<_> = self.inner.dispatchers().keys().copied().collect();
        for gid in group_ids {
            if let Some(dispatcher) = id.instantiate() {
                self.inner.set_dispatch(gid, dispatcher, id.clone());
            }
        }
        self.strategy_name = name.to_string();
        true
    }

    /// Spawn a single rider between two stop ids at the given weight.
    ///
    /// When `patience_ticks` is provided (non-zero), the rider gets a
    /// [`Patience`](elevator_core::components::Patience) budget —
    /// riders waiting longer than that transition to `Abandoned` in
    /// the `advance_transient` phase. Heavy-load scenarios need this
    /// so queues can self-regulate: without abandonment, a two-car
    /// office under a 65-riders/min lunchtime pattern grows its
    /// waiting-count monotonically because demand persistently
    /// exceeds cruise throughput and no one ever leaves.
    ///
    /// Pass `0` (or omit on the JS side via `undefined`) to disable
    /// abandonment for this rider — preserves the pre-patience
    /// behavior for scenarios that want bounded queues.
    ///
    /// # Errors
    ///
    /// Returns a JS error if either stop id is unknown, the rider is
    /// rejected by the sim, or the `(origin, destination)` route
    /// can't be auto-detected.
    #[wasm_bindgen(js_name = spawnRider)]
    pub fn spawn_rider(
        &mut self,
        origin: u32,
        destination: u32,
        weight: f64,
        patience_ticks: Option<u32>,
    ) -> Result<(), JsError> {
        let mut builder = self
            .inner
            .build_rider(StopId(origin), StopId(destination))
            .map_err(|e| JsError::new(&format!("spawn: {e}")))?
            .weight(weight);
        if let Some(ticks) = patience_ticks.filter(|&t| t > 0) {
            builder = builder.patience(u64::from(ticks));
        }
        builder
            .spawn()
            .map(|_| ())
            .map_err(|e| JsError::new(&format!("spawn: {e}")))
    }

    /// Record a target traffic rate (riders per minute). The playground driver
    /// interprets this value externally and calls [`spawn_rider`](Self::spawn_rider)
    /// accordingly — the core sim is unaffected so determinism is preserved.
    ///
    /// [`spawn_rider`]: Self::spawn_rider
    #[wasm_bindgen(js_name = setTrafficRate)]
    pub fn set_traffic_rate(&mut self, riders_per_minute: f64) {
        self.traffic_rate = riders_per_minute.max(0.0);
    }

    /// Current traffic rate (riders/minute).
    #[wasm_bindgen(js_name = trafficRate)]
    pub fn traffic_rate(&self) -> f64 {
        self.traffic_rate
    }

    /// Pull a cheap snapshot for rendering. Returns a plain JS object matching
    /// the internal `dto::Snapshot` shape.
    ///
    /// # Errors
    ///
    /// Returns a JS error only if serialization to `JsValue` fails, which
    /// indicates a bug in the DTO layer rather than a runtime condition.
    pub fn snapshot(&self) -> Result<JsValue, JsError> {
        let snap = dto::Snapshot::build(&self.inner);
        serde_wasm_bindgen::to_value(&snap)
            .map_err(|e| JsError::new(&format!("snapshot encode: {e}")))
    }

    /// Drain all queued events since the last call. Returns an array of tagged
    /// objects (matching the internal `dto::EventDto` shape).
    ///
    /// # Errors
    ///
    /// Returns a JS error only if serialization fails.
    #[wasm_bindgen(js_name = drainEvents)]
    pub fn drain_events(&mut self) -> Result<JsValue, JsError> {
        let events: Vec<dto::EventDto> = self
            .inner
            .drain_events()
            .into_iter()
            .map(dto::EventDto::from)
            .collect();
        serde_wasm_bindgen::to_value(&events)
            .map_err(|e| JsError::new(&format!("event encode: {e}")))
    }

    /// Current aggregate metrics. Returns a plain JS object.
    ///
    /// # Errors
    ///
    /// Returns a JS error only if serialization fails.
    pub fn metrics(&self) -> Result<JsValue, JsError> {
        let out = dto::MetricsDto::build(&self.inner);
        serde_wasm_bindgen::to_value(&out)
            .map_err(|e| JsError::new(&format!("metrics encode: {e}")))
    }

    /// Convenience: waiting rider count at a specific stop id.
    #[wasm_bindgen(js_name = waitingCountAt)]
    pub fn waiting_count_at(&self, stop_id: u32) -> u32 {
        self.inner.stop_entity(StopId(stop_id)).map_or(0, |e| {
            u32::try_from(self.inner.waiting_count_at(e)).unwrap_or(u32::MAX)
        })
    }

    // ── Uniform elevator-physics setters ─────────────────────────────
    //
    // Apply a single value to every elevator in the sim. Wired to the
    // playground "Tweak parameters" drawer so visitors can mutate
    // building physics live without rebuilding the sim. Each calls into
    // the underlying `Simulation::set_*` mutator, which validates input
    // and emits an `ElevatorUpgraded` event per car. Errors from the
    // first failing car short-circuit and surface to JS — typical
    // failure modes are out-of-range values that the UI's slider
    // bounds should already prevent.

    /// Set `max_speed` (m/s) on every elevator in the sim.
    ///
    /// Velocity is preserved across the change; the movement integrator
    /// clamps to the new cap on the next tick. See
    /// [`Simulation::set_max_speed`](elevator_core::sim::Simulation::set_max_speed).
    ///
    /// # Errors
    ///
    /// Surfaces the underlying `SimError` as a `JsError` if `speed` is
    /// not a positive finite number.
    #[wasm_bindgen(js_name = setMaxSpeedAll)]
    pub fn set_max_speed_all(&mut self, speed: f64) -> Result<(), JsError> {
        let ids: Vec<_> = self
            .inner
            .world()
            .iter_elevators()
            .map(|(eid, _, _)| elevator_core::entity::ElevatorId::from(eid))
            .collect();
        for id in ids {
            self.inner
                .set_max_speed(id, speed)
                .map_err(|e| JsError::new(&format!("set_max_speed: {e}")))?;
        }
        Ok(())
    }

    /// Set `weight_capacity` (kg) on every elevator in the sim.
    ///
    /// Applied immediately. A new cap below `current_load` leaves the
    /// car temporarily overweight (no riders ejected); subsequent
    /// boarding rejects further additions. See
    /// [`Simulation::set_weight_capacity`](elevator_core::sim::Simulation::set_weight_capacity).
    ///
    /// # Errors
    ///
    /// Surfaces the underlying `SimError` as a `JsError` if `capacity`
    /// is not a positive finite number.
    #[wasm_bindgen(js_name = setWeightCapacityAll)]
    pub fn set_weight_capacity_all(&mut self, capacity: f64) -> Result<(), JsError> {
        let ids: Vec<_> = self
            .inner
            .world()
            .iter_elevators()
            .map(|(eid, _, _)| elevator_core::entity::ElevatorId::from(eid))
            .collect();
        for id in ids {
            self.inner
                .set_weight_capacity(id, capacity)
                .map_err(|e| JsError::new(&format!("set_weight_capacity: {e}")))?;
        }
        Ok(())
    }

    /// Set `door_open_ticks` (dwell duration) on every elevator.
    ///
    /// Takes effect on the **next** door cycle — an in-progress dwell
    /// completes its original timing to avoid visual glitches. See
    /// [`Simulation::set_door_open_ticks`](elevator_core::sim::Simulation::set_door_open_ticks).
    ///
    /// # Errors
    ///
    /// Surfaces the underlying `SimError` as a `JsError` if `ticks`
    /// is zero.
    #[wasm_bindgen(js_name = setDoorOpenTicksAll)]
    pub fn set_door_open_ticks_all(&mut self, ticks: u32) -> Result<(), JsError> {
        let ids: Vec<_> = self
            .inner
            .world()
            .iter_elevators()
            .map(|(eid, _, _)| elevator_core::entity::ElevatorId::from(eid))
            .collect();
        for id in ids {
            self.inner
                .set_door_open_ticks(id, ticks)
                .map_err(|e| JsError::new(&format!("set_door_open_ticks: {e}")))?;
        }
        Ok(())
    }

    /// Set `door_transition_ticks` (open- and close-transition duration)
    /// on every elevator.
    ///
    /// Takes effect on the next door cycle. See
    /// [`Simulation::set_door_transition_ticks`](elevator_core::sim::Simulation::set_door_transition_ticks).
    ///
    /// # Errors
    ///
    /// Surfaces the underlying `SimError` as a `JsError` if `ticks`
    /// is zero.
    #[wasm_bindgen(js_name = setDoorTransitionTicksAll)]
    pub fn set_door_transition_ticks_all(&mut self, ticks: u32) -> Result<(), JsError> {
        let ids: Vec<_> = self
            .inner
            .world()
            .iter_elevators()
            .map(|(eid, _, _)| elevator_core::entity::ElevatorId::from(eid))
            .collect();
        for id in ids {
            self.inner
                .set_door_transition_ticks(id, ticks)
                .map_err(|e| JsError::new(&format!("set_door_transition_ticks: {e}")))?;
        }
        Ok(())
    }

    /// Flip every group in the sim into the DCS hall-call mode. Required
    /// before `DestinationDispatch` can see rider destinations. Scenarios
    /// that want DCS (e.g. the hotel) call this once on load.
    #[wasm_bindgen(js_name = setHallCallModeDestination)]
    pub fn set_hall_call_mode_destination(&mut self) {
        use elevator_core::dispatch::HallCallMode;
        for group in self.inner.groups_mut() {
            group.set_hall_call_mode(HallCallMode::Destination);
        }
    }

    /// Swap every group's dispatcher to a tuned ETD instance that
    /// applies the group-time squared-wait fairness bonus. Higher
    /// `weight` values bias dispatch more aggressively toward stops
    /// with older waiters; `0.0` matches the default ETD.
    #[wasm_bindgen(js_name = setEtdWithWaitSquaredWeight)]
    pub fn set_etd_with_wait_squared_weight(&mut self, weight: f64) {
        let group_ids: Vec<_> = self.inner.dispatchers().keys().copied().collect();
        for gid in group_ids {
            let strategy = EtdDispatch::new().with_wait_squared_weight(weight);
            self.inner
                .set_dispatch(gid, Box::new(strategy), BuiltinStrategy::Etd);
        }
        self.strategy_name = "etd".to_string();
    }

    /// Swap every group's dispatcher to a DCS instance with the given
    /// deferred-commitment window. `window_ticks = 0` is equivalent to
    /// no window (immediate sticky).
    #[wasm_bindgen(js_name = setDcsWithCommitmentWindow)]
    pub fn set_dcs_with_commitment_window(&mut self, window_ticks: u64) {
        let group_ids: Vec<_> = self.inner.dispatchers().keys().copied().collect();
        for gid in group_ids {
            let strategy = DestinationDispatch::new().with_commitment_window_ticks(window_ticks);
            self.inner
                .set_dispatch(gid, Box::new(strategy), BuiltinStrategy::Destination);
        }
        self.strategy_name = "destination".to_string();
    }

    /// Install `PredictiveParking` as the reposition strategy for every
    /// group, with the given rolling window. Used by the residential
    /// scenario to spotlight arrival-rate-driven pre-positioning.
    #[wasm_bindgen(js_name = setRepositionPredictiveParking)]
    pub fn set_reposition_predictive_parking(&mut self, window_ticks: u64) {
        use elevator_core::dispatch::reposition::PredictiveParking;
        let group_ids: Vec<_> = self
            .inner
            .groups()
            .iter()
            .map(elevator_core::dispatch::ElevatorGroup::id)
            .collect();
        for gid in group_ids {
            self.inner.set_reposition(
                gid,
                Box::new(PredictiveParking::with_window_ticks(window_ticks)),
                BuiltinReposition::PredictiveParking,
            );
        }
    }
}

/// List of built-in strategy names in a stable order (for populating dropdowns).
#[wasm_bindgen(js_name = builtinStrategies)]
#[must_use]
pub fn builtin_strategies() -> Vec<JsValue> {
    ["scan", "look", "nearest", "etd", "destination"]
        .iter()
        .map(|s| JsValue::from_str(s))
        .collect()
}
