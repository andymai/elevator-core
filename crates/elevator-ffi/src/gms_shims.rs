//! GameMaker Studio 2 calling-convention bridge.
//!
//! For every public `ev_*` function whose native signature uses an
//! integer / enum / `bool` / pointer in either the return position or
//! any argument position, this module exports a companion
//! `<name>_gms` symbol whose C ABI uses `f64` for those slots and
//! re-interprets the underlying bit pattern on each side of the call.
//!
//! ## Why this exists (issues #876 and #879)
//!
//! GameMaker's `external_define` / `external_call` is restricted to
//! two transport types: `ty_real` (an IEEE-754 double, passed via the
//! float registers `xmm0..xmm7` on x64 / `d0..d7` on AAPCS / arm64)
//! and `ty_string` (a UTF-8 `char *`, transported via the integer
//! registers). Every non-`char*` arg or return on the FFI surface —
//! `*mut EvSim`, `u32`, `EvStatus`, `bool`, `i8`, … — has to ride
//! `ty_real`, but Rust's `extern "C"` lowers each of those to its
//! native ABI slot (integer register `rax`/`x0` for returns,
//! `rdi…`/`x0…` for args).
//!
//! On x86_64 the SysV ABI happens to read integer-return values from
//! a general-purpose register whose location coincides with what
//! Windows GMS expects for `ty_real` reads — which is why x64 hosts
//! see correct values today even without any bridge. On macOS arm64
//! the integer and float register files are fully disjoint: returns
//! land in `x0` while GMS reads from `d0`, and (the #879 case) args
//! pushed by GMS land in `d0..d7` while the shim reads from `x0..x7`.
//! The result is zero / garbage in both directions for the entire
//! non-`double`, non-`char*` surface — i.e. ~all of it.
//!
//! The shims move the encoding out of the calling convention's
//! hands. Each `<name>_gms` declares `f64` for every non-native slot
//! (return and arg).
//!
//! On the **return side** the underlying integer / pointer / enum /
//! bool is bit-reinterpreted via `f64::from_bits(value as u64)`.
//! Hand-written GML decoders (`ev_decode_u64`, `ev_decode_status`,
//! `ev_decode_i8`) recover the original value on the caller side.
//!
//! On the **arg side** the inbound `f64` falls into one of two
//! encoding camps:
//!
//! - *Bit-packed*: pointer args and `u64` entity-ID / tag args. The
//!   caller obtained these from a previous `_gms` return (e.g.
//!   `ev_sim_create_gms`, `ev_sim_stop_entity_gms`), so the `double`
//!   GMS hands the shim has the value bit-pattern in its bits. The
//!   shim decodes via `f64::to_bits()` plus a cast back to the
//!   native type.
//! - *Numeric*: every other integer width (`u8` / `u16` / `u32` /
//!   `i8` / `i16` / `i32` / `i64`) and every fieldless `#[repr(C)]`
//!   enum (`EvStrategy`, `EvReposition`, `EvServiceMode`). These are
//!   user-typed literals on the GML side (`var dir = -1;`,
//!   `var strat = EvStrategy_Look;`) and arrive as plain IEEE-754
//!   doubles whose VALUE encodes the integer. The shim decodes via
//!   the numeric `as` cast (and for enums, `(value as i32) →
//!   transmute`).
//!
//! `f64` args and `*const c_char` args (the only `ty_string` shape
//! GMS supports) stay native: GMS already uses the float register for
//! the former and the integer register for the latter, matching the
//! Rust ABI exactly. The macro special-cases both spellings.
//!
//! ### Known asymmetry
//!
//! Two `u64` args on the FFI surface are user-typed tick counts
//! (`max_ticks` on `ev_sim_run_until_quiet`, `retention_ticks` on
//! `ev_sim_set_arrival_log_retention_ticks`), not entity IDs. They
//! sit in the bit-packed camp by virtue of being `u64`, so a GML
//! caller passing a literal `var max_ticks = 600;` will see the
//! shim decode `600.0_f64.to_bits()` ≈ `4.6e18` and reject the call
//! as out-of-range. Callers wanting to set those need to pre-encode
//! the numeric value (e.g., via a `buffer_poke(buffer_f64) →
//! buffer_peek(buffer_u64)` roundtrip), or use a future
//! `ev_encode_u64` GML helper. Not in scope for the #879 ABI fix.
//!
//! ## What this does **not** affect
//!
//! Non-GMS consumers (Unity / C# / Godot / the C harness's direct
//! calls) keep calling the original symbols. The shim symbols are
//! purely additive — no ABI bump required, and the GMS-side
//! `external_define` arg-counts in
//! `examples/gms2-extension/extension/elevator_ffi/elevator_ffi_generated.gml`
//! don't change because GMS was always going to send `ty_real` for
//! every non-string arg anyway.

#![allow(missing_docs)]
// Proper names (GameMaker, AArch64, AAPCS) in the module-level docs
// shouldn't need backticks — they're product/ABI names, not Rust idents.
#![allow(clippy::doc_markdown)]
#![allow(clippy::missing_safety_doc)]
#![allow(clippy::cast_possible_wrap)]
#![allow(clippy::cast_lossless)]
#![allow(clippy::cast_sign_loss)]
#![allow(clippy::ptr_as_ptr)]
// `bits as usize` for pointer decode targets a 64-bit host
// exclusively — `examples/gms2-harness/main.c` asserts
// `sizeof(void*) == 8` and the FFI README documents the same. The
// truncation warning fires once per pointer-arg expansion (most of
// the ~131 shims) so an allow at module scope is the only sane fix.
#![allow(clippy::cast_possible_truncation)]
// `i64 as f64` in the numeric-decode tests encodes user-typed tick
// counts the way GML stores them. The clippy::cast_precision_loss
// lint fires above 2^53, which is far outside the test values; the
// alternative `f64::from(i64)` doesn't exist on stable.
#![allow(clippy::cast_precision_loss)]
// `use crate::*;` is intentional — every shim references a different
// item from the parent module, so an explicit import list would be
// ~130 names long for no expressive gain.
#![allow(clippy::wildcard_imports)]
// `ev_abi_version_gms` is the only shim whose underlying fn is
// `const`, but the macro emits one shape for every safe arm. Letting
// clippy pin the lint there forces a per-call-site annotation; the
// blanket allow keeps the macro uniform.
#![allow(clippy::missing_const_for_fn)]

use crate::*;
use std::ffi::c_char;

/// Maps a captured FFI argument type to the C ABI slot the GMS shim
/// declares for it.
///
/// Native `ty_string` args (`*const c_char` — the only string shape
/// GMS supports) and native `ty_real` args (`f64`) stay on their own
/// ABI register file. Every other captured type — pointers,
/// integers, fieldless enums, `bool` — is declared as `f64` so the
/// value rides the float register file the way GMS pushes it.
///
/// Used inside `gms_shim!` only. Lives at module scope because Rust
/// macro_rules cannot nest definitions.
macro_rules! gms_arg_ty {
    (f64) => { f64 };
    (*const c_char) => { *const c_char };
    ($($_t:tt)+) => { f64 };
}

/// Decodes one inbound shim arg back to its native FFI type.
///
/// Inbound values fall into two encoding camps based on their
/// provenance on the GML side:
///
/// 1. **Bit-packed**: pointers and `u64` entity IDs / tags. These
///    originate from a previous `_gms` return, where the value was
///    encoded as `f64::from_bits(value as u64)` to escape the
///    integer-return-register ABI mismatch (#876). GMS stores the
///    encoded `double` verbatim and passes it back unchanged, so the
///    shim recovers the original value via `f64::to_bits()` and
///    casts (pointers go through `usize`).
///
/// 2. **Numeric**: every other integer (`u8` / `u16` / `u32` / `i8`
///    / `i16` / `i32` / `i64`) and every fieldless `#[repr(C)]` enum
///    (`EvStrategy`, `EvReposition`, `EvServiceMode`). These are
///    user-typed literals in GML (`var capacity = 16; var
///    direction = -1; var strategy = EvStrategy_Look;`) and arrive
///    as plain IEEE-754 doubles whose VALUE encodes the integer,
///    not whose BIT PATTERN does. `16.0_f64.to_bits() as u32` is
///    `0`, but `16.0_f64 as u32` is `16`. Decode via the numeric
///    `as` cast for primitives, and via `(value as i32) → transmute`
///    for unit-only enums (stable Rust forbids `int as Enum` even
///    for fieldless enums, so the discriminant must launder through
///    `transmute`).
///
/// The `u64` arm sits in the bit-packed camp because the
/// overwhelming majority of `u64` args on this FFI surface are
/// entity IDs / tags shuttled across `_gms` calls. The two
/// exceptions are tick counts (`max_ticks` on
/// `ev_sim_run_until_quiet`, `retention_ticks` on
/// `ev_sim_set_arrival_log_retention_ticks`); callers wanting to
/// pass a user-typed numeric for those must bit-pack the value
/// first (e.g., via a GML-side `ev_encode_u64` helper) or read it
/// off an `*mut u64` out-pointer where the buffer-peek path
/// naturally gives a bit-packed-equivalent double. Tracked as a
/// follow-up; not part of #879's ABI fix.
///
/// `bool` reads the low byte via a non-zero check, which works for
/// both encodings (GMS sends `true/false` as `1.0`/`0.0`, and
/// `1.0_f64 != 0.0` matches `1.0_f64.to_bits() != 0`).
///
/// Arm order is significant — literal arms (`f64`, `*const c_char`,
/// the primitives) must precede the generic pointer / catch-all arms
/// so they win the match.
macro_rules! gms_arg_decode {
    ($v:ident, f64) => { $v };
    ($v:ident, *const c_char) => { $v };
    ($v:ident, bool) => { $v != 0.0 };
    ($v:ident, *mut $($t:tt)+) => { ($v.to_bits() as usize) as *mut $($t)+ };
    ($v:ident, *const $($t:tt)+) => { ($v.to_bits() as usize) as *const $($t)+ };
    ($v:ident, u64) => { $v.to_bits() };
    ($v:ident, u8) => { $v as u8 };
    ($v:ident, u16) => { $v as u16 };
    ($v:ident, u32) => { $v as u32 };
    ($v:ident, i8) => { $v as i8 };
    ($v:ident, i16) => { $v as i16 };
    ($v:ident, i32) => { $v as i32 };
    ($v:ident, i64) => { $v as i64 };
    ($v:ident, $t:ident) => {
        unsafe { core::mem::transmute::<i32, $t>($v as i32) }
    };
}

/// Defines a `<shim>` companion that forwards args to `<orig>`,
/// bridging both the argument and return sides between GMS's
/// `ty_real`-only register file and the native FFI ABI.
///
/// Both the shim and original identifier are passed in so the macro
/// works under the stable rules in Rust 1.88 (the `${concat(...)}`
/// metavar expression is still unstable as of 1.95). Each call site
/// pays for one repeated identifier; the suffix is always `_gms`.
///
/// Variants:
/// - `gms_shim!(unsafe <shim> = <orig>(args) -> Ret)` — for `unsafe extern "C"` originals
/// - `gms_shim!(<shim> = <orig>(args) -> Ret)` — for safe `extern "C"` originals
///   (rare; currently only `ev_abi_version`)
/// - `gms_shim!(i8 unsafe <shim> = <orig>(args))` — for `i8` returns; the result
///   is zero-extended through `u8` first so the bit pattern stays in the low
///   byte rather than sign-extending across the full mantissa
///
/// Each arg's type is wrapped in `[...]` at the call site so the
/// macro engine has unambiguous delimiters for token-tree capture.
/// Without the brackets, `$($argty:tt)+` greedy-matches across the
/// `,` separators and the engine reports local ambiguity. Inside
/// each bracket group the type is captured as a `tt` repetition so
/// the inner `gms_arg_ty!` / `gms_arg_decode!` helpers can
/// pattern-match on the underlying tokens — `:ty` fragments would
/// become opaque NTs and break the nested dispatch.
macro_rules! gms_shim {
    (unsafe $shim:ident = $orig:ident ( $($arg:ident: [$($argty:tt)+]),* $(,)? ) -> $ret:ty) => {
        #[unsafe(no_mangle)]
        pub unsafe extern "C" fn $shim($($arg: gms_arg_ty!($($argty)+)),*) -> f64 {
            $(let $arg: $($argty)+ = gms_arg_decode!($arg, $($argty)+);)*
            let v: $ret = unsafe { $orig($($arg),*) };
            f64::from_bits(v as u64)
        }
    };
    ($shim:ident = $orig:ident ( $($arg:ident: [$($argty:tt)+]),* $(,)? ) -> $ret:ty) => {
        #[unsafe(no_mangle)]
        pub extern "C" fn $shim($($arg: gms_arg_ty!($($argty)+)),*) -> f64 {
            $(let $arg: $($argty)+ = gms_arg_decode!($arg, $($argty)+);)*
            let v: $ret = $orig($($arg),*);
            f64::from_bits(v as u64)
        }
    };
    (i8 unsafe $shim:ident = $orig:ident ( $($arg:ident: [$($argty:tt)+]),* $(,)? )) => {
        #[unsafe(no_mangle)]
        pub unsafe extern "C" fn $shim($($arg: gms_arg_ty!($($argty)+)),*) -> f64 {
            $(let $arg: $($argty)+ = gms_arg_decode!($arg, $($argty)+);)*
            let v: i8 = unsafe { $orig($($arg),*) };
            f64::from_bits(u64::from(v as u8))
        }
    };
}

// ── Generated shim invocations ────────────────────────────────────────────
//
// One per non-`double`/non-`void`/non-`char*`-returning `pub extern "C"`
// function. Sorted alphabetically to match the deterministic order
// of `scripts/gen-gms-bindings.py` so diffs stay tight when the FFI
// surface evolves. When adding or renaming an FFI function, add or
// rename the matching `gms_shim!()` line here.

gms_shim!(ev_abi_version_gms = ev_abi_version() -> u32);
gms_shim!(unsafe ev_drain_log_messages_gms = ev_drain_log_messages(handle: [*mut EvSim], out: [*mut EvLogMessage], capacity: [u32], out_written: [*mut u32]) -> EvStatus);
gms_shim!(unsafe ev_pending_log_message_count_gms = ev_pending_log_message_count(handle: [*mut EvSim]) -> u32);
gms_shim!(unsafe ev_sim_abandoned_at_gms = ev_sim_abandoned_at(handle: [*mut EvSim], stop_entity_id: [u64], out: [*mut u64], capacity: [u32], out_written: [*mut u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_abandoned_count_at_gms = ev_sim_abandoned_count_at(handle: [*mut EvSim], stop_entity_id: [u64]) -> u32);
gms_shim!(unsafe ev_sim_abort_movement_gms = ev_sim_abort_movement(handle: [*mut EvSim], elevator_entity_id: [u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_add_elevator_gms = ev_sim_add_elevator(handle: [*mut EvSim], params: [*const EvElevatorParams], restricted_stops: [*const u64], restricted_stops_count: [u32], line_entity_id: [u64], starting_position: [f64], out_elevator_entity_id: [*mut u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_add_group_gms = ev_sim_add_group(handle: [*mut EvSim], name: [*const c_char], strategy: [EvStrategy], out_group_id: [*mut u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_add_line_gms = ev_sim_add_line(handle: [*mut EvSim], group_id: [u32], name: [*const c_char], min_position: [f64], max_position: [f64], max_cars: [u32], out_line_entity_id: [*mut u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_add_stop_gms = ev_sim_add_stop(handle: [*mut EvSim], line_entity_id: [u64], name: [*const c_char], position: [f64], out_stop_entity_id: [*mut u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_add_stop_to_line_gms = ev_sim_add_stop_to_line(handle: [*mut EvSim], stop_entity_id: [u64], line_entity_id: [u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_all_lines_gms = ev_sim_all_lines(handle: [*mut EvSim], out: [*mut u64], capacity: [u32], out_written: [*mut u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_all_tags_gms = ev_sim_all_tags(handle: [*mut EvSim], out: [*mut *mut c_char], capacity: [u32], scratch: [*mut c_char], scratch_capacity: [u32], out_written: [*mut u32], out_scratch_used: [*mut u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_assign_line_to_group_gms = ev_sim_assign_line_to_group(handle: [*mut EvSim], line_entity_id: [u64], new_group: [u32], out_old_group: [*mut u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_assigned_car_gms = ev_sim_assigned_car(handle: [*mut EvSim], stop_entity_id: [u64], direction: [i8], out_elevator: [*mut u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_assigned_cars_by_line_gms = ev_sim_assigned_cars_by_line(handle: [*mut EvSim], stop_entity_id: [u64], direction: [i8], out: [*mut EvAssignment], capacity: [u32], out_written: [*mut u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_best_eta_gms = ev_sim_best_eta(handle: [*mut EvSim], stop_entity_id: [u64], direction: [i8], out_elevator: [*mut u64], out_seconds: [*mut f64]) -> EvStatus);
gms_shim!(unsafe ev_sim_cancel_door_hold_gms = ev_sim_cancel_door_hold(handle: [*mut EvSim], elevator_entity_id: [u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_car_call_count_gms = ev_sim_car_call_count(handle: [*mut EvSim], elevator_entity_id: [u64]) -> u32);
gms_shim!(unsafe ev_sim_car_call_pending_riders_gms = ev_sim_car_call_pending_riders(handle: [*mut EvSim], elevator_entity_id: [u64], index: [u32], out: [*mut u64], capacity: [u32], out_written: [*mut u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_car_calls_snapshot_gms = ev_sim_car_calls_snapshot(handle: [*mut EvSim], elevator_entity_id: [u64], out: [*mut EvCarCall], capacity: [u32], out_written: [*mut u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_clear_destinations_gms = ev_sim_clear_destinations(handle: [*mut EvSim], elevator_entity_id: [u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_clear_elevator_home_stop_gms = ev_sim_clear_elevator_home_stop(handle: [*mut EvSim], elevator_entity_id: [u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_close_door_gms = ev_sim_close_door(handle: [*mut EvSim], elevator_entity_id: [u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_create_gms = ev_sim_create(config_path: [*const c_char]) -> *mut EvSim);
gms_shim!(unsafe ev_sim_current_tick_gms = ev_sim_current_tick(handle: [*mut EvSim]) -> u64);
gms_shim!(unsafe ev_sim_default_elevator_params_gms = ev_sim_default_elevator_params(out_params: [*mut EvElevatorParams]) -> EvStatus);
gms_shim!(unsafe ev_sim_despawn_rider_gms = ev_sim_despawn_rider(handle: [*mut EvSim], rider_entity_id: [u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_destination_queue_gms = ev_sim_destination_queue(handle: [*mut EvSim], elevator_entity_id: [u64], out: [*mut u64], capacity: [u32], out_written: [*mut u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_disable_gms = ev_sim_disable(handle: [*mut EvSim], entity_id: [u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_drain_events_gms = ev_sim_drain_events(handle: [*mut EvSim], out: [*mut EvEvent], capacity: [u32], out_written: [*mut u32]) -> EvStatus);
gms_shim!(i8 unsafe ev_sim_elevator_direction_gms = ev_sim_elevator_direction(handle: [*mut EvSim], elevator_entity_id: [u64]));
gms_shim!(unsafe ev_sim_elevator_entity_gms = ev_sim_elevator_entity(handle: [*mut EvSim], elevator_config_id: [u32]) -> u64);
gms_shim!(unsafe ev_sim_elevator_going_down_gms = ev_sim_elevator_going_down(handle: [*mut EvSim], elevator_entity_id: [u64]) -> bool);
gms_shim!(unsafe ev_sim_elevator_going_up_gms = ev_sim_elevator_going_up(handle: [*mut EvSim], elevator_entity_id: [u64]) -> bool);
gms_shim!(unsafe ev_sim_elevator_home_stop_gms = ev_sim_elevator_home_stop(handle: [*mut EvSim], elevator_entity_id: [u64], out_stop_id: [*mut u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_elevator_lookup_iter_gms = ev_sim_elevator_lookup_iter(handle: [*mut EvSim], out: [*mut u64], capacity: [u32], out_written: [*mut u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_elevator_move_count_gms = ev_sim_elevator_move_count(handle: [*mut EvSim], elevator_entity_id: [u64]) -> u64);
gms_shim!(unsafe ev_sim_elevators_in_phase_gms = ev_sim_elevators_in_phase(handle: [*mut EvSim], phase: [u8], out_count: [*mut u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_elevators_on_line_gms = ev_sim_elevators_on_line(handle: [*mut EvSim], line_entity_id: [u64], out: [*mut u64], capacity: [u32], out_written: [*mut u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_emergency_stop_gms = ev_sim_emergency_stop(handle: [*mut EvSim], elevator_entity_id: [u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_enable_gms = ev_sim_enable(handle: [*mut EvSim], entity_id: [u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_eta_gms = ev_sim_eta(handle: [*mut EvSim], elevator_entity_id: [u64], stop_entity_id: [u64], out_ticks: [*mut u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_eta_for_call_gms = ev_sim_eta_for_call(handle: [*mut EvSim], stop_entity_id: [u64], direction: [i8], out_ticks: [*mut u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_find_stop_at_position_on_line_gms = ev_sim_find_stop_at_position_on_line(handle: [*mut EvSim], position: [f64], line_entity_id: [u64]) -> u64);
gms_shim!(unsafe ev_sim_frame_gms = ev_sim_frame(handle: [*mut EvSim], out: [*mut EvFrame]) -> EvStatus);
gms_shim!(unsafe ev_sim_groups_serving_stop_gms = ev_sim_groups_serving_stop(handle: [*mut EvSim], stop_entity_id: [u64], out: [*mut u32], capacity: [u32], out_written: [*mut u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_hall_call_count_gms = ev_sim_hall_call_count(handle: [*mut EvSim]) -> u32);
gms_shim!(unsafe ev_sim_hall_calls_snapshot_gms = ev_sim_hall_calls_snapshot(handle: [*mut EvSim], out: [*mut EvHallCall], capacity: [u32], out_written: [*mut u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_hold_door_gms = ev_sim_hold_door(handle: [*mut EvSim], elevator_entity_id: [u64], ticks: [u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_idle_elevator_count_gms = ev_sim_idle_elevator_count(handle: [*mut EvSim]) -> u32);
gms_shim!(unsafe ev_sim_is_disabled_gms = ev_sim_is_disabled(handle: [*mut EvSim], entity_id: [u64]) -> bool);
gms_shim!(unsafe ev_sim_is_elevator_gms = ev_sim_is_elevator(handle: [*mut EvSim], entity_id: [u64]) -> bool);
#[cfg(feature = "loop_lines")]
gms_shim!(unsafe ev_sim_is_loop_gms = ev_sim_is_loop(handle: [*mut EvSim], line_entity_id: [u64]) -> u8);
gms_shim!(unsafe ev_sim_is_rider_gms = ev_sim_is_rider(handle: [*mut EvSim], entity_id: [u64]) -> bool);
gms_shim!(unsafe ev_sim_is_stop_gms = ev_sim_is_stop(handle: [*mut EvSim], entity_id: [u64]) -> bool);
gms_shim!(unsafe ev_sim_iter_repositioning_elevators_gms = ev_sim_iter_repositioning_elevators(handle: [*mut EvSim], out: [*mut u64], capacity: [u32], out_written: [*mut u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_line_count_gms = ev_sim_line_count(handle: [*mut EvSim]) -> u32);
gms_shim!(unsafe ev_sim_line_entity_gms = ev_sim_line_entity(handle: [*mut EvSim], line_config_id: [u32]) -> u64);
gms_shim!(unsafe ev_sim_line_for_elevator_gms = ev_sim_line_for_elevator(handle: [*mut EvSim], elevator_entity_id: [u64]) -> u64);
gms_shim!(unsafe ev_sim_line_lookup_iter_gms = ev_sim_line_lookup_iter(handle: [*mut EvSim], out: [*mut u64], capacity: [u32], out_written: [*mut u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_lines_in_group_gms = ev_sim_lines_in_group(handle: [*mut EvSim], group_id: [u32], out: [*mut u64], capacity: [u32], out_written: [*mut u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_lines_serving_stop_gms = ev_sim_lines_serving_stop(handle: [*mut EvSim], stop_entity_id: [u64], out: [*mut u64], capacity: [u32], out_written: [*mut u32]) -> EvStatus);
#[cfg(feature = "loop_lines")]
gms_shim!(unsafe ev_sim_loop_circumference_gms = ev_sim_loop_circumference(handle: [*mut EvSim], line_entity_id: [u64], out_circumference: [*mut f64]) -> EvStatus);
#[cfg(feature = "loop_lines")]
gms_shim!(unsafe ev_sim_loop_forward_gap_gms = ev_sim_loop_forward_gap(handle: [*mut EvSim], elevator_entity_id: [u64], out_gap: [*mut f64]) -> EvStatus);
#[cfg(feature = "loop_lines")]
gms_shim!(unsafe ev_sim_loop_leader_gms = ev_sim_loop_leader(handle: [*mut EvSim], elevator_entity_id: [u64], out_leader: [*mut u64]) -> EvStatus);
#[cfg(feature = "loop_lines")]
gms_shim!(unsafe ev_sim_loop_next_stop_gms = ev_sim_loop_next_stop(handle: [*mut EvSim], line_entity_id: [u64], position: [f64], out_stop: [*mut u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_metrics_gms = ev_sim_metrics(handle: [*mut EvSim], out_metrics: [*mut EvMetrics]) -> EvStatus);
gms_shim!(unsafe ev_sim_metrics_for_tag_gms = ev_sim_metrics_for_tag(handle: [*mut EvSim], tag: [*const c_char], out_metric: [*mut EvTaggedMetric]) -> EvStatus);
gms_shim!(unsafe ev_sim_occupancy_gms = ev_sim_occupancy(handle: [*mut EvSim], elevator_entity_id: [u64]) -> u32);
gms_shim!(unsafe ev_sim_open_door_gms = ev_sim_open_door(handle: [*mut EvSim], elevator_entity_id: [u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_pending_event_count_gms = ev_sim_pending_event_count(handle: [*mut EvSim]) -> u32);
gms_shim!(unsafe ev_sim_pin_assignment_gms = ev_sim_pin_assignment(handle: [*mut EvSim], car_entity_id: [u64], stop_entity_id: [u64], direction: [i8]) -> EvStatus);
gms_shim!(unsafe ev_sim_press_car_button_gms = ev_sim_press_car_button(handle: [*mut EvSim], car_entity_id: [u64], floor_entity_id: [u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_press_hall_button_gms = ev_sim_press_hall_button(handle: [*mut EvSim], stop_entity_id: [u64], direction: [i8]) -> EvStatus);
gms_shim!(unsafe ev_sim_push_destination_gms = ev_sim_push_destination(handle: [*mut EvSim], elevator_entity_id: [u64], stop_entity_id: [u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_push_destination_front_gms = ev_sim_push_destination_front(handle: [*mut EvSim], elevator_entity_id: [u64], stop_entity_id: [u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_reachable_stops_from_gms = ev_sim_reachable_stops_from(handle: [*mut EvSim], from_stop_entity_id: [u64], out: [*mut u64], capacity: [u32], out_written: [*mut u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_reassign_elevator_to_line_gms = ev_sim_reassign_elevator_to_line(handle: [*mut EvSim], elevator_entity_id: [u64], new_line_entity_id: [u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_recall_to_gms = ev_sim_recall_to(handle: [*mut EvSim], elevator_entity_id: [u64], stop_entity_id: [u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_remove_elevator_gms = ev_sim_remove_elevator(handle: [*mut EvSim], elevator_entity_id: [u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_remove_line_gms = ev_sim_remove_line(handle: [*mut EvSim], line_entity_id: [u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_remove_reposition_gms = ev_sim_remove_reposition(handle: [*mut EvSim], group_id: [u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_remove_stop_gms = ev_sim_remove_stop(handle: [*mut EvSim], stop_entity_id: [u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_remove_stop_from_line_gms = ev_sim_remove_stop_from_line(handle: [*mut EvSim], stop_entity_id: [u64], line_entity_id: [u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_reposition_id_gms = ev_sim_reposition_id(handle: [*mut EvSim], group_id: [u32], out_strategy: [*mut EvReposition]) -> EvStatus);
gms_shim!(unsafe ev_sim_reroute_gms = ev_sim_reroute(handle: [*mut EvSim], rider_entity_id: [u64], new_destination_entity_id: [u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_reroute_rider_direct_gms = ev_sim_reroute_rider_direct(handle: [*mut EvSim], rider_entity_id: [u64], from_stop_entity_id: [u64], to_stop_entity_id: [u64], group_id: [u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_reroute_rider_shortest_gms = ev_sim_reroute_rider_shortest(handle: [*mut EvSim], rider_entity_id: [u64], to_stop_entity_id: [u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_resident_count_at_gms = ev_sim_resident_count_at(handle: [*mut EvSim], stop_entity_id: [u64]) -> u32);
gms_shim!(unsafe ev_sim_residents_at_gms = ev_sim_residents_at(handle: [*mut EvSim], stop_entity_id: [u64], out: [*mut u64], capacity: [u32], out_written: [*mut u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_rider_tag_gms = ev_sim_rider_tag(handle: [*mut EvSim], rider_entity_id: [u64], out_tag: [*mut u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_riders_on_gms = ev_sim_riders_on(handle: [*mut EvSim], elevator_entity_id: [u64], out: [*mut u64], capacity: [u32], out_written: [*mut u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_run_until_quiet_gms = ev_sim_run_until_quiet(handle: [*mut EvSim], max_ticks: [u64], out_ticks_run: [*mut u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_service_mode_gms = ev_sim_service_mode(handle: [*mut EvSim], elevator_entity_id: [u64], out_mode: [*mut EvServiceMode]) -> EvStatus);
gms_shim!(unsafe ev_sim_set_acceleration_gms = ev_sim_set_acceleration(handle: [*mut EvSim], elevator_entity_id: [u64], acceleration: [f64]) -> EvStatus);
gms_shim!(unsafe ev_sim_set_arrival_log_retention_ticks_gms = ev_sim_set_arrival_log_retention_ticks(handle: [*mut EvSim], retention_ticks: [u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_set_deceleration_gms = ev_sim_set_deceleration(handle: [*mut EvSim], elevator_entity_id: [u64], deceleration: [f64]) -> EvStatus);
gms_shim!(unsafe ev_sim_set_door_open_ticks_gms = ev_sim_set_door_open_ticks(handle: [*mut EvSim], elevator_entity_id: [u64], ticks: [u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_set_door_transition_ticks_gms = ev_sim_set_door_transition_ticks(handle: [*mut EvSim], elevator_entity_id: [u64], ticks: [u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_set_elevator_home_stop_gms = ev_sim_set_elevator_home_stop(handle: [*mut EvSim], elevator_entity_id: [u64], home_stop_entity_id: [u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_set_elevator_restricted_stops_gms = ev_sim_set_elevator_restricted_stops(handle: [*mut EvSim], elevator_entity_id: [u64], stop_ids: [*const u64], count: [u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_set_line_range_gms = ev_sim_set_line_range(handle: [*mut EvSim], line_entity_id: [u64], min_position: [f64], max_position: [f64]) -> EvStatus);
gms_shim!(unsafe ev_sim_set_max_speed_gms = ev_sim_set_max_speed(handle: [*mut EvSim], elevator_entity_id: [u64], max_speed: [f64]) -> EvStatus);
gms_shim!(unsafe ev_sim_set_reposition_gms = ev_sim_set_reposition(handle: [*mut EvSim], group_id: [u32], strategy: [EvReposition]) -> EvStatus);
gms_shim!(unsafe ev_sim_set_rider_access_gms = ev_sim_set_rider_access(handle: [*mut EvSim], rider_entity_id: [u64], stop_ids: [*const u64], count: [u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_set_rider_route_direct_gms = ev_sim_set_rider_route_direct(handle: [*mut EvSim], rider_entity_id: [u64], from_stop_entity_id: [u64], to_stop_entity_id: [u64], group_id: [u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_set_rider_route_shortest_gms = ev_sim_set_rider_route_shortest(handle: [*mut EvSim], rider_entity_id: [u64], to_stop_entity_id: [u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_set_rider_tag_gms = ev_sim_set_rider_tag(handle: [*mut EvSim], rider_entity_id: [u64], tag: [u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_set_service_mode_gms = ev_sim_set_service_mode(handle: [*mut EvSim], elevator_entity_id: [u64], mode: [EvServiceMode]) -> EvStatus);
gms_shim!(unsafe ev_sim_set_strategy_gms = ev_sim_set_strategy(handle: [*mut EvSim], group_id: [u32], strategy: [EvStrategy]) -> EvStatus);
gms_shim!(unsafe ev_sim_set_target_velocity_gms = ev_sim_set_target_velocity(handle: [*mut EvSim], elevator_entity_id: [u64], velocity: [f64]) -> EvStatus);
gms_shim!(unsafe ev_sim_set_weight_capacity_gms = ev_sim_set_weight_capacity(handle: [*mut EvSim], elevator_entity_id: [u64], capacity: [f64]) -> EvStatus);
gms_shim!(unsafe ev_sim_settle_rider_gms = ev_sim_settle_rider(handle: [*mut EvSim], rider_entity_id: [u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_shortest_route_gms = ev_sim_shortest_route(handle: [*mut EvSim], from_stop_entity_id: [u64], to_stop_entity_id: [u64], out_stops: [*mut u64], capacity: [u32], out_written: [*mut u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_spawn_rider_gms = ev_sim_spawn_rider(handle: [*mut EvSim], origin: [u64], dest: [u64], weight: [f64], out_rider_id: [*mut u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_spawn_rider_ex_gms = ev_sim_spawn_rider_ex(handle: [*mut EvSim], origin: [u64], dest: [u64], weight: [f64], skip_full_elevator: [bool], max_crowding_factor: [f64], abandon_after_ticks: [i64], abandon_on_full: [bool], max_wait_ticks: [i64], out_rider_id: [*mut u64]) -> EvStatus);
gms_shim!(unsafe ev_sim_step_gms = ev_sim_step(handle: [*mut EvSim]) -> EvStatus);
gms_shim!(unsafe ev_sim_stop_entity_gms = ev_sim_stop_entity(handle: [*mut EvSim], stop_id: [u32]) -> u64);
gms_shim!(unsafe ev_sim_stop_lookup_iter_gms = ev_sim_stop_lookup_iter(handle: [*mut EvSim], out: [*mut u64], capacity: [u32], out_written: [*mut u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_stops_served_by_line_gms = ev_sim_stops_served_by_line(handle: [*mut EvSim], line_entity_id: [u64], out: [*mut u64], capacity: [u32], out_written: [*mut u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_strategy_id_gms = ev_sim_strategy_id(handle: [*mut EvSim], group_id: [u32], out_strategy: [*mut EvStrategy]) -> EvStatus);
gms_shim!(unsafe ev_sim_tag_count_gms = ev_sim_tag_count(handle: [*mut EvSim]) -> u32);
gms_shim!(unsafe ev_sim_tag_entity_gms = ev_sim_tag_entity(handle: [*mut EvSim], entity_id: [u64], tag: [*const c_char]) -> EvStatus);
gms_shim!(unsafe ev_sim_transfer_points_gms = ev_sim_transfer_points(handle: [*mut EvSim], out: [*mut u64], capacity: [u32], out_written: [*mut u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_unpin_assignment_gms = ev_sim_unpin_assignment(handle: [*mut EvSim], stop_entity_id: [u64], direction: [i8]) -> EvStatus);
gms_shim!(unsafe ev_sim_untag_entity_gms = ev_sim_untag_entity(handle: [*mut EvSim], entity_id: [u64], tag: [*const c_char]) -> EvStatus);
gms_shim!(unsafe ev_sim_waiting_at_gms = ev_sim_waiting_at(handle: [*mut EvSim], stop_entity_id: [u64], out: [*mut u64], capacity: [u32], out_written: [*mut u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_waiting_count_at_gms = ev_sim_waiting_count_at(handle: [*mut EvSim], stop_entity_id: [u64]) -> u32);
gms_shim!(unsafe ev_sim_waiting_counts_by_line_at_gms = ev_sim_waiting_counts_by_line_at(handle: [*mut EvSim], stop_entity_id: [u64], out: [*mut u64], capacity: [u32], out_written: [*mut u32]) -> EvStatus);
gms_shim!(unsafe ev_sim_waiting_direction_counts_at_gms = ev_sim_waiting_direction_counts_at(handle: [*mut EvSim], stop_entity_id: [u64], out_up_count: [*mut u32], out_down_count: [*mut u32]) -> EvStatus);

#[cfg(test)]
// `i8 → u8` cast in the i8 test is deliberate — it exercises the
// zero-extension hazard the shim guards against. Suppress the
// `needless_type_cast` nursery lint just inside the test module.
#[allow(clippy::needless_type_cast)]
mod tests {
    //! Sanity tests confirming the shim layer encodes each return shape
    //! correctly. The full GMS calling-convention round-trip can only be
    //! exercised by the GMS-shaped C harness in `examples/gms2-harness/`
    //! (and ultimately, a real GameMaker project); these tests just check
    //! that the bit-pattern encoding is invertible and matches the
    //! underlying API on the Rust side.

    use super::*;

    #[test]
    fn abi_version_shim_round_trips_to_original() {
        let original = ev_abi_version();
        let shimmed = ev_abi_version_gms();
        // Bit pattern of f64::from_bits(5_u64) is just 5 (a denormal).
        assert_eq!(shimmed.to_bits(), u64::from(original));
        // And it didn't accidentally become 5.0 (the value vs. bit-pattern check):
        // 5.0_f64 has bit pattern 0x4014_0000_0000_0000, very different from `5`.
        assert_ne!(shimmed.to_bits(), f64::from(original).to_bits());
    }

    #[test]
    fn bit_pattern_preserves_full_u64_range() {
        // Pointer-sized handles need the entire bit pattern intact —
        // confirm the encoding survives values outside the u32 / safe-int range.
        for v in [0_u64, 1, u32::MAX as u64, u64::MAX, 0xDEAD_BEEF_F00D_BABE] {
            let encoded = f64::from_bits(v);
            assert_eq!(encoded.to_bits(), v, "round-trip failed for {v:#x}");
        }
    }

    // Compile-time signature asserts: every non-`f64`, non-`*const
    // c_char` arg slot must be `f64` in the shim's outer signature,
    // matching the way GameMaker pushes `ty_real` through the float
    // register file. Pointer-handle args, integer args, `bool` args,
    // and enum args are all expected to ride `f64`. If a future
    // macro edit breaks this, these assignments fail to type-check
    // — which is exactly the regression we want to catch at build
    // time rather than at GMS-import time (issue #879).
    //
    // The const-bindings are unused at runtime; the type annotation
    // is the test.
    #[allow(dead_code)]
    const _ASSERT_STEP_SIG: unsafe extern "C" fn(f64) -> f64 = ev_sim_step_gms;
    #[allow(dead_code)]
    const _ASSERT_PRESS_HALL_SIG: unsafe extern "C" fn(f64, f64, f64) -> f64 =
        ev_sim_press_hall_button_gms;
    #[allow(dead_code)]
    const _ASSERT_TAG_ENTITY_SIG: unsafe extern "C" fn(f64, f64, *const c_char) -> f64 =
        ev_sim_tag_entity_gms;
    #[allow(dead_code)]
    const _ASSERT_SET_MAX_SPEED_SIG: unsafe extern "C" fn(f64, f64, f64) -> f64 =
        ev_sim_set_max_speed_gms;
    #[allow(dead_code)]
    const _ASSERT_SET_REPOSITION_SIG: unsafe extern "C" fn(f64, f64, f64) -> f64 =
        ev_sim_set_reposition_gms;
    #[allow(dead_code)]
    const _ASSERT_IS_ELEVATOR_SIG: unsafe extern "C" fn(f64, f64) -> f64 = ev_sim_is_elevator_gms;
    #[allow(dead_code)]
    const _ASSERT_ELEVATOR_DIRECTION_SIG: unsafe extern "C" fn(f64, f64) -> f64 =
        ev_sim_elevator_direction_gms;

    #[test]
    fn pointer_arg_decode_round_trips_through_f64() {
        // Confirm the arg-side bridge is invertible for a pointer
        // value across the full 47-bit user-space address range. The
        // shim takes its handle as f64-bits and decodes via
        // `(to_bits() as usize) as *mut T`; this test exercises that
        // path with synthetic values rather than a real sim handle,
        // so it stays standalone (no temp-file dependency).
        //
        // We can't dereference the synthetic pointers — just confirm
        // the bit pattern round-trips so the shim sees the same
        // address GMS pushed onto the float register.
        for raw in [
            0x0000_0000_0000_0001_u64,
            0x0000_7FFF_FFFF_FFFF,
            0xDEAD_BEEF_F00D_BABE,
        ] {
            let as_f64 = f64::from_bits(raw);
            let bits = as_f64.to_bits();
            let ptr = bits as usize as *mut u8;
            assert_eq!(ptr as u64, raw, "round-trip failed for {raw:#x}");
        }
    }

    #[test]
    fn numeric_integer_arg_decode_recovers_user_typed_value() {
        // GMS-side users type literal numerics (`var capacity = 16;`,
        // `var direction = -1;`) which GML stores as plain IEEE-754
        // doubles (`16.0`, `-1.0`). The shim's arg decoder for the
        // smaller integer widths must use the numeric `as` cast —
        // `16.0_f64.to_bits() as u32` is `0`, which would silently
        // zero every count / capacity / phase / direction arg. This
        // test exercises the same conversion the macro expands to.
        for raw in [0_u32, 1, 16, 255, 65_536, u32::MAX / 2] {
            let as_f64 = f64::from(raw);
            let decoded = as_f64 as u32;
            assert_eq!(decoded, raw, "u32 numeric round-trip failed for {raw}");
        }

        for raw in [-128_i8, -1, 0, 1, 42, 127] {
            let as_f64 = f64::from(raw);
            let decoded = as_f64 as i8;
            assert_eq!(decoded, raw, "i8 numeric round-trip failed for {raw}");
        }

        for raw in [-1_000_000_i64, -1, 0, 1, 600, 1_000_000] {
            let as_f64 = raw as f64;
            let decoded = as_f64 as i64;
            assert_eq!(decoded, raw, "i64 numeric round-trip failed for {raw}");
        }
    }

    #[test]
    fn enum_arg_decode_recovers_discriminant_from_numeric() {
        // Enums are user-typed discriminants on the GML side (e.g.
        // `var s = EvStrategy_NearestCar;` resolves to `2.0`). The
        // shim casts the inbound double to `i32` numerically and
        // then transmutes to the enum's `#[repr(C)]` layout (`int`,
        // 4 bytes on every target we ship to). Confirm round-trip
        // for the three fieldless enums on the FFI surface.
        unsafe {
            let strat_real = f64::from(EvStrategy::NearestCar as u32);
            let decoded: EvStrategy = core::mem::transmute::<i32, EvStrategy>(strat_real as i32);
            assert_eq!(decoded, EvStrategy::NearestCar);

            let repo_real = f64::from(EvReposition::PredictiveParking as u32);
            let decoded: EvReposition = core::mem::transmute::<i32, EvReposition>(repo_real as i32);
            assert_eq!(decoded, EvReposition::PredictiveParking);

            // Contrast with `transmute_copy::<u64, T>(&bits)` (the
            // previous decode strategy): for a numeric input like
            // `2.0_f64`, the low 4 bytes of the bit pattern are all
            // zero (the mantissa's least-significant 32 bits are
            // zero for any small integer-valued double), so the
            // recovered variant would have been `EvStrategy::Scan`
            // (discriminant 0) regardless of the input. Pin the
            // hazard here so any future regression to bit-pattern
            // decoding is obvious.
            let mantissa_low = core::mem::transmute_copy::<u64, u32>(&(2.0_f64).to_bits());
            assert_eq!(
                mantissa_low, 0,
                "the bit-pattern low-word of 2.0_f64 is 0; this is the trap the numeric decoder avoids"
            );
        }
    }

    #[test]
    fn i8_shim_zero_extends_through_u8() {
        // Negative i8 must encode as 0xFF…0xFF in the low byte, NOT
        // sign-extended across the full mantissa — otherwise GML's
        // low-byte read would observe the wrong value. We declare the
        // value as i8 explicitly to make the sign-extension hazard
        // visible at the test site.
        // The `i8` annotation is deliberate: the shim's correctness
        // hinges on `i8 → u8` zero-extending the byte rather than sign-
        // extending. Declaring `raw_i8` as `u8` directly would erase the
        // hazard we're guarding against.
        let raw_i8: i8 = -1;
        let encoded = f64::from_bits(u64::from(raw_i8 as u8));
        assert_eq!(
            encoded.to_bits(),
            0xFF,
            "i8(-1) must encode as 0xFF, not 0xFFFFFFFFFFFFFFFF"
        );
    }
}
