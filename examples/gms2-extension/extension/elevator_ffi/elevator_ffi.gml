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

// ── Return-register bridge decoders ─────────────────────────────────
//
// Integer / enum / bool returns from the cdylib are bit-pattern-encoded
// into the `ty_real` return so the value lands in the float register
// (xmm0 / d0) on every platform — see crates/elevator-ffi/src/gms_shims.rs
// for the Rust shim layer and issue #876 for the underlying bug.
//
// `_status != 0` checks against EvStatus codes work without decoding
// (the bit pattern of any non-zero status is itself non-zero). Use the
// helpers below when you need the actual numerical value of a status,
// count, or u64 ID.

/// Decode a 64-bit unsigned integer from a `ty_real` return value
/// that carries it as a bit pattern. Use this for `u32`/`u64` counts
/// and IDs, or for `EvStatus` when you need to compare against a
/// specific non-zero variant (e.g. `EvStatus_NotFound = 6`).
function ev_decode_u64(_real) {
    var _buf = buffer_create(8, buffer_fixed, 1);
    buffer_poke(_buf, 0, buffer_f64, _real);
    var _u = buffer_peek(_buf, 0, buffer_u64);
    buffer_delete(_buf);
    return _u;
}

/// Decode an `EvStatus` variant (a small unsigned integer) from a
/// `ty_real` return value. Equivalent to `ev_decode_u64` but reads
/// as a 32-bit unsigned for slightly less buffer overhead.
function ev_decode_status(_real) {
    var _buf = buffer_create(8, buffer_fixed, 1);
    buffer_poke(_buf, 0, buffer_f64, _real);
    var _u = buffer_peek(_buf, 0, buffer_u32);
    buffer_delete(_buf);
    return _u;
}

/// Decode a signed 8-bit `int8_t` return (currently only
/// `ev_sim_elevator_direction`: -1 down, 0 still, +1 up). The shim
/// zero-extends through the low byte, so we mask and sign-extend
/// here to recover the original signed value.
function ev_decode_i8(_real) {
    var _byte = ev_decode_u64(_real) & 0xFF;
    return (_byte > 127) ? _byte - 256 : _byte;
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

// ── EvEvent decoder ─────────────────────────────────────────────────
//
// Layout (88 bytes, ABI v5+) consumed via EV_EVENT_*_OFFSET macros from
// elevator_ffi_layout.gml. EvEventKind is a u8 discriminator (49 kinds);
// see the cbindgen header for the numeric mapping. Direction is i8.

/// Decode a single EvEvent out of `_buf` at `_offset`.
///
/// Returns a struct with every byte of the event. Reader code typically
/// dispatches on `kind`; numeric u8/i8/u32/u64/f64 fields are read as
/// GML reals, with the entity-id u64s preserved exactly via buffer_u64.
function ev_event_decode(_buf, _offset) {
    return {
        kind:      buffer_peek(_buf, _offset + EV_EVENT_KIND_OFFSET,      buffer_u8),
        direction: buffer_peek(_buf, _offset + EV_EVENT_DIRECTION_OFFSET, buffer_s8),
        code1:     buffer_peek(_buf, _offset + EV_EVENT_CODE1_OFFSET,     buffer_u8),
        code2:     buffer_peek(_buf, _offset + EV_EVENT_CODE2_OFFSET,     buffer_u8),
        group:     buffer_peek(_buf, _offset + EV_EVENT_GROUP_OFFSET,     buffer_u32),
        tick:      buffer_peek(_buf, _offset + EV_EVENT_TICK_OFFSET,      buffer_u64),
        stop:      buffer_peek(_buf, _offset + EV_EVENT_STOP_OFFSET,      buffer_u64),
        car:       buffer_peek(_buf, _offset + EV_EVENT_CAR_OFFSET,       buffer_u64),
        rider:     buffer_peek(_buf, _offset + EV_EVENT_RIDER_OFFSET,     buffer_u64),
        floor:     buffer_peek(_buf, _offset + EV_EVENT_FLOOR_OFFSET,     buffer_u64),
        entity:    buffer_peek(_buf, _offset + EV_EVENT_ENTITY_OFFSET,    buffer_u64),
        count:     buffer_peek(_buf, _offset + EV_EVENT_COUNT_OFFSET,     buffer_u64),
        f1:        buffer_peek(_buf, _offset + EV_EVENT_F1_OFFSET,        buffer_f64),
        f2:        buffer_peek(_buf, _offset + EV_EVENT_F2_OFFSET,        buffer_f64),
        tag:       buffer_peek(_buf, _offset + EV_EVENT_TAG_OFFSET,       buffer_u64),
    };
}

// ── Out-param ergonomics: buffer allocate → call → peek → free ──────
//
// Every FFI call below is auto-generated in elevator_ffi_generated.gml.
// The wrappers here just spare consumers from writing the buffer dance
// for the most common rider/topology calls. Each `_easy` helper returns
// the produced id (or 0 on failure) and clears its scratch buffer
// before returning — no caller-side cleanup needed. On failure, the
// underlying ev_last_error() carries the diagnostic string.

// NaN-encoded `Option::None` sentinel for the optional bypass-load
// fields on EvElevatorParams. Per the C header:
//
//   "bypass_load_up_pct and bypass_load_down_pct: NaN encodes
//    Option::None; any finite value is treated as Some(v)."
//
// Passing `0` to disable bypass would silently configure
// "bypass-at-0%-load" (i.e. always bypass) — set the field to
// `EV_BYPASS_NONE` (or leave it unset on the struct) to opt out.
#macro EV_BYPASS_NONE NaN

/// Spawn a rider from origin → dest with the given weight (kg).
/// Returns the new rider id, or 0 if the call failed.
function ev_sim_spawn_rider_easy(_handle, _origin, _dest, _weight) {
    var _buf = buffer_create(8, buffer_fixed, 1);
    var _status = ev_sim_spawn_rider(_handle, _origin, _dest, _weight,
                                     buffer_get_address(_buf));
    var _rider_id = (_status == 0) ? buffer_peek(_buf, 0, buffer_u64) : 0;
    buffer_delete(_buf);
    return _rider_id;
}

/// Create a new dispatch group. Returns the new group id (u32 widened
/// into a real), or -1 on failure (group 0 is the legacy default group
/// and so cannot serve as a sentinel).
function ev_sim_add_group_easy(_handle, _name, _strategy) {
    var _buf = buffer_create(4, buffer_fixed, 1);
    var _status = ev_sim_add_group(_handle, _name, _strategy,
                                   buffer_get_address(_buf));
    var _group_id = (_status == 0) ? buffer_peek(_buf, 0, buffer_u32) : -1;
    buffer_delete(_buf);
    return _group_id;
}

/// Add a new line to a group. Returns the new line entity id, or 0
/// on failure.
function ev_sim_add_line_easy(_handle, _group_id, _name, _min_position,
                              _max_position, _max_cars) {
    var _buf = buffer_create(8, buffer_fixed, 1);
    var _status = ev_sim_add_line(_handle, _group_id, _name, _min_position,
                                  _max_position, _max_cars,
                                  buffer_get_address(_buf));
    var _entity = (_status == 0) ? buffer_peek(_buf, 0, buffer_u64) : 0;
    buffer_delete(_buf);
    return _entity;
}

/// Add a new stop to a line. Returns the new stop entity id, or 0 on
/// failure.
function ev_sim_add_stop_easy(_handle, _line_entity_id, _name, _position) {
    var _buf = buffer_create(8, buffer_fixed, 1);
    var _status = ev_sim_add_stop(_handle, _line_entity_id, _name, _position,
                                  buffer_get_address(_buf));
    var _entity = (_status == 0) ? buffer_peek(_buf, 0, buffer_u64) : 0;
    buffer_delete(_buf);
    return _entity;
}

/// Add a new elevator to a line. `_params` is a GML struct carrying the
/// EvElevatorParams fields (max_speed, acceleration, deceleration,
/// weight_capacity, door_transition_ticks, door_open_ticks,
/// inspection_speed_factor, bypass_load_up_pct, bypass_load_down_pct).
/// `_restricted_stops` is an array of stop entity ids (may be empty).
/// Returns the new elevator entity id, or 0 on failure.
///
/// `bypass_load_up_pct` / `bypass_load_down_pct` are optional: set them
/// to `EV_BYPASS_NONE` (or omit the field entirely) to disable bypass;
/// a finite value in `[0.0, 1.0]` enables bypass at that load fraction.
/// Passing `0` here silently means "bypass at 0% load" (i.e. always
/// bypass) — the helper substitutes `EV_BYPASS_NONE` for missing fields
/// so the safe default is "disabled", not "always on".
///
/// Builds the EvElevatorParams scratch buffer using the layout offsets
/// auto-generated in elevator_ffi_layout.gml so a future field shuffle
/// reflows here automatically.
function ev_sim_add_elevator_easy(_handle, _params, _restricted_stops,
                                  _line_entity_id, _starting_position) {
    var _bypass_up = variable_struct_exists(_params, "bypass_load_up_pct")
        ? _params.bypass_load_up_pct
        : EV_BYPASS_NONE;
    var _bypass_down = variable_struct_exists(_params, "bypass_load_down_pct")
        ? _params.bypass_load_down_pct
        : EV_BYPASS_NONE;

    var _params_buf = buffer_create(EV_ELEVATOR_PARAMS_SIZE, buffer_fixed, 1);
    buffer_poke(_params_buf, EV_ELEVATOR_PARAMS_MAX_SPEED_OFFSET,                buffer_f64, _params.max_speed);
    buffer_poke(_params_buf, EV_ELEVATOR_PARAMS_ACCELERATION_OFFSET,             buffer_f64, _params.acceleration);
    buffer_poke(_params_buf, EV_ELEVATOR_PARAMS_DECELERATION_OFFSET,             buffer_f64, _params.deceleration);
    buffer_poke(_params_buf, EV_ELEVATOR_PARAMS_WEIGHT_CAPACITY_OFFSET,          buffer_f64, _params.weight_capacity);
    buffer_poke(_params_buf, EV_ELEVATOR_PARAMS_DOOR_TRANSITION_TICKS_OFFSET,    buffer_u32, _params.door_transition_ticks);
    buffer_poke(_params_buf, EV_ELEVATOR_PARAMS_DOOR_OPEN_TICKS_OFFSET,          buffer_u32, _params.door_open_ticks);
    buffer_poke(_params_buf, EV_ELEVATOR_PARAMS_INSPECTION_SPEED_FACTOR_OFFSET,  buffer_f64, _params.inspection_speed_factor);
    buffer_poke(_params_buf, EV_ELEVATOR_PARAMS_BYPASS_LOAD_UP_PCT_OFFSET,       buffer_f64, _bypass_up);
    buffer_poke(_params_buf, EV_ELEVATOR_PARAMS_BYPASS_LOAD_DOWN_PCT_OFFSET,     buffer_f64, _bypass_down);

    var _restricted_count = array_length(_restricted_stops);
    var _restricted_addr = 0;
    var _restricted_buf = undefined;
    if (_restricted_count > 0) {
        _restricted_buf = buffer_create(8 * _restricted_count, buffer_fixed, 1);
        for (var i = 0; i < _restricted_count; i++) {
            buffer_poke(_restricted_buf, i * 8, buffer_u64, _restricted_stops[i]);
        }
        _restricted_addr = buffer_get_address(_restricted_buf);
    }

    var _out_buf = buffer_create(8, buffer_fixed, 1);
    var _status = ev_sim_add_elevator(_handle, buffer_get_address(_params_buf),
                                      _restricted_addr, _restricted_count,
                                      _line_entity_id, _starting_position,
                                      buffer_get_address(_out_buf));
    var _entity = (_status == 0) ? buffer_peek(_out_buf, 0, buffer_u64) : 0;
    buffer_delete(_params_buf);
    buffer_delete(_out_buf);
    if (!is_undefined(_restricted_buf)) {
        buffer_delete(_restricted_buf);
    }
    return _entity;
}

// ── Array-returning drains ──────────────────────────────────────────
//
// Same chunked-loop pattern as ev_drain_log_messages_into_array. Each
// returns a fresh GML array; callers don't share buffers with the
// FFI side.

/// Drain all pending events into a GML array of decoded structs. Each
/// element is the result of `ev_event_decode`. Drains in chunks of
/// `_CHUNK` until the queue is empty, so the returned array is the
/// complete tail of events emitted since the previous call.
function ev_sim_drain_events_into_array(_handle) {
    var _CHUNK = 256;
    var _buf = buffer_create(EV_EVENT_SIZE * _CHUNK, buffer_fixed, 1);
    var _written_buf = buffer_create(4, buffer_fixed, 1);
    var _addr_buf = buffer_get_address(_buf);
    var _addr_written = buffer_get_address(_written_buf);

    var _out = [];
    while (true) {
        var _status = ev_sim_drain_events(_handle, _addr_buf, _CHUNK, _addr_written);
        if (_status != 0) {
            break;
        }
        var _written = buffer_peek(_written_buf, 0, buffer_u32);
        for (var i = 0; i < _written; i++) {
            array_push(_out, ev_event_decode(_buf, i * EV_EVENT_SIZE));
        }
        if (_written < _CHUNK) {
            break;
        }
    }

    buffer_delete(_buf);
    buffer_delete(_written_buf);
    return _out;
}

/// Helper for buffer-pattern accessors that emit a flat `u64[]`. Calls
/// `_drain_fn(_handle, addr, capacity, addr_written)` repeatedly with
/// a growing buffer until the entire result fits in one read. Returns
/// a GML array of u64 ids (or an empty array on failure).
///
/// `_drain_fn` is invoked as `_drain_fn(_handle, _addr_buf, _capacity,
/// _addr_written)`. Use `method` to bind an extra leading argument (see
/// `ev_sim_elevators_on_line_into_array` for the pattern).
function ev_drain_u64_buffer(_handle, _drain_fn) {
    var _capacity = 64;
    var _written_buf = buffer_create(4, buffer_fixed, 1);
    var _addr_written = buffer_get_address(_written_buf);

    while (true) {
        var _buf = buffer_create(8 * _capacity, buffer_fixed, 1);
        var _addr_buf = buffer_get_address(_buf);
        var _status = _drain_fn(_handle, _addr_buf, _capacity, _addr_written);
        if (_status != 0) {
            buffer_delete(_buf);
            break;
        }
        var _written = buffer_peek(_written_buf, 0, buffer_u32);
        if (_written < _capacity) {
            var _out = array_create(_written);
            for (var i = 0; i < _written; i++) {
                _out[i] = buffer_peek(_buf, i * 8, buffer_u64);
            }
            buffer_delete(_buf);
            buffer_delete(_written_buf);
            return _out;
        }
        // A full read means there may be more — grow and retry.
        buffer_delete(_buf);
        _capacity *= 2;
    }
    buffer_delete(_written_buf);
    return [];
}

/// Entity ids of every line across all groups. Empty array on failure.
function ev_sim_all_lines_into_array(_handle) {
    return ev_drain_u64_buffer(_handle, ev_sim_all_lines);
}

/// Entity ids of every elevator attached to `_line_entity_id`. Empty
/// array if the line has no cars (or on failure — check ev_last_error
/// to disambiguate).
function ev_sim_elevators_on_line_into_array(_handle, _line_entity_id) {
    var _line = _line_entity_id;
    var _bound = method({ line: _line }, function(_h, _addr, _cap, _addr_written) {
        return ev_sim_elevators_on_line(_h, line, _addr, _cap, _addr_written);
    });
    return ev_drain_u64_buffer(_handle, _bound);
}

/// Entity ids of every elevator currently repositioning (heading to a
/// parking stop with no rider obligation). Empty array on failure.
function ev_sim_iter_repositioning_elevators_into_array(_handle) {
    return ev_drain_u64_buffer(_handle, ev_sim_iter_repositioning_elevators);
}

/// Entity ids of every stop reachable by transfer from another line
/// (i.e. served by more than one line). Empty array on failure.
function ev_sim_transfer_points_into_array(_handle) {
    return ev_drain_u64_buffer(_handle, ev_sim_transfer_points);
}

/// Stop entity ids in `_elevator`'s destination queue, in FIFO order.
/// Empty array if the elevator has no destinations (or on failure).
function ev_sim_destination_queue_into_array(_handle, _elevator_entity_id) {
    var _elev = _elevator_entity_id;
    var _bound = method({ elev: _elev }, function(_h, _addr, _cap, _addr_written) {
        return ev_sim_destination_queue(_h, elev, _addr, _cap, _addr_written);
    });
    return ev_drain_u64_buffer(_handle, _bound);
}

/// Rider entity ids waiting at `_stop_entity_id`. Empty array if no
/// riders are waiting (or on failure).
function ev_sim_waiting_at_into_array(_handle, _stop_entity_id) {
    var _stop = _stop_entity_id;
    var _bound = method({ stop: _stop }, function(_h, _addr, _cap, _addr_written) {
        return ev_sim_waiting_at(_h, stop, _addr, _cap, _addr_written);
    });
    return ev_drain_u64_buffer(_handle, _bound);
}

/// Rider entity ids settled / resident at `_stop_entity_id`.
function ev_sim_residents_at_into_array(_handle, _stop_entity_id) {
    var _stop = _stop_entity_id;
    var _bound = method({ stop: _stop }, function(_h, _addr, _cap, _addr_written) {
        return ev_sim_residents_at(_h, stop, _addr, _cap, _addr_written);
    });
    return ev_drain_u64_buffer(_handle, _bound);
}

/// Rider entity ids who abandoned their call at `_stop_entity_id`.
function ev_sim_abandoned_at_into_array(_handle, _stop_entity_id) {
    var _stop = _stop_entity_id;
    var _bound = method({ stop: _stop }, function(_h, _addr, _cap, _addr_written) {
        return ev_sim_abandoned_at(_h, stop, _addr, _cap, _addr_written);
    });
    return ev_drain_u64_buffer(_handle, _bound);
}

/// Entity ids of every line that serves `_stop_entity_id`.
function ev_sim_lines_serving_stop_into_array(_handle, _stop_entity_id) {
    var _stop = _stop_entity_id;
    var _bound = method({ stop: _stop }, function(_h, _addr, _cap, _addr_written) {
        return ev_sim_lines_serving_stop(_h, stop, _addr, _cap, _addr_written);
    });
    return ev_drain_u64_buffer(_handle, _bound);
}

/// Entity ids of every line in group `_group_id`.
function ev_sim_lines_in_group_into_array(_handle, _group_id) {
    var _gid = _group_id;
    var _bound = method({ gid: _gid }, function(_h, _addr, _cap, _addr_written) {
        return ev_sim_lines_in_group(_h, gid, _addr, _cap, _addr_written);
    });
    return ev_drain_u64_buffer(_handle, _bound);
}

/// Stop entity ids reachable from `_from_stop_entity_id` via the
/// line-graph.
function ev_sim_reachable_stops_from_into_array(_handle, _from_stop_entity_id) {
    var _stop = _from_stop_entity_id;
    var _bound = method({ stop: _stop }, function(_h, _addr, _cap, _addr_written) {
        return ev_sim_reachable_stops_from(_h, stop, _addr, _cap, _addr_written);
    });
    return ev_drain_u64_buffer(_handle, _bound);
}

/// Stop entity ids served by `_line_entity_id`, in line-graph order.
function ev_sim_stops_served_by_line_into_array(_handle, _line_entity_id) {
    var _line = _line_entity_id;
    var _bound = method({ line: _line }, function(_h, _addr, _cap, _addr_written) {
        return ev_sim_stops_served_by_line(_h, line, _addr, _cap, _addr_written);
    });
    return ev_drain_u64_buffer(_handle, _bound);
}

/// Rider entity ids currently aboard `_elevator_entity_id`.
function ev_sim_riders_on_into_array(_handle, _elevator_entity_id) {
    var _elev = _elevator_entity_id;
    var _bound = method({ elev: _elev }, function(_h, _addr, _cap, _addr_written) {
        return ev_sim_riders_on(_h, elev, _addr, _cap, _addr_written);
    });
    return ev_drain_u64_buffer(_handle, _bound);
}

// ── Struct decoders for repr-C view / metric / call types ─────────
//
// All byte offsets are auto-generated in elevator_ffi_layout.gml from
// `#[repr(C)] #[derive(MultiHostLayout)]` on the Rust side; the C
// harness in examples/gms2-harness/main.c asserts every offset against
// cbindgen's header so a future drift fails CI before this file is
// touched. Each decoder returns a GML struct keyed by the same field
// names as the Rust source struct (snake_case).

/// Decode a single EvAssignment (16 B) — `(line_entity_id, car_entity_id)`.
function ev_assignment_decode(_buf, _offset) {
    return {
        line_entity_id: buffer_peek(_buf, _offset + EV_ASSIGNMENT_LINE_ENTITY_ID_OFFSET, buffer_u64),
        car_entity_id:  buffer_peek(_buf, _offset + EV_ASSIGNMENT_CAR_ENTITY_ID_OFFSET,  buffer_u64),
    };
}

/// Decode a single EvCarCall (40 B). `acknowledged_at == u64::MAX`
/// while still pending acknowledgement.
function ev_car_call_decode(_buf, _offset) {
    return {
        car_entity_id:        buffer_peek(_buf, _offset + EV_CAR_CALL_CAR_ENTITY_ID_OFFSET,        buffer_u64),
        floor_entity_id:      buffer_peek(_buf, _offset + EV_CAR_CALL_FLOOR_ENTITY_ID_OFFSET,      buffer_u64),
        press_tick:           buffer_peek(_buf, _offset + EV_CAR_CALL_PRESS_TICK_OFFSET,           buffer_u64),
        acknowledged_at:      buffer_peek(_buf, _offset + EV_CAR_CALL_ACKNOWLEDGED_AT_OFFSET,      buffer_u64),
        ack_latency_ticks:    buffer_peek(_buf, _offset + EV_CAR_CALL_ACK_LATENCY_TICKS_OFFSET,    buffer_u32),
        pending_rider_count:  buffer_peek(_buf, _offset + EV_CAR_CALL_PENDING_RIDER_COUNT_OFFSET,  buffer_u32),
    };
}

/// Decode a single EvElevatorView (88 B). `phase` and `door_state` are
/// u8 discriminants — see the C header for the value tables.
function ev_elevator_view_decode(_buf, _offset) {
    return {
        entity_id:        buffer_peek(_buf, _offset + EV_ELEVATOR_VIEW_ENTITY_ID_OFFSET,        buffer_u64),
        group_id:         buffer_peek(_buf, _offset + EV_ELEVATOR_VIEW_GROUP_ID_OFFSET,         buffer_u32),
        line_id:          buffer_peek(_buf, _offset + EV_ELEVATOR_VIEW_LINE_ID_OFFSET,          buffer_u64),
        phase:            buffer_peek(_buf, _offset + EV_ELEVATOR_VIEW_PHASE_OFFSET,            buffer_u8),
        position:         buffer_peek(_buf, _offset + EV_ELEVATOR_VIEW_POSITION_OFFSET,         buffer_f64),
        velocity:         buffer_peek(_buf, _offset + EV_ELEVATOR_VIEW_VELOCITY_OFFSET,         buffer_f64),
        current_stop_id:  buffer_peek(_buf, _offset + EV_ELEVATOR_VIEW_CURRENT_STOP_ID_OFFSET,  buffer_u64),
        target_stop_id:   buffer_peek(_buf, _offset + EV_ELEVATOR_VIEW_TARGET_STOP_ID_OFFSET,   buffer_u64),
        occupancy:        buffer_peek(_buf, _offset + EV_ELEVATOR_VIEW_OCCUPANCY_OFFSET,        buffer_u32),
        capacity_kg:      buffer_peek(_buf, _offset + EV_ELEVATOR_VIEW_CAPACITY_KG_OFFSET,      buffer_f64),
        door_state:       buffer_peek(_buf, _offset + EV_ELEVATOR_VIEW_DOOR_STATE_OFFSET,       buffer_u8),
        going_up:         buffer_peek(_buf, _offset + EV_ELEVATOR_VIEW_GOING_UP_OFFSET,         buffer_u8),
        going_down:       buffer_peek(_buf, _offset + EV_ELEVATOR_VIEW_GOING_DOWN_OFFSET,       buffer_u8),
    };
}

/// Decode a single EvRiderView (40 B). `phase` is a u8 discriminant
/// (0 Waiting, 1 Boarding, 2 Riding, 3 Exiting, 4 Walking, 5 Arrived,
/// 6 Abandoned, 7 Resident).
function ev_rider_view_decode(_buf, _offset) {
    return {
        entity_id:           buffer_peek(_buf, _offset + EV_RIDER_VIEW_ENTITY_ID_OFFSET,           buffer_u64),
        phase:               buffer_peek(_buf, _offset + EV_RIDER_VIEW_PHASE_OFFSET,               buffer_u8),
        origin_stop_id:      buffer_peek(_buf, _offset + EV_RIDER_VIEW_ORIGIN_STOP_ID_OFFSET,      buffer_u64),
        destination_stop_id: buffer_peek(_buf, _offset + EV_RIDER_VIEW_DESTINATION_STOP_ID_OFFSET, buffer_u64),
        elevator_id:         buffer_peek(_buf, _offset + EV_RIDER_VIEW_ELEVATOR_ID_OFFSET,         buffer_u64),
    };
}

/// Decode a single EvStopView (56 B). The `name` field is copied out
/// of the borrowed slice (same pattern as `ev_log_message_decode`),
/// so it is safe to retain past the next frame.
function ev_stop_view_decode(_buf, _offset) {
    var _name_ptr = buffer_peek(_buf, _offset + EV_STOP_VIEW_NAME_PTR_OFFSET, buffer_u64);
    var _name_len = buffer_peek(_buf, _offset + EV_STOP_VIEW_NAME_LEN_OFFSET, buffer_u64);
    var _name = "<unavailable>";
    if (_name_ptr != 0 && _name_len > 0) {
        var _scratch = buffer_create(_name_len, buffer_fixed, 1);
        buffer_copy_from_data_pointer(_scratch, 0, _name_ptr, _name_len);
        _name = buffer_read(_scratch, buffer_text);
        buffer_delete(_scratch);
    }
    return {
        entity_id: buffer_peek(_buf, _offset + EV_STOP_VIEW_ENTITY_ID_OFFSET, buffer_u64),
        stop_id:   buffer_peek(_buf, _offset + EV_STOP_VIEW_STOP_ID_OFFSET,   buffer_u32),
        position:  buffer_peek(_buf, _offset + EV_STOP_VIEW_POSITION_OFFSET,  buffer_f64),
        waiting:   buffer_peek(_buf, _offset + EV_STOP_VIEW_WAITING_OFFSET,   buffer_u32),
        residents: buffer_peek(_buf, _offset + EV_STOP_VIEW_RESIDENTS_OFFSET, buffer_u32),
        abandoned: buffer_peek(_buf, _offset + EV_STOP_VIEW_ABANDONED_OFFSET, buffer_u32),
        name:      _name,
    };
}

/// Decode a single EvHallCall (56 B). `direction == 1` Up, `-1` Down.
/// `acknowledged_at == u64::MAX` while pending; `assigned_car == 0`
/// when none; `destination_entity_id == 0` outside DCS mode.
function ev_hall_call_decode(_buf, _offset) {
    return {
        stop_entity_id:        buffer_peek(_buf, _offset + EV_HALL_CALL_STOP_ENTITY_ID_OFFSET,        buffer_u64),
        direction:             buffer_peek(_buf, _offset + EV_HALL_CALL_DIRECTION_OFFSET,             buffer_s8),
        press_tick:            buffer_peek(_buf, _offset + EV_HALL_CALL_PRESS_TICK_OFFSET,            buffer_u64),
        acknowledged_at:       buffer_peek(_buf, _offset + EV_HALL_CALL_ACKNOWLEDGED_AT_OFFSET,       buffer_u64),
        assigned_car:          buffer_peek(_buf, _offset + EV_HALL_CALL_ASSIGNED_CAR_OFFSET,          buffer_u64),
        destination_entity_id: buffer_peek(_buf, _offset + EV_HALL_CALL_DESTINATION_ENTITY_ID_OFFSET, buffer_u64),
        pinned:                buffer_peek(_buf, _offset + EV_HALL_CALL_PINNED_OFFSET,                buffer_u8),
        pending_rider_count:   buffer_peek(_buf, _offset + EV_HALL_CALL_PENDING_RIDER_COUNT_OFFSET,   buffer_u32),
    };
}

/// Decode a single EvMetrics (112 B). Time fields stay in ticks;
/// multiply by `ev_sim_dt(handle)` for seconds. Prefer this over
/// EvMetricsView when you need totals + utilization + distance —
/// EvMetricsView is the smaller five-field projection embedded in
/// EvFrame.
function ev_metrics_decode(_buf, _offset) {
    return {
        total_delivered:     buffer_peek(_buf, _offset + EV_METRICS_TOTAL_DELIVERED_OFFSET,     buffer_u64),
        total_abandoned:     buffer_peek(_buf, _offset + EV_METRICS_TOTAL_ABANDONED_OFFSET,     buffer_u64),
        total_spawned:       buffer_peek(_buf, _offset + EV_METRICS_TOTAL_SPAWNED_OFFSET,       buffer_u64),
        total_settled:       buffer_peek(_buf, _offset + EV_METRICS_TOTAL_SETTLED_OFFSET,       buffer_u64),
        total_rerouted:      buffer_peek(_buf, _offset + EV_METRICS_TOTAL_REROUTED_OFFSET,      buffer_u64),
        throughput:          buffer_peek(_buf, _offset + EV_METRICS_THROUGHPUT_OFFSET,          buffer_u64),
        avg_wait_ticks:      buffer_peek(_buf, _offset + EV_METRICS_AVG_WAIT_TICKS_OFFSET,      buffer_f64),
        max_wait_ticks:      buffer_peek(_buf, _offset + EV_METRICS_MAX_WAIT_TICKS_OFFSET,      buffer_u64),
        avg_ride_ticks:      buffer_peek(_buf, _offset + EV_METRICS_AVG_RIDE_TICKS_OFFSET,      buffer_f64),
        avg_utilization:     buffer_peek(_buf, _offset + EV_METRICS_AVG_UTILIZATION_OFFSET,     buffer_f64),
        abandonment_rate:    buffer_peek(_buf, _offset + EV_METRICS_ABANDONMENT_RATE_OFFSET,    buffer_f64),
        total_distance:      buffer_peek(_buf, _offset + EV_METRICS_TOTAL_DISTANCE_OFFSET,      buffer_f64),
        total_moves:         buffer_peek(_buf, _offset + EV_METRICS_TOTAL_MOVES_OFFSET,         buffer_u64),
        reposition_distance: buffer_peek(_buf, _offset + EV_METRICS_REPOSITION_DISTANCE_OFFSET, buffer_f64),
    };
}

/// Decode a single EvMetricsView (40 B). Embedded in EvFrame.
function ev_metrics_view_decode(_buf, _offset) {
    return {
        total_delivered:   buffer_peek(_buf, _offset + EV_METRICS_VIEW_TOTAL_DELIVERED_OFFSET,   buffer_u64),
        total_abandoned:   buffer_peek(_buf, _offset + EV_METRICS_VIEW_TOTAL_ABANDONED_OFFSET,   buffer_u64),
        avg_wait_seconds:  buffer_peek(_buf, _offset + EV_METRICS_VIEW_AVG_WAIT_SECONDS_OFFSET,  buffer_f64),
        avg_ride_seconds:  buffer_peek(_buf, _offset + EV_METRICS_VIEW_AVG_RIDE_SECONDS_OFFSET,  buffer_f64),
        current_tick:      buffer_peek(_buf, _offset + EV_METRICS_VIEW_CURRENT_TICK_OFFSET,      buffer_u64),
    };
}

/// Decode a single EvTaggedMetric (40 B).
function ev_tagged_metric_decode(_buf, _offset) {
    return {
        avg_wait_ticks:   buffer_peek(_buf, _offset + EV_TAGGED_METRIC_AVG_WAIT_TICKS_OFFSET,   buffer_f64),
        max_wait_ticks:   buffer_peek(_buf, _offset + EV_TAGGED_METRIC_MAX_WAIT_TICKS_OFFSET,   buffer_u64),
        total_delivered:  buffer_peek(_buf, _offset + EV_TAGGED_METRIC_TOTAL_DELIVERED_OFFSET,  buffer_u64),
        total_abandoned:  buffer_peek(_buf, _offset + EV_TAGGED_METRIC_TOTAL_ABANDONED_OFFSET,  buffer_u64),
        total_spawned:    buffer_peek(_buf, _offset + EV_TAGGED_METRIC_TOTAL_SPAWNED_OFFSET,    buffer_u64),
    };
}

// ── Single-shot struct helpers (allocate → call → decode → free) ────

/// Decode a borrowed view-pointer array out of an EvFrame slot. Reads
/// the `(ptr, count)` pair at `_ptr_offset` / `_count_offset` inside
/// `_frame_buf`, copies `count * _struct_size` bytes from the source
/// pointer into a scratch buffer, then calls `_decode_fn` per element.
/// Returns a GML array of decoded structs.
function ev_frame_decode_array(_frame_buf, _ptr_offset, _count_offset, _struct_size, _decode_fn) {
    var _ptr = buffer_peek(_frame_buf, _ptr_offset, buffer_u64);
    var _count = buffer_peek(_frame_buf, _count_offset, buffer_u64);
    if (_ptr == 0 || _count == 0) {
        return [];
    }
    var _bytes = _struct_size * _count;
    var _scratch = buffer_create(_bytes, buffer_fixed, 1);
    buffer_copy_from_data_pointer(_scratch, 0, _ptr, _bytes);
    var _out = array_create(_count);
    for (var i = 0; i < _count; i++) {
        _out[i] = _decode_fn(_scratch, i * _struct_size);
    }
    buffer_delete(_scratch);
    return _out;
}

/// One-shot full snapshot of the simulation. Calls `ev_sim_frame`,
/// decodes the embedded elevator/stop/rider view arrays and the
/// metrics view, and returns a GML struct:
///
///     { elevators: [EvElevatorView], stops: [EvStopView],
///       riders: [EvRiderView], metrics: EvMetricsView }
///
/// All slice copies happen inside this call, so the returned arrays
/// are safe to retain past the next `ev_sim_frame` call.
function ev_sim_frame_into_struct(_handle) {
    var _buf = buffer_create(EV_FRAME_SIZE, buffer_fixed, 1);
    var _status = ev_sim_frame(_handle, buffer_get_address(_buf));
    if (_status != 0) {
        buffer_delete(_buf);
        return undefined;
    }
    var _result = {
        elevators: ev_frame_decode_array(_buf,
            EV_FRAME_ELEVATORS_OFFSET, EV_FRAME_ELEVATOR_COUNT_OFFSET,
            EV_ELEVATOR_VIEW_SIZE, ev_elevator_view_decode),
        stops: ev_frame_decode_array(_buf,
            EV_FRAME_STOPS_OFFSET, EV_FRAME_STOP_COUNT_OFFSET,
            EV_STOP_VIEW_SIZE, ev_stop_view_decode),
        riders: ev_frame_decode_array(_buf,
            EV_FRAME_RIDERS_OFFSET, EV_FRAME_RIDER_COUNT_OFFSET,
            EV_RIDER_VIEW_SIZE, ev_rider_view_decode),
        metrics: ev_metrics_view_decode(_buf, EV_FRAME_METRICS_OFFSET),
    };
    buffer_delete(_buf);
    return _result;
}

/// Read full metrics as a GML struct. Returns `undefined` on failure.
function ev_sim_metrics_into_struct(_handle) {
    var _buf = buffer_create(EV_METRICS_SIZE, buffer_fixed, 1);
    var _status = ev_sim_metrics(_handle, buffer_get_address(_buf));
    if (_status != 0) {
        buffer_delete(_buf);
        return undefined;
    }
    var _result = ev_metrics_decode(_buf, 0);
    buffer_delete(_buf);
    return _result;
}

/// Read per-tag metrics for `_tag` as a GML struct. Returns `undefined`
/// if the tag isn't registered (or any other failure).
function ev_sim_metrics_for_tag_into_struct(_handle, _tag) {
    var _buf = buffer_create(EV_TAGGED_METRIC_SIZE, buffer_fixed, 1);
    var _status = ev_sim_metrics_for_tag(_handle, _tag, buffer_get_address(_buf));
    if (_status != 0) {
        buffer_delete(_buf);
        return undefined;
    }
    var _result = ev_tagged_metric_decode(_buf, 0);
    buffer_delete(_buf);
    return _result;
}

// ── Snapshot reads for struct buffers ───────────────────────────────
//
// `ev_sim_hall_calls_snapshot`, `ev_sim_car_calls_snapshot`, and
// `ev_sim_assigned_cars_by_line` are all-or-nothing: they pre-check
// `needed > capacity` and return `InvalidArg` (no partial writes) if
// the buffer is too small. The chunked-drain loop used for
// `ev_drain_events_into_array` doesn't apply — instead we probe with
// `capacity = 0` first (the FFI writes the required count to
// `*out_written` and returns `InvalidArg` silently for that case),
// then allocate exactly the right buffer and call again.

/// Probe-then-call helper for struct-buffer FFI accessors with
/// all-or-nothing semantics. `_call_fn(_handle, _addr_buf, _capacity,
/// _addr_written)` is invoked twice: once with capacity=0 to read the
/// required count, once with the right-sized buffer. Use `method` to
/// bind any extra leading arguments (see
/// `ev_sim_car_calls_snapshot_into_array` for the pattern).
function ev_snapshot_struct_buffer(_handle, _call_fn, _struct_size, _decode_fn) {
    var _written_buf = buffer_create(4, buffer_fixed, 1);
    var _addr_written = buffer_get_address(_written_buf);

    // Probe pass: capacity=0 with null out pointer is the documented
    // size-query form. The FFI writes the needed count to *out_written
    // and returns InvalidArg silently when capacity == 0.
    _call_fn(_handle, 0, 0, _addr_written);
    var _needed = buffer_peek(_written_buf, 0, buffer_u32);
    if (_needed == 0) {
        buffer_delete(_written_buf);
        return [];
    }

    var _buf = buffer_create(_struct_size * _needed, buffer_fixed, 1);
    var _addr_buf = buffer_get_address(_buf);
    var _status = _call_fn(_handle, _addr_buf, _needed, _addr_written);

    var _out = [];
    if (_status == 0) {
        var _written = buffer_peek(_written_buf, 0, buffer_u32);
        for (var i = 0; i < _written; i++) {
            array_push(_out, _decode_fn(_buf, i * _struct_size));
        }
    }
    buffer_delete(_buf);
    buffer_delete(_written_buf);
    return _out;
}

/// Snapshot of every active hall call. Returns a GML array of decoded
/// EvHallCall structs (empty on failure or when no hall calls are
/// pending).
function ev_sim_hall_calls_snapshot_into_array(_handle) {
    return ev_snapshot_struct_buffer(_handle, ev_sim_hall_calls_snapshot,
                                     EV_HALL_CALL_SIZE, ev_hall_call_decode);
}

/// Snapshot of every car call pressed inside `_elevator_entity_id`.
/// Returns a GML array of decoded EvCarCall structs.
function ev_sim_car_calls_snapshot_into_array(_handle, _elevator_entity_id) {
    var _elev = _elevator_entity_id;
    var _bound = method({ elev: _elev }, function(_h, _addr, _cap, _addr_written) {
        return ev_sim_car_calls_snapshot(_h, elev, _addr, _cap, _addr_written);
    });
    return ev_snapshot_struct_buffer(_handle, _bound,
                                     EV_CAR_CALL_SIZE, ev_car_call_decode);
}

/// `(line, car)` assignments on the hall call at `_stop_entity_id`.
/// Returns a GML array of decoded EvAssignment structs (one per line
/// serving the stop in DCS mode; usually 0 or 1 entry).
function ev_sim_assigned_cars_by_line_into_array(_handle, _stop_entity_id) {
    var _stop = _stop_entity_id;
    var _bound = method({ stop: _stop }, function(_h, _addr, _cap, _addr_written) {
        return ev_sim_assigned_cars_by_line(_h, stop, _addr, _cap, _addr_written);
    });
    return ev_snapshot_struct_buffer(_handle, _bound,
                                     EV_ASSIGNMENT_SIZE, ev_assignment_decode);
}
