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
//!   [`EvStatus::Panic`] (or null for constructors).

#![allow(unsafe_code)]

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
    BuiltinStrategy, EtdDispatch, LookDispatch, NearestCarDispatch, ScanDispatch,
};
use elevator_core::door::DoorState;
use elevator_core::entity::{ElevatorId, EntityId, RiderId};
use elevator_core::ids::GroupId;
use elevator_core::sim::Simulation;
use slotmap::{Key, KeyData};

/// Current ABI version. Bumped for any breaking change to the C layout.
pub const EV_ABI_VERSION: u32 = 2;

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
}

/// Log callback type. Severity follows syslog-style convention (0 = trace,
/// 1 = debug, 2 = info, 3 = warn, 4 = error).
pub type EvLogFn = unsafe extern "C" fn(level: u8, msg: *const c_char);

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

fn with_log_callback(f: impl FnOnce(EvLogFn)) {
    // Copy the function pointer out before releasing the guard so the user
    // callback can re-enter `ev_set_log_callback` (e.g. to deregister itself
    // after the first fire) without deadlocking on the same mutex.
    let maybe_cb = LOG_CALLBACK.lock().ok().and_then(|slot| *slot);
    if let Some(cb) = maybe_cb {
        f(cb);
    }
}

// ── Repr-C view structs ───────────────────────────────────────────────────

/// View of a single elevator at the current tick.
#[repr(C)]
#[derive(Debug, Clone, Copy)]
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
#[derive(Debug, Clone, Copy)]
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
#[derive(Debug, Clone, Copy)]
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
#[derive(Debug, Clone, Copy)]
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
#[derive(Debug, Clone, Copy)]
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

fn entity_to_u64(id: EntityId) -> u64 {
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
}

impl EvStrategy {
    const fn as_builtin(self) -> BuiltinStrategy {
        match self {
            Self::Scan => BuiltinStrategy::Scan,
            Self::Look => BuiltinStrategy::Look,
            Self::NearestCar => BuiltinStrategy::NearestCar,
            Self::Etd => BuiltinStrategy::Etd,
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
        forward_pending_events(&mut ev.sim);
        EvStatus::Ok
    })
}

fn forward_pending_events(sim: &mut Simulation) {
    with_log_callback(|cb| {
        for event in sim.pending_events() {
            let msg = format!("{event:?}");
            if let Ok(c) = CString::new(msg) {
                // Safety: ev_set_log_callback's contract covers pointer
                // validity for the duration of the callback installation.
                unsafe { cb(1, c.as_ptr()) };
            }
        }
    });
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
/// [`EvStatus::NotFound`] if no eligible elevator has `stop_entity_id`
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
        let builtin = strategy.as_builtin();
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

/// Step the simulation forward up to `max_ticks` ticks.
///
/// Stops early if the world becomes "quiet" (no in-flight riders, no
/// pending hall calls, all cars idle). Writes the actual tick count
/// to `*out_ticks_run` on both success and timeout.
///
/// Returns `EvStatus::Ok` if the world quieted within `max_ticks`,
/// `EvStatus::InvalidArg` if it failed to quiet (loop guard).
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
/// The caller supplies a buffer of `capacity` [`EvHallCall`] entries;
/// the actual number written is returned in `out_written`. If
/// `capacity` is smaller than the live count, the buffer is filled
/// and the remainder is dropped.
///
/// # Safety
///
/// `handle`, `out`, and `out_written` must be valid pointers. `out`
/// must point to a buffer of at least `capacity` `EvHallCall`s.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn ev_sim_hall_calls_snapshot(
    handle: *mut EvSim,
    out: *mut EvHallCall,
    capacity: u32,
    out_written: *mut u32,
) -> EvStatus {
    guard(EvStatus::Panic, || {
        clear_last_error();
        if handle.is_null() || out.is_null() || out_written.is_null() {
            set_last_error("null argument");
            return EvStatus::NullArg;
        }
        let ev = unsafe { &*handle };
        let mut written: u32 = 0;
        for call in ev.sim.hall_calls().take(capacity as usize) {
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

/// C-ABI-flat projection of a `HallCall` for FFI consumers.
#[repr(C)]
#[derive(Debug, Clone, Copy)]
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
#[derive(Debug, Clone, Copy)]
pub struct EvAssignment {
    /// Line entity id the car runs on.
    pub line_entity_id: u64,
    /// Car entity id assigned to this line's share of the call.
    pub car_entity_id: u64,
}

/// Discriminator for [`EvEvent::kind`]. Kept as explicit integer
/// constants so the C ABI is stable across Rust enum-layout changes.
pub mod ev_event_kind {
    /// `Event::HallButtonPressed`.
    pub const HALL_BUTTON_PRESSED: u8 = 1;
    /// `Event::HallCallAcknowledged`.
    pub const HALL_CALL_ACKNOWLEDGED: u8 = 2;
    /// `Event::HallCallCleared`.
    pub const HALL_CALL_CLEARED: u8 = 3;
    /// `Event::CarButtonPressed`.
    pub const CAR_BUTTON_PRESSED: u8 = 4;
    /// `Event::RiderSkipped`.
    pub const RIDER_SKIPPED: u8 = 5;
    /// `Event::RiderSpawned`.
    pub const RIDER_SPAWNED: u8 = 6;
    /// `Event::RiderBoarded`.
    pub const RIDER_BOARDED: u8 = 7;
    /// `Event::RiderExited`.
    pub const RIDER_EXITED: u8 = 8;
    /// `Event::RiderAbandoned`.
    pub const RIDER_ABANDONED: u8 = 9;
}

/// C-ABI-flat projection of the hall-call, car-call, skip, and rider
/// lifecycle events emitted by the simulation.
///
/// All entity-id fields use `0` to mean "not applicable for this
/// event kind" (real entity ids are never zero under the FFI
/// encoding). The `kind` discriminator picks which fields are
/// meaningful — see [`ev_event_kind`] for the kind constants and the
/// [`ev_sim_drain_events`] docs for the per-kind field map.
#[repr(C)]
#[derive(Debug, Clone, Copy)]
pub struct EvEvent {
    /// Event kind discriminator. Values outside [`ev_event_kind`] are
    /// reserved — ignore unknown kinds for forward compatibility.
    pub kind: u8,
    /// Direction for hall-call events: `1` = Up, `-1` = Down, `0` = N/A.
    pub direction: i8,
    /// Tick the event was emitted on.
    pub tick: u64,
    /// Stop entity id. Used by hall-call events, `RiderSkipped`,
    /// `RiderSpawned` (origin), `RiderExited`, `RiderAbandoned`.
    /// `0` when not applicable.
    pub stop: u64,
    /// Car/elevator entity id. Used by `HallCallCleared`,
    /// `CarButtonPressed`, `RiderSkipped`, `RiderBoarded`,
    /// `RiderExited`. `0` when not applicable.
    pub car: u64,
    /// Rider entity id. Used by `CarButtonPressed`, `RiderSkipped`,
    /// and all rider lifecycle events. `0` when not applicable.
    pub rider: u64,
    /// Destination stop entity id. Used by `CarButtonPressed` (the
    /// requested floor) and `RiderSpawned` (the rider's destination).
    /// `0` for all other kinds.
    pub floor: u64,
}

/// Drain pending events into `out`.
///
/// Delivers hall-call, car-call, skip, and rider lifecycle events.
/// Every event produced by the simulation is eventually delivered
/// exactly once, then removed from the internal queue. Call after
/// `ev_sim_step` each tick to catch new events.
///
/// Field meanings by [`EvEvent::kind`]:
/// - `HALL_BUTTON_PRESSED` / `HALL_CALL_ACKNOWLEDGED`: `stop`,
///   `direction`, `tick`.
/// - `HALL_CALL_CLEARED`: `stop`, `direction`, `car`, `tick`.
/// - `CAR_BUTTON_PRESSED`: `car`, `floor`, `rider` (or `0` for
///   synthetic presses), `tick`.
/// - `RIDER_SKIPPED`: `rider`, `car` (elevator), `stop`, `tick`.
/// - `RIDER_SPAWNED`: `rider`, `stop` (origin), `floor`
///   (destination), `tick`.
/// - `RIDER_BOARDED`: `rider`, `car` (elevator), `tick`.
/// - `RIDER_EXITED`: `rider`, `car` (elevator), `stop`, `tick`.
/// - `RIDER_ABANDONED`: `rider`, `stop`, `tick`.
///
/// Unused fields for each kind are zeroed so the caller can inspect
/// a uniform struct layout. Other event kinds in the sim (door
/// transitions, direction indicators, etc.) are not surfaced.
/// Future kinds extend the discriminator.
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
    if handle.is_null() {
        return 0;
    }
    // Safety: validity guaranteed by caller.
    let ev = unsafe { &mut *handle };
    refill_pending_events(ev);
    u32::try_from(ev.pending_events.len()).unwrap_or(u32::MAX)
}

/// Drain the sim's event queue into `ev.pending_events`, keeping
/// hall-call, skip, and rider lifecycle events. The buffer is FIFO
/// so order matches sim emission order across calls.
#[allow(clippy::too_many_lines)]
fn refill_pending_events(ev: &mut EvSim) {
    use elevator_core::events::Event;
    for event in ev.sim.drain_events() {
        let record = match event {
            Event::HallButtonPressed {
                stop,
                direction,
                tick,
            } => EvEvent {
                kind: ev_event_kind::HALL_BUTTON_PRESSED,
                direction: encode_direction(direction),
                tick,
                stop: entity_to_u64(stop),
                car: 0,
                rider: 0,
                floor: 0,
            },
            Event::HallCallAcknowledged {
                stop,
                direction,
                tick,
            } => EvEvent {
                kind: ev_event_kind::HALL_CALL_ACKNOWLEDGED,
                direction: encode_direction(direction),
                tick,
                stop: entity_to_u64(stop),
                car: 0,
                rider: 0,
                floor: 0,
            },
            Event::HallCallCleared {
                stop,
                direction,
                car,
                tick,
            } => EvEvent {
                kind: ev_event_kind::HALL_CALL_CLEARED,
                direction: encode_direction(direction),
                tick,
                stop: entity_to_u64(stop),
                car: entity_to_u64(car),
                rider: 0,
                floor: 0,
            },
            Event::CarButtonPressed {
                car,
                floor,
                rider,
                tick,
            } => EvEvent {
                kind: ev_event_kind::CAR_BUTTON_PRESSED,
                direction: 0,
                tick,
                stop: 0,
                car: entity_to_u64(car),
                rider: rider.map_or(0, entity_to_u64),
                floor: entity_to_u64(floor),
            },
            Event::RiderSkipped {
                rider,
                elevator,
                at_stop,
                tick,
            } => EvEvent {
                kind: ev_event_kind::RIDER_SKIPPED,
                direction: 0,
                tick,
                stop: entity_to_u64(at_stop),
                car: entity_to_u64(elevator),
                rider: entity_to_u64(rider),
                floor: 0,
            },
            Event::RiderSpawned {
                rider,
                origin,
                destination,
                tick,
            } => EvEvent {
                kind: ev_event_kind::RIDER_SPAWNED,
                direction: 0,
                tick,
                stop: entity_to_u64(origin),
                car: 0,
                rider: entity_to_u64(rider),
                floor: entity_to_u64(destination),
            },
            Event::RiderBoarded {
                rider,
                elevator,
                tick,
            } => EvEvent {
                kind: ev_event_kind::RIDER_BOARDED,
                direction: 0,
                tick,
                stop: 0,
                car: entity_to_u64(elevator),
                rider: entity_to_u64(rider),
                floor: 0,
            },
            Event::RiderExited {
                rider,
                elevator,
                stop,
                tick,
            } => EvEvent {
                kind: ev_event_kind::RIDER_EXITED,
                direction: 0,
                tick,
                stop: entity_to_u64(stop),
                car: entity_to_u64(elevator),
                rider: entity_to_u64(rider),
                floor: 0,
            },
            Event::RiderAbandoned { rider, stop, tick } => EvEvent {
                kind: ev_event_kind::RIDER_ABANDONED,
                direction: 0,
                tick,
                stop: entity_to_u64(stop),
                car: 0,
                rider: entity_to_u64(rider),
                floor: 0,
            },
            // Drop every other event kind — caller didn't opt in.
            _ => continue,
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
const fn encode_direction(dir: elevator_core::components::CallDirection) -> i8 {
    use elevator_core::components::CallDirection;
    match dir {
        CallDirection::Up => 1,
        CallDirection::Down => -1,
        _ => 0,
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
        let group_id = match strategy.as_builtin() {
            BuiltinStrategy::Scan => ev.sim.add_group(name_str, ScanDispatch::new()),
            BuiltinStrategy::Look => ev.sim.add_group(name_str, LookDispatch::new()),
            BuiltinStrategy::NearestCar => ev.sim.add_group(name_str, NearestCarDispatch::new()),
            BuiltinStrategy::Etd => ev.sim.add_group(name_str, EtdDispatch::new()),
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
        match ev.sim.reroute(RiderId::from(rider), dest) {
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
/// Writes the mode to `*out_mode`. Returns `Normal` for missing/disabled
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::ffi::CString;

    #[test]
    fn abi_version_is_two() {
        assert_eq!(ev_abi_version(), 2);
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
                tick: 0,
                stop: 0,
                car: 0,
                rider: 0,
                floor: 0,
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
            tick: 0,
            stop: 0,
            car: 0,
            rider: 0,
            floor: 0,
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
                tick: 0,
                stop: 0,
                car: 0,
                rider: 0,
                floor: 0,
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
                tick: 0,
                stop: 0,
                car: 0,
                rider: 0,
                floor: 0,
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
}
