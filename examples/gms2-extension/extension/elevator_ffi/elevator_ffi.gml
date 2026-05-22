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

// ── Struct decoders for other repr-C types ──────────────────────────
//
// EvFrame, EvElevatorView, EvStopView, EvRiderView, EvHallCall,
// EvCarCall, EvMetrics, EvAssignment, EvTaggedMetric — extend as
// needed following the EvLogMessage / EvEvent pattern above. The byte
// layouts are auto-generated in elevator_ffi_layout.gml; the C harness
// in examples/gms2-harness/main.c asserts every offset against
// cbindgen's header so a future drift fails CI before this file is
// touched.
