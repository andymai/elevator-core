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
    DestinationDispatch, DispatchStrategy, EtdDispatch, LookDispatch, NearestCarDispatch,
    ScanDispatch,
};
use elevator_core::prelude::{Simulation, StopId};
use wasm_bindgen::prelude::*;

mod dto;

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
        let inner = make_sim(&config, strategy)
            .ok_or_else(|| JsError::new(&format!("unknown strategy: {strategy}")))?
            .map_err(|e| JsError::new(&format!("sim build: {e}")))?;
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
        // Each group owns its own dispatcher instance because strategies carry
        // per-group state (e.g. the sweep direction in SCAN/LOOK).
        let group_ids: Vec<_> = self.inner.dispatchers().keys().copied().collect();
        let mut inserted = false;
        for gid in group_ids {
            let Some(dispatcher) = boxed_strategy(name) else {
                return inserted;
            };
            self.inner.dispatchers_mut().insert(gid, dispatcher);
            inserted = true;
        }
        if inserted {
            self.strategy_name = name.to_string();
        }
        inserted
    }

    /// Spawn a single rider between two stop ids at the given weight.
    ///
    /// # Errors
    ///
    /// Returns a JS error if either stop id is unknown or the rider is
    /// rejected by the sim.
    #[wasm_bindgen(js_name = spawnRider)]
    pub fn spawn_rider(
        &mut self,
        origin: u32,
        destination: u32,
        weight: f64,
    ) -> Result<(), JsError> {
        self.inner
            .spawn_rider(StopId(origin), StopId(destination), weight)
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
    /// [`dto::Snapshot`].
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
    /// objects (matching [`dto::EventDto`]).
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
}

/// Boxed variant of the strategy map used by `set_strategy` (the dispatcher
/// map stores `Box<dyn DispatchStrategy>`, so rebuilding per group returns a
/// fresh boxed instance). Returns `None` for unrecognised names.
fn boxed_strategy(name: &str) -> Option<Box<dyn DispatchStrategy>> {
    match name {
        "scan" => Some(Box::new(ScanDispatch::new())),
        "look" => Some(Box::new(LookDispatch::new())),
        "nearest" => Some(Box::new(NearestCarDispatch::new())),
        "etd" => Some(Box::new(EtdDispatch::new())),
        "destination" => Some(Box::new(DestinationDispatch::new())),
        _ => None,
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
