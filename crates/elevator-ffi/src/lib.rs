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
use elevator_core::entity::EntityId;
use elevator_core::ids::GroupId;
use elevator_core::sim::Simulation;
use slotmap::{Key, KeyData};

/// Current ABI version. Bumped for any breaking change to the C layout.
pub const EV_ABI_VERSION: u32 = 1;

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
        ev.frame.elevators.push(EvElevatorView {
            entity_id: entity_to_u64(eid),
            group_id: resolve_group(eid),
            line_id: entity_to_u64(elev.line()),
            phase: phase_tag,
            position: pos.value(),
            velocity,
            current_stop_id: current_stop,
            target_stop_id,
            occupancy: u32::try_from(elev.riders().len()).unwrap_or(u32::MAX),
            capacity_kg: elev.weight_capacity(),
            door_state: door_state_tag(elev.door()),
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::ffi::CString;

    #[test]
    fn abi_version_is_one() {
        assert_eq!(ev_abi_version(), 1);
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
        assert!(!handle.is_null(), "sim should build");

        // The core library doesn't auto-spawn riders from passenger_spawning;
        // seed some via the Rust API directly. Safety: handle just created.
        unsafe {
            let ev = &mut *handle;
            let first = ev.sim.stop_lookup_iter().next().map(|(s, _)| *s).unwrap();
            let last = ev
                .sim
                .stop_lookup_iter()
                .max_by_key(|(s, _)| s.0)
                .map(|(s, _)| *s)
                .unwrap();
            for _ in 0..20 {
                ev.sim.spawn_rider_by_stop_id(first, last, 75.0).unwrap();
            }
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
}
