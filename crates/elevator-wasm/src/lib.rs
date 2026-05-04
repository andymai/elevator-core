//! WASM bindings for `elevator-core`.
//!
//! This crate exposes a minimal `wasm-bindgen` surface designed for the browser
//! playground: construct a simulation from a RON config, step it forward, pull
//! back cheap snapshot DTOs for rendering, drain events, and swap the dispatch
//! strategy by name.
//!
//! The core crate stays engine-agnostic — all wasm-specific concerns (bindgen
//! macros, JS types, `getrandom/wasm_js`) live here.

#![allow(clippy::needless_pass_by_value)]
// Result-shape methods wrap their bodies in `(|| -> Result<T, String> { ... })()`
// so internal `?` operators have a sensible target type. Inlining the closure
// would require manual error-conversion at every `?` site, which is what the
// closure exists to centralize.
#![allow(clippy::redundant_closure_call)]

use elevator_core::config::SimConfig;
use elevator_core::dispatch::{
    BuiltinReposition, BuiltinStrategy, DestinationDispatch, EtdDispatch, HallCallMode,
    LookDispatch, NearestCarDispatch, RsrDispatch, ScanDispatch,
};
use elevator_core::entity::EntityId;
use elevator_core::prelude::{Simulation, StopId};
use slotmap::Key;
use wasm_bindgen::prelude::*;

/// elevator-ffi ABI version this crate is pinned against.
///
/// Watched by `scripts/check-abi-pins.sh` in CI: any drift between
/// this constant and `EV_ABI_VERSION` in the FFI header fails the
/// gate, surfacing a stale wasm pin before runtime.
pub const ABI_VERSION: u32 = 5;

mod dto;
mod js_dispatch;
mod result;
mod world_view;

pub use dto::EventDto;
pub use result::{WasmBytesResult, WasmU32Result, WasmU64Result, WasmVoidResult};

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

/// Map a JS-facing service-mode label to its `ServiceMode` variant. The
/// label set is part of the wasm public contract; new variants in
/// `ServiceMode` must add a label here in the same release.
fn parse_service_mode(label: &str) -> Option<elevator_core::components::ServiceMode> {
    use elevator_core::components::ServiceMode;
    match label {
        "normal" => Some(ServiceMode::Normal),
        "independent" => Some(ServiceMode::Independent),
        "inspection" => Some(ServiceMode::Inspection),
        "manual" => Some(ServiceMode::Manual),
        "out-of-service" => Some(ServiceMode::OutOfService),
        _ => None,
    }
}

/// Inverse of [`parse_service_mode`]. Falls back to `"out-of-service"` for
/// unknown variants — `ServiceMode` is `#[non_exhaustive]`, so a new core
/// variant without a label here surfaces as that fallback rather than
/// panicking. Add a label in the same release that adds the variant.
const fn format_service_mode(mode: elevator_core::components::ServiceMode) -> &'static str {
    use elevator_core::components::ServiceMode;
    match mode {
        ServiceMode::Normal => "normal",
        ServiceMode::Independent => "independent",
        ServiceMode::Inspection => "inspection",
        ServiceMode::Manual => "manual",
        ServiceMode::OutOfService | _ => "out-of-service",
    }
}

/// Convert a real-time `Duration` (seconds) into integer simulation
/// ticks at the given dt. Saturating cast — sub-tick remainders round
/// to nearest, negative values clamp to 0, overflow clamps to `u64::MAX`.
/// Used by the ETA accessors so the JS side gets a clean integer
/// comparable to `currentTick` instead of a fractional seconds value
/// whose float precision drifts across ticks.
fn duration_to_ticks(d: std::time::Duration, dt: f64) -> u64 {
    // 2^53 is the largest integer with a lossless f64 representation;
    // any wider value rounds to even and loses bits in the conversion.
    const MAX_LOSSLESS_TICKS: f64 = 9_007_199_254_740_992.0;
    let ticks = (d.as_secs_f64() / dt).round();
    if !ticks.is_finite() || ticks <= 0.0 {
        0
    } else if ticks >= MAX_LOSSLESS_TICKS {
        u64::MAX
    } else {
        // Safety: bounds checked above (finite, in [0, 2^53)).
        #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
        let t = ticks as u64;
        t
    }
}

/// Map a JS-facing direction label (`"up"` / `"down"`) to a
/// [`CallDirection`]. Other inputs surface as a JS error so consumers
/// can't smuggle an unknown direction through.
fn parse_call_direction(label: &str) -> Result<elevator_core::components::CallDirection, String> {
    use elevator_core::components::CallDirection;
    match label {
        "up" => Ok(CallDirection::Up),
        "down" => Ok(CallDirection::Down),
        other => Err(format!("direction must be 'up' or 'down', got {other:?}")),
    }
}

/// Format a `Direction` as the JS-facing label string (`"up"`, `"down"`,
/// or `"either"`). Mirrors the parsing convention used by `bestEta`.
const fn format_direction(dir: elevator_core::components::Direction) -> &'static str {
    use elevator_core::components::Direction;
    match dir {
        Direction::Up => "up",
        Direction::Down => "down",
        Direction::Either | _ => "either",
    }
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

    /// Construct an effectively-empty simulation with no stops,
    /// elevators, or lines. Internally constructs from a tiny seed
    /// config (one stop, one elevator) to satisfy
    /// [`Simulation::new`]'s non-empty validation, then removes the
    /// seed entities before returning. The default (auto-created)
    /// group remains — `Simulation` requires at least one group
    /// to exist; consumers typically add their own groups via
    /// [`addGroup`](Self::add_group) on top.
    ///
    /// Useful for consumers that build the building topology
    /// dynamically at runtime (e.g. game engines where the player
    /// edits the floor plan) and don't want the seed-and-ignore
    /// boilerplate.
    ///
    /// # Errors
    ///
    /// Returns a JS error if `strategy` is not a recognised built-in.
    /// The internal seed config is well-formed by construction.
    #[wasm_bindgen(js_name = empty)]
    pub fn empty(strategy: &str, reposition: Option<String>) -> Result<Self, JsError> {
        const MINIMAL: &str = r#"SimConfig(
            building: BuildingConfig(
                name: "Empty",
                stops: [StopConfig(id: StopId(0), name: "_seed", position: 0.0)],
            ),
            elevators: [
                ElevatorConfig(
                    id: 0, name: "_seed",
                    max_speed: 1.0, acceleration: 1.0, deceleration: 1.0,
                    weight_capacity: 1.0,
                    starting_stop: StopId(0),
                    door_open_ticks: 1, door_transition_ticks: 1,
                ),
            ],
            simulation: SimulationParams(ticks_per_second: 60.0),
            passenger_spawning: PassengerSpawnConfig(
                mean_interval_ticks: 1,
                weight_range: (1.0, 1.0),
            ),
        )"#;

        let mut sim = Self::new(MINIMAL, strategy, reposition)?;

        // Remove seed entities in dependency order: elevators first,
        // then stops, then lines. Each removal can fail in principle
        // (e.g. unknown ref), but the seed shape is fixed and the
        // refs we just queried are guaranteed valid; we propagate any
        // error as a JsError for completeness.
        let line_refs = sim.inner.all_lines();
        for line_ref in &line_refs {
            let elevator_refs = sim.inner.elevators_on_line(*line_ref);
            for elev_ref in elevator_refs {
                sim.inner
                    .remove_elevator(elev_ref)
                    .map_err(|e| JsError::new(&format!("seed cleanup: {e}")))?;
            }
        }
        for line_ref in &line_refs {
            let stop_refs = sim.inner.stops_served_by_line(*line_ref);
            for stop_ref in stop_refs {
                sim.inner
                    .remove_stop(stop_ref)
                    .map_err(|e| JsError::new(&format!("seed cleanup: {e}")))?;
            }
        }
        for line_ref in line_refs {
            sim.inner
                .remove_line(line_ref)
                .map_err(|e| JsError::new(&format!("seed cleanup: {e}")))?;
        }

        Ok(sim)
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

    /// Install a JS function as the dispatch strategy for every group.
    ///
    /// `callback` is invoked once per `(car, stop)` pair the dispatch
    /// system considers, receiving a `JsRankContext` and returning a
    /// score (lower is better) or `null`/`undefined` to mark the pair
    /// unavailable. Non-finite or negative numbers are also treated as
    /// `null` so a buggy callback degrades to "this pair is excluded"
    /// rather than destabilizing the underlying assignment solver.
    ///
    /// `name` becomes the strategy's `BuiltinStrategy::Custom(name)`
    /// identity for snapshot round-trips and is reflected in
    /// [`strategy_name`](Self::strategy_name) as `custom:<name>`.
    /// Re-installs are allowed; the previous callback is dropped.
    ///
    /// Returns `true` when at least one group's dispatcher was swapped.
    /// `false` indicates a no-op — the sim has no groups yet (e.g.
    /// constructed via `empty()` before any `addGroup` call), so the
    /// callback was discarded. `strategy_name` is left untouched in
    /// that case so it doesn't claim a strategy is active when none
    /// has actually been installed.
    ///
    /// Designed for the Quest curriculum's `setStrategyJs` unlock: it
    /// lets a player author `rank()` directly in JavaScript and have
    /// elevator-core treat their code exactly like a built-in strategy.
    #[wasm_bindgen(js_name = setStrategyJs)]
    pub fn set_strategy_js(&mut self, name: String, callback: js_sys::Function) -> bool {
        let group_ids: Vec<_> = self.inner.dispatchers().keys().copied().collect();
        if group_ids.is_empty() {
            return false;
        }
        let id = BuiltinStrategy::Custom(name.clone());
        for gid in group_ids {
            let strategy = js_dispatch::JsDispatchStrategy::new(name.clone(), callback.clone());
            self.inner.set_dispatch(gid, Box::new(strategy), id.clone());
        }
        self.strategy_name = format!("custom:{name}");
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
    /// Returns the spawned rider's entity ref on success so consumers
    /// can correlate with subsequent `rider-*` events. Symmetric with
    /// [`Self::spawn_rider_by_ref`].
    ///
    /// # Errors
    ///
    /// Returns a Result-shaped object: `{ kind: "ok", value: bigint }`
    /// on success, or `{ kind: "err", error: "..." }` if either stop
    /// id is unknown, the rider is rejected by the sim, or the
    /// `(origin, destination)` route can't be auto-detected.
    #[wasm_bindgen(js_name = spawnRider)]
    pub fn spawn_rider(
        &mut self,
        origin: u32,
        destination: u32,
        weight: f64,
        patience_ticks: Option<u32>,
    ) -> WasmU64Result {
        (|| -> Result<u64, String> {
            let mut builder = self
                .inner
                .build_rider(StopId(origin), StopId(destination))
                .map_err(|e| format!("spawn: {e}"))?
                .weight(weight);
            if let Some(ticks) = patience_ticks.filter(|&t| t > 0) {
                builder = builder.patience(u64::from(ticks));
            }
            let rider = builder.spawn().map_err(|e| format!("spawn: {e}"))?;
            Ok(entity_to_u64(rider.entity()))
        })()
        .into()
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
    ) -> WasmU64Result {
        (|| -> Result<u64, String> {
            let mut builder = self
                .inner
                .build_rider(u64_to_entity(origin_ref), u64_to_entity(destination_ref))
                .map_err(|e| format!("spawn: {e}"))?
                .weight(weight);
            if let Some(ticks) = patience_ticks.filter(|&t| t > 0) {
                builder = builder.patience(u64::from(ticks));
            }
            builder
                .spawn()
                .map(|rid| entity_to_u64(rid.entity()))
                .map_err(|e| format!("spawn: {e}"))
        })()
        .into()
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

    /// Cheap u64 checksum of the simulation's serializable state.
    /// FNV-1a hash of the postcard snapshot bytes.
    ///
    /// Designed for divergence detection in lockstep deployments
    /// (browser vs server, multi-client multiplayer): two sims that
    /// stayed in lockstep must hash to the same value. Mismatch is a
    /// loud signal that something has drifted before the next full
    /// snapshot reconciles.
    ///
    /// Snapshot/restore is byte-symmetric: a fresh sim and a restored
    /// sim with the same logical state hash equal. (Earlier first-
    /// restore asymmetry was fixed.)
    #[wasm_bindgen(js_name = snapshotChecksum)]
    pub fn snapshot_checksum(&self) -> WasmU64Result {
        match self.inner.snapshot_checksum() {
            Ok(value) => WasmU64Result::ok(value),
            Err(e) => WasmU64Result::err(e.to_string()),
        }
    }

    /// Serialize the simulation to a self-describing postcard byte blob.
    ///
    /// Wraps [`Simulation::snapshot_bytes`]. The returned bytes carry a
    /// magic prefix and the `elevator-core` crate version; restore via
    /// [`Self::from_snapshot_bytes`] in the same crate version. Useful
    /// for hibernation/rehydration in serverless runtimes (Cloudflare
    /// Durable Objects) and for lockstep-checkpoint sync.
    #[wasm_bindgen(js_name = snapshotBytes)]
    pub fn snapshot_bytes(&self) -> WasmBytesResult {
        self.inner.snapshot_bytes().into()
    }

    /// Reconstruct a `WasmSim` from postcard bytes produced by
    /// [`Self::snapshot_bytes`].
    ///
    /// The `strategy` and `reposition` arguments restore wrapper-side
    /// labels not stored in the snapshot envelope (the underlying
    /// `Simulation` already auto-restores its built-in dispatch and
    /// reposition strategies from the postcard payload). Pass the same
    /// values used at original [`Self::new`] construction.
    ///
    /// `traffic_rate` resets to `0.0` on restore — callers that drive
    /// arrivals externally (the tower-together case) don't use this
    /// field; callers using built-in traffic should re-call
    /// `setTrafficRate` after restore.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the bytes are not a valid envelope, the
    /// crate version differs, the snapshot references a custom dispatch
    /// strategy (only built-in strategies are supported by this wrapper
    /// — use the Rust API directly for custom strategies), or
    /// `strategy` is not a recognised built-in name (matching the
    /// `new()` constructor's contract so `strategyName()` always holds
    /// a known label).
    #[wasm_bindgen(js_name = fromSnapshotBytes)]
    pub fn from_snapshot_bytes(
        bytes: &[u8],
        strategy: String,
        reposition: Option<String>,
    ) -> Result<Self, JsError> {
        if strategy_id(&strategy).is_none() {
            return Err(JsError::new(&format!("unknown strategy: {strategy}")));
        }
        let inner = Simulation::restore_bytes(bytes, None)
            .map_err(|e| JsError::new(&format!("restore: {e}")))?;
        let reposition_name = reposition
            .as_deref()
            .map_or("adaptive", |s| if s.is_empty() { "adaptive" } else { s })
            .to_string();
        Ok(Self {
            inner,
            strategy_name: strategy,
            reposition_name,
            traffic_rate: 0.0,
        })
    }

    /// Pull a richer game-facing view: door progress, direction lamps,
    /// per-car ETAs, hall-call lamp state, and topology metadata
    /// (groups + lines). Designed for game-side renderers that need
    /// more than `snapshot()` exposes. All entity refs are `u64`
    /// (`BigInt`) matching the live-mutation API.
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

    /// Peek at queued events without draining. Useful for read-only
    /// inspection (e.g. UI dashboards) where the consumer doesn't
    /// "own" the event stream.
    #[wasm_bindgen(js_name = pendingEvents)]
    pub fn pending_events(&mut self) -> Vec<dto::EventDto> {
        self.inner
            .pending_events()
            .iter()
            .cloned()
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
    // Granular live mutations for consumers where the building is
    // edited mid-sim (e.g. game-side editors driving from external
    // state). Entity references cross the JS boundary as `u64`
    // (BigInt in JS) carrying slotmap's full FFI encoding — version
    // bits included, so a stale reference to a despawned entity
    // fails cleanly instead of aliasing a reused slot.

    /// Add a new dispatch group with the given name and strategy.
    /// Returns the group ID as a `u32` (groups have flat numeric IDs).
    ///
    /// # Errors
    ///
    /// Returns a JS error if `dispatch_strategy` is not a recognised name
    /// (`"scan" | "look" | "nearest" | "etd" | "destination" | "rsr"`).
    #[wasm_bindgen(js_name = addGroup)]
    pub fn add_group(&mut self, name: String, dispatch_strategy: &str) -> WasmU32Result {
        (|| -> Result<u32, String> {
            let group_id = match dispatch_strategy {
                "scan" => self.inner.add_group(name, ScanDispatch::new()),
                "look" => self.inner.add_group(name, LookDispatch::new()),
                "nearest" => self.inner.add_group(name, NearestCarDispatch::new()),
                "etd" => self.inner.add_group(name, EtdDispatch::new()),
                "destination" => self.inner.add_group(name, DestinationDispatch::new()),
                "rsr" => self.inner.add_group(name, RsrDispatch::new()),
                other => return Err(format!("unknown strategy: {other}")),
            };
            Ok(group_id.0)
        })()
        .into()
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
    ) -> WasmU64Result {
        (|| -> Result<u64, String> {
            let mut params =
                elevator_core::sim::LineParams::new(name, elevator_core::ids::GroupId(group_id));
            params.min_position = min_position;
            params.max_position = max_position;
            params.max_cars = max_cars.map(|n| n as usize);
            self.inner
                .add_line(&params)
                .map(entity_to_u64)
                .map_err(|e| format!("add_line: {e}"))
        })()
        .into()
    }

    /// Remove a line and all its elevators (riders ejected to nearest stop).
    ///
    /// # Errors
    ///
    /// Returns a JS error if the line does not exist.
    #[wasm_bindgen(js_name = removeLine)]
    pub fn remove_line(&mut self, line_ref: u64) -> WasmVoidResult {
        self.inner
            .remove_line(u64_to_entity(line_ref))
            .map_err(|e| format!("remove_line: {e}"))
            .into()
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
    ) -> WasmVoidResult {
        self.inner
            .set_line_range(u64_to_entity(line_ref), min_position, max_position)
            .map_err(|e| format!("set_line_range: {e}"))
            .into()
    }

    /// Add a stop to a line at the given position. Returns the stop
    /// entity ref.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the line does not exist or the position is
    /// non-finite.
    #[wasm_bindgen(js_name = addStop)]
    pub fn add_stop(&mut self, line_ref: u64, name: String, position: f64) -> WasmU64Result {
        self.inner
            .add_stop(name, position, u64_to_entity(line_ref))
            .map(entity_to_u64)
            .map_err(|e| format!("add_stop: {e}"))
            .into()
    }

    /// Remove a stop. In-flight riders to/from it are rerouted, ejected,
    /// or abandoned per `Simulation::remove_stop` semantics.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the stop does not exist.
    #[wasm_bindgen(js_name = removeStop)]
    pub fn remove_stop(&mut self, stop_ref: u64) -> WasmVoidResult {
        self.inner
            .remove_stop(u64_to_entity(stop_ref))
            .map_err(|e| format!("remove_stop: {e}"))
            .into()
    }

    /// Add an existing stop entity to a line's served list. The stop
    /// must already exist (via `addStop` on some line, or from config).
    ///
    /// # Errors
    ///
    /// Returns a JS error if the stop or line entity does not exist.
    #[wasm_bindgen(js_name = addStopToLine)]
    pub fn add_stop_to_line(&mut self, stop_ref: u64, line_ref: u64) -> WasmVoidResult {
        self.inner
            .add_stop_to_line(u64_to_entity(stop_ref), u64_to_entity(line_ref))
            .map_err(|e| format!("add_stop_to_line: {e}"))
            .into()
    }

    /// Remove a stop from a line's served list. The stop entity itself
    /// remains in the world — call `removeStop` to fully despawn.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the line entity does not exist.
    #[wasm_bindgen(js_name = removeStopFromLine)]
    pub fn remove_stop_from_line(&mut self, stop_ref: u64, line_ref: u64) -> WasmVoidResult {
        self.inner
            .remove_stop_from_line(u64_to_entity(stop_ref), u64_to_entity(line_ref))
            .map_err(|e| format!("remove_stop_from_line: {e}"))
            .into()
    }

    /// Reassign a line to a different group. Returns the previous group
    /// id so the caller can detect a no-op (returned id == passed id).
    ///
    /// # Errors
    ///
    /// Returns a JS error if the line does not exist or `new_group_id`
    /// is not a valid group.
    #[wasm_bindgen(js_name = assignLineToGroup)]
    pub fn assign_line_to_group(&mut self, line_ref: u64, new_group_id: u32) -> WasmU32Result {
        self.inner
            .assign_line_to_group(
                u64_to_entity(line_ref),
                elevator_core::ids::GroupId(new_group_id),
            )
            .map(|old| old.0)
            .map_err(|e| format!("assign_line_to_group: {e}"))
            .into()
    }

    /// Reassign an elevator to a different line. Disabled cars stay
    /// disabled; in-flight cars are aborted to the nearest reachable
    /// stop on the new line.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the elevator or new line does not exist.
    #[wasm_bindgen(js_name = reassignElevatorToLine)]
    pub fn reassign_elevator_to_line(
        &mut self,
        elevator_ref: u64,
        new_line_ref: u64,
    ) -> WasmVoidResult {
        self.inner
            .reassign_elevator_to_line(u64_to_entity(elevator_ref), u64_to_entity(new_line_ref))
            .map_err(|e| format!("reassign_elevator_to_line: {e}"))
            .into()
    }

    /// Pin an elevator to a hard-coded home stop. Whenever the car is
    /// idle and off-position, the reposition phase routes it to the
    /// pinned stop regardless of the group's reposition strategy.
    /// Useful for express cars assigned to a dedicated lobby or
    /// service cars that should park in a loading bay between
    /// requests.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the elevator or stop does not exist, or
    /// if the elevator's line does not serve the requested stop.
    #[wasm_bindgen(js_name = setElevatorHomeStop)]
    pub fn set_elevator_home_stop(&mut self, elevator_ref: u64, stop_ref: u64) -> WasmVoidResult {
        self.inner
            .set_elevator_home_stop(
                elevator_core::entity::ElevatorId::from(u64_to_entity(elevator_ref)),
                u64_to_entity(stop_ref),
            )
            .map_err(|e| format!("set_elevator_home_stop: {e}"))
            .into()
    }

    /// Remove an elevator's home-stop pin. Reposition decisions return
    /// to the group's reposition strategy. Idempotent.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the elevator does not exist.
    #[wasm_bindgen(js_name = clearElevatorHomeStop)]
    pub fn clear_elevator_home_stop(&mut self, elevator_ref: u64) -> WasmVoidResult {
        self.inner
            .clear_elevator_home_stop(elevator_core::entity::ElevatorId::from(u64_to_entity(
                elevator_ref,
            )))
            .map_err(|e| format!("clear_elevator_home_stop: {e}"))
            .into()
    }

    /// Read the home-stop pin for an elevator. Returns `0n` when the
    /// car has no pin set; otherwise the stop entity ref.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the elevator does not exist.
    #[wasm_bindgen(js_name = elevatorHomeStop)]
    pub fn elevator_home_stop(&self, elevator_ref: u64) -> WasmU64Result {
        self.inner
            .elevator_home_stop(elevator_core::entity::ElevatorId::from(u64_to_entity(
                elevator_ref,
            )))
            .map(|opt| opt.map_or(0u64, entity_to_u64))
            .map_err(|e| format!("elevator_home_stop: {e}"))
            .into()
    }

    /// Replace an elevator's forbidden-stops set. Pass an empty array to
    /// clear all restrictions.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the elevator does not exist.
    #[wasm_bindgen(js_name = setElevatorRestrictedStops)]
    pub fn set_elevator_restricted_stops(
        &mut self,
        elevator_ref: u64,
        stop_refs: Vec<u64>,
    ) -> WasmVoidResult {
        (|| -> Result<(), String> {
            let restricted: std::collections::HashSet<EntityId> =
                stop_refs.into_iter().map(u64_to_entity).collect();
            self.inner
                .set_elevator_restricted_stops(u64_to_entity(elevator_ref), restricted)
                .map_err(|e| format!("set_elevator_restricted_stops: {e}"))
        })()
        .into()
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
    ) -> WasmU64Result {
        (|| -> Result<u64, String> {
            // Validate at the boundary; `add_elevator` re-runs full physics
            // checks, but rejecting NaN/inf here keeps the error message
            // close to the source (the JS caller's argument).
            if let Some(s) = max_speed
                && (!s.is_finite() || s <= 0.0)
            {
                return Err(format!(
                    "add_elevator: max_speed must be a positive finite number (got {s})"
                ));
            }
            if let Some(w) = weight_capacity
                && (!w.is_finite() || w <= 0.0)
            {
                return Err(format!(
                    "add_elevator: weight_capacity must be a positive finite number (got {w})"
                ));
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
                .map_err(|e| format!("add_elevator: {e}"))
        })()
        .into()
    }

    /// Remove an elevator (riders ejected to the nearest enabled stop).
    ///
    /// # Errors
    ///
    /// Returns a JS error if the elevator does not exist.
    #[wasm_bindgen(js_name = removeElevator)]
    pub fn remove_elevator(&mut self, elevator_ref: u64) -> WasmVoidResult {
        self.inner
            .remove_elevator(u64_to_entity(elevator_ref))
            .map_err(|e| format!("remove_elevator: {e}"))
            .into()
    }

    /// Press a hall call at a stop with direction `"up"` or `"down"`.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the stop does not exist or `direction` is
    /// not `"up"` or `"down"`.
    #[wasm_bindgen(js_name = pressHallCall)]
    pub fn press_hall_call(&mut self, stop_ref: u64, direction: &str) -> WasmVoidResult {
        (|| -> Result<(), String> {
            let dir = match direction {
                "up" => elevator_core::components::CallDirection::Up,
                "down" => elevator_core::components::CallDirection::Down,
                other => {
                    return Err(format!("direction must be 'up' or 'down', got {other:?}"));
                }
            };
            let stop = u64_to_entity(stop_ref);
            self.inner
                .press_hall_button(stop, dir)
                .map_err(|e| format!("press_hall_call: {e}"))
        })()
        .into()
    }

    /// Press a car-button (in-cab floor request) targeting `stop_ref`.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the elevator or stop does not exist.
    #[wasm_bindgen(js_name = pressCarButton)]
    pub fn press_car_button(&mut self, elevator_ref: u64, stop_ref: u64) -> WasmVoidResult {
        (|| -> Result<(), String> {
            self.inner
                .press_car_button(
                    elevator_core::entity::ElevatorId::from(u64_to_entity(elevator_ref)),
                    u64_to_entity(stop_ref),
                )
                .map_err(|e| format!("press_car_button: {e}"))
        })()
        .into()
    }

    /// Snapshot of every active hall call. Returns one `HallCallDto`
    /// per live `(stop, direction)` press.
    #[wasm_bindgen(js_name = hallCalls)]
    #[must_use]
    pub fn hall_calls(&self) -> Vec<dto::HallCallDto> {
        self.inner
            .hall_calls()
            .map(dto::HallCallDto::from)
            .collect()
    }

    /// Snapshot of car-button presses inside `elevator_ref`. Returns
    /// an empty array if the elevator has no aboard riders or has not
    /// been used.
    #[wasm_bindgen(js_name = carCalls)]
    #[must_use]
    pub fn car_calls(&self, elevator_ref: u64) -> Vec<dto::CarCallDto> {
        self.inner
            .car_calls(elevator_core::entity::ElevatorId::from(u64_to_entity(
                elevator_ref,
            )))
            .iter()
            .map(dto::CarCallDto::from)
            .collect()
    }

    /// Find the stop entity at `position` that's served by `line_ref`,
    /// or `0` (slotmap-null) if none. Lets consumers disambiguate
    /// co-located stops on different lines (sky-lobby served by
    /// multiple banks, parallel shafts at the same physical floor)
    /// without offset hacks.
    #[wasm_bindgen(js_name = findStopAtPositionOnLine)]
    pub fn find_stop_at_position_on_line(&self, position: f64, line_ref: u64) -> u64 {
        self.inner
            .find_stop_at_position_on_line(position, u64_to_entity(line_ref))
            .map_or(0, entity_to_u64)
    }

    // ── Service mode + manual control ────────────────────────────────
    //
    // Mirrors the core API for switching between Normal / Independent /
    // Inspection / Manual / OutOfService modes, plus the Manual-mode
    // command set (target velocity, emergency stop, manual door commands).

    /// Set the operational mode of an elevator.
    ///
    /// `mode` is one of: `"normal"`, `"independent"`, `"inspection"`,
    /// `"manual"`, `"out-of-service"`. Modes are orthogonal to the
    /// elevator's phase. Leaving Manual zeroes velocity and clears any
    /// queued door commands.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the elevator does not exist or the mode
    /// label is unknown.
    #[wasm_bindgen(js_name = setServiceMode)]
    pub fn set_service_mode(&mut self, elevator_ref: u64, mode: &str) -> WasmVoidResult {
        (|| -> Result<(), String> {
            let mode =
                parse_service_mode(mode).ok_or_else(|| format!("unknown service mode: {mode}"))?;
            self.inner
                .set_service_mode(u64_to_entity(elevator_ref), mode)
                .map_err(|e| format!("set_service_mode: {e}"))
        })()
        .into()
    }

    /// Get the current operational mode of an elevator as a label string.
    /// Returns `"normal"` for missing/disabled elevators (matches core's
    /// `service_mode` accessor, which returns the default rather than
    /// erroring).
    #[wasm_bindgen(js_name = serviceMode)]
    #[must_use]
    pub fn service_mode(&self, elevator_ref: u64) -> String {
        format_service_mode(self.inner.service_mode(u64_to_entity(elevator_ref))).to_string()
    }

    /// Set the target velocity for a Manual-mode elevator (distance/tick).
    /// Positive = up, negative = down. The car ramps toward the target
    /// using its configured acceleration / deceleration.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the elevator does not exist, is not in
    /// Manual mode, or `velocity` is non-finite.
    #[wasm_bindgen(js_name = setTargetVelocity)]
    pub fn set_target_velocity(&mut self, elevator_ref: u64, velocity: f64) -> WasmVoidResult {
        self.inner
            .set_target_velocity(
                elevator_core::entity::ElevatorId::from(u64_to_entity(elevator_ref)),
                velocity,
            )
            .map_err(|e| format!("set_target_velocity: {e}"))
            .into()
    }

    /// Command an immediate stop on a Manual-mode elevator. Sets the
    /// target velocity to zero and emits a distinct event so games can
    /// distinguish an emergency stop from a deliberate hold.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the elevator does not exist or is not in
    /// Manual mode.
    #[wasm_bindgen(js_name = emergencyStop)]
    pub fn emergency_stop(&mut self, elevator_ref: u64) -> WasmVoidResult {
        self.inner
            .emergency_stop(elevator_core::entity::ElevatorId::from(u64_to_entity(
                elevator_ref,
            )))
            .map_err(|e| format!("emergency_stop: {e}"))
            .into()
    }

    /// Request the doors of an elevator to open. Applied immediately at a
    /// stopped car with closed/closing doors; otherwise queued.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the elevator does not exist or is disabled.
    #[wasm_bindgen(js_name = openDoor)]
    pub fn open_door(&mut self, elevator_ref: u64) -> WasmVoidResult {
        self.inner
            .open_door(elevator_core::entity::ElevatorId::from(u64_to_entity(
                elevator_ref,
            )))
            .map_err(|e| format!("open_door: {e}"))
            .into()
    }

    /// Request the doors to close now. Forces an early close unless a
    /// rider is mid-boarding/exiting.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the elevator does not exist or is disabled.
    #[wasm_bindgen(js_name = closeDoor)]
    pub fn close_door(&mut self, elevator_ref: u64) -> WasmVoidResult {
        self.inner
            .close_door(elevator_core::entity::ElevatorId::from(u64_to_entity(
                elevator_ref,
            )))
            .map_err(|e| format!("close_door: {e}"))
            .into()
    }

    /// Extend the doors' open dwell by `ticks`. Cumulative across calls.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the elevator does not exist, is disabled,
    /// or `ticks` is zero.
    #[wasm_bindgen(js_name = holdDoor)]
    pub fn hold_door(&mut self, elevator_ref: u64, ticks: u32) -> WasmVoidResult {
        self.inner
            .hold_door(
                elevator_core::entity::ElevatorId::from(u64_to_entity(elevator_ref)),
                ticks,
            )
            .map_err(|e| format!("hold_door: {e}"))
            .into()
    }

    /// Cancel any pending hold extension on the doors.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the elevator does not exist or is disabled.
    #[wasm_bindgen(js_name = cancelDoorHold)]
    pub fn cancel_door_hold(&mut self, elevator_ref: u64) -> WasmVoidResult {
        self.inner
            .cancel_door_hold(elevator_core::entity::ElevatorId::from(u64_to_entity(
                elevator_ref,
            )))
            .map_err(|e| format!("cancel_door_hold: {e}"))
            .into()
    }

    // ── Dispatch introspection ───────────────────────────────────────
    //
    // Mirrors the FFI dispatch surface (pin/unpin, assigned car, ETA
    // queries). Direction strings match the existing pressHallCall
    // contract: `"up"` and `"down"` only. ETAs cross the boundary as u64
    // ticks rather than seconds — matches FFI and avoids float precision
    // surprises for permalinks / replays.

    /// Pin the call at `(stop_ref, direction)` to `car_ref`, locking it
    /// out of dispatch reassignment.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the elevator/stop does not exist, the line
    /// does not serve the stop, no hall call exists at that
    /// `(stop, direction)`, or `direction` is not `"up"` / `"down"`.
    #[wasm_bindgen(js_name = pinAssignment)]
    pub fn pin_assignment(
        &mut self,
        car_ref: u64,
        stop_ref: u64,
        direction: &str,
    ) -> WasmVoidResult {
        (|| -> Result<(), String> {
            let dir = parse_call_direction(direction)?;
            self.inner
                .pin_assignment(
                    elevator_core::entity::ElevatorId::from(u64_to_entity(car_ref)),
                    u64_to_entity(stop_ref),
                    dir,
                )
                .map_err(|e| format!("pin_assignment: {e}"))
        })()
        .into()
    }

    /// Release a previous pin at `(stop_ref, direction)`. No-op if the
    /// call does not exist or wasn't pinned.
    ///
    /// # Errors
    ///
    /// Returns a JS error if `direction` is not `"up"` / `"down"`.
    #[wasm_bindgen(js_name = unpinAssignment)]
    pub fn unpin_assignment(&mut self, stop_ref: u64, direction: &str) -> WasmVoidResult {
        (|| -> Result<(), String> {
            let dir = parse_call_direction(direction)?;
            self.inner.unpin_assignment(u64_to_entity(stop_ref), dir);
            Ok(())
        })()
        .into()
    }

    /// Car currently assigned to serve the call at `(stop_ref, direction)`,
    /// or `0` (slotmap-null) if none. At stops served by multiple lines
    /// this returns the entry with the numerically smallest line-entity
    /// key (stable across ticks).
    ///
    /// # Errors
    ///
    /// Returns a JS error if `direction` is not `"up"` / `"down"`.
    #[wasm_bindgen(js_name = assignedCar)]
    pub fn assigned_car(&self, stop_ref: u64, direction: &str) -> WasmU64Result {
        (|| -> Result<u64, String> {
            let dir = parse_call_direction(direction)?;
            Ok(self
                .inner
                .assigned_car(u64_to_entity(stop_ref), dir)
                .map_or(0, entity_to_u64))
        })()
        .into()
    }

    /// Per-line cars assigned to the call at `(stop_ref, direction)`.
    /// Returns a flat array of alternating `[line_ref, car_ref, ...]`
    /// pairs. Empty when dispatch has no assignments yet.
    ///
    /// Iteration order is stable by line-entity id (`BTreeMap`).
    ///
    /// # Errors
    ///
    /// Returns a JS error if `direction` is not `"up"` / `"down"`.
    #[wasm_bindgen(js_name = assignedCarsByLine)]
    pub fn assigned_cars_by_line(
        &self,
        stop_ref: u64,
        direction: &str,
    ) -> Result<Vec<u64>, JsError> {
        let dir = parse_call_direction(direction).map_err(|e| JsError::new(&e))?;
        Ok(self
            .inner
            .assigned_cars_by_line(u64_to_entity(stop_ref), dir)
            .into_iter()
            .flat_map(|(line, car)| [entity_to_u64(line), entity_to_u64(car)])
            .collect())
    }

    /// Estimated ticks remaining before `car_ref` reaches `stop_ref`.
    ///
    /// Includes any in-progress door cycle, intermediate stops in the
    /// car's destination queue, and the trapezoidal travel time for each
    /// leg. Returns ticks rather than seconds so consumers can compare
    /// with `currentTick`.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the elevator/stop does not exist, the
    /// elevator is in a service mode excluded from dispatch, or `stop`
    /// is not in the car's destination queue.
    #[wasm_bindgen(js_name = eta)]
    pub fn eta(&self, car_ref: u64, stop_ref: u64) -> WasmU64Result {
        (|| -> Result<u64, String> {
            let elev = elevator_core::entity::ElevatorId::from(u64_to_entity(car_ref));
            let dt = self.inner.dt();
            self.inner
                .eta(elev, u64_to_entity(stop_ref))
                .map(|d| duration_to_ticks(d, dt))
                .map_err(|e| format!("eta: {e}"))
        })()
        .into()
    }

    /// Estimated ticks remaining before the assigned car reaches the
    /// call at `(stop_ref, direction)`.
    ///
    /// # Errors
    ///
    /// Returns a JS error if no hall call exists at `(stop, direction)`,
    /// no car is assigned to it, the assigned car has no positional
    /// data, or `direction` is not `"up"` / `"down"`.
    #[wasm_bindgen(js_name = etaForCall)]
    pub fn eta_for_call(&self, stop_ref: u64, direction: &str) -> WasmU64Result {
        (|| -> Result<u64, String> {
            let dir = parse_call_direction(direction)?;
            self.inner
                .eta_for_call(u64_to_entity(stop_ref), dir)
                .map_err(|e| format!("eta_for_call: {e}"))
        })()
        .into()
    }

    /// Best ETA (ticks) to `stop_ref` across every dispatch-eligible
    /// elevator, optionally filtered by indicator-lamp `direction`
    /// (`"up"` / `"down"` / `"either"`). Returns a flat
    /// `[elevator_ref, eta_ticks]` pair, or an empty array if no
    /// eligible car has the stop queued.
    ///
    /// # Errors
    ///
    /// Returns a JS error if `direction` is not `"up"` / `"down"` /
    /// `"either"`.
    #[wasm_bindgen(js_name = bestEta)]
    pub fn best_eta(&self, stop_ref: u64, direction: &str) -> Result<Vec<u64>, JsError> {
        use elevator_core::components::Direction;
        let dir = match direction {
            "up" => Direction::Up,
            "down" => Direction::Down,
            "either" => Direction::Either,
            other => {
                return Err(JsError::new(&format!(
                    "direction must be 'up' / 'down' / 'either', got {other:?}"
                )));
            }
        };
        let stop = u64_to_entity(stop_ref);
        let dt = self.inner.dt();
        Ok(self
            .inner
            .best_eta(stop, dir)
            .map(|(eid, d)| vec![entity_to_u64(eid), duration_to_ticks(d, dt)])
            .unwrap_or_default())
    }

    // ── Per-elevator introspection accessors ─────────────────────────
    //
    // Read-only queries for individual cars. All `Option<T>` returns
    // surface as `T | undefined` in JS via wasm-bindgen's standard
    // mapping; missing/disabled entities return `undefined`. Direction
    // labels match the rest of the wasm contract (`"up"` / `"down"` /
    // `"either"`).

    /// Current velocity (distance/tick) of `elevator_ref`. Positive = up,
    /// negative = down. Returns `undefined` if the entity has no velocity
    /// component (i.e. is not an elevator).
    #[wasm_bindgen(js_name = velocity)]
    #[must_use]
    pub fn velocity(&self, elevator_ref: u64) -> Option<f64> {
        self.inner.velocity(u64_to_entity(elevator_ref))
    }

    /// Sub-tick interpolated position of `entity_ref` for smooth render
    /// frames. `alpha` is in `[0.0, 1.0]` — `0.0` = current tick,
    /// `1.0` = next tick. Returns `undefined` if the entity has no
    /// position component.
    #[wasm_bindgen(js_name = positionAt)]
    #[must_use]
    pub fn position_at(&self, entity_ref: u64, alpha: f64) -> Option<f64> {
        self.inner.position_at(u64_to_entity(entity_ref), alpha)
    }

    /// Batched variant of [`Self::position_at`]: writes the
    /// interpolated position of each `entity_ref` in `refs` into the
    /// matching slot of `out`, in one wasm-bindgen crossing.
    ///
    /// Designed for renderers that read N elevator positions per
    /// frame and want to avoid the per-call boundary overhead of
    /// calling `positionAt` in a loop. Entities without a position
    /// component get `f64::NAN` written to their slot — caller can
    /// `Number.isNaN(slot)` to detect.
    ///
    /// Both `refs` and `out` are zero-copy views of the JS caller's
    /// typed arrays (`BigUint64Array` and `Float64Array` respectively).
    /// wasm-bindgen does not allocate or copy on the boundary, so
    /// this stays cheap to call every render frame.
    ///
    /// Returns the number of entries written, which is
    /// `min(refs.len(), out.len())`. Callers can reuse a scratch
    /// buffer larger than the current frame's elevator count without
    /// re-reading lengths; when `out` is shorter than `refs`, only
    /// `out.len()` entries are written and the remaining refs are
    /// silently skipped — caller is responsible for sizing `out` at
    /// least as large as `refs` if they want every position read.
    #[wasm_bindgen(js_name = positionsAtPacked)]
    #[must_use]
    pub fn positions_at_packed(&self, refs: &[u64], alpha: f64, out: &mut [f64]) -> u32 {
        let n = refs.len().min(out.len());
        for (i, &raw) in refs.iter().enumerate().take(n) {
            out[i] = self
                .inner
                .position_at(u64_to_entity(raw), alpha)
                .unwrap_or(f64::NAN);
        }
        u32::try_from(n).unwrap_or(u32::MAX)
    }

    /// Fraction of `elevator_ref`'s capacity currently occupied (by weight),
    /// in `[0.0, 1.0]`. Returns `undefined` for missing entities.
    #[wasm_bindgen(js_name = elevatorLoad)]
    #[must_use]
    pub fn elevator_load(&self, elevator_ref: u64) -> Option<f64> {
        self.inner
            .elevator_load(elevator_core::entity::ElevatorId::from(u64_to_entity(
                elevator_ref,
            )))
    }

    /// Number of riders currently aboard `elevator_ref`. Returns `0` for
    /// missing entities (`Simulation::occupancy` returns 0 for both
    /// "not an elevator" and "empty cab" — distinguish via `isElevator`).
    #[wasm_bindgen(js_name = occupancy)]
    #[must_use]
    pub fn occupancy(&self, elevator_ref: u64) -> u32 {
        u32::try_from(self.inner.occupancy(u64_to_entity(elevator_ref))).unwrap_or(u32::MAX)
    }

    /// Indicator-lamp direction of `elevator_ref`: `"up"`, `"down"`, or
    /// `"either"` (idle / no committed direction). Returns `undefined`
    /// for missing entities.
    #[wasm_bindgen(js_name = elevatorDirection)]
    #[must_use]
    pub fn elevator_direction(&self, elevator_ref: u64) -> Option<String> {
        self.inner
            .elevator_direction(u64_to_entity(elevator_ref))
            .map(|d| format_direction(d).to_string())
    }

    /// Whether `elevator_ref` is currently committed upward. Returns
    /// `undefined` for missing entities. A car that's `Either`-direction
    /// reports `false` here and `false` in `elevatorGoingDown`.
    #[wasm_bindgen(js_name = elevatorGoingUp)]
    #[must_use]
    pub fn elevator_going_up(&self, elevator_ref: u64) -> Option<bool> {
        self.inner.elevator_going_up(u64_to_entity(elevator_ref))
    }

    /// Whether `elevator_ref` is currently committed downward. Returns
    /// `undefined` for missing entities.
    #[wasm_bindgen(js_name = elevatorGoingDown)]
    #[must_use]
    pub fn elevator_going_down(&self, elevator_ref: u64) -> Option<bool> {
        self.inner.elevator_going_down(u64_to_entity(elevator_ref))
    }

    /// Total number of completed trips by `elevator_ref` since spawn.
    /// Returns `undefined` for missing entities.
    #[wasm_bindgen(js_name = elevatorMoveCount)]
    #[must_use]
    pub fn elevator_move_count(&self, elevator_ref: u64) -> Option<u64> {
        self.inner.elevator_move_count(u64_to_entity(elevator_ref))
    }

    /// Distance `elevator_ref` would travel if it began decelerating
    /// from its current velocity at its configured deceleration rate.
    /// Returns `undefined` for missing entities or stationary cars.
    #[wasm_bindgen(js_name = brakingDistance)]
    #[must_use]
    pub fn braking_distance(&self, elevator_ref: u64) -> Option<f64> {
        self.inner.braking_distance(u64_to_entity(elevator_ref))
    }

    /// Position of the next stop in `elevator_ref`'s destination queue,
    /// or current target if mid-trip. Returns `undefined` if the queue
    /// is empty or the entity is not an elevator.
    #[wasm_bindgen(js_name = futureStopPosition)]
    #[must_use]
    pub fn future_stop_position(&self, elevator_ref: u64) -> Option<f64> {
        self.inner.future_stop_position(u64_to_entity(elevator_ref))
    }

    /// Total number of currently-idle elevators across the simulation.
    /// "Idle" = phase is `Idle` (not parked at a stop with riders or
    /// repositioning).
    #[wasm_bindgen(js_name = idleElevatorCount)]
    #[must_use]
    pub fn idle_elevator_count(&self) -> u32 {
        u32::try_from(self.inner.idle_elevator_count()).unwrap_or(u32::MAX)
    }

    /// Whether `entity_ref` resolves to an elevator entity in the world.
    #[wasm_bindgen(js_name = isElevator)]
    #[must_use]
    pub fn is_elevator(&self, entity_ref: u64) -> bool {
        self.inner.is_elevator(u64_to_entity(entity_ref))
    }

    /// Whether `entity_ref` resolves to a rider entity in the world.
    #[wasm_bindgen(js_name = isRider)]
    #[must_use]
    pub fn is_rider(&self, entity_ref: u64) -> bool {
        self.inner.is_rider(u64_to_entity(entity_ref))
    }

    /// Whether `entity_ref` resolves to a stop entity in the world.
    #[wasm_bindgen(js_name = isStop)]
    #[must_use]
    pub fn is_stop(&self, entity_ref: u64) -> bool {
        self.inner.is_stop(u64_to_entity(entity_ref))
    }

    /// Whether `entity_ref` is currently disabled (out of service / not
    /// participating in dispatch). Returns `false` for nonexistent
    /// entities — distinguish via `isElevator` / `isStop` first.
    #[wasm_bindgen(js_name = isDisabled)]
    #[must_use]
    pub fn is_disabled(&self, entity_ref: u64) -> bool {
        self.inner.is_disabled(u64_to_entity(entity_ref))
    }

    // ── Destinations + recall ────────────────────────────────────────
    //
    // Direct control over a car's destination queue, bypassing dispatch.
    // Useful for scripted scenarios, NPC orchestration, or testing
    // strategy edge cases without driving via hall calls. Each method
    // takes a `u64` entity ref and returns a JS error on invalid inputs.

    /// Append `stop_ref` to the back of `elevator_ref`'s destination queue.
    /// Adjacent duplicates are suppressed (no-op if the queue's last
    /// entry already equals `stop_ref`).
    ///
    /// # Errors
    ///
    /// Returns a JS error if `elevator_ref` is not an elevator or
    /// `stop_ref` is not a stop.
    #[wasm_bindgen(js_name = pushDestination)]
    pub fn push_destination(&mut self, elevator_ref: u64, stop_ref: u64) -> WasmVoidResult {
        self.inner
            .push_destination(
                elevator_core::entity::ElevatorId::from(u64_to_entity(elevator_ref)),
                u64_to_entity(stop_ref),
            )
            .map_err(|e| format!("push_destination: {e}"))
            .into()
    }

    /// Insert `stop_ref` at the front of `elevator_ref`'s destination
    /// queue ("go here next"). On the next `AdvanceQueue` phase the car
    /// redirects to this new front if it differs from the current target.
    ///
    /// # Errors
    ///
    /// Returns a JS error if `elevator_ref` is not an elevator or
    /// `stop_ref` is not a stop.
    #[wasm_bindgen(js_name = pushDestinationFront)]
    pub fn push_destination_front(&mut self, elevator_ref: u64, stop_ref: u64) -> WasmVoidResult {
        self.inner
            .push_destination_front(
                elevator_core::entity::ElevatorId::from(u64_to_entity(elevator_ref)),
                u64_to_entity(stop_ref),
            )
            .map_err(|e| format!("push_destination_front: {e}"))
            .into()
    }

    /// Empty an elevator's destination queue. Any in-progress trip
    /// continues to its current target (the queue is the *future*
    /// schedule); to also abort the in-flight trip, call
    /// `abortMovement` after.
    ///
    /// # Errors
    ///
    /// Returns a JS error if `elevator_ref` is not an elevator.
    #[wasm_bindgen(js_name = clearDestinations)]
    pub fn clear_destinations(&mut self, elevator_ref: u64) -> WasmVoidResult {
        self.inner
            .clear_destinations(elevator_core::entity::ElevatorId::from(u64_to_entity(
                elevator_ref,
            )))
            .map_err(|e| format!("clear_destinations: {e}"))
            .into()
    }

    /// Abort the elevator's in-flight movement. The car decelerates to
    /// the nearest reachable stop; subsequent dispatch / queue entries
    /// resume from there.
    ///
    /// # Errors
    ///
    /// Returns a JS error if `elevator_ref` is not an elevator.
    #[wasm_bindgen(js_name = abortMovement)]
    pub fn abort_movement(&mut self, elevator_ref: u64) -> WasmVoidResult {
        self.inner
            .abort_movement(elevator_core::entity::ElevatorId::from(u64_to_entity(
                elevator_ref,
            )))
            .map_err(|e| format!("abort_movement: {e}"))
            .into()
    }

    /// Clear the queue and immediately recall the elevator to `stop_ref`.
    /// Equivalent to `clearDestinations` + `pushDestination(stop_ref)`,
    /// emitted as a single `ElevatorRecalled` event so games can render a
    /// distinct callout (lobby drill, fire-service recall, etc.).
    ///
    /// # Errors
    ///
    /// Returns a JS error if `elevator_ref` is not an elevator or
    /// `stop_ref` is not a stop.
    #[wasm_bindgen(js_name = recallTo)]
    pub fn recall_to(&mut self, elevator_ref: u64, stop_ref: u64) -> WasmVoidResult {
        self.inner
            .recall_to(
                elevator_core::entity::ElevatorId::from(u64_to_entity(elevator_ref)),
                u64_to_entity(stop_ref),
            )
            .map_err(|e| format!("recall_to: {e}"))
            .into()
    }

    /// Snapshot of `elevator_ref`'s destination queue as a `Vec<u64>` of
    /// stop refs in service order. Empty if the elevator has no queue or
    /// is missing.
    #[wasm_bindgen(js_name = destinationQueue)]
    #[must_use]
    pub fn destination_queue(&self, elevator_ref: u64) -> Vec<u64> {
        self.inner
            .destination_queue(elevator_core::entity::ElevatorId::from(u64_to_entity(
                elevator_ref,
            )))
            .map(|q| q.iter().copied().map(entity_to_u64).collect())
            .unwrap_or_default()
    }

    // ── Population queries (per-stop / per-elevator rider lists) ─────
    //
    // Returns flat `Vec<u64>` arrays of rider entity refs. Counts have
    // dedicated `*_count_at` accessors that return `u32` directly to
    // avoid the per-call allocation when the consumer only needs a size.

    /// Riders currently waiting at `stop_ref`. Returns an empty array
    /// for missing stops.
    #[wasm_bindgen(js_name = waitingAt)]
    #[must_use]
    pub fn waiting_at(&self, stop_ref: u64) -> Vec<u64> {
        self.inner
            .waiting_at(u64_to_entity(stop_ref))
            .map(entity_to_u64)
            .collect()
    }

    /// Riders settled / resident at `stop_ref` (e.g. tenants for a
    /// residential building's "home floor" model). Returns an empty
    /// array for missing stops.
    #[wasm_bindgen(js_name = residentsAt)]
    #[must_use]
    pub fn residents_at(&self, stop_ref: u64) -> Vec<u64> {
        self.inner
            .residents_at(u64_to_entity(stop_ref))
            .map(entity_to_u64)
            .collect()
    }

    /// Number of resident riders at `stop_ref`. Faster than counting
    /// `residentsAt` since it skips the array allocation.
    #[wasm_bindgen(js_name = residentCountAt)]
    #[must_use]
    pub fn resident_count_at(&self, stop_ref: u64) -> u32 {
        u32::try_from(self.inner.resident_count_at(u64_to_entity(stop_ref))).unwrap_or(u32::MAX)
    }

    /// Riders who abandoned the call at `stop_ref` (gave up waiting).
    /// Useful for rendering "frustrated" indicators or computing service
    /// quality metrics. Returns an empty array for missing stops.
    #[wasm_bindgen(js_name = abandonedAt)]
    #[must_use]
    pub fn abandoned_at(&self, stop_ref: u64) -> Vec<u64> {
        self.inner
            .abandoned_at(u64_to_entity(stop_ref))
            .map(entity_to_u64)
            .collect()
    }

    /// Number of abandoned riders at `stop_ref`. Faster than counting
    /// `abandonedAt`.
    #[wasm_bindgen(js_name = abandonedCountAt)]
    #[must_use]
    pub fn abandoned_count_at(&self, stop_ref: u64) -> u32 {
        u32::try_from(self.inner.abandoned_count_at(u64_to_entity(stop_ref))).unwrap_or(u32::MAX)
    }

    /// Riders currently aboard `elevator_ref`. Empty if the cab is
    /// empty or `elevator_ref` is not an elevator.
    #[wasm_bindgen(js_name = ridersOn)]
    #[must_use]
    pub fn riders_on(&self, elevator_ref: u64) -> Vec<u64> {
        self.inner
            .riders_on(u64_to_entity(elevator_ref))
            .iter()
            .copied()
            .map(entity_to_u64)
            .collect()
    }

    // ── Topology introspection ───────────────────────────────────────
    //
    // Read-only queries about the group / line / stop / elevator
    // relationship graph. Useful for UI panels that render the bank
    // structure or for tools that audit which lines serve which stops.

    /// Entity ids of all elevators currently assigned to `line_ref`.
    #[wasm_bindgen(js_name = elevatorsOnLine)]
    #[must_use]
    pub fn elevators_on_line(&self, line_ref: u64) -> Vec<u64> {
        self.inner
            .elevators_on_line(u64_to_entity(line_ref))
            .into_iter()
            .map(entity_to_u64)
            .collect()
    }

    /// Entity ids of every line in `group_id`. Empty if the group does
    /// not exist.
    #[wasm_bindgen(js_name = linesInGroup)]
    #[must_use]
    pub fn lines_in_group(&self, group_id: u32) -> Vec<u64> {
        self.inner
            .lines_in_group(elevator_core::ids::GroupId(group_id))
            .into_iter()
            .map(entity_to_u64)
            .collect()
    }

    /// Entity ids of every line that serves `stop_ref`. Useful for
    /// disambiguating sky-lobby calls served by multiple banks.
    #[wasm_bindgen(js_name = linesServingStop)]
    #[must_use]
    pub fn lines_serving_stop(&self, stop_ref: u64) -> Vec<u64> {
        self.inner
            .lines_serving_stop(u64_to_entity(stop_ref))
            .into_iter()
            .map(entity_to_u64)
            .collect()
    }

    /// Entity ids of every stop served by `line_ref`. Order is
    /// unspecified — sort by `positionAt` if you need axis order.
    #[wasm_bindgen(js_name = stopsServedByLine)]
    #[must_use]
    pub fn stops_served_by_line(&self, line_ref: u64) -> Vec<u64> {
        self.inner
            .stops_served_by_line(u64_to_entity(line_ref))
            .into_iter()
            .map(entity_to_u64)
            .collect()
    }

    /// Group ids of every group with a line that serves `stop_ref`.
    #[wasm_bindgen(js_name = groupsServingStop)]
    #[must_use]
    pub fn groups_serving_stop(&self, stop_ref: u64) -> Vec<u32> {
        self.inner
            .groups_serving_stop(u64_to_entity(stop_ref))
            .into_iter()
            .map(|g| g.0)
            .collect()
    }

    /// Line entity that `elevator_ref` runs on, or `0` (slotmap-null)
    /// if missing or not an elevator.
    #[wasm_bindgen(js_name = lineForElevator)]
    #[must_use]
    pub fn line_for_elevator(&self, elevator_ref: u64) -> u64 {
        self.inner
            .line_for_elevator(u64_to_entity(elevator_ref))
            .map_or(0, entity_to_u64)
    }

    /// Entity ids of every line in the simulation, across all groups.
    #[wasm_bindgen(js_name = allLines)]
    #[must_use]
    pub fn all_lines(&self) -> Vec<u64> {
        self.inner
            .all_lines()
            .into_iter()
            .map(entity_to_u64)
            .collect()
    }

    /// Total number of lines across all groups.
    #[wasm_bindgen(js_name = lineCount)]
    #[must_use]
    pub fn line_count(&self) -> u32 {
        u32::try_from(self.inner.line_count()).unwrap_or(u32::MAX)
    }

    // ── Riders + lifecycle ───────────────────────────────────────────

    /// Despawn a rider mid-flight. The rider is ejected from any
    /// boarding car and dropped from the world.
    ///
    /// # Errors
    ///
    /// Returns a JS error if `rider_ref` is not a rider entity.
    #[wasm_bindgen(js_name = despawnRider)]
    pub fn despawn_rider(&mut self, rider_ref: u64) -> WasmVoidResult {
        self.inner
            .despawn_rider(elevator_core::entity::RiderId::from(u64_to_entity(
                rider_ref,
            )))
            .map_err(|e| format!("despawn_rider: {e}"))
            .into()
    }

    /// Attach an opaque tag to a rider. The engine doesn't interpret
    /// the value — JS consumers use it to correlate a `RiderId` with an
    /// external id (e.g. a game-side sim id) without maintaining a
    /// parallel `Map<RiderId, u32>`. Pass `0n` to clear (`0` is the
    /// reserved "untagged" sentinel).
    ///
    /// # Errors
    ///
    /// Returns a JS error if `rider_ref` is not a rider entity.
    #[wasm_bindgen(js_name = setRiderTag)]
    pub fn set_rider_tag(&mut self, rider_ref: u64, tag: u64) -> WasmVoidResult {
        self.inner
            .set_rider_tag(
                elevator_core::entity::RiderId::from(u64_to_entity(rider_ref)),
                tag,
            )
            .map_err(|e| format!("set_rider_tag: {e}"))
            .into()
    }

    /// Read the opaque tag attached to a rider. Returns `0n` for the
    /// default "untagged" state.
    ///
    /// # Errors
    ///
    /// Returns a JS error if `rider_ref` is not a rider entity.
    #[wasm_bindgen(js_name = riderTag)]
    pub fn rider_tag(&self, rider_ref: u64) -> WasmU64Result {
        self.inner
            .rider_tag(elevator_core::entity::RiderId::from(u64_to_entity(
                rider_ref,
            )))
            .map_err(|e| format!("rider_tag: {e}"))
            .into()
    }

    /// Step the simulation forward up to `max_ticks` ticks, stopping
    /// early if the world becomes "quiet" (no in-flight riders, no
    /// pending hall calls, all cars idle). Returns the number of ticks
    /// actually run.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the world fails to quiet within `max_ticks`
    /// (infinite-loop guard).
    #[wasm_bindgen(js_name = runUntilQuiet)]
    pub fn run_until_quiet(&mut self, max_ticks: u64) -> WasmU64Result {
        self.inner
            .run_until_quiet(max_ticks)
            .map_err(|ticks| format!("run_until_quiet: world did not quiet within {ticks} ticks"))
            .into()
    }

    // ── Dispatch metadata ────────────────────────────────────────────

    /// Remove the reposition strategy from `group_id`. Idle elevators
    /// stay where they parked instead of moving toward a target.
    #[wasm_bindgen(js_name = removeReposition)]
    pub fn remove_reposition(&mut self, group_id: u32) {
        self.inner
            .remove_reposition(elevator_core::ids::GroupId(group_id));
    }

    // ── Routes + rider lifecycle ─────────────────────────────────────
    //
    // Per-rider mutations (reroute, settle, access) and read-only graph
    // queries (reachability, transfer points). The route-mutating
    // overloads that take a full `Route` value (`set_rider_route`,
    // `reroute_rider`, `shortest_route`) are intentionally deferred —
    // they need a `Route` DTO, which involves multi-stop sequences and
    // cost metadata. Tracked as todo:PR-Routes-DTO.

    /// Replace a rider's destination with `new_destination`. Re-routes
    /// in-flight riders to head to the new stop after their current leg.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the rider or destination does not exist.
    #[wasm_bindgen(js_name = reroute)]
    pub fn reroute(&mut self, rider_ref: u64, new_destination_ref: u64) -> WasmVoidResult {
        let rider_eid = u64_to_entity(rider_ref);
        // The unified `Simulation::reroute` takes a `Route`; build a
        // single-leg direct route from the rider's current stop. The
        // multi-leg variants are exposed separately (see below).
        let Some(origin) = self
            .inner
            .world()
            .rider(rider_eid)
            .and_then(elevator_core::components::Rider::current_stop)
        else {
            return Err("reroute: rider has no current stop".to_string()).into();
        };
        let route = elevator_core::components::Route::direct(
            origin,
            u64_to_entity(new_destination_ref),
            elevator_core::ids::GroupId(0),
        );
        self.inner
            .reroute(elevator_core::entity::RiderId::from(rider_eid), route)
            .map_err(|e| format!("reroute: {e}"))
            .into()
    }

    /// Mark a rider as settled at their current stop. Settled riders
    /// move from the waiting/riding pools into the resident pool —
    /// useful for "tenants who arrived home" semantics.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the rider does not exist.
    #[wasm_bindgen(js_name = settleRider)]
    pub fn settle_rider(&mut self, rider_ref: u64) -> WasmVoidResult {
        self.inner
            .settle_rider(elevator_core::entity::RiderId::from(u64_to_entity(
                rider_ref,
            )))
            .map_err(|e| format!("settle_rider: {e}"))
            .into()
    }

    /// Replace a rider's allowed-stops set. Empty array clears the
    /// restriction (rider can use any stop).
    ///
    /// # Errors
    ///
    /// Returns a JS error if the rider does not exist.
    #[wasm_bindgen(js_name = setRiderAccess)]
    pub fn set_rider_access(
        &mut self,
        rider_ref: u64,
        allowed_stop_refs: Vec<u64>,
    ) -> WasmVoidResult {
        (|| -> Result<(), String> {
            let allowed: std::collections::HashSet<EntityId> =
                allowed_stop_refs.into_iter().map(u64_to_entity).collect();
            self.inner
                .set_rider_access(u64_to_entity(rider_ref), allowed)
                .map_err(|e| format!("set_rider_access: {e}"))
        })()
        .into()
    }

    /// Stops reachable from `from_stop` via the line-graph (BFS through
    /// shared elevators). Excludes `from_stop` itself.
    #[wasm_bindgen(js_name = reachableStopsFrom)]
    #[must_use]
    pub fn reachable_stops_from(&self, from_stop_ref: u64) -> Vec<u64> {
        self.inner
            .reachable_stops_from(u64_to_entity(from_stop_ref))
            .into_iter()
            .map(entity_to_u64)
            .collect()
    }

    /// Stops where multiple lines intersect — the natural transfer
    /// candidates for multi-leg routes (e.g. sky-lobby in a tall
    /// building, transfer station in a transit network).
    #[wasm_bindgen(js_name = transferPoints)]
    #[must_use]
    pub fn transfer_points(&self) -> Vec<u64> {
        self.inner
            .transfer_points()
            .into_iter()
            .map(entity_to_u64)
            .collect()
    }

    /// Compute the shortest multi-leg route between two stops using the
    /// line-graph topology. Returns `undefined` if no path exists.
    ///
    /// The returned `RouteDto` is a flat list of stops (origin first,
    /// destination last) — adjacent pairs are individual legs.
    #[wasm_bindgen(js_name = shortestRoute)]
    #[must_use]
    pub fn shortest_route(&self, from_stop_ref: u64, to_stop_ref: u64) -> Option<dto::RouteDto> {
        self.inner
            .shortest_route(u64_to_entity(from_stop_ref), u64_to_entity(to_stop_ref))
            .map(dto::RouteDto::from)
    }

    /// Replace a rider's remaining route with a single-leg route via
    /// `group_id`. Useful when the consumer already knows the group
    /// the rider should use (e.g. an express bank).
    ///
    /// # Errors
    ///
    /// Returns a JS error if the rider does not exist.
    #[wasm_bindgen(js_name = setRiderRouteDirect)]
    pub fn set_rider_route_direct(
        &mut self,
        rider_ref: u64,
        from_stop_ref: u64,
        to_stop_ref: u64,
        group_id: u32,
    ) -> WasmVoidResult {
        (|| -> Result<(), String> {
            let route = elevator_core::components::Route::direct(
                u64_to_entity(from_stop_ref),
                u64_to_entity(to_stop_ref),
                elevator_core::ids::GroupId(group_id),
            );
            self.inner
                .reroute(
                    elevator_core::entity::RiderId::from(u64_to_entity(rider_ref)),
                    route,
                )
                .map_err(|e| format!("set_rider_route_direct: {e}"))
        })()
        .into()
    }

    /// Replace a rider's remaining route with a multi-leg route built
    /// from `shortest_route(rider's current_stop -> to_stop)`.
    /// Convenience wrapper for the common "send this rider here" case.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the rider does not exist, has no current
    /// stop, or no route to `to_stop` exists.
    #[wasm_bindgen(js_name = setRiderRouteShortest)]
    pub fn set_rider_route_shortest(&mut self, rider_ref: u64, to_stop_ref: u64) -> WasmVoidResult {
        (|| -> Result<(), String> {
            let rider_eid = u64_to_entity(rider_ref);
            let to_eid = u64_to_entity(to_stop_ref);
            let from_eid = self
                .inner
                .world()
                .rider(rider_eid)
                .and_then(elevator_core::components::Rider::current_stop)
                .ok_or_else(|| "set_rider_route_shortest: rider has no current stop".to_owned())?;
            let route = self.inner.shortest_route(from_eid, to_eid).ok_or_else(|| {
                "set_rider_route_shortest: no route between rider's stop and to_stop".to_owned()
            })?;
            self.inner
                .reroute(elevator_core::entity::RiderId::from(rider_eid), route)
                .map_err(|e| format!("set_rider_route_shortest: {e}"))
        })()
        .into()
    }

    /// Give a `Resident` rider a new single-leg route via `group_id`,
    /// transitioning them back to `Waiting`. The route's first leg origin
    /// must match the rider's current stop, so callers must know which
    /// stop the resident is at.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the rider does not exist, is not in
    /// `Resident` phase, or the route's origin does not match the
    /// rider's current stop.
    #[wasm_bindgen(js_name = rerouteRiderDirect)]
    pub fn reroute_rider_direct(
        &mut self,
        rider_ref: u64,
        from_stop_ref: u64,
        to_stop_ref: u64,
        group_id: u32,
    ) -> WasmVoidResult {
        (|| -> Result<(), String> {
            let route = elevator_core::components::Route::direct(
                u64_to_entity(from_stop_ref),
                u64_to_entity(to_stop_ref),
                elevator_core::ids::GroupId(group_id),
            );
            self.inner
                .reroute(
                    elevator_core::entity::RiderId::from(u64_to_entity(rider_ref)),
                    route,
                )
                .map_err(|e| format!("reroute_rider_direct: {e}"))
        })()
        .into()
    }

    /// Give a `Resident` rider a multi-leg route to `to_stop` built from
    /// `shortest_route(rider's current_stop -> to_stop)`, transitioning
    /// them back to `Waiting`.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the rider does not exist, is not in
    /// `Resident` phase, has no current stop, or no route exists.
    #[wasm_bindgen(js_name = rerouteRiderShortest)]
    pub fn reroute_rider_shortest(&mut self, rider_ref: u64, to_stop_ref: u64) -> WasmVoidResult {
        (|| -> Result<(), String> {
            let rider_eid = u64_to_entity(rider_ref);
            let to_eid = u64_to_entity(to_stop_ref);
            let from_eid = self
                .inner
                .world()
                .rider(rider_eid)
                .and_then(elevator_core::components::Rider::current_stop)
                .ok_or_else(|| "reroute_rider_shortest: rider has no current stop".to_owned())?;
            let route = self.inner.shortest_route(from_eid, to_eid).ok_or_else(|| {
                "reroute_rider_shortest: no route between rider's stop and to_stop".to_owned()
            })?;
            self.inner
                .reroute(elevator_core::entity::RiderId::from(rider_eid), route)
                .map_err(|e| format!("reroute_rider_shortest: {e}"))
        })()
        .into()
    }

    // ── Per-elevator setters + lifecycle ─────────────────────────────
    //
    // Per-elevator parameter setters that sit alongside the existing
    // `*All` aggregate sweeps. The aggregate variants stay because the
    // playground "Tweak parameters" drawer uses them; per-elevator
    // versions are for consumers that want granular control.

    /// Set the acceleration rate (distance/tick²) for a single elevator.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the elevator does not exist or
    /// `acceleration` is non-positive / non-finite.
    #[wasm_bindgen(js_name = setAcceleration)]
    pub fn set_acceleration(&mut self, elevator_ref: u64, acceleration: f64) -> WasmVoidResult {
        self.inner
            .set_acceleration(
                elevator_core::entity::ElevatorId::from(u64_to_entity(elevator_ref)),
                acceleration,
            )
            .map_err(|e| format!("set_acceleration: {e}"))
            .into()
    }

    /// Set the deceleration rate (distance/tick²) for a single elevator.
    ///
    /// # Errors
    ///
    /// Returns a JS error if the elevator does not exist or
    /// `deceleration` is non-positive / non-finite.
    #[wasm_bindgen(js_name = setDeceleration)]
    pub fn set_deceleration(&mut self, elevator_ref: u64, deceleration: f64) -> WasmVoidResult {
        self.inner
            .set_deceleration(
                elevator_core::entity::ElevatorId::from(u64_to_entity(elevator_ref)),
                deceleration,
            )
            .map_err(|e| format!("set_deceleration: {e}"))
            .into()
    }

    /// Set how many ticks the per-rider arrival log retains. Global
    /// setting; higher values trade memory for longer post-trip
    /// queries.
    #[wasm_bindgen(js_name = setArrivalLogRetentionTicks)]
    pub fn set_arrival_log_retention_ticks(&mut self, retention_ticks: u64) {
        self.inner.set_arrival_log_retention_ticks(retention_ticks);
    }

    /// Re-enable a previously-disabled entity (elevator or stop).
    ///
    /// # Errors
    ///
    /// Returns a JS error if `entity_ref` does not exist.
    #[wasm_bindgen(js_name = enable)]
    pub fn enable(&mut self, entity_ref: u64) -> WasmVoidResult {
        self.inner
            .enable(u64_to_entity(entity_ref))
            .map_err(|e| format!("enable: {e}"))
            .into()
    }

    /// Disable an entity (elevator or stop). Disabled elevators eject
    /// their riders and are excluded from dispatch; disabled stops
    /// invalidate routes that reference them.
    ///
    /// # Errors
    ///
    /// Returns a JS error if `entity_ref` does not exist.
    #[wasm_bindgen(js_name = disable)]
    pub fn disable(&mut self, entity_ref: u64) -> WasmVoidResult {
        self.inner
            .disable(u64_to_entity(entity_ref))
            .map_err(|e| format!("disable: {e}"))
            .into()
    }

    // ── Tagging + tagged metrics ─────────────────────────────────────
    //
    // Attach tags to entities for grouped metrics queries (e.g. "tower"
    // vs "annex" elevators, "weekday" vs "weekend" rider flows). The
    // per-tag aggregates surface via `metricsForTag`.

    /// Attach `tag` to `entity_ref`.
    ///
    /// # Errors
    ///
    /// Returns a JS error if `entity_ref` does not exist.
    #[wasm_bindgen(js_name = tagEntity)]
    pub fn tag_entity(&mut self, entity_ref: u64, tag: String) -> WasmVoidResult {
        self.inner
            .tag_entity(u64_to_entity(entity_ref), tag)
            .map_err(|e| format!("tag_entity: {e}"))
            .into()
    }

    /// Remove `tag` from `entity_ref`. No-op if the entity wasn't tagged.
    #[wasm_bindgen(js_name = untagEntity)]
    pub fn untag_entity(&mut self, entity_ref: u64, tag: &str) {
        self.inner.untag_entity(u64_to_entity(entity_ref), tag);
    }

    /// Every tag currently registered in the simulation.
    #[wasm_bindgen(js_name = allTags)]
    #[must_use]
    pub fn all_tags(&self) -> Vec<String> {
        self.inner
            .all_tags()
            .into_iter()
            .map(String::from)
            .collect()
    }

    /// Aggregate metrics for `tag`. Returns `undefined` if no riders
    /// carrying the tag have been recorded yet.
    ///
    /// Wait times in the returned `TaggedMetricDto` are in **ticks** —
    /// multiply by `dt` for real-time seconds.
    #[wasm_bindgen(js_name = metricsForTag)]
    #[must_use]
    pub fn metrics_for_tag(&self, tag: &str) -> Option<dto::TaggedMetricDto> {
        self.inner
            .metrics_for_tag(tag)
            .map(dto::TaggedMetricDto::from)
    }

    // ── Stop lookup + phase / direction queries ──────────────────────

    /// Count elevators currently in the given phase. `phase` is one of:
    /// `"idle"`, `"door-opening"`, `"loading"`, `"door-closing"`,
    /// `"stopped"`. The two with payload variants
    /// (`MovingToStop(EntityId)` and `Repositioning(EntityId)`) are
    /// not exposed here — use `iterRepositioningElevators` or the per-
    /// elevator phase via the snapshot for those.
    ///
    /// # Errors
    ///
    /// Returns a JS error if `phase` is not one of the supported labels.
    #[wasm_bindgen(js_name = elevatorsInPhase)]
    pub fn elevators_in_phase(&self, phase: &str) -> WasmU32Result {
        (|| -> Result<u32, String> {
            use elevator_core::prelude::ElevatorPhase;
            let p = match phase {
                "idle" => ElevatorPhase::Idle,
                "door-opening" => ElevatorPhase::DoorOpening,
                "loading" => ElevatorPhase::Loading,
                "door-closing" => ElevatorPhase::DoorClosing,
                "stopped" => ElevatorPhase::Stopped,
                other => {
                    return Err(format!(
                        "phase must be one of idle / door-opening / loading / door-closing / stopped — got {other:?}"
                    ));
                }
            };
            Ok(u32::try_from(self.inner.elevators_in_phase(p)).unwrap_or(u32::MAX))
        })().into()
    }

    /// Resolve a config-time `StopId` (the small `u32` from the RON
    /// config) to its runtime `EntityId`. Returns `0` (slotmap-null)
    /// for unknown ids.
    #[wasm_bindgen(js_name = stopEntity)]
    #[must_use]
    pub fn stop_entity(&self, stop_id: u32) -> u64 {
        self.inner
            .stop_entity(elevator_core::prelude::StopId(stop_id))
            .map_or(0, entity_to_u64)
    }

    /// Snapshot of the config-time `StopId` → runtime `EntityId` map.
    /// Returns a flat `[stop_id_as_u64, entity_id, ...]` array — the
    /// `StopId` is zero-extended into the same `u64` slot the entity
    /// uses. Pair count is `array.length / 2`.
    #[wasm_bindgen(js_name = stopLookupIter)]
    #[must_use]
    pub fn stop_lookup_iter(&self) -> Vec<u64> {
        self.inner
            .stop_lookup_iter()
            .flat_map(|(stop_id, entity)| [u64::from(stop_id.0), entity_to_u64(*entity)])
            .collect()
    }

    /// Entity ids of every elevator currently repositioning (heading to
    /// a parking stop with no rider obligation).
    #[wasm_bindgen(js_name = iterRepositioningElevators)]
    #[must_use]
    pub fn iter_repositioning_elevators(&self) -> Vec<u64> {
        self.inner
            .iter_repositioning_elevators()
            .map(entity_to_u64)
            .collect()
    }

    /// Up/down split of riders currently waiting at `stop_ref`. Returns
    /// `[up_count, down_count]`; both `0` for missing stops.
    #[wasm_bindgen(js_name = waitingDirectionCountsAt)]
    #[must_use]
    pub fn waiting_direction_counts_at(&self, stop_ref: u64) -> Vec<u32> {
        let (up, down) = self
            .inner
            .waiting_direction_counts_at(u64_to_entity(stop_ref));
        vec![
            u32::try_from(up).unwrap_or(u32::MAX),
            u32::try_from(down).unwrap_or(u32::MAX),
        ]
    }

    /// Per-line waiting counts at `stop_ref`. Returns a flat array of
    /// alternating `[line_ref, count, line_ref, count, ...]` pairs.
    /// `count` is encoded as `u64` for symmetry with the entity refs.
    #[wasm_bindgen(js_name = waitingCountsByLineAt)]
    #[must_use]
    pub fn waiting_counts_by_line_at(&self, stop_ref: u64) -> Vec<u64> {
        self.inner
            .waiting_counts_by_line_at(u64_to_entity(stop_ref))
            .into_iter()
            .flat_map(|(line, count)| [entity_to_u64(line), u64::from(count)])
            .collect()
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
    pub fn set_max_speed_all(&mut self, speed: f64) -> WasmVoidResult {
        (|| -> Result<(), String> {
            let ids: Vec<_> = self
                .inner
                .world()
                .iter_elevators()
                .map(|(eid, _, _)| elevator_core::entity::ElevatorId::from(eid))
                .collect();
            for id in ids {
                self.inner
                    .set_max_speed(id, speed)
                    .map_err(|e| format!("set_max_speed: {e}"))?;
            }
            Ok(())
        })()
        .into()
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
    pub fn set_weight_capacity_all(&mut self, capacity: f64) -> WasmVoidResult {
        (|| -> Result<(), String> {
            let ids: Vec<_> = self
                .inner
                .world()
                .iter_elevators()
                .map(|(eid, _, _)| elevator_core::entity::ElevatorId::from(eid))
                .collect();
            for id in ids {
                self.inner
                    .set_weight_capacity(id, capacity)
                    .map_err(|e| format!("set_weight_capacity: {e}"))?;
            }
            Ok(())
        })()
        .into()
    }

    /// Set `door_open_ticks` (dwell duration) on a single elevator.
    ///
    /// Takes effect on the **next** door cycle — an in-progress dwell
    /// completes its original timing to avoid visual glitches. See
    /// [`Simulation::set_door_open_ticks`](elevator_core::sim::Simulation::set_door_open_ticks).
    ///
    /// # Errors
    ///
    /// Surfaces the underlying `SimError` if `elevator_ref` is unknown
    /// or the value is invalid (zero `ticks`).
    #[wasm_bindgen(js_name = setDoorOpenTicks)]
    pub fn set_door_open_ticks(&mut self, elevator_ref: u64, ticks: u32) -> WasmVoidResult {
        self.inner
            .set_door_open_ticks(
                elevator_core::entity::ElevatorId::from(u64_to_entity(elevator_ref)),
                ticks,
            )
            .into()
    }

    /// Set `door_transition_ticks` (open/close transition duration) on
    /// a single elevator. Takes effect on the next door cycle.
    ///
    /// # Errors
    ///
    /// Surfaces the underlying `SimError` if `elevator_ref` is unknown
    /// or the value is invalid (zero `ticks`).
    #[wasm_bindgen(js_name = setDoorTransitionTicks)]
    pub fn set_door_transition_ticks(&mut self, elevator_ref: u64, ticks: u32) -> WasmVoidResult {
        self.inner
            .set_door_transition_ticks(
                elevator_core::entity::ElevatorId::from(u64_to_entity(elevator_ref)),
                ticks,
            )
            .into()
    }

    /// Set `max_speed` (m/s) on a single elevator. Applied immediately.
    ///
    /// # Errors
    ///
    /// Surfaces the underlying `SimError` if `elevator_ref` is unknown
    /// or `speed` is non-positive / non-finite.
    #[wasm_bindgen(js_name = setMaxSpeed)]
    pub fn set_max_speed(&mut self, elevator_ref: u64, speed: f64) -> WasmVoidResult {
        self.inner
            .set_max_speed(
                elevator_core::entity::ElevatorId::from(u64_to_entity(elevator_ref)),
                speed,
            )
            .into()
    }

    /// Set `weight_capacity` (kg) on a single elevator. A new cap
    /// below `current_load` leaves the car temporarily overweight
    /// (no riders ejected); subsequent boarding rejects further
    /// additions.
    ///
    /// # Errors
    ///
    /// Surfaces the underlying `SimError` if `elevator_ref` is unknown
    /// or `capacity` is non-positive / non-finite.
    #[wasm_bindgen(js_name = setWeightCapacity)]
    pub fn set_weight_capacity(&mut self, elevator_ref: u64, capacity: f64) -> WasmVoidResult {
        self.inner
            .set_weight_capacity(
                elevator_core::entity::ElevatorId::from(u64_to_entity(elevator_ref)),
                capacity,
            )
            .into()
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
    pub fn set_door_open_ticks_all(&mut self, ticks: u32) -> WasmVoidResult {
        (|| -> Result<(), String> {
            let ids: Vec<_> = self
                .inner
                .world()
                .iter_elevators()
                .map(|(eid, _, _)| elevator_core::entity::ElevatorId::from(eid))
                .collect();
            for id in ids {
                self.inner
                    .set_door_open_ticks(id, ticks)
                    .map_err(|e| format!("set_door_open_ticks: {e}"))?;
            }
            Ok(())
        })()
        .into()
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
    pub fn set_door_transition_ticks_all(&mut self, ticks: u32) -> WasmVoidResult {
        (|| -> Result<(), String> {
            let ids: Vec<_> = self
                .inner
                .world()
                .iter_elevators()
                .map(|(eid, _, _)| elevator_core::entity::ElevatorId::from(eid))
                .collect();
            for id in ids {
                self.inner
                    .set_door_transition_ticks(id, ticks)
                    .map_err(|e| format!("set_door_transition_ticks: {e}"))?;
            }
            Ok(())
        })()
        .into()
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
