// Hand-written GML companion to elevator_ffi_generated.gml.
//
// What lives here:
//   - Handle helpers (no-op on x64; documented for clarity).
//   - Struct decoders that read the byte layout of a Rust #[repr(C)]
//     struct out of a GameMaker buffer.
//   - High-level wrappers around polling drains that return GML-native
//     arrays of structs (ev_drain_log_messages_into_array and friends).
//
// Why hand-written: GML's `external_define` only supports ty_real and
// ty_string return / argument types, so any FFI call that writes a
// repr-C struct to a caller buffer needs a buffer_peek decode pass on
// the GML side. Auto-generating those decoders would require parsing
// every #[repr(C)] struct in lib.rs + matching offsets to GML buffer
// reads — feasible but out of scope for v1. See the per-decoder
// comments below for the layout each one mirrors.
//
// Byte-offset constants are spelled out as `EV_<STRUCT>_<FIELD>_OFFSET`
// at module scope so the C harness in examples/gms2-harness/main.c can
// reference the same constants when asserting layout. If a future
// cbindgen reorder shifts a field, the harness fails the offset assert
// before this file is reached.

// ── Handle helpers ──────────────────────────────────────────────────
//
// `EvSim *` round-trips through `ty_real` because user-space x64
// pointers fit in 47 bits, well inside a double's 53-bit mantissa.
// On a 32-bit GMS host (none exist after v2022.8) this would corrupt
// the high bits — the C harness asserts sizeof(void*) == 8 and the
// READMEs warn the same way the C# harness does.
function ev_handle_to_real(_handle) {
    return _handle;
}

function ev_real_to_handle(_real) {
    return _real;
}

// ── EvLogMessage decoder ────────────────────────────────────────────
//
// Offset macros live in elevator_ffi_layout.gml (auto-generated from
// #[repr(C)] + #[derive(MultiHostLayout)] in
// crates/elevator-ffi/src/lib.rs by `cargo run -p
// elevator-layout-codegen`). Use them directly with buffer_peek; the
// codegen guarantees they match the Rust struct layout.

/// Decode a single EvLogMessage out of `_buf` at `_offset`.
///
/// Returns a struct: { level, ts_ns, msg } where `msg` is a UTF-8
/// string copied out of the borrowed slice. The copy is intentional —
/// the underlying msg_ptr goes invalid on the next ev_drain_log_messages
/// call, so retaining a reference would be unsafe.
function ev_log_message_decode(_buf, _offset) {
    var _level   = buffer_peek(_buf, _offset + EV_LOG_MESSAGE_LEVEL_OFFSET, buffer_u8);
    var _ts_ns   = buffer_peek(_buf, _offset + EV_LOG_MESSAGE_TS_NS_OFFSET, buffer_s64);
    var _msg_ptr = buffer_peek(_buf, _offset + EV_LOG_MESSAGE_MSG_PTR_OFFSET, buffer_u64);
    var _msg_len = buffer_peek(_buf, _offset + EV_LOG_MESSAGE_MSG_LEN_OFFSET, buffer_u32);

    // Copy UTF-8 bytes out of the borrowed slice into a GML string.
    // We allocate a tiny scratch buffer, dereference msg_ptr through
    // a memcpy-equivalent (buffer_load_partial isn't available here;
    // we use buffer_create at the address instead). If your GMS
    // version doesn't support ptr-to-buffer, fall back to keeping the
    // msg as raw bytes.
    var _msg = "<unavailable>";
    if (_msg_ptr != 0 && _msg_len > 0) {
        var _scratch = buffer_create(_msg_len, buffer_fixed, 1);
        // Copy from address into scratch. GMS exposes this via
        // buffer_copy_from_data_pointer in 2024+; on older runtimes
        // users can copy byte-by-byte with a tight loop.
        buffer_copy_from_data_pointer(_scratch, 0, _msg_ptr, _msg_len);
        _msg = buffer_read(_scratch, buffer_text);
        buffer_delete(_scratch);
    }

    return {
        level: _level,
        ts_ns: _ts_ns,
        msg: _msg,
    };
}

/// Drain all queued log messages into a GML array.
///
/// Activates lazy buffering on the Rust side via the first
/// ev_pending_log_message_count call; subsequent ev_sim_step calls
/// will queue records.
///
/// Drains in a loop (chunk size `_CHUNK`) until the queue is empty,
/// so the returned array carries every record currently buffered —
/// no overflow is silently dropped. Each chunk's msg_ptr slices are
/// copied out of the handle's internal buffer before the next call,
/// so the strings are safe to retain past subsequent drains.
function ev_drain_log_messages_into_array(_handle) {
    // Trip the lazy-opt-in flag so the next ev_sim_step queues
    // records (no-op if already active).
    ev_pending_log_message_count(_handle);

    var _CHUNK = 256;
    var _buf = buffer_create(EV_LOG_MESSAGE_SIZE * _CHUNK, buffer_fixed, 1);
    var _written_buf = buffer_create(4, buffer_fixed, 1);

    var _addr_buf = buffer_get_address(_buf);
    var _addr_written = buffer_get_address(_written_buf);

    var _out = [];
    while (true) {
        var _status = ev_drain_log_messages(_handle, _addr_buf, _CHUNK, _addr_written);
        if (_status != 0) {
            break;
        }
        var _written = buffer_peek(_written_buf, 0, buffer_u32);
        for (var i = 0; i < _written; i++) {
            array_push(_out, ev_log_message_decode(_buf, i * EV_LOG_MESSAGE_SIZE));
        }
        // A short read indicates the queue is now empty. The next
        // drain would return 0 records anyway; exit the loop now to
        // skip the redundant FFI call.
        if (_written < _CHUNK) {
            break;
        }
    }

    buffer_delete(_buf);
    buffer_delete(_written_buf);
    return _out;
}

// ── Struct decoders for other repr-C types ──────────────────────────
//
// EvEvent (88 bytes, 49 kinds), EvFrame, EvElevatorView, EvStopView,
// EvRiderView, EvHallCall, EvCarCall, EvMetrics, EvElevatorParams,
// EvAssignment, EvTaggedMetric — extend as needed following the
// EvLogMessage pattern above. The byte layouts are stable across
// `cbindgen` runs as long as no field is added or reordered; the C
// harness in examples/gms2-harness/main.c asserts each offset against
// the cbindgen-generated header so a future drift fails CI before
// this file is touched.
//
// For ABI v5 the EvEvent layout is:
//   0:  u8  kind          16: u64 stop          56: u64 count
//   1:  i8  direction     24: u64 car           64: f64 f1
//   2:  u8  code1          32: u64 rider         72: f64 f2
//   3:  u8  code2          40: u64 floor         80: u64 tag
//   4:  u32 group          48: u64 entity
//   8:  u64 tick
//
// Implement ev_event_decode along the same shape as
// ev_log_message_decode when the GameMaker game needs to consume
// events directly from GML.
