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
    BuiltinReposition, BuiltinStrategy, DestinationDispatch, EtdDispatch, HallCallMode,
    LookDispatch, NearestCarDispatch, RsrDispatch, ScanDispatch,
};
use elevator_core::entity::EntityId;
use elevator_core::prelude::{Simulation, StopId};
use slotmap::Key;
use wasm_bindgen::prelude::*;

mod dto;
mod world_view;

/// Encode an `EntityId` for the JS boundary as a `u64` (`BigInt` in JS).
/// Carries slotmap's full FFI encoding (slot + version) so stale
/// references fail cleanly instead of aliasing reused slots.
fn entity_to_u64(id: EntityId) -> u64 {
    id.data().as_ffi()
}

/// Decode a `u64` from JS back into an `EntityId`. The value must have
/// originated from [`entity_to_u64`]; arbitrary bit patterns produce a
/// `KeyData` that any subsequent world lookup will reject as missing.
fn u64_to_entity(raw: u64) -> EntityId {
    EntityId::from(slotmap::KeyData::from_ffi(raw))
}

/// Map a JS-facing strategy name to its `BuiltinStrategy` variant. Used to tag
/// dispatcher instances so snapshots round-trip the active strategy id.
fn strategy_id(name: &str) -> Option<BuiltinStrategy> {
    match name {
        "scan" => Some(BuiltinStrategy::Scan),
        "look" => Some(BuiltinStrategy::Look),
        "nearest" => Some(BuiltinStrategy::NearestCar),
        "etd" => Some(BuiltinStrategy::Etd),
        "destination" => Some(BuiltinStrategy::Destination),
        "rsr" => Some(BuiltinStrategy::Rsr),
        _ => None,
    }
}

/// Map a JS-facing reposition strategy name to its `BuiltinReposition`
/// variant. Mirrors `strategy_id` — five named strategies + the usual
/// fallback of `None` for unknown inputs so the UI can round-trip an
/// unfamiliar permalink value without panicking.
///
/// Note: `"none"` maps to `NearestIdle` because `NearestIdle`'s impl
/// is an empty function body — it's the engine's "do nothing" strategy
/// despite the historical name. Idle cars stay where they parked after
/// their last delivery, matching the UI label ("Stay") and description.
fn reposition_id(name: &str) -> Option<BuiltinReposition> {
    match name {
        "adaptive" => Some(BuiltinReposition::Adaptive),
        "predictive" => Some(BuiltinReposition::PredictiveParking),
        "lobby" => Some(BuiltinReposition::ReturnToLobby),
        "spread" => Some(BuiltinReposition::SpreadEvenly),
        "none" => Some(BuiltinReposition::NearestIdle),
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
        // RSR is the composite cost-stack strategy (ETA + wrong-
        // direction / car-call-affinity / load-fraction terms). The
        // playground exposes it with the stock weights — callers
        // seeking non-default tunings must drop to the Rust API.
        "rsr" => Simulation::new(config, RsrDispatch::new()),
        _ => return None,
    })
}

/// Opaque simulation handle for JS.
#[wasm_bindgen]
pub struct WasmSim {
    inner: Simulation,
    strategy_name: String,
    reposition_name: String,
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
    pub fn new(
        config_ron: &str,
        strategy: &str,
        reposition: Option<String>,
    ) -> Result<Self, JsError> {
        let config: SimConfig =
            ron::from_str(config_ron).map_err(|e| JsError::new(&format!("config parse: {e}")))?;
        let mut inner = make_sim(&config, strategy)
            .ok_or_else(|| JsError::new(&format!("unknown strategy: {strategy}")))?
            .map_err(|e| JsError::new(&format!("sim build: {e}")))?;
        // Resolve the caller-supplied reposition name (if any) to a
        // `BuiltinReposition` variant; fall back to `Adaptive` when
        // absent or unrecognised so old permalinks and undecorated
        // callers keep the prior behaviour. The playground's compare-
        // reposition feature passes one of `adaptive | predictive |
        // lobby | spread | none`.
        let requested_name = reposition
            .as_deref()
            .map_or("adaptive", |s| if s.is_empty() { "adaptive" } else { s });
        let resolved = reposition_id(requested_name).unwrap_or(BuiltinReposition::Adaptive);
        // Apply the resolved strategy to groups that didn't set one
        // themselves in the RON. A scenario-declared reposition (e.g.
        // a Service group that uses `NearestIdle` because a zoned
        // bouncing between its two endpoints every idle cycle would
        // burn cycles and look silly) wins. The user-picked strategy
        // only populates the unset groups, which is every group in
        // the default flat-scenario case.
        let groups_needing_default: Vec<_> = inner
            .groups()
            .iter()
            .map(elevator_core::dispatch::ElevatorGroup::id)
            .filter(|gid| inner.reposition_id(*gid).is_none())
            .collect();
        for gid in groups_needing_default {
            if let Some(strategy) = resolved.instantiate() {
                inner.set_reposition(gid, strategy, resolved.clone());
            }
        }
        Ok(Self {
            inner,
            strategy_name: strategy.to_string(),
            reposition_name: requested_name.to_string(),
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

    /// Current traffic mode as classified by `TrafficDetector`.
    ///
    /// Returns one of `"Idle" | "UpPeak" | "InterFloor" | "DownPeak"`.
    /// The UI renders this next to the strategy picker so users can see
    /// `AdaptiveParking`'s mode-gated branching live as the simulation
    /// swings between morning rush, midday drift, and evening rush.
    #[wasm_bindgen(js_name = trafficMode)]
    pub fn traffic_mode(&self) -> String {
        use elevator_core::traffic_detector::{TrafficDetector, TrafficMode};
        let mode = self
            .inner
            .world()
            .resource::<TrafficDetector>()
            .map_or(TrafficMode::Idle, TrafficDetector::current_mode);
        match mode {
            TrafficMode::UpPeak => "UpPeak".into(),
            TrafficMode::InterFloor => "InterFloor".into(),
            TrafficMode::DownPeak => "DownPeak".into(),
            // `Idle` + the `#[non_exhaustive]` wildcard collapse into
            // the same fallback: an unknown future variant should
            // render as the styled (dimmed) Idle badge rather than
            // unstyled defaults, keeping the TS union closed.
            TrafficMode::Idle | _ => "Idle".into(),
        }
    }

    /// Active reposition strategy name (one of `adaptive | predictive
    /// | lobby | spread | none`). Used by the playground to label the
    /// second chip in each pane header.
    #[wasm_bindgen(js_name = repositionStrategyName)]
    pub fn reposition_strategy_name(&self) -> String {
        self.reposition_name.clone()
    }

    /// Swap the reposition strategy by name. Returns `true` on success.
    /// State is preserved — only the idle-parking policy changes.
    /// Unknown names return `false` so the UI can round-trip arbitrary
    /// dropdown values without panicking.
    ///
    /// Applies to every group unconditionally — the constructor path
    /// is the only place scenario-declared reposition strategies get
    /// preserved. A live swap signals "user wants this strategy now"
    /// for all groups.
    #[wasm_bindgen(js_name = setReposition)]
    pub fn set_reposition_strategy(&mut self, name: &str) -> bool {
        let Some(id) = reposition_id(name) else {
            return false;
        };
        let group_ids: Vec<_> = self
            .inner
            .groups()
            .iter()
            .map(elevator_core::dispatch::ElevatorGroup::id)
            .collect();
        for gid in group_ids {
            if let Some(strategy) = id.instantiate() {
                self.inner.set_reposition(gid, strategy, id.clone());
            }
        }
        self.reposition_name = name.to_string();
        true
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

    /// Spawn a rider between two stops identified by their entity refs
    /// (`BigInt`). Companion to [`spawn_rider`](Self::spawn_rider) for
    /// runtime-added stops that have no config-time `StopId`.
    /// Returns the new rider's entity ref so consumers can correlate
    /// with subsequent `rider-*` events.
    ///
    /// # Errors
    ///
    /// Returns a JS error if either stop does not exist, the origin
    /// equals the destination, or no group serves both stops.
    #[wasm_bindgen(js_name = spawnRiderByRef)]
    pub fn spawn_rider_by_ref(
        &mut self,
        origin_ref: u64,
        destination_ref: u64,
        weight: f64,
        patience_ticks: Option<u32>,
    ) -> Result<u64, JsError> {
        let mut builder = self
            .inner
            .build_rider(u64_to_entity(origin_ref), u64_to_entity(destination_ref))
            .map_err(|e| JsError::new(&format!("spawn: {e}")))?
            .weight(weight);
        if let Some(ticks) = patience_ticks.filter(|&t| t > 0) {
            builder = builder.patience(u64::from(ticks));
        }
        builder
            .spawn()
            .map(|rid| entity_to_u64(rid.entity()))
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

    /// Pull a cheap snapshot for rendering.
    pub fn snapshot(&self) -> dto::Snapshot {
        dto::Snapshot::build(&self.inner)
    }

    /// Pull a richer game-facing view: door progress, direction lamps,
    /// per-car ETAs, hall-call lamp state, and topology metadata
    /// (groups + lines). Designed for tower-builder games (notably
    /// SKYSTACK) where the renderer needs more than `snapshot()` exposes.
    /// All entity refs are `u64` (`BigInt`) matching the live-mutation API.
    #[wasm_bindgen(js_name = worldView)]
    pub fn world_view(&self) -> world_view::WorldView {
        world_view::WorldView::build(&self.inner)
    }

    /// Drain all queued events since the last call.
    #[wasm_bindgen(js_name = drainEvents)]
    pub fn drain_events(&mut self) -> Vec<dto::EventDto> {
        self.inner
            .drain_events()
            .into_iter()
            .map(dto::EventDto::from)
            .collect()
    }

    /// Current aggregate metrics.
    pub fn metrics(&self) -> dto::MetricsDto {
        dto::MetricsDto::build(&self.inner)
    }

    /// Convenience: waiting rider count at a specific stop id.
    #[wasm_bindgen(js_name = waitingCountAt)]
    pub fn waiting_count_at(&self, stop_id: u32) -> u32 {
        self.inner.stop_entity(StopId(stop_id)).map_or(0, |e| {
            u32::try_from(self.inner.waiting_count_at(e)).unwrap_or(u32::MAX)
        })
    }

    // ── Topology mutation API ────────────────────────────────────────
    //
    // Granular live mutations for consumers (notably SKYSTACK) where the
    // player edits the building mid-sim. Entity references cross the JS
    // boundary as `u64` (BigInt in JS) carrying slotmap's full FFI
    // encoding — version bits included, so a stale reference to a
    // despawned entity fails cleanly instead of aliasing a reused slot.

    /// Add a new dispatch group with the given name and strategy.
    /// Returns the group ID as a `u32` (groups have flat numeric IDs).
    ///
    /// # Errors
    ///
    /// Returns a JS error if `dispatch_strategy` is not a recognised name
    /// (`"scan" | "look" | "nearest" | "etd" | "destination" | "rsr"`).
    #[wasm_bindgen(js_name = addGroup)]
    pub fn add_group(&mut self, name: String, dispatch_strategy: &str) -> Result<u32, JsError> {
        let group_id = match dispatch_strategy {
            "scan" => self.inner.add_group(name, ScanDispatch::new()),
            "look" => self.inner.add_group(name, LookDispatch::new()),
            "nearest" => self.inner.add_group(name, NearestCarDispatch::new()),
            "etd" => self.inner.add_group(name, EtdDispatch::new()),
            "destination" => self.inner.add_group(name, DestinationDispatch::new()),
            "rsr" => self.inner.add_group(name, RsrDispatch::new()),
            other => return Err(JsError::new(&format!("unknown strategy: {other}"))),
        };
        Ok(group_id.0)
    }

    /// Add a new line to an existing group. Returns the line entity ref.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the group does not exist or the range is
    /// non-finite or inverted.
    #[wasm_bindgen(js_name = addLine)]
    pub fn add_line(
        &mut self,
        group_id: u32,
        name: String,
        min_position: f64,
        max_position: f64,
        max_cars: Option<u32>,
    ) -> Result<u64, JsError> {
        let mut params =
            elevator_core::sim::LineParams::new(name, elevator_core::ids::GroupId(group_id));
        params.min_position = min_position;
        params.max_position = max_position;
        params.max_cars = max_cars.map(|n| n as usize);
        self.inner
            .add_line(&params)
            .map(entity_to_u64)
            .map_err(|e| JsError::new(&format!("add_line: {e}")))
    }

    /// Remove a line and all its elevators (riders ejected to nearest stop).
    ///
    /// # Errors
    ///
    /// Returns a JS error if the line does not exist.
    #[wasm_bindgen(js_name = removeLine)]
    pub fn remove_line(&mut self, line_ref: u64) -> Result<(), JsError> {
        self.inner
            .remove_line(u64_to_entity(line_ref))
            .map_err(|e| JsError::new(&format!("remove_line: {e}")))
    }

    /// Resize a line's reachable position range. The new range may
    /// grow or shrink the line; cars outside the new bounds are
    /// clamped to the boundary.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the line does not exist or the range is
    /// non-finite or inverted.
    #[wasm_bindgen(js_name = setLineRange)]
    pub fn set_line_range(
        &mut self,
        line_ref: u64,
        min_position: f64,
        max_position: f64,
    ) -> Result<(), JsError> {
        self.inner
            .set_line_range(u64_to_entity(line_ref), min_position, max_position)
            .map_err(|e| JsError::new(&format!("set_line_range: {e}")))
    }

    /// Add a stop to a line at the given position. Returns the stop
    /// entity ref.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the line does not exist or the position is
    /// non-finite.
    #[wasm_bindgen(js_name = addStop)]
    pub fn add_stop(&mut self, line_ref: u64, name: String, position: f64) -> Result<u64, JsError> {
        self.inner
            .add_stop(name, position, u64_to_entity(line_ref))
            .map(entity_to_u64)
            .map_err(|e| JsError::new(&format!("add_stop: {e}")))
    }

    /// Remove a stop. In-flight riders to/from it are rerouted, ejected,
    /// or abandoned per `Simulation::remove_stop` semantics.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the stop does not exist.
    #[wasm_bindgen(js_name = removeStop)]
    pub fn remove_stop(&mut self, stop_ref: u64) -> Result<(), JsError> {
        self.inner
            .remove_stop(u64_to_entity(stop_ref))
            .map_err(|e| JsError::new(&format!("remove_stop: {e}")))
    }

    /// Add a new elevator to a line at `starting_position`. Optional
    /// physics overrides; defaults match `ElevatorParams::default`.
    /// Returns the elevator entity ref.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the line does not exist, the position is
    /// non-finite, the physics are invalid, or the line's `max_cars` is
    /// already reached.
    #[wasm_bindgen(js_name = addElevator)]
    pub fn add_elevator(
        &mut self,
        line_ref: u64,
        starting_position: f64,
        max_speed: Option<f64>,
        weight_capacity: Option<f64>,
    ) -> Result<u64, JsError> {
        // Validate at the boundary; `add_elevator` re-runs full physics
        // checks, but rejecting NaN/inf here keeps the error message
        // close to the source (the JS caller's argument).
        if let Some(s) = max_speed
            && (!s.is_finite() || s <= 0.0)
        {
            return Err(JsError::new(&format!(
                "add_elevator: max_speed must be a positive finite number (got {s})"
            )));
        }
        if let Some(w) = weight_capacity
            && (!w.is_finite() || w <= 0.0)
        {
            return Err(JsError::new(&format!(
                "add_elevator: weight_capacity must be a positive finite number (got {w})"
            )));
        }

        let mut params = elevator_core::sim::ElevatorParams::default();
        if let Some(s) = max_speed {
            params.max_speed = elevator_core::components::Speed::from(s);
        }
        if let Some(w) = weight_capacity {
            params.weight_capacity = elevator_core::components::Weight::from(w);
        }
        self.inner
            .add_elevator(&params, u64_to_entity(line_ref), starting_position)
            .map(entity_to_u64)
            .map_err(|e| JsError::new(&format!("add_elevator: {e}")))
    }

    /// Remove an elevator (riders ejected to the nearest enabled stop).
    ///
    /// # Errors
    ///
    /// Returns a JS error if the elevator does not exist.
    #[wasm_bindgen(js_name = removeElevator)]
    pub fn remove_elevator(&mut self, elevator_ref: u64) -> Result<(), JsError> {
        self.inner
            .remove_elevator(u64_to_entity(elevator_ref))
            .map_err(|e| JsError::new(&format!("remove_elevator: {e}")))
    }

    /// Press a hall call at a stop with direction `"up"` or `"down"`.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the stop does not exist or `direction` is
    /// not `"up"` or `"down"`.
    #[wasm_bindgen(js_name = pressHallCall)]
    pub fn press_hall_call(&mut self, stop_ref: u64, direction: &str) -> Result<(), JsError> {
        let dir = match direction {
            "up" => elevator_core::components::CallDirection::Up,
            "down" => elevator_core::components::CallDirection::Down,
            other => {
                return Err(JsError::new(&format!(
                    "direction must be 'up' or 'down', got {other:?}"
                )));
            }
        };
        let stop = u64_to_entity(stop_ref);
        self.inner
            .press_hall_button(stop, dir)
            .map_err(|e| JsError::new(&format!("press_hall_call: {e}")))
    }

    /// Press a car-button (in-cab floor request) targeting `stop_ref`.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the elevator or stop does not exist.
    #[wasm_bindgen(js_name = pressCarButton)]
    pub fn press_car_button(&mut self, elevator_ref: u64, stop_ref: u64) -> Result<(), JsError> {
        self.inner
            .press_car_button(
                elevator_core::entity::ElevatorId::from(u64_to_entity(elevator_ref)),
                u64_to_entity(stop_ref),
            )
            .map_err(|e| JsError::new(&format!("press_car_button: {e}")))
    }

    /// Find the stop entity at `position` that's served by `line_ref`,
    /// or `0` (slotmap-null) if none. Lets consumers like SKYSTACK
    /// disambiguate co-located stops on different lines without the
    /// per-shaft offset hack the bridge currently uses.
    #[wasm_bindgen(js_name = findStopAtPositionOnLine)]
    pub fn find_stop_at_position_on_line(&self, position: f64, line_ref: u64) -> u64 {
        self.inner
            .find_stop_at_position_on_line(position, u64_to_entity(line_ref))
            .map_or(0, entity_to_u64)
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
    ["scan", "look", "nearest", "etd", "destination", "rsr"]
        .iter()
        .map(|s| JsValue::from_str(s))
        .collect()
}

/// List of built-in reposition-strategy names in a stable order (for
/// populating the "Park:" popover in the playground).
#[wasm_bindgen(js_name = builtinRepositionStrategies)]
#[must_use]
pub fn builtin_reposition_strategies() -> Vec<JsValue> {
    ["adaptive", "predictive", "lobby", "spread", "none"]
        .iter()
        .map(|s| JsValue::from_str(s))
        .collect()
}
