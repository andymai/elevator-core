//! # elevator-ffi
//!
//! C ABI wrapper around [`elevator_core`] for native interop, intended for
//! Unity (P/Invoke), C console harnesses, and any other non-Rust consumer
//! that can call `extern "C"` functions.
//!
//! ## Contract
//!
//! - **ABI version:** every public symbol is part of ABI version
//!   [`EV_ABI_VERSION`]. Consumers should call [`ev_abi_version`] at
//!   startup and refuse to proceed if the value does not match the
//!   version they were compiled against.
//! - **Thread-safety:** each [`EvSim`] handle is **not** `Sync`. Callers
//!   must serialize all calls on a single handle.
//! - **Ownership:** handles are owned by the caller. Create with
//!   [`ev_sim_create`] and destroy with [`ev_sim_destroy`].
//! - **Frame snapshots:** [`ev_sim_frame`] returns pointers into an
//!   internal buffer owned by the handle. Those pointers remain valid
//!   **only until the next call to [`ev_sim_frame`] on the same handle**.
//! - **Errors:** non-`Ok` statuses set a thread-local description that
//!   can be fetched via [`ev_last_error`]; the pointer it returns is
//!   valid only until the next FFI call on the same thread.
//! - **Panics:** every FFI function wraps its body in
//!   [`std::panic::catch_unwind`]; a Rust panic surfaces as
//!   `EvStatus_Panic` (or null for constructors).

#![allow(unsafe_code)]

mod events_encode;

use std::cell::RefCell;
use std::ffi::{CStr, CString};
use std::fmt::Display;
use std::os::raw::c_char;
use std::panic::{AssertUnwindSafe, catch_unwind};
use std::sync::Mutex;
use std::time::Duration;

use elevator_core::builder::SimulationBuilder;
use elevator_core::components::{Direction, ElevatorPhase, RiderPhase, Velocity};
use elevator_core::config::SimConfig;
use elevator_core::dispatch::{
    BuiltinStrategy, DestinationDispatch, EtdDispatch, LookDispatch, NearestCarDispatch,
    RsrDispatch, ScanDispatch,
};
use elevator_core::door::DoorState;
use elevator_core::entity::{ElevatorId, EntityId, RiderId};
use elevator_core::ids::GroupId;
use elevator_core::sim::Simulation;
use slotmap::{Key, KeyData};

/// Current ABI version. Bumped for any breaking change to the C layout.
///
/// **v5:** [`EvEvent`] gained a `tag` field carrying the opaque
/// per-rider tag (`Rider.tag`) for every rider-bearing event variant.
/// Consumers that want the back-pointer pattern this enables (set via
/// [`ev_sim_set_rider_tag`], read on [`ev_event_kind::RIDER_EXITED`] /
/// [`ev_event_kind::RIDER_DESPAWNED`] without re-querying a freed
/// rider) need to rebuild against v5.
///
/// **v4** widened [`EvEvent`] from 7 fields to 14 to carry the full
/// payload of every core `Event` variant in a single drain pass. The
/// kind discriminator was extended from 9 known kinds to 49.
pub const EV_ABI_VERSION: u32 = 5;

/// Return the ABI version compiled into this shared library.
#[unsafe(no_mangle)]
pub const extern "C" fn ev_abi_version() -> u32 {
    EV_ABI_VERSION
}

// ── Status / error reporting ──────────────────────────────────────────────

/// Status code returned by every FFI entrypoint.
#[repr(C)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EvStatus {
    /// Operation succeeded.
    Ok = 0,
    /// A required pointer argument was null.
    NullArg = 1,
    /// A C string argument was not valid UTF-8.
    InvalidUtf8 = 2,
    /// The config file could not be read from disk.
    ConfigLoad = 3,
    /// The config file failed to parse as RON.
    ConfigParse = 4,
    /// [`SimulationBuilder::build`] returned an error.
    BuildFailed = 5,
    /// The requested entity, group, or resource was not found.
    NotFound = 6,
    /// An argument was structurally valid but semantically rejected.
    InvalidArg = 7,
    /// A Rust panic was caught at the FFI boundary.
    Panic = 99,
}

thread_local! {
    static LAST_ERROR: RefCell<Option<CString>> = const { RefCell::new(None) };
}

fn set_last_error(e: impl Display) {
    let msg = CString::new(e.to_string())
        .unwrap_or_else(|_| CString::new("error message contained NUL").unwrap_or_default());
    LAST_ERROR.with(|slot| {
        *slot.borrow_mut() = Some(msg);
    });
}

fn clear_last_error() {
    LAST_ERROR.with(|slot| {
        *slot.borrow_mut() = None;
    });
}

/// Return a pointer to a null-terminated description of the last error on
/// this thread, or null if no error has been recorded.
///
/// The returned pointer is valid until the next FFI call on this thread.
#[unsafe(no_mangle)]
pub extern "C" fn ev_last_error() -> *const c_char {
    LAST_ERROR.with(|slot| {
        slot.borrow()
            .as_ref()
            .map_or(std::ptr::null(), |s| s.as_ptr())
    })
}

// ── Handle ────────────────────────────────────────────────────────────────

/// Opaque simulation handle. Layout is not part of the ABI.
pub struct EvSim {
    sim: Simulation,
    frame: FrameBuffer,
    /// Events drained from [`Simulation::drain_events`] but not yet
    /// handed out via [`ev_sim_drain_events`]. Buffering here
    /// guarantees no event is ever dropped just because the caller's
    /// per-call buffer was too small — overflow parks in this queue
    /// and is delivered on the next drain call.
    pending_events: std::collections::VecDeque<EvEvent>,
    /// Log messages produced during [`ev_sim_step`] but not yet
    /// handed out via [`ev_drain_log_messages`]. Mirrors the side-channel
    /// callback installed by [`ev_set_log_callback`] so consumers that
    /// cannot register a function pointer (e.g. `GameMaker`) can poll
    /// instead.
    pending_log_messages: std::collections::VecDeque<LogRecord>,
    /// Backs the `msg_ptr` slices returned by the most recent
    /// [`ev_drain_log_messages`] call. Replaced (and dropped) on every
    /// subsequent drain — pointers from a prior call go invalid then,
    /// matching the [`ev_sim_frame`] borrow rule.
    log_drain_buf: Vec<CString>,
    /// `true` once a polling log API ([`ev_drain_log_messages`] or
    /// [`ev_pending_log_message_count`]) has been called. Until then
    /// [`forward_pending_events`] skips the per-step push so
    /// callback-only consumers (Unity, Godot) keep their pre-PR
    /// behaviour of zero per-handle log buffering. Lazy opt-in: a
    /// caller that touches the polling API once is taken to want the
    /// stream from then on.
    log_polling_active: bool,
}

/// Internal per-handle log record. Owns its message string; converted
/// to [`EvLogMessage`] (borrowed pointer) at drain time.
struct LogRecord {
    level: u8,
    ts_ns: i64,
    msg: CString,
}

/// Log callback type. Severity follows syslog-style convention (0 = trace,
/// 1 = debug, 2 = info, 3 = warn, 4 = error).
pub type EvLogFn = unsafe extern "C" fn(level: u8, msg: *const c_char);

/// A single log message returned by [`ev_drain_log_messages`].
///
/// `msg_ptr` borrows from an internal buffer owned by the handle and
/// remains valid until the next [`ev_drain_log_messages`] call on the
/// same handle. The bytes are UTF-8 and are **not** null-terminated;
/// use `msg_len` to bound the read.
#[repr(C)]
#[derive(Debug, Clone, Copy, elevator_layout_derive::MultiHostLayout)]
pub struct EvLogMessage {
    /// Severity level (0 = trace, 1 = debug, 2 = info, 3 = warn, 4 = error).
    pub level: u8,
    /// Wall-clock timestamp at message ingestion, in nanoseconds since
    /// the Unix epoch. `0` if the host clock is unavailable.
    pub ts_ns: i64,
    /// Pointer to UTF-8 message bytes. Borrowed; not null-terminated.
    pub msg_ptr: *const u8,
    /// Length of `msg_ptr` in bytes.
    pub msg_len: u32,
}

static LOG_CALLBACK: Mutex<Option<EvLogFn>> = Mutex::new(None);

/// Install (or clear, by passing null) a global log callback.
///
/// All subsequent [`ev_sim_step`] calls drain `sim.pending_events()` and
/// forward a debug-formatted message per event.
///
/// # Safety
///
/// The caller guarantees that, while the callback remains installed, the
/// function pointer is valid to invoke.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_set_log_callback(cb: Option<EvLogFn>) {
    if let Ok(mut slot) = LOG_CALLBACK.lock() {
        *slot = cb;
    }
}

// ── Repr-C view structs ───────────────────────────────────────────────────

/// View of a single elevator at the current tick.
#[repr(C)]
#[derive(Debug, Clone, Copy, elevator_layout_derive::MultiHostLayout)]
pub struct EvElevatorView {
    /// Elevator entity id (raw slotmap `as_ffi()`).
    pub entity_id: u64,
    /// Group id this elevator belongs to (`u32::MAX` if orphaned).
    pub group_id: u32,
    /// Line (shaft/tether) entity id.
    pub line_id: u64,
    /// [`ElevatorPhase`] tag: 0 `Idle`, 1 `MovingToStop`, 2 `Repositioning`,
    /// 3 `DoorOpening`, 4 `Loading`, 5 `DoorClosing`, 6 `Stopped`.
    pub phase: u8,
    /// Position along the shaft axis.
    pub position: f64,
    /// Instantaneous velocity (+ up, - down).
    pub velocity: f64,
    /// Current stop (0 if not at a stop / moving).
    pub current_stop_id: u64,
    /// Target stop (0 if idle).
    pub target_stop_id: u64,
    /// Number of riders on board.
    pub occupancy: u32,
    /// Weight capacity in kg.
    pub capacity_kg: f64,
    /// [`DoorState`] tag: 0 `Closed`, 1 `Opening`, 2 `Open`, 3 `Closing`.
    pub door_state: u8,
    /// Direction indicator: 1 if the "going up" lamp is lit, 0 otherwise.
    pub going_up: u8,
    /// Direction indicator: 1 if the "going down" lamp is lit, 0 otherwise.
    pub going_down: u8,
}

/// View of a single stop at the current tick.
#[repr(C)]
#[derive(Debug, Clone, Copy, elevator_layout_derive::MultiHostLayout)]
pub struct EvStopView {
    /// Stop entity id.
    pub entity_id: u64,
    /// Config-level stop id (as declared in the RON file).
    pub stop_id: u32,
    /// Position along the shaft axis.
    pub position: f64,
    /// Number of riders currently waiting at this stop.
    pub waiting: u32,
    /// Number of resident (parked) riders at this stop.
    pub residents: u32,
    /// Number of riders who abandoned waiting at this stop.
    pub abandoned: u32,
    /// UTF-8 name bytes borrowed from the frame's arena.
    pub name_ptr: *const u8,
    /// Length in bytes of the name slice at [`Self::name_ptr`].
    pub name_len: usize,
}

/// View of a single rider at the current tick.
#[repr(C)]
#[derive(Debug, Clone, Copy, elevator_layout_derive::MultiHostLayout)]
pub struct EvRiderView {
    /// Rider entity id.
    pub entity_id: u64,
    /// [`RiderPhase`] tag: 0 `Waiting`, 1 `Boarding`, 2 `Riding`, 3 `Exiting`,
    /// 4 `Walking`, 5 `Arrived`, 6 `Abandoned`, 7 `Resident`.
    pub phase: u8,
    /// Origin / current stop entity id (0 if none).
    pub origin_stop_id: u64,
    /// Final destination stop entity id (0 if no route).
    pub destination_stop_id: u64,
    /// Elevator carrying the rider (0 if not aboard).
    pub elevator_id: u64,
}

/// Aggregate metrics at the current tick.
#[repr(C)]
#[derive(Debug, Clone, Copy, elevator_layout_derive::MultiHostLayout)]
pub struct EvMetricsView {
    /// Cumulative riders delivered.
    pub total_delivered: u64,
    /// Cumulative riders who abandoned.
    pub total_abandoned: u64,
    /// Average wait time (seconds).
    pub avg_wait_seconds: f64,
    /// Average ride time (seconds).
    pub avg_ride_seconds: f64,
    /// Current simulation tick.
    pub current_tick: u64,
}

/// Borrowed per-tick snapshot. All slice pointers are valid until the next
/// call to [`ev_sim_frame`] on the same handle.
#[repr(C)]
#[derive(Debug, Clone, Copy, elevator_layout_derive::MultiHostLayout)]
pub struct EvFrame {
    /// Pointer to contiguous elevator views.
    pub elevators: *const EvElevatorView,
    /// Number of elements at [`Self::elevators`].
    pub elevator_count: usize,
    /// Pointer to contiguous stop views.
    pub stops: *const EvStopView,
    /// Number of elements at [`Self::stops`].
    pub stop_count: usize,
    /// Pointer to contiguous rider views.
    pub riders: *const EvRiderView,
    /// Number of elements at [`Self::riders`].
    pub rider_count: usize,
    /// Aggregate metrics snapshot.
    pub metrics: EvMetricsView,
}

// ── FrameBuffer ───────────────────────────────────────────────────────────

/// Per-handle buffer backing [`EvFrame`]. Reused across frames to keep
/// allocations amortised.
#[derive(Default)]
struct FrameBuffer {
    elevators: Vec<EvElevatorView>,
    stops: Vec<EvStopView>,
    riders: Vec<EvRiderView>,
    /// Backing store for stop-name slices pointed to by [`EvStopView`].
    name_arena: Vec<u8>,
}

// ── Phase / door tag encoding ─────────────────────────────────────────────

fn elevator_phase_parts(phase: ElevatorPhase) -> (u8, u64, u64) {
    // Returns (tag, current_stop_id, target_stop_id).
    match phase {
        ElevatorPhase::Idle => (0, 0, 0),
        ElevatorPhase::MovingToStop(s) => (1, 0, entity_to_u64(s)),
        ElevatorPhase::Repositioning(s) => (2, 0, entity_to_u64(s)),
        ElevatorPhase::DoorOpening => (3, 0, 0),
        ElevatorPhase::Loading => (4, 0, 0),
        ElevatorPhase::DoorClosing => (5, 0, 0),
        ElevatorPhase::Stopped => (6, 0, 0),
        _ => (u8::MAX, 0, 0),
    }
}

fn rider_phase_parts(phase: RiderPhase) -> (u8, u64) {
    match phase {
        RiderPhase::Waiting => (0, 0),
        RiderPhase::Boarding(e) => (1, entity_to_u64(e)),
        RiderPhase::Riding(e) => (2, entity_to_u64(e)),
        RiderPhase::Exiting(e) => (3, entity_to_u64(e)),
        RiderPhase::Walking => (4, 0),
        RiderPhase::Arrived => (5, 0),
        RiderPhase::Abandoned => (6, 0),
        RiderPhase::Resident => (7, 0),
        _ => (u8::MAX, 0),
    }
}

const fn door_state_tag(d: &DoorState) -> u8 {
    match d {
        DoorState::Closed => 0,
        DoorState::Opening { .. } => 1,
        DoorState::Open { .. } => 2,
        DoorState::Closing { .. } => 3,
        _ => u8::MAX,
    }
}

// ── Entity-id conversions ─────────────────────────────────────────────────

pub(crate) fn entity_to_u64(id: EntityId) -> u64 {
    id.data().as_ffi()
}

fn entity_from_u64(raw: u64) -> Option<EntityId> {
    if raw == 0 {
        return None;
    }
    let kd = KeyData::from_ffi(raw);
    Some(EntityId::from(kd))
}

// ── Strategy tag ─────────────────────────────────────────────────────────

/// Built-in dispatch strategy identifier.
///
/// ABI v3 added `Destination` and `Rsr`; consumers compiled against
/// v2 will see [`ev_abi_version`] return `3` and refuse to load.
#[repr(C)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EvStrategy {
    /// SCAN — sweep end-to-end.
    Scan = 0,
    /// LOOK — reverse at last request.
    Look = 1,
    /// Nearest-car.
    NearestCar = 2,
    /// Estimated time to destination.
    Etd = 3,
    /// Destination dispatch (lobby kiosk, hall-button mode = Destination).
    Destination = 4,
    /// RSR — composite cost-stack with stock weights.
    Rsr = 5,
    /// Custom (non-builtin) strategy. Passed only as an output value
    /// from [`ev_sim_strategy_id`]; passing it to a setter returns
    /// `EvStatus_InvalidArg` since FFI consumers cannot register
    /// custom strategies.
    Custom = 99,
}

impl EvStrategy {
    /// Convert to a [`BuiltinStrategy`]. Returns `None` for
    /// [`Self::Custom`] since it has no corresponding built-in.
    const fn as_builtin(self) -> Option<BuiltinStrategy> {
        Some(match self {
            Self::Scan => BuiltinStrategy::Scan,
            Self::Look => BuiltinStrategy::Look,
            Self::NearestCar => BuiltinStrategy::NearestCar,
            Self::Etd => BuiltinStrategy::Etd,
            Self::Destination => BuiltinStrategy::Destination,
            Self::Rsr => BuiltinStrategy::Rsr,
            Self::Custom => return None,
        })
    }

    /// Project a [`BuiltinStrategy`] reference into an `EvStrategy`.
    /// The `Custom(_)` core variant maps to [`Self::Custom`].
    const fn from_builtin(b: &BuiltinStrategy) -> Self {
        match b {
            BuiltinStrategy::Scan => Self::Scan,
            BuiltinStrategy::Look => Self::Look,
            BuiltinStrategy::NearestCar => Self::NearestCar,
            BuiltinStrategy::Etd => Self::Etd,
            BuiltinStrategy::Destination => Self::Destination,
            BuiltinStrategy::Rsr => Self::Rsr,
            _ => Self::Custom,
        }
    }
}

// ── Reposition strategy ──────────────────────────────────────────────────

/// Built-in reposition strategy identifier (ABI v3+).
///
/// Mirrors [`elevator_core::dispatch::BuiltinReposition`].
/// `EvReposition_Custom` is an output-only sentinel for non-built-in
/// strategies registered via the Rust API; FFI consumers passing
/// `EvReposition_Custom` to a setter receive `EvStatus_InvalidArg`.
#[repr(C)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EvReposition {
    /// Distribute idle elevators evenly across stops.
    SpreadEvenly = 0,
    /// Return idle elevators to a configured home stop.
    ReturnToLobby = 1,
    /// Position near stops with historically high demand.
    DemandWeighted = 2,
    /// Keep idle elevators where they are.
    NearestIdle = 3,
    /// Pre-position cars near stops with the highest recent arrival rate.
    PredictiveParking = 4,
    /// Mode-gated picker between `ReturnToLobby` / `PredictiveParking`.
    Adaptive = 5,
    /// Custom (output-only).
    Custom = 99,
}

impl EvReposition {
    fn instantiate(self) -> Option<Box<dyn elevator_core::dispatch::RepositionStrategy>> {
        use elevator_core::dispatch::reposition;
        match self {
            Self::SpreadEvenly => Some(Box::new(reposition::SpreadEvenly)),
            Self::ReturnToLobby => Some(Box::new(reposition::ReturnToLobby::new())),
            Self::DemandWeighted => Some(Box::new(reposition::DemandWeighted)),
            Self::NearestIdle => Some(Box::new(reposition::NearestIdle)),
            Self::PredictiveParking => Some(Box::new(reposition::PredictiveParking::new())),
            Self::Adaptive => Some(Box::new(reposition::AdaptiveParking::new())),
            Self::Custom => None,
        }
    }

    const fn as_builtin(self) -> elevator_core::dispatch::BuiltinReposition {
        // Custom is intentionally projected to BuiltinReposition::Custom
        // with an empty name — set_reposition rejects it before reaching
        // this path, but the match is total for readability.
        use elevator_core::dispatch::BuiltinReposition;
        match self {
            Self::SpreadEvenly => BuiltinReposition::SpreadEvenly,
            Self::ReturnToLobby => BuiltinReposition::ReturnToLobby,
            Self::DemandWeighted => BuiltinReposition::DemandWeighted,
            Self::NearestIdle => BuiltinReposition::NearestIdle,
            Self::PredictiveParking => BuiltinReposition::PredictiveParking,
            Self::Adaptive => BuiltinReposition::Adaptive,
            Self::Custom => BuiltinReposition::Custom(String::new()),
        }
    }

    const fn from_builtin(b: &elevator_core::dispatch::BuiltinReposition) -> Self {
        use elevator_core::dispatch::BuiltinReposition;
        match b {
            BuiltinReposition::SpreadEvenly => Self::SpreadEvenly,
            BuiltinReposition::ReturnToLobby => Self::ReturnToLobby,
            BuiltinReposition::DemandWeighted => Self::DemandWeighted,
            BuiltinReposition::NearestIdle => Self::NearestIdle,
            BuiltinReposition::PredictiveParking => Self::PredictiveParking,
            BuiltinReposition::Adaptive => Self::Adaptive,
            _ => Self::Custom,
        }
    }
}

// ── Service mode ─────────────────────────────────────────────────────────

/// Operational service mode for an elevator. Mirrors
/// [`elevator_core::components::ServiceMode`].
#[repr(C)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EvServiceMode {
    /// Normal operation: dispatch assigns stops, doors auto-cycle.
    Normal = 0,
    /// Excluded from dispatch and repositioning. Consumer drives movement.
    Independent = 1,
    /// Reduced speed, doors hold open indefinitely.
    Inspection = 2,
    /// Driven by direct velocity commands. Doors follow manual API.
    Manual = 3,
    /// Shut down: excluded from dispatch, no auto-boarding, fully inert
    /// once idle.
    OutOfService = 4,
}

impl EvServiceMode {
    const fn to_core(self) -> elevator_core::components::ServiceMode {
        use elevator_core::components::ServiceMode;
        match self {
            Self::Normal => ServiceMode::Normal,
            Self::Independent => ServiceMode::Independent,
            Self::Inspection => ServiceMode::Inspection,
            Self::Manual => ServiceMode::Manual,
            Self::OutOfService => ServiceMode::OutOfService,
        }
    }

    const fn from_core(mode: elevator_core::components::ServiceMode) -> Self {
        use elevator_core::components::ServiceMode;
        match mode {
            ServiceMode::Normal => Self::Normal,
            ServiceMode::Independent => Self::Independent,
            ServiceMode::Inspection => Self::Inspection,
            ServiceMode::Manual => Self::Manual,
            // ServiceMode is #[non_exhaustive]; future variants fall back
            // here so an unknown numeric tag never reaches C consumers.
            // Add a matching EvServiceMode variant in the same release
            // that adds the core variant.
            ServiceMode::OutOfService | _ => Self::OutOfService,
        }
    }
}

// ── FFI entrypoints ──────────────────────────────────────────────────────

fn guard<R, F>(fallback: R, f: F) -> R
where
    F: FnOnce() -> R,
{
    match catch_unwind(AssertUnwindSafe(f)) {
        Ok(v) => v,
        Err(payload) => {
            let msg = payload
                .downcast_ref::<&'static str>()
                .copied()
                .or_else(|| payload.downcast_ref::<String>().map(String::as_str))
                .unwrap_or("unknown panic");
            set_last_error(format!("panic in FFI: {msg}"));
            fallback
        }
    }
}

/// Create a new simulation from a RON config on disk.
///
/// Returns a newly allocated handle on success, or null on failure — call
/// [`ev_last_error`] for details.
///
/// # Safety
///
/// `config_path` must be a null-terminated UTF-8 C string, or null.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_create(config_path: *const c_char) -> *mut EvSim {
    guard(std::ptr::null_mut(), || {
        clear_last_error();
        if config_path.is_null() {
            set_last_error("config_path is null");
            return std::ptr::null_mut();
        }
        // Safety: caller guarantees null-terminated string.
        let cstr = unsafe { CStr::from_ptr(config_path) };
        let path = match cstr.to_str() {
            Ok(s) => s,
            Err(e) => {
                set_last_error(format!("config_path is not valid UTF-8: {e}"));
                return std::ptr::null_mut();
            }
        };
        let ron_str = match std::fs::read_to_string(path) {
            Ok(s) => s,
            Err(e) => {
                set_last_error(format!("could not read {path}: {e}"));
                return std::ptr::null_mut();
            }
        };
        let config: SimConfig = match ron::from_str(&ron_str) {
            Ok(c) => c,
            Err(e) => {
                set_last_error(format!("could not parse {path}: {e}"));
                return std::ptr::null_mut();
            }
        };
        let sim = match SimulationBuilder::from_config(config).build() {
            Ok(s) => s,
            Err(e) => {
                set_last_error(format!("build failed: {e}"));
                return std::ptr::null_mut();
            }
        };
        Box::into_raw(Box::new(EvSim {
            sim,
            frame: FrameBuffer::default(),
            pending_events: std::collections::VecDeque::new(),
            pending_log_messages: std::collections::VecDeque::new(),
            log_drain_buf: Vec::new(),
            log_polling_active: false,
        }))
    })
}

/// Destroy a simulation handle. Null-safe.
///
/// # Safety
///
/// `handle` must either be null or a pointer returned by [`ev_sim_create`]
/// that has not already been destroyed.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_destroy(handle: *mut EvSim) {
    guard((), || {
        if handle.is_null() {
            return;
        }
        // Safety: caller guarantees exclusive ownership.
        drop(unsafe { Box::from_raw(handle) });
    });
}

/// Advance the simulation by one tick.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_step(handle: *mut EvSim) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        // Safety: validity guaranteed by caller; no aliasing across threads.
        let ev = unsafe { &mut *handle };
        ev.sim.step();
        forward_pending_events(ev);
        EvStatus::Ok
    })
}

const LEVEL_DEBUG: u8 = 1;

fn forward_pending_events(ev: &mut EvSim) {
    let maybe_cb = LOG_CALLBACK.lock().ok().and_then(|slot| *slot);
    // Skip both legs entirely if neither side wants the stream.
    // Callback-only consumers that never poll, and polling consumers
    // who haven't yet called the drain, both pay zero here.
    if maybe_cb.is_none() && !ev.log_polling_active {
        return;
    }
    let now_ns = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .ok()
        .and_then(|d| i64::try_from(d.as_nanos()).ok())
        .unwrap_or(0);
    for event in ev.sim.pending_events() {
        let msg = format!("{event:?}");
        let Ok(c) = CString::new(msg) else { continue };
        if let Some(cb) = maybe_cb {
            // Safety: ev_set_log_callback's contract covers pointer
            // validity for the duration of the callback installation.
            unsafe { cb(LEVEL_DEBUG, c.as_ptr()) };
        }
        if ev.log_polling_active {
            ev.pending_log_messages.push_back(LogRecord {
                level: LEVEL_DEBUG,
                ts_ns: now_ns,
                msg: c,
            });
        }
    }
}

/// Populate `out` with a borrowed view of the current simulation state.
///
/// Pointers inside the frame are valid until the next `ev_sim_frame` call
/// on the same handle.
///
/// # Safety
///
/// `handle` and `out` must be valid, aligned, non-overlapping pointers.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_frame(handle: *mut EvSim, out: *mut EvFrame) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out.is_null() {
            set_last_error("null argument");
            return EvStatus::NullArg;
        }
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        populate_frame(ev);
        let frame = EvFrame {
            elevators: ev.frame.elevators.as_ptr(),
            elevator_count: ev.frame.elevators.len(),
            stops: ev.frame.stops.as_ptr(),
            stop_count: ev.frame.stops.len(),
            riders: ev.frame.riders.as_ptr(),
            rider_count: ev.frame.riders.len(),
            metrics: metrics_view(&ev.sim),
        };
        // Safety: `out` validated non-null; caller provides alignment.
        unsafe { std::ptr::write(out, frame) };
        EvStatus::Ok
    })
}

fn metrics_view(sim: &Simulation) -> EvMetricsView {
    let m = sim.metrics();
    let dt = sim.dt();
    EvMetricsView {
        total_delivered: m.total_delivered(),
        total_abandoned: m.total_abandoned(),
        avg_wait_seconds: m.avg_wait_time() * dt,
        avg_ride_seconds: m.avg_ride_time() * dt,
        current_tick: sim.current_tick(),
    }
}

fn populate_frame(ev: &mut EvSim) {
    ev.frame.elevators.clear();
    ev.frame.stops.clear();
    ev.frame.riders.clear();
    ev.frame.name_arena.clear();

    let sim = &ev.sim;
    let world = sim.world();
    let groups = sim.groups();
    // Build an O(1) elevator → group lookup once per frame. Without this,
    // `populate_frame` is O(elevators × groups × elevators-per-group).
    let group_by_elevator: std::collections::HashMap<EntityId, u32> = groups
        .iter()
        .flat_map(|g| g.elevator_entities().iter().map(move |e| (*e, g.id().0)))
        .collect();
    let resolve_group =
        |elev: EntityId| -> u32 { group_by_elevator.get(&elev).copied().unwrap_or(u32::MAX) };

    for (eid, pos, elev) in world.iter_elevators() {
        let velocity = world.velocity(eid).map_or(0.0, Velocity::value);
        let (phase_tag, current_stop, target_from_phase) = elevator_phase_parts(elev.phase());
        let target_stop_id = if target_from_phase == 0 {
            elev.target_stop().map_or(0, entity_to_u64)
        } else {
            target_from_phase
        };
        // ElevatorPhase variants for at-stop service (DoorOpening=3, Loading=4,
        // DoorClosing=5, Stopped=6) don't carry the stop ID in their payload —
        // the car is parked at its `target_stop()`. Populate `current_stop_id`
        // from there so consumers can query the stop being served without
        // inferring it from the phase tag and target field.
        let current_stop_id = if current_stop != 0 {
            current_stop
        } else if matches!(phase_tag, 3..=6) {
            elev.target_stop().map_or(0, entity_to_u64)
        } else {
            0
        };
        ev.frame.elevators.push(EvElevatorView {
            entity_id: entity_to_u64(eid),
            group_id: resolve_group(eid),
            line_id: entity_to_u64(elev.line()),
            phase: phase_tag,
            position: pos.value(),
            velocity,
            current_stop_id,
            target_stop_id,
            occupancy: u32::try_from(elev.riders().len()).unwrap_or(u32::MAX),
            capacity_kg: elev.weight_capacity().value(),
            door_state: door_state_tag(elev.door()),
            going_up: u8::from(elev.going_up()),
            going_down: u8::from(elev.going_down()),
        });
    }

    // Two-pass for stop names: first push bytes into the arena and record
    // (offset, len); then once the arena has stopped growing, patch pointers.
    let mut slots: Vec<(usize, usize)> = Vec::new();
    for (eid, stop) in world.iter_stops() {
        let offset = ev.frame.name_arena.len();
        ev.frame
            .name_arena
            .extend_from_slice(stop.name().as_bytes());
        slots.push((offset, stop.name().len()));
        let stop_id = sim
            .stop_lookup_iter()
            .find_map(|(sid, e)| if *e == eid { Some(sid.0) } else { None })
            .unwrap_or(0);
        ev.frame.stops.push(EvStopView {
            entity_id: entity_to_u64(eid),
            stop_id,
            position: stop.position(),
            waiting: u32::try_from(sim.waiting_at(eid).count()).unwrap_or(u32::MAX),
            residents: u32::try_from(sim.residents_at(eid).count()).unwrap_or(u32::MAX),
            abandoned: u32::try_from(sim.abandoned_at(eid).count()).unwrap_or(u32::MAX),
            name_ptr: std::ptr::null(),
            name_len: 0,
        });
    }
    let base = ev.frame.name_arena.as_ptr();
    for (view, &(offset, len)) in ev.frame.stops.iter_mut().zip(slots.iter()) {
        // Safety: each (offset, len) was recorded into this same arena
        // during this call; the arena does not reallocate while we are
        // borrowing its base pointer within this function.
        view.name_ptr = unsafe { base.add(offset) };
        view.name_len = len;
    }

    for (eid, rider) in world.iter_riders() {
        let (phase_tag, elevator_id) = rider_phase_parts(rider.phase());
        let origin = rider.current_stop().map_or(0, entity_to_u64);
        let destination = world
            .route(eid)
            .and_then(elevator_core::components::Route::final_destination)
            .map_or(0, entity_to_u64);
        ev.frame.riders.push(EvRiderView {
            entity_id: entity_to_u64(eid),
            phase: phase_tag,
            origin_stop_id: origin,
            destination_stop_id: destination,
            elevator_id,
        });
    }
}

/// Query the best ETA to a stop across eligible elevators.
///
/// `direction`: `-1` = Down, `0` = Either, `1` = Up. Returns
/// `EvStatus_NotFound` if no eligible elevator has `stop_entity_id`
/// queued; in that case the out-parameters are written as `(0, NaN)`.
///
/// # Safety
///
/// All pointers must be valid, aligned, and non-null.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_best_eta(
    handle: *mut EvSim,
    stop_entity_id: u64,
    direction: i8,
    out_elevator: *mut u64,
    out_seconds: *mut f64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_elevator.is_null() || out_seconds.is_null() {
            set_last_error("null argument");
            return EvStatus::NullArg;
        }
        let dir = match direction {
            -1 => Direction::Down,
            0 => Direction::Either,
            1 => Direction::Up,
            _ => {
                set_last_error("direction must be -1, 0, or 1");
                return EvStatus::InvalidArg;
            }
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        let Some(stop_eid) = entity_from_u64(stop_entity_id) else {
            set_last_error("invalid stop_entity_id");
            // Safety: validated non-null above.
            unsafe {
                std::ptr::write(out_elevator, 0);
                std::ptr::write(out_seconds, f64::NAN);
            }
            return EvStatus::InvalidArg;
        };
        if let Some((elev, duration)) = ev.sim.best_eta(stop_eid, dir) {
            // Safety: validated non-null above.
            unsafe {
                std::ptr::write(out_elevator, entity_to_u64(elev));
                std::ptr::write(out_seconds, duration_to_seconds(duration));
            }
            EvStatus::Ok
        } else {
            // Safety: validated non-null above.
            unsafe {
                std::ptr::write(out_elevator, 0);
                std::ptr::write(out_seconds, f64::NAN);
            }
            EvStatus::NotFound
        }
    })
}

const fn duration_to_seconds(d: Duration) -> f64 {
    d.as_secs_f64()
}

/// Replace the dispatch strategy for a group.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_set_strategy(
    handle: *mut EvSim,
    group_id: u32,
    strategy: EvStrategy,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        let Some(builtin) = strategy.as_builtin() else {
            set_last_error("EvStrategy::Custom is output-only — pass a concrete builtin");
            return EvStatus::InvalidArg;
        };
        // Validate group existence before allocating the strategy box, so the
        // NotFound path doesn't waste a heap allocation.
        if !ev.sim.groups().iter().any(|g| g.id() == GroupId(group_id)) {
            set_last_error(format!("group {group_id} not found"));
            return EvStatus::NotFound;
        }
        let Some(boxed) = builtin.instantiate() else {
            set_last_error("strategy could not be instantiated");
            return EvStatus::InvalidArg;
        };
        ev.sim.set_dispatch(GroupId(group_id), boxed, builtin);
        EvStatus::Ok
    })
}

/// Remove the reposition strategy from `group_id`. Idle elevators stay
/// where they parked instead of moving toward a target.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_remove_reposition(handle: *mut EvSim, group_id: u32) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        ev.sim.remove_reposition(GroupId(group_id));
        EvStatus::Ok
    })
}

/// Get the dispatch strategy currently active on `group_id`. Writes the
/// result to `*out_strategy`. Returns `EvStatus_NotFound` if the group
/// has no registered strategy (or doesn't exist).
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
/// `out_strategy` must be a writable [`EvStrategy`] pointer.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_strategy_id(
    handle: *mut EvSim,
    group_id: u32,
    out_strategy: *mut EvStrategy,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_strategy.is_null() {
            set_last_error("handle or out_strategy is null");
            return EvStatus::NullArg;
        }
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        ev.sim.strategy_id(GroupId(group_id)).map_or_else(
            || {
                set_last_error(format!("no strategy registered for group {group_id}"));
                EvStatus::NotFound
            },
            |b| {
                // Safety: caller guarantees out_strategy is writable.
                unsafe { *out_strategy = EvStrategy::from_builtin(b) };
                EvStatus::Ok
            },
        )
    })
}

/// Set the reposition strategy on `group_id`. Pass `EvReposition_Custom`
/// returns `InvalidArg` — FFI consumers cannot register custom strategies.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_set_reposition(
    handle: *mut EvSim,
    group_id: u32,
    strategy: EvReposition,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        // Validate group existence before allocating the strategy box, so the
        // NotFound path doesn't waste a heap allocation.
        if !ev.sim.groups().iter().any(|g| g.id() == GroupId(group_id)) {
            set_last_error(format!("group {group_id} not found"));
            return EvStatus::NotFound;
        }
        let Some(boxed) = strategy.instantiate() else {
            set_last_error("EvReposition::Custom is output-only — pass a concrete builtin");
            return EvStatus::InvalidArg;
        };
        ev.sim
            .set_reposition(GroupId(group_id), boxed, strategy.as_builtin());
        EvStatus::Ok
    })
}

/// Get the reposition strategy currently set on `group_id`. Returns
/// `EvStatus_NotFound` if the group has no reposition strategy.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
/// `out_strategy` must be a writable [`EvReposition`] pointer.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_reposition_id(
    handle: *mut EvSim,
    group_id: u32,
    out_strategy: *mut EvReposition,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_strategy.is_null() {
            set_last_error("handle or out_strategy is null");
            return EvStatus::NullArg;
        }
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        ev.sim.reposition_id(GroupId(group_id)).map_or_else(
            || {
                set_last_error(format!(
                    "no reposition strategy registered for group {group_id}"
                ));
                EvStatus::NotFound
            },
            |b| {
                // Safety: caller guarantees out_strategy is writable.
                unsafe { *out_strategy = EvReposition::from_builtin(b) };
                EvStatus::Ok
            },
        )
    })
}

/// Step the simulation forward up to `max_ticks` ticks.
///
/// Stops early if the world becomes "quiet" (no in-flight riders, no
/// pending hall calls, all cars idle). Writes the actual tick count
/// to `*out_ticks_run` on both success and timeout.
///
/// Returns `EvStatus_Ok` if the world quieted within `max_ticks`,
/// `EvStatus_InvalidArg` if it failed to quiet (loop guard).
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
/// `out_ticks_run` must be a writable `u64`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_run_until_quiet(
    handle: *mut EvSim,
    max_ticks: u64,
    out_ticks_run: *mut u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_ticks_run.is_null() {
            set_last_error("handle or out_ticks_run is null");
            return EvStatus::NullArg;
        }
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.run_until_quiet(max_ticks) {
            Ok(ticks) => {
                // Safety: caller guarantees out_ticks_run writable.
                unsafe { *out_ticks_run = ticks };
                EvStatus::Ok
            }
            Err(ticks) => {
                // Safety: caller guarantees out_ticks_run writable.
                unsafe { *out_ticks_run = ticks };
                set_last_error(format!(
                    "run_until_quiet: world did not quiet within {ticks} ticks"
                ));
                EvStatus::InvalidArg
            }
        }
    })
}

// ── Hall / car call FFI ─────────────────────────────────────────────

/// Translate an FFI direction flag to a [`CallDirection`]. `1` → Up,
/// `-1` → Down. Other values are invalid.
const fn call_direction_from_i8(d: i8) -> Option<elevator_core::components::CallDirection> {
    use elevator_core::components::CallDirection;
    match d {
        1 => Some(CallDirection::Up),
        -1 => Some(CallDirection::Down),
        _ => None,
    }
}

/// Press an up/down hall button at `stop_entity_id`. Games use this
/// for scripted NPCs, player input, or cutscene cues.
///
/// `direction` uses `1` = Up, `-1` = Down.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_press_hall_button(
    handle: *mut EvSim,
    stop_entity_id: u64,
    direction: i8,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(dir) = call_direction_from_i8(direction) else {
            set_last_error("direction must be 1 (Up) or -1 (Down)");
            return EvStatus::InvalidArg;
        };
        let Some(stop) = entity_from_u64(stop_entity_id) else {
            set_last_error("invalid stop_entity_id");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.press_hall_button(stop, dir) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                set_last_error(e.to_string());
                EvStatus::NotFound
            }
        }
    })
}

/// Press a floor button inside a car.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_press_car_button(
    handle: *mut EvSim,
    car_entity_id: u64,
    floor_entity_id: u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(car) = entity_from_u64(car_entity_id) else {
            set_last_error("invalid car_entity_id");
            return EvStatus::InvalidArg;
        };
        let Some(floor) = entity_from_u64(floor_entity_id) else {
            set_last_error("invalid floor_entity_id");
            return EvStatus::InvalidArg;
        };
        let ev = unsafe { &mut *handle };
        match ev.sim.press_car_button(ElevatorId::from(car), floor) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                set_last_error(e.to_string());
                EvStatus::NotFound
            }
        }
    })
}

/// Pin the hall call at `(stop, direction)` to a specific car.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_pin_assignment(
    handle: *mut EvSim,
    car_entity_id: u64,
    stop_entity_id: u64,
    direction: i8,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(dir) = call_direction_from_i8(direction) else {
            set_last_error("direction must be 1 (Up) or -1 (Down)");
            return EvStatus::InvalidArg;
        };
        let Some(car) = entity_from_u64(car_entity_id) else {
            set_last_error("invalid car_entity_id");
            return EvStatus::InvalidArg;
        };
        let Some(stop) = entity_from_u64(stop_entity_id) else {
            set_last_error("invalid stop_entity_id");
            return EvStatus::InvalidArg;
        };
        let ev = unsafe { &mut *handle };
        match ev.sim.pin_assignment(ElevatorId::from(car), stop, dir) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                set_last_error(e.to_string());
                EvStatus::InvalidArg
            }
        }
    })
}

/// Release a previous pin at `(stop, direction)`. No-op if none.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_unpin_assignment(
    handle: *mut EvSim,
    stop_entity_id: u64,
    direction: i8,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(dir) = call_direction_from_i8(direction) else {
            set_last_error("direction must be 1 (Up) or -1 (Down)");
            return EvStatus::InvalidArg;
        };
        let Some(stop) = entity_from_u64(stop_entity_id) else {
            set_last_error("invalid stop_entity_id");
            return EvStatus::InvalidArg;
        };
        let ev = unsafe { &mut *handle };
        ev.sim.unpin_assignment(stop, dir);
        EvStatus::Ok
    })
}

/// Car currently assigned to serve the hall call at `(stop, direction)`.
///
/// Writes the car's entity id to `out_elevator`, or `0` if no call
/// exists or no car is assigned.
///
/// # Safety
///
/// `handle` and `out_elevator` must be valid pointers.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_assigned_car(
    handle: *mut EvSim,
    stop_entity_id: u64,
    direction: i8,
    out_elevator: *mut u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_elevator.is_null() {
            set_last_error("null argument");
            return EvStatus::NullArg;
        }
        let Some(dir) = call_direction_from_i8(direction) else {
            set_last_error("direction must be 1 (Up) or -1 (Down)");
            return EvStatus::InvalidArg;
        };
        let Some(stop) = entity_from_u64(stop_entity_id) else {
            set_last_error("invalid stop_entity_id");
            return EvStatus::InvalidArg;
        };
        let ev = unsafe { &*handle };
        let id = ev.sim.assigned_car(stop, dir).map_or(0, entity_to_u64);
        // Safety: validated non-null above.
        unsafe { std::ptr::write(out_elevator, id) };
        EvStatus::Ok
    })
}

/// Per-line car assignments at the hall call `(stop, direction)`.
///
/// Writes up to `capacity` [`EvAssignment`] records to `out` and the
/// number actually written to `out_written`. Lines with no assignment
/// are omitted. Iteration order follows the `BTreeMap` keyed by line
/// entity id — stable across ticks.
///
/// Use [`ev_sim_assigned_car`] for the single-value convenience view;
/// this call is for consumers that need every line's assignment at a
/// multi-line stop (e.g. a sky-lobby served by low, high, and express
/// banks).
///
/// # Safety
///
/// `handle`, `out`, and `out_written` must be valid pointers. `out`
/// must point to a buffer of at least `capacity` [`EvAssignment`]s.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_assigned_cars_by_line(
    handle: *mut EvSim,
    stop_entity_id: u64,
    direction: i8,
    out: *mut EvAssignment,
    capacity: u32,
    out_written: *mut u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out.is_null() || out_written.is_null() {
            set_last_error("null argument");
            return EvStatus::NullArg;
        }
        let Some(dir) = call_direction_from_i8(direction) else {
            set_last_error("direction must be 1 (Up) or -1 (Down)");
            return EvStatus::InvalidArg;
        };
        let Some(stop) = entity_from_u64(stop_entity_id) else {
            set_last_error("invalid stop_entity_id");
            return EvStatus::InvalidArg;
        };
        let ev = unsafe { &*handle };
        let mut written: u32 = 0;
        for (line, car) in ev
            .sim
            .assigned_cars_by_line(stop, dir)
            .into_iter()
            .take(capacity as usize)
        {
            let record = EvAssignment {
                line_entity_id: entity_to_u64(line),
                car_entity_id: entity_to_u64(car),
            };
            // Safety: caller guarantees `out` has at least `capacity` entries
            // and we wrote fewer than `capacity` before this increment.
            unsafe {
                std::ptr::write(out.add(written as usize), record);
            }
            written += 1;
        }
        // Safety: validated non-null above.
        unsafe { std::ptr::write(out_written, written) };
        EvStatus::Ok
    })
}

/// Estimated ticks remaining before the assigned car reaches the call.
///
/// Writes the tick count to `out_ticks`, or `u64::MAX` when no car is
/// assigned or no call exists at that `(stop, direction)`.
///
/// # Safety
///
/// `handle` and `out_ticks` must be valid pointers.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_eta_for_call(
    handle: *mut EvSim,
    stop_entity_id: u64,
    direction: i8,
    out_ticks: *mut u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_ticks.is_null() {
            set_last_error("null argument");
            return EvStatus::NullArg;
        }
        let Some(dir) = call_direction_from_i8(direction) else {
            set_last_error("direction must be 1 (Up) or -1 (Down)");
            return EvStatus::InvalidArg;
        };
        let Some(stop) = entity_from_u64(stop_entity_id) else {
            set_last_error("invalid stop_entity_id");
            return EvStatus::InvalidArg;
        };
        let ev = unsafe { &*handle };
        let ticks = ev.sim.eta_for_call(stop, dir).unwrap_or(u64::MAX);
        // Safety: validated non-null above.
        unsafe { std::ptr::write(out_ticks, ticks) };
        EvStatus::Ok
    })
}

/// Number of active hall calls across the whole simulation. Use as a
/// pre-check before allocating a buffer for
/// [`ev_sim_hall_calls_snapshot`].
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_hall_call_count(handle: *mut EvSim) -> u32 {
    if handle.is_null() {
        return 0;
    }
    // Safety: validity guaranteed by caller.
    let ev = unsafe { &*handle };
    u32::try_from(ev.sim.hall_calls().count()).unwrap_or(u32::MAX)
}

/// Snapshot a flat representation of every active hall call into `out`.
///
/// Caller-owned buffer with probe-then-fill semantics: `out_written`
/// is populated with the **required** slot count regardless of whether
/// the buffer fits, so callers can probe with `(null, 0)` to size a
/// real buffer.
///
/// Returns:
/// - `EvStatus_Ok` when all calls fit in `capacity` (`out_written
///   <= capacity`); the first `out_written` slots of `out` are
///   populated.
/// - `EvStatus_InvalidArg` when the buffer is too small;
///   `out_written` carries the required slot count and no slot of
///   `out` is written. [`ev_last_error`] carries a diagnostic string
///   **only** when `capacity > 0` — the documented `(null, 0)` probe
///   leaves the last-error slot clear so callers using
///   [`ev_last_error`] for diagnostics don't see a false "programmer
///   mistake" after a deliberate size query.
///
/// **ABI v4 contract change:** prior versions silently truncated to
/// `capacity` and returned `EvStatus_Ok` regardless. Callers that
/// previously passed an under-sized buffer and ignored the count must
/// now either grow the buffer or check for `EvStatus_InvalidArg`. Use
/// [`ev_sim_hall_call_count`] for size-only probes when the buffer
/// pattern feels heavyweight.
///
/// # Safety
///
/// `handle` and `out_written` must be valid pointers. `out` must point
/// to a buffer of at least `capacity` [`EvHallCall`]s when `capacity > 0`,
/// and may be null when `capacity == 0` (probe pass).
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_hall_calls_snapshot(
    handle: *mut EvSim,
    out: *mut EvHallCall,
    capacity: u32,
    out_written: *mut u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_written.is_null() {
            set_last_error("handle or out_written is null");
            return EvStatus::NullArg;
        }
        if capacity > 0 && out.is_null() {
            set_last_error("out is null but capacity > 0");
            return EvStatus::NullArg;
        }
        let ev = unsafe { &*handle };
        // Materialize once so we can write the needed count before any
        // potential under-size return. `hall_calls()` returns an iter
        // (not a slice) so collect to count without re-iterating.
        let calls: Vec<&_> = ev.sim.hall_calls().collect();
        let needed = u32::try_from(calls.len()).unwrap_or(u32::MAX);
        // Safety: validated non-null above. Surface the required size
        // before any potential under-size return so callers can probe.
        unsafe { *out_written = needed };
        if needed > capacity {
            // capacity == 0 is the documented probe call — return
            // InvalidArg silently so callers reading
            // ev_sim_last_error() don't see a false "programmer
            // mistake" message after a deliberate size query.
            if capacity > 0 {
                set_last_error(format!(
                    "insufficient buffer: need {needed} slots, got {capacity}"
                ));
            }
            return EvStatus::InvalidArg;
        }
        for (i, call) in calls.iter().enumerate() {
            let record = EvHallCall {
                stop_entity_id: entity_to_u64(call.stop),
                direction: match call.direction {
                    elevator_core::components::CallDirection::Up => 1,
                    elevator_core::components::CallDirection::Down => -1,
                    // Future variants default to 0 rather than panic —
                    // forward-compat keeps the C side stable.
                    _ => 0,
                },
                press_tick: call.press_tick,
                acknowledged_at: call.acknowledged_at.unwrap_or(u64::MAX),
                // Pick the lexicographically-first line's entry as the
                // single-value `assigned_car` view. A stop served by
                // multiple lines can hold one assignment per line; C
                // consumers that need the full set should call
                // `ev_sim_assigned_cars_by_line`.
                assigned_car: call.any_assigned_car().map_or(0, entity_to_u64),
                destination_entity_id: call.destination.map_or(0, entity_to_u64),
                pinned: u8::from(call.pinned),
                pending_rider_count: u32::try_from(call.pending_riders.len()).unwrap_or(u32::MAX),
            };
            // Safety: bounds-checked above (needed <= capacity, i < calls.len() == needed).
            unsafe {
                std::ptr::write(out.add(i), record);
            }
        }
        EvStatus::Ok
    })
}

/// C-ABI-flat projection of a `HallCall` for FFI consumers.
#[repr(C)]
#[derive(Debug, Clone, Copy, elevator_layout_derive::MultiHostLayout)]
pub struct EvHallCall {
    /// Stop entity id (same encoding as elsewhere in the FFI).
    pub stop_entity_id: u64,
    /// `1` = Up, `-1` = Down.
    pub direction: i8,
    /// Tick at which the button was pressed.
    pub press_tick: u64,
    /// Tick at which the call was acknowledged; `u64::MAX` if pending.
    pub acknowledged_at: u64,
    /// Car currently assigned to serve the call; `0` if none.
    ///
    /// At a stop served by multiple lines (e.g. a sky-lobby) a call can
    /// hold one assignment per line. This field mirrors the FFI's
    /// historical single-value shape and surfaces whichever entry has
    /// the numerically smallest line-entity id. Use
    /// [`ev_sim_assigned_cars_by_line`] to read every line's entry.
    pub assigned_car: u64,
    /// Destination stop entity id in DCS (`HallCallMode::Destination`)
    /// mode, or `0` when the call has no destination (Classic mode,
    /// or no kiosk entry yet). Matches `HallCall::destination`.
    pub destination_entity_id: u64,
    /// `1` when pinned, `0` otherwise.
    pub pinned: u8,
    /// Number of riders aggregated onto this call.
    pub pending_rider_count: u32,
}

/// One `(line, car)` assignment on a hall call. Read by
/// [`ev_sim_assigned_cars_by_line`].
#[repr(C)]
#[derive(Debug, Clone, Copy, elevator_layout_derive::MultiHostLayout)]
pub struct EvAssignment {
    /// Line entity id the car runs on.
    pub line_entity_id: u64,
    /// Car entity id assigned to this line's share of the call.
    pub car_entity_id: u64,
}

/// Discriminator for [`EvEvent::kind`]. Kept as explicit integer
/// constants so the C ABI is stable across Rust enum-layout changes.
///
/// The constants 1..=9 are the original v3 set kept stable for binary
/// compatibility. v4 added 10..=49 mirroring every public core `Event`
/// variant. Unknown / future variants surface as
/// [`EvEvent::kind`] = `UNKNOWN`.
#[allow(clippy::doc_markdown, clippy::too_long_first_doc_paragraph)]
pub mod ev_event_kind {
    /// `Event::HallButtonPressed`. Fields: `stop`, `direction` (`1` =
    /// up, `-1` = down), `tick`.
    pub const HALL_BUTTON_PRESSED: u8 = 1;
    /// `Event::HallCallAcknowledged`. Fields: `stop`, `direction`,
    /// `tick`.
    pub const HALL_CALL_ACKNOWLEDGED: u8 = 2;
    /// `Event::HallCallCleared`. Fields: `stop`, `direction`, `car`
    /// (the elevator that cleared the call by arriving), `tick`.
    pub const HALL_CALL_CLEARED: u8 = 3;
    /// `Event::CarButtonPressed`. Fields: `car`, `floor` (the
    /// requested stop), `rider` (or `0` for synthetic presses with no
    /// associated rider), `tick`.
    pub const CAR_BUTTON_PRESSED: u8 = 4;
    /// `Event::RiderSkipped`. Fields: `rider`, `car` (the elevator
    /// they declined to board), `stop` (where the skip happened),
    /// `tick`.
    pub const RIDER_SKIPPED: u8 = 5;
    /// `Event::RiderSpawned`. Fields: `rider`, `stop` (origin), `floor`
    /// (destination), `tick`.
    pub const RIDER_SPAWNED: u8 = 6;
    /// `Event::RiderBoarded`. Fields: `rider`, `car` (elevator),
    /// `tick`.
    pub const RIDER_BOARDED: u8 = 7;
    /// `Event::RiderExited`. Fields: `rider`, `car` (elevator), `stop`
    /// (where they exited), `tick`.
    pub const RIDER_EXITED: u8 = 8;
    /// `Event::RiderAbandoned`. Fields: `rider`, `stop` (where they
    /// gave up), `tick`.
    pub const RIDER_ABANDONED: u8 = 9;

    // ── v4 additions ──────────────────────────────────────────────────

    /// `Event::ElevatorDeparted`. Fields: `car`, `stop` (from_stop), `tick`.
    pub const ELEVATOR_DEPARTED: u8 = 10;
    /// `Event::ElevatorArrived`. Fields: `car`, `stop` (at_stop), `tick`.
    pub const ELEVATOR_ARRIVED: u8 = 11;
    /// `Event::DoorOpened`. Fields: `car`, `tick`.
    pub const DOOR_OPENED: u8 = 12;
    /// `Event::DoorClosed`. Fields: `car`, `tick`.
    pub const DOOR_CLOSED: u8 = 13;
    /// `Event::PassingFloor`. Fields: `car`, `stop`, `direction` (`1` =
    /// up, `-1` = down), `tick`.
    pub const PASSING_FLOOR: u8 = 14;
    /// `Event::MovementAborted`. Fields: `car`, `stop` (brake_target),
    /// `tick`.
    pub const MOVEMENT_ABORTED: u8 = 15;
    /// `Event::RiderRejected`. Fields: `rider`, `car` (elevator),
    /// `code1` (rejection reason — see [`crate::ev_rejection_reason`]),
    /// `f1` (attempted_weight in kg, or `NaN` if no `RejectionContext`
    /// was attached), `f2` (current_load on the elevator at rejection
    /// time in kg, or `NaN`), `tick`.
    ///
    /// Capacity is intentionally not duplicated here — it lives on the
    /// elevator entity (`EvElevatorView::capacity_kg`) and rarely
    /// changes per-tick. Combine `f2` with the elevator's capacity for
    /// the remaining-room view.
    pub const RIDER_REJECTED: u8 = 16;
    /// `Event::RiderEjected`. Fields: `rider`, `car` (elevator), `stop`,
    /// `tick`.
    pub const RIDER_EJECTED: u8 = 17;
    /// `Event::ElevatorAssigned`. Fields: `car`, `stop`, `tick`.
    pub const ELEVATOR_ASSIGNED: u8 = 18;
    /// `Event::StopAdded`. Fields: `stop`, `entity` (line), `group`, `tick`.
    pub const STOP_ADDED: u8 = 19;
    /// `Event::ElevatorAdded`. Fields: `car`, `entity` (line), `group`,
    /// `tick`.
    pub const ELEVATOR_ADDED: u8 = 20;
    /// `Event::EntityDisabled`. Fields: `entity`, `tick`.
    pub const ENTITY_DISABLED: u8 = 21;
    /// `Event::EntityEnabled`. Fields: `entity`, `tick`.
    pub const ENTITY_ENABLED: u8 = 22;
    /// `Event::RouteInvalidated`. Fields: `rider`, `stop` (affected_stop),
    /// `code1` (reason — see [`crate::ev_route_invalid_reason`]), `tick`.
    pub const ROUTE_INVALIDATED: u8 = 23;
    /// `Event::RiderRerouted`. Fields: `rider`, `floor` (new_destination),
    /// `tick`.
    pub const RIDER_REROUTED: u8 = 24;
    /// `Event::RiderSettled`. Fields: `rider`, `stop`, `tick`.
    pub const RIDER_SETTLED: u8 = 25;
    /// `Event::RiderDespawned`. Fields: `rider`, `tick`.
    pub const RIDER_DESPAWNED: u8 = 26;
    /// `Event::LineAdded`. Fields: `entity` (line), `group`, `tick`.
    pub const LINE_ADDED: u8 = 27;
    /// `Event::LineRemoved`. Fields: `entity` (line), `group`, `tick`.
    pub const LINE_REMOVED: u8 = 28;
    /// `Event::LineReassigned`. Fields: `entity` (line), `group`
    /// (new_group), `count` (old_group as u32), `tick`.
    pub const LINE_REASSIGNED: u8 = 29;
    /// `Event::ElevatorReassigned`. Fields: `car`, `stop` (new_line),
    /// `entity` (old_line), `tick`.
    pub const ELEVATOR_REASSIGNED: u8 = 30;
    /// `Event::ElevatorRepositioning`. Fields: `car`, `stop` (to_stop),
    /// `tick`.
    pub const ELEVATOR_REPOSITIONING: u8 = 31;
    /// `Event::ElevatorRepositioned`. Fields: `car`, `stop` (at_stop),
    /// `tick`.
    pub const ELEVATOR_REPOSITIONED: u8 = 32;
    /// `Event::ElevatorRecalled`. Fields: `car`, `stop` (to_stop),
    /// `tick`.
    pub const ELEVATOR_RECALLED: u8 = 33;
    /// `Event::ServiceModeChanged`. Fields: `car`, `code1` (new mode —
    /// same encoding as [`crate::EvServiceMode`]), `code2` (previous
    /// mode), `tick`.
    pub const SERVICE_MODE_CHANGED: u8 = 34;
    /// `Event::EnergyConsumed`. Fields: `car`, `f1` (consumed kJ), `f2`
    /// (regenerated kJ), `tick`. Requires the `energy` feature on
    /// `elevator-core`; emitted as `UNKNOWN` if the feature is off.
    pub const ENERGY_CONSUMED: u8 = 35;
    /// `Event::CapacityChanged`. Fields: `car`, `f1` (current_load), `f2`
    /// (capacity), `tick`.
    pub const CAPACITY_CHANGED: u8 = 36;
    /// `Event::ElevatorIdle`. Fields: `car`, `stop` (at_stop, `0` when
    /// the elevator is idle mid-shaft), `tick`.
    pub const ELEVATOR_IDLE: u8 = 37;
    /// `Event::DirectionIndicatorChanged`. Fields: `car`, `code1` (1 if
    /// going_up else 0), `code2` (1 if going_down else 0), `tick`.
    pub const DIRECTION_INDICATOR_CHANGED: u8 = 38;
    /// `Event::ElevatorRemoved`. Fields: `car`, `entity` (line),
    /// `group`, `tick`.
    pub const ELEVATOR_REMOVED: u8 = 39;
    /// `Event::DestinationQueued`. Fields: `car`, `stop`, `tick`.
    pub const DESTINATION_QUEUED: u8 = 40;
    /// `Event::StopRemoved`. Fields: `stop`, `tick`.
    pub const STOP_REMOVED: u8 = 41;
    /// `Event::DoorCommandQueued`. Fields: `car`, `code1` (door
    /// command — see [`crate::ev_door_command`]), `count` (hold ticks for
    /// `HoldOpen`, `0` for other commands), `tick`.
    pub const DOOR_COMMAND_QUEUED: u8 = 42;
    /// `Event::DoorCommandApplied`. Fields: `car`, `code1` (door
    /// command), `count` (hold ticks for `HoldOpen`), `tick`.
    pub const DOOR_COMMAND_APPLIED: u8 = 43;
    /// `Event::ElevatorUpgraded`. Fields: `car`, `code1` (field — see
    /// [`crate::ev_upgrade_field`]), `f1` (new value when float, NaN
    /// otherwise), `count` (new value when integral ticks, `u32::MAX`
    /// otherwise), `tick`.
    pub const ELEVATOR_UPGRADED: u8 = 44;
    /// `Event::ManualVelocityCommanded`. Fields: `car`, `f1` (target
    /// velocity, `NaN` when the command clears the target), `tick`.
    pub const MANUAL_VELOCITY_COMMANDED: u8 = 45;
    /// `Event::SnapshotDanglingReference`. Fields: `entity` (stale id),
    /// `tick`.
    pub const SNAPSHOT_DANGLING_REFERENCE: u8 = 46;
    /// `Event::RepositionStrategyNotRestored`. Fields: `group`, `tick`.
    pub const REPOSITION_STRATEGY_NOT_RESTORED: u8 = 47;
    /// `Event::DispatchConfigNotRestored`. Fields: `group`, `tick`.
    pub const DISPATCH_CONFIG_NOT_RESTORED: u8 = 48;
    /// `Event::ResidentsAtRemovedStop`. Fields: `stop`, `count`
    /// (residents.len()), `tick`. The actual rider list is **not**
    /// surfaced — this signal is informational; consumers needing the
    /// list should query `ev_sim_residents_at` before the stop is
    /// removed.
    pub const RESIDENTS_AT_REMOVED_STOP: u8 = 49;

    /// Reserved sentinel for variants the FFI does not yet mirror.
    /// Consumers should ignore events with this kind to stay
    /// forward-compatible.
    pub const UNKNOWN: u8 = 0;
}

/// Encoding of [`elevator_core::error::RejectionReason`] in
/// [`EvEvent::code1`] for [`RIDER_REJECTED`](ev_event_kind::RIDER_REJECTED).
#[allow(clippy::doc_markdown)]
pub mod ev_rejection_reason {
    /// `RejectionReason::OverCapacity`.
    pub const OVER_CAPACITY: u8 = 0;
    /// `RejectionReason::PreferenceBased`.
    pub const PREFERENCE_BASED: u8 = 1;
    /// `RejectionReason::AccessDenied`.
    pub const ACCESS_DENIED: u8 = 2;
    /// Unknown / future variant.
    pub const UNKNOWN: u8 = 255;
}

/// Encoding of [`elevator_core::events::RouteInvalidReason`] in
/// [`EvEvent::code1`] for [`ROUTE_INVALIDATED`](ev_event_kind::ROUTE_INVALIDATED).
#[allow(clippy::doc_markdown)]
pub mod ev_route_invalid_reason {
    /// `RouteInvalidReason::StopDisabled`.
    pub const STOP_DISABLED: u8 = 0;
    /// `RouteInvalidReason::NoAlternative`.
    pub const NO_ALTERNATIVE: u8 = 1;
    /// `RouteInvalidReason::StopRemoved`.
    pub const STOP_REMOVED: u8 = 2;
    /// Unknown / future variant.
    pub const UNKNOWN: u8 = 255;
}

/// Encoding of [`elevator_core::door::DoorCommand`] in
/// [`EvEvent::code1`] for door-command events; see
/// [`ev_event_kind::DOOR_COMMAND_QUEUED`] and
/// [`ev_event_kind::DOOR_COMMAND_APPLIED`].
#[allow(clippy::doc_markdown)]
pub mod ev_door_command {
    /// `DoorCommand::Open`.
    pub const OPEN: u8 = 0;
    /// `DoorCommand::Close`.
    pub const CLOSE: u8 = 1;
    /// `DoorCommand::HoldOpen`.
    pub const HOLD_OPEN: u8 = 2;
    /// `DoorCommand::CancelHold`.
    pub const CANCEL_HOLD: u8 = 3;
    /// Unknown / future variant.
    pub const UNKNOWN: u8 = 255;
}

/// Encoding of [`elevator_core::events::UpgradeField`] in
/// [`EvEvent::code1`] for [`ELEVATOR_UPGRADED`](ev_event_kind::ELEVATOR_UPGRADED).
#[allow(clippy::doc_markdown)]
pub mod ev_upgrade_field {
    /// `UpgradeField::MaxSpeed`.
    pub const MAX_SPEED: u8 = 0;
    /// `UpgradeField::Acceleration`.
    pub const ACCELERATION: u8 = 1;
    /// `UpgradeField::Deceleration`.
    pub const DECELERATION: u8 = 2;
    /// `UpgradeField::WeightCapacity`.
    pub const WEIGHT_CAPACITY: u8 = 3;
    /// `UpgradeField::DoorTransitionTicks`.
    pub const DOOR_TRANSITION_TICKS: u8 = 4;
    /// `UpgradeField::DoorOpenTicks`.
    pub const DOOR_OPEN_TICKS: u8 = 5;
    /// Unknown / future variant.
    pub const UNKNOWN: u8 = 255;
}

/// C-ABI-flat projection of every `Event` variant emitted by the
/// simulation.
///
/// The `kind` discriminator picks which fields are meaningful — see
/// [`ev_event_kind`] for the kind constants and per-kind field map.
/// Entity-id fields use `0` to mean "not applicable for this kind"
/// (real entity ids are never zero under the FFI encoding).
///
/// **ABI v4** widened this from 7 to 14 fields to cover the full payload
/// of every core variant in a single drain pass; consumers that bound
/// against v3 must rebuild and check [`EV_ABI_VERSION`].
#[allow(clippy::doc_markdown)]
#[repr(C)]
#[derive(Debug, Clone, Copy, elevator_layout_derive::MultiHostLayout)]
pub struct EvEvent {
    /// Event kind discriminator. Values outside [`ev_event_kind`] are
    /// reserved — surface as [`UNKNOWN`](ev_event_kind::UNKNOWN) and
    /// ignore for forward compatibility.
    pub kind: u8,
    /// Direction code: `1` = Up, `-1` = Down, `0` = N/A. Used by hall-call
    /// events and `PassingFloor`.
    pub direction: i8,
    /// Primary enum payload. Meaning depends on `kind` (see the kind
    /// docs for each event). `0` when not applicable.
    pub code1: u8,
    /// Secondary enum payload. Meaning depends on `kind`. `0` when not
    /// applicable.
    pub code2: u8,
    /// Group id payload (for `LineAdded`, `LineRemoved`, `LineReassigned`,
    /// `StopAdded`, `ElevatorAdded`, `ElevatorRemoved`,
    /// `RepositionStrategyNotRestored`, `DispatchConfigNotRestored`).
    /// `0` for kinds that don't carry a group.
    pub group: u32,
    /// Tick the event was emitted on.
    pub tick: u64,
    /// Stop entity id. Meaning depends on the kind.
    pub stop: u64,
    /// Car/elevator entity id. Meaning depends on the kind.
    pub car: u64,
    /// Rider entity id.
    pub rider: u64,
    /// Destination/floor entity id. Used by `CarButtonPressed` (the
    /// requested floor), `RiderSpawned` (rider's destination), and
    /// `RiderRerouted` (new_destination).
    pub floor: u64,
    /// Generic entity id slot for variants that carry an entity that
    /// doesn't fit `stop`/`car`/`rider`/`floor` — `EntityDisabled`,
    /// `EntityEnabled`, `LineAdded` (line), `StopAdded` (line),
    /// `ElevatorReassigned` (old_line), `SnapshotDanglingReference`,
    /// etc. `0` when not applicable.
    pub entity: u64,
    /// Count payload. Used by `ResidentsAtRemovedStop` (rider count),
    /// `ElevatorUpgraded` (new value when integral ticks, `u64::MAX`
    /// when float), and `LineReassigned` (old group id encoded as u64
    /// for callers that want both groups). `0` when not applicable.
    pub count: u64,
    /// Primary float payload. Used by `EnergyConsumed` (consumed kJ),
    /// `CapacityChanged` (current_load), `ElevatorUpgraded` (new value
    /// when float), and `ManualVelocityCommanded` (target velocity,
    /// `NaN` when the command clears the target).
    pub f1: f64,
    /// Secondary float payload. Used by `EnergyConsumed` (regenerated
    /// kJ) and `CapacityChanged` (capacity).
    pub f2: f64,
    /// Opaque consumer tag for the rider involved in this event,
    /// mirroring [`Rider::tag()`](elevator_core::components::Rider::tag).
    /// Populated for every rider-bearing variant — `RiderSpawned`,
    /// `RiderBoarded`, `RiderExited`, `RiderRejected`, `RiderAbandoned`,
    /// `RiderEjected`, `RiderSettled`, `RiderDespawned`, `RiderRerouted`,
    /// `RiderSkipped`, `RouteInvalidated`, plus `CarButtonPressed` when
    /// the press came from a real rider. `0` when not applicable
    /// (non-rider event, or rider untagged, or synthetic
    /// [`CarButtonPressed`](ev_event_kind::CAR_BUTTON_PRESSED) with no
    /// associated rider).
    pub tag: u64,
}

/// Drain pending events into `out`.
///
/// Every event produced by the simulation is eventually delivered
/// exactly once, then removed from the internal queue. Call after
/// `ev_sim_step` each tick to catch new events.
///
/// As of ABI v4 the FFI surfaces every public core `Event` variant —
/// 49 kinds in total. The per-kind field map (which `EvEvent` slots
/// carry meaningful data) lives on each constant in the
/// [`ev_event_kind`] module. Variants the FFI hasn't enumerated yet
/// surface as [`UNKNOWN`](ev_event_kind::UNKNOWN) so consumers stay
/// forward-compatible.
///
/// Unused fields for each kind are zeroed (numeric slots: `0`; floats:
/// `0.0`) so the caller can inspect a uniform struct layout. Variants
/// that carry an `Option<f64>` use `NaN` instead of `0.0` to
/// disambiguate "no value" from "value of zero" — see the relevant
/// kind's docs.
///
/// ## Overflow handling — no silent drops
///
/// If more than `capacity` events are pending, the first `capacity`
/// are written and the rest stay in an internal queue for the next
/// call. Callers can detect a truncated read two ways:
/// - `out_written == capacity` is *possibly* truncated. Call
///   [`ev_sim_pending_event_count`] afterward; non-zero means more
///   are queued.
/// - Drain in a loop until `ev_sim_pending_event_count` returns `0`.
///
/// # Safety
///
/// `handle`, `out`, and `out_written` must be valid pointers. `out`
/// must point to a buffer of at least `capacity` [`EvEvent`]s.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_drain_events(
    handle: *mut EvSim,
    out: *mut EvEvent,
    capacity: u32,
    out_written: *mut u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out.is_null() || out_written.is_null() {
            set_last_error("null argument");
            return EvStatus::NullArg;
        }
        let ev = unsafe { &mut *handle };
        // Top up the buffer from the sim's event queue. Always
        // drains the full sim queue — holding events inside the sim
        // is expensive, and `pending_events` is the right place to
        // park overflow.
        refill_pending_events(ev);

        // Pop up to `capacity` from the buffer. Remainder persists
        // for the next call, so no event is ever silently dropped.
        let mut written: u32 = 0;
        while written < capacity {
            let Some(ev_record) = ev.pending_events.pop_front() else {
                break;
            };
            // Safety: `written < capacity` and the caller guaranteed
            // `out` points to `capacity` entries.
            unsafe {
                std::ptr::write(out.add(written as usize), ev_record);
            }
            written += 1;
        }
        // Safety: validated non-null above.
        unsafe { std::ptr::write(out_written, written) };
        EvStatus::Ok
    })
}

/// Drain queued log messages into a caller-provided buffer.
///
/// Each [`EvLogMessage::msg_ptr`] borrows from an internal buffer
/// owned by the handle and remains valid only until the next
/// `ev_drain_log_messages` call on the same handle (mirrors the
/// [`ev_sim_frame`] borrow rule). UTF-8 bytes are not
/// null-terminated; bound the read with `msg_len`.
///
/// If more messages are queued than `capacity`, the surplus stays in
/// the internal queue for the next call. Drain in a loop until
/// `out_written < capacity` to consume the full backlog.
///
/// **Lazy opt-in:** the per-handle log queue is empty until the
/// first call to this function (or [`ev_pending_log_message_count`]).
/// Callback-only hosts that never poll pay zero overhead. Once
/// activated, the queue accumulates one record per simulated event;
/// a polling consumer should drain regularly to bound growth.
///
/// # Safety
///
/// `handle`, `out`, and `out_written` must be valid pointers. `out`
/// must point to a buffer of at least `capacity` [`EvLogMessage`]s.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_drain_log_messages(
    handle: *mut EvSim,
    out: *mut EvLogMessage,
    capacity: u32,
    out_written: *mut u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out.is_null() || out_written.is_null() {
            set_last_error("null argument");
            return EvStatus::NullArg;
        }
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        // Activate lazy buffering: from here on, every step queues a
        // record per pending sim event so a future drain has data to
        // return. Callers that never reach this entry point keep
        // their pre-PR zero-buffering behaviour.
        ev.log_polling_active = true;
        // Replace the previous drain buffer; this drops the CStrings
        // that backed the prior call's pointers, invalidating them as
        // documented above.
        ev.log_drain_buf.clear();
        let mut written: u32 = 0;
        while written < capacity {
            let Some(record) = ev.pending_log_messages.pop_front() else {
                break;
            };
            let level = record.level;
            let ts_ns = record.ts_ns;
            ev.log_drain_buf.push(record.msg);
            // Safety: just pushed; index is valid.
            let bytes = ev.log_drain_buf[ev.log_drain_buf.len() - 1].as_bytes();
            let entry = EvLogMessage {
                level,
                ts_ns,
                msg_ptr: bytes.as_ptr(),
                msg_len: u32::try_from(bytes.len()).unwrap_or(u32::MAX),
            };
            // Safety: `written < capacity` and the caller guaranteed
            // `out` points to `capacity` entries.
            unsafe { std::ptr::write(out.add(written as usize), entry) };
            written += 1;
        }
        // Safety: validated non-null above.
        unsafe { std::ptr::write(out_written, written) };
        EvStatus::Ok
    })
}

/// Number of log messages parked in the FFI buffer awaiting a
/// [`ev_drain_log_messages`] call.
///
/// Calling this also activates lazy buffering (see
/// [`ev_drain_log_messages`]), so a consumer that wants to size a
/// buffer up-front may call this once before stepping the sim.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_pending_log_message_count(handle: *mut EvSim) -> u32 {
    guard(0, || {
        if handle.is_null() {
            return 0;
        }
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        ev.log_polling_active = true;
        u32::try_from(ev.pending_log_messages.len()).unwrap_or(u32::MAX)
    })
}

/// Number of events parked in the FFI event buffer plus any pending
/// in the underlying simulation queue. Use this to detect truncation
/// after [`ev_sim_drain_events`] or to size a buffer defensively.
///
/// Calling this does not mutate the sim — it drains the sim's queue
/// into the FFI buffer so the count is accurate, but no events are
/// dropped and a subsequent `ev_sim_drain_events` call returns the
/// same set.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_pending_event_count(handle: *mut EvSim) -> u32 {
    guard(0, || {
        if handle.is_null() {
            return 0;
        }
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        refill_pending_events(ev);
        u32::try_from(ev.pending_events.len()).unwrap_or(u32::MAX)
    })
}

/// Drain the sim's event queue into `ev.pending_events`. The buffer is
/// FIFO so order matches sim emission order across calls.
///
/// Every public core `Event` variant is mirrored — variants the FFI
/// hasn't enumerated yet surface as
/// [`UNKNOWN`](ev_event_kind::UNKNOWN) so consumers stay
/// forward-compatible. See the [`ev_event_kind`] module docs for the
/// per-kind field map.
fn refill_pending_events(ev: &mut EvSim) {
    use elevator_core::events::Event;
    use events_encode as enc;
    for event in ev.sim.drain_events() {
        let record = match event {
            // ── Hall calls ───────────────────────────────────────────
            e @ Event::HallButtonPressed { .. } => enc::hall_button_pressed(e),
            e @ Event::HallCallAcknowledged { .. } => enc::hall_call_acknowledged(e),
            e @ Event::HallCallCleared { .. } => enc::hall_call_cleared(e),
            e @ Event::CarButtonPressed { .. } => enc::car_button_pressed(e),
            // ── Rider lifecycle ──────────────────────────────────────
            e @ Event::RiderSkipped { .. } => enc::rider_skipped(e),
            e @ Event::RiderSpawned { .. } => enc::rider_spawned(e),
            e @ Event::RiderBoarded { .. } => enc::rider_boarded(e),
            e @ Event::RiderExited { .. } => enc::rider_exited(e),
            e @ Event::RiderAbandoned { .. } => enc::rider_abandoned(e),
            e @ Event::RiderEjected { .. } => enc::rider_ejected(e),
            e @ Event::RiderRejected { .. } => enc::rider_rejected(e),
            e @ Event::RiderRerouted { .. } => enc::rider_rerouted(e),
            e @ Event::RiderSettled { .. } => enc::rider_settled(e),
            e @ Event::RiderDespawned { .. } => enc::rider_despawned(e),
            e @ Event::RouteInvalidated { .. } => enc::route_invalidated(e),
            // ── Elevator motion ──────────────────────────────────────
            e @ Event::ElevatorDeparted { .. } => enc::elevator_departed(e),
            e @ Event::ElevatorArrived { .. } => enc::elevator_arrived(e),
            e @ Event::DoorOpened { .. } => enc::door_opened(e),
            e @ Event::DoorClosed { .. } => enc::door_closed(e),
            e @ Event::PassingFloor { .. } => enc::passing_floor(e),
            e @ Event::MovementAborted { .. } => enc::movement_aborted(e),
            // ── Dispatch + repositioning ─────────────────────────────
            e @ Event::ElevatorAssigned { .. } => enc::elevator_assigned(e),
            e @ Event::ElevatorRepositioning { .. } => enc::elevator_repositioning(e),
            e @ Event::ElevatorRepositioned { .. } => enc::elevator_repositioned(e),
            e @ Event::ElevatorRecalled { .. } => enc::elevator_recalled(e),
            // ── Topology lifecycle ───────────────────────────────────
            e @ Event::StopAdded { .. } => enc::stop_added(e),
            e @ Event::ElevatorAdded { .. } => enc::elevator_added(e),
            e @ Event::ElevatorRemoved { .. } => enc::elevator_removed(e),
            e @ Event::StopRemoved { .. } => enc::stop_removed(e),
            e @ Event::EntityDisabled { .. } => enc::entity_disabled(e),
            e @ Event::EntityEnabled { .. } => enc::entity_enabled(e),
            e @ Event::LineAdded { .. } => enc::line_added(e),
            e @ Event::LineRemoved { .. } => enc::line_removed(e),
            e @ Event::LineReassigned { .. } => enc::line_reassigned(e),
            e @ Event::ElevatorReassigned { .. } => enc::elevator_reassigned(e),
            e @ Event::ResidentsAtRemovedStop { .. } => enc::residents_at_removed_stop(e),
            // ── Service mode + manual + indicators ───────────────────
            e @ Event::ServiceModeChanged { .. } => enc::service_mode_changed(e),
            e @ Event::ManualVelocityCommanded { .. } => enc::manual_velocity_commanded(e),
            e @ Event::DirectionIndicatorChanged { .. } => enc::direction_indicator_changed(e),
            // ── Doors ────────────────────────────────────────────────
            e @ Event::DoorCommandQueued { .. } => enc::door_command_queued(e),
            e @ Event::DoorCommandApplied { .. } => enc::door_command_applied(e),
            // ── Observability ────────────────────────────────────────
            e @ Event::CapacityChanged { .. } => enc::capacity_changed(e),
            e @ Event::ElevatorIdle { .. } => enc::elevator_idle(e),
            e @ Event::DestinationQueued { .. } => enc::destination_queued(e),
            e @ Event::ElevatorUpgraded { .. } => enc::elevator_upgraded(e),
            #[cfg(feature = "energy")]
            e @ Event::EnergyConsumed { .. } => enc::energy_consumed(e),
            // ── Snapshot diagnostics ─────────────────────────────────
            e @ Event::SnapshotDanglingReference { .. } => enc::snapshot_dangling_reference(e),
            e @ Event::RepositionStrategyNotRestored { .. } => {
                enc::reposition_strategy_not_restored(e)
            }
            e @ Event::DispatchConfigNotRestored { .. } => enc::dispatch_config_not_restored(e),
            // Drop unknown / non-public variants — caller saw them as
            // UNKNOWN, but emitting an actual event keeps the order
            // stable.
            _ => ev_event_skeleton(ev_event_kind::UNKNOWN, 0),
        };
        ev.pending_events.push_back(record);
    }
}

// ── Rider spawn / despawn ────────────────────────────────────────────────

/// Spawn a rider with default preferences.
///
/// `origin` and `dest` are stop **entity** IDs (from
/// [`EvStopView::entity_id`]), not config-level `StopId` values.
/// `weight` is the rider's mass in the same units as
/// [`EvElevatorView::capacity_kg`].
///
/// On success the new rider's entity id is written to `out_rider_id`.
///
/// # Safety
///
/// `handle` and `out_rider_id` must be valid pointers.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_spawn_rider(
    handle: *mut EvSim,
    origin: u64,
    dest: u64,
    weight: f64,
    out_rider_id: *mut u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_rider_id.is_null() {
            set_last_error("null argument");
            return EvStatus::NullArg;
        }
        let Some(origin) = entity_from_u64(origin) else {
            set_last_error("invalid origin entity id");
            return EvStatus::InvalidArg;
        };
        let Some(dest) = entity_from_u64(dest) else {
            set_last_error("invalid dest entity id");
            return EvStatus::InvalidArg;
        };
        let ev = unsafe { &mut *handle };
        match ev.sim.spawn_rider(origin, dest, weight) {
            Ok(rider_id) => {
                unsafe { std::ptr::write(out_rider_id, entity_to_u64(rider_id.entity())) };
                EvStatus::Ok
            }
            Err(e) => {
                set_last_error(e.to_string());
                EvStatus::NotFound
            }
        }
    })
}

/// Spawn a rider with explicit preferences and patience.
///
/// Like [`ev_sim_spawn_rider`] but allows setting boarding preferences
/// and a patience budget. Use sentinel values to skip optional fields:
/// - `abandon_after_ticks < 0`: no time-based abandonment
/// - `max_wait_ticks < 0`: no `Patience` component attached
///
/// # Safety
///
/// `handle` and `out_rider_id` must be valid pointers.
#[unsafe(no_mangle)]
#[allow(clippy::too_many_lines)]
pub unsafe extern "C" fn ev_sim_spawn_rider_ex(
    handle: *mut EvSim,
    origin: u64,
    dest: u64,
    weight: f64,
    skip_full_elevator: bool,
    max_crowding_factor: f64,
    abandon_after_ticks: i64,
    abandon_on_full: bool,
    max_wait_ticks: i64,
    out_rider_id: *mut u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_rider_id.is_null() {
            set_last_error("null argument");
            return EvStatus::NullArg;
        }
        let Some(origin) = entity_from_u64(origin) else {
            set_last_error("invalid origin entity id");
            return EvStatus::InvalidArg;
        };
        let Some(dest) = entity_from_u64(dest) else {
            set_last_error("invalid dest entity id");
            return EvStatus::InvalidArg;
        };

        let ev = unsafe { &mut *handle };

        let abandon_ticks = if abandon_after_ticks < 0 {
            None
        } else if let Ok(v) = u32::try_from(abandon_after_ticks) {
            Some(v)
        } else {
            set_last_error(format!(
                "abandon_after_ticks {abandon_after_ticks} exceeds u32::MAX ({})",
                u32::MAX
            ));
            return EvStatus::InvalidArg;
        };
        let prefs = elevator_core::components::Preferences::default()
            .with_skip_full_elevator(skip_full_elevator)
            .with_max_crowding_factor(max_crowding_factor)
            .with_abandon_after_ticks(abandon_ticks)
            .with_abandon_on_full(abandon_on_full);

        let mut builder = match ev.sim.build_rider(origin, dest) {
            Ok(b) => b,
            Err(e) => {
                set_last_error(e.to_string());
                return EvStatus::NotFound;
            }
        };
        builder = builder.weight(weight).preferences(prefs);
        if let Ok(ticks) = u64::try_from(max_wait_ticks) {
            builder = builder.patience(ticks);
        } else if max_wait_ticks >= 0 {
            set_last_error(format!("max_wait_ticks {max_wait_ticks} exceeds u64::MAX"));
            return EvStatus::InvalidArg;
        }
        match builder.spawn() {
            Ok(rider_id) => {
                unsafe { std::ptr::write(out_rider_id, entity_to_u64(rider_id.entity())) };
                EvStatus::Ok
            }
            Err(e) => {
                set_last_error(e.to_string());
                EvStatus::NotFound
            }
        }
    })
}

/// Remove a rider from the simulation.
///
/// The rider must be alive (any phase). Emits `RiderDespawned`
/// internally. Use this to clean up riders in terminal phases
/// (`Arrived`, `Abandoned`) and prevent unbounded memory growth.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_despawn_rider(
    handle: *mut EvSim,
    rider_entity_id: u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(rider) = entity_from_u64(rider_entity_id) else {
            set_last_error("invalid rider_entity_id");
            return EvStatus::InvalidArg;
        };
        let ev = unsafe { &mut *handle };
        match ev.sim.despawn_rider(RiderId::from(rider)) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                set_last_error(e.to_string());
                EvStatus::NotFound
            }
        }
    })
}

/// Encode a `CallDirection` for the FFI `EvEvent::direction` field.
/// Matches the encoding used by [`EvHallCall::direction`].
pub(crate) const fn encode_direction(dir: elevator_core::components::CallDirection) -> i8 {
    use elevator_core::components::CallDirection;
    match dir {
        CallDirection::Up => 1,
        CallDirection::Down => -1,
        _ => 0,
    }
}

/// Encode a `RejectionReason` for [`EvEvent::code1`] on
/// [`RIDER_REJECTED`](ev_event_kind::RIDER_REJECTED).
pub(crate) const fn encode_rejection_reason(r: elevator_core::error::RejectionReason) -> u8 {
    use elevator_core::error::RejectionReason;
    match r {
        RejectionReason::OverCapacity => ev_rejection_reason::OVER_CAPACITY,
        RejectionReason::PreferenceBased => ev_rejection_reason::PREFERENCE_BASED,
        RejectionReason::AccessDenied => ev_rejection_reason::ACCESS_DENIED,
        _ => ev_rejection_reason::UNKNOWN,
    }
}

/// Encode a `RouteInvalidReason` for [`EvEvent::code1`] on
/// [`ROUTE_INVALIDATED`](ev_event_kind::ROUTE_INVALIDATED).
pub(crate) const fn encode_route_invalid_reason(
    r: elevator_core::events::RouteInvalidReason,
) -> u8 {
    use elevator_core::events::RouteInvalidReason;
    match r {
        RouteInvalidReason::StopDisabled => ev_route_invalid_reason::STOP_DISABLED,
        RouteInvalidReason::NoAlternative => ev_route_invalid_reason::NO_ALTERNATIVE,
        RouteInvalidReason::StopRemoved => ev_route_invalid_reason::STOP_REMOVED,
        _ => ev_route_invalid_reason::UNKNOWN,
    }
}

/// Encode a `DoorCommand` for [`EvEvent::code1`] on
/// [`DOOR_COMMAND_QUEUED`](ev_event_kind::DOOR_COMMAND_QUEUED) and
/// [`DOOR_COMMAND_APPLIED`](ev_event_kind::DOOR_COMMAND_APPLIED).
/// Returns `(code, hold_ticks)`; `hold_ticks` is non-zero only for
/// `HoldOpen { ticks }`.
pub(crate) const fn encode_door_command(c: elevator_core::door::DoorCommand) -> (u8, u32) {
    use elevator_core::door::DoorCommand;
    match c {
        DoorCommand::Open => (ev_door_command::OPEN, 0),
        DoorCommand::Close => (ev_door_command::CLOSE, 0),
        DoorCommand::HoldOpen { ticks } => (ev_door_command::HOLD_OPEN, ticks),
        DoorCommand::CancelHold => (ev_door_command::CANCEL_HOLD, 0),
        _ => (ev_door_command::UNKNOWN, 0),
    }
}

/// Encode an `UpgradeField` for [`EvEvent::code1`] on
/// [`ELEVATOR_UPGRADED`](ev_event_kind::ELEVATOR_UPGRADED).
pub(crate) const fn encode_upgrade_field(f: elevator_core::events::UpgradeField) -> u8 {
    use elevator_core::events::UpgradeField;
    match f {
        UpgradeField::MaxSpeed => ev_upgrade_field::MAX_SPEED,
        UpgradeField::Acceleration => ev_upgrade_field::ACCELERATION,
        UpgradeField::Deceleration => ev_upgrade_field::DECELERATION,
        UpgradeField::WeightCapacity => ev_upgrade_field::WEIGHT_CAPACITY,
        UpgradeField::DoorTransitionTicks => ev_upgrade_field::DOOR_TRANSITION_TICKS,
        UpgradeField::DoorOpenTicks => ev_upgrade_field::DOOR_OPEN_TICKS,
        _ => ev_upgrade_field::UNKNOWN,
    }
}

/// Encode the `ServiceMode` enum for [`EvEvent::code1`]/`code2` on
/// [`SERVICE_MODE_CHANGED`](ev_event_kind::SERVICE_MODE_CHANGED) using
/// the same numbers as [`EvServiceMode`].
pub(crate) const fn encode_service_mode(m: elevator_core::components::ServiceMode) -> u8 {
    use elevator_core::components::ServiceMode;
    match m {
        ServiceMode::Normal => EvServiceMode::Normal as u8,
        ServiceMode::Independent => EvServiceMode::Independent as u8,
        ServiceMode::Inspection => EvServiceMode::Inspection as u8,
        ServiceMode::Manual => EvServiceMode::Manual as u8,
        ServiceMode::OutOfService => EvServiceMode::OutOfService as u8,
        _ => 255,
    }
}

/// Helper: produce a fully-zero [`EvEvent`] template for a given kind +
/// tick. Per-kind `refill_pending_events` arms then overwrite the
/// fields they need.
pub(crate) const fn ev_event_skeleton(kind: u8, tick: u64) -> EvEvent {
    EvEvent {
        kind,
        direction: 0,
        code1: 0,
        code2: 0,
        group: 0,
        tick,
        stop: 0,
        car: 0,
        rider: 0,
        floor: 0,
        entity: 0,
        count: 0,
        f1: 0.0,
        f2: 0.0,
        tag: 0,
    }
}

// ── Topology mutation ─────────────────────────────────────────────────────
//
// Runtime helpers for adding and removing groups, lines, and stops after
// the Simulation has been built. Mirrors the wasm crate's addGroup /
// addLine / addStop / removeLine / removeStop / removeElevator surface;
// brings FFI to wasm's level for topology coverage.
//
// Strings are passed as null-terminated UTF-8. Out-params receive entity
// ids on success. `add_elevator` is deferred to a follow-up because its
// 11-field ElevatorParams struct needs its own repr-C design pass.

/// Add a new dispatch group. On success, writes the new group's id to
/// `*out_group_id`. Group ids are u32 and never reused.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`]. `name`
/// must be a null-terminated UTF-8 C string. `out_group_id` must be a
/// valid pointer to a writable u32.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_add_group(
    handle: *mut EvSim,
    name: *const c_char,
    strategy: EvStrategy,
    out_group_id: *mut u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || name.is_null() || out_group_id.is_null() {
            set_last_error("handle, name, or out_group_id is null");
            return EvStatus::NullArg;
        }
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        // Safety: caller guarantees null-terminated string.
        let cstr = unsafe { CStr::from_ptr(name) };
        let name_str = match cstr.to_str() {
            Ok(s) => s.to_owned(),
            Err(e) => {
                set_last_error(format!("name is not valid UTF-8: {e}"));
                return EvStatus::InvalidUtf8;
            }
        };
        // `Simulation::add_group` is generic over the concrete strategy
        // type, so dispatch on the enum to instantiate the right one
        // directly. Mirrors the explicit match in `elevator-wasm`.
        let Some(builtin) = strategy.as_builtin() else {
            set_last_error("EvStrategy::Custom is output-only — pass a concrete builtin");
            return EvStatus::InvalidArg;
        };
        let group_id = match builtin {
            BuiltinStrategy::Scan => ev.sim.add_group(name_str, ScanDispatch::new()),
            BuiltinStrategy::Look => ev.sim.add_group(name_str, LookDispatch::new()),
            BuiltinStrategy::NearestCar => ev.sim.add_group(name_str, NearestCarDispatch::new()),
            BuiltinStrategy::Etd => ev.sim.add_group(name_str, EtdDispatch::new()),
            BuiltinStrategy::Destination => ev.sim.add_group(name_str, DestinationDispatch::new()),
            BuiltinStrategy::Rsr => ev.sim.add_group(name_str, RsrDispatch::new()),
            other => {
                set_last_error(format!("unsupported strategy: {other:?}"));
                return EvStatus::InvalidArg;
            }
        };
        // Safety: caller guarantees out_group_id is writable.
        unsafe { *out_group_id = group_id.0 };
        EvStatus::Ok
    })
}

/// Add a new line to an existing group. On success, writes the new line
/// entity id to `*out_line_entity_id`.
///
/// `max_cars` is a sentinel: pass `0` for unlimited, otherwise the cap.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`]. `name`
/// must be a null-terminated UTF-8 C string. `out_line_entity_id` must
/// be a valid pointer to a writable u64.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_add_line(
    handle: *mut EvSim,
    group_id: u32,
    name: *const c_char,
    min_position: f64,
    max_position: f64,
    max_cars: u32,
    out_line_entity_id: *mut u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || name.is_null() || out_line_entity_id.is_null() {
            set_last_error("handle, name, or out_line_entity_id is null");
            return EvStatus::NullArg;
        }
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        // Safety: caller guarantees null-terminated string.
        let cstr = unsafe { CStr::from_ptr(name) };
        let name_str = match cstr.to_str() {
            Ok(s) => s.to_owned(),
            Err(e) => {
                set_last_error(format!("name is not valid UTF-8: {e}"));
                return EvStatus::InvalidUtf8;
            }
        };
        let mut params = elevator_core::sim::LineParams::new(name_str, GroupId(group_id));
        params.min_position = min_position;
        params.max_position = max_position;
        params.max_cars = if max_cars == 0 {
            None
        } else {
            Some(max_cars as usize)
        };
        match ev.sim.add_line(&params) {
            Ok(line) => {
                // Safety: caller guarantees out_line_entity_id is writable.
                unsafe { *out_line_entity_id = entity_to_u64(line) };
                EvStatus::Ok
            }
            Err(e) => {
                let status = match e {
                    elevator_core::error::SimError::GroupNotFound(_) => EvStatus::NotFound,
                    _ => EvStatus::InvalidArg,
                };
                set_last_error(format!("add_line: {e}"));
                status
            }
        }
    })
}

/// Add a new stop to a line. On success, writes the new stop entity id
/// to `*out_stop_entity_id`.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`]. `name`
/// must be a null-terminated UTF-8 C string. `out_stop_entity_id` must
/// be a valid pointer to a writable u64.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_add_stop(
    handle: *mut EvSim,
    line_entity_id: u64,
    name: *const c_char,
    position: f64,
    out_stop_entity_id: *mut u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || name.is_null() || out_stop_entity_id.is_null() {
            set_last_error("handle, name, or out_stop_entity_id is null");
            return EvStatus::NullArg;
        }
        let Some(line) = entity_from_u64(line_entity_id) else {
            set_last_error("line_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        // Safety: caller guarantees null-terminated string.
        let cstr = unsafe { CStr::from_ptr(name) };
        let name_str = match cstr.to_str() {
            Ok(s) => s.to_owned(),
            Err(e) => {
                set_last_error(format!("name is not valid UTF-8: {e}"));
                return EvStatus::InvalidUtf8;
            }
        };
        match ev.sim.add_stop(name_str, position, line) {
            Ok(stop) => {
                // Safety: caller guarantees out_stop_entity_id is writable.
                unsafe { *out_stop_entity_id = entity_to_u64(stop) };
                EvStatus::Ok
            }
            Err(e) => {
                let status = match e {
                    elevator_core::error::SimError::LineNotFound(_) => EvStatus::NotFound,
                    _ => EvStatus::InvalidArg,
                };
                set_last_error(format!("add_stop: {e}"));
                status
            }
        }
    })
}

/// Set the reachable position range of a line. Cars whose current
/// position falls outside the new `[min, max]` are clamped to the
/// boundary; their phase is left untouched.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_set_line_range(
    handle: *mut EvSim,
    line_entity_id: u64,
    min_position: f64,
    max_position: f64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(line) = entity_from_u64(line_entity_id) else {
            set_last_error("line_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.set_line_range(line, min_position, max_position) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = match e {
                    elevator_core::error::SimError::LineNotFound(_) => EvStatus::NotFound,
                    _ => EvStatus::InvalidArg,
                };
                set_last_error(format!("set_line_range: {e}"));
                status
            }
        }
    })
}

/// Remove a line. All elevators on the line are also removed; riders on
/// those elevators are ejected to the nearest remaining stop.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_remove_line(handle: *mut EvSim, line_entity_id: u64) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(line) = entity_from_u64(line_entity_id) else {
            set_last_error("line_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.remove_line(line) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = match e {
                    elevator_core::error::SimError::LineNotFound(_) => EvStatus::NotFound,
                    _ => EvStatus::InvalidArg,
                };
                set_last_error(format!("remove_line: {e}"));
                status
            }
        }
    })
}

/// Remove a stop. Riders waiting at this stop are abandoned; riders
/// destined here are rerouted to the next viable stop on their route.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_remove_stop(handle: *mut EvSim, stop_entity_id: u64) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(stop) = entity_from_u64(stop_entity_id) else {
            set_last_error("stop_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.remove_stop(stop) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = match e {
                    elevator_core::error::SimError::EntityNotFound(_) => EvStatus::NotFound,
                    _ => EvStatus::InvalidArg,
                };
                set_last_error(format!("remove_stop: {e}"));
                status
            }
        }
    })
}

// ── add_elevator ─────────────────────────────────────────────────────────

/// Repr-C mirror of [`elevator_core::sim::ElevatorParams`].
///
/// Sentinel encoding:
/// - `bypass_load_up_pct` and `bypass_load_down_pct`: NaN encodes
///   [`Option::None`]; any finite value is treated as `Some(v)`.
///
/// Use [`ev_sim_default_elevator_params`] to populate this struct with
/// the same defaults as `ElevatorParams::default()`. Callers should
/// supply `restricted_stops` separately as a `(*const u64, count)` pair
/// to [`ev_sim_add_elevator`].
#[repr(C)]
#[derive(Debug, Clone, Copy, elevator_layout_derive::MultiHostLayout)]
pub struct EvElevatorParams {
    /// Maximum travel speed (distance/tick); must be positive and finite.
    pub max_speed: f64,
    /// Acceleration rate (distance/tick^2); must be positive and finite.
    pub acceleration: f64,
    /// Deceleration rate (distance/tick^2); must be positive and finite.
    pub deceleration: f64,
    /// Maximum weight the car can carry; must be positive and finite.
    pub weight_capacity: f64,
    /// Ticks for a door open/close transition; must be > 0.
    pub door_transition_ticks: u32,
    /// Ticks the door stays fully open; must be > 0.
    pub door_open_ticks: u32,
    /// Speed multiplier for Inspection mode; must satisfy `0.0 < x <= 1.0`.
    pub inspection_speed_factor: f64,
    /// Full-load bypass threshold for upward pickups, or `NaN` for None.
    /// When non-NaN, must satisfy `0.0 <= x <= 1.0`.
    pub bypass_load_up_pct: f64,
    /// Full-load bypass threshold for downward pickups, or `NaN` for None.
    /// When non-NaN, must satisfy `0.0 <= x <= 1.0`.
    pub bypass_load_down_pct: f64,
}

/// Populate `out_params` with the same defaults as
/// [`ElevatorParams::default()`](elevator_core::sim::ElevatorParams).
///
/// `restricted_stops` is implicitly empty (callers pass `count = 0` to
/// [`ev_sim_add_elevator`]).
///
/// # Safety
///
/// `out_params` must be a writable [`EvElevatorParams`] pointer.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_default_elevator_params(
    out_params: *mut EvElevatorParams,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if out_params.is_null() {
            set_last_error("out_params is null");
            return EvStatus::NullArg;
        }
        let defaults = elevator_core::sim::ElevatorParams::default();
        // Safety: caller guarantees out_params is writable.
        unsafe {
            *out_params = EvElevatorParams {
                max_speed: defaults.max_speed.value(),
                acceleration: defaults.acceleration.value(),
                deceleration: defaults.deceleration.value(),
                weight_capacity: defaults.weight_capacity.value(),
                door_transition_ticks: defaults.door_transition_ticks,
                door_open_ticks: defaults.door_open_ticks,
                inspection_speed_factor: defaults.inspection_speed_factor,
                bypass_load_up_pct: defaults.bypass_load_up_pct.unwrap_or(f64::NAN),
                bypass_load_down_pct: defaults.bypass_load_down_pct.unwrap_or(f64::NAN),
            };
        }
        EvStatus::Ok
    })
}

/// Add a new elevator at runtime. On success, writes the new elevator
/// entity id to `*out_elevator_entity_id`.
///
/// `restricted_stops` is a `(ptr, count)` pair giving the set of stop
/// entity ids this elevator cannot serve. Pass `(null, 0)` for no
/// restrictions. Duplicate entries are deduplicated.
///
/// # Safety
///
/// - `handle` must be a valid pointer returned by [`ev_sim_create`].
/// - `params` must be a valid pointer to a populated [`EvElevatorParams`].
/// - `restricted_stops` must point to at least `restricted_stops_count`
///   contiguous `u64` values, or be null when `restricted_stops_count == 0`.
/// - `out_elevator_entity_id` must be a writable `u64` pointer.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_add_elevator(
    handle: *mut EvSim,
    params: *const EvElevatorParams,
    restricted_stops: *const u64,
    restricted_stops_count: u32,
    line_entity_id: u64,
    starting_position: f64,
    out_elevator_entity_id: *mut u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || params.is_null() || out_elevator_entity_id.is_null() {
            set_last_error("handle, params, or out_elevator_entity_id is null");
            return EvStatus::NullArg;
        }
        if restricted_stops.is_null() && restricted_stops_count != 0 {
            set_last_error("restricted_stops is null but count is non-zero");
            return EvStatus::NullArg;
        }
        let Some(line) = entity_from_u64(line_entity_id) else {
            set_last_error("line_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: caller guarantees params is a valid EvElevatorParams.
        let p = unsafe { &*params };
        // Safety: caller guarantees the slice is valid for `count` elements.
        let restricted_slice: &[u64] = if restricted_stops_count == 0 {
            &[]
        } else {
            unsafe { std::slice::from_raw_parts(restricted_stops, restricted_stops_count as usize) }
        };
        let mut restricted_set = std::collections::HashSet::with_capacity(restricted_slice.len());
        for raw in restricted_slice {
            let Some(eid) = entity_from_u64(*raw) else {
                set_last_error(format!("restricted_stops contains invalid id {raw}"));
                return EvStatus::InvalidArg;
            };
            restricted_set.insert(eid);
        }

        let core_params = elevator_core::sim::ElevatorParams {
            max_speed: elevator_core::components::Speed::from(p.max_speed),
            acceleration: elevator_core::components::Accel::from(p.acceleration),
            deceleration: elevator_core::components::Accel::from(p.deceleration),
            weight_capacity: elevator_core::components::Weight::from(p.weight_capacity),
            door_transition_ticks: p.door_transition_ticks,
            door_open_ticks: p.door_open_ticks,
            restricted_stops: restricted_set,
            inspection_speed_factor: p.inspection_speed_factor,
            bypass_load_up_pct: if p.bypass_load_up_pct.is_nan() {
                None
            } else {
                Some(p.bypass_load_up_pct)
            },
            bypass_load_down_pct: if p.bypass_load_down_pct.is_nan() {
                None
            } else {
                Some(p.bypass_load_down_pct)
            },
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.add_elevator(&core_params, line, starting_position) {
            Ok(elevator) => {
                // Safety: caller guarantees out_elevator_entity_id is writable.
                unsafe { *out_elevator_entity_id = entity_to_u64(elevator) };
                EvStatus::Ok
            }
            Err(e) => {
                let status = match e {
                    elevator_core::error::SimError::LineNotFound(_) => EvStatus::NotFound,
                    _ => EvStatus::InvalidArg,
                };
                set_last_error(format!("add_elevator: {e}"));
                status
            }
        }
    })
}

/// Remove an elevator. Riders aboard are ejected to the next scheduled
/// stop in the car's destination queue, or to the nearest stop on the
/// line if the queue is empty.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_remove_elevator(
    handle: *mut EvSim,
    elevator_entity_id: u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            set_last_error("elevator_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.remove_elevator(elevator) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = match e {
                    elevator_core::error::SimError::EntityNotFound(_) => EvStatus::NotFound,
                    _ => EvStatus::InvalidArg,
                };
                set_last_error(format!("remove_elevator: {e}"));
                status
            }
        }
    })
}

/// Add an existing stop to a line's served list.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_add_stop_to_line(
    handle: *mut EvSim,
    stop_entity_id: u64,
    line_entity_id: u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let (Some(stop), Some(line)) = (
            entity_from_u64(stop_entity_id),
            entity_from_u64(line_entity_id),
        ) else {
            set_last_error("stop_entity_id or line_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.add_stop_to_line(stop, line) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = match e {
                    elevator_core::error::SimError::EntityNotFound(_)
                    | elevator_core::error::SimError::LineNotFound(_) => EvStatus::NotFound,
                    _ => EvStatus::InvalidArg,
                };
                set_last_error(format!("add_stop_to_line: {e}"));
                status
            }
        }
    })
}

/// Remove a stop from a line's served list. The stop entity itself
/// remains in the world — call [`ev_sim_remove_stop`] to fully despawn.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_remove_stop_from_line(
    handle: *mut EvSim,
    stop_entity_id: u64,
    line_entity_id: u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let (Some(stop), Some(line)) = (
            entity_from_u64(stop_entity_id),
            entity_from_u64(line_entity_id),
        ) else {
            set_last_error("stop_entity_id or line_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.remove_stop_from_line(stop, line) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = match e {
                    elevator_core::error::SimError::LineNotFound(_) => EvStatus::NotFound,
                    _ => EvStatus::InvalidArg,
                };
                set_last_error(format!("remove_stop_from_line: {e}"));
                status
            }
        }
    })
}

/// Reassign a line to a different group. Writes the previous group id
/// to `*out_old_group` on success.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
/// `out_old_group` may be null if the caller does not need the previous id.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_assign_line_to_group(
    handle: *mut EvSim,
    line_entity_id: u64,
    new_group: u32,
    out_old_group: *mut u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(line) = entity_from_u64(line_entity_id) else {
            set_last_error("line_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.assign_line_to_group(line, GroupId(new_group)) {
            Ok(old) => {
                if !out_old_group.is_null() {
                    // Safety: caller guarantees out_old_group writable when non-null.
                    unsafe { *out_old_group = old.0 };
                }
                EvStatus::Ok
            }
            Err(e) => {
                let status = match e {
                    elevator_core::error::SimError::LineNotFound(_)
                    | elevator_core::error::SimError::GroupNotFound(_) => EvStatus::NotFound,
                    _ => EvStatus::InvalidArg,
                };
                set_last_error(format!("assign_line_to_group: {e}"));
                status
            }
        }
    })
}

/// Reassign an elevator to a different line.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_reassign_elevator_to_line(
    handle: *mut EvSim,
    elevator_entity_id: u64,
    new_line_entity_id: u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let (Some(elevator), Some(new_line)) = (
            entity_from_u64(elevator_entity_id),
            entity_from_u64(new_line_entity_id),
        ) else {
            set_last_error("elevator_entity_id or new_line_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.reassign_elevator_to_line(elevator, new_line) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = match e {
                    elevator_core::error::SimError::EntityNotFound(_)
                    | elevator_core::error::SimError::LineNotFound(_) => EvStatus::NotFound,
                    _ => EvStatus::InvalidArg,
                };
                set_last_error(format!("reassign_elevator_to_line: {e}"));
                status
            }
        }
    })
}

/// Set the list of stops `elevator_entity_id` is forbidden from
/// serving. The list replaces the current restriction set entirely.
/// Pass `count = 0` to clear all restrictions.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
/// `stop_ids` must point to at least `count` `u64` values when
/// `count > 0`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_set_elevator_restricted_stops(
    handle: *mut EvSim,
    elevator_entity_id: u64,
    stop_ids: *const u64,
    count: u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        if count > 0 && stop_ids.is_null() {
            set_last_error("stop_ids is null but count > 0");
            return EvStatus::NullArg;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            set_last_error("elevator_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: caller guarantees stop_ids points to at least `count`
        // u64 values when count > 0.
        let raw = if count == 0 {
            &[][..]
        } else {
            unsafe { std::slice::from_raw_parts(stop_ids, count as usize) }
        };
        let mut set = std::collections::HashSet::with_capacity(raw.len());
        for &raw_id in raw {
            let Some(stop) = entity_from_u64(raw_id) else {
                set_last_error("a stop_ids entry was invalid");
                return EvStatus::InvalidArg;
            };
            set.insert(stop);
        }
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.set_elevator_restricted_stops(elevator, set) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("set_elevator_restricted_stops: {e}"));
                status
            }
        }
    })
}

/// Pin `elevator_entity_id` to a hard-coded home stop. Whenever the
/// car is idle and off-position, the reposition phase routes it to
/// `home_stop_entity_id` regardless of the group's reposition strategy.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_set_elevator_home_stop(
    handle: *mut EvSim,
    elevator_entity_id: u64,
    home_stop_entity_id: u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            set_last_error("elevator_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        let Some(stop) = entity_from_u64(home_stop_entity_id) else {
            set_last_error("home_stop_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev
            .sim
            .set_elevator_home_stop(elevator_core::entity::ElevatorId::from(elevator), stop)
        {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("set_elevator_home_stop: {e}"));
                status
            }
        }
    })
}

/// Remove the home-stop pin from `elevator_entity_id`. Reposition
/// decisions return to the group's reposition strategy. Idempotent.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_clear_elevator_home_stop(
    handle: *mut EvSim,
    elevator_entity_id: u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            set_last_error("elevator_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev
            .sim
            .clear_elevator_home_stop(elevator_core::entity::ElevatorId::from(elevator))
        {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("clear_elevator_home_stop: {e}"));
                status
            }
        }
    })
}

/// Read the home-stop pin for `elevator_entity_id`. Writes the stop
/// entity id (or `0` for unpinned) into `*out_stop_id` and returns
/// `EvStatus_Ok`.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
/// `out_stop_id` must be a valid, writable pointer to a `u64`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_elevator_home_stop(
    handle: *mut EvSim,
    elevator_entity_id: u64,
    out_stop_id: *mut u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        if out_stop_id.is_null() {
            set_last_error("out_stop_id is null");
            return EvStatus::NullArg;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            set_last_error("elevator_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        match ev
            .sim
            .elevator_home_stop(elevator_core::entity::ElevatorId::from(elevator))
        {
            Ok(stop) => {
                let raw = stop.map_or(0, entity_to_u64);
                // Safety: caller-provided writable u64 pointer.
                unsafe { *out_stop_id = raw };
                EvStatus::Ok
            }
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("elevator_home_stop: {e}"));
                status
            }
        }
    })
}

// ── Tagging ──────────────────────────────────────────────────────────────
//
// Attach string tags to entities for grouped metrics. Mirrors wasm's
// tagEntity / untagEntity. The `all_tags` and `metrics_for_tag`
// accessors are deferred — `all_tags` needs a string-buffer pattern
// and `metrics_for_tag` needs a TaggedMetric DTO.

/// Attach `tag` to `entity_id`.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
/// `tag` must be a null-terminated UTF-8 C string.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_tag_entity(
    handle: *mut EvSim,
    entity_id: u64,
    tag: *const c_char,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || tag.is_null() {
            set_last_error("handle or tag is null");
            return EvStatus::NullArg;
        }
        let Some(entity) = entity_from_u64(entity_id) else {
            set_last_error("entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: caller guarantees null-terminated string.
        let cstr = unsafe { CStr::from_ptr(tag) };
        let tag_str = match cstr.to_str() {
            Ok(s) => s.to_owned(),
            Err(e) => {
                set_last_error(format!("tag is not valid UTF-8: {e}"));
                return EvStatus::InvalidUtf8;
            }
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.tag_entity(entity, tag_str) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("tag_entity: {e}"));
                status
            }
        }
    })
}

/// Remove `tag` from `entity_id`. No-op if the entity wasn't tagged.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
/// `tag` must be a null-terminated UTF-8 C string.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_untag_entity(
    handle: *mut EvSim,
    entity_id: u64,
    tag: *const c_char,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || tag.is_null() {
            set_last_error("handle or tag is null");
            return EvStatus::NullArg;
        }
        let Some(entity) = entity_from_u64(entity_id) else {
            set_last_error("entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: caller guarantees null-terminated string.
        let cstr = unsafe { CStr::from_ptr(tag) };
        let tag_str = match cstr.to_str() {
            Ok(s) => s,
            Err(e) => {
                set_last_error(format!("tag is not valid UTF-8: {e}"));
                return EvStatus::InvalidUtf8;
            }
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        ev.sim.untag_entity(entity, tag_str);
        EvStatus::Ok
    })
}

// ── Routes + rider lifecycle ─────────────────────────────────────────────
//
// Per-rider mutations (reroute, settle, access) and read-only graph
// queries (reachability, transfer points). The full-Route overloads
// (set_rider_route, reroute_rider, shortest_route) need a Route DTO and
// land in a follow-up — todo:PR-Routes-DTO.

/// Replace a rider's destination with `new_destination_entity_id`. Used
/// for in-flight redirects (e.g. tenant changes mind).
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_reroute(
    handle: *mut EvSim,
    rider_entity_id: u64,
    new_destination_entity_id: u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let (Some(rider), Some(dest)) = (
            entity_from_u64(rider_entity_id),
            entity_from_u64(new_destination_entity_id),
        ) else {
            set_last_error("rider_entity_id or new_destination_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        // The unified `reroute` takes a `Route`; construct a single-leg
        // direct route from the rider's current stop to the new destination.
        // Mirrors the prior `reroute(RiderId, EntityId)` semantics.
        let Some(origin) = ev
            .sim
            .world()
            .rider(rider)
            .and_then(elevator_core::components::Rider::current_stop)
        else {
            set_last_error("rider has no current stop");
            return EvStatus::NotFound;
        };
        let route = elevator_core::components::Route::direct(origin, dest, GroupId(0));
        match ev.sim.reroute(RiderId::from(rider), route) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("reroute: {e}"));
                status
            }
        }
    })
}

/// Mark a rider as settled at their current stop (resident pool).
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_settle_rider(handle: *mut EvSim, rider_entity_id: u64) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(rider) = entity_from_u64(rider_entity_id) else {
            set_last_error("rider_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.settle_rider(RiderId::from(rider)) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("settle_rider: {e}"));
                status
            }
        }
    })
}

/// Attach an opaque tag to a rider. Stored verbatim — the engine never
/// interprets the value. Pass `0` to clear (the reserved "untagged"
/// sentinel). Survives snapshot round-trip.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_set_rider_tag(
    handle: *mut EvSim,
    rider_entity_id: u64,
    tag: u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(rider) = entity_from_u64(rider_entity_id) else {
            set_last_error("rider_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.set_rider_tag(RiderId::from(rider), tag) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("set_rider_tag: {e}"));
                status
            }
        }
    })
}

/// Read the opaque tag attached to a rider. Writes the value into
/// `*out_tag` and returns `EvStatus_Ok`. Returns `0` for the default
/// "untagged" state.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
/// `out_tag` must be a valid, writable pointer to a `u64`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_rider_tag(
    handle: *mut EvSim,
    rider_entity_id: u64,
    out_tag: *mut u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        if out_tag.is_null() {
            set_last_error("out_tag is null");
            return EvStatus::NullArg;
        }
        let Some(rider) = entity_from_u64(rider_entity_id) else {
            set_last_error("rider_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        match ev.sim.rider_tag(RiderId::from(rider)) {
            Ok(tag) => {
                // Safety: caller-provided writable u64 pointer.
                unsafe { *out_tag = tag };
                EvStatus::Ok
            }
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("rider_tag: {e}"));
                status
            }
        }
    })
}

/// Replace a rider's remaining route with a single-leg route via
/// `group_id`. Convenience wrapper for the common "send this rider via
/// this group" case.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_set_rider_route_direct(
    handle: *mut EvSim,
    rider_entity_id: u64,
    from_stop_entity_id: u64,
    to_stop_entity_id: u64,
    group_id: u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(rider) = entity_from_u64(rider_entity_id) else {
            set_last_error("rider_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        let Some(from) = entity_from_u64(from_stop_entity_id) else {
            set_last_error("from_stop_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        let Some(to) = entity_from_u64(to_stop_entity_id) else {
            set_last_error("to_stop_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        let route = elevator_core::components::Route::direct(from, to, GroupId(group_id));
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.reroute(RiderId::from(rider), route) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("set_rider_route_direct: {e}"));
                status
            }
        }
    })
}

/// Replace a rider's remaining route with a multi-leg route built from
/// `shortest_route(rider's current_stop → to_stop)`.
///
/// Returns `EvStatus_NotFound` if no route exists or the rider has
/// no current stop.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_set_rider_route_shortest(
    handle: *mut EvSim,
    rider_entity_id: u64,
    to_stop_entity_id: u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(rider) = entity_from_u64(rider_entity_id) else {
            set_last_error("rider_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        let Some(to) = entity_from_u64(to_stop_entity_id) else {
            set_last_error("to_stop_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        let Some(from) = ev
            .sim
            .world()
            .rider(rider)
            .and_then(elevator_core::components::Rider::current_stop)
        else {
            set_last_error("rider has no current stop");
            return EvStatus::NotFound;
        };
        let Some(route) = ev.sim.shortest_route(from, to) else {
            set_last_error("no route between rider's stop and to_stop");
            return EvStatus::NotFound;
        };
        match ev.sim.reroute(RiderId::from(rider), route) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("set_rider_route_shortest: {e}"));
                status
            }
        }
    })
}

/// Give a `Resident` rider a single-leg route via `group_id`,
/// transitioning them back to `Waiting`. The route's first leg origin
/// must match the rider's current stop.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_reroute_rider_direct(
    handle: *mut EvSim,
    rider_entity_id: u64,
    from_stop_entity_id: u64,
    to_stop_entity_id: u64,
    group_id: u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(rider) = entity_from_u64(rider_entity_id) else {
            set_last_error("rider_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        let Some(from) = entity_from_u64(from_stop_entity_id) else {
            set_last_error("from_stop_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        let Some(to) = entity_from_u64(to_stop_entity_id) else {
            set_last_error("to_stop_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        let route = elevator_core::components::Route::direct(from, to, GroupId(group_id));
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.reroute(RiderId::from(rider), route) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("reroute_rider_direct: {e}"));
                status
            }
        }
    })
}

/// Give a `Resident` rider a multi-leg route to `to_stop` built from
/// `shortest_route(rider's current_stop → to_stop)`, transitioning them
/// back to `Waiting`.
///
/// Returns `EvStatus_NotFound` if the rider has no current stop or
/// no route exists.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_reroute_rider_shortest(
    handle: *mut EvSim,
    rider_entity_id: u64,
    to_stop_entity_id: u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(rider) = entity_from_u64(rider_entity_id) else {
            set_last_error("rider_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        let Some(to) = entity_from_u64(to_stop_entity_id) else {
            set_last_error("to_stop_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        let Some(from) = ev
            .sim
            .world()
            .rider(rider)
            .and_then(elevator_core::components::Rider::current_stop)
        else {
            set_last_error("rider has no current stop");
            return EvStatus::NotFound;
        };
        let Some(route) = ev.sim.shortest_route(from, to) else {
            set_last_error("no route between rider's stop and to_stop");
            return EvStatus::NotFound;
        };
        match ev.sim.reroute(RiderId::from(rider), route) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("reroute_rider_shortest: {e}"));
                status
            }
        }
    })
}

/// Replace a rider's allowed-stops set. Pass `count = 0` to clear.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
/// `stop_ids` must point to at least `count` `u64` values when
/// `count > 0`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_set_rider_access(
    handle: *mut EvSim,
    rider_entity_id: u64,
    stop_ids: *const u64,
    count: u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        if count > 0 && stop_ids.is_null() {
            set_last_error("stop_ids is null but count > 0");
            return EvStatus::NullArg;
        }
        let Some(rider) = entity_from_u64(rider_entity_id) else {
            set_last_error("rider_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: caller guarantees stop_ids points to at least `count`
        // u64 values when count > 0.
        let raw = if count == 0 {
            &[][..]
        } else {
            unsafe { std::slice::from_raw_parts(stop_ids, count as usize) }
        };
        let mut set = std::collections::HashSet::with_capacity(raw.len());
        for &raw_id in raw {
            let Some(stop) = entity_from_u64(raw_id) else {
                set_last_error("a stop_ids entry was invalid");
                return EvStatus::InvalidArg;
            };
            set.insert(stop);
        }
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.set_rider_access(rider, set) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("set_rider_access: {e}"));
                status
            }
        }
    })
}

/// Stops reachable from `from_stop_entity_id` via the line-graph.
/// Buffer-pattern accessor (see [`ev_sim_destination_queue`]).
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_reachable_stops_from(
    handle: *mut EvSim,
    from_stop_entity_id: u64,
    out: *mut u64,
    capacity: u32,
    out_written: *mut u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_written.is_null() {
            set_last_error("handle or out_written is null");
            return EvStatus::NullArg;
        }
        if capacity > 0 && out.is_null() {
            set_last_error("out is null but capacity > 0");
            return EvStatus::NullArg;
        }
        let Some(stop) = entity_from_u64(from_stop_entity_id) else {
            set_last_error("from_stop_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        let stops = ev.sim.reachable_stops_from(stop);
        // Safety: `out` validity guaranteed by caller.
        let written = unsafe { write_entity_buffer(stops.into_iter(), out, capacity) };
        // Safety: out_written non-null per check above.
        unsafe { *out_written = written };
        EvStatus::Ok
    })
}

/// Stops where multiple lines intersect (transfer candidates).
/// Buffer-pattern accessor.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_transfer_points(
    handle: *mut EvSim,
    out: *mut u64,
    capacity: u32,
    out_written: *mut u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_written.is_null() {
            set_last_error("handle or out_written is null");
            return EvStatus::NullArg;
        }
        if capacity > 0 && out.is_null() {
            set_last_error("out is null but capacity > 0");
            return EvStatus::NullArg;
        }
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        let stops = ev.sim.transfer_points();
        // Safety: `out` validity guaranteed by caller.
        let written = unsafe { write_entity_buffer(stops.into_iter(), out, capacity) };
        // Safety: out_written non-null per check above.
        unsafe { *out_written = written };
        EvStatus::Ok
    })
}

// ── Stop lookup + phase / direction queries ──────────────────────────────

/// Resolve a config-time `StopId` (the small `u32` from RON config) to
/// its runtime `EntityId`. Returns `0` (slotmap-null) for unknown ids.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_stop_entity(handle: *mut EvSim, stop_id: u32) -> u64 {
    guard(0, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return 0;
        }
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        ev.sim
            .stop_entity(elevator_core::prelude::StopId(stop_id))
            .map_or(0, entity_to_u64)
    })
}

/// Snapshot of the config-time `StopId` → runtime `EntityId` map.
///
/// Buffer-pattern accessor; emits flat `[stop_id_as_u64, entity_id, ...]`
/// pairs (each pair = 2 `u64` slots). The number of pairs written is
/// `*out_written / 2`.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`]. `out`
/// must point to at least `capacity` writable `u64` slots when
/// `capacity > 0`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_stop_lookup_iter(
    handle: *mut EvSim,
    out: *mut u64,
    capacity: u32,
    out_written: *mut u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_written.is_null() {
            set_last_error("handle or out_written is null");
            return EvStatus::NullArg;
        }
        if capacity > 0 && out.is_null() {
            set_last_error("out is null but capacity > 0");
            return EvStatus::NullArg;
        }
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        let mut written: u32 = 0;
        for (stop_id, entity) in ev.sim.stop_lookup_iter() {
            // Each pair takes 2 slots; stop if next pair would overflow.
            if written + 2 > capacity {
                break;
            }
            // Safety: caller guarantees `out` has at least `capacity`
            // writable slots; bounds checked above.
            unsafe {
                *out.add(written as usize) = u64::from(stop_id.0);
                *out.add(written as usize + 1) = entity_to_u64(*entity);
            }
            written += 2;
        }
        // Safety: out_written non-null per check above.
        unsafe { *out_written = written };
        EvStatus::Ok
    })
}

/// Entity ids of every elevator currently repositioning.
/// Buffer-pattern accessor.
///
/// # Safety
///
/// See [`ev_sim_destination_queue`] for buffer requirements.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_iter_repositioning_elevators(
    handle: *mut EvSim,
    out: *mut u64,
    capacity: u32,
    out_written: *mut u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_written.is_null() {
            set_last_error("handle or out_written is null");
            return EvStatus::NullArg;
        }
        if capacity > 0 && out.is_null() {
            set_last_error("out is null but capacity > 0");
            return EvStatus::NullArg;
        }
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        // Safety: `out` validity guaranteed by caller.
        let written =
            unsafe { write_entity_buffer(ev.sim.iter_repositioning_elevators(), out, capacity) };
        // Safety: out_written non-null per check above.
        unsafe { *out_written = written };
        EvStatus::Ok
    })
}

/// Up/down split of riders waiting at a stop. Writes the up count to
/// `*out_up_count` and the down count to `*out_down_count`.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
/// `out_up_count` and `out_down_count` must be writable `u32` pointers.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_waiting_direction_counts_at(
    handle: *mut EvSim,
    stop_entity_id: u64,
    out_up_count: *mut u32,
    out_down_count: *mut u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_up_count.is_null() || out_down_count.is_null() {
            set_last_error("handle or output pointer is null");
            return EvStatus::NullArg;
        }
        let Some(stop) = entity_from_u64(stop_entity_id) else {
            set_last_error("stop_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        let (up, down) = ev.sim.waiting_direction_counts_at(stop);
        // Safety: caller guarantees output pointers are writable.
        unsafe {
            *out_up_count = u32::try_from(up).unwrap_or(u32::MAX);
            *out_down_count = u32::try_from(down).unwrap_or(u32::MAX);
        }
        EvStatus::Ok
    })
}

/// Per-line waiting counts at a stop. Buffer-pattern accessor; emits
/// flat alternating `[line_entity_id, count, ...]` pairs as `u64`.
/// The number of pairs written is `*out_written / 2`.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`]. `out`
/// must point to at least `capacity` writable `u64` slots when
/// `capacity > 0`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_waiting_counts_by_line_at(
    handle: *mut EvSim,
    stop_entity_id: u64,
    out: *mut u64,
    capacity: u32,
    out_written: *mut u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_written.is_null() {
            set_last_error("handle or out_written is null");
            return EvStatus::NullArg;
        }
        if capacity > 0 && out.is_null() {
            set_last_error("out is null but capacity > 0");
            return EvStatus::NullArg;
        }
        let Some(stop) = entity_from_u64(stop_entity_id) else {
            set_last_error("stop_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        let pairs = ev.sim.waiting_counts_by_line_at(stop);
        let mut written: u32 = 0;
        for (line, count) in pairs {
            // Each pair takes 2 slots; stop if next pair would overflow.
            if written + 2 > capacity {
                break;
            }
            // Safety: caller guarantees `out` has at least `capacity`
            // writable slots; bounds checked above.
            unsafe {
                *out.add(written as usize) = entity_to_u64(line);
                *out.add(written as usize + 1) = u64::from(count);
            }
            written += 2;
        }
        // Safety: out_written non-null per check above.
        unsafe { *out_written = written };
        EvStatus::Ok
    })
}

// ── Topology introspection ───────────────────────────────────────────────
//
// Buffer-pattern accessors for the group/line/stop/elevator graph.
// Mirrors the wasm topology introspection in #482.

/// Entity ids of all elevators on `line_entity_id`. Buffer-pattern.
///
/// # Safety
///
/// See [`ev_sim_destination_queue`] for buffer requirements.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_elevators_on_line(
    handle: *mut EvSim,
    line_entity_id: u64,
    out: *mut u64,
    capacity: u32,
    out_written: *mut u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_written.is_null() {
            set_last_error("handle or out_written is null");
            return EvStatus::NullArg;
        }
        if capacity > 0 && out.is_null() {
            set_last_error("out is null but capacity > 0");
            return EvStatus::NullArg;
        }
        let Some(line) = entity_from_u64(line_entity_id) else {
            set_last_error("line_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        let elevators = ev.sim.elevators_on_line(line);
        // Safety: `out` validity guaranteed by caller.
        let written = unsafe { write_entity_buffer(elevators.into_iter(), out, capacity) };
        // Safety: out_written non-null per check above.
        unsafe { *out_written = written };
        EvStatus::Ok
    })
}

/// Entity ids of every line in `group_id`. Buffer-pattern.
///
/// # Safety
///
/// See [`ev_sim_destination_queue`] for buffer requirements.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_lines_in_group(
    handle: *mut EvSim,
    group_id: u32,
    out: *mut u64,
    capacity: u32,
    out_written: *mut u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_written.is_null() {
            set_last_error("handle or out_written is null");
            return EvStatus::NullArg;
        }
        if capacity > 0 && out.is_null() {
            set_last_error("out is null but capacity > 0");
            return EvStatus::NullArg;
        }
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        let lines = ev.sim.lines_in_group(GroupId(group_id));
        // Safety: `out` validity guaranteed by caller.
        let written = unsafe { write_entity_buffer(lines.into_iter(), out, capacity) };
        // Safety: out_written non-null per check above.
        unsafe { *out_written = written };
        EvStatus::Ok
    })
}

/// Entity ids of every line that serves `stop_entity_id`. Buffer-pattern.
///
/// # Safety
///
/// See [`ev_sim_destination_queue`] for buffer requirements.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_lines_serving_stop(
    handle: *mut EvSim,
    stop_entity_id: u64,
    out: *mut u64,
    capacity: u32,
    out_written: *mut u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_written.is_null() {
            set_last_error("handle or out_written is null");
            return EvStatus::NullArg;
        }
        if capacity > 0 && out.is_null() {
            set_last_error("out is null but capacity > 0");
            return EvStatus::NullArg;
        }
        let Some(stop) = entity_from_u64(stop_entity_id) else {
            set_last_error("stop_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        let lines = ev.sim.lines_serving_stop(stop);
        // Safety: `out` validity guaranteed by caller.
        let written = unsafe { write_entity_buffer(lines.into_iter(), out, capacity) };
        // Safety: out_written non-null per check above.
        unsafe { *out_written = written };
        EvStatus::Ok
    })
}

/// Entity ids of every stop served by `line_entity_id`. Buffer-pattern.
///
/// # Safety
///
/// See [`ev_sim_destination_queue`] for buffer requirements.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_stops_served_by_line(
    handle: *mut EvSim,
    line_entity_id: u64,
    out: *mut u64,
    capacity: u32,
    out_written: *mut u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_written.is_null() {
            set_last_error("handle or out_written is null");
            return EvStatus::NullArg;
        }
        if capacity > 0 && out.is_null() {
            set_last_error("out is null but capacity > 0");
            return EvStatus::NullArg;
        }
        let Some(line) = entity_from_u64(line_entity_id) else {
            set_last_error("line_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        let stops = ev.sim.stops_served_by_line(line);
        // Safety: `out` validity guaranteed by caller.
        let written = unsafe { write_entity_buffer(stops.into_iter(), out, capacity) };
        // Safety: out_written non-null per check above.
        unsafe { *out_written = written };
        EvStatus::Ok
    })
}

/// Group ids of every group with a line that serves `stop_entity_id`.
/// Returns a `u32` buffer (not `u64`) — `GroupId` is a u32 newtype.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`]. `out`
/// must point to at least `capacity` writable `u32` slots when
/// `capacity > 0`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_groups_serving_stop(
    handle: *mut EvSim,
    stop_entity_id: u64,
    out: *mut u32,
    capacity: u32,
    out_written: *mut u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_written.is_null() {
            set_last_error("handle or out_written is null");
            return EvStatus::NullArg;
        }
        if capacity > 0 && out.is_null() {
            set_last_error("out is null but capacity > 0");
            return EvStatus::NullArg;
        }
        let Some(stop) = entity_from_u64(stop_entity_id) else {
            set_last_error("stop_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        let groups = ev.sim.groups_serving_stop(stop);
        let mut written: u32 = 0;
        for g in groups.into_iter().take(capacity as usize) {
            // Safety: caller guarantees `out` has at least `capacity`
            // writable slots; bounds checked above.
            unsafe {
                *out.add(written as usize) = g.0;
            }
            written += 1;
        }
        // Safety: out_written non-null per check above.
        unsafe { *out_written = written };
        EvStatus::Ok
    })
}

/// Line entity that `elevator_entity_id` runs on. Returns `0`
/// (slotmap-null) for missing or non-elevator entities.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_line_for_elevator(
    handle: *mut EvSim,
    elevator_entity_id: u64,
) -> u64 {
    guard(0, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return 0;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            return 0;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        ev.sim.line_for_elevator(elevator).map_or(0, entity_to_u64)
    })
}

/// Entity ids of every line in the simulation, across all groups.
/// Buffer-pattern.
///
/// # Safety
///
/// See [`ev_sim_destination_queue`] for buffer requirements.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_all_lines(
    handle: *mut EvSim,
    out: *mut u64,
    capacity: u32,
    out_written: *mut u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_written.is_null() {
            set_last_error("handle or out_written is null");
            return EvStatus::NullArg;
        }
        if capacity > 0 && out.is_null() {
            set_last_error("out is null but capacity > 0");
            return EvStatus::NullArg;
        }
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        let lines = ev.sim.all_lines();
        // Safety: `out` validity guaranteed by caller.
        let written = unsafe { write_entity_buffer(lines.into_iter(), out, capacity) };
        // Safety: out_written non-null per check above.
        unsafe { *out_written = written };
        EvStatus::Ok
    })
}

/// Total number of lines across all groups.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_line_count(handle: *mut EvSim) -> u32 {
    guard(0, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return 0;
        }
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        u32::try_from(ev.sim.line_count()).unwrap_or(u32::MAX)
    })
}

/// Find the stop entity at `position` on `line_entity_id`. Returns `0`
/// (slotmap-null) if no stop exists at that position on the line.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_find_stop_at_position_on_line(
    handle: *mut EvSim,
    position: f64,
    line_entity_id: u64,
) -> u64 {
    guard(0, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return 0;
        }
        let Some(line) = entity_from_u64(line_entity_id) else {
            return 0;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        ev.sim
            .find_stop_at_position_on_line(position, line)
            .map_or(0, entity_to_u64)
    })
}

// ── Service mode + manual control ─────────────────────────────────────────
//
// Brings FFI to parity with the core `ServiceMode` API and the Manual-mode
// command set (set_target_velocity, emergency_stop, manual door commands).
//
// All entrypoints take a u64 entity id (raw EntityId / ElevatorId via the
// existing entity_to_u64 / entity_from_u64 helpers). Errors map to existing
// EvStatus codes with structured last_error messages.

/// Set the operational mode of an elevator.
///
/// Modes are orthogonal to the elevator's phase — switching mode does not
/// teleport the car, but it changes how subsequent ticks treat it.
/// Leaving Manual zeroes velocity and clears any queued door commands.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_set_service_mode(
    handle: *mut EvSim,
    elevator_entity_id: u64,
    mode: EvServiceMode,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            set_last_error("elevator_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.set_service_mode(elevator, mode.to_core()) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = match e {
                    elevator_core::error::SimError::EntityNotFound(_) => EvStatus::NotFound,
                    _ => EvStatus::InvalidArg,
                };
                set_last_error(format!("set_service_mode: {e}"));
                status
            }
        }
    })
}

/// Get the current operational mode of an elevator.
///
/// Writes the mode to `*out_mode`. Returns `EvServiceMode_Normal` for missing/disabled
/// elevators (matches core's `service_mode` accessor, which returns the
/// default rather than erroring). Use [`ev_sim_frame`] to verify existence.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
/// `out_mode` must be a valid pointer to a writable [`EvServiceMode`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_service_mode(
    handle: *mut EvSim,
    elevator_entity_id: u64,
    out_mode: *mut EvServiceMode,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_mode.is_null() {
            set_last_error("handle or out_mode is null");
            return EvStatus::NullArg;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            set_last_error("elevator_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        let mode = EvServiceMode::from_core(ev.sim.service_mode(elevator));
        // Safety: caller guarantees out_mode is writable.
        unsafe { *out_mode = mode };
        EvStatus::Ok
    })
}

/// Set the target velocity for a Manual-mode elevator.
///
/// Positive values command upward travel, negative values downward. The
/// car ramps toward the target each tick using its configured
/// acceleration / deceleration.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_set_target_velocity(
    handle: *mut EvSim,
    elevator_entity_id: u64,
    velocity: f64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            set_last_error("elevator_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev
            .sim
            .set_target_velocity(ElevatorId::from(elevator), velocity)
        {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("set_target_velocity: {e}"));
                status
            }
        }
    })
}

/// Command an immediate stop on a Manual-mode elevator.
///
/// Sets the target velocity to zero; the car decelerates at its
/// configured rate. Emits a distinct event so games can distinguish an
/// emergency stop from a deliberate hold (`target_velocity` payload is
/// `None` in the event).
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_emergency_stop(
    handle: *mut EvSim,
    elevator_entity_id: u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            set_last_error("elevator_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.emergency_stop(ElevatorId::from(elevator)) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("emergency_stop: {e}"));
                status
            }
        }
    })
}

/// Request the doors of an elevator to open.
///
/// Applied immediately when the car is stopped at a stop with
/// closed/closing doors; otherwise queued until the car next arrives.
/// No-op if doors are already open.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_open_door(handle: *mut EvSim, elevator_entity_id: u64) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            set_last_error("elevator_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.open_door(ElevatorId::from(elevator)) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("open_door: {e}"));
                status
            }
        }
    })
}

/// Request the doors to close now. Forces an early close unless a rider is
/// mid-boarding/exiting (in which case the close waits). If doors are
/// opening, the close queues until they reach fully-open.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_close_door(
    handle: *mut EvSim,
    elevator_entity_id: u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            set_last_error("elevator_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.close_door(ElevatorId::from(elevator)) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("close_door: {e}"));
                status
            }
        }
    })
}

/// Extend the doors' open dwell by `ticks`. Cumulative — repeat calls add.
/// If doors aren't open yet, the hold queues and applies when they reach
/// fully-open.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_hold_door(
    handle: *mut EvSim,
    elevator_entity_id: u64,
    ticks: u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            set_last_error("elevator_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.hold_door(ElevatorId::from(elevator), ticks) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("hold_door: {e}"));
                status
            }
        }
    })
}

/// Cancel any pending hold extension on the doors. If the base open timer
/// has already elapsed, the doors close on the next doors-phase tick.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_cancel_door_hold(
    handle: *mut EvSim,
    elevator_entity_id: u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            set_last_error("elevator_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.cancel_door_hold(ElevatorId::from(elevator)) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("cancel_door_hold: {e}"));
                status
            }
        }
    })
}

/// Internal: shared error-to-status mapping for the manual-mode and door
/// commands.
///
/// `NotFound` for missing entities, `InvalidArg` for everything else
/// (wrong service mode, disabled elevator, non-finite velocity).
const fn mode_error_status(e: &elevator_core::error::SimError) -> EvStatus {
    use elevator_core::error::SimError;
    match e {
        SimError::EntityNotFound(_) | SimError::NotAnElevator(_) => EvStatus::NotFound,
        _ => EvStatus::InvalidArg,
    }
}

// ── Per-elevator parameter setters ───────────────────────────────────────
//
// Runtime tuning of physics and door timings. All setters validate input
// (positive-finite for f64 fields, non-zero for tick counts) and emit an
// ElevatorUpgraded event per call. Mirrors the wasm crate's set*All
// helpers, but operates on a single elevator — wasm's "all" wrappers loop
// these per car under the hood.

/// Set the maximum travel speed (distance/tick) of an elevator.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_set_max_speed(
    handle: *mut EvSim,
    elevator_entity_id: u64,
    max_speed: f64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            set_last_error("elevator_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.set_max_speed(ElevatorId::from(elevator), max_speed) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("set_max_speed: {e}"));
                status
            }
        }
    })
}

/// Set the acceleration rate (distance/tick²) of an elevator.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_set_acceleration(
    handle: *mut EvSim,
    elevator_entity_id: u64,
    acceleration: f64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            set_last_error("elevator_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev
            .sim
            .set_acceleration(ElevatorId::from(elevator), acceleration)
        {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("set_acceleration: {e}"));
                status
            }
        }
    })
}

/// Set the deceleration rate (distance/tick²) of an elevator.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_set_deceleration(
    handle: *mut EvSim,
    elevator_entity_id: u64,
    deceleration: f64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            set_last_error("elevator_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev
            .sim
            .set_deceleration(ElevatorId::from(elevator), deceleration)
        {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("set_deceleration: {e}"));
                status
            }
        }
    })
}

/// Set the weight capacity (kg) of an elevator.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_set_weight_capacity(
    handle: *mut EvSim,
    elevator_entity_id: u64,
    capacity: f64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            set_last_error("elevator_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev
            .sim
            .set_weight_capacity(ElevatorId::from(elevator), capacity)
        {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("set_weight_capacity: {e}"));
                status
            }
        }
    })
}

/// Set door transition (open/close) duration in ticks. Applied on the
/// next door cycle — an in-progress transition keeps its timing.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_set_door_transition_ticks(
    handle: *mut EvSim,
    elevator_entity_id: u64,
    ticks: u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            set_last_error("elevator_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev
            .sim
            .set_door_transition_ticks(ElevatorId::from(elevator), ticks)
        {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("set_door_transition_ticks: {e}"));
                status
            }
        }
    })
}

/// Set how long doors hold fully open (ticks). Applied on the next door
/// cycle — a door currently dwelling completes its existing dwell first.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_set_door_open_ticks(
    handle: *mut EvSim,
    elevator_entity_id: u64,
    ticks: u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            set_last_error("elevator_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev
            .sim
            .set_door_open_ticks(ElevatorId::from(elevator), ticks)
        {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("set_door_open_ticks: {e}"));
                status
            }
        }
    })
}

/// Set how many ticks the per-rider arrival log retains. Global setting
/// (not per-elevator). Higher = more memory but longer post-trip queries.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_set_arrival_log_retention_ticks(
    handle: *mut EvSim,
    retention_ticks: u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        ev.sim.set_arrival_log_retention_ticks(retention_ticks);
        EvStatus::Ok
    })
}

/// Enable a previously-disabled entity (elevator or stop).
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_enable(handle: *mut EvSim, entity_id: u64) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(entity) = entity_from_u64(entity_id) else {
            set_last_error("entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.enable(entity) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("enable: {e}"));
                status
            }
        }
    })
}

/// Disable an entity (elevator or stop). Disabled elevators eject riders
/// and are excluded from dispatch; disabled stops invalidate routes that
/// reference them.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_disable(handle: *mut EvSim, entity_id: u64) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(entity) = entity_from_u64(entity_id) else {
            set_last_error("entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.disable(entity) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("disable: {e}"));
                status
            }
        }
    })
}

// ── Per-elevator + global introspection accessors ────────────────────────
//
// Read-only queries. All entity-taking accessors return a sentinel for
// missing/disabled entities (NaN for f64, 0 for u64, false for bool).
// This matches the existing FFI pattern (e.g. ev_sim_assigned_car
// writes 0 to its out-param when the call has no assignment).
//
// Consumers that need to distinguish "missing" from "valid value" call
// ev_sim_is_elevator / ev_sim_is_stop first, then read the accessor.

/// Current velocity (distance/tick) of an elevator. Positive = up,
/// negative = down. Returns `NaN` for non-elevator entities.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_velocity(handle: *mut EvSim, elevator_entity_id: u64) -> f64 {
    guard(f64::NAN, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return f64::NAN;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            return f64::NAN;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        ev.sim.velocity(elevator).unwrap_or(f64::NAN)
    })
}

/// Sub-tick interpolated position of an entity. `alpha` in `[0.0, 1.0]`
/// (`0.0` = current tick, `1.0` = next tick). Returns `NaN` for entities
/// without a position component.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_position_at(handle: *mut EvSim, entity_id: u64, alpha: f64) -> f64 {
    guard(f64::NAN, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return f64::NAN;
        }
        let Some(entity) = entity_from_u64(entity_id) else {
            return f64::NAN;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        ev.sim.position_at(entity, alpha).unwrap_or(f64::NAN)
    })
}

/// Fraction of capacity occupied by weight, in `[0.0, 1.0]`. Returns
/// `NaN` for non-elevator entities.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_elevator_load(handle: *mut EvSim, elevator_entity_id: u64) -> f64 {
    guard(f64::NAN, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return f64::NAN;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            return f64::NAN;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        ev.sim
            .elevator_load(ElevatorId::from(elevator))
            .unwrap_or(f64::NAN)
    })
}

/// Number of riders currently aboard. Returns `0` for empty cabs and
/// for non-elevator entities (disambiguate via [`ev_sim_is_elevator`]).
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_occupancy(handle: *mut EvSim, elevator_entity_id: u64) -> u32 {
    guard(0, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return 0;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            return 0;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        u32::try_from(ev.sim.occupancy(elevator)).unwrap_or(u32::MAX)
    })
}

/// Indicator-lamp direction of an elevator: `1` = Up, `-1` = Down,
/// `0` = Either / idle / missing entity. Encoding matches
/// [`EvHallCall::direction`].
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_elevator_direction(
    handle: *mut EvSim,
    elevator_entity_id: u64,
) -> i8 {
    guard(0, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return 0;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            return 0;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        match ev.sim.elevator_direction(elevator) {
            Some(elevator_core::components::Direction::Up) => 1,
            Some(elevator_core::components::Direction::Down) => -1,
            _ => 0,
        }
    })
}

/// Whether an elevator is currently committed upward. Returns `false`
/// for missing entities.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_elevator_going_up(
    handle: *mut EvSim,
    elevator_entity_id: u64,
) -> bool {
    guard(false, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return false;
        }
        entity_from_u64(elevator_entity_id).is_some_and(|e| {
            // Safety: validity guaranteed by caller.
            let ev = unsafe { &*handle };
            ev.sim.elevator_going_up(e).unwrap_or(false)
        })
    })
}

/// Whether an elevator is currently committed downward. Returns `false`
/// for missing entities.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_elevator_going_down(
    handle: *mut EvSim,
    elevator_entity_id: u64,
) -> bool {
    guard(false, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return false;
        }
        entity_from_u64(elevator_entity_id).is_some_and(|e| {
            // Safety: validity guaranteed by caller.
            let ev = unsafe { &*handle };
            ev.sim.elevator_going_down(e).unwrap_or(false)
        })
    })
}

/// Total number of completed trips since spawn. Returns `0` for missing
/// entities.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_elevator_move_count(
    handle: *mut EvSim,
    elevator_entity_id: u64,
) -> u64 {
    guard(0, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return 0;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            return 0;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        ev.sim.elevator_move_count(elevator).unwrap_or(0)
    })
}

/// Distance the elevator would travel if it began decelerating now from
/// its current velocity. Returns `NaN` for stationary or missing
/// entities.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_braking_distance(
    handle: *mut EvSim,
    elevator_entity_id: u64,
) -> f64 {
    guard(f64::NAN, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return f64::NAN;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            return f64::NAN;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        ev.sim.braking_distance(elevator).unwrap_or(f64::NAN)
    })
}

/// Position of the next stop in the destination queue (or current
/// target mid-trip). Returns `NaN` for empty queues / missing entities.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_future_stop_position(
    handle: *mut EvSim,
    elevator_entity_id: u64,
) -> f64 {
    guard(f64::NAN, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return f64::NAN;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            return f64::NAN;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        ev.sim.future_stop_position(elevator).unwrap_or(f64::NAN)
    })
}

/// Total number of currently-idle elevators across the simulation.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_idle_elevator_count(handle: *mut EvSim) -> u32 {
    guard(0, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return 0;
        }
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        u32::try_from(ev.sim.idle_elevator_count()).unwrap_or(u32::MAX)
    })
}

/// Whether an entity is an elevator.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_is_elevator(handle: *mut EvSim, entity_id: u64) -> bool {
    guard(false, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return false;
        }
        entity_from_u64(entity_id).is_some_and(|e| {
            // Safety: validity guaranteed by caller.
            let ev = unsafe { &*handle };
            ev.sim.is_elevator(e)
        })
    })
}

/// Whether an entity is a rider.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_is_rider(handle: *mut EvSim, entity_id: u64) -> bool {
    guard(false, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return false;
        }
        entity_from_u64(entity_id).is_some_and(|e| {
            // Safety: validity guaranteed by caller.
            let ev = unsafe { &*handle };
            ev.sim.is_rider(e)
        })
    })
}

/// Whether an entity is a stop.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_is_stop(handle: *mut EvSim, entity_id: u64) -> bool {
    guard(false, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return false;
        }
        entity_from_u64(entity_id).is_some_and(|e| {
            // Safety: validity guaranteed by caller.
            let ev = unsafe { &*handle };
            ev.sim.is_stop(e)
        })
    })
}

/// Whether an entity is currently disabled. Returns `false` for both
/// "enabled" and "doesn't exist" — distinguish via the type-check
/// accessors first.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_is_disabled(handle: *mut EvSim, entity_id: u64) -> bool {
    guard(false, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return false;
        }
        entity_from_u64(entity_id).is_some_and(|e| {
            // Safety: validity guaranteed by caller.
            let ev = unsafe { &*handle };
            ev.sim.is_disabled(e)
        })
    })
}

/// Current simulation tick.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_current_tick(handle: *mut EvSim) -> u64 {
    guard(0, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return 0;
        }
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        ev.sim.current_tick()
    })
}

/// Time delta per tick (seconds). Useful for converting ETA tick counts
/// into real-time durations on the consumer side.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_dt(handle: *mut EvSim) -> f64 {
    guard(f64::NAN, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return f64::NAN;
        }
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        ev.sim.dt()
    })
}

// ── Destinations + recall ────────────────────────────────────────────────
//
// Direct control over a car's destination queue (mutators). Mirror of
// the wasm pushDestination / pushDestinationFront / clearDestinations /
// abortMovement / recallTo set.

/// Append `stop_entity_id` to the back of `elevator_entity_id`'s
/// destination queue. Adjacent duplicates are suppressed.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_push_destination(
    handle: *mut EvSim,
    elevator_entity_id: u64,
    stop_entity_id: u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let (Some(elevator), Some(stop)) = (
            entity_from_u64(elevator_entity_id),
            entity_from_u64(stop_entity_id),
        ) else {
            set_last_error("elevator_entity_id or stop_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.push_destination(ElevatorId::from(elevator), stop) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("push_destination: {e}"));
                status
            }
        }
    })
}

/// Insert `stop_entity_id` at the front of the destination queue
/// ("go here next").
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_push_destination_front(
    handle: *mut EvSim,
    elevator_entity_id: u64,
    stop_entity_id: u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let (Some(elevator), Some(stop)) = (
            entity_from_u64(elevator_entity_id),
            entity_from_u64(stop_entity_id),
        ) else {
            set_last_error("elevator_entity_id or stop_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev
            .sim
            .push_destination_front(ElevatorId::from(elevator), stop)
        {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("push_destination_front: {e}"));
                status
            }
        }
    })
}

/// Empty an elevator's destination queue. The in-flight trip continues
/// to its current target — call [`ev_sim_abort_movement`] to also stop
/// mid-flight.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_clear_destinations(
    handle: *mut EvSim,
    elevator_entity_id: u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            set_last_error("elevator_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.clear_destinations(ElevatorId::from(elevator)) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("clear_destinations: {e}"));
                status
            }
        }
    })
}

/// Abort the elevator's in-flight movement; decelerate to nearest stop.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_abort_movement(
    handle: *mut EvSim,
    elevator_entity_id: u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            set_last_error("elevator_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.abort_movement(ElevatorId::from(elevator)) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("abort_movement: {e}"));
                status
            }
        }
    })
}

/// Clear the queue and immediately recall to `stop_entity_id`. Emits a
/// distinct `ElevatorRecalled` event.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_recall_to(
    handle: *mut EvSim,
    elevator_entity_id: u64,
    stop_entity_id: u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return EvStatus::NullArg;
        }
        let (Some(elevator), Some(stop)) = (
            entity_from_u64(elevator_entity_id),
            entity_from_u64(stop_entity_id),
        ) else {
            set_last_error("elevator_entity_id or stop_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &mut *handle };
        match ev.sim.recall_to(ElevatorId::from(elevator), stop) {
            Ok(()) => EvStatus::Ok,
            Err(e) => {
                let status = mode_error_status(&e);
                set_last_error(format!("recall_to: {e}"));
                status
            }
        }
    })
}

// ── Population queries (buffer pattern) ──────────────────────────────────
//
// Returns flat lists of `EntityId` (as `u64`) using the standard FFI
// buffer pattern: caller passes (out_buf, capacity, out_written), and
// the function writes up to `capacity` entries plus the actual count.
// Pair with the `*_count_at` accessors to size the buffer first.

/// Internal: shared "iterator → buffer" writer. Writes up to `capacity`
/// entries to `out`, returns the count actually written.
unsafe fn write_entity_buffer(
    iter: impl Iterator<Item = EntityId>,
    out: *mut u64,
    capacity: u32,
) -> u32 {
    let mut written: u32 = 0;
    for entity in iter.take(capacity as usize) {
        // Safety: caller guarantees `out` points to at least `capacity`
        // u64 slots; loop never overruns by construction (take(capacity)).
        unsafe {
            *out.add(written as usize) = entity_to_u64(entity);
        }
        written += 1;
    }
    written
}

/// Snapshot of an elevator's destination queue.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`]. `out`
/// must point to at least `capacity` writable `u64` slots when
/// `capacity > 0`. `out_written` must be a writable `u32`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_destination_queue(
    handle: *mut EvSim,
    elevator_entity_id: u64,
    out: *mut u64,
    capacity: u32,
    out_written: *mut u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_written.is_null() {
            set_last_error("handle or out_written is null");
            return EvStatus::NullArg;
        }
        if capacity > 0 && out.is_null() {
            set_last_error("out is null but capacity > 0");
            return EvStatus::NullArg;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            set_last_error("elevator_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        let queue = ev
            .sim
            .destination_queue(ElevatorId::from(elevator))
            .unwrap_or(&[]);
        // Safety: `out` validity guaranteed by caller.
        let written = unsafe { write_entity_buffer(queue.iter().copied(), out, capacity) };
        // Safety: out_written non-null per check above.
        unsafe { *out_written = written };
        EvStatus::Ok
    })
}

/// Riders waiting at `stop_entity_id`.
///
/// # Safety
///
/// See [`ev_sim_destination_queue`] for buffer requirements.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_waiting_at(
    handle: *mut EvSim,
    stop_entity_id: u64,
    out: *mut u64,
    capacity: u32,
    out_written: *mut u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_written.is_null() {
            set_last_error("handle or out_written is null");
            return EvStatus::NullArg;
        }
        if capacity > 0 && out.is_null() {
            set_last_error("out is null but capacity > 0");
            return EvStatus::NullArg;
        }
        let Some(stop) = entity_from_u64(stop_entity_id) else {
            set_last_error("stop_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        // Safety: `out` validity guaranteed by caller.
        let written = unsafe { write_entity_buffer(ev.sim.waiting_at(stop), out, capacity) };
        // Safety: out_written non-null per check above.
        unsafe { *out_written = written };
        EvStatus::Ok
    })
}

/// Number of riders waiting at `stop_entity_id`.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_waiting_count_at(handle: *mut EvSim, stop_entity_id: u64) -> u32 {
    guard(0, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return 0;
        }
        let Some(stop) = entity_from_u64(stop_entity_id) else {
            return 0;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        u32::try_from(ev.sim.waiting_count_at(stop)).unwrap_or(u32::MAX)
    })
}

/// Riders settled / resident at `stop_entity_id`.
///
/// # Safety
///
/// See [`ev_sim_destination_queue`] for buffer requirements.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_residents_at(
    handle: *mut EvSim,
    stop_entity_id: u64,
    out: *mut u64,
    capacity: u32,
    out_written: *mut u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_written.is_null() {
            set_last_error("handle or out_written is null");
            return EvStatus::NullArg;
        }
        if capacity > 0 && out.is_null() {
            set_last_error("out is null but capacity > 0");
            return EvStatus::NullArg;
        }
        let Some(stop) = entity_from_u64(stop_entity_id) else {
            set_last_error("stop_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        // Safety: `out` validity guaranteed by caller.
        let written = unsafe { write_entity_buffer(ev.sim.residents_at(stop), out, capacity) };
        // Safety: out_written non-null per check above.
        unsafe { *out_written = written };
        EvStatus::Ok
    })
}

/// Number of resident riders at `stop_entity_id`.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_resident_count_at(handle: *mut EvSim, stop_entity_id: u64) -> u32 {
    guard(0, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return 0;
        }
        let Some(stop) = entity_from_u64(stop_entity_id) else {
            return 0;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        u32::try_from(ev.sim.resident_count_at(stop)).unwrap_or(u32::MAX)
    })
}

/// Riders who abandoned the call at `stop_entity_id`.
///
/// # Safety
///
/// See [`ev_sim_destination_queue`] for buffer requirements.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_abandoned_at(
    handle: *mut EvSim,
    stop_entity_id: u64,
    out: *mut u64,
    capacity: u32,
    out_written: *mut u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_written.is_null() {
            set_last_error("handle or out_written is null");
            return EvStatus::NullArg;
        }
        if capacity > 0 && out.is_null() {
            set_last_error("out is null but capacity > 0");
            return EvStatus::NullArg;
        }
        let Some(stop) = entity_from_u64(stop_entity_id) else {
            set_last_error("stop_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        // Safety: `out` validity guaranteed by caller.
        let written = unsafe { write_entity_buffer(ev.sim.abandoned_at(stop), out, capacity) };
        // Safety: out_written non-null per check above.
        unsafe { *out_written = written };
        EvStatus::Ok
    })
}

/// Number of abandoned riders at `stop_entity_id`.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_abandoned_count_at(handle: *mut EvSim, stop_entity_id: u64) -> u32 {
    guard(0, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return 0;
        }
        let Some(stop) = entity_from_u64(stop_entity_id) else {
            return 0;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        u32::try_from(ev.sim.abandoned_count_at(stop)).unwrap_or(u32::MAX)
    })
}

/// Riders currently aboard `elevator_entity_id`.
///
/// # Safety
///
/// See [`ev_sim_destination_queue`] for buffer requirements.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_riders_on(
    handle: *mut EvSim,
    elevator_entity_id: u64,
    out: *mut u64,
    capacity: u32,
    out_written: *mut u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_written.is_null() {
            set_last_error("handle or out_written is null");
            return EvStatus::NullArg;
        }
        if capacity > 0 && out.is_null() {
            set_last_error("out is null but capacity > 0");
            return EvStatus::NullArg;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            set_last_error("elevator_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        let riders = ev.sim.riders_on(elevator);
        // Safety: `out` validity guaranteed by caller.
        let written = unsafe { write_entity_buffer(riders.iter().copied(), out, capacity) };
        // Safety: out_written non-null per check above.
        unsafe { *out_written = written };
        EvStatus::Ok
    })
}

// ── shortest_route ────────────────────────────────────────────────────────

/// Find the shortest multi-leg route between two stops using the
/// line-graph topology. On success writes the flattened stop sequence
/// (origin first, destination last) to `out_stops`.
///
/// Caller-owned buffer pattern: `out_written` is populated with the
/// number of stops in the route regardless of buffer fit, so the caller
/// can probe with `(null, 0)` to size a real buffer.
///
/// Returns:
/// - `EvStatus_Ok` if a route exists and fits in `capacity`.
/// - `EvStatus_InvalidArg` if the route exists but `capacity` is too
///   small; `out_written` contains the required slot count.
///   [`ev_last_error`] carries a diagnostic string only when
///   `capacity > 0` — the documented `(null, 0)` probe is silent.
/// - `EvStatus_NotFound` if no route exists.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`]. `out_stops`
/// must point to at least `capacity` writable `u64` slots when
/// `capacity > 0`. `out_written` must be a writable `u32`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_shortest_route(
    handle: *mut EvSim,
    from_stop_entity_id: u64,
    to_stop_entity_id: u64,
    out_stops: *mut u64,
    capacity: u32,
    out_written: *mut u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_written.is_null() {
            set_last_error("handle or out_written is null");
            return EvStatus::NullArg;
        }
        if capacity > 0 && out_stops.is_null() {
            set_last_error("out_stops is null but capacity > 0");
            return EvStatus::NullArg;
        }
        let Some(from) = entity_from_u64(from_stop_entity_id) else {
            set_last_error("from_stop_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        let Some(to) = entity_from_u64(to_stop_entity_id) else {
            set_last_error("to_stop_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        let Some(route) = ev.sim.shortest_route(from, to) else {
            // Safety: out_written non-null per check above.
            unsafe { *out_written = 0 };
            set_last_error("no route exists between the given stops");
            return EvStatus::NotFound;
        };
        // Flatten leg chain into [from0, to0=from1, to1=from2, ...].
        // Same projection as the wasm RouteDto.
        let needed = u32::try_from(route.legs.len() + 1).unwrap_or(u32::MAX);
        // Safety: out_written non-null per check above.
        unsafe { *out_written = needed };
        if needed > capacity {
            // capacity == 0 is a probe — see ev_sim_hall_calls_snapshot.
            if capacity > 0 {
                set_last_error(format!("insufficient buffer: need {needed} stop slots"));
            }
            return EvStatus::InvalidArg;
        }
        // Safety: bounds-checked: needed <= capacity, and out_stops is
        // valid for `capacity` u64s by precondition.
        unsafe {
            if let Some(first) = route.legs.first() {
                *out_stops = entity_to_u64(first.from);
                for (i, leg) in route.legs.iter().enumerate() {
                    *out_stops.add(i + 1) = entity_to_u64(leg.to);
                }
            }
        }
        EvStatus::Ok
    })
}

// ── car_calls + EvCarCall ────────────────────────────────────────────────

/// C-ABI-flat projection of a `CarCall` for FFI consumers.
///
/// Mirrors [`elevator_core::components::CarCall`] field-for-field with
/// `EntityId` slots flattened to `u64` and the `pending_riders` Vec
/// surfaced as a count (call [`ev_sim_car_call_pending_riders`] to read
/// the actual rider list).
#[repr(C)]
#[derive(Debug, Clone, Copy, elevator_layout_derive::MultiHostLayout)]
pub struct EvCarCall {
    /// Elevator the button was pressed inside.
    pub car_entity_id: u64,
    /// Stop the button requests.
    pub floor_entity_id: u64,
    /// Tick the button was pressed.
    pub press_tick: u64,
    /// Tick dispatch first saw this call (after ack latency).
    /// `u64::MAX` while still pending acknowledgement.
    pub acknowledged_at: u64,
    /// Ticks the controller takes to acknowledge this call.
    pub ack_latency_ticks: u32,
    /// Number of riders aggregated onto this call. Read the actual
    /// rider ids via [`ev_sim_car_call_pending_riders`].
    pub pending_rider_count: u32,
}

/// Number of active car calls inside `elevator_entity_id`.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_car_call_count(handle: *mut EvSim, elevator_entity_id: u64) -> u32 {
    guard(0, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return 0;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            set_last_error("elevator_entity_id is invalid");
            return 0;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        u32::try_from(
            ev.sim
                .car_calls(elevator_core::entity::ElevatorId::from(elevator))
                .len(),
        )
        .unwrap_or(u32::MAX)
    })
}

/// Snapshot of car calls inside `elevator_entity_id`.
///
/// Caller-owned buffer with probe-then-fill semantics: `out_written`
/// is populated with the **required** slot count regardless of whether
/// the buffer fits, so callers can probe with `(null, 0)` to size a
/// real buffer.
///
/// Returns:
/// - `EvStatus_Ok` when all calls fit in `capacity` (`out_written
///   <= capacity`); the first `out_written` slots of `out` are
///   populated.
/// - `EvStatus_InvalidArg` when the buffer is too small;
///   `out_written` carries the required slot count and no slot of
///   `out` is written. [`ev_last_error`] carries a diagnostic string
///   only when `capacity > 0` — the documented `(null, 0)` probe is
///   silent.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`]. `out`
/// must point to at least `capacity` writable [`EvCarCall`] slots when
/// `capacity > 0`. `out_written` must be a writable `u32`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_car_calls_snapshot(
    handle: *mut EvSim,
    elevator_entity_id: u64,
    out: *mut EvCarCall,
    capacity: u32,
    out_written: *mut u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_written.is_null() {
            set_last_error("handle or out_written is null");
            return EvStatus::NullArg;
        }
        if capacity > 0 && out.is_null() {
            set_last_error("out is null but capacity > 0");
            return EvStatus::NullArg;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            set_last_error("elevator_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        let calls = ev
            .sim
            .car_calls(elevator_core::entity::ElevatorId::from(elevator));
        let needed = u32::try_from(calls.len()).unwrap_or(u32::MAX);
        // Safety: validated non-null above. Surface the required size
        // before any potential under-size return so callers can probe.
        unsafe { *out_written = needed };
        if needed > capacity {
            // capacity == 0 is a probe — see ev_sim_hall_calls_snapshot.
            if capacity > 0 {
                set_last_error(format!(
                    "insufficient buffer: need {needed} slots, got {capacity}"
                ));
            }
            return EvStatus::InvalidArg;
        }
        for (i, call) in calls.iter().enumerate() {
            let record = EvCarCall {
                car_entity_id: entity_to_u64(call.car),
                floor_entity_id: entity_to_u64(call.floor),
                press_tick: call.press_tick,
                acknowledged_at: call.acknowledged_at.unwrap_or(u64::MAX),
                ack_latency_ticks: call.ack_latency_ticks,
                pending_rider_count: u32::try_from(call.pending_riders.len()).unwrap_or(u32::MAX),
            };
            // Safety: bounds-checked above (needed <= capacity, i < calls.len() == needed).
            unsafe {
                std::ptr::write(out.add(i), record);
            }
        }
        EvStatus::Ok
    })
}

/// Pending rider list for the `index`-th car call inside `elevator_entity_id`.
/// Caller-owned buffer pattern matching the call snapshot. Returns
/// `EvStatus_NotFound` if the index is out of range.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`]. `out`
/// must point to at least `capacity` writable `u64` slots when
/// `capacity > 0`. `out_written` must be a writable `u32`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_car_call_pending_riders(
    handle: *mut EvSim,
    elevator_entity_id: u64,
    index: u32,
    out: *mut u64,
    capacity: u32,
    out_written: *mut u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_written.is_null() {
            set_last_error("handle or out_written is null");
            return EvStatus::NullArg;
        }
        if capacity > 0 && out.is_null() {
            set_last_error("out is null but capacity > 0");
            return EvStatus::NullArg;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            set_last_error("elevator_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        let calls = ev
            .sim
            .car_calls(elevator_core::entity::ElevatorId::from(elevator));
        let Some(call) = calls.get(index as usize) else {
            set_last_error(format!(
                "car call index {index} out of range (have {})",
                calls.len()
            ));
            return EvStatus::NotFound;
        };
        // Safety: `out` validity guaranteed by caller.
        let written =
            unsafe { write_entity_buffer(call.pending_riders.iter().copied(), out, capacity) };
        // Safety: out_written non-null per check above.
        unsafe { *out_written = written };
        EvStatus::Ok
    })
}

// ── metrics + EvMetrics (richer mirror) ──────────────────────────────────

/// Full repr-C mirror of [`elevator_core::metrics::Metrics`].
///
/// Time fields stay in **ticks** (not seconds) — multiply by [`ev_sim_dt`]
/// for real-time. The narrower [`EvMetricsView`] embedded in [`EvFrame`]
/// is kept for backward compatibility; new code should prefer this struct.
#[repr(C)]
#[derive(Debug, Clone, Copy, elevator_layout_derive::MultiHostLayout)]
pub struct EvMetrics {
    /// Cumulative riders delivered.
    pub total_delivered: u64,
    /// Cumulative riders who abandoned.
    pub total_abandoned: u64,
    /// Total riders spawned.
    pub total_spawned: u64,
    /// Riders settled as residents.
    pub total_settled: u64,
    /// Riders rerouted from resident phase.
    pub total_rerouted: u64,
    /// Riders delivered in the current throughput window.
    pub throughput: u64,
    /// Average wait time in ticks (spawn → board).
    pub avg_wait_ticks: f64,
    /// Maximum wait time observed in ticks.
    pub max_wait_ticks: u64,
    /// Average ride time in ticks (board → exit).
    pub avg_ride_ticks: f64,
    /// Average elevator utilization (0.0..=1.0).
    pub avg_utilization: f64,
    /// Abandonment rate (0.0..=1.0).
    pub abandonment_rate: f64,
    /// Total distance traveled by all elevators.
    pub total_distance: f64,
    /// Total rounded-floor crossings across all elevators.
    pub total_moves: u64,
    /// Distance traveled while repositioning (subset of `total_distance`).
    pub reposition_distance: f64,
}

/// Read the full metrics snapshot.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
/// `out_metrics` must be a writable [`EvMetrics`] pointer.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_metrics(
    handle: *mut EvSim,
    out_metrics: *mut EvMetrics,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_metrics.is_null() {
            set_last_error("handle or out_metrics is null");
            return EvStatus::NullArg;
        }
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        let m = ev.sim.metrics();
        let view = EvMetrics {
            total_delivered: m.total_delivered(),
            total_abandoned: m.total_abandoned(),
            total_spawned: m.total_spawned(),
            total_settled: m.total_settled(),
            total_rerouted: m.total_rerouted(),
            throughput: m.throughput(),
            avg_wait_ticks: m.avg_wait_time(),
            max_wait_ticks: m.max_wait_time(),
            avg_ride_ticks: m.avg_ride_time(),
            avg_utilization: m.avg_utilization(),
            abandonment_rate: m.abandonment_rate(),
            total_distance: m.total_distance(),
            total_moves: m.total_moves(),
            reposition_distance: m.reposition_distance(),
        };
        // Safety: caller guarantees out_metrics is writable.
        unsafe { *out_metrics = view };
        EvStatus::Ok
    })
}

// ── tagging accessors ────────────────────────────────────────────────────

/// Per-tag metric snapshot. Mirrors
/// [`elevator_core::tagged_metrics::TaggedMetric`].
#[repr(C)]
#[derive(Debug, Clone, Copy, elevator_layout_derive::MultiHostLayout)]
pub struct EvTaggedMetric {
    /// Average wait time in ticks for tagged riders.
    pub avg_wait_ticks: f64,
    /// Maximum wait time observed in ticks for tagged riders.
    pub max_wait_ticks: u64,
    /// Total riders delivered carrying this tag.
    pub total_delivered: u64,
    /// Total riders abandoned carrying this tag.
    pub total_abandoned: u64,
    /// Total riders spawned carrying this tag.
    pub total_spawned: u64,
}

/// Read the per-tag aggregates for `tag`. Returns `EvStatus_NotFound`
/// if no riders carrying the tag have been recorded yet.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
/// `tag` must be a null-terminated UTF-8 C string. `out_metric` must be
/// a writable [`EvTaggedMetric`] pointer.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_metrics_for_tag(
    handle: *mut EvSim,
    tag: *const c_char,
    out_metric: *mut EvTaggedMetric,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || tag.is_null() || out_metric.is_null() {
            set_last_error("handle, tag, or out_metric is null");
            return EvStatus::NullArg;
        }
        // Safety: caller guarantees null-terminated string.
        let cstr = unsafe { CStr::from_ptr(tag) };
        let tag_str = match cstr.to_str() {
            Ok(s) => s,
            Err(e) => {
                set_last_error(format!("tag is not valid UTF-8: {e}"));
                return EvStatus::InvalidUtf8;
            }
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        let Some(m) = ev.sim.metrics_for_tag(tag_str) else {
            // Zero out_metric on NotFound so callers that ignore the
            // status code see a deterministic zeroed struct rather than
            // whatever was already there. Matches the convention used by
            // ev_sim_metrics on its own zero-state.
            // Safety: caller guarantees out_metric is writable.
            unsafe {
                *out_metric = EvTaggedMetric {
                    avg_wait_ticks: 0.0,
                    max_wait_ticks: 0,
                    total_delivered: 0,
                    total_abandoned: 0,
                    total_spawned: 0,
                };
            }
            set_last_error(format!("no recorded metrics for tag {tag_str:?}"));
            return EvStatus::NotFound;
        };
        let record = EvTaggedMetric {
            avg_wait_ticks: m.avg_wait_time(),
            max_wait_ticks: m.max_wait_time(),
            total_delivered: m.total_delivered(),
            total_abandoned: m.total_abandoned(),
            total_spawned: m.total_spawned(),
        };
        // Safety: caller guarantees out_metric is writable.
        unsafe { *out_metric = record };
        EvStatus::Ok
    })
}

/// Number of registered metric tags.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_tag_count(handle: *mut EvSim) -> u32 {
    guard(0, || {
        clear_last_error();
        if handle.is_null() {
            set_last_error("handle is null");
            return 0;
        }
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        u32::try_from(ev.sim.all_tags().len()).unwrap_or(u32::MAX)
    })
}

/// List all registered metric tags.
///
/// Caller-owned buffer pattern: `out` is an array of `*mut c_char` (one
/// slot per tag) backed by a flat scratch buffer of `scratch_capacity`
/// bytes; `out_written` receives the number of tags written,
/// `out_scratch_used` the number of bytes written to the scratch buffer
/// (including null terminators).
///
/// Returns `EvStatus_InvalidArg` if either buffer is too small; the
/// `out_*` counts indicate the required sizes. [`ev_last_error`]
/// carries a diagnostic string only when at least one capacity is
/// non-zero — the documented `(null, 0, null, 0)` pure probe is
/// silent so callers reading [`ev_last_error`] after a deliberate
/// size query don't see a false "programmer mistake".
///
/// # Safety
///
/// `handle` must be valid. `out` and `scratch` may be null only when
/// their respective capacities are zero. `out_written` and
/// `out_scratch_used` must be writable `u32`s.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_all_tags(
    handle: *mut EvSim,
    out: *mut *mut c_char,
    capacity: u32,
    scratch: *mut c_char,
    scratch_capacity: u32,
    out_written: *mut u32,
    out_scratch_used: *mut u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_written.is_null() || out_scratch_used.is_null() {
            set_last_error("handle, out_written, or out_scratch_used is null");
            return EvStatus::NullArg;
        }
        if capacity > 0 && out.is_null() {
            set_last_error("out is null but capacity > 0");
            return EvStatus::NullArg;
        }
        if scratch_capacity > 0 && scratch.is_null() {
            set_last_error("scratch is null but scratch_capacity > 0");
            return EvStatus::NullArg;
        }
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        let tags = ev.sim.all_tags();
        let needed_count = u32::try_from(tags.len()).unwrap_or(u32::MAX);
        let needed_scratch: usize = tags.iter().map(|t| t.len() + 1).sum();
        let needed_scratch_u32 = u32::try_from(needed_scratch).unwrap_or(u32::MAX);
        // Safety: validated non-null above.
        unsafe {
            *out_written = needed_count;
            *out_scratch_used = needed_scratch_u32;
        }
        if needed_count > capacity || needed_scratch_u32 > scratch_capacity {
            // (capacity == 0 && scratch_capacity == 0) is the documented
            // pure probe — silent so callers reading ev_sim_last_error()
            // don't see a false mistake message. Any partial-size call
            // (one buffer sized, the other zero) still surfaces, so a
            // genuine under-allocation is reported.
            if capacity > 0 || scratch_capacity > 0 {
                set_last_error(format!(
                    "insufficient buffer: need {needed_count} tag slots and \
                     {needed_scratch_u32} scratch bytes"
                ));
            }
            return EvStatus::InvalidArg;
        }
        let mut scratch_offset: usize = 0;
        for (i, tag) in tags.iter().enumerate() {
            let bytes = tag.as_bytes();
            // Safety: bounds checked above (needed_scratch <= scratch_capacity).
            unsafe {
                let dst = scratch.add(scratch_offset).cast::<u8>();
                std::ptr::copy_nonoverlapping(bytes.as_ptr(), dst, bytes.len());
                *dst.add(bytes.len()) = 0;
                *out.add(i) = scratch.add(scratch_offset);
            }
            scratch_offset += bytes.len() + 1;
        }
        EvStatus::Ok
    })
}

// ── elevators_in_phase ────────────────────────────────────────────────────

/// Count elevators currently in `phase`.
///
/// The `phase` argument uses the same encoding as [`EvElevatorView::phase`].
/// Only data-less variants are supported: `0` `Idle`, `3` `DoorOpening`,
/// `4` `Loading`, `5` `DoorClosing`, `6` `Stopped`.
///
/// Returns `EvStatus_InvalidArg` for unknown phase codes.
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
/// `out_count` must be a writable `u32` pointer.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_elevators_in_phase(
    handle: *mut EvSim,
    phase: u8,
    out_count: *mut u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_count.is_null() {
            set_last_error("handle or out_count is null");
            return EvStatus::NullArg;
        }
        let Some(p) = phase_from_u8(phase) else {
            set_last_error(format!("unknown phase code {phase}"));
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        let count = u32::try_from(ev.sim.elevators_in_phase(p)).unwrap_or(u32::MAX);
        // Safety: caller guarantees out_count is writable.
        unsafe { *out_count = count };
        EvStatus::Ok
    })
}

/// Decode the C-side phase code into the core enum. Only the no-data
/// variants are supported — `MovingToStop` and `Repositioning` carry a
/// `target stop` payload, so equality with a code-only argument would
/// require also threading the stop through. Wasm makes the same call.
const fn phase_from_u8(code: u8) -> Option<ElevatorPhase> {
    match code {
        0 => Some(ElevatorPhase::Idle),
        3 => Some(ElevatorPhase::DoorOpening),
        4 => Some(ElevatorPhase::Loading),
        5 => Some(ElevatorPhase::DoorClosing),
        6 => Some(ElevatorPhase::Stopped),
        _ => None,
    }
}

/// Convert a `Duration` to the engine's tick count, rounding to nearest
/// and saturating non-finite / out-of-range values to `u64::MAX`. Bounded
/// at `2^53` because that's the largest u64 representable exactly as
/// f64; beyond it the cast to `u64` is undefined.
#[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
fn duration_to_ticks(duration: std::time::Duration, dt: f64) -> u64 {
    if dt <= 0.0 {
        return u64::MAX;
    }
    let t = (duration.as_secs_f64() / dt).round();
    if t.is_finite() && t >= 0.0 && t <= 2.0_f64.powi(53) {
        t as u64
    } else {
        u64::MAX
    }
}

// ── eta ───────────────────────────────────────────────────────────────────

/// ETA from `elevator_entity_id` to `stop_entity_id` in **ticks**.
/// Mirrors [`Simulation::eta`](elevator_core::sim::Simulation::eta).
///
/// Returns `EvStatus_InvalidArg` if the entities don't refer to a
/// valid elevator/stop pair, or `EvStatus_NotFound` if the elevator
/// cannot reach the stop (e.g. stop not on the elevator's line, or
/// disabled).
///
/// # Safety
///
/// `handle` must be a valid pointer returned by [`ev_sim_create`].
/// `out_ticks` must be a writable `u64` pointer.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_eta(
    handle: *mut EvSim,
    elevator_entity_id: u64,
    stop_entity_id: u64,
    out_ticks: *mut u64,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out_ticks.is_null() {
            set_last_error("handle or out_ticks is null");
            return EvStatus::NullArg;
        }
        let Some(elevator) = entity_from_u64(elevator_entity_id) else {
            set_last_error("elevator_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        let Some(stop) = entity_from_u64(stop_entity_id) else {
            set_last_error("stop_entity_id is invalid");
            return EvStatus::InvalidArg;
        };
        // Safety: validity guaranteed by caller.
        let ev = unsafe { &*handle };
        match ev
            .sim
            .eta(elevator_core::entity::ElevatorId::from(elevator), stop)
        {
            Ok(duration) => {
                let dt = ev.sim.dt();
                let ticks = duration_to_ticks(duration, dt);
                // Safety: caller guarantees out_ticks is writable.
                unsafe { *out_ticks = ticks };
                EvStatus::Ok
            }
            Err(e) => {
                set_last_error(format!("eta: {e}"));
                EvStatus::NotFound
            }
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::ffi::CString;

    #[test]
    fn abi_version_matches_constant() {
        assert_eq!(ev_abi_version(), EV_ABI_VERSION);
        assert_eq!(EV_ABI_VERSION, 5);
    }

    #[test]
    fn layout_derive_matches_offset_of() {
        // The proc-macro emits `core::mem::offset_of!` calls; verify
        // the captured offsets agree with native offset_of for every
        // field. This is the core invariant PR 6's codegen relies
        // on — if it ever drifts, every consumer-side struct
        // definition becomes silently wrong.
        use elevator_layout_runtime::LayoutInfo;
        let fields = <EvLogMessage as LayoutInfo>::fields();
        assert_eq!(fields.len(), 4, "EvLogMessage has 4 fields");
        assert_eq!(fields[0].name, "level");
        assert_eq!(fields[0].offset, std::mem::offset_of!(EvLogMessage, level));
        assert_eq!(fields[1].name, "ts_ns");
        assert_eq!(fields[1].offset, std::mem::offset_of!(EvLogMessage, ts_ns));
        assert_eq!(fields[2].name, "msg_ptr");
        assert_eq!(
            fields[2].offset,
            std::mem::offset_of!(EvLogMessage, msg_ptr)
        );
        assert_eq!(fields[3].name, "msg_len");
        assert_eq!(
            fields[3].offset,
            std::mem::offset_of!(EvLogMessage, msg_len)
        );
        assert_eq!(
            <EvLogMessage as LayoutInfo>::size(),
            std::mem::size_of::<EvLogMessage>()
        );
    }

    #[test]
    fn layout_registry_includes_every_host_bound_struct() {
        // Registry holds an entry for every #[derive(MultiHostLayout)]
        // type linked into the binary. The codegen (PR 6) iterates
        // this slice to enumerate everything to emit.
        let names: std::collections::HashSet<&str> = elevator_layout_runtime::REGISTRY
            .iter()
            .map(|e| e.name)
            .collect();
        // The 13 host-bound repr-C structs in elevator-ffi as of this
        // ABI generation. Adding a struct without #[derive(MultiHostLayout)]
        // lets the codegen miss it silently — this list is the gate.
        for required in [
            "EvLogMessage",
            "EvElevatorView",
            "EvStopView",
            "EvRiderView",
            "EvMetricsView",
            "EvFrame",
            "EvHallCall",
            "EvAssignment",
            "EvEvent",
            "EvElevatorParams",
            "EvCarCall",
            "EvMetrics",
            "EvTaggedMetric",
        ] {
            assert!(
                names.contains(required),
                "registry missing {required}; got: {names:?}",
            );
        }
    }

    #[test]
    fn layout_offsets_round_trip_via_registry() {
        // Spot-check a few structs through the registry (rather than
        // direct LayoutInfo calls) so the codegen's iteration path
        // is exercised in tests too. Field counts and total sizes
        // must match native size_of / offset_of.
        let entry = elevator_layout_runtime::REGISTRY
            .iter()
            .find(|e| e.name == "EvLogMessage")
            .expect("EvLogMessage in registry");
        assert_eq!(entry.size, std::mem::size_of::<EvLogMessage>());
        assert_eq!(entry.fields.len(), 4);

        let frame_entry = elevator_layout_runtime::REGISTRY
            .iter()
            .find(|e| e.name == "EvFrame")
            .expect("EvFrame in registry");
        assert_eq!(frame_entry.size, std::mem::size_of::<EvFrame>());
    }

    #[test]
    fn smoke_create_step_frame() {
        let manifest = env!("CARGO_MANIFEST_DIR");
        let root = std::path::Path::new(manifest)
            .parent()
            .and_then(std::path::Path::parent)
            .expect("workspace root");
        let config = root.join("assets/config/default.ron");
        let c_path = CString::new(config.to_str().expect("utf8 path")).unwrap();

        let handle = unsafe { ev_sim_create(c_path.as_ptr()) };
        // Safety: ev_sim_create returns either a valid Box pointer or null;
        // NonNull's pointer-to-reference conversion validates non-null in a
        // way static analyzers can track across the conversion.
        let ev = unsafe { handle.as_mut() }.expect("sim should build");

        // The core library doesn't auto-spawn riders from passenger_spawning;
        // seed some via the Rust API directly.
        let first = ev
            .sim
            .stop_lookup_iter()
            .min_by_key(|(s, _)| s.0)
            .map(|(s, _)| *s)
            .unwrap();
        let last = ev
            .sim
            .stop_lookup_iter()
            .max_by_key(|(s, _)| s.0)
            .map(|(s, _)| *s)
            .unwrap();
        for _ in 0..20 {
            ev.sim.spawn_rider(first, last, 75.0).unwrap();
        }

        for _ in 0..3000 {
            assert_eq!(unsafe { ev_sim_step(handle) }, EvStatus::Ok);
        }

        let mut frame = EvFrame {
            elevators: std::ptr::null(),
            elevator_count: 0,
            stops: std::ptr::null(),
            stop_count: 0,
            riders: std::ptr::null(),
            rider_count: 0,
            metrics: EvMetricsView {
                total_delivered: 0,
                total_abandoned: 0,
                avg_wait_seconds: 0.0,
                avg_ride_seconds: 0.0,
                current_tick: 0,
            },
        };
        assert_eq!(
            unsafe { ev_sim_frame(handle, &raw mut frame) },
            EvStatus::Ok
        );
        assert!(frame.elevator_count >= 1);
        assert!(frame.stop_count >= 2);
        assert_eq!(frame.metrics.current_tick, 3000);
        assert!(
            frame.metrics.total_delivered > 0,
            "expected at least one delivery after 3000 ticks"
        );

        unsafe { ev_sim_destroy(handle) };
    }

    /// `EvHallCall::destination_entity_id` round-trips the call's DCS
    /// destination through the FFI boundary. Non-zero when the group
    /// is in `HallCallMode::Destination` and a rider has entered a
    /// destination at the kiosk.
    #[test]
    fn hall_call_snapshot_carries_destination_id() {
        use elevator_core::dispatch::HallCallMode;
        use elevator_core::ids::GroupId;

        let manifest = env!("CARGO_MANIFEST_DIR");
        let root = std::path::Path::new(manifest)
            .parent()
            .and_then(std::path::Path::parent)
            .expect("workspace root");
        let config = root.join("assets/config/default.ron");
        let c_path = CString::new(config.to_str().expect("utf8 path")).unwrap();

        let handle = unsafe { ev_sim_create(c_path.as_ptr()) };
        let ev = unsafe { handle.as_mut() }.expect("sim should build");

        // Flip the only group into Destination mode.
        for g in ev.sim.groups_mut() {
            if g.id() == GroupId(0) {
                g.set_hall_call_mode(HallCallMode::Destination);
            }
        }
        let first = ev
            .sim
            .stop_lookup_iter()
            .min_by_key(|(s, _)| s.0)
            .map(|(s, _)| *s)
            .unwrap();
        let last = ev
            .sim
            .stop_lookup_iter()
            .max_by_key(|(s, _)| s.0)
            .map(|(s, _)| *s)
            .unwrap();
        // Spawning a rider in DCS mode populates `HallCall::destination`.
        ev.sim.spawn_rider(first, last, 75.0).unwrap();

        let dest_entity = ev.sim.stop_entity(last).expect("dest stop exists");
        let expected_dest_id = entity_to_u64(dest_entity);

        let mut buf = [EvHallCall {
            stop_entity_id: 0,
            direction: 0,
            press_tick: 0,
            acknowledged_at: 0,
            assigned_car: 0,
            destination_entity_id: 0,
            pinned: 0,
            pending_rider_count: 0,
        }; 4];
        let mut written: u32 = 0;
        let status = unsafe {
            ev_sim_hall_calls_snapshot(
                handle,
                buf.as_mut_ptr(),
                u32::try_from(buf.len()).unwrap(),
                &raw mut written,
            )
        };
        assert_eq!(status, EvStatus::Ok);
        assert!(written >= 1, "at least one hall call should be written");
        let dcs_call = buf[..written as usize]
            .iter()
            .find(|c| c.destination_entity_id != 0)
            .expect("DCS-mode call should carry a nonzero destination");
        assert_eq!(dcs_call.destination_entity_id, expected_dest_id);

        unsafe { ev_sim_destroy(handle) };
    }

    /// `ev_sim_drain_events` surfaces at least the `HallButtonPressed`
    /// event fired when a rider spawns. Confirms the FFI event drain
    /// exists and wires the kind discriminator + fields correctly.
    #[test]
    fn drain_events_surfaces_hall_button_pressed() {
        let manifest = env!("CARGO_MANIFEST_DIR");
        let root = std::path::Path::new(manifest)
            .parent()
            .and_then(std::path::Path::parent)
            .expect("workspace root");
        let config = root.join("assets/config/default.ron");
        let c_path = CString::new(config.to_str().expect("utf8 path")).unwrap();

        let handle = unsafe { ev_sim_create(c_path.as_ptr()) };
        let ev = unsafe { handle.as_mut() }.expect("sim should build");

        let first = ev
            .sim
            .stop_lookup_iter()
            .min_by_key(|(s, _)| s.0)
            .map(|(s, _)| *s)
            .unwrap();
        let last = ev
            .sim
            .stop_lookup_iter()
            .max_by_key(|(s, _)| s.0)
            .map(|(s, _)| *s)
            .unwrap();
        ev.sim.spawn_rider(first, last, 75.0).unwrap();

        // Step a few ticks so all phases complete and events settle.
        for _ in 0..3 {
            assert_eq!(unsafe { ev_sim_step(handle) }, EvStatus::Ok);
        }

        // Drain all events accumulated across all steps.
        let mut all_events = Vec::new();
        loop {
            let mut buf = [EvEvent {
                kind: 0,
                direction: 0,
                code1: 0,
                code2: 0,
                group: 0,
                tick: 0,
                stop: 0,
                car: 0,
                rider: 0,
                floor: 0,
                entity: 0,
                count: 0,
                f1: 0.0,
                f2: 0.0,
                tag: 0,
            }; 64];
            let mut written: u32 = 0;
            let status = unsafe {
                ev_sim_drain_events(
                    handle,
                    buf.as_mut_ptr(),
                    u32::try_from(buf.len()).unwrap(),
                    &raw mut written,
                )
            };
            assert_eq!(status, EvStatus::Ok);
            if written == 0 {
                break;
            }
            all_events.extend_from_slice(&buf[..written as usize]);
        }

        assert!(
            all_events
                .iter()
                .any(|e| e.kind == ev_event_kind::HALL_BUTTON_PRESSED && e.stop != 0),
            "drain should surface HallButtonPressed with a nonzero stop id; \
             got {} events with kinds: {:?}",
            all_events.len(),
            all_events.iter().map(|e| e.kind).collect::<Vec<_>>(),
        );

        unsafe { ev_sim_destroy(handle) };
    }

    /// When pending events exceed `capacity`, the first `capacity`
    /// are returned and the rest stay in the FFI buffer for the next
    /// call — no event is ever silently dropped. Regression guard
    /// for the truncation-safety contract.
    #[test]
    fn drain_events_never_drops_on_overflow() {
        let manifest = env!("CARGO_MANIFEST_DIR");
        let root = std::path::Path::new(manifest)
            .parent()
            .and_then(std::path::Path::parent)
            .expect("workspace root");
        let config = root.join("assets/config/default.ron");
        let c_path = CString::new(config.to_str().expect("utf8 path")).unwrap();

        let handle = unsafe { ev_sim_create(c_path.as_ptr()) };
        let ev = unsafe { handle.as_mut() }.expect("sim should build");

        // Spawn three riders at different stops to produce multiple
        // HallButtonPressed + HallCallAcknowledged events.
        let stops: Vec<_> = ev.sim.stop_lookup_iter().map(|(s, _)| *s).collect();
        assert!(stops.len() >= 3);
        ev.sim.spawn_rider(stops[0], stops[2], 75.0).unwrap();
        ev.sim.spawn_rider(stops[1], stops[0], 75.0).unwrap();
        ev.sim.spawn_rider(stops[2], stops[0], 75.0).unwrap();
        assert_eq!(unsafe { ev_sim_step(handle) }, EvStatus::Ok);

        // Deliberately small buffer so we force overflow.
        let mut small = [EvEvent {
            kind: 0,
            direction: 0,
            code1: 0,
            code2: 0,
            group: 0,
            tick: 0,
            stop: 0,
            car: 0,
            rider: 0,
            floor: 0,
            entity: 0,
            count: 0,
            f1: 0.0,
            f2: 0.0,
            tag: 0,
        }; 2];
        let mut first_written: u32 = 0;
        assert_eq!(
            unsafe { ev_sim_drain_events(handle, small.as_mut_ptr(), 2, &raw mut first_written) },
            EvStatus::Ok,
        );
        assert_eq!(first_written, 2, "should fill the small buffer");

        // The API must report that more events remain buffered.
        let still_pending = unsafe { ev_sim_pending_event_count(handle) };
        assert!(
            still_pending > 0,
            "overflow should leave events in the FFI buffer (got {still_pending})",
        );

        // Drain the rest with an adequately-sized buffer. Total of
        // all drain calls must equal initial count — zero drops.
        let mut rest = vec![
            EvEvent {
                kind: 0,
                direction: 0,
                code1: 0,
                code2: 0,
                group: 0,
                tick: 0,
                stop: 0,
                car: 0,
                rider: 0,
                floor: 0,
                entity: 0,
                count: 0,
                f1: 0.0,
                f2: 0.0,
                tag: 0,
            };
            (still_pending + 8) as usize
        ];
        let mut rest_written: u32 = 0;
        assert_eq!(
            unsafe {
                ev_sim_drain_events(
                    handle,
                    rest.as_mut_ptr(),
                    u32::try_from(rest.len()).unwrap(),
                    &raw mut rest_written,
                )
            },
            EvStatus::Ok,
        );
        assert_eq!(
            rest_written, still_pending,
            "second drain should deliver exactly the previously-pending count"
        );
        assert_eq!(
            unsafe { ev_sim_pending_event_count(handle) },
            0,
            "buffer should be empty after full drain",
        );

        unsafe { ev_sim_destroy(handle) };
    }

    /// Helper: create an `EvSim` handle from default.ron.
    fn create_test_handle() -> *mut EvSim {
        let manifest = env!("CARGO_MANIFEST_DIR");
        let root = std::path::Path::new(manifest)
            .parent()
            .and_then(std::path::Path::parent)
            .expect("workspace root");
        let config = root.join("assets/config/default.ron");
        let c_path = CString::new(config.to_str().expect("utf8 path")).unwrap();
        let handle = unsafe { ev_sim_create(c_path.as_ptr()) };
        assert!(!handle.is_null(), "sim should build");
        handle
    }

    /// Helper: get the first elevator's entity id from the frame.
    fn first_elevator_entity(handle: *mut EvSim) -> u64 {
        let mut frame = EvFrame {
            elevators: std::ptr::null(),
            elevator_count: 0,
            stops: std::ptr::null(),
            stop_count: 0,
            riders: std::ptr::null(),
            rider_count: 0,
            metrics: EvMetricsView {
                total_delivered: 0,
                total_abandoned: 0,
                avg_wait_seconds: 0.0,
                avg_ride_seconds: 0.0,
                current_tick: 0,
            },
        };
        assert_eq!(
            unsafe { ev_sim_frame(handle, &raw mut frame) },
            EvStatus::Ok
        );
        assert!(
            frame.elevator_count >= 1,
            "default config should have >= 1 elevator"
        );
        let elevators =
            unsafe { std::slice::from_raw_parts(frame.elevators, frame.elevator_count) };
        elevators[0].entity_id
    }

    /// Helper: get (`first_stop_entity_id`, `last_stop_entity_id`) from frame.
    fn stop_entities(handle: *mut EvSim) -> (u64, u64) {
        let mut frame = EvFrame {
            elevators: std::ptr::null(),
            elevator_count: 0,
            stops: std::ptr::null(),
            stop_count: 0,
            riders: std::ptr::null(),
            rider_count: 0,
            metrics: EvMetricsView {
                total_delivered: 0,
                total_abandoned: 0,
                avg_wait_seconds: 0.0,
                avg_ride_seconds: 0.0,
                current_tick: 0,
            },
        };
        assert_eq!(
            unsafe { ev_sim_frame(handle, &raw mut frame) },
            EvStatus::Ok
        );
        assert!(frame.stop_count >= 2);
        let stops = unsafe { std::slice::from_raw_parts(frame.stops, frame.stop_count) };
        (stops[0].entity_id, stops[stops.len() - 1].entity_id)
    }

    /// Helper: drain all events from the handle.
    fn drain_all_events(handle: *mut EvSim) -> Vec<EvEvent> {
        let mut all = Vec::new();
        loop {
            let mut buf = [EvEvent {
                kind: 0,
                direction: 0,
                code1: 0,
                code2: 0,
                group: 0,
                tick: 0,
                stop: 0,
                car: 0,
                rider: 0,
                floor: 0,
                entity: 0,
                count: 0,
                f1: 0.0,
                f2: 0.0,
                tag: 0,
            }; 128];
            let mut written: u32 = 0;
            assert_eq!(
                unsafe {
                    ev_sim_drain_events(
                        handle,
                        buf.as_mut_ptr(),
                        u32::try_from(buf.len()).unwrap(),
                        &raw mut written,
                    )
                },
                EvStatus::Ok
            );
            if written == 0 {
                break;
            }
            all.extend_from_slice(&buf[..written as usize]);
        }
        all
    }

    /// Helper: return a fully-populated `EvElevatorParams` initialised from the
    /// core defaults. Wraps the three-line `MaybeUninit` pattern so tests don't
    /// repeat it.
    fn default_params() -> EvElevatorParams {
        let mut params = std::mem::MaybeUninit::<EvElevatorParams>::uninit();
        assert_eq!(
            unsafe { ev_sim_default_elevator_params(params.as_mut_ptr()) },
            EvStatus::Ok,
        );
        unsafe { params.assume_init() }
    }

    #[test]
    fn spawn_rider_roundtrip() {
        let handle = create_test_handle();
        let (origin, dest) = stop_entities(handle);

        let mut rider_id: u64 = 0;
        let status = unsafe { ev_sim_spawn_rider(handle, origin, dest, 80.0, &raw mut rider_id) };
        assert_eq!(status, EvStatus::Ok);
        assert_ne!(rider_id, 0, "rider entity id should be nonzero");

        // Step once so the rider appears in the frame.
        assert_eq!(unsafe { ev_sim_step(handle) }, EvStatus::Ok);

        let mut frame = EvFrame {
            elevators: std::ptr::null(),
            elevator_count: 0,
            stops: std::ptr::null(),
            stop_count: 0,
            riders: std::ptr::null(),
            rider_count: 0,
            metrics: EvMetricsView {
                total_delivered: 0,
                total_abandoned: 0,
                avg_wait_seconds: 0.0,
                avg_ride_seconds: 0.0,
                current_tick: 0,
            },
        };
        assert_eq!(
            unsafe { ev_sim_frame(handle, &raw mut frame) },
            EvStatus::Ok
        );
        assert!(
            frame.rider_count >= 1,
            "spawned rider should appear in frame"
        );
        let riders = unsafe { std::slice::from_raw_parts(frame.riders, frame.rider_count) };
        let spawned = riders.iter().find(|r| r.entity_id == rider_id);
        assert!(
            spawned.is_some(),
            "rider with returned id should be in frame"
        );
        assert_eq!(spawned.unwrap().phase, 0, "should be Waiting (phase 0)");

        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn spawn_rider_ex_sets_preferences() {
        let handle = create_test_handle();
        let (origin, dest) = stop_entities(handle);

        let mut rider_id: u64 = 0;
        let status = unsafe {
            ev_sim_spawn_rider_ex(
                handle,
                origin,
                dest,
                70.0,
                true, // skip_full_elevator
                0.5,  // max_crowding_factor
                500,  // abandon_after_ticks
                true, // abandon_on_full
                1000, // max_wait_ticks (patience)
                &raw mut rider_id,
            )
        };
        assert_eq!(status, EvStatus::Ok);
        assert_ne!(rider_id, 0);

        // Verify preferences were applied via the Rust API.
        let ev = unsafe { &*handle };
        let eid = entity_from_u64(rider_id).unwrap();
        let prefs = ev.sim.world().preferences(eid).expect("prefs should exist");
        assert!(prefs.skip_full_elevator());
        assert!((prefs.max_crowding_factor() - 0.5).abs() < f64::EPSILON);
        assert_eq!(prefs.abandon_after_ticks(), Some(500));
        assert!(prefs.abandon_on_full());

        let patience = ev.sim.world().patience(eid).expect("patience should exist");
        assert_eq!(patience.max_wait_ticks(), 1000);

        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn despawn_rider_removes_from_frame() {
        let handle = create_test_handle();
        let (origin, dest) = stop_entities(handle);

        let mut rider_id: u64 = 0;
        assert_eq!(
            unsafe { ev_sim_spawn_rider(handle, origin, dest, 80.0, &raw mut rider_id) },
            EvStatus::Ok,
        );

        // Despawn immediately.
        assert_eq!(
            unsafe { ev_sim_despawn_rider(handle, rider_id) },
            EvStatus::Ok,
        );

        // Step and check frame — rider should be gone.
        assert_eq!(unsafe { ev_sim_step(handle) }, EvStatus::Ok);
        let mut frame = EvFrame {
            elevators: std::ptr::null(),
            elevator_count: 0,
            stops: std::ptr::null(),
            stop_count: 0,
            riders: std::ptr::null(),
            rider_count: 0,
            metrics: EvMetricsView {
                total_delivered: 0,
                total_abandoned: 0,
                avg_wait_seconds: 0.0,
                avg_ride_seconds: 0.0,
                current_tick: 0,
            },
        };
        assert_eq!(
            unsafe { ev_sim_frame(handle, &raw mut frame) },
            EvStatus::Ok
        );
        let riders = unsafe { std::slice::from_raw_parts(frame.riders, frame.rider_count) };
        assert!(
            !riders.iter().any(|r| r.entity_id == rider_id),
            "despawned rider should not appear in frame",
        );

        // Despawning again should fail.
        assert_eq!(
            unsafe { ev_sim_despawn_rider(handle, rider_id) },
            EvStatus::NotFound,
        );

        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn rider_tag_round_trips_and_errors_on_stale_id() {
        // Default 0, set/get round-trips, despawned id returns
        // NotFound. The 6-line null-arg checks exercise the safety
        // gates without needing a live sim.
        let handle = create_test_handle();
        let (origin, dest) = stop_entities(handle);

        let mut rider_id: u64 = 0;
        assert_eq!(
            unsafe { ev_sim_spawn_rider(handle, origin, dest, 80.0, &raw mut rider_id) },
            EvStatus::Ok,
        );

        let mut tag: u64 = 0xFFFF_FFFF_FFFF_FFFF;
        assert_eq!(
            unsafe { ev_sim_rider_tag(handle, rider_id, &raw mut tag) },
            EvStatus::Ok,
        );
        assert_eq!(tag, 0, "fresh rider must default to untagged sentinel");

        assert_eq!(
            unsafe { ev_sim_set_rider_tag(handle, rider_id, 0xDEAD_BEEF) },
            EvStatus::Ok,
        );
        let mut roundtrip: u64 = 0;
        assert_eq!(
            unsafe { ev_sim_rider_tag(handle, rider_id, &raw mut roundtrip) },
            EvStatus::Ok,
        );
        assert_eq!(roundtrip, 0xDEAD_BEEF);

        // Stale id after despawn — both accessors must return NotFound.
        assert_eq!(
            unsafe { ev_sim_despawn_rider(handle, rider_id) },
            EvStatus::Ok,
        );
        assert_eq!(
            unsafe { ev_sim_set_rider_tag(handle, rider_id, 1) },
            EvStatus::NotFound,
        );
        let mut after_despawn: u64 = 0;
        assert_eq!(
            unsafe { ev_sim_rider_tag(handle, rider_id, &raw mut after_despawn) },
            EvStatus::NotFound,
        );

        // Null-arg gates.
        assert_eq!(
            unsafe { ev_sim_set_rider_tag(std::ptr::null_mut(), rider_id, 1) },
            EvStatus::NullArg,
        );
        let mut null_handle_tag: u64 = 0;
        assert_eq!(
            unsafe { ev_sim_rider_tag(std::ptr::null_mut(), rider_id, &raw mut null_handle_tag) },
            EvStatus::NullArg,
        );
        assert_eq!(
            unsafe { ev_sim_rider_tag(handle, rider_id, std::ptr::null_mut()) },
            EvStatus::NullArg,
        );

        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn elevator_home_stop_round_trips_and_validates() {
        // Default 0 (unpinned), set/get round-trips, clear returns
        // 0, errors propagate from the Rust API for unknown elevators
        // and unknown stops, and the null-arg gates fire.
        let handle = create_test_handle();
        let elevator_id = first_elevator_entity(handle);
        let (stop_a, _stop_b) = stop_entities(handle);

        // Default is the 0 sentinel — no pin set on a fresh sim.
        let mut out: u64 = 0xFFFF_FFFF_FFFF_FFFF;
        assert_eq!(
            unsafe { ev_sim_elevator_home_stop(handle, elevator_id, &raw mut out) },
            EvStatus::Ok,
        );
        assert_eq!(out, 0, "fresh elevator must default to unpinned (0)");

        // Set + read-back.
        assert_eq!(
            unsafe { ev_sim_set_elevator_home_stop(handle, elevator_id, stop_a) },
            EvStatus::Ok,
        );
        let mut roundtrip: u64 = 0;
        assert_eq!(
            unsafe { ev_sim_elevator_home_stop(handle, elevator_id, &raw mut roundtrip) },
            EvStatus::Ok,
        );
        assert_eq!(roundtrip, stop_a);

        // Clear → back to 0.
        assert_eq!(
            unsafe { ev_sim_clear_elevator_home_stop(handle, elevator_id) },
            EvStatus::Ok,
        );
        let mut after_clear: u64 = 0xFFFF;
        assert_eq!(
            unsafe { ev_sim_elevator_home_stop(handle, elevator_id, &raw mut after_clear) },
            EvStatus::Ok,
        );
        assert_eq!(after_clear, 0);

        // Pin to an undecodable stop id — the FFI's `entity_from_u64`
        // gate rejects this with InvalidArg before reaching the Rust
        // API. (A *decodable* but stale id would surface NotFound from
        // the inner `resolve_stop`; that path is exercised by the Rust
        // `pin_to_unknown_stop_id_returns_stop_not_found` test.)
        let bogus_stop: u64 = 0;
        assert_eq!(
            unsafe { ev_sim_set_elevator_home_stop(handle, elevator_id, bogus_stop) },
            EvStatus::InvalidArg,
        );

        // Pin a non-elevator entity — `require_elevator` raises
        // `NotAnElevator`, which the FFI maps through `mode_error_status`
        // to NotFound (the same status games already handle for stale
        // refs).
        let not_an_elevator = stop_a; // Stop entity, not an elevator.
        assert_eq!(
            unsafe { ev_sim_set_elevator_home_stop(handle, not_an_elevator, stop_a) },
            EvStatus::NotFound,
        );

        // Null-arg gates — verify each null pointer slot produces
        // NullArg rather than dereferencing.
        assert_eq!(
            unsafe { ev_sim_set_elevator_home_stop(std::ptr::null_mut(), elevator_id, stop_a) },
            EvStatus::NullArg,
        );
        assert_eq!(
            unsafe { ev_sim_clear_elevator_home_stop(std::ptr::null_mut(), elevator_id) },
            EvStatus::NullArg,
        );
        let mut null_handle_stop: u64 = 0;
        assert_eq!(
            unsafe {
                ev_sim_elevator_home_stop(
                    std::ptr::null_mut(),
                    elevator_id,
                    &raw mut null_handle_stop,
                )
            },
            EvStatus::NullArg,
        );
        assert_eq!(
            unsafe { ev_sim_elevator_home_stop(handle, elevator_id, std::ptr::null_mut()) },
            EvStatus::NullArg,
        );

        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn drain_surfaces_rider_lifecycle_events() {
        let handle = create_test_handle();
        let (origin, dest) = stop_entities(handle);

        // Spawn via FFI so the event is emitted.
        let mut rider_id: u64 = 0;
        assert_eq!(
            unsafe { ev_sim_spawn_rider(handle, origin, dest, 80.0, &raw mut rider_id) },
            EvStatus::Ok,
        );

        // Run enough ticks for the rider to board, ride, and exit.
        for _ in 0..3000 {
            assert_eq!(unsafe { ev_sim_step(handle) }, EvStatus::Ok);
        }

        let events = drain_all_events(handle);

        // RiderSpawned: check origin and destination fields.
        let spawned = events
            .iter()
            .find(|e| e.kind == ev_event_kind::RIDER_SPAWNED && e.rider == rider_id);
        assert!(spawned.is_some(), "should see RIDER_SPAWNED for our rider");
        let s = spawned.unwrap();
        assert_eq!(s.stop, origin, "spawned event stop should be origin");
        assert_eq!(s.floor, dest, "spawned event floor should be destination");

        // RiderBoarded.
        assert!(
            events
                .iter()
                .any(|e| e.kind == ev_event_kind::RIDER_BOARDED && e.rider == rider_id),
            "should see RIDER_BOARDED",
        );

        // RiderExited.
        assert!(
            events
                .iter()
                .any(|e| e.kind == ev_event_kind::RIDER_EXITED && e.rider == rider_id),
            "should see RIDER_EXITED",
        );

        unsafe { ev_sim_destroy(handle) };
    }

    /// `EvEvent.tag` (ABI v5) carries `Rider.tag` for every rider event,
    /// sampled before the rider's slot is freed. Pin the contract from
    /// the C side: set a tag, drain across a full lifecycle, assert it
    /// shows up on every rider-bearing event we observe.
    #[test]
    fn drained_events_carry_rider_tag() {
        const SENTINEL: u64 = 0xCAFE_F00D;

        let handle = create_test_handle();
        let (origin, dest) = stop_entities(handle);

        let mut rider_id: u64 = 0;
        assert_eq!(
            unsafe { ev_sim_spawn_rider(handle, origin, dest, 80.0, &raw mut rider_id) },
            EvStatus::Ok,
        );

        // Tag *after* spawn — RiderSpawned fired with tag = 0; every
        // subsequent rider-bearing event must surface SENTINEL.
        assert_eq!(
            unsafe { ev_sim_set_rider_tag(handle, rider_id, SENTINEL) },
            EvStatus::Ok,
        );

        for _ in 0..3000 {
            assert_eq!(unsafe { ev_sim_step(handle) }, EvStatus::Ok);
        }
        let events = drain_all_events(handle);

        let rider_kinds = [
            ev_event_kind::RIDER_BOARDED,
            ev_event_kind::RIDER_EXITED,
            ev_event_kind::CAR_BUTTON_PRESSED,
        ];
        let mut saw_any_with_tag = false;
        for event in &events {
            if event.rider == rider_id && rider_kinds.contains(&event.kind) {
                assert_eq!(
                    event.tag, SENTINEL,
                    "rider-bearing event kind {} for our rider must carry the sentinel tag",
                    event.kind,
                );
                saw_any_with_tag = true;
            }
        }
        assert!(
            saw_any_with_tag,
            "should observe at least one rider-bearing event for our rider",
        );

        unsafe { ev_sim_destroy(handle) };
    }

    // ── Topology mutation ────────────────────────────────────────────

    #[test]
    fn add_group_writes_id_and_returns_ok() {
        let handle = create_test_handle();
        let name = CString::new("Test Group").unwrap();
        let mut group_id: u32 = u32::MAX;
        let status =
            unsafe { ev_sim_add_group(handle, name.as_ptr(), EvStrategy::Etd, &raw mut group_id) };
        assert_eq!(status, EvStatus::Ok);
        assert_ne!(group_id, u32::MAX, "out_group_id should be written");
        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn add_group_rejects_null_name() {
        let handle = create_test_handle();
        let mut group_id: u32 = 0;
        let status = unsafe {
            ev_sim_add_group(
                handle,
                std::ptr::null(),
                EvStrategy::Scan,
                &raw mut group_id,
            )
        };
        assert_eq!(status, EvStatus::NullArg);
        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn add_line_then_add_stop_round_trip() {
        let handle = create_test_handle();
        let name = CString::new("New Line").unwrap();
        let mut line: u64 = 0;
        // group 0 exists in default.ron
        let status =
            unsafe { ev_sim_add_line(handle, 0, name.as_ptr(), 0.0, 100.0, 0, &raw mut line) };
        assert_eq!(status, EvStatus::Ok);
        assert_ne!(line, 0);

        let stop_name = CString::new("Lobby").unwrap();
        let mut stop: u64 = 0;
        let status =
            unsafe { ev_sim_add_stop(handle, line, stop_name.as_ptr(), 12.5, &raw mut stop) };
        assert_eq!(status, EvStatus::Ok);
        assert_ne!(stop, 0);

        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn add_line_to_missing_group_returns_not_found() {
        let handle = create_test_handle();
        let name = CString::new("Orphan Line").unwrap();
        let mut line: u64 = 0;
        let status =
            unsafe { ev_sim_add_line(handle, 9999, name.as_ptr(), 0.0, 10.0, 0, &raw mut line) };
        assert_eq!(status, EvStatus::NotFound);
        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn set_line_range_then_remove_stop_then_remove_line() {
        let handle = create_test_handle();
        let name = CString::new("Sandbox").unwrap();
        let mut line: u64 = 0;
        assert_eq!(
            unsafe { ev_sim_add_line(handle, 0, name.as_ptr(), 0.0, 50.0, 0, &raw mut line) },
            EvStatus::Ok,
        );

        // Widen the line range.
        assert_eq!(
            unsafe { ev_sim_set_line_range(handle, line, -10.0, 200.0) },
            EvStatus::Ok,
        );

        // Add a stop, then remove it.
        let stop_name = CString::new("Mezz").unwrap();
        let mut stop: u64 = 0;
        assert_eq!(
            unsafe { ev_sim_add_stop(handle, line, stop_name.as_ptr(), 25.0, &raw mut stop) },
            EvStatus::Ok,
        );
        assert_eq!(unsafe { ev_sim_remove_stop(handle, stop) }, EvStatus::Ok);

        // Remove the line.
        assert_eq!(unsafe { ev_sim_remove_line(handle, line) }, EvStatus::Ok);

        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn remove_stop_with_invalid_id_returns_invalid_arg() {
        let handle = create_test_handle();
        // Zero is the sentinel for "invalid entity id" in entity_from_u64.
        assert_eq!(
            unsafe { ev_sim_remove_stop(handle, 0) },
            EvStatus::InvalidArg,
        );
        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn default_elevator_params_matches_core_defaults() {
        let mut params = EvElevatorParams {
            max_speed: 0.0,
            acceleration: 0.0,
            deceleration: 0.0,
            weight_capacity: 0.0,
            door_transition_ticks: 0,
            door_open_ticks: 0,
            inspection_speed_factor: 0.0,
            bypass_load_up_pct: 0.0,
            bypass_load_down_pct: 0.0,
        };
        let status = unsafe { ev_sim_default_elevator_params(&raw mut params) };
        assert_eq!(status, EvStatus::Ok);
        let core = elevator_core::sim::ElevatorParams::default();
        // Bit-for-bit equality: ev_sim_default_elevator_params writes the raw
        // f64s straight from core, so any drift would be a copy-paste bug.
        assert_eq!(params.max_speed.to_bits(), core.max_speed.value().to_bits());
        assert_eq!(
            params.weight_capacity.to_bits(),
            core.weight_capacity.value().to_bits(),
        );
        assert_eq!(params.door_transition_ticks, core.door_transition_ticks);
        // Default bypass thresholds are None → encoded as NaN.
        assert!(params.bypass_load_up_pct.is_nan());
        assert!(params.bypass_load_down_pct.is_nan());
    }

    #[test]
    fn add_elevator_with_defaults_returns_ok() {
        let handle = create_test_handle();
        let line_name = CString::new("Test Line").unwrap();
        let mut line: u64 = 0;
        assert_eq!(
            unsafe { ev_sim_add_line(handle, 0, line_name.as_ptr(), 0.0, 100.0, 0, &raw mut line) },
            EvStatus::Ok,
        );

        // Need at least one stop on the line for add_elevator to find a
        // valid starting point. (add_elevator itself only requires the
        // line, but downstream phases need stops.)
        let stop_name = CString::new("Lobby").unwrap();
        let mut stop: u64 = 0;
        assert_eq!(
            unsafe { ev_sim_add_stop(handle, line, stop_name.as_ptr(), 0.0, &raw mut stop) },
            EvStatus::Ok,
        );

        let params = default_params();

        let mut elevator: u64 = 0;
        let status = unsafe {
            ev_sim_add_elevator(
                handle,
                &raw const params,
                std::ptr::null(),
                0,
                line,
                0.0,
                &raw mut elevator,
            )
        };
        assert_eq!(status, EvStatus::Ok);
        assert_ne!(elevator, 0);
        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn add_elevator_rejects_invalid_line() {
        let handle = create_test_handle();
        let params = default_params();
        let mut elevator: u64 = 0;
        let status = unsafe {
            ev_sim_add_elevator(
                handle,
                &raw const params,
                std::ptr::null(),
                0,
                0, // invalid line id
                0.0,
                &raw mut elevator,
            )
        };
        assert_eq!(status, EvStatus::InvalidArg);
        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn add_elevator_with_restricted_stops() {
        let handle = create_test_handle();
        let line_name = CString::new("Restricted Line").unwrap();
        let mut line: u64 = 0;
        assert_eq!(
            unsafe { ev_sim_add_line(handle, 0, line_name.as_ptr(), 0.0, 100.0, 0, &raw mut line) },
            EvStatus::Ok,
        );
        let s1 = CString::new("S1").unwrap();
        let mut stop1: u64 = 0;
        assert_eq!(
            unsafe { ev_sim_add_stop(handle, line, s1.as_ptr(), 0.0, &raw mut stop1) },
            EvStatus::Ok,
        );
        let s2 = CString::new("S2").unwrap();
        let mut stop2: u64 = 0;
        assert_eq!(
            unsafe { ev_sim_add_stop(handle, line, s2.as_ptr(), 50.0, &raw mut stop2) },
            EvStatus::Ok,
        );

        let params = default_params();

        let restricted = [stop2];
        let restricted_count = u32::try_from(restricted.len()).expect("len fits u32");
        let mut elevator: u64 = 0;
        let status = unsafe {
            ev_sim_add_elevator(
                handle,
                &raw const params,
                restricted.as_ptr(),
                restricted_count,
                line,
                0.0,
                &raw mut elevator,
            )
        };
        assert_eq!(status, EvStatus::Ok);
        assert_ne!(elevator, 0);
        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn add_elevator_with_finite_bypass_thresholds() {
        // Exercises the Some(_) branch of the NaN-as-None sentinel
        // decode at ev_sim_add_elevator (the default-params path leaves
        // both bypass fields NaN, so the Some(...) branch was uncovered
        // until this test).
        let handle = create_test_handle();
        let line_name = CString::new("Bypass Line").unwrap();
        let mut line: u64 = 0;
        assert_eq!(
            unsafe { ev_sim_add_line(handle, 0, line_name.as_ptr(), 0.0, 100.0, 0, &raw mut line) },
            EvStatus::Ok,
        );
        let stop_name = CString::new("Lobby").unwrap();
        let mut stop: u64 = 0;
        assert_eq!(
            unsafe { ev_sim_add_stop(handle, line, stop_name.as_ptr(), 0.0, &raw mut stop) },
            EvStatus::Ok,
        );

        let mut params = default_params();
        params.bypass_load_up_pct = 0.85;
        params.bypass_load_down_pct = 0.75;

        let mut elevator: u64 = 0;
        let status = unsafe {
            ev_sim_add_elevator(
                handle,
                &raw const params,
                std::ptr::null(),
                0,
                line,
                0.0,
                &raw mut elevator,
            )
        };
        assert_eq!(status, EvStatus::Ok);
        assert_ne!(elevator, 0);
        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn add_elevator_dedups_duplicate_restricted_stops() {
        // Passing the same stop id three times should land a single
        // entry in the elevator's restricted_stops HashSet — the
        // dedup happens at insertion time on the Rust side. Without
        // this, the test in `add_elevator_with_restricted_stops` (which
        // passes a single-element slice) wouldn't exercise dedup.
        let handle = create_test_handle();
        let line_name = CString::new("Dedup Line").unwrap();
        let mut line: u64 = 0;
        assert_eq!(
            unsafe { ev_sim_add_line(handle, 0, line_name.as_ptr(), 0.0, 100.0, 0, &raw mut line) },
            EvStatus::Ok,
        );
        let stop_name = CString::new("Skip").unwrap();
        let mut skip_stop: u64 = 0;
        assert_eq!(
            unsafe { ev_sim_add_stop(handle, line, stop_name.as_ptr(), 50.0, &raw mut skip_stop) },
            EvStatus::Ok,
        );
        // Add a second stop so the elevator has somewhere to start.
        let lobby = CString::new("Lobby").unwrap();
        let mut lobby_stop: u64 = 0;
        assert_eq!(
            unsafe { ev_sim_add_stop(handle, line, lobby.as_ptr(), 0.0, &raw mut lobby_stop) },
            EvStatus::Ok,
        );

        let params = default_params();

        let restricted = [skip_stop, skip_stop, skip_stop];
        let restricted_count = u32::try_from(restricted.len()).expect("len fits u32");
        let mut elevator: u64 = 0;
        let status = unsafe {
            ev_sim_add_elevator(
                handle,
                &raw const params,
                restricted.as_ptr(),
                restricted_count,
                line,
                0.0,
                &raw mut elevator,
            )
        };
        assert_eq!(status, EvStatus::Ok);
        assert_ne!(elevator, 0);
        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn add_elevator_null_args_rejected() {
        let handle = create_test_handle();
        let params = default_params();
        let mut elevator: u64 = 0;
        // Null params pointer.
        assert_eq!(
            unsafe {
                ev_sim_add_elevator(
                    handle,
                    std::ptr::null(),
                    std::ptr::null(),
                    0,
                    1,
                    0.0,
                    &raw mut elevator,
                )
            },
            EvStatus::NullArg,
        );
        // restricted_stops null with non-zero count.
        assert_eq!(
            unsafe {
                ev_sim_add_elevator(
                    handle,
                    &raw const params,
                    std::ptr::null(),
                    3,
                    1,
                    0.0,
                    &raw mut elevator,
                )
            },
            EvStatus::NullArg,
        );
        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn shortest_route_probe_then_fill() {
        let handle = create_test_handle();
        let (first_stop, last_stop) = stop_entities(handle);

        // Probe pass: zero capacity should report required slots.
        let mut needed: u32 = 0;
        let probe = unsafe {
            ev_sim_shortest_route(
                handle,
                first_stop,
                last_stop,
                std::ptr::null_mut(),
                0,
                &raw mut needed,
            )
        };
        // Either Ok (route empty / fits) or InvalidArg (route too big),
        // never NotFound for two stops on the same default-config line.
        assert_ne!(probe, EvStatus::NotFound);
        assert!(needed >= 2, "route should have >= 2 stops");

        // Round 2 with a real buffer.
        let mut buf: Vec<u64> = vec![0; needed as usize];
        let mut written: u32 = 0;
        assert_eq!(
            unsafe {
                ev_sim_shortest_route(
                    handle,
                    first_stop,
                    last_stop,
                    buf.as_mut_ptr(),
                    needed,
                    &raw mut written,
                )
            },
            EvStatus::Ok,
        );
        assert_eq!(written, needed);
        assert_eq!(buf[0], first_stop);
        assert_eq!(buf[buf.len() - 1], last_stop);
        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn shortest_route_unknown_stops_reports_not_found_or_invalid() {
        let handle = create_test_handle();
        // Sentinel `0` is invalid → InvalidArg.
        let mut written: u32 = 0;
        assert_eq!(
            unsafe {
                ev_sim_shortest_route(handle, 0, 0, std::ptr::null_mut(), 0, &raw mut written)
            },
            EvStatus::InvalidArg,
        );
        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn drained_events_use_v4_kinds() {
        let handle = create_test_handle();
        let (first_stop, last_stop) = stop_entities(handle);
        // Spawn a rider so we get RIDER_SPAWNED + later boarding events.
        let mut rider: u64 = 0;
        assert_eq!(
            unsafe { ev_sim_spawn_rider(handle, first_stop, last_stop, 75.0, &raw mut rider) },
            EvStatus::Ok,
        );
        // Drive some ticks; default config has elevators that pick this rider up.
        for _ in 0..100 {
            assert_eq!(unsafe { ev_sim_step(handle) }, EvStatus::Ok);
        }
        // Drain. We expect at least RIDER_SPAWNED and either an arrival or
        // a door event among the v4 kinds.
        let mut buf = vec![ev_event_skeleton(0, 0); 256];
        let mut written: u32 = 0;
        assert_eq!(
            unsafe { ev_sim_drain_events(handle, buf.as_mut_ptr(), 256, &raw mut written) },
            EvStatus::Ok,
        );
        let events = &buf[..written as usize];
        let saw_spawned = events
            .iter()
            .any(|e| e.kind == ev_event_kind::RIDER_SPAWNED);
        let saw_v4_kind = events
            .iter()
            .any(|e| e.kind >= 10 && e.kind != ev_event_kind::UNKNOWN);
        assert!(saw_spawned, "expected at least one RIDER_SPAWNED event");
        assert!(
            saw_v4_kind,
            "expected at least one v4 event kind (>= 10) in the drained stream"
        );
        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn metrics_accessor_returns_richer_view_than_frame_subset() {
        let handle = create_test_handle();
        for _ in 0..50 {
            assert_eq!(unsafe { ev_sim_step(handle) }, EvStatus::Ok);
        }
        let mut m = std::mem::MaybeUninit::<EvMetrics>::uninit();
        assert_eq!(
            unsafe { ev_sim_metrics(handle, m.as_mut_ptr()) },
            EvStatus::Ok,
        );
        let m = unsafe { m.assume_init() };
        assert!(m.total_distance >= 0.0);
        assert!(m.avg_wait_ticks.is_finite());
        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn metrics_for_unknown_tag_returns_not_found() {
        let handle = create_test_handle();
        let tag = CString::new("never-seen").unwrap();
        let mut out = std::mem::MaybeUninit::<EvTaggedMetric>::uninit();
        assert_eq!(
            unsafe { ev_sim_metrics_for_tag(handle, tag.as_ptr(), out.as_mut_ptr()) },
            EvStatus::NotFound,
        );
        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn elevators_in_phase_idle_after_setup() {
        let handle = create_test_handle();
        let mut count: u32 = 0;
        assert_eq!(
            unsafe { ev_sim_elevators_in_phase(handle, 0, &raw mut count) },
            EvStatus::Ok,
        );
        assert!(count >= 1);
        assert_eq!(
            unsafe { ev_sim_elevators_in_phase(handle, 99, &raw mut count) },
            EvStatus::InvalidArg,
        );
        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn eta_for_unreachable_pair_returns_invalid_arg() {
        let handle = create_test_handle();
        let mut ticks: u64 = 0;
        let status = unsafe { ev_sim_eta(handle, 0, 0, &raw mut ticks) };
        assert_eq!(status, EvStatus::InvalidArg);
        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn car_call_count_for_unknown_elevator_returns_zero() {
        let handle = create_test_handle();
        let count = unsafe { ev_sim_car_call_count(handle, 0) };
        assert_eq!(count, 0);
        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn all_tags_zero_capacity_probes_required_size() {
        let handle = create_test_handle();
        let mut written: u32 = 0;
        let mut scratch_used: u32 = 0;
        let probe = unsafe {
            ev_sim_all_tags(
                handle,
                std::ptr::null_mut(),
                0,
                std::ptr::null_mut(),
                0,
                &raw mut written,
                &raw mut scratch_used,
            )
        };
        if written == 0 {
            assert_eq!(probe, EvStatus::Ok);
            assert_eq!(scratch_used, 0);
        } else {
            assert_eq!(probe, EvStatus::InvalidArg);
            let mut slots: Vec<*mut c_char> = vec![std::ptr::null_mut(); written as usize];
            let mut scratch: Vec<u8> = vec![0; scratch_used as usize];
            let mut written2: u32 = 0;
            let mut scratch_used2: u32 = 0;
            assert_eq!(
                unsafe {
                    ev_sim_all_tags(
                        handle,
                        slots.as_mut_ptr(),
                        written,
                        scratch.as_mut_ptr().cast(),
                        scratch_used,
                        &raw mut written2,
                        &raw mut scratch_used2,
                    )
                },
                EvStatus::Ok,
            );
            assert_eq!(written2, written);
        }
        unsafe { ev_sim_destroy(handle) };
    }

    // ── Mode + manual control + door commands ───────────────────────────

    #[test]
    fn set_service_mode_round_trips_through_getter() {
        let handle = create_test_handle();
        let elev = first_elevator_entity(handle);

        // Default is Normal — verify before changing.
        let mut current = EvServiceMode::Normal;
        assert_eq!(
            unsafe { ev_sim_service_mode(handle, elev, &raw mut current) },
            EvStatus::Ok,
        );
        assert_eq!(current, EvServiceMode::Normal);

        // Switch to Manual and read back.
        assert_eq!(
            unsafe { ev_sim_set_service_mode(handle, elev, EvServiceMode::Manual) },
            EvStatus::Ok,
        );
        let mut after = EvServiceMode::Normal;
        assert_eq!(
            unsafe { ev_sim_service_mode(handle, elev, &raw mut after) },
            EvStatus::Ok,
        );
        assert_eq!(after, EvServiceMode::Manual);

        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn emergency_stop_returns_ok_on_valid_elevator() {
        // The original concern of this whole binding push: "is emergency
        // stop actually wired up?" — this test pins it.
        let handle = create_test_handle();
        let elev = first_elevator_entity(handle);
        // Switch to Manual first; emergency_stop only applies in Manual mode.
        assert_eq!(
            unsafe { ev_sim_set_service_mode(handle, elev, EvServiceMode::Manual) },
            EvStatus::Ok,
        );
        assert_eq!(unsafe { ev_sim_emergency_stop(handle, elev) }, EvStatus::Ok,);
        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn set_target_velocity_returns_ok_in_manual_mode() {
        let handle = create_test_handle();
        let elev = first_elevator_entity(handle);
        assert_eq!(
            unsafe { ev_sim_set_service_mode(handle, elev, EvServiceMode::Manual) },
            EvStatus::Ok,
        );
        assert_eq!(
            unsafe { ev_sim_set_target_velocity(handle, elev, 0.5) },
            EvStatus::Ok,
        );
        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn door_command_set_round_trips() {
        // open / close / hold / cancel-hold should each return Ok on a
        // valid elevator. A consumer driving a UI toolbar relies on these
        // and is the original Manual-mode use case.
        let handle = create_test_handle();
        let elev = first_elevator_entity(handle);
        assert_eq!(
            unsafe { ev_sim_set_service_mode(handle, elev, EvServiceMode::Manual) },
            EvStatus::Ok,
        );
        assert_eq!(unsafe { ev_sim_open_door(handle, elev) }, EvStatus::Ok);
        assert_eq!(unsafe { ev_sim_hold_door(handle, elev, 30) }, EvStatus::Ok);
        assert_eq!(
            unsafe { ev_sim_cancel_door_hold(handle, elev) },
            EvStatus::Ok,
        );
        assert_eq!(unsafe { ev_sim_close_door(handle, elev) }, EvStatus::Ok);
        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn abort_movement_returns_ok_on_idle_elevator() {
        // Aborting an idle elevator is a no-op but must not error;
        // games script aborts unconditionally on disable.
        let handle = create_test_handle();
        let elev = first_elevator_entity(handle);
        assert_eq!(unsafe { ev_sim_abort_movement(handle, elev) }, EvStatus::Ok,);
        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn recall_to_returns_ok_on_valid_pair() {
        let handle = create_test_handle();
        let elev = first_elevator_entity(handle);
        let (target, _) = stop_entities(handle);
        assert_eq!(
            unsafe { ev_sim_recall_to(handle, elev, target) },
            EvStatus::Ok,
        );
        unsafe { ev_sim_destroy(handle) };
    }

    // ── Pinning ─────────────────────────────────────────────────────────

    #[test]
    fn pin_then_unpin_assignment_round_trip() {
        let handle = create_test_handle();
        let elev = first_elevator_entity(handle);
        let (bottom, _) = stop_entities(handle);
        // pin_assignment requires an existing hall call — without one,
        // core returns HallCallNotFound (mapped to InvalidArg). Press an
        // up call at the bottom stop to seed it, then pin/unpin.
        assert_eq!(
            unsafe { ev_sim_press_hall_button(handle, bottom, 1) },
            EvStatus::Ok,
        );
        assert_eq!(
            unsafe { ev_sim_pin_assignment(handle, elev, bottom, 1) },
            EvStatus::Ok,
        );
        assert_eq!(
            unsafe { ev_sim_unpin_assignment(handle, bottom, 1) },
            EvStatus::Ok,
        );
        unsafe { ev_sim_destroy(handle) };
    }

    // ── Tagging + per-tag metrics round trip ────────────────────────────

    #[test]
    fn tag_entity_then_metrics_for_tag_returns_ok() {
        let handle = create_test_handle();
        let (origin, dest) = stop_entities(handle);

        let mut rider: u64 = 0;
        assert_eq!(
            unsafe { ev_sim_spawn_rider(handle, origin, dest, 75.0, &raw mut rider) },
            EvStatus::Ok,
        );

        let tag = CString::new("vip").unwrap();
        assert_eq!(
            unsafe { ev_sim_tag_entity(handle, rider, tag.as_ptr()) },
            EvStatus::Ok,
        );

        // Step a few times so the tagged rider's spawn is recorded in the
        // tag-metric accumulator.
        for _ in 0..20 {
            assert_eq!(unsafe { ev_sim_step(handle) }, EvStatus::Ok);
        }
        let mut out = std::mem::MaybeUninit::<EvTaggedMetric>::uninit();
        assert_eq!(
            unsafe { ev_sim_metrics_for_tag(handle, tag.as_ptr(), out.as_mut_ptr()) },
            EvStatus::Ok,
        );
        let m = unsafe { out.assume_init() };
        assert!(
            m.total_spawned >= 1,
            "tagged rider should be reflected in total_spawned (got {})",
            m.total_spawned
        );

        // untag is fire-and-forget; verify it returns Ok.
        assert_eq!(
            unsafe { ev_sim_untag_entity(handle, rider, tag.as_ptr()) },
            EvStatus::Ok,
        );
        unsafe { ev_sim_destroy(handle) };
    }

    // ── Route mutators ──────────────────────────────────────────────────

    #[test]
    fn set_rider_route_shortest_returns_ok_after_spawn() {
        let handle = create_test_handle();
        let (origin, dest) = stop_entities(handle);

        let mut rider: u64 = 0;
        assert_eq!(
            unsafe { ev_sim_spawn_rider(handle, origin, dest, 75.0, &raw mut rider) },
            EvStatus::Ok,
        );
        // Same destination is fine — we are exercising the API plumbing,
        // not the routing algorithm.
        assert_eq!(
            unsafe { ev_sim_set_rider_route_shortest(handle, rider, dest) },
            EvStatus::Ok,
        );
        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn reroute_rider_shortest_rejects_waiting_phase() {
        // reroute_rider requires Resident phase. A freshly-spawned rider
        // is in Waiting, so the call must fail with InvalidArg (the
        // wrong-phase error mapped through mode_error_status).
        let handle = create_test_handle();
        let (origin, dest) = stop_entities(handle);

        let mut rider: u64 = 0;
        assert_eq!(
            unsafe { ev_sim_spawn_rider(handle, origin, dest, 75.0, &raw mut rider) },
            EvStatus::Ok,
        );
        let status = unsafe { ev_sim_reroute_rider_shortest(handle, rider, origin) };
        assert_ne!(
            status,
            EvStatus::Ok,
            "reroute on Waiting rider should fail; got Ok",
        );
        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn set_rider_route_shortest_rejects_unknown_rider() {
        let handle = create_test_handle();
        let (_, dest) = stop_entities(handle);
        // Sentinel `0` is invalid → InvalidArg.
        let status = unsafe { ev_sim_set_rider_route_shortest(handle, 0, dest) };
        assert_eq!(status, EvStatus::InvalidArg);
        unsafe { ev_sim_destroy(handle) };
    }

    // ── Hall-calls snapshot probe-then-fill ─────────────────────────────

    #[test]
    fn hall_calls_snapshot_probe_then_fill() {
        let handle = create_test_handle();
        let (bottom, _) = stop_entities(handle);
        // Seed two calls so the probe count is meaningfully > 0.
        assert_eq!(
            unsafe { ev_sim_press_hall_button(handle, bottom, 1) },
            EvStatus::Ok,
        );
        // Press at a different stop in the opposite direction so the
        // (stop, direction) pair is distinct.
        let mut frame = EvFrame {
            elevators: std::ptr::null(),
            elevator_count: 0,
            stops: std::ptr::null(),
            stop_count: 0,
            riders: std::ptr::null(),
            rider_count: 0,
            metrics: EvMetricsView {
                total_delivered: 0,
                total_abandoned: 0,
                avg_wait_seconds: 0.0,
                avg_ride_seconds: 0.0,
                current_tick: 0,
            },
        };
        assert_eq!(
            unsafe { ev_sim_frame(handle, &raw mut frame) },
            EvStatus::Ok,
        );
        let stops = unsafe { std::slice::from_raw_parts(frame.stops, frame.stop_count) };
        let mid = stops[stops.len() / 2].entity_id;
        assert_eq!(
            unsafe { ev_sim_press_hall_button(handle, mid, -1) },
            EvStatus::Ok,
        );

        // Probe pass: zero capacity reports needed slots without writing.
        let mut needed: u32 = 0;
        let probe =
            unsafe { ev_sim_hall_calls_snapshot(handle, std::ptr::null_mut(), 0, &raw mut needed) };
        assert_eq!(probe, EvStatus::InvalidArg);
        assert_eq!(needed, 2, "two distinct hall calls were pressed");
        // The probe is the documented happy path — the last-error
        // slot must stay clear so a caller inspecting it after a
        // size query does not see a false "programmer mistake".
        assert!(
            ev_last_error().is_null(),
            "probe (capacity == 0) must not set last_error",
        );

        // An undersized but non-zero buffer is a real mistake — the
        // last-error string must surface so callers can diagnose.
        let mut small_written: u32 = 0;
        let mut small = [EvHallCall {
            stop_entity_id: 0,
            direction: 0,
            press_tick: 0,
            acknowledged_at: 0,
            assigned_car: 0,
            destination_entity_id: 0,
            pinned: 0,
            pending_rider_count: 0,
        }; 1];
        assert_eq!(
            unsafe {
                ev_sim_hall_calls_snapshot(handle, small.as_mut_ptr(), 1, &raw mut small_written)
            },
            EvStatus::InvalidArg,
        );
        assert_eq!(small_written, 2);
        assert!(
            !ev_last_error().is_null(),
            "undersized buffer (capacity > 0) must set last_error",
        );

        // Fill pass: adequate buffer reports same count and Ok.
        let mut buf = [EvHallCall {
            stop_entity_id: 0,
            direction: 0,
            press_tick: 0,
            acknowledged_at: 0,
            assigned_car: 0,
            destination_entity_id: 0,
            pinned: 0,
            pending_rider_count: 0,
        }; 4];
        let mut written: u32 = 0;
        let cap = u32::try_from(buf.len()).expect("buffer len fits u32");
        assert_eq!(
            unsafe { ev_sim_hall_calls_snapshot(handle, buf.as_mut_ptr(), cap, &raw mut written) },
            EvStatus::Ok,
        );
        assert_eq!(written, 2);
        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn drain_log_messages_surfaces_pending_records() {
        let handle = create_test_handle();
        let (origin, dest) = stop_entities(handle);

        let mut rider_id: u64 = 0;
        assert_eq!(
            unsafe { ev_sim_spawn_rider(handle, origin, dest, 80.0, &raw mut rider_id) },
            EvStatus::Ok,
        );
        // Activate lazy buffering before stepping — without this, the
        // forward path skips the queue push entirely (callback-only
        // consumers' pre-PR zero-buffering behaviour).
        let _ = unsafe { ev_pending_log_message_count(handle) };
        // Step enough to emit several lifecycle events, each forwarding
        // a log record.
        for _ in 0..200 {
            assert_eq!(unsafe { ev_sim_step(handle) }, EvStatus::Ok);
        }

        let count_before = unsafe { ev_pending_log_message_count(handle) };
        assert!(
            count_before > 0,
            "stepping with a spawned rider after polling activation should queue at least one log",
        );

        let mut buf = [EvLogMessage {
            level: 0,
            ts_ns: 0,
            msg_ptr: std::ptr::null(),
            msg_len: 0,
        }; 32];
        let mut written: u32 = 0;
        let cap = u32::try_from(buf.len()).expect("buffer len fits u32");
        assert_eq!(
            unsafe { ev_drain_log_messages(handle, buf.as_mut_ptr(), cap, &raw mut written) },
            EvStatus::Ok,
        );
        assert!(written > 0, "drain should surface at least one record");

        let first = buf[0];
        assert_eq!(first.level, 1, "forward path tags everything as debug");
        assert!(
            !first.msg_ptr.is_null(),
            "borrowed pointer must be non-null"
        );
        assert!(first.msg_len > 0, "borrowed slice must be non-empty");
        // Decode the borrowed UTF-8 slice and confirm it parses.
        let slice = unsafe { std::slice::from_raw_parts(first.msg_ptr, first.msg_len as usize) };
        let _ = std::str::from_utf8(slice).expect("forwarded record must be valid UTF-8");

        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn drain_log_messages_handles_overflow_across_calls() {
        let handle = create_test_handle();
        let (origin, dest) = stop_entities(handle);

        let mut rider_id: u64 = 0;
        assert_eq!(
            unsafe { ev_sim_spawn_rider(handle, origin, dest, 80.0, &raw mut rider_id) },
            EvStatus::Ok,
        );
        // Activate lazy buffering before stepping — see comment in
        // drain_log_messages_surfaces_pending_records.
        let _ = unsafe { ev_pending_log_message_count(handle) };
        for _ in 0..3000 {
            assert_eq!(unsafe { ev_sim_step(handle) }, EvStatus::Ok);
        }

        // Drain in two-record chunks. Loop must terminate (no
        // unbounded growth) and the running total should match the
        // original pending count.
        let total_before = unsafe { ev_pending_log_message_count(handle) };
        assert!(
            total_before > 2,
            "test needs >2 messages to exercise overflow"
        );

        let mut drained_total: u64 = 0;
        let mut buf = [EvLogMessage {
            level: 0,
            ts_ns: 0,
            msg_ptr: std::ptr::null(),
            msg_len: 0,
        }; 2];
        loop {
            let mut written: u32 = 0;
            assert_eq!(
                unsafe { ev_drain_log_messages(handle, buf.as_mut_ptr(), 2, &raw mut written) },
                EvStatus::Ok,
            );
            drained_total += u64::from(written);
            if written < 2 {
                break;
            }
        }
        assert_eq!(drained_total, u64::from(total_before));
        assert_eq!(unsafe { ev_pending_log_message_count(handle) }, 0);

        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn callback_only_consumer_pays_zero_buffering() {
        // Pre-PR behaviour: a consumer that uses ev_set_log_callback
        // and never touches the polling API has zero per-handle log
        // buffering. The lazy opt-in flag preserves that.
        let handle = create_test_handle();
        let (origin, dest) = stop_entities(handle);

        let mut rider_id: u64 = 0;
        assert_eq!(
            unsafe { ev_sim_spawn_rider(handle, origin, dest, 80.0, &raw mut rider_id) },
            EvStatus::Ok,
        );
        // Step a long horizon. No drain or count call — polling
        // remains inactive.
        for _ in 0..3000 {
            assert_eq!(unsafe { ev_sim_step(handle) }, EvStatus::Ok);
        }

        // Reach into the handle to verify nothing was buffered. We
        // can't call ev_pending_log_message_count here because that
        // call itself activates polling.
        // Safety: handle is valid for the duration of the test.
        let ev = unsafe { &*handle };
        assert_eq!(
            ev.pending_log_messages.len(),
            0,
            "callback-only consumer must not accumulate log records",
        );

        unsafe { ev_sim_destroy(handle) };
    }

    #[test]
    fn drain_log_messages_rejects_null_args() {
        let handle = create_test_handle();
        let mut written: u32 = 0;
        assert_eq!(
            unsafe {
                ev_drain_log_messages(
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                    0,
                    &raw mut written,
                )
            },
            EvStatus::NullArg,
        );
        let mut buf = [EvLogMessage {
            level: 0,
            ts_ns: 0,
            msg_ptr: std::ptr::null(),
            msg_len: 0,
        }; 1];
        assert_eq!(
            unsafe { ev_drain_log_messages(handle, buf.as_mut_ptr(), 1, std::ptr::null_mut()) },
            EvStatus::NullArg,
        );
        unsafe { ev_sim_destroy(handle) };
    }
}
