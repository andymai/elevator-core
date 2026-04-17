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
use elevator_core::dispatch::BuiltinStrategy;
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
        forward_pending_events(&ev.sim);
        EvStatus::Ok
    })
}

fn forward_pending_events(sim: &Simulation) {
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
                assigned_car: call.assigned_car.map_or(0, entity_to_u64),
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
}
