/* @ts-self-types="./elevator_wasm.d.ts" */

/**
 * Opaque simulation handle for JS.
 */
export class WasmSim {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmSim.prototype);
        obj.__wbg_ptr = ptr;
        WasmSimFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmSimFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmsim_free(ptr, 0);
    }
    /**
     * Riders who abandoned the call at `stop_ref` (gave up waiting).
     * Useful for rendering "frustrated" indicators or computing service
     * quality metrics. Returns an empty array for missing stops.
     * @param {bigint} stop_ref
     * @returns {BigUint64Array}
     */
    abandonedAt(stop_ref) {
        const ret = wasm.wasmsim_abandonedAt(this.__wbg_ptr, stop_ref);
        var v1 = getArrayU64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * Number of abandoned riders at `stop_ref`. Faster than counting
     * `abandonedAt`.
     * @param {bigint} stop_ref
     * @returns {number}
     */
    abandonedCountAt(stop_ref) {
        const ret = wasm.wasmsim_abandonedCountAt(this.__wbg_ptr, stop_ref);
        return ret >>> 0;
    }
    /**
     * Abort the elevator's in-flight movement. The car decelerates to
     * the nearest reachable stop; subsequent dispatch / queue entries
     * resume from there.
     *
     * # Errors
     *
     * Returns a JS error if `elevator_ref` is not an elevator.
     * @param {bigint} elevator_ref
     * @returns {WasmVoidResult}
     */
    abortMovement(elevator_ref) {
        const ret = wasm.wasmsim_abortMovement(this.__wbg_ptr, elevator_ref);
        return ret;
    }
    /**
     * Add a new elevator to a line at `starting_position`. Optional
     * physics overrides; defaults match `ElevatorParams::default`.
     * Returns the elevator entity ref.
     *
     * # Errors
     *
     * Returns a JS error if the line does not exist, the position is
     * non-finite, the physics are invalid, or the line's `max_cars` is
     * already reached.
     * @param {bigint} line_ref
     * @param {number} starting_position
     * @param {number | null} [max_speed]
     * @param {number | null} [weight_capacity]
     * @returns {WasmU64Result}
     */
    addElevator(line_ref, starting_position, max_speed, weight_capacity) {
        const ret = wasm.wasmsim_addElevator(this.__wbg_ptr, line_ref, starting_position, !isLikeNone(max_speed), isLikeNone(max_speed) ? 0 : max_speed, !isLikeNone(weight_capacity), isLikeNone(weight_capacity) ? 0 : weight_capacity);
        return ret;
    }
    /**
     * Add a new dispatch group with the given name and strategy.
     * Returns the group ID as a `u32` (groups have flat numeric IDs).
     *
     * # Errors
     *
     * Returns a JS error if `dispatch_strategy` is not a recognised name
     * (`"scan" | "look" | "nearest" | "etd" | "destination" | "rsr"`).
     * @param {string} name
     * @param {string} dispatch_strategy
     * @returns {WasmU32Result}
     */
    addGroup(name, dispatch_strategy) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(dispatch_strategy, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_addGroup(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return ret;
    }
    /**
     * Add a new line to an existing group. Returns the line entity ref.
     *
     * # Errors
     *
     * Returns a JS error if the group does not exist or the range is
     * non-finite or inverted.
     * @param {number} group_id
     * @param {string} name
     * @param {number} min_position
     * @param {number} max_position
     * @param {number | null} [max_cars]
     * @returns {WasmU64Result}
     */
    addLine(group_id, name, min_position, max_position, max_cars) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_addLine(this.__wbg_ptr, group_id, ptr0, len0, min_position, max_position, isLikeNone(max_cars) ? 0x100000001 : (max_cars) >>> 0);
        return ret;
    }
    /**
     * Add a stop to a line at the given position. Returns the stop
     * entity ref.
     *
     * # Errors
     *
     * Returns a JS error if the line does not exist or the position is
     * non-finite.
     * @param {bigint} line_ref
     * @param {string} name
     * @param {number} position
     * @returns {WasmU64Result}
     */
    addStop(line_ref, name, position) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_addStop(this.__wbg_ptr, line_ref, ptr0, len0, position);
        return ret;
    }
    /**
     * Add an existing stop entity to a line's served list. The stop
     * must already exist (via `addStop` on some line, or from config).
     *
     * # Errors
     *
     * Returns a JS error if the stop or line entity does not exist.
     * @param {bigint} stop_ref
     * @param {bigint} line_ref
     * @returns {WasmVoidResult}
     */
    addStopToLine(stop_ref, line_ref) {
        const ret = wasm.wasmsim_addStopToLine(this.__wbg_ptr, stop_ref, line_ref);
        return ret;
    }
    /**
     * Entity ids of every line in the simulation, across all groups.
     * @returns {BigUint64Array}
     */
    allLines() {
        const ret = wasm.wasmsim_allLines(this.__wbg_ptr);
        var v1 = getArrayU64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * Every tag currently registered in the simulation.
     * @returns {string[]}
     */
    allTags() {
        const ret = wasm.wasmsim_allTags(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Reassign a line to a different group. Returns the previous group
     * id so the caller can detect a no-op (returned id == passed id).
     *
     * # Errors
     *
     * Returns a JS error if the line does not exist or `new_group_id`
     * is not a valid group.
     * @param {bigint} line_ref
     * @param {number} new_group_id
     * @returns {WasmU32Result}
     */
    assignLineToGroup(line_ref, new_group_id) {
        const ret = wasm.wasmsim_assignLineToGroup(this.__wbg_ptr, line_ref, new_group_id);
        return ret;
    }
    /**
     * Car currently assigned to serve the call at `(stop_ref, direction)`,
     * or `0` (slotmap-null) if none. At stops served by multiple lines
     * this returns the entry with the numerically smallest line-entity
     * key (stable across ticks).
     *
     * # Errors
     *
     * Returns a JS error if `direction` is not `"up"` / `"down"`.
     * @param {bigint} stop_ref
     * @param {string} direction
     * @returns {WasmU64Result}
     */
    assignedCar(stop_ref, direction) {
        const ptr0 = passStringToWasm0(direction, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_assignedCar(this.__wbg_ptr, stop_ref, ptr0, len0);
        return ret;
    }
    /**
     * Per-line cars assigned to the call at `(stop_ref, direction)`.
     * Returns a flat array of alternating `[line_ref, car_ref, ...]`
     * pairs. Empty when dispatch has no assignments yet.
     *
     * Iteration order is stable by line-entity id (`BTreeMap`).
     *
     * # Errors
     *
     * Returns a JS error if `direction` is not `"up"` / `"down"`.
     * @param {bigint} stop_ref
     * @param {string} direction
     * @returns {BigUint64Array}
     */
    assignedCarsByLine(stop_ref, direction) {
        const ptr0 = passStringToWasm0(direction, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_assignedCarsByLine(this.__wbg_ptr, stop_ref, ptr0, len0);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v2 = getArrayU64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v2;
    }
    /**
     * Best ETA (ticks) to `stop_ref` across every dispatch-eligible
     * elevator, optionally filtered by indicator-lamp `direction`
     * (`"up"` / `"down"` / `"either"`). Returns a flat
     * `[elevator_ref, eta_ticks]` pair, or an empty array if no
     * eligible car has the stop queued.
     *
     * # Errors
     *
     * Returns a JS error if `direction` is not `"up"` / `"down"` /
     * `"either"`.
     * @param {bigint} stop_ref
     * @param {string} direction
     * @returns {BigUint64Array}
     */
    bestEta(stop_ref, direction) {
        const ptr0 = passStringToWasm0(direction, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_bestEta(this.__wbg_ptr, stop_ref, ptr0, len0);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v2 = getArrayU64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v2;
    }
    /**
     * Distance `elevator_ref` would travel if it began decelerating
     * from its current velocity at its configured deceleration rate.
     * Returns `undefined` for missing entities or stationary cars.
     * @param {bigint} elevator_ref
     * @returns {number | undefined}
     */
    brakingDistance(elevator_ref) {
        const ret = wasm.wasmsim_brakingDistance(this.__wbg_ptr, elevator_ref);
        return ret[0] === 0 ? undefined : ret[1];
    }
    /**
     * Cancel any pending hold extension on the doors.
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist or is disabled.
     * @param {bigint} elevator_ref
     * @returns {WasmVoidResult}
     */
    cancelDoorHold(elevator_ref) {
        const ret = wasm.wasmsim_cancelDoorHold(this.__wbg_ptr, elevator_ref);
        return ret;
    }
    /**
     * Snapshot of car-button presses inside `elevator_ref`. Returns
     * an empty array if the elevator has no aboard riders or has not
     * been used.
     * @param {bigint} elevator_ref
     * @returns {CarCallDto[]}
     */
    carCalls(elevator_ref) {
        const ret = wasm.wasmsim_carCalls(this.__wbg_ptr, elevator_ref);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Empty an elevator's destination queue. Any in-progress trip
     * continues to its current target (the queue is the *future*
     * schedule); to also abort the in-flight trip, call
     * `abortMovement` after.
     *
     * # Errors
     *
     * Returns a JS error if `elevator_ref` is not an elevator.
     * @param {bigint} elevator_ref
     * @returns {WasmVoidResult}
     */
    clearDestinations(elevator_ref) {
        const ret = wasm.wasmsim_clearDestinations(this.__wbg_ptr, elevator_ref);
        return ret;
    }
    /**
     * Remove an elevator's home-stop pin. Reposition decisions return
     * to the group's reposition strategy. Idempotent.
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist.
     * @param {bigint} elevator_ref
     * @returns {WasmVoidResult}
     */
    clearElevatorHomeStop(elevator_ref) {
        const ret = wasm.wasmsim_clearElevatorHomeStop(this.__wbg_ptr, elevator_ref);
        return ret;
    }
    /**
     * Request the doors to close now. Forces an early close unless a
     * rider is mid-boarding/exiting.
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist or is disabled.
     * @param {bigint} elevator_ref
     * @returns {WasmVoidResult}
     */
    closeDoor(elevator_ref) {
        const ret = wasm.wasmsim_closeDoor(this.__wbg_ptr, elevator_ref);
        return ret;
    }
    /**
     * Current tick counter.
     * @returns {bigint}
     */
    currentTick() {
        const ret = wasm.wasmsim_currentTick(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
    /**
     * Despawn a rider mid-flight. The rider is ejected from any
     * boarding car and dropped from the world.
     *
     * # Errors
     *
     * Returns a JS error if `rider_ref` is not a rider entity.
     * @param {bigint} rider_ref
     * @returns {WasmVoidResult}
     */
    despawnRider(rider_ref) {
        const ret = wasm.wasmsim_despawnRider(this.__wbg_ptr, rider_ref);
        return ret;
    }
    /**
     * Snapshot of `elevator_ref`'s destination queue as a `Vec<u64>` of
     * stop refs in service order. Empty if the elevator has no queue or
     * is missing.
     * @param {bigint} elevator_ref
     * @returns {BigUint64Array}
     */
    destinationQueue(elevator_ref) {
        const ret = wasm.wasmsim_destinationQueue(this.__wbg_ptr, elevator_ref);
        var v1 = getArrayU64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * Disable an entity (elevator or stop). Disabled elevators eject
     * their riders and are excluded from dispatch; disabled stops
     * invalidate routes that reference them.
     *
     * # Errors
     *
     * Returns a JS error if `entity_ref` does not exist.
     * @param {bigint} entity_ref
     * @returns {WasmVoidResult}
     */
    disable(entity_ref) {
        const ret = wasm.wasmsim_disable(this.__wbg_ptr, entity_ref);
        return ret;
    }
    /**
     * Drain all queued events since the last call.
     * @returns {EventDto[]}
     */
    drainEvents() {
        const ret = wasm.wasmsim_drainEvents(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Tick duration in seconds.
     * @returns {number}
     */
    dt() {
        const ret = wasm.wasmsim_dt(this.__wbg_ptr);
        return ret;
    }
    /**
     * Indicator-lamp direction of `elevator_ref`: `"up"`, `"down"`, or
     * `"either"` (idle / no committed direction). Returns `undefined`
     * for missing entities.
     * @param {bigint} elevator_ref
     * @returns {string | undefined}
     */
    elevatorDirection(elevator_ref) {
        const ret = wasm.wasmsim_elevatorDirection(this.__wbg_ptr, elevator_ref);
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * Whether `elevator_ref` is currently committed downward. Returns
     * `undefined` for missing entities.
     * @param {bigint} elevator_ref
     * @returns {boolean | undefined}
     */
    elevatorGoingDown(elevator_ref) {
        const ret = wasm.wasmsim_elevatorGoingDown(this.__wbg_ptr, elevator_ref);
        return ret === 0xFFFFFF ? undefined : ret !== 0;
    }
    /**
     * Whether `elevator_ref` is currently committed upward. Returns
     * `undefined` for missing entities. A car that's `Either`-direction
     * reports `false` here and `false` in `elevatorGoingDown`.
     * @param {bigint} elevator_ref
     * @returns {boolean | undefined}
     */
    elevatorGoingUp(elevator_ref) {
        const ret = wasm.wasmsim_elevatorGoingUp(this.__wbg_ptr, elevator_ref);
        return ret === 0xFFFFFF ? undefined : ret !== 0;
    }
    /**
     * Read the home-stop pin for an elevator. Returns `0n` when the
     * car has no pin set; otherwise the stop entity ref.
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist.
     * @param {bigint} elevator_ref
     * @returns {WasmU64Result}
     */
    elevatorHomeStop(elevator_ref) {
        const ret = wasm.wasmsim_elevatorHomeStop(this.__wbg_ptr, elevator_ref);
        return ret;
    }
    /**
     * Fraction of `elevator_ref`'s capacity currently occupied (by weight),
     * in `[0.0, 1.0]`. Returns `undefined` for missing entities.
     * @param {bigint} elevator_ref
     * @returns {number | undefined}
     */
    elevatorLoad(elevator_ref) {
        const ret = wasm.wasmsim_elevatorLoad(this.__wbg_ptr, elevator_ref);
        return ret[0] === 0 ? undefined : ret[1];
    }
    /**
     * Total number of completed trips by `elevator_ref` since spawn.
     * Returns `undefined` for missing entities.
     * @param {bigint} elevator_ref
     * @returns {bigint | undefined}
     */
    elevatorMoveCount(elevator_ref) {
        const ret = wasm.wasmsim_elevatorMoveCount(this.__wbg_ptr, elevator_ref);
        return ret[0] === 0 ? undefined : BigInt.asUintN(64, ret[1]);
    }
    /**
     * Count elevators currently in the given phase. `phase` is one of:
     * `"idle"`, `"door-opening"`, `"loading"`, `"door-closing"`,
     * `"stopped"`. The two with payload variants
     * (`MovingToStop(EntityId)` and `Repositioning(EntityId)`) are
     * not exposed here — use `iterRepositioningElevators` or the per-
     * elevator phase via the snapshot for those.
     *
     * # Errors
     *
     * Returns a JS error if `phase` is not one of the supported labels.
     * @param {string} phase
     * @returns {WasmU32Result}
     */
    elevatorsInPhase(phase) {
        const ptr0 = passStringToWasm0(phase, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_elevatorsInPhase(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * Entity ids of all elevators currently assigned to `line_ref`.
     * @param {bigint} line_ref
     * @returns {BigUint64Array}
     */
    elevatorsOnLine(line_ref) {
        const ret = wasm.wasmsim_elevatorsOnLine(this.__wbg_ptr, line_ref);
        var v1 = getArrayU64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * Command an immediate stop on a Manual-mode elevator. Sets the
     * target velocity to zero and emits a distinct event so games can
     * distinguish an emergency stop from a deliberate hold.
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist or is not in
     * Manual mode.
     * @param {bigint} elevator_ref
     * @returns {WasmVoidResult}
     */
    emergencyStop(elevator_ref) {
        const ret = wasm.wasmsim_emergencyStop(this.__wbg_ptr, elevator_ref);
        return ret;
    }
    /**
     * Construct an effectively-empty simulation with no stops,
     * elevators, or lines. Internally constructs from a tiny seed
     * config (one stop, one elevator) to satisfy
     * [`Simulation::new`]'s non-empty validation, then removes the
     * seed entities before returning. The default (auto-created)
     * group remains — `Simulation` requires at least one group
     * to exist; consumers typically add their own groups via
     * [`addGroup`](Self::add_group) on top.
     *
     * Useful for consumers that build the building topology
     * dynamically at runtime (e.g. game engines where the player
     * edits the floor plan) and don't want the seed-and-ignore
     * boilerplate.
     *
     * # Errors
     *
     * Returns a JS error if `strategy` is not a recognised built-in.
     * The internal seed config is well-formed by construction.
     * @param {string} strategy
     * @param {string | null} [reposition]
     * @returns {WasmSim}
     */
    static empty(strategy, reposition) {
        const ptr0 = passStringToWasm0(strategy, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(reposition) ? 0 : passStringToWasm0(reposition, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_empty(ptr0, len0, ptr1, len1);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return WasmSim.__wrap(ret[0]);
    }
    /**
     * Re-enable a previously-disabled entity (elevator or stop).
     *
     * # Errors
     *
     * Returns a JS error if `entity_ref` does not exist.
     * @param {bigint} entity_ref
     * @returns {WasmVoidResult}
     */
    enable(entity_ref) {
        const ret = wasm.wasmsim_enable(this.__wbg_ptr, entity_ref);
        return ret;
    }
    /**
     * Estimated ticks remaining before `car_ref` reaches `stop_ref`.
     *
     * Includes any in-progress door cycle, intermediate stops in the
     * car's destination queue, and the trapezoidal travel time for each
     * leg. Returns ticks rather than seconds so consumers can compare
     * with `currentTick`.
     *
     * # Errors
     *
     * Returns a JS error if the elevator/stop does not exist, the
     * elevator is in a service mode excluded from dispatch, or `stop`
     * is not in the car's destination queue.
     * @param {bigint} car_ref
     * @param {bigint} stop_ref
     * @returns {WasmU64Result}
     */
    eta(car_ref, stop_ref) {
        const ret = wasm.wasmsim_eta(this.__wbg_ptr, car_ref, stop_ref);
        return ret;
    }
    /**
     * Estimated ticks remaining before the assigned car reaches the
     * call at `(stop_ref, direction)`.
     *
     * # Errors
     *
     * Returns a JS error if no hall call exists at `(stop, direction)`,
     * no car is assigned to it, the assigned car has no positional
     * data, or `direction` is not `"up"` / `"down"`.
     * @param {bigint} stop_ref
     * @param {string} direction
     * @returns {WasmU64Result}
     */
    etaForCall(stop_ref, direction) {
        const ptr0 = passStringToWasm0(direction, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_etaForCall(this.__wbg_ptr, stop_ref, ptr0, len0);
        return ret;
    }
    /**
     * Find the stop entity at `position` that's served by `line_ref`,
     * or `0` (slotmap-null) if none. Lets consumers disambiguate
     * co-located stops on different lines (sky-lobby served by
     * multiple banks, parallel shafts at the same physical floor)
     * without offset hacks.
     * @param {number} position
     * @param {bigint} line_ref
     * @returns {bigint}
     */
    findStopAtPositionOnLine(position, line_ref) {
        const ret = wasm.wasmsim_findStopAtPositionOnLine(this.__wbg_ptr, position, line_ref);
        return BigInt.asUintN(64, ret);
    }
    /**
     * Reconstruct a `WasmSim` from postcard bytes produced by
     * [`Self::snapshot_bytes`].
     *
     * The `strategy` and `reposition` arguments restore wrapper-side
     * labels not stored in the snapshot envelope (the underlying
     * `Simulation` already auto-restores its built-in dispatch and
     * reposition strategies from the postcard payload). Pass the same
     * values used at original [`Self::new`] construction.
     *
     * `traffic_rate` resets to `0.0` on restore — callers that drive
     * arrivals externally (the tower-together case) don't use this
     * field; callers using built-in traffic should re-call
     * `setTrafficRate` after restore.
     *
     * # Errors
     *
     * Returns a JS error if the bytes are not a valid envelope, the
     * crate version differs, the snapshot references a custom dispatch
     * strategy (only built-in strategies are supported by this wrapper
     * — use the Rust API directly for custom strategies), or
     * `strategy` is not a recognised built-in name (matching the
     * `new()` constructor's contract so `strategyName()` always holds
     * a known label).
     * @param {Uint8Array} bytes
     * @param {string} strategy
     * @param {string | null} [reposition]
     * @returns {WasmSim}
     */
    static fromSnapshotBytes(bytes, strategy, reposition) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(strategy, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        var ptr2 = isLikeNone(reposition) ? 0 : passStringToWasm0(reposition, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len2 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_fromSnapshotBytes(ptr0, len0, ptr1, len1, ptr2, len2);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return WasmSim.__wrap(ret[0]);
    }
    /**
     * Position of the next stop in `elevator_ref`'s destination queue,
     * or current target if mid-trip. Returns `undefined` if the queue
     * is empty or the entity is not an elevator.
     * @param {bigint} elevator_ref
     * @returns {number | undefined}
     */
    futureStopPosition(elevator_ref) {
        const ret = wasm.wasmsim_futureStopPosition(this.__wbg_ptr, elevator_ref);
        return ret[0] === 0 ? undefined : ret[1];
    }
    /**
     * Group ids of every group with a line that serves `stop_ref`.
     * @param {bigint} stop_ref
     * @returns {Uint32Array}
     */
    groupsServingStop(stop_ref) {
        const ret = wasm.wasmsim_groupsServingStop(this.__wbg_ptr, stop_ref);
        var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Snapshot of every active hall call. Returns one `HallCallDto`
     * per live `(stop, direction)` press.
     * @returns {HallCallDto[]}
     */
    hallCalls() {
        const ret = wasm.wasmsim_hallCalls(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Extend the doors' open dwell by `ticks`. Cumulative across calls.
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist, is disabled,
     * or `ticks` is zero.
     * @param {bigint} elevator_ref
     * @param {number} ticks
     * @returns {WasmVoidResult}
     */
    holdDoor(elevator_ref, ticks) {
        const ret = wasm.wasmsim_holdDoor(this.__wbg_ptr, elevator_ref, ticks);
        return ret;
    }
    /**
     * Total number of currently-idle elevators across the simulation.
     * "Idle" = phase is `Idle` (not parked at a stop with riders or
     * repositioning).
     * @returns {number}
     */
    idleElevatorCount() {
        const ret = wasm.wasmsim_idleElevatorCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Whether `entity_ref` is currently disabled (out of service / not
     * participating in dispatch). Returns `false` for nonexistent
     * entities — distinguish via `isElevator` / `isStop` first.
     * @param {bigint} entity_ref
     * @returns {boolean}
     */
    isDisabled(entity_ref) {
        const ret = wasm.wasmsim_isDisabled(this.__wbg_ptr, entity_ref);
        return ret !== 0;
    }
    /**
     * Whether `entity_ref` resolves to an elevator entity in the world.
     * @param {bigint} entity_ref
     * @returns {boolean}
     */
    isElevator(entity_ref) {
        const ret = wasm.wasmsim_isElevator(this.__wbg_ptr, entity_ref);
        return ret !== 0;
    }
    /**
     * Whether `entity_ref` resolves to a rider entity in the world.
     * @param {bigint} entity_ref
     * @returns {boolean}
     */
    isRider(entity_ref) {
        const ret = wasm.wasmsim_isRider(this.__wbg_ptr, entity_ref);
        return ret !== 0;
    }
    /**
     * Whether `entity_ref` resolves to a stop entity in the world.
     * @param {bigint} entity_ref
     * @returns {boolean}
     */
    isStop(entity_ref) {
        const ret = wasm.wasmsim_isStop(this.__wbg_ptr, entity_ref);
        return ret !== 0;
    }
    /**
     * Entity ids of every elevator currently repositioning (heading to
     * a parking stop with no rider obligation).
     * @returns {BigUint64Array}
     */
    iterRepositioningElevators() {
        const ret = wasm.wasmsim_iterRepositioningElevators(this.__wbg_ptr);
        var v1 = getArrayU64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * Total number of lines across all groups.
     * @returns {number}
     */
    lineCount() {
        const ret = wasm.wasmsim_lineCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Line entity that `elevator_ref` runs on, or `0` (slotmap-null)
     * if missing or not an elevator.
     * @param {bigint} elevator_ref
     * @returns {bigint}
     */
    lineForElevator(elevator_ref) {
        const ret = wasm.wasmsim_lineForElevator(this.__wbg_ptr, elevator_ref);
        return BigInt.asUintN(64, ret);
    }
    /**
     * Entity ids of every line in `group_id`. Empty if the group does
     * not exist.
     * @param {number} group_id
     * @returns {BigUint64Array}
     */
    linesInGroup(group_id) {
        const ret = wasm.wasmsim_linesInGroup(this.__wbg_ptr, group_id);
        var v1 = getArrayU64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * Entity ids of every line that serves `stop_ref`. Useful for
     * disambiguating sky-lobby calls served by multiple banks.
     * @param {bigint} stop_ref
     * @returns {BigUint64Array}
     */
    linesServingStop(stop_ref) {
        const ret = wasm.wasmsim_linesServingStop(this.__wbg_ptr, stop_ref);
        var v1 = getArrayU64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * Current aggregate metrics.
     * @returns {MetricsDto}
     */
    metrics() {
        const ret = wasm.wasmsim_metrics(this.__wbg_ptr);
        return ret;
    }
    /**
     * Aggregate metrics for `tag`. Returns `undefined` if no riders
     * carrying the tag have been recorded yet.
     *
     * Wait times in the returned `TaggedMetricDto` are in **ticks** —
     * multiply by `dt` for real-time seconds.
     * @param {string} tag
     * @returns {TaggedMetricDto | undefined}
     */
    metricsForTag(tag) {
        const ptr0 = passStringToWasm0(tag, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_metricsForTag(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * Construct a new simulation from a RON-encoded [`SimConfig`] and a
     * dispatch strategy name (`"scan" | "look" | "nearest" | "etd" | "destination"`).
     *
     * # Errors
     *
     * Returns a JS error if the RON fails to parse, the config fails
     * validation, or `strategy` is not a recognised built-in.
     * @param {string} config_ron
     * @param {string} strategy
     * @param {string | null} [reposition]
     */
    constructor(config_ron, strategy, reposition) {
        const ptr0 = passStringToWasm0(config_ron, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(strategy, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        var ptr2 = isLikeNone(reposition) ? 0 : passStringToWasm0(reposition, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len2 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_new(ptr0, len0, ptr1, len1, ptr2, len2);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        WasmSimFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Number of riders currently aboard `elevator_ref`. Returns `0` for
     * missing entities (`Simulation::occupancy` returns 0 for both
     * "not an elevator" and "empty cab" — distinguish via `isElevator`).
     * @param {bigint} elevator_ref
     * @returns {number}
     */
    occupancy(elevator_ref) {
        const ret = wasm.wasmsim_occupancy(this.__wbg_ptr, elevator_ref);
        return ret >>> 0;
    }
    /**
     * Request the doors of an elevator to open. Applied immediately at a
     * stopped car with closed/closing doors; otherwise queued.
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist or is disabled.
     * @param {bigint} elevator_ref
     * @returns {WasmVoidResult}
     */
    openDoor(elevator_ref) {
        const ret = wasm.wasmsim_openDoor(this.__wbg_ptr, elevator_ref);
        return ret;
    }
    /**
     * Peek at queued events without draining. Useful for read-only
     * inspection (e.g. UI dashboards) where the consumer doesn't
     * "own" the event stream.
     * @returns {EventDto[]}
     */
    pendingEvents() {
        const ret = wasm.wasmsim_pendingEvents(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Pin the call at `(stop_ref, direction)` to `car_ref`, locking it
     * out of dispatch reassignment.
     *
     * # Errors
     *
     * Returns a JS error if the elevator/stop does not exist, the line
     * does not serve the stop, no hall call exists at that
     * `(stop, direction)`, or `direction` is not `"up"` / `"down"`.
     * @param {bigint} car_ref
     * @param {bigint} stop_ref
     * @param {string} direction
     * @returns {WasmVoidResult}
     */
    pinAssignment(car_ref, stop_ref, direction) {
        const ptr0 = passStringToWasm0(direction, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_pinAssignment(this.__wbg_ptr, car_ref, stop_ref, ptr0, len0);
        return ret;
    }
    /**
     * Sub-tick interpolated position of `entity_ref` for smooth render
     * frames. `alpha` is in `[0.0, 1.0]` — `0.0` = current tick,
     * `1.0` = next tick. Returns `undefined` if the entity has no
     * position component.
     * @param {bigint} entity_ref
     * @param {number} alpha
     * @returns {number | undefined}
     */
    positionAt(entity_ref, alpha) {
        const ret = wasm.wasmsim_positionAt(this.__wbg_ptr, entity_ref, alpha);
        return ret[0] === 0 ? undefined : ret[1];
    }
    /**
     * Batched variant of [`Self::position_at`]: writes the
     * interpolated position of each `entity_ref` in `refs` into the
     * matching slot of `out`, in one wasm-bindgen crossing.
     *
     * Designed for renderers that read N elevator positions per
     * frame and want to avoid the per-call boundary overhead of
     * calling `positionAt` in a loop. Entities without a position
     * component get `f64::NAN` written to their slot — caller can
     * `Number.isNaN(slot)` to detect.
     *
     * Both `refs` and `out` are zero-copy views of the JS caller's
     * typed arrays (`BigUint64Array` and `Float64Array` respectively).
     * wasm-bindgen does not allocate or copy on the boundary, so
     * this stays cheap to call every render frame.
     *
     * Returns the number of entries written, which is
     * `min(refs.len(), out.len())`. Callers can reuse a scratch
     * buffer larger than the current frame's elevator count without
     * re-reading lengths; when `out` is shorter than `refs`, only
     * `out.len()` entries are written and the remaining refs are
     * silently skipped — caller is responsible for sizing `out` at
     * least as large as `refs` if they want every position read.
     * @param {BigUint64Array} refs
     * @param {number} alpha
     * @param {Float64Array} out
     * @returns {number}
     */
    positionsAtPacked(refs, alpha, out) {
        const ptr0 = passArray64ToWasm0(refs, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = passArrayF64ToWasm0(out, wasm.__wbindgen_malloc);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_positionsAtPacked(this.__wbg_ptr, ptr0, len0, alpha, ptr1, len1, out);
        return ret >>> 0;
    }
    /**
     * Press a car-button (in-cab floor request) targeting `stop_ref`.
     *
     * # Errors
     *
     * Returns a JS error if the elevator or stop does not exist.
     * @param {bigint} elevator_ref
     * @param {bigint} stop_ref
     * @returns {WasmVoidResult}
     */
    pressCarButton(elevator_ref, stop_ref) {
        const ret = wasm.wasmsim_pressCarButton(this.__wbg_ptr, elevator_ref, stop_ref);
        return ret;
    }
    /**
     * Press a hall call at a stop with direction `"up"` or `"down"`.
     *
     * # Errors
     *
     * Returns a JS error if the stop does not exist or `direction` is
     * not `"up"` or `"down"`.
     * @param {bigint} stop_ref
     * @param {string} direction
     * @returns {WasmVoidResult}
     */
    pressHallCall(stop_ref, direction) {
        const ptr0 = passStringToWasm0(direction, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_pressHallCall(this.__wbg_ptr, stop_ref, ptr0, len0);
        return ret;
    }
    /**
     * Append `stop_ref` to the back of `elevator_ref`'s destination queue.
     * Adjacent duplicates are suppressed (no-op if the queue's last
     * entry already equals `stop_ref`).
     *
     * # Errors
     *
     * Returns a JS error if `elevator_ref` is not an elevator or
     * `stop_ref` is not a stop.
     * @param {bigint} elevator_ref
     * @param {bigint} stop_ref
     * @returns {WasmVoidResult}
     */
    pushDestination(elevator_ref, stop_ref) {
        const ret = wasm.wasmsim_pushDestination(this.__wbg_ptr, elevator_ref, stop_ref);
        return ret;
    }
    /**
     * Insert `stop_ref` at the front of `elevator_ref`'s destination
     * queue ("go here next"). On the next `AdvanceQueue` phase the car
     * redirects to this new front if it differs from the current target.
     *
     * # Errors
     *
     * Returns a JS error if `elevator_ref` is not an elevator or
     * `stop_ref` is not a stop.
     * @param {bigint} elevator_ref
     * @param {bigint} stop_ref
     * @returns {WasmVoidResult}
     */
    pushDestinationFront(elevator_ref, stop_ref) {
        const ret = wasm.wasmsim_pushDestinationFront(this.__wbg_ptr, elevator_ref, stop_ref);
        return ret;
    }
    /**
     * Stops reachable from `from_stop` via the line-graph (BFS through
     * shared elevators). Excludes `from_stop` itself.
     * @param {bigint} from_stop_ref
     * @returns {BigUint64Array}
     */
    reachableStopsFrom(from_stop_ref) {
        const ret = wasm.wasmsim_reachableStopsFrom(this.__wbg_ptr, from_stop_ref);
        var v1 = getArrayU64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * Reassign an elevator to a different line. Disabled cars stay
     * disabled; in-flight cars are aborted to the nearest reachable
     * stop on the new line.
     *
     * # Errors
     *
     * Returns a JS error if the elevator or new line does not exist.
     * @param {bigint} elevator_ref
     * @param {bigint} new_line_ref
     * @returns {WasmVoidResult}
     */
    reassignElevatorToLine(elevator_ref, new_line_ref) {
        const ret = wasm.wasmsim_reassignElevatorToLine(this.__wbg_ptr, elevator_ref, new_line_ref);
        return ret;
    }
    /**
     * Clear the queue and immediately recall the elevator to `stop_ref`.
     * Equivalent to `clearDestinations` + `pushDestination(stop_ref)`,
     * emitted as a single `ElevatorRecalled` event so games can render a
     * distinct callout (lobby drill, fire-service recall, etc.).
     *
     * # Errors
     *
     * Returns a JS error if `elevator_ref` is not an elevator or
     * `stop_ref` is not a stop.
     * @param {bigint} elevator_ref
     * @param {bigint} stop_ref
     * @returns {WasmVoidResult}
     */
    recallTo(elevator_ref, stop_ref) {
        const ret = wasm.wasmsim_recallTo(this.__wbg_ptr, elevator_ref, stop_ref);
        return ret;
    }
    /**
     * Remove an elevator (riders ejected to the nearest enabled stop).
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist.
     * @param {bigint} elevator_ref
     * @returns {WasmVoidResult}
     */
    removeElevator(elevator_ref) {
        const ret = wasm.wasmsim_removeElevator(this.__wbg_ptr, elevator_ref);
        return ret;
    }
    /**
     * Remove a line and all its elevators (riders ejected to nearest stop).
     *
     * # Errors
     *
     * Returns a JS error if the line does not exist.
     * @param {bigint} line_ref
     * @returns {WasmVoidResult}
     */
    removeLine(line_ref) {
        const ret = wasm.wasmsim_removeLine(this.__wbg_ptr, line_ref);
        return ret;
    }
    /**
     * Remove the reposition strategy from `group_id`. Idle elevators
     * stay where they parked instead of moving toward a target.
     * @param {number} group_id
     */
    removeReposition(group_id) {
        wasm.wasmsim_removeReposition(this.__wbg_ptr, group_id);
    }
    /**
     * Remove a stop. In-flight riders to/from it are rerouted, ejected,
     * or abandoned per `Simulation::remove_stop` semantics.
     *
     * # Errors
     *
     * Returns a JS error if the stop does not exist.
     * @param {bigint} stop_ref
     * @returns {WasmVoidResult}
     */
    removeStop(stop_ref) {
        const ret = wasm.wasmsim_removeStop(this.__wbg_ptr, stop_ref);
        return ret;
    }
    /**
     * Remove a stop from a line's served list. The stop entity itself
     * remains in the world — call `removeStop` to fully despawn.
     *
     * # Errors
     *
     * Returns a JS error if the line entity does not exist.
     * @param {bigint} stop_ref
     * @param {bigint} line_ref
     * @returns {WasmVoidResult}
     */
    removeStopFromLine(stop_ref, line_ref) {
        const ret = wasm.wasmsim_removeStopFromLine(this.__wbg_ptr, stop_ref, line_ref);
        return ret;
    }
    /**
     * Active reposition strategy name (one of `adaptive | predictive
     * | lobby | spread | none`). Used by the playground to label the
     * second chip in each pane header.
     * @returns {string}
     */
    repositionStrategyName() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmsim_repositionStrategyName(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Replace a rider's destination with `new_destination`. Re-routes
     * in-flight riders to head to the new stop after their current leg.
     *
     * # Errors
     *
     * Returns a JS error if the rider or destination does not exist.
     * @param {bigint} rider_ref
     * @param {bigint} new_destination_ref
     * @returns {WasmVoidResult}
     */
    reroute(rider_ref, new_destination_ref) {
        const ret = wasm.wasmsim_reroute(this.__wbg_ptr, rider_ref, new_destination_ref);
        return ret;
    }
    /**
     * Give a `Resident` rider a new single-leg route via `group_id`,
     * transitioning them back to `Waiting`. The route's first leg origin
     * must match the rider's current stop, so callers must know which
     * stop the resident is at.
     *
     * # Errors
     *
     * Returns a JS error if the rider does not exist, is not in
     * `Resident` phase, or the route's origin does not match the
     * rider's current stop.
     * @param {bigint} rider_ref
     * @param {bigint} from_stop_ref
     * @param {bigint} to_stop_ref
     * @param {number} group_id
     * @returns {WasmVoidResult}
     */
    rerouteRiderDirect(rider_ref, from_stop_ref, to_stop_ref, group_id) {
        const ret = wasm.wasmsim_rerouteRiderDirect(this.__wbg_ptr, rider_ref, from_stop_ref, to_stop_ref, group_id);
        return ret;
    }
    /**
     * Give a `Resident` rider a multi-leg route to `to_stop` built from
     * `shortest_route(rider's current_stop -> to_stop)`, transitioning
     * them back to `Waiting`.
     *
     * # Errors
     *
     * Returns a JS error if the rider does not exist, is not in
     * `Resident` phase, has no current stop, or no route exists.
     * @param {bigint} rider_ref
     * @param {bigint} to_stop_ref
     * @returns {WasmVoidResult}
     */
    rerouteRiderShortest(rider_ref, to_stop_ref) {
        const ret = wasm.wasmsim_rerouteRiderShortest(this.__wbg_ptr, rider_ref, to_stop_ref);
        return ret;
    }
    /**
     * Number of resident riders at `stop_ref`. Faster than counting
     * `residentsAt` since it skips the array allocation.
     * @param {bigint} stop_ref
     * @returns {number}
     */
    residentCountAt(stop_ref) {
        const ret = wasm.wasmsim_residentCountAt(this.__wbg_ptr, stop_ref);
        return ret >>> 0;
    }
    /**
     * Riders settled / resident at `stop_ref` (e.g. tenants for a
     * residential building's "home floor" model). Returns an empty
     * array for missing stops.
     * @param {bigint} stop_ref
     * @returns {BigUint64Array}
     */
    residentsAt(stop_ref) {
        const ret = wasm.wasmsim_residentsAt(this.__wbg_ptr, stop_ref);
        var v1 = getArrayU64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * Read the opaque tag attached to a rider. Returns `0n` for the
     * default "untagged" state.
     *
     * # Errors
     *
     * Returns a JS error if `rider_ref` is not a rider entity.
     * @param {bigint} rider_ref
     * @returns {WasmU64Result}
     */
    riderTag(rider_ref) {
        const ret = wasm.wasmsim_riderTag(this.__wbg_ptr, rider_ref);
        return ret;
    }
    /**
     * Riders currently aboard `elevator_ref`. Empty if the cab is
     * empty or `elevator_ref` is not an elevator.
     * @param {bigint} elevator_ref
     * @returns {BigUint64Array}
     */
    ridersOn(elevator_ref) {
        const ret = wasm.wasmsim_ridersOn(this.__wbg_ptr, elevator_ref);
        var v1 = getArrayU64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * Step the simulation forward up to `max_ticks` ticks, stopping
     * early if the world becomes "quiet" (no in-flight riders, no
     * pending hall calls, all cars idle). Returns the number of ticks
     * actually run.
     *
     * # Errors
     *
     * Returns a JS error if the world fails to quiet within `max_ticks`
     * (infinite-loop guard).
     * @param {bigint} max_ticks
     * @returns {WasmU64Result}
     */
    runUntilQuiet(max_ticks) {
        const ret = wasm.wasmsim_runUntilQuiet(this.__wbg_ptr, max_ticks);
        return ret;
    }
    /**
     * Get the current operational mode of an elevator as a label string.
     * Returns `"normal"` for missing/disabled elevators (matches core's
     * `service_mode` accessor, which returns the default rather than
     * erroring).
     * @param {bigint} elevator_ref
     * @returns {string}
     */
    serviceMode(elevator_ref) {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmsim_serviceMode(this.__wbg_ptr, elevator_ref);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Set the acceleration rate (distance/tick²) for a single elevator.
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist or
     * `acceleration` is non-positive / non-finite.
     * @param {bigint} elevator_ref
     * @param {number} acceleration
     * @returns {WasmVoidResult}
     */
    setAcceleration(elevator_ref, acceleration) {
        const ret = wasm.wasmsim_setAcceleration(this.__wbg_ptr, elevator_ref, acceleration);
        return ret;
    }
    /**
     * Set how many ticks the per-rider arrival log retains. Global
     * setting; higher values trade memory for longer post-trip
     * queries.
     * @param {bigint} retention_ticks
     */
    setArrivalLogRetentionTicks(retention_ticks) {
        wasm.wasmsim_setArrivalLogRetentionTicks(this.__wbg_ptr, retention_ticks);
    }
    /**
     * Swap every group's dispatcher to a DCS instance with the given
     * deferred-commitment window. `window_ticks = 0` is equivalent to
     * no window (immediate sticky).
     * @param {bigint} window_ticks
     */
    setDcsWithCommitmentWindow(window_ticks) {
        wasm.wasmsim_setDcsWithCommitmentWindow(this.__wbg_ptr, window_ticks);
    }
    /**
     * Set the deceleration rate (distance/tick²) for a single elevator.
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist or
     * `deceleration` is non-positive / non-finite.
     * @param {bigint} elevator_ref
     * @param {number} deceleration
     * @returns {WasmVoidResult}
     */
    setDeceleration(elevator_ref, deceleration) {
        const ret = wasm.wasmsim_setDeceleration(this.__wbg_ptr, elevator_ref, deceleration);
        return ret;
    }
    /**
     * Set `door_open_ticks` (dwell duration) on a single elevator.
     *
     * Takes effect on the **next** door cycle — an in-progress dwell
     * completes its original timing to avoid visual glitches. See
     * [`Simulation::set_door_open_ticks`](elevator_core::sim::Simulation::set_door_open_ticks).
     *
     * # Errors
     *
     * Surfaces the underlying `SimError` if `elevator_ref` is unknown
     * or the value is invalid (zero `ticks`).
     * @param {bigint} elevator_ref
     * @param {number} ticks
     * @returns {WasmVoidResult}
     */
    setDoorOpenTicks(elevator_ref, ticks) {
        const ret = wasm.wasmsim_setDoorOpenTicks(this.__wbg_ptr, elevator_ref, ticks);
        return ret;
    }
    /**
     * Set `door_open_ticks` (dwell duration) on every elevator.
     *
     * Takes effect on the **next** door cycle — an in-progress dwell
     * completes its original timing to avoid visual glitches. See
     * [`Simulation::set_door_open_ticks`](elevator_core::sim::Simulation::set_door_open_ticks).
     *
     * # Errors
     *
     * Surfaces the underlying `SimError` as a `JsError` if `ticks`
     * is zero.
     * @param {number} ticks
     * @returns {WasmVoidResult}
     */
    setDoorOpenTicksAll(ticks) {
        const ret = wasm.wasmsim_setDoorOpenTicksAll(this.__wbg_ptr, ticks);
        return ret;
    }
    /**
     * Set `door_transition_ticks` (open/close transition duration) on
     * a single elevator. Takes effect on the next door cycle.
     *
     * # Errors
     *
     * Surfaces the underlying `SimError` if `elevator_ref` is unknown
     * or the value is invalid (zero `ticks`).
     * @param {bigint} elevator_ref
     * @param {number} ticks
     * @returns {WasmVoidResult}
     */
    setDoorTransitionTicks(elevator_ref, ticks) {
        const ret = wasm.wasmsim_setDoorTransitionTicks(this.__wbg_ptr, elevator_ref, ticks);
        return ret;
    }
    /**
     * Set `door_transition_ticks` (open- and close-transition duration)
     * on every elevator.
     *
     * Takes effect on the next door cycle. See
     * [`Simulation::set_door_transition_ticks`](elevator_core::sim::Simulation::set_door_transition_ticks).
     *
     * # Errors
     *
     * Surfaces the underlying `SimError` as a `JsError` if `ticks`
     * is zero.
     * @param {number} ticks
     * @returns {WasmVoidResult}
     */
    setDoorTransitionTicksAll(ticks) {
        const ret = wasm.wasmsim_setDoorTransitionTicksAll(this.__wbg_ptr, ticks);
        return ret;
    }
    /**
     * Pin an elevator to a hard-coded home stop. Whenever the car is
     * idle and off-position, the reposition phase routes it to the
     * pinned stop regardless of the group's reposition strategy.
     * Useful for express cars assigned to a dedicated lobby or
     * service cars that should park in a loading bay between
     * requests.
     *
     * # Errors
     *
     * Returns a JS error if the elevator or stop does not exist, or
     * if the elevator's line does not serve the requested stop.
     * @param {bigint} elevator_ref
     * @param {bigint} stop_ref
     * @returns {WasmVoidResult}
     */
    setElevatorHomeStop(elevator_ref, stop_ref) {
        const ret = wasm.wasmsim_setElevatorHomeStop(this.__wbg_ptr, elevator_ref, stop_ref);
        return ret;
    }
    /**
     * Replace an elevator's forbidden-stops set. Pass an empty array to
     * clear all restrictions.
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist.
     * @param {bigint} elevator_ref
     * @param {BigUint64Array} stop_refs
     * @returns {WasmVoidResult}
     */
    setElevatorRestrictedStops(elevator_ref, stop_refs) {
        const ptr0 = passArray64ToWasm0(stop_refs, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_setElevatorRestrictedStops(this.__wbg_ptr, elevator_ref, ptr0, len0);
        return ret;
    }
    /**
     * Swap every group's dispatcher to a tuned ETD instance that
     * applies the group-time squared-wait fairness bonus. Higher
     * `weight` values bias dispatch more aggressively toward stops
     * with older waiters; `0.0` matches the default ETD.
     * @param {number} weight
     */
    setEtdWithWaitSquaredWeight(weight) {
        wasm.wasmsim_setEtdWithWaitSquaredWeight(this.__wbg_ptr, weight);
    }
    /**
     * Flip every group in the sim into the DCS hall-call mode. Required
     * before `DestinationDispatch` can see rider destinations. Scenarios
     * that want DCS (e.g. the hotel) call this once on load.
     */
    setHallCallModeDestination() {
        wasm.wasmsim_setHallCallModeDestination(this.__wbg_ptr);
    }
    /**
     * Resize a line's reachable position range. The new range may
     * grow or shrink the line; cars outside the new bounds are
     * clamped to the boundary.
     *
     * # Errors
     *
     * Returns a JS error if the line does not exist or the range is
     * non-finite or inverted.
     * @param {bigint} line_ref
     * @param {number} min_position
     * @param {number} max_position
     * @returns {WasmVoidResult}
     */
    setLineRange(line_ref, min_position, max_position) {
        const ret = wasm.wasmsim_setLineRange(this.__wbg_ptr, line_ref, min_position, max_position);
        return ret;
    }
    /**
     * Set `max_speed` (m/s) on a single elevator. Applied immediately.
     *
     * # Errors
     *
     * Surfaces the underlying `SimError` if `elevator_ref` is unknown
     * or `speed` is non-positive / non-finite.
     * @param {bigint} elevator_ref
     * @param {number} speed
     * @returns {WasmVoidResult}
     */
    setMaxSpeed(elevator_ref, speed) {
        const ret = wasm.wasmsim_setMaxSpeed(this.__wbg_ptr, elevator_ref, speed);
        return ret;
    }
    /**
     * Set `max_speed` (m/s) on every elevator in the sim.
     *
     * Velocity is preserved across the change; the movement integrator
     * clamps to the new cap on the next tick. See
     * [`Simulation::set_max_speed`](elevator_core::sim::Simulation::set_max_speed).
     *
     * # Errors
     *
     * Surfaces the underlying `SimError` as a `JsError` if `speed` is
     * not a positive finite number.
     * @param {number} speed
     * @returns {WasmVoidResult}
     */
    setMaxSpeedAll(speed) {
        const ret = wasm.wasmsim_setMaxSpeedAll(this.__wbg_ptr, speed);
        return ret;
    }
    /**
     * Swap the reposition strategy by name. Returns `true` on success.
     * State is preserved — only the idle-parking policy changes.
     * Unknown names return `false` so the UI can round-trip arbitrary
     * dropdown values without panicking.
     *
     * Applies to every group unconditionally — the constructor path
     * is the only place scenario-declared reposition strategies get
     * preserved. A live swap signals "user wants this strategy now"
     * for all groups.
     * @param {string} name
     * @returns {boolean}
     */
    setReposition(name) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_setReposition(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Install `PredictiveParking` as the reposition strategy for every
     * group, with the given rolling window. Used by the residential
     * scenario to spotlight arrival-rate-driven pre-positioning.
     * @param {bigint} window_ticks
     */
    setRepositionPredictiveParking(window_ticks) {
        wasm.wasmsim_setRepositionPredictiveParking(this.__wbg_ptr, window_ticks);
    }
    /**
     * Replace a rider's allowed-stops set. Empty array clears the
     * restriction (rider can use any stop).
     *
     * # Errors
     *
     * Returns a JS error if the rider does not exist.
     * @param {bigint} rider_ref
     * @param {BigUint64Array} allowed_stop_refs
     * @returns {WasmVoidResult}
     */
    setRiderAccess(rider_ref, allowed_stop_refs) {
        const ptr0 = passArray64ToWasm0(allowed_stop_refs, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_setRiderAccess(this.__wbg_ptr, rider_ref, ptr0, len0);
        return ret;
    }
    /**
     * Replace a rider's remaining route with a single-leg route via
     * `group_id`. Useful when the consumer already knows the group
     * the rider should use (e.g. an express bank).
     *
     * # Errors
     *
     * Returns a JS error if the rider does not exist.
     * @param {bigint} rider_ref
     * @param {bigint} from_stop_ref
     * @param {bigint} to_stop_ref
     * @param {number} group_id
     * @returns {WasmVoidResult}
     */
    setRiderRouteDirect(rider_ref, from_stop_ref, to_stop_ref, group_id) {
        const ret = wasm.wasmsim_setRiderRouteDirect(this.__wbg_ptr, rider_ref, from_stop_ref, to_stop_ref, group_id);
        return ret;
    }
    /**
     * Replace a rider's remaining route with a multi-leg route built
     * from `shortest_route(rider's current_stop -> to_stop)`.
     * Convenience wrapper for the common "send this rider here" case.
     *
     * # Errors
     *
     * Returns a JS error if the rider does not exist, has no current
     * stop, or no route to `to_stop` exists.
     * @param {bigint} rider_ref
     * @param {bigint} to_stop_ref
     * @returns {WasmVoidResult}
     */
    setRiderRouteShortest(rider_ref, to_stop_ref) {
        const ret = wasm.wasmsim_setRiderRouteShortest(this.__wbg_ptr, rider_ref, to_stop_ref);
        return ret;
    }
    /**
     * Attach an opaque tag to a rider. The engine doesn't interpret
     * the value — JS consumers use it to correlate a `RiderId` with an
     * external id (e.g. a game-side sim id) without maintaining a
     * parallel `Map<RiderId, u32>`. Pass `0n` to clear (`0` is the
     * reserved "untagged" sentinel).
     *
     * # Errors
     *
     * Returns a JS error if `rider_ref` is not a rider entity.
     * @param {bigint} rider_ref
     * @param {bigint} tag
     * @returns {WasmVoidResult}
     */
    setRiderTag(rider_ref, tag) {
        const ret = wasm.wasmsim_setRiderTag(this.__wbg_ptr, rider_ref, tag);
        return ret;
    }
    /**
     * Set the operational mode of an elevator.
     *
     * `mode` is one of: `"normal"`, `"independent"`, `"inspection"`,
     * `"manual"`, `"out-of-service"`. Modes are orthogonal to the
     * elevator's phase. Leaving Manual zeroes velocity and clears any
     * queued door commands.
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist or the mode
     * label is unknown.
     * @param {bigint} elevator_ref
     * @param {string} mode
     * @returns {WasmVoidResult}
     */
    setServiceMode(elevator_ref, mode) {
        const ptr0 = passStringToWasm0(mode, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_setServiceMode(this.__wbg_ptr, elevator_ref, ptr0, len0);
        return ret;
    }
    /**
     * Swap the dispatch strategy by name. Returns `true` on success.
     *
     * State is preserved; only the assignment policy changes. Unknown names
     * return `false` so the UI can round-trip arbitrary dropdown values
     * without panicking.
     * @param {string} name
     * @returns {boolean}
     */
    setStrategy(name) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_setStrategy(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Set the target velocity for a Manual-mode elevator (distance/tick).
     * Positive = up, negative = down. The car ramps toward the target
     * using its configured acceleration / deceleration.
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist, is not in
     * Manual mode, or `velocity` is non-finite.
     * @param {bigint} elevator_ref
     * @param {number} velocity
     * @returns {WasmVoidResult}
     */
    setTargetVelocity(elevator_ref, velocity) {
        const ret = wasm.wasmsim_setTargetVelocity(this.__wbg_ptr, elevator_ref, velocity);
        return ret;
    }
    /**
     * Record a target traffic rate (riders per minute). The playground driver
     * interprets this value externally and calls [`spawn_rider`](Self::spawn_rider)
     * accordingly — the core sim is unaffected so determinism is preserved.
     *
     * [`spawn_rider`]: Self::spawn_rider
     * @param {number} riders_per_minute
     */
    setTrafficRate(riders_per_minute) {
        wasm.wasmsim_setTrafficRate(this.__wbg_ptr, riders_per_minute);
    }
    /**
     * Set `weight_capacity` (kg) on a single elevator. A new cap
     * below `current_load` leaves the car temporarily overweight
     * (no riders ejected); subsequent boarding rejects further
     * additions.
     *
     * # Errors
     *
     * Surfaces the underlying `SimError` if `elevator_ref` is unknown
     * or `capacity` is non-positive / non-finite.
     * @param {bigint} elevator_ref
     * @param {number} capacity
     * @returns {WasmVoidResult}
     */
    setWeightCapacity(elevator_ref, capacity) {
        const ret = wasm.wasmsim_setWeightCapacity(this.__wbg_ptr, elevator_ref, capacity);
        return ret;
    }
    /**
     * Set `weight_capacity` (kg) on every elevator in the sim.
     *
     * Applied immediately. A new cap below `current_load` leaves the
     * car temporarily overweight (no riders ejected); subsequent
     * boarding rejects further additions. See
     * [`Simulation::set_weight_capacity`](elevator_core::sim::Simulation::set_weight_capacity).
     *
     * # Errors
     *
     * Surfaces the underlying `SimError` as a `JsError` if `capacity`
     * is not a positive finite number.
     * @param {number} capacity
     * @returns {WasmVoidResult}
     */
    setWeightCapacityAll(capacity) {
        const ret = wasm.wasmsim_setWeightCapacityAll(this.__wbg_ptr, capacity);
        return ret;
    }
    /**
     * Mark a rider as settled at their current stop. Settled riders
     * move from the waiting/riding pools into the resident pool —
     * useful for "tenants who arrived home" semantics.
     *
     * # Errors
     *
     * Returns a JS error if the rider does not exist.
     * @param {bigint} rider_ref
     * @returns {WasmVoidResult}
     */
    settleRider(rider_ref) {
        const ret = wasm.wasmsim_settleRider(this.__wbg_ptr, rider_ref);
        return ret;
    }
    /**
     * Compute the shortest multi-leg route between two stops using the
     * line-graph topology. Returns `undefined` if no path exists.
     *
     * The returned `RouteDto` is a flat list of stops (origin first,
     * destination last) — adjacent pairs are individual legs.
     * @param {bigint} from_stop_ref
     * @param {bigint} to_stop_ref
     * @returns {RouteDto | undefined}
     */
    shortestRoute(from_stop_ref, to_stop_ref) {
        const ret = wasm.wasmsim_shortestRoute(this.__wbg_ptr, from_stop_ref, to_stop_ref);
        return ret;
    }
    /**
     * Pull a cheap snapshot for rendering.
     * @returns {Snapshot}
     */
    snapshot() {
        const ret = wasm.wasmsim_snapshot(this.__wbg_ptr);
        return ret;
    }
    /**
     * Serialize the simulation to a self-describing postcard byte blob.
     *
     * Wraps [`Simulation::snapshot_bytes`]. The returned bytes carry a
     * magic prefix and the `elevator-core` crate version; restore via
     * [`Self::from_snapshot_bytes`] in the same crate version. Useful
     * for hibernation/rehydration in serverless runtimes (Cloudflare
     * Durable Objects) and for lockstep-checkpoint sync.
     * @returns {WasmBytesResult}
     */
    snapshotBytes() {
        const ret = wasm.wasmsim_snapshotBytes(this.__wbg_ptr);
        return ret;
    }
    /**
     * Cheap u64 checksum of the simulation's serializable state.
     * FNV-1a hash of the postcard snapshot bytes.
     *
     * Designed for divergence detection in lockstep deployments
     * (browser vs server, multi-client multiplayer): two sims that
     * stayed in lockstep must hash to the same value. Mismatch is a
     * loud signal that something has drifted before the next full
     * snapshot reconciles.
     *
     * Snapshot/restore is byte-symmetric: a fresh sim and a restored
     * sim with the same logical state hash equal. (Earlier first-
     * restore asymmetry was fixed.)
     * @returns {WasmU64Result}
     */
    snapshotChecksum() {
        const ret = wasm.wasmsim_snapshotChecksum(this.__wbg_ptr);
        return ret;
    }
    /**
     * Spawn a single rider between two stop ids at the given weight.
     *
     * When `patience_ticks` is provided (non-zero), the rider gets a
     * [`Patience`](elevator_core::components::Patience) budget —
     * riders waiting longer than that transition to `Abandoned` in
     * the `advance_transient` phase. Heavy-load scenarios need this
     * so queues can self-regulate: without abandonment, a two-car
     * office under a 65-riders/min lunchtime pattern grows its
     * waiting-count monotonically because demand persistently
     * exceeds cruise throughput and no one ever leaves.
     *
     * Pass `0` (or omit on the JS side via `undefined`) to disable
     * abandonment for this rider — preserves the pre-patience
     * behavior for scenarios that want bounded queues.
     *
     * Returns the spawned rider's entity ref on success so consumers
     * can correlate with subsequent `rider-*` events. Symmetric with
     * [`Self::spawn_rider_by_ref`].
     *
     * # Errors
     *
     * Returns a Result-shaped object: `{ kind: "ok", value: bigint }`
     * on success, or `{ kind: "err", error: "..." }` if either stop
     * id is unknown, the rider is rejected by the sim, or the
     * `(origin, destination)` route can't be auto-detected.
     * @param {number} origin
     * @param {number} destination
     * @param {number} weight
     * @param {number | null} [patience_ticks]
     * @returns {WasmU64Result}
     */
    spawnRider(origin, destination, weight, patience_ticks) {
        const ret = wasm.wasmsim_spawnRider(this.__wbg_ptr, origin, destination, weight, isLikeNone(patience_ticks) ? 0x100000001 : (patience_ticks) >>> 0);
        return ret;
    }
    /**
     * Spawn a rider between two stops identified by their entity refs
     * (`BigInt`). Companion to [`spawn_rider`](Self::spawn_rider) for
     * runtime-added stops that have no config-time `StopId`.
     * Returns the new rider's entity ref so consumers can correlate
     * with subsequent `rider-*` events.
     *
     * # Errors
     *
     * Returns a JS error if either stop does not exist, the origin
     * equals the destination, or no group serves both stops.
     * @param {bigint} origin_ref
     * @param {bigint} destination_ref
     * @param {number} weight
     * @param {number | null} [patience_ticks]
     * @returns {WasmU64Result}
     */
    spawnRiderByRef(origin_ref, destination_ref, weight, patience_ticks) {
        const ret = wasm.wasmsim_spawnRiderByRef(this.__wbg_ptr, origin_ref, destination_ref, weight, isLikeNone(patience_ticks) ? 0x100000001 : (patience_ticks) >>> 0);
        return ret;
    }
    /**
     * Step the simulation forward `n` ticks.
     * @param {number} n
     */
    stepMany(n) {
        wasm.wasmsim_stepMany(this.__wbg_ptr, n);
    }
    /**
     * Resolve a config-time `StopId` (the small `u32` from the RON
     * config) to its runtime `EntityId`. Returns `0` (slotmap-null)
     * for unknown ids.
     * @param {number} stop_id
     * @returns {bigint}
     */
    stopEntity(stop_id) {
        const ret = wasm.wasmsim_stopEntity(this.__wbg_ptr, stop_id);
        return BigInt.asUintN(64, ret);
    }
    /**
     * Snapshot of the config-time `StopId` → runtime `EntityId` map.
     * Returns a flat `[stop_id_as_u64, entity_id, ...]` array — the
     * `StopId` is zero-extended into the same `u64` slot the entity
     * uses. Pair count is `array.length / 2`.
     * @returns {BigUint64Array}
     */
    stopLookupIter() {
        const ret = wasm.wasmsim_stopLookupIter(this.__wbg_ptr);
        var v1 = getArrayU64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * Entity ids of every stop served by `line_ref`. Order is
     * unspecified — sort by `positionAt` if you need axis order.
     * @param {bigint} line_ref
     * @returns {BigUint64Array}
     */
    stopsServedByLine(line_ref) {
        const ret = wasm.wasmsim_stopsServedByLine(this.__wbg_ptr, line_ref);
        var v1 = getArrayU64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * Active strategy name.
     * @returns {string}
     */
    strategyName() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmsim_strategyName(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Attach `tag` to `entity_ref`.
     *
     * # Errors
     *
     * Returns a JS error if `entity_ref` does not exist.
     * @param {bigint} entity_ref
     * @param {string} tag
     * @returns {WasmVoidResult}
     */
    tagEntity(entity_ref, tag) {
        const ptr0 = passStringToWasm0(tag, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_tagEntity(this.__wbg_ptr, entity_ref, ptr0, len0);
        return ret;
    }
    /**
     * Current traffic mode as classified by `TrafficDetector`.
     *
     * Returns one of `"Idle" | "UpPeak" | "InterFloor" | "DownPeak"`.
     * The UI renders this next to the strategy picker so users can see
     * `AdaptiveParking`'s mode-gated branching live as the simulation
     * swings between morning rush, midday drift, and evening rush.
     * @returns {string}
     */
    trafficMode() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmsim_trafficMode(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Current traffic rate (riders/minute).
     * @returns {number}
     */
    trafficRate() {
        const ret = wasm.wasmsim_trafficRate(this.__wbg_ptr);
        return ret;
    }
    /**
     * Stops where multiple lines intersect — the natural transfer
     * candidates for multi-leg routes (e.g. sky-lobby in a tall
     * building, transfer station in a transit network).
     * @returns {BigUint64Array}
     */
    transferPoints() {
        const ret = wasm.wasmsim_transferPoints(this.__wbg_ptr);
        var v1 = getArrayU64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * Release a previous pin at `(stop_ref, direction)`. No-op if the
     * call does not exist or wasn't pinned.
     *
     * # Errors
     *
     * Returns a JS error if `direction` is not `"up"` / `"down"`.
     * @param {bigint} stop_ref
     * @param {string} direction
     * @returns {WasmVoidResult}
     */
    unpinAssignment(stop_ref, direction) {
        const ptr0 = passStringToWasm0(direction, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_unpinAssignment(this.__wbg_ptr, stop_ref, ptr0, len0);
        return ret;
    }
    /**
     * Remove `tag` from `entity_ref`. No-op if the entity wasn't tagged.
     * @param {bigint} entity_ref
     * @param {string} tag
     */
    untagEntity(entity_ref, tag) {
        const ptr0 = passStringToWasm0(tag, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmsim_untagEntity(this.__wbg_ptr, entity_ref, ptr0, len0);
    }
    /**
     * Current velocity (distance/tick) of `elevator_ref`. Positive = up,
     * negative = down. Returns `undefined` if the entity has no velocity
     * component (i.e. is not an elevator).
     * @param {bigint} elevator_ref
     * @returns {number | undefined}
     */
    velocity(elevator_ref) {
        const ret = wasm.wasmsim_velocity(this.__wbg_ptr, elevator_ref);
        return ret[0] === 0 ? undefined : ret[1];
    }
    /**
     * Riders currently waiting at `stop_ref`. Returns an empty array
     * for missing stops.
     * @param {bigint} stop_ref
     * @returns {BigUint64Array}
     */
    waitingAt(stop_ref) {
        const ret = wasm.wasmsim_waitingAt(this.__wbg_ptr, stop_ref);
        var v1 = getArrayU64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * Convenience: waiting rider count at a specific stop id.
     * @param {number} stop_id
     * @returns {number}
     */
    waitingCountAt(stop_id) {
        const ret = wasm.wasmsim_waitingCountAt(this.__wbg_ptr, stop_id);
        return ret >>> 0;
    }
    /**
     * Per-line waiting counts at `stop_ref`. Returns a flat array of
     * alternating `[line_ref, count, line_ref, count, ...]` pairs.
     * `count` is encoded as `u64` for symmetry with the entity refs.
     * @param {bigint} stop_ref
     * @returns {BigUint64Array}
     */
    waitingCountsByLineAt(stop_ref) {
        const ret = wasm.wasmsim_waitingCountsByLineAt(this.__wbg_ptr, stop_ref);
        var v1 = getArrayU64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * Up/down split of riders currently waiting at `stop_ref`. Returns
     * `[up_count, down_count]`; both `0` for missing stops.
     * @param {bigint} stop_ref
     * @returns {Uint32Array}
     */
    waitingDirectionCountsAt(stop_ref) {
        const ret = wasm.wasmsim_waitingDirectionCountsAt(this.__wbg_ptr, stop_ref);
        var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Pull a richer game-facing view: door progress, direction lamps,
     * per-car ETAs, hall-call lamp state, and topology metadata
     * (groups + lines). Designed for game-side renderers that need
     * more than `snapshot()` exposes. All entity refs are `u64`
     * (`BigInt`) matching the live-mutation API.
     * @returns {WorldView}
     */
    worldView() {
        const ret = wasm.wasmsim_worldView(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) WasmSim.prototype[Symbol.dispose] = WasmSim.prototype.free;

/**
 * List of built-in reposition-strategy names in a stable order (for
 * populating the "Park:" popover in the playground).
 * @returns {any[]}
 */
export function builtinRepositionStrategies() {
    const ret = wasm.builtinRepositionStrategies();
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * List of built-in strategy names in a stable order (for populating dropdowns).
 * @returns {any[]}
 */
export function builtinStrategies() {
    const ret = wasm.builtinStrategies();
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_Error_960c155d3d49e4c2: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_String_8564e559799eccda: function(arg0, arg1) {
            const ret = String(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_copy_to_typed_array_9e08990f20659111: function(arg0, arg1, arg2) {
            new Uint8Array(arg2.buffer, arg2.byteOffset, arg2.byteLength).set(getArrayU8FromWasm0(arg0, arg1));
        },
        __wbg___wbindgen_throw_6b64449b9b9ed33c: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_new_682678e2f47e32bc: function() {
            const ret = new Array();
            return ret;
        },
        __wbg_new_aa8d0fa9762c29bd: function() {
            const ret = new Object();
            return ret;
        },
        __wbg_set_3bf1de9fab0cd644: function(arg0, arg1, arg2) {
            arg0[arg1 >>> 0] = arg2;
        },
        __wbg_set_6be42768c690e380: function(arg0, arg1, arg2) {
            arg0[arg1] = arg2;
        },
        __wbindgen_cast_0000000000000001: function(arg0) {
            // Cast intrinsic for `F64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_cast_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_cast_0000000000000003: function(arg0) {
            // Cast intrinsic for `U64 -> Externref`.
            const ret = BigInt.asUintN(64, arg0);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./elevator_wasm_bg.js": import0,
    };
}

const WasmSimFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmsim_free(ptr >>> 0, 1));

function getArrayJsValueFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getDataViewMemory0();
    const result = [];
    for (let i = ptr; i < ptr + 4 * len; i += 4) {
        result.push(wasm.__wbindgen_externrefs.get(mem.getUint32(i, true)));
    }
    wasm.__externref_drop_slice(ptr, len);
    return result;
}

function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU64FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getBigUint64ArrayMemory0().subarray(ptr / 8, ptr / 8 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedBigUint64ArrayMemory0 = null;
function getBigUint64ArrayMemory0() {
    if (cachedBigUint64ArrayMemory0 === null || cachedBigUint64ArrayMemory0.byteLength === 0) {
        cachedBigUint64ArrayMemory0 = new BigUint64Array(wasm.memory.buffer);
    }
    return cachedBigUint64ArrayMemory0;
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

let cachedFloat64ArrayMemory0 = null;
function getFloat64ArrayMemory0() {
    if (cachedFloat64ArrayMemory0 === null || cachedFloat64ArrayMemory0.byteLength === 0) {
        cachedFloat64ArrayMemory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachedFloat64ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function passArray64ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 8, 8) >>> 0;
    getBigUint64ArrayMemory0().set(arg, ptr / 8);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayF64ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 8, 8) >>> 0;
    getFloat64ArrayMemory0().set(arg, ptr / 8);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedBigUint64ArrayMemory0 = null;
    cachedDataViewMemory0 = null;
    cachedFloat64ArrayMemory0 = null;
    cachedUint32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('elevator_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
