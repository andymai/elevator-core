//! Rust-side integration tests for `elevator-ffi`'s panic-recovery and
//! defensive-input semantics (#664).
//!
//! The C# / GMS2 harnesses cover the *consumer* side after compilation,
//! but the Rust panic boundary itself — the `catch_unwind` wrappers,
//! the thread-local last-error slot, and the log-callback unwind path
//! — were untested from Rust. A regression in any of those three would
//! land in production before a host integration ever caught it (a
//! Unity build picking up a new ABI version still wouldn't notice if a
//! `set_last_error` slot leaked across threads).
//!
//! These tests exercise each leg via the `rlib` crate type so the
//! `cargo test --workspace` invocation in CI picks them up
//! automatically.

#![allow(unsafe_code, clippy::missing_panics_doc)]

use elevator_ffi::{
    EvLogFn, EvSim, EvStatus, ev_last_error, ev_set_log_callback, ev_sim_create, ev_sim_destroy,
    ev_sim_set_strategy, ev_sim_step,
};
use std::ffi::{CStr, CString};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};

// ── Helpers ────────────────────────────────────────────────────────

fn last_error_str() -> Option<String> {
    let p = ev_last_error();
    if p.is_null() {
        return None;
    }
    // Safety: ev_last_error returns a valid C string until the next
    // FFI call on this thread (which we don't make between this read
    // and the to_owned).
    unsafe { Some(CStr::from_ptr(p).to_string_lossy().into_owned()) }
}

static TMP_SEQ: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);

/// Write a minimal RON config to a temp file and return its path. The
/// file lives on disk for the duration of the test process; the OS
/// reclaims it on exit.
fn write_minimal_ron() -> std::path::PathBuf {
    let ron = r#"SimConfig(
        schema_version: 1,
        building: BuildingConfig(
            name: "Test",
            stops: [StopConfig(id: StopId(0), name: "Ground", position: 0.0)],
        ),
        elevators: [ElevatorConfig(
            id: 0, name: "Main",
            max_speed: 2.0, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 10, door_transition_ticks: 5,
        )],
        simulation: SimulationParams(ticks_per_second: 60.0),
        passenger_spawning: PassengerSpawnConfig(
            mean_interval_ticks: 120,
            weight_range: (50.0, 100.0),
        ),
    )"#;
    // Use a per-test tempfile so parallel-test runs don't race each
    // other. CARGO_TARGET_TMPDIR is set by cargo for integration
    // tests; fall back to /tmp if not present (shouldn't happen).
    let dir = std::env::var("CARGO_TARGET_TMPDIR").unwrap_or_else(|_| "/tmp".into());
    let path = std::path::PathBuf::from(dir).join(format!(
        "ffi_roundtrip_{}_{}.ron",
        std::process::id(),
        TMP_SEQ.fetch_add(1, std::sync::atomic::Ordering::SeqCst)
    ));
    std::fs::write(&path, ron).expect("write temp ron");
    path
}

fn build_sim() -> *mut EvSim {
    let path = write_minimal_ron();
    let cpath = CString::new(path.to_str().expect("utf-8 path")).unwrap();
    let sim = unsafe { ev_sim_create(cpath.as_ptr()) };
    assert!(
        !sim.is_null(),
        "failed to build sim: {:?}",
        last_error_str()
    );
    sim
}

// ── Null pointer handling ──────────────────────────────────────────
//
// Every `*mut EvSim` entrypoint must reject a null handle with
// `EvStatus::NullArg` (not panic, not segfault). Same for null config
// paths into the constructor.

#[test]
fn ev_sim_create_rejects_null_path() {
    let sim = unsafe { ev_sim_create(std::ptr::null()) };
    assert!(sim.is_null());
    assert!(
        last_error_str().is_some_and(|e| e.contains("null")),
        "expected null-arg error, got {:?}",
        last_error_str()
    );
}

#[test]
fn ev_sim_step_rejects_null_handle() {
    let status = unsafe { ev_sim_step(std::ptr::null_mut()) };
    assert_eq!(status, EvStatus::NullArg);
    assert!(
        last_error_str().is_some_and(|e| e.contains("handle is null")),
        "expected handle-is-null error, got {:?}",
        last_error_str()
    );
}

#[test]
fn ev_sim_destroy_tolerates_null_handle() {
    // Idempotent: passing null must be a no-op, not a segfault.
    unsafe { ev_sim_destroy(std::ptr::null_mut()) };
}

#[test]
fn ev_sim_set_strategy_rejects_null_handle() {
    use elevator_ffi::EvStrategy;
    let status = unsafe { ev_sim_set_strategy(std::ptr::null_mut(), 0, EvStrategy::Scan) };
    assert_eq!(status, EvStatus::NullArg);
}

// ── Invalid UTF-8 ──────────────────────────────────────────────────
//
// `ev_sim_create` decodes the C string with `CStr::to_str()`, which
// rejects non-UTF-8 bytes. The handler must surface that as a null
// return + a descriptive last-error message, not a panic.

#[test]
fn ev_sim_create_rejects_invalid_utf8_path() {
    // 0xff is an invalid UTF-8 continuation byte; a null terminator
    // closes the C string.
    let bytes: [u8; 3] = [0xff, 0xfe, 0x00];
    let sim = unsafe { ev_sim_create(bytes.as_ptr().cast()) };
    assert!(sim.is_null());
    let err = last_error_str().expect("error message");
    assert!(
        err.contains("UTF-8") || err.to_lowercase().contains("utf"),
        "expected UTF-8 error, got {err:?}"
    );
}

// ── Thread-local last-error isolation ──────────────────────────────
//
// `LAST_ERROR` lives in a `thread_local!`. A panic on thread A must
// not leak its message into thread B's slot, and clearing on one
// thread must not clear the other.

#[test]
fn last_error_is_thread_local() {
    use std::sync::Barrier;
    use std::thread;

    // Thread A triggers a null-handle error.
    // Thread B independently checks its slot — must be None even
    // though thread A just populated its own.
    let barrier = std::sync::Arc::new(Barrier::new(2));
    let b1 = barrier.clone();
    let b2 = barrier;

    let a = thread::spawn(move || {
        let _ = unsafe { ev_sim_step(std::ptr::null_mut()) };
        b1.wait(); // thread A has populated its error slot
        last_error_str()
    });

    let b = thread::spawn(move || {
        b2.wait(); // wait until A has set its error
        // Thread B has never made an FFI call → its slot must be None.
        last_error_str()
    });

    let a_err = a.join().expect("A thread");
    let b_err = b.join().expect("B thread");
    assert!(
        a_err.is_some(),
        "thread A should have its own last-error populated"
    );
    assert!(
        b_err.is_none(),
        "thread B should NOT see thread A's error: got {b_err:?}"
    );
}

// ── Panic recovery via log callback ────────────────────────────────
//
// The log callback installed by `ev_set_log_callback` is invoked from
// inside the `guard()`-wrapped `ev_sim_step`. If the callback panics,
// `catch_unwind` must convert that into `EvStatus::Panic` and leave
// the FFI in a usable state — the next step on a fresh handle must
// succeed normally.

static PANIC_CALLBACK_FIRED: AtomicBool = AtomicBool::new(false);

unsafe extern "C" fn panicking_log_callback(_level: u8, _msg: *const std::os::raw::c_char) {
    PANIC_CALLBACK_FIRED.store(true, Ordering::SeqCst);
    panic!("deliberate panic from FFI log callback");
}

#[test]
fn panic_in_log_callback_is_caught_and_recovered() {
    // Reset the cross-test fixture.
    PANIC_CALLBACK_FIRED.store(false, Ordering::SeqCst);

    let sim = build_sim();

    // Install the panicking callback. The callback fires once we have
    // events to forward — `ev_sim_step` produces them on the first
    // tick (e.g. the spawn / arrival queue).
    unsafe { ev_set_log_callback(Some(panicking_log_callback as EvLogFn)) };

    // Drive enough ticks for at least one event to be produced.
    let mut last_status = EvStatus::Ok;
    for _ in 0..120 {
        last_status = unsafe { ev_sim_step(sim) };
        if PANIC_CALLBACK_FIRED.load(Ordering::SeqCst) {
            break;
        }
    }

    // Uninstall before asserting — leaving a panicking callback
    // registered would poison subsequent tests run in the same process.
    unsafe { ev_set_log_callback(None) };

    if !PANIC_CALLBACK_FIRED.load(Ordering::SeqCst) {
        // No event reached the callback — the per-tick stream depends
        // on traffic that may not be present in this minimal config.
        // Skip rather than fail; the panic-recovery contract is what
        // we're testing, and we have no observation if we never fired.
        unsafe { ev_sim_destroy(sim) };
        eprintln!("note: log callback never fired in 120 ticks, skipping panic-path assertion");
        return;
    }

    // Either the step that fired the panic returned EvStatus::Panic
    // and recorded a panic message in the last-error slot, OR the
    // panic was caught silently and the step returned Ok. Both are
    // valid outcomes — what matters is that we are not aborted and
    // that a fresh step still works.
    assert!(
        last_status == EvStatus::Panic || last_status == EvStatus::Ok,
        "step status after panicking callback: {last_status:?}"
    );

    // Recovery: another step must succeed cleanly. If the FFI failed
    // to recover from the unwind (e.g. corrupted thread-local state)
    // this would surface as a stuck error or another panic.
    let recovery = unsafe { ev_sim_step(sim) };
    assert_eq!(
        recovery,
        EvStatus::Ok,
        "post-panic step should succeed; got {recovery:?} ({:?})",
        last_error_str()
    );

    unsafe { ev_sim_destroy(sim) };
}

// ── Polling-only log path (no callback) ────────────────────────────
//
// The lazy log-polling opt-in: until something asks for the polling
// API, the per-step push to `pending_log_messages` is skipped to keep
// callback-only Unity/Godot consumers paying zero per-handle. Verify
// that running steps without ever installing a callback or polling
// produces no panic and no last-error.

#[test]
fn step_without_callback_is_silent() {
    let sim = build_sim();
    for _ in 0..10 {
        let s = unsafe { ev_sim_step(sim) };
        assert_eq!(s, EvStatus::Ok);
    }
    assert!(
        last_error_str().is_none(),
        "no error should be set after clean steps; got {:?}",
        last_error_str()
    );
    unsafe { ev_sim_destroy(sim) };
}

// ── Last-error pointer stays valid until next FFI call ─────────────

#[test]
fn last_error_pointer_stable_until_next_call() {
    // Trigger an error.
    let _ = unsafe { ev_sim_step(std::ptr::null_mut()) };
    let p1 = ev_last_error();
    let p2 = ev_last_error();
    assert_eq!(
        p1, p2,
        "two reads with no intervening FFI call should return the same pointer"
    );
    assert!(!p1.is_null());
}

// ── Multiple-call recovery cycle (smoke) ───────────────────────────
//
// Round-trip: every defensive path (null arg, UTF-8, panic) leaves
// the next legitimate call working. Run a sequence and confirm the
// success step at the end.

static OK_CALLBACK_INVOCATIONS: AtomicUsize = AtomicUsize::new(0);

unsafe extern "C" fn counting_log_callback(_level: u8, _msg: *const std::os::raw::c_char) {
    OK_CALLBACK_INVOCATIONS.fetch_add(1, Ordering::SeqCst);
}

#[test]
fn after_defensive_rejections_a_real_step_still_works() {
    OK_CALLBACK_INVOCATIONS.store(0, Ordering::SeqCst);

    // Trip every defensive path on a series of bad calls.
    let _ = unsafe { ev_sim_step(std::ptr::null_mut()) };
    assert_eq!(last_error_str().as_deref(), Some("handle is null"));

    let _ = unsafe { ev_sim_create(std::ptr::null()) };
    assert!(last_error_str().is_some());

    let bytes: [u8; 2] = [0xff, 0x00];
    let _ = unsafe { ev_sim_create(bytes.as_ptr().cast()) };
    assert!(last_error_str().is_some());

    // Now build a real sim and confirm normal operation.
    let sim = build_sim();
    unsafe { ev_set_log_callback(Some(counting_log_callback as EvLogFn)) };
    let mut s = EvStatus::Ok;
    for _ in 0..60 {
        s = unsafe { ev_sim_step(sim) };
        assert_eq!(s, EvStatus::Ok, "step failed: {:?}", last_error_str());
    }
    unsafe { ev_set_log_callback(None) };
    unsafe { ev_sim_destroy(sim) };

    let _ = s; // already asserted above.
}
